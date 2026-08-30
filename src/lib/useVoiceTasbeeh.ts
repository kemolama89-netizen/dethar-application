import { useEffect, useRef, useState } from "react";
import { INITIAL_MATCH_STATE, replayTokens, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Same convention as TasbeehScreen.tsx's own isDevBuild: Vite statically
// replaces `import.meta.env.DEV` with a literal true/false and dead-code-
// eliminates the losing branch at build time, so the diagnostic logging
// below — and its console output — never exists in the production bundle.
const isDevBuild = import.meta.env.DEV;

// Voice Tasbeeh's recognition engine: the browser's native Web Speech API
// (`SpeechRecognition`/`webkitSpeechRecognition`) — see
// src/lib/speechRecognition.d.ts for the ambient types it needs that
// TypeScript's own DOM lib doesn't ship. Deliberately NOT a new dependency:
// this project has none for audio/speech at all (see package.json — only
// react/react-dom/lucide-react), and src/lib/useMiscSpeech.ts already
// establishes the same "use the browser's built-in Web Speech API, add
// nothing new" precedent for text-to-speech. A cloud/ML recognition service
// would need a network round-trip, an API key, and a billing relationship
// this app has no infrastructure for — not justified for this feature.
//
// KNOWN PLATFORM LIMITATIONS (surfaced to the caller via `status`, not
// hidden): Firefox ships no SpeechRecognition implementation at all
// ("unsupported"); Safari/iOS supports it but tends to end a session after
// a single utterance far more eagerly than Chrome, so continuous listening
// there is restart-heavy (handled below, but with more audible/visible
// restart gaps than Chrome); recognition audio is sent to the browser
// vendor's own speech service (e.g. Google's for Chrome), so this feature
// requires an internet connection — there is no offline mode.
//
// MICROPHONE GAIN / QUIET-SPEECH SENSITIVITY — genuinely NOT controllable
// from here, and this is a hard platform limitation, not something left
// unfinished. `SpeechRecognition.start()` takes no arguments at all per
// spec: unlike `MediaRecorder` or a raw `getUserMedia()` call, the Web
// Speech API never hands the page a `MediaStream` it could apply audio
// constraints to (`echoCancellation`/`noiseSuppression`/`autoGainControl`/
// explicit gain) — the browser captures and processes the microphone
// audio for recognition entirely internally, opaque to the page, with
// whatever the browser vendor's OWN speech backend does for volume
// normalization. There is no config property, no experimental flag, and
// no non-standard vendor hook (checked for `webkitSpeechRecognition`
// specifically) exposing that internal capture pipeline. Concretely: this
// code has no lever for "make quiet speech more recognizable" beyond what
// `continuous`/`interimResults` already do (see below) — a quiet, natural
// voice either transcribes correctly or it doesn't, decided entirely
// inside the browser's own speech engine before any of this file's code
// ever runs. The only way to gain real control over microphone gain/audio
// constraints would be replacing SpeechRecognition with a different
// pipeline entirely (capture the mic directly via `getUserMedia` with
// explicit audio constraints, then stream that audio to a
// separately-hosted speech-to-text service) — a genuinely different
// architecture, out of scope here; nothing below should be read as
// working around this, since it cannot be worked around at this layer.
//
// ---------------------------------------------------------------------
// ARCHITECTURE — recognition events are NOT counts.
//
//   SpeechRecognition events
//           ↓
//   per-segment token snapshot (what does THIS result currently say?)
//           ↓
//   replay those tokens through the utterance state machine
//   (src/lib/voiceTasbeehMatch.ts — PENDING / VALID / INVALID)
//           ↓
//   diff the resulting total against the last replay of THIS segment
//           ↓
//   apply / roll back exactly that difference
//           ↓
//   once the segment finalizes: COMMIT — the state becomes the fixed
//   checkpoint the NEXT segment replays from
//
// A raw `SpeechRecognition` result only ever tells you "here is the
// CURRENT full text of segment i" — interim results for the same segment
// get revised in place (not appended to), and a long dhikr can be split
// across several separately-finalized segments well before the user
// actually finishes reciting it. Both of those break any approach that
// treats "a segment updated" as itself meaningful, or that tries to infer
// "which tokens are new" from string length/prefix comparisons. Here,
// only ONE thing is ever meaningful: replaying a segment's current words,
// one at a time, through the state machine, starting from a fixed,
// already-resolved checkpoint — see COMMITTED STATE below.
export type VoiceTasbeehStatus =
  | "idle" // voice mode is off
  | "requesting" // start() called, waiting on the permission prompt / first response
  | "listening" // actively listening
  | "denied" // microphone permission denied
  | "no-mic" // no microphone device available
  | "unsupported" // this browser has no SpeechRecognition implementation
  | "error"; // any other fatal error starting the recognizer

interface UseVoiceTasbeehArgs {
  /** Voice Tasbeeh on/off — mirrors the screen's own toggle state. */
  enabled: boolean;
  /** The currently selected Dhikr's Arabic text — the ONLY phrase counted. */
  targetPhrase: string;
  /**
   * Called with the number of newly counted repetitions of `targetPhrase`
   * (almost always 1, but can be >1 if one recognition segment captures
   * several repetitions at once — e.g. "Subhan Allah Subhan Allah"
   * recognized together). Applied the instant a repetition's utterance
   * becomes VALID, with zero added delay — see `onRollback` for when one
   * turns out to have only been a prefix of something longer. Always a
   * single cumulative count per call, never split into several synchronous
   * calls, so the caller can safely use one functional state update.
   */
  onMatch: (times: number) => void;
  /**
   * Called to UNDO `times` previously-applied repetitions whose utterance
   * just turned INVALID (e.g. `onMatch(1)` fired for "سبحان الله", then the
   * very next word proved the user was actually saying "سبحان الله
   * وبحمده" — this fires `onRollback(1)` so the net effect is 0). Same
   * cumulative shape as `onMatch`; by construction (see applyToken's own
   * `-1 | 0 | 1` return type) this can never fire more than once per
   * utterance that was ever VALID.
   */
  onRollback: (times: number) => void;
}

// A short delay before restarting after the recognizer ends on its own —
// Chrome/Safari both end a "continuous" session after a period of silence
// (or certain transient errors) despite `continuous = true`; restarting is
// what makes listening feel unbroken across a whole Voice Tasbeeh session
// rather than a single utterance. The delay avoids hammering `start()` in a
// tight loop if a browser ends sessions instantly for some reason.
const RESTART_DELAY_MS = 200;

// How long the "justMatched" flash stays true — purely cosmetic pacing for
// the calm, momentary UI confirmation described in the spec; unrelated to
// (and never gates) the actual counting logic above.
const MATCH_FLASH_MS = 650;

// Two DIFFERENT bounded-forgetting windows, for two DIFFERENT concerns —
// deliberately not one shared timer. Both reset on every processed token
// (not once per utterance) and add NO delay to counting itself; they only
// bound how long some already-resolved-or-in-progress state remains
// "live" once activity actually stops.
//
// VALID_SETTLE_DELAY_MS — a VALID utterance (already credited) stays "at
// risk" of rollback for as long as its committed state carries forward,
// since the NEXT token might still prove it was only a prefix of
// something longer. Without SOME bound, that risk window would never
// close, and unrelated speech arriving much later in the same voice
// session (background noise, a stray word) could wrongly roll back an
// already-finished, unrelated repetition. Once nothing has happened for
// this long, the committed state resets to INITIAL_MATCH_STATE — WITHOUT
// touching whatever was already credited.
const VALID_SETTLE_DELAY_MS = 1500;

// PENDING_ABANDON_DELAY_MS — a PENDING utterance (partway through
// matching a long dhikr's word sequence, nothing credited yet) must NEVER
// be reset on the same short timescale as VALID_SETTLE_DELAY_MS: a long
// dhikr recited naturally, with ordinary breathing pauses between
// clauses, can easily exceed 1.5s between recognizer segments — this was
// the actual root cause of long dhikrs "failing almost completely": a
// realistic pause was silently wiping out correctly-matched progress
// before the phrase could ever complete. PENDING needs a MUCH more
// generous allowance, since — unlike VALID — there is nothing to protect
// against by resetting it quickly: unrelated speech arriving next simply
// fails to extend the prefix and falls through to INVALID on its own,
// with no reset needed at all. The only reason this timer exists at all
// is to eventually forget a GENUINELY abandoned attempt (the user trailed
// off mid-word and never returned) rather than leaving it "live" forever
// within the same voice session — bounded generously, comfortably longer
// than any realistic pause within one recitation.
const PENDING_ABANDON_DELAY_MS = 6000;

export function useVoiceTasbeeh({ enabled, targetPhrase, onMatch, onRollback }: UseVoiceTasbeehArgs) {
  const [status, setStatus] = useState<VoiceTasbeehStatus>("idle");
  const [justMatched, setJustMatched] = useState(false);

  // Always-fresh refs so the long-lived SpeechRecognition event handlers
  // (set up once per `enabled` session, see the main effect below) never
  // act on a stale closure when the caller's target Dhikr or match/rollback
  // handlers change mid-session — recognition itself is NOT restarted for
  // that, only what a new result is compared/reacted to.
  const onMatchRef = useRef(onMatch);
  const onRollbackRef = useRef(onRollback);
  useEffect(() => {
    onMatchRef.current = onMatch;
    onRollbackRef.current = onRollback;
  }, [onMatch, onRollback]);

  const targetRef = useRef(targetPhrase);

  // COMMITTED STATE — the utterance state machine's state as of the last
  // recognition segment that actually FINALIZED. This is the fixed
  // checkpoint every currently-in-flight (interim) segment replays from;
  // it never changes except when a segment commits or the settle timer
  // fires. `committedTotalRef` is the net repetition count (after any
  // rollbacks) as of that same checkpoint — the source of truth for what
  // has actually been applied to the visible counter so far.
  const committedStateRef = useRef<MatchState>(INITIAL_MATCH_STATE);
  const committedTotalRef = useRef(0);
  // The highest recognition result index ever committed — a defensive
  // guard against ever reprocessing an already-committed segment (the Web
  // Speech API spec says a finalized result's index is never revisited,
  // but this makes that assumption unable to silently double-count even
  // if some implementation violated it).
  const highestCommittedIndexRef = useRef(-1);

  // IN-FLIGHT REPLAY — bookkeeping for the ONE recognition segment
  // currently being tracked (not yet finalized, or just finalized this
  // same event before the loop moves to the next index). Every time that
  // segment updates, its CURRENT full token snapshot is replayed from
  // `committedStateRef` — never incrementally appended to — so a real
  // recognizer revising, shrinking, or re-emitting that segment's words is
  // handled correctly by construction: there is no "which part is new"
  // computation to get wrong, only "replay everything current, again".
  const inFlightIndexRef = useRef<number | null>(null);
  const inFlightTokensRef = useRef<string[] | null>(null);
  const inFlightTotalRef = useRef(0);
  const inFlightEndStateRef = useRef<MatchState>(INITIAL_MATCH_STATE);

  // Backs BOTH VALID_SETTLE_DELAY_MS and PENDING_ABANDON_DELAY_MS — only
  // one is ever relevant at a time (whichever the current utterance's
  // status calls for, decided fresh after each processed segment; see
  // onresult below), so one ref/timer suffices.
  const forgetTimerRef = useRef<number | undefined>(undefined);

  // Commits whatever the in-flight segment's LAST replay produced into the
  // permanent checkpoint, and clears in-flight tracking so the next index
  // starts fresh from it. Called both when a segment's own `isFinal` says
  // so, and defensively if a NEW index ever appears before the previous
  // one was explicitly finalized (shouldn't happen per spec, but leaves no
  // segment's resolved progress silently lost if it did).
  const commitInFlight = () => {
    if (inFlightIndexRef.current === null) return;
    committedStateRef.current = inFlightEndStateRef.current;
    committedTotalRef.current = inFlightTotalRef.current;
    highestCommittedIndexRef.current = Math.max(highestCommittedIndexRef.current, inFlightIndexRef.current);
    inFlightIndexRef.current = null;
    inFlightTokensRef.current = null;
  };

  // Resets ALL state — committed checkpoint, in-flight tracking, and the
  // forget timer — back to a blank slate. Used on a target-phrase change
  // (below, so stale bookkeeping against the PREVIOUS Dhikr can never
  // affect the new one), on this whole recognition session starting, and
  // on each internal auto-restart (a fresh `recognition.start()` call
  // renumbers result indices back from 0, so carrying over old
  // bookkeeping across that boundary would misattribute a brand new
  // segment's tokens as "already committed").
  const resetAll = () => {
    committedStateRef.current = INITIAL_MATCH_STATE;
    committedTotalRef.current = 0;
    highestCommittedIndexRef.current = -1;
    inFlightIndexRef.current = null;
    inFlightTokensRef.current = null;
    inFlightTotalRef.current = 0;
    window.clearTimeout(forgetTimerRef.current);
    forgetTimerRef.current = undefined;
  };

  useEffect(() => {
    targetRef.current = targetPhrase;
    resetAll();
  }, [targetPhrase]);

  useEffect(() => {
    const flashTimer = { id: undefined as number | undefined };
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }

    let stopped = false;
    let restartTimer: number | undefined;
    const recognition = new Ctor();
    // Modern Standard Arabic — matches how every dhikr_ar string in
    // src/data/tasbeeh-library.json is written; broadly the most reliable
    // Arabic locale tag across Chrome/Safari's speech backends.
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    resetAll();

    recognition.onstart = () => {
      if (!stopped) setStatus("listening");
    };

    // Applies a net `delta` right now — positive credits new repetitions
    // (fires the "counted!" flash), negative rolls previously-applied ones
    // back (no flash — a rollback is not a fresh "counted!" moment).
    const applyDelta = (delta: number) => {
      if (delta > 0) {
        onMatchRef.current(delta);
        setJustMatched(true);
        window.clearTimeout(flashTimer.id);
        flashTimer.id = window.setTimeout(() => setJustMatched(false), MATCH_FLASH_MS);
      } else if (delta < 0) {
        onRollbackRef.current(-delta);
      }
    };

    recognition.onresult = (event) => {
      const targetTokens = tokenize(targetRef.current);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // A finalized result's index is never revisited per spec — this
        // is a defensive no-op if some implementation did anyway, rather
        // than a normal code path.
        if (i <= highestCommittedIndexRef.current) continue;

        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        const currentTokens = tokenize(transcript);

        if (inFlightIndexRef.current !== i) {
          // Switching to a new segment — commit whatever the PREVIOUS
          // in-flight one last produced first, so its resolved progress
          // is never silently dropped.
          commitInFlight();
          inFlightIndexRef.current = i;
          inFlightTokensRef.current = null;
          inFlightTotalRef.current = committedTotalRef.current;
        }

        // This segment's current text is EXACTLY what we already replayed
        // last time (a duplicate re-emission, interim or final) — nothing
        // changed, so there is nothing to REDO. But a very common
        // real-world pattern is the recognizer re-emitting the last
        // interim's exact text once more, JUST to mark it final — if that
        // FINAL flag were ignored here (e.g. by returning before checking
        // it), this segment's resolved progress would stay uncommitted
        // until some unrelated LATER index happened to arrive, leaking
        // the finality signal itself even though the count was already
        // correct. So finality is still honored even when there is
        // nothing else to redo.
        if (inFlightTokensRef.current && arraysEqual(inFlightTokensRef.current, currentTokens)) {
          if (result.isFinal) commitInFlight();
          continue;
        }

        // The core of the whole design: replay this segment's CURRENT
        // complete token snapshot through the utterance state machine,
        // starting fresh from the fixed committed checkpoint every single
        // time — never incrementally, never guessing which tokens are
        // "new" from a possibly-revised previous snapshot. See
        // replayTokens' own doc for why this is what makes revisions,
        // shrinks, and duplicate re-emissions all "just work".
        const { state, netDelta } = replayTokens(committedStateRef.current, currentTokens, targetTokens);
        const replayTotal = committedTotalRef.current + netDelta;

        // Diff against the LAST replay of THIS SAME segment (not the
        // committed total) — that's what isolates "what changed since the
        // last time we looked at this segment" from everything already
        // permanently resolved before it.
        applyDelta(replayTotal - inFlightTotalRef.current);

        inFlightTokensRef.current = currentTokens;
        inFlightTotalRef.current = replayTotal;
        inFlightEndStateRef.current = state;

        // Genuine new speech was just processed — (re)schedule the forget
        // timer, but ONLY for a status that actually needs bounding:
        //   - VALID (already credited, still revocable) -> the short
        //     VALID_SETTLE_DELAY_MS window, so unrelated speech arriving
        //     much later can't reach back and roll back this credit.
        //   - PENDING with real progress (partway through a long dhikr,
        //     nothing credited yet) -> the much longer
        //     PENDING_ABANDON_DELAY_MS window, generous enough that no
        //     realistic breathing pause within one recitation ever trips
        //     it — this is the actual fix for long dhikrs being wiped out
        //     mid-recitation by a natural pause.
        //   - INVALID, or PENDING with zero progress -> functionally
        //     already identical to the untouched initial state (both only
        //     ever "wake up" via the target's own first word appearing),
        //     so there is nothing to protect and nothing to schedule.
        // If a segment is STILL in-flight (not yet finalized) when a fired
        // timer resets `committedStateRef`, `commitInFlight()` locks in
        // its current progress/total first — otherwise the reset would
        // leave `inFlightTotalRef` computed against a checkpoint that no
        // longer matches it, corrupting the next diff for that segment.
        window.clearTimeout(forgetTimerRef.current);
        if (state.status === "valid") {
          forgetTimerRef.current = window.setTimeout(() => {
            commitInFlight();
            committedStateRef.current = INITIAL_MATCH_STATE;
          }, VALID_SETTLE_DELAY_MS);
        } else if (state.status === "pending" && state.progress > 0) {
          forgetTimerRef.current = window.setTimeout(() => {
            commitInFlight();
            committedStateRef.current = INITIAL_MATCH_STATE;
          }, PENDING_ABANDON_DELAY_MS);
        }

        if (result.isFinal) commitInFlight();
      }
    };

    // Set the instant an "audio-capture" error fires (below), cleared once
    // a devicechange-triggered retry (further below) succeeds in calling
    // start() again. Distinguishes "gave up, and nothing suggests a mic
    // will reappear" (normal quiescent no-mic state) from "gave up, but
    // still worth retrying if a device shows up" — used only by the
    // devicechange listener, never read anywhere in the matching/counting
    // path.
    let audioCaptureFailed = false;

    recognition.onerror = (event) => {
      // "no-speech" / "aborted" / "network" are transient — onend (below)
      // decides whether to auto-restart. The rest are effectively fatal
      // for this session: surface them and stop retrying rather than
      // looping a permission prompt or spinning against a missing mic.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        setStatus("denied");
      } else if (event.error === "audio-capture") {
        // Ambiguous by nature: this can mean "there has never been a
        // microphone" OR "the microphone that was in use a moment ago
        // just disappeared" — e.g. Bluetooth earbuds disconnecting, or a
        // wired headset being unplugged, mid-session. Stop the normal
        // onend auto-restart loop (so a genuinely mic-less device doesn't
        // get hammered with repeated start() calls) but stay recoverable:
        // see the "devicechange" listener below, which retries exactly
        // once a device change suggests a microphone might be available
        // again — the ONLY mechanism by which this ever un-stops itself.
        stopped = true;
        audioCaptureFailed = true;
        setStatus("no-mic");
      } else if (event.error === "language-not-supported") {
        stopped = true;
        setStatus("error");
      }
    };

    recognition.onend = () => {
      if (stopped) return;
      restartTimer = window.setTimeout(() => {
        if (stopped) return;
        try {
          // A fresh start() begins a new recognition run whose result
          // indices count from 0 again — carrying over the OLD run's
          // bookkeeping into the new run's index 0 would make genuinely
          // new speech look like an already-committed segment and get
          // silently skipped. This also means whatever was mid-utterance
          // when the old run ended (rare — sessions normally end on
          // silence, not mid-word) settles at whatever it had already
          // committed; nothing is fabricated or lost from the visible
          // counter, only the in-flight tracking for that boundary.
          resetAll();
          recognition.start();
        } catch {
          // Transient DOM exception (e.g. a stop()/start() race) — the
          // NEXT onend retries; counting is never blocked by this.
        }
      }, RESTART_DELAY_MS);
    };

    // MICROPHONE DEVICE HANDLING — deliberately separate from everything
    // above: SpeechRecognition itself has NO device-selection API and NO
    // device-change signal of its own (see this file's own top-of-file
    // platform-limitation notes — `start()` takes no arguments, no
    // deviceId, no MediaStream). Whatever the OS/browser currently treats
    // as the default audio input — built-in mic, AirPods, a wired
    // headset — is simply what SpeechRecognition uses, entirely
    // transparently; there is nothing here to "select" and nothing to
    // fake. The only thing genuinely actionable from this layer is
    // `navigator.mediaDevices`' own "devicechange" event, which fires
    // when an input/output device is connected or disconnected — used
    // ONLY to recover from the "audio-capture" fatal-stop above: if
    // recognition had given up because no microphone was available, a
    // device change might mean one just became available (e.g. AirPods
    // just connected), so retry once. It deliberately does NOT touch a
    // currently-RUNNING session — the browser already transparently keeps
    // using whatever the current default input is for an ongoing or
    // freshly-started run, and forcing a restart while things are already
    // working would needlessly interrupt in-progress recognition (and
    // discard its in-flight utterance progress) for no benefit, which is
    // exactly what this must avoid.
    const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    const handleDeviceChange = () => {
      if (isDevBuild) {
        console.log("[dithar:voice] devicechange", { stopped, audioCaptureFailed });
      }
      if (!stopped || !audioCaptureFailed) return;
      audioCaptureFailed = false;
      stopped = false;
      setStatus("requesting");
      try {
        // Same reasoning as the onend restart above: a fresh start()
        // renumbers result indices from 0, so bookkeeping must reset with
        // it — this clears only the internal matching checkpoint, never
        // the visible Tasbeeh counter (a separate, external piece of
        // state this hook only ever emits deltas into via onMatch/
        // onRollback), so the count and selected Dhikr are both
        // completely unaffected by a device reconnecting.
        resetAll();
        recognition.start();
      } catch {
        // Still no usable microphone — stay stopped/recoverable rather
        // than surfacing a fresh error; the NEXT devicechange retries.
        stopped = true;
        audioCaptureFailed = true;
      }
    };
    if (mediaDevices && typeof mediaDevices.addEventListener === "function") {
      mediaDevices.addEventListener("devicechange", handleDeviceChange);
    }

    setStatus("requesting");
    try {
      recognition.start();
    } catch {
      setStatus("error");
    }

    return () => {
      stopped = true;
      window.clearTimeout(restartTimer);
      window.clearTimeout(flashTimer.id);
      window.clearTimeout(forgetTimerRef.current);
      if (mediaDevices && typeof mediaDevices.removeEventListener === "function") {
        mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      }
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, justMatched };
}
