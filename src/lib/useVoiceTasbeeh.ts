import { useEffect, useRef, useState } from "react";
import { INITIAL_MATCH_STATE, contractWordSplits, expandFastSpeechMerges, matchNewTokens, safePrefixMatchLength, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";

// REWRITE NOTE: this file replaces a prior implementation built up over
// several rounds of real-device debugging that added, on top of each
// other: a cross-segment "historical overlap" content reconstruction, a
// target-switch index-floor/boundary system, structural commit-on-accept
// for long targets only, layered settle/abandon forget-timers, and a
// devicechange-based recovery path — several of which were themselves
// the source of later bugs. This version is intentionally smaller: one
// explicit per-target session state, one explicit per-segment consumed
// boundary (the SAME mechanism handles "a repetition just completed" and
// "the target just changed" — see its own doc below), and one simple
// restart loop. See the state model doc further down for the full
// design.
//
// Voice Tasbeeh's recognition engine: the browser's native Web Speech API
// (`SpeechRecognition`/`webkitSpeechRecognition`) — see
// src/lib/speechRecognition.d.ts for the ambient types it needs that
// TypeScript's own DOM lib doesn't ship. Deliberately NOT a new
// dependency: this project has none for audio/speech at all, and
// src/lib/useMiscSpeech.ts already establishes the same "use the
// browser's built-in Web Speech API, add nothing new" precedent for
// text-to-speech.
//
// KNOWN PLATFORM LIMITATIONS (surfaced to the caller via `status`, not
// hidden): Firefox ships no SpeechRecognition implementation at all
// ("unsupported"); Safari/iOS supports it but tends to end a session
// after a single utterance far more eagerly than Chrome, so continuous
// listening there is restart-heavy; recognition audio is sent to the
// browser vendor's own speech service, so this feature requires an
// internet connection. Microphone gain/sensitivity is not controllable
// from here — `SpeechRecognition.start()` takes no arguments per spec
// and never hands the page a `MediaStream` to apply audio constraints
// to.
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
   * recognized together). Applied the instant each repetition completes,
   * with zero added delay.
   */
  onMatch: (times: number) => void;
  /**
   * Kept for interface compatibility with the existing caller
   * (TasbeehScreen.tsx) — this rewrite's counting model has no rollback
   * concept at all (a completed repetition is consumed permanently the
   * instant it completes, and its tokens are never matched again — see
   * the checkpoint doc below), so this is never actually invoked. Left
   * in the signature deliberately rather than touching the caller.
   */
  onRollback: (times: number) => void;
}

// ---------------------------------------------------------------------
// ANDROID-ONLY duplicate-final detection — see the call site in
// `recognition.onresult` below. Android Chrome has no native OS-level
// support for `continuous` recognition, so Chrome emulates it by
// silently restarting its underlying native recognizer between segments
// (documented in Chromium issue 40324711). A verified, reproducible side
// effect of that silent restart is the SAME just-recognized utterance
// occasionally reappearing as a brand-new, already-`isFinal` result under
// a FRESH result index. The one confirmed, real signal: on Android
// specifically, a spuriously re-fired final result's own confidence
// score comes back as exactly 0, while a genuine final is always > 0.
export function isSpuriousAndroidDuplicateFinal(isAndroidPlatform: boolean, result: { isFinal: boolean; confidence: number | undefined }): boolean {
  // Never applied to interim results (routinely 0 anyway) or off Android
  // (desktop/iOS confidence is unreliable and would wrongly discard real
  // repetitions).
  return isAndroidPlatform && result.isFinal && result.confidence === 0;
}

export function detectAndroidPlatform(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent ?? "");
}

// A short delay before restarting after the recognizer ends on its own —
// Chrome/Safari both end a "continuous" session after a period of
// silence (or certain transient errors) despite `continuous = true`;
// restarting is what makes listening feel unbroken across a whole Voice
// Tasbeeh session. Purely a lifecycle-stabilization delay (calling
// start() immediately after end() can throw InvalidStateError if the
// native session hasn't fully quiesced yet) — never read anywhere in the
// matching/counting path.
const RESTART_DELAY_MS = 300;

// How long the "justMatched" flash stays true — purely cosmetic pacing,
// unrelated to (and never gates) the actual counting logic.
const MATCH_FLASH_MS = 650;

// VOICE INACTIVITY TIMEOUT — a session-level concept, entirely separate
// from matching: if there has been zero genuinely new recognized speech
// for this long, stop SpeechRecognition and release the session rather
// than listening indefinitely. Reset only by genuinely new recognized
// content (see `isGenuinelyNewSegment` at the onresult call site) —
// deliberately NOT reset by a bare onend/restart cycle, and deliberately
// NOT touched anywhere in the counting path.
const INACTIVITY_TIMEOUT_MS = 60000;

export function useVoiceTasbeeh({ enabled, targetPhrase, onMatch, onRollback }: UseVoiceTasbeehArgs) {
  const [status, setStatus] = useState<VoiceTasbeehStatus>("idle");
  const [justMatched, setJustMatched] = useState(false);

  const statusRef = useRef<VoiceTasbeehStatus>("idle");
  const setVoiceStatus = (next: VoiceTasbeehStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  // Always-fresh refs so the long-lived SpeechRecognition event handlers
  // never act on a stale closure when the caller's target Dhikr or
  // match/rollback handlers change mid-session.
  const onMatchRef = useRef(onMatch);
  const onRollbackRef = useRef(onRollback);
  useEffect(() => {
    onMatchRef.current = onMatch;
    onRollbackRef.current = onRollback;
  }, [onMatch, onRollback]);

  const targetRef = useRef(targetPhrase);

  // ---------------------------------------------------------------------
  // STATE MODEL
  //
  // PER-TARGET SESSION state (reset ONLY when `targetPhrase` changes —
  // never by a segment switch or a recognizer restart, so a long dhikr's
  // genuine in-progress attempt survives both):
  //   sessionStateRef    — the utterance's current match progress.
  //   (there is no separate "committed total" — every completed
  //   repetition is credited to the caller immediately via onMatch, so
  //   nothing here needs to remember a running sum for its own sake.)
  //
  // PER-SEGMENT state (reset whenever a genuinely NEW result index
  // starts being tracked):
  //   segmentIndexRef      — which result index this state belongs to.
  //   segmentTokensRef      — this segment's own full token list as of
  //                           the last event (for detecting an exact
  //                           duplicate re-emission).
  //   consumedTokensRef     — the PREFIX of this segment's tokens that
  //                           has already been dealt with — either
  //                           because it completed one or more
  //                           repetitions, or because it existed before
  //                           the target last changed while this segment
  //                           was still open. Never re-examined once
  //                           recorded (see safePrefixMatchLength's own
  //                           doc for why comparing actual content, not a
  //                           stored count, is what makes this safe
  //                           against a mid-segment revision).
  //
  // Every onresult event for the CURRENT segment does exactly this:
  //   1. tokensSinceCheckpoint = segment's current tokens, minus
  //      whatever safePrefixMatchLength confirms is still the same as
  //      consumedTokensRef.
  //   2. Feed ONLY those genuinely-new tokens into sessionStateRef via
  //      matchNewTokens — never the whole segment, never a token twice.
  //   3. Credit onMatch immediately for however many repetitions that
  //      single call found, and advance consumedTokensRef to cover
  //      everything just fed (whether or not it completed anything —
  //      once looked at, a token is never looked at again for this
  //      segment).
  //
  // This is the ENTIRE mechanism — there is no separate "commit" step,
  // no deferred bookkeeping tied to isFinal, no settle/abandon timers.
  // isFinal is honored ONLY to know when a segment is truly done (so the
  // next different index is unambiguously a new segment); it never
  // itself triggers or blocks a count (see requirement: "do not assume
  // isFinal means a valid dhikr repetition" — nothing here does).
  const sessionStateRef = useRef<MatchState>(INITIAL_MATCH_STATE);

  const segmentIndexRef = useRef<number | null>(null);
  const segmentTokensRef = useRef<string[]>([]);
  const consumedTokensRef = useRef<string[]>([]);

  // TARGET-SWITCH handling — see the `targetPhrase` effect below. A
  // result index can remain open ACROSS a dhikr switch (confirmed on a
  // real device: the browser kept extending the same index for many
  // seconds after the target changed). Reusing the SAME consumed-
  // boundary mechanism above (rather than a separate index-floor system)
  // is what satisfies "old content must not satisfy the new target" and
  // "the same segment must be able to continue counting for the new
  // target" simultaneously: on a switch, whatever the currently-open
  // segment's tokens are RIGHT NOW are marked fully consumed (excluded
  // forever), and only tokens appended AFTER that moment are ever new.
  useEffect(() => {
    targetRef.current = targetPhrase;
    sessionStateRef.current = INITIAL_MATCH_STATE;
    if (segmentIndexRef.current !== null) {
      consumedTokensRef.current = segmentTokensRef.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPhrase]);

  useEffect(() => {
    const flashTimer = { id: undefined as number | undefined };
    if (!enabled) {
      setVoiceStatus("idle");
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceStatus("unsupported");
      return;
    }

    let stopped = false;
    let restartTimer: number | undefined;

    // A fresh recognizer run renumbers result indices from 0 — the
    // per-segment state above is scoped to ONE physical index within ONE
    // run, so it must reset whenever a new run starts. The per-TARGET
    // session state is deliberately NOT touched here, so genuine
    // in-progress matching survives a restart.
    const resetForNewRun = () => {
      segmentIndexRef.current = null;
      segmentTokensRef.current = [];
      consumedTokensRef.current = [];
    };

    let inactivityTimer: number | undefined;
    const clearInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = undefined;
    };
    const armInactivityTimer = () => {
      clearInactivityTimer();
      inactivityTimer = window.setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    };
    function handleInactivityTimeout() {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(restartTimer);
      recognition.abort();
      setVoiceStatus("idle");
    }

    const recognition = new Ctor();
    const isAndroidPlatform = detectAndroidPlatform();
    // Modern Standard Arabic — matches how every dhikr_ar string in
    // src/data/tasbeeh-library.json is written.
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // A native session actually beginning — whether this is the very
      // first start or a restart after onend — renumbers result indices
      // from 0. Resetting per-segment state exactly here (rather than
      // once at effect setup) is what stops a restarted session's own
      // index 0 from being mistaken for a continuation of the PREVIOUS
      // session's index 0 and having its genuinely new speech dropped as
      // an "exact duplicate" of already-consumed content.
      resetForNewRun();
      if (!stopped) setVoiceStatus("listening");
    };

    const applyDelta = (matchedCount: number) => {
      if (matchedCount > 0) {
        onMatchRef.current(matchedCount);
        setJustMatched(true);
        window.clearTimeout(flashTimer.id);
        flashTimer.id = window.setTimeout(() => setJustMatched(false), MATCH_FLASH_MS);
      }
    };

    recognition.onresult = (event) => {
      const targetTokens = tokenize(targetRef.current);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Defensive only: per spec a finalized result index is never
        // revisited and indices only ever increase. Never used to derive
        // counting decisions on its own (see requirement: "do not assume
        // resultIndex identifies a new user utterance").
        if (segmentIndexRef.current !== null && i < segmentIndexRef.current) continue;

        const result = event.results[i];
        if (isSpuriousAndroidDuplicateFinal(isAndroidPlatform, { isFinal: result.isFinal, confidence: result[0]?.confidence })) {
          continue;
        }

        const transcript = result[0]?.transcript ?? "";
        const currentTokens = expandFastSpeechMerges(contractWordSplits(tokenize(transcript), targetTokens), targetTokens);

        const isNewSegment = segmentIndexRef.current !== i;
        if (isNewSegment) {
          segmentIndexRef.current = i;
          segmentTokensRef.current = [];
          consumedTokensRef.current = [];
        }

        // Exact duplicate re-emission (interim repeated verbatim, or a
        // final re-stating the same text just to mark completeness) —
        // nothing changed, nothing to feed. isFinal carries no further
        // meaning here either way (see requirement: "do not assume
        // isFinal means a valid dhikr repetition") — there is no
        // deferred commit step waiting on it.
        if (!isNewSegment && currentTokens.length === segmentTokensRef.current.length && currentTokens.every((t, idx) => t === segmentTokensRef.current[idx])) {
          continue;
        }

        // GENUINE recognized content — the only thing that resets the
        // inactivity timeout.
        armInactivityTimer();

        segmentTokensRef.current = currentTokens;

        // How much of this segment's CURRENT tokens is still the exact
        // same content already consumed (by a completed match, or by a
        // target switch while this segment was open) — safe against a
        // revision reshaping that span (see safePrefixMatchLength's own
        // doc).
        const consumedBoundary = safePrefixMatchLength(currentTokens, consumedTokensRef.current);
        const newTokens = currentTokens.slice(consumedBoundary);

        const { state, matchedCount } = matchNewTokens(sessionStateRef.current, newTokens, targetTokens);
        sessionStateRef.current = state;
        // Every genuinely-new token just fed is now permanently dealt
        // with, whether or not it completed anything — never re-examine
        // it for this segment again.
        consumedTokensRef.current = currentTokens;

        applyDelta(matchedCount);

        if (result.isFinal) {
          // The segment is done; the NEXT index (whenever it arrives) is
          // unambiguously new. Nothing else to do — there is no deferred
          // bookkeeping to flush, since every match was already credited
          // the instant it completed.
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        clearInactivityTimer();
        setVoiceStatus("denied");
      } else if (event.error === "language-not-supported") {
        stopped = true;
        clearInactivityTimer();
        setVoiceStatus("error");
      }
      // "audio-capture", "no-speech", "aborted", "network", and anything
      // else are treated as transient: onend (below) decides whether to
      // restart, using the SAME single retry loop as a natural end —
      // deliberately not a separate recovery path (no devicechange
      // listener in this design).
    };

    // ONE restart mechanism, reused for both a natural end and a start()
    // that throws (a documented, real InvalidStateError race from
    // calling start() before the previous native session has fully
    // quiesced) — always clears any previously pending attempt first, so
    // at most one retry is ever scheduled at a time. Bounded in practice
    // by the inactivity timeout above: if start() never actually
    // succeeds, no genuine speech ever reaches onresult to keep
    // resetting it, so the session ends on its own on schedule rather
    // than retrying forever.
    const scheduleRestart = () => {
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(() => {
        if (stopped) return;
        try {
          recognition.start();
        } catch {
          scheduleRestart();
        }
      }, RESTART_DELAY_MS);
    };

    recognition.onend = () => {
      if (stopped) return;
      scheduleRestart();
    };

    setVoiceStatus("requesting");
    try {
      recognition.start();
      armInactivityTimer();
    } catch {
      setVoiceStatus("error");
    }

    return () => {
      stopped = true;
      window.clearTimeout(restartTimer);
      window.clearTimeout(flashTimer.id);
      clearInactivityTimer();
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
