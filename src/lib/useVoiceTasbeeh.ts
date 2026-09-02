import { useEffect, useRef, useState } from "react";
import { INITIAL_MATCH_STATE, commonPrefixLength, contractWordSplits, expandFastSpeechMerges, historicalOverlapLength, replayTokens, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";
import { pushDiagLog } from "./voiceDiagnosticsOverlay";

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

// LIGHTWEIGHT STATE-TRANSITION LOGGING — deliberately lean: one short
// line per MEANINGFUL event only (never a raw per-token or per-event
// dump), using a small fixed vocabulary of labels so a real test session
// stays readable instead of scrolling past hundreds of lines:
//   target changed, session started, session stopped, recognition error,
//   recognition stopped, recognition restart, normalized transcript,
//   progress changed, repetition accepted, repetition committed,
//   checkpoint carried forward, commit skipped — already settled,
//   duplicate ignored, stale result ignored, rollback prevented, session
//   reset, inactivity timer started, inactivity timer reset, inactivity
//   timer fired, microphone session cleanup, voice UI state changed.
//   NOTE: "repetition committed" vs "checkpoint carried forward" is a
//   REPORTING distinction only, decided by whether the segment being
//   finalized was actually VALID — it never changes what gets counted;
//   see commitLogEvent's own doc below for why.
// Every call site below only READS already-computed values for the log
// payload; none of them alter control flow. VOICE_DEBUG_LOGGING is a
// single flag to silence all of it without touching any call site;
// isDevBuild on top of that means it's also fully dead-code-eliminated
// from the production bundle regardless of the flag's value.
const VOICE_DEBUG_LOGGING = true;

function logVoice(event: string, data: Record<string, unknown> = {}) {
  if (isDevBuild && VOICE_DEBUG_LOGGING) {
    console.log(`[voice] ${event}`, data);
    // Mirrors the same line to an on-screen panel (voiceDiagnosticsOverlay.ts)
    // — Safari on iOS/iPadOS has no console visible without a Mac connected
    // via Safari's Develop menu, so this is what makes the log usable
    // directly on-device. Also isDevBuild-gated, also dead-code-eliminated
    // from production.
    pushDiagLog(event, data);
  }
}

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

// ANDROID-ONLY duplicate-final detection — see the call site in
// `recognition.onresult` below for exactly how this is used. Android
// Chrome has no native OS-level support for `continuous` recognition, so
// Chrome emulates it by silently restarting its underlying native
// recognizer between segments (documented in Chromium issue 40324711,
// "Web Speech API: Continuous speech recognition is broken on Android"). A
// verified, reproducible side effect of that silent restart (also reported
// independently against the react-speech-recognition library, whose own
// shipped fix this mirrors) is the SAME just-recognized utterance
// occasionally reappearing as a brand-new, already-`isFinal` result under
// a FRESH result index — content-for-content indistinguishable from a
// genuine second repetition, which is exactly what turned a single spoken
// "سبحان الله" into 2, 3, or more counted repetitions. The one confirmed,
// real signal: on Android specifically, a spuriously re-fired final
// result's own confidence score comes back as exactly 0, while a genuine
// final is always > 0.
//
// A pure, exported predicate (rather than inlined in the DOM-touching
// event handler) so it's directly unit-testable without a browser/DOM —
// same reasoning as src/lib/voiceTasbeehMatch.ts's own pure functions.
export function isSpuriousAndroidDuplicateFinal(
  isAndroidPlatform: boolean,
  result: { isFinal: boolean; confidence: number | undefined },
): boolean {
  // Deliberately gated to Android: on desktop Chrome/Safari, `confidence`
  // is frequently (and unreliably) reported as 0 for entirely genuine
  // results, so running this check there would silently discard real
  // repetitions instead of fixing anything. Never applied to interim
  // results — those routinely carry confidence 0 as a matter of course,
  // not as a duplicate signal.
  return isAndroidPlatform && result.isFinal && result.confidence === 0;
}

export function detectAndroidPlatform(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent ?? "");
}

// A short delay before restarting after the recognizer ends on its own —
// Chrome/Safari both end a "continuous" session after a period of silence
// (or certain transient errors) despite `continuous = true`; restarting is
// what makes listening feel unbroken across a whole Voice Tasbeeh session
// rather than a single utterance. The delay avoids hammering `start()` in a
// tight loop if a browser ends sessions instantly for some reason.
//
// Was 200ms; raised to 300ms specifically to give the native recognizer's
// PREVIOUS session more real time to fully quiesce before the next
// start() call — confirmed via device logs as a real InvalidStateError
// race (calling start() while the prior native session hadn't finished
// tearing down yet). scheduleRestart already retries automatically on
// exactly that throw (see its own doc below), reusing this SAME delay for
// every retry — so if 200ms was too short and several retries were each
// throwing in a row, the visible gap before recognition actually resumes
// was the SUM of all those failed attempts, not a single 200ms wait. A
// slightly longer delay makes the FIRST attempt far more likely to
// succeed, which is what actually eliminates the noticeable pause — not
// a lower number.
const RESTART_DELAY_MS = 300;

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

// VOICE INACTIVITY TIMEOUT — a SESSION-level concept, distinct from both
// forget-timers above (which only ever bound a single in-flight segment's
// match bookkeeping, never the microphone itself). If there has been zero
// genuine recognized speech for this long, the whole point of keeping the
// microphone open has evaporated — stop SpeechRecognition entirely and
// release the session rather than listening indefinitely. See the
// `armInactivityTimer`/`handleInactivityTimeout` pair in the main effect
// below for exactly when this is armed and reset.
const INACTIVITY_TIMEOUT_MS = 60000;

export function useVoiceTasbeeh({ enabled, targetPhrase, onMatch, onRollback }: UseVoiceTasbeehArgs) {
  const [status, setStatus] = useState<VoiceTasbeehStatus>("idle");
  const [justMatched, setJustMatched] = useState(false);

  // Tracks the LATEST status outside of React's own (batched, async)
  // state so `setVoiceStatus` below can log an accurate from->to
  // transition and skip logging a no-op "change" to the same value.
  const statusRef = useRef<VoiceTasbeehStatus>("idle");
  const setVoiceStatus = (next: VoiceTasbeehStatus, reason: string) => {
    if (statusRef.current !== next) {
      logVoice("voice UI state changed", { from: statusRef.current, to: next, reason });
    }
    statusRef.current = next;
    setStatus(next);
  };

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

  // The highest recognition result index the recognizer has ever
  // mentioned in the CURRENT recognizer run, updated unconditionally for
  // EVERY index onresult's loop sees — including ones skipped as stale —
  // unlike highestCommittedIndexRef, which only advances when a segment
  // actually finalizes. This is the TARGET-CHANGE STALE-INDEX FLOOR: see
  // the `targetPhrase` effect below for why a dhikr switch needs it.
  // Reset to -1 only when a genuinely NEW recognizer run starts (mount,
  // an auto-restart after onend, or devicechange-recovery) — a fresh
  // `start()` renumbers result indices from 0, so a stale high-water mark
  // from the OLD run must never carry over and block legitimate low
  // indices in the new one.
  const highestSeenIndexRef = useRef(-1);

  // Bumped once per target change — carried only for diagnostic logging
  // (see the `targetPhrase` effect below); the actual cross-target
  // staleness guard is enforced via highestSeenIndexRef/
  // highestCommittedIndexRef, since a raw SpeechRecognition result has no
  // notion of "generation" of its own to tag or compare against.
  const targetGenerationRef = useRef(0);

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
  // A SNAPSHOT of the CURRENT in-flight segment's own tokens (from the
  // start of its token list) that have already been folded into
  // committedStateRef / committedTotalRef by a forget-timer's SOFT commit
  // (see softCommitInFlight below) or by structural commit-on-accept,
  // while that segment was still open. Empty for a segment that has never
  // been soft-committed — the normal case, and the only case for a 2-3
  // word dhikr, whose short target rarely stays "at risk" or "pending"
  // long enough to hit either forget timer at all WHILE its segment is
  // still growing. Reset to empty whenever a genuinely NEW index starts
  // being tracked (nothing is soft-committed yet for it) or a real (hard)
  // commit clears in-flight tracking entirely.
  //
  // Deliberately the actual TOKEN CONTENT, not just its length: see
  // commonPrefixLength's own doc in voiceTasbeehMatch.ts for why a plain
  // count is unsafe here — a still-open segment's recognizer can revise
  // (shrink or reshape) an already-committed span's own word count later
  // in the SAME segment (confirmed in a real captured session), which
  // would make a stored COUNT overshoot the segment's new, shorter
  // length and skip past the next repetition's own genuine opening
  // tokens. Comparing the actual committed tokens against the current
  // segment's tokens position-by-position (commonPrefixLength) can only
  // ever find an equal-or-shorter overlap, never overshoot.
  const inFlightCommittedTokensRef = useRef<string[]>([]);

  // TARGET-SWITCH BOUNDARY — for the ONE result index (if any) that was
  // still open/in-flight at the exact moment the target last changed:
  // the FULL token snapshot that index held AT THAT MOMENT. A raw
  // SpeechRecognition result index can remain open ACROSS a dhikr
  // switch — confirmed on a real device, where index `i` kept producing
  // more transcript content for many seconds after the target changed —
  // so treating the WHOLE index as stale (the older, coarser floor
  // below) silently discards every word spoken toward the NEW target for
  // as long as the recognizer keeps extending that SAME index instead of
  // starting a fresh one. This is what lets the SAME index keep being
  // processed after a switch while still excluding exactly the content
  // that existed before it: consumed (cleared) the next time this index
  // is actually seen again, in onresult's `switchedSegment` block below,
  // where it seeds `inFlightCommittedTokensRef` instead of the usual
  // empty reset — from that point on, the EXISTING commonPrefixLength
  // checkpoint machinery (built for this exact purpose already) excludes
  // it automatically, and only genuinely-new-since-the-switch tokens
  // ever reach the new target's matcher. `null`/empty whenever nothing
  // was open at switch time — nothing to preserve, the coarser floor
  // alone is correct and unchanged for that case.
  const targetSwitchBoundaryIndexRef = useRef<number | null>(null);
  const targetSwitchBoundaryTokensRef = useRef<string[]>([]);

  // Backs BOTH VALID_SETTLE_DELAY_MS and PENDING_ABANDON_DELAY_MS — only
  // one is ever relevant at a time (whichever the current utterance's
  // status calls for, decided fresh after each processed segment; see
  // onresult below), so one ref/timer suffices.
  const forgetTimerRef = useRef<number | undefined>(undefined);

  // A PREVIOUS version of this hook also carried a "cross-session
  // duplicate guard" here: it required a freshly-restarted session's very
  // first result to show progressive interim buildup (a partial prefix,
  // then more words) before trusting it, on the theory that an
  // already-complete result with NO interim buildup was probably a
  // re-heard echo of whatever had just been committed in the OLD session.
  // That assumption was never confirmed against real browser behavior
  // (unlike the Android duplicate-final signature above, which IS
  // documented) — and it was DISPROVEN by live reproduction: a short
  // dhikr spoken at natural/confident speed can legitimately arrive as a
  // single, already-final result with NO separate interim step at all
  // (the recognizer's endpoint detector can finalize a brief utterance
  // before ever emitting an interim update for it), which is exactly what
  // made a GENUINE utterance right after any session restart intermittently
  // get silently swallowed — reproduced with no dhikr-switching involved
  // at all, just "say the SAME dhikr, let the session restart, say it
  // again." That heuristic has been removed entirely; the one CONFIRMED
  // restart-adjacent duplicate mechanism (Android's silent internal
  // recognizer restart) is still guarded by
  // `isSpuriousAndroidDuplicateFinal` above, which needs no interim-
  // buildup assumption at all.

  // Commits whatever the in-flight segment's LAST replay produced into the
  // permanent checkpoint, and clears in-flight tracking so the next index
  // starts fresh from it. Called both when a segment's own `isFinal` says
  // so, and defensively if a NEW index ever appears before the previous
  // one was explicitly finalized (shouldn't happen per spec, but leaves no
  // segment's resolved progress silently lost if it did).
  //
  // Once a segment resolves as VALID (a complete target match) and
  // commits, the checkpoint carried into the NEXT segment is reset to
  // INITIAL_MATCH_STATE rather than carrying "valid, at risk of rollback"
  // forward — the credit itself (`committedTotalRef`) is untouched and
  // stays permanent. Without this, ANY later segment — including
  // completely unrelated wrong speech that doesn't even start with the
  // target's first word — was being replayed against a "valid" baseline,
  // where `applyToken` treats it as proof the just-finished utterance was
  // "only a prefix of something longer" and rolls its credit back (see
  // applyToken's own VALID-status branch in voiceTasbeehMatch.ts, which
  // this deliberately does NOT change). That's the exact root cause of
  // "سبحان الله" -> wrong speech -> "سبحان الله" wrongly netting +1
  // instead of +2: the wrong speech wasn't merely failing to add a count,
  // it was retroactively erasing the ALREADY-credited previous one. A
  // rollback within the SAME still-open segment (e.g. "سبحان الله
  // وبحمده" arriving as one growing segment) is completely unaffected —
  // that risk comes from replaying THAT segment's own token list, never
  // from what committedStateRef carries in from before it, so wrong-dhikr
  // rejection is preserved exactly as before.
  // SHARED SINGLE-COMMIT LOG LABEL — used by BOTH commitInFlight (below)
  // and softCommitInFlight (further below), so the settle-timer path and
  // the isFinal/segment-boundary path can never disagree about what just
  // happened. "repetition committed" is reserved EXCLUSIVELY for a
  // genuinely VALID completed target (`endState.status === "valid"`) —
  // the only authoritative condition for counting a repetition at all
  // (the actual `onMatch` credit itself already fired earlier, the
  // instant replay reached VALID; see applyDelta's call site in
  // onresult). Finalizing an invalid or still-pending segment (an
  // isFinal on an incomplete attempt, a segment switch mid-utterance, the
  // abandon-timer forgetting a stalled partial, the inactivity timeout,
  // a session restart) is real, necessary checkpoint bookkeeping — the
  // partial/invalid progress must still carry forward so the NEXT
  // segment replays from the right place — but it is NOT a counted
  // repetition, so it must never be labeled as one: doing so previously
  // made the diagnostic log claim "repetition committed" for content like
  // ["سبحان","وبحمده"] (invalid) or ["سبحان"] (pending), which never
  // incremented the visible counter (that stayed correctly gated to
  // VALID-only via replayTokens/applyDelta) but was indistinguishable in
  // the log from an actual counted completion.
  const commitLogEvent = (status: MatchState["status"]) => (status === "valid" ? "repetition committed" : "checkpoint carried forward");

  // `reason` identifies WHICH call site triggered this commit — used only
  // for the commit-log-event line below (a no-op call, e.g. onend
  // firing with nothing in-flight, logs nothing at all — lean by design).
  const commitInFlight = (reason: string) => {
    if (inFlightIndexRef.current === null) return;

    // TRUE SINGLE-COMMIT GUARD: if this segment's CURRENT tokens are
    // exactly what a PRIOR soft-commit (a forget-timer firing, or the
    // structural commit-on-accept further below) already folded into the
    // committed checkpoint, there is nothing NEW to commit here — this
    // call is only finalizing bookkeeping (isFinal, a new segment
    // starting, session end/restart, or the inactivity timeout) for
    // content that was already credited. This is exactly the reported
    // log pattern: a segment settles via a forget-timer
    // (`settle-timer-fired`), then the recognizer re-emits that SAME
    // transcript once more just to mark it final
    // (`duplicate ignored: unchanged-transcript`), which used to reach
    // this function a SECOND time for identical content and log a
    // second, redundant "repetition committed" through a different call
    // site. Comparing actual token CONTENT (not a count) means this can
    // only ever match when nothing genuinely new was recognized — see
    // commonPrefixLength's own doc for why a stored count could go stale
    // here but token content cannot.
    const alreadySettled =
      inFlightTokensRef.current !== null &&
      inFlightTokensRef.current.length > 0 &&
      arraysEqual(inFlightTokensRef.current, inFlightCommittedTokensRef.current);
    if (alreadySettled) {
      logVoice("commit skipped — already settled", { reason, index: inFlightIndexRef.current });
      highestCommittedIndexRef.current = Math.max(highestCommittedIndexRef.current, inFlightIndexRef.current);
      inFlightIndexRef.current = null;
      inFlightTokensRef.current = null;
      inFlightCommittedTokensRef.current = [];
      return;
    }

    const endState = inFlightEndStateRef.current;
    logVoice(commitLogEvent(endState.status), { reason, index: inFlightIndexRef.current, total: inFlightTotalRef.current });
    committedStateRef.current = endState.status === "valid" ? INITIAL_MATCH_STATE : endState;
    committedTotalRef.current = inFlightTotalRef.current;
    highestCommittedIndexRef.current = Math.max(highestCommittedIndexRef.current, inFlightIndexRef.current);
    inFlightIndexRef.current = null;
    inFlightTokensRef.current = null;
    inFlightCommittedTokensRef.current = [];
  };

  // A SOFT commit — used ONLY by the forget-timers (VALID_SETTLE_DELAY_MS /
  // PENDING_ABANDON_DELAY_MS) below, never by a genuine segment boundary.
  // Folds the in-flight segment's progress into the committed checkpoint
  // exactly like commitInFlight, but deliberately does NOT touch
  // highestCommittedIndexRef and does NOT clear inFlightIndexRef/
  // inFlightTokensRef.
  //
  // Why: a SpeechRecognition segment can stay open (not yet `isFinal`) far
  // longer than either forget-timer's delay — completely normal for a
  // longer dhikr recited with a natural pause before repeating it, since
  // `continuous` mode keeps listening on the SAME result index rather than
  // starting a new one. commitInFlight's own highestCommittedIndexRef bump
  // is only safe when the browser has ACTUALLY moved past that index
  // (isFinal, or a genuinely new index arriving) — using it here instead
  // would retire an index the recognizer can still send MORE updates to,
  // and the very next one would be silently dropped by the
  // `if (i <= highestCommittedIndexRef.current) continue` guard at the top
  // of onresult's loop: exactly the "counts once then stops" bug this
  // fixes (a long dhikr's forget-timer firing between repetitions — which
  // it reliably does, since a long dhikr is far more likely than a short
  // one to leave more than a natural pause before the next repetition
  // begins — silently stalled the entire counting pipeline for the rest
  // of that recognition session, matching the reported symptom that
  // toggling Voice Tasbeeh off/on was the only way to recover: a fresh
  // session hands out fresh indices, unsticking the guard).
  //
  // inFlightCommittedTokensRef records the actual tokens of this segment
  // that are now accounted for in the checkpoint, so the next update to
  // this same still-open index replays only the tokens beyond the point
  // where they still match (see commonPrefixLength's use in onresult
  // below) instead of re-replaying — and re-crediting — words already
  // folded in here.
  //
  // The checkpoint always resets to INITIAL_MATCH_STATE here, regardless
  // of whether the in-flight state was VALID (settling — the credit is
  // already reflected in committedTotalRef, so the NEXT repetition must
  // start matching from scratch) or PENDING (abandoning — the point of
  // PENDING_ABANDON_DELAY_MS firing at all is to FORGET a genuinely
  // stalled partial match, not preserve it as a checkpoint the next
  // update would silently resume from). This mirrors exactly what the
  // ORIGINAL single (hard) commit + explicit reset at both call sites did
  // before this soft/hard split existed.
  // `reason`: which forget-timer actually FIRED (a no-op call — the timer
  // was cleared by a newer event before it could fire — logs nothing).
  const softCommitInFlight = (reason: string) => {
    if (inFlightIndexRef.current === null) return;
    logVoice(commitLogEvent(inFlightEndStateRef.current.status), { reason, index: inFlightIndexRef.current, total: inFlightTotalRef.current });
    committedStateRef.current = INITIAL_MATCH_STATE;
    committedTotalRef.current = inFlightTotalRef.current;
    inFlightCommittedTokensRef.current = inFlightTokensRef.current ?? [];
  };

  // Resets ONLY session/index bookkeeping — highestCommittedIndexRef, the
  // in-flight tracking refs, and the forget timer — back to a blank
  // slate. Deliberately does NOT touch committedStateRef/committedTotalRef
  // (the match-PROGRESS checkpoint for the currently selected target).
  //
  // A fresh `recognition.start()` begins a brand-new underlying
  // recognizer run whose result indices count from 0 again — carrying
  // over the OLD run's INDEX bookkeeping into the new run's index 0 would
  // make genuinely new speech look like an already-committed segment and
  // get silently skipped, so that part must always reset. But the two
  // concerns used to be conflated in one function (the old `resetAll`)
  // that this replaces at session-restart call sites: index bookkeeping
  // is scoped to ONE underlying recognizer run and must reset every time
  // that run changes, while match progress toward completing the
  // CURRENTLY SELECTED dhikr has nothing to do with which recognizer run
  // is currently reporting it, and must NOT reset just because the
  // browser happened to end and restart the session mid-utterance —
  // Safari/iPad in particular ends `continuous` sessions far more eagerly
  // than Chrome (see this file's own platform notes), often mid-phrase
  // for anything longer than a short dhikr, and wiping match progress on
  // every such restart was the confirmed root cause of longer dhikr never
  // completing at all: the user's genuinely-in-progress recitation kept
  // getting silently reset back to zero before it could ever reach VALID.
  // `silent`: resetAll (below) logs its own single "session reset" line
  // covering both parts of a full reset — passing true here avoids a
  // redundant second line for the bookkeeping half of that same reset.
  // `staleIndexFloor`: what to set highestCommittedIndexRef to (instead of
  // the literal -1) — see highestSeenIndexRef's own doc above. A TARGET
  // CHANGE (not a new recognizer run) passes the CURRENT run's high-water
  // mark here, so any index at or below it — including one still
  // in-flight, not-yet-finalized under the OLD target — is caught by the
  // EXISTING `i <= highestCommittedIndexRef.current` guard in onresult and
  // skipped via the existing "stale result ignored" path, before any
  // tokenizing/replay/commit logic for the NEW target ever runs on it.
  // Defaults to -1 (its original literal value) for every other caller,
  // for whom there is no old run's high-water mark to protect against.
  // `newRecognizerRun`: true ONLY for a genuinely new underlying
  // `recognition.start()` (mount, auto-restart after onend,
  // devicechange-recovery) — a fresh run renumbers result indices from 0,
  // so highestSeenIndexRef itself must also reset, or it would wrongly
  // treat the new run's own low indices as still-stale leftovers from the
  // old one.
  const resetSessionBookkeeping = (reason: string, opts: { silent?: boolean; staleIndexFloor?: number; newRecognizerRun?: boolean } = {}) => {
    const { silent = false, staleIndexFloor = -1, newRecognizerRun = false } = opts;
    if (!silent) logVoice("session reset", { reason, kind: "bookkeeping-only", committedTotalPreserved: committedTotalRef.current, staleIndexFloor });
    highestCommittedIndexRef.current = staleIndexFloor;
    if (newRecognizerRun) highestSeenIndexRef.current = -1;
    inFlightIndexRef.current = null;
    inFlightTokensRef.current = null;
    inFlightTotalRef.current = 0;
    inFlightCommittedTokensRef.current = [];
    window.clearTimeout(forgetTimerRef.current);
    forgetTimerRef.current = undefined;
  };

  // Resets EVERYTHING — session bookkeeping (above) PLUS the match-
  // progress checkpoint itself. This is the INTENTIONAL full reset: used
  // when the selected Dhikr changes (below — stale progress against the
  // PREVIOUS target must never bleed into the new one) and when this
  // whole recognition session first starts (mount / `enabled` turning
  // on). Never used for an in-session or auto-restart boundary — see
  // resetSessionBookkeeping's own doc for why that must preserve the
  // checkpoint instead.
  const resetAll = (reason: string, opts: { staleIndexFloor?: number; newRecognizerRun?: boolean } = {}) => {
    logVoice("session reset", { reason, kind: "full-discards-progress", discardedTotal: committedTotalRef.current });
    committedStateRef.current = INITIAL_MATCH_STATE;
    committedTotalRef.current = 0;
    resetSessionBookkeeping(reason, { ...opts, silent: true });
  };

  useEffect(() => {
    targetRef.current = targetPhrase;
    targetGenerationRef.current += 1;

    // OPEN-INDEX CAPTURE — confirmed on a real device: a result index can
    // remain open (still receiving updates) ACROSS a dhikr switch, for
    // many seconds. The OLD floor-only guard treated that entire index as
    // stale forever after any switch — correct for content that existed
    // before the switch (several adhkar share a prefix like "سبحان الله",
    // so it must never be replayed against the new target), but it also
    // silently discarded every word spoken AFTER the switch for as long
    // as the recognizer kept extending that SAME index instead of
    // starting a fresh one — confirmed live: index `i` kept producing new
    // transcript content for ~15 seconds after a switch, all of it
    // rejected as "stale result ignored", with nothing ever reaching the
    // new target's matcher.
    //
    // Fix: if a segment is CURRENTLY in-flight right now (inFlightIndexRef
    // is not null), snapshot its CURRENT tokens as the boundary for THAT
    // SPECIFIC index — onresult's `switchedSegment` block (below) seeds
    // `inFlightCommittedTokensRef` from this the next time this exact
    // index is seen, so the EXISTING commonPrefixLength checkpoint
    // machinery excludes precisely the pre-switch prefix and nothing
    // more; only genuinely-new-since-the-switch tokens ever reach the new
    // target. The stale-index FLOOR itself is set one below that open
    // index (not AT it), so it alone survives the `i <=
    // highestCommittedIndexRef.current` guard in onresult — every OLDER,
    // already-closed index is still fully rejected, unchanged from
    // before. If nothing is in-flight right now, there is no boundary to
    // preserve and the floor reverts to the original, coarser behavior
    // (the run's full high-water mark) — correct and sufficient for that
    // case, and exactly what ran before this fix.
    //
    // Multiple rapid switches: each switch re-reads `inFlightIndexRef`/
    // `inFlightTokensRef` FRESH, so if the same index survives several
    // switches in a row, each one re-captures the boundary from the
    // LATEST known transcript — stale content from any earlier target
    // (not just the immediately previous one) is excluded, since the
    // boundary always reflects everything recognized up to the MOST
    // RECENT switch, never a stale earlier snapshot.
    const openIndex = inFlightIndexRef.current;
    const openTokens = inFlightTokensRef.current;
    if (openIndex !== null && openTokens !== null) {
      targetSwitchBoundaryIndexRef.current = openIndex;
      targetSwitchBoundaryTokensRef.current = openTokens;
    } else {
      targetSwitchBoundaryIndexRef.current = null;
      targetSwitchBoundaryTokensRef.current = [];
    }
    const staleIndexFloor = openIndex !== null ? openIndex - 1 : highestSeenIndexRef.current;

    logVoice("target changed", { target: targetPhrase, generation: targetGenerationRef.current, staleIndexFloor, openIndexPreserved: openIndex });
    resetAll("target-changed", { staleIndexFloor });
  }, [targetPhrase]);

  useEffect(() => {
    const flashTimer = { id: undefined as number | undefined };
    if (!enabled) {
      setVoiceStatus("idle", "disabled");
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceStatus("unsupported", "no-speech-recognition-api");
      return;
    }

    let stopped = false;
    let restartTimer: number | undefined;
    // VOICE INACTIVITY TIMEOUT bookkeeping — see INACTIVITY_TIMEOUT_MS's
    // own module-level doc. Armed once per genuinely NEW listening session
    // (initial start(), or the devicechange-recovery restart further
    // below) and reset only by GENUINE recognized content (the same
    // "normalized transcript" event onresult already treats as real,
    // non-duplicate activity) — deliberately NOT reset by the browser's
    // own transparent onend/restart cycle (see onend below): Safari/iPad
    // ends and restarts a `continuous` session far more eagerly than
    // Chrome, including during total silence (this file's own platform
    // notes), so treating a bare restart as "activity" would make this
    // timeout effectively unreachable on exactly the platform that needs
    // it most.
    let inactivityTimer: number | undefined;
    const clearInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = undefined;
    };
    const armInactivityTimer = (reason: string) => {
      const alreadyArmed = inactivityTimer !== undefined;
      clearInactivityTimer();
      logVoice(alreadyArmed ? "inactivity timer reset" : "inactivity timer started", { reason, timeoutMs: INACTIVITY_TIMEOUT_MS });
      inactivityTimer = window.setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    };
    // Fires only once INACTIVITY_TIMEOUT_MS has elapsed with ZERO genuine
    // recognized content. By construction (VALID_SETTLE_DELAY_MS and
    // PENDING_ABANDON_DELAY_MS above are both far shorter than this), by
    // the time this ever runs there is nothing still "in flight" or
    // "actively processing" left to interrupt — commitInFlight is still
    // called defensively (a no-op if there truly is nothing pending) so
    // no genuinely resolved-but-uncommitted progress is silently lost.
    function handleInactivityTimeout() {
      if (stopped) return;
      logVoice("inactivity timer fired", { timeoutMs: INACTIVITY_TIMEOUT_MS, committedTotal: committedTotalRef.current });
      stopped = true;
      window.clearTimeout(restartTimer);
      commitInFlight("inactivity-timeout");
      logVoice("recognition stopped", { reason: "inactivity-timeout" });
      recognition.abort();
      logVoice("microphone session cleanup", { reason: "inactivity-timeout" });
      setVoiceStatus("idle", "inactivity-timeout");
    }
    const recognition = new Ctor();
    const isAndroidPlatform = detectAndroidPlatform();
    // Modern Standard Arabic — matches how every dhikr_ar string in
    // src/data/tasbeeh-library.json is written; broadly the most reliable
    // Arabic locale tag across Chrome/Safari's speech backends.
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    resetAll("mount", { newRecognizerRun: true });

    recognition.onstart = () => {
      logVoice("session started", { target: targetRef.current });
      if (!stopped) setVoiceStatus("listening", "recognition-started");
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
        // Recorded UNCONDITIONALLY, before the stale-skip check below, for
        // every index this run's recognizer has ever mentioned — this is
        // the high-water mark a target change reads (see the
        // `targetPhrase` effect above) to set the NEXT target's stale-
        // index floor. Must happen even for an index that gets skipped
        // right below, since a skipped index still genuinely belongs to
        // this run.
        highestSeenIndexRef.current = Math.max(highestSeenIndexRef.current, i);

        // A finalized result's index is never revisited per spec — this
        // is a defensive no-op if some implementation did anyway, rather
        // than a normal code path. This same guard is also what makes a
        // TARGET CHANGE's stale-index floor effective: see
        // resetSessionBookkeeping's `staleIndexFloor` doc above.
        if (i <= highestCommittedIndexRef.current) {
          logVoice("stale result ignored", { i });
          continue;
        }

        const result = event.results[i];

        // See `isSpuriousAndroidDuplicateFinal`'s own doc above: skip a
        // spurious Android duplicate-final entirely (don't credit, don't
        // commit) so the SAME physical utterance already counted via the
        // PREVIOUS segment is never counted again.
        if (isSpuriousAndroidDuplicateFinal(isAndroidPlatform, { isFinal: result.isFinal, confidence: result[0]?.confidence })) {
          logVoice("duplicate ignored", { i, reason: "android-spurious-final" });
          continue;
        }

        const transcript = result[0]?.transcript ?? "";
        // See expandFastSpeechMerges' own doc in voiceTasbeehMatch.ts: at
        // natural/fast speaking speed, connected-speech elision commonly
        // makes the recognizer report two adjacent target words (e.g.
        // "سبحان" + "الله") as a single fused token — split any token
        // that's an EXACT match for that fused form back apart BEFORE
        // matching, so a correctly (but quickly) spoken dhikr isn't
        // rejected just because its words arrived without a gap between
        // them. Never touches wrong/unrelated speech: a token only ever
        // expands if it exactly equals a concatenation of the SELECTED
        // target's own consecutive words.
        //
        // contractWordSplits (voiceTasbeehMatch.ts) runs FIRST and handles
        // the mirror-image case — a single target word (typically one
        // carrying an attached "و" prefix) reported as SEPARATE raw
        // tokens instead of one — contracting them back together before
        // the fuse-direction expansion above ever sees them. Gated to
        // targets longer than 3 tokens, so it never runs for (or affects)
        // the protected 2-3 word dhikr path.
        const currentTokens = expandFastSpeechMerges(contractWordSplits(tokenize(transcript), targetTokens), targetTokens);

        // Switching to a new segment — commit whatever the PREVIOUS
        // in-flight one last produced first, so its resolved progress is
        // never silently dropped. `switchedSegment` is also used below to
        // pick the right BASELINE for the "progress changed"/"repetition
        // accepted" logs: a just-switched segment must compare against
        // the fresh checkpoint it's replaying from, not whatever state
        // happens to still be sitting in inFlightEndStateRef from the
        // PREVIOUS (now-committed) segment.
        const switchedSegment = inFlightIndexRef.current !== i;
        if (switchedSegment) {
          commitInFlight("segment-switch");
          inFlightIndexRef.current = i;
          inFlightTokensRef.current = null;
          inFlightTotalRef.current = committedTotalRef.current;
          // TARGET-SWITCH BOUNDARY consumption — see its own doc above
          // (near its ref declarations) and the `targetPhrase` effect's
          // doc for the full reasoning. This index is "switching" here
          // only because a target change nulled inFlightIndexRef out from
          // under it (the browser itself never stopped extending it) —
          // if a boundary was captured for EXACTLY this index, seed the
          // checkpoint with the pre-switch content instead of the usual
          // empty reset, so the existing commonPrefixLength machinery
          // excludes only that prefix and nothing more. Consumed
          // (cleared) immediately so a LATER, genuinely fresh index never
          // inherits it, and a follow-up target switch on this same index
          // captures its own fresh boundary instead of reusing this one.
          inFlightCommittedTokensRef.current = targetSwitchBoundaryIndexRef.current === i ? targetSwitchBoundaryTokensRef.current : [];
          if (targetSwitchBoundaryIndexRef.current === i) {
            targetSwitchBoundaryIndexRef.current = null;
            targetSwitchBoundaryTokensRef.current = [];
          }
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
          logVoice("duplicate ignored", { i, reason: "unchanged-transcript" });
          if (result.isFinal) commitInFlight("isFinal-unchanged-transcript");
          continue;
        }

        logVoice("normalized transcript", { i, tokens: currentTokens });
        // GENUINE recognized content — this is the ONLY thing that resets
        // the voice inactivity timeout (see its own doc above): a
        // duplicate/unchanged re-emission (handled above, before this
        // line) never reaches here, so merely repeating the same interim
        // text over and over can never hold the timeout off by itself.
        armInactivityTimer("speech-activity");

        // The core of the whole design: replay this segment's CURRENT
        // complete token snapshot through the utterance state machine,
        // starting fresh from the fixed committed checkpoint every single
        // time — never incrementally, never guessing which tokens are
        // "new" from a possibly-revised previous snapshot. See
        // replayTokens' own doc for why this is what makes revisions,
        // shrinks, and duplicate re-emissions all "just work".
        //
        // The slice skips over any PREFIX of this segment's tokens a
        // forget-timer or structural commit-on-accept already folded into
        // committedStateRef above (see softCommitInFlight) —
        // inFlightCommittedTokensRef is empty whenever that has never
        // happened for this segment (the ordinary case), so
        // commonPrefixLength returns 0 and this is a no-op slice(0) — the
        // full current token list — in every case except the one it
        // exists for. Without it, replaying the FULL list again from the
        // now-soft-committed checkpoint would re-match (and re-credit)
        // the very tokens that checkpoint already accounts for.
        //
        // commonPrefixLength (not a stored length) finds where the
        // committed tokens stop agreeing with currentTokens position-by-
        // position — safe against a later revision reshaping that same
        // already-committed span (see its own doc in
        // voiceTasbeehMatch.ts): it can only find an equal-or-shorter
        // overlap than the true committed span, never overshoot into the
        // next repetition's own genuine opening tokens.
        // The BASELINE for the state-transition logs just below: for a
        // freshly-switched segment (see `switchedSegment` above), that's
        // the checkpoint it's replaying from, NOT whatever inFlightEndStateRef
        // happens to still hold from the PREVIOUS (already-committed)
        // segment.
        const previousState = switchedSegment ? committedStateRef.current : inFlightEndStateRef.current;

        // CROSS-SEGMENT STALE-CONTENT GUARD — see historicalOverlapLength's
        // own doc in voiceTasbeehMatch.ts for the full reasoning; this is
        // the useVoiceTasbeeh-side half of it. `committedTotalRef` (a bare
        // number) survives a segment switch, but until now the actual
        // committed WORDS never did — so a brand-new result index whose
        // own transcript happens to replay/duplicate already-counted
        // audio (a confirmed real recognizer behavior — see the
        // "single-dhikr over-counting" investigation, reproduced live
        // going 20->45 on "سبحان الله") had its full content re-credited
        // from scratch, since nothing here remembered what words had
        // already earned that total.
        //
        // REVISED (real-device follow-up — a SECOND capture, same
        // "سبحان الله" target, committedCount 27): the original version of
        // this guard compared currentTokens against a historical
        // reconstruction sized by the ENTIRE committedTotalRef.current —
        // meaning the "protected zone" only ever GREW with the session's
        // running count and NEVER released. For a 2-token target, genuine
        // new speech is byte-identical to that reconstruction at every
        // position (there is nothing else it COULD say), so once a
        // single still-open segment grew past one repetition, EVERY
        // subsequent token — no matter how many more genuine repetitions
        // followed, no matter how long the user kept speaking — matched
        // the reconstruction and was silently withheld. Captured live:
        // 13 consecutive, cleanly-recognized repetitions received
        // delta:0 across a single ~16-second growing segment.
        //
        // The fix narrows WHEN this guard is even consulted, using a
        // signal that is structural (how much brand-new content arrived
        // in ONE onresult event), never a wall-clock timer: a genuine
        // recognizer replay/restart artifact (the confirmed real
        // mechanism behind the ORIGINAL 20->45 bug) dumps its whole
        // buffered chunk into a segment at once — multiple repetitions'
        // worth of tokens appearing in a SINGLE event that were not
        // present in the PREVIOUS event for this same segment. Genuine
        // incremental speech, by contrast, can only ever add a small,
        // ordinary number of new tokens per event (ordinary ASR
        // granularity — a word or two at a time), because real speech
        // takes real time to arrive as it's recognized. So: only a
        // single-event jump LARGER than one full repetition is ever
        // treated as stale-history evidence — a small, incremental
        // per-event advance is NEVER subjected to this guard, no matter
        // how large the segment has grown overall or how long it's been
        // open. This is what makes the protected zone self-releasing
        // instead of growing indefinitely with the visible count: it
        // only ever engages against a SUDDEN block of new content, never
        // against a slow trickle of it, which is exactly the shape the
        // real replay incident had and the real under-count incident
        // did not.
        //
        // Every completed repetition's own tokens are, by construction,
        // always an exact copy of targetTokens (that's what "valid"
        // means) — so the full committed history can still be
        // reconstructed on demand from just the total and the current
        // target, with no separate ref to ever fall out of sync. Bounded
        // to `currentTokens.length` since matching further than that is
        // pointless (commonPrefixLength's own `max` does the same) — and
        // ALSO bounded by `committedTotalRef.current` itself, so a jump
        // can never be excluded as "historical" beyond what could
        // plausibly have been committed before now; anything past that
        // genuinely cannot be an echo of prior history and is credited.
        //
        // Once a jump IS excluded, that exclusion is folded into
        // `inFlightCommittedTokensRef` (exactly like a forget-timer's own
        // soft-commit) so it PERSISTS across this segment's later
        // events — otherwise the next event's own (small) increment would
        // see an empty checkpoint again and re-replay the whole,
        // already-excluded prefix from scratch.
        const targetLen = targetTokens.length;
        const previousSegmentLength = switchedSegment ? 0 : (inFlightTokensRef.current?.length ?? 0);
        const newTokensThisEvent = currentTokens.length - previousSegmentLength;
        let checkpointBoundary = commonPrefixLength(currentTokens, inFlightCommittedTokensRef.current);
        if (targetLen > 0 && newTokensThisEvent > targetLen) {
          const historicalTokenCount = Math.min(committedTotalRef.current * targetLen, currentTokens.length);
          const historicalTokens: string[] = new Array(historicalTokenCount);
          for (let h = 0; h < historicalTokenCount; h++) historicalTokens[h] = targetTokens[h % targetLen];
          const historicalOverlap = historicalOverlapLength(currentTokens, historicalTokens);
          const staleHistoryBoundary = historicalOverlap > targetLen ? historicalOverlap : 0;
          if (staleHistoryBoundary > checkpointBoundary) {
            checkpointBoundary = staleHistoryBoundary;
            inFlightCommittedTokensRef.current = currentTokens.slice(0, staleHistoryBoundary);
          }
        }
        const tokensSinceCheckpoint = currentTokens.slice(checkpointBoundary);
        const { state, netDelta } = replayTokens(committedStateRef.current, tokensSinceCheckpoint, targetTokens);
        const replayTotal = committedTotalRef.current + netDelta;

        // Diff against the LAST replay of THIS SAME segment (not the
        // committed total) — that's what isolates "what changed since the
        // last time we looked at this segment" from everything already
        // permanently resolved before it.
        const delta = replayTotal - inFlightTotalRef.current;

        // TEMPORARY DIAGNOSTIC LOGGING — added ONLY to capture a real
        // device log for the "سبحان الله" single-dhikr over-counting
        // investigation; purely additive (reads already-computed values,
        // never alters control flow or any counting decision) and slated
        // for removal once that investigation concludes. Deliberately its
        // own single line (not folded into an existing log call) so it's
        // trivial to grep for and delete as one unit later.
        logVoice("DIAG single-dhikr", {
          resultIndex: event.resultIndex,
          i,
          isFinal: result.isFinal,
          rawTranscript: transcript,
          normalizedTokens: currentTokens,
          checkpointBoundary,
          committedCount: committedTotalRef.current,
          delta,
        });

        if (previousState.status !== state.status || previousState.progress !== state.progress) {
          logVoice("progress changed", { i, from: `${previousState.status}:${previousState.progress}`, to: `${state.status}:${state.progress}` });
        }
        if (previousState.status !== "valid" && state.status === "valid") {
          logVoice("repetition accepted", { i, targetLength: targetTokens.length });
        } else if (previousState.status === "valid" && state.status !== "valid" && delta === 0 && targetTokens.length > 3) {
          // The ACCEPTED-REPETITION PROTECTION in applyToken's VALID
          // branch (voiceTasbeehMatch.ts) just kicked in: a trailing
          // token broke the sequence, but for this target's length the
          // already-credited repetition was deliberately NOT rolled back.
          logVoice("rollback prevented", { i, targetLength: targetTokens.length });
        }

        applyDelta(delta);

        inFlightTokensRef.current = currentTokens;
        inFlightTotalRef.current = replayTotal;
        inFlightEndStateRef.current = state;

        // STRUCTURAL COMMIT-ON-ACCEPT (targets longer than 3 tokens only):
        // the instant a repetition reaches VALID, permanently remove the
        // tokens that earned it from ALL future replays of this segment —
        // not just protect the numeric delta (applyToken's own VALID-branch
        // fix already does that within a single replay), but make it
        // structurally impossible for a LATER, SEPARATE onresult event's
        // trailing words to even be evaluated against the completed
        // portion again. `tokensSinceCheckpoint` on the NEXT event will
        // then only ever contain tokens AFTER this point, so a later
        // trailing word can only ever fail to start a NEW repetition — it
        // can no longer touch this one, no matter how much more speech
        // (natural continuation, ASR noise, anything) gets appended to
        // this still-open segment afterward, and no matter how long that
        // takes. This is what makes the invariant "once accepted, a later
        // ASR result from the same open segment can never roll it back"
        // hold structurally rather than merely arithmetically — confirmed
        // necessary by a real captured device log where a long dhikr's
        // own text is a natural prefix of a longer, commonly-recited
        // dhikr (so the user naturally kept speaking past its boundary in
        // the same breath): reaching VALID here no longer waits for
        // isFinal, a new segment, or the VALID_SETTLE_DELAY_MS timer to
        // lock it in.
        //
        // Mirrors softCommitInFlight exactly (same checkpoint reset, same
        // offset bookkeeping) but fires immediately instead of after a
        // delay. Deliberately excluded for the protected 2-3 word path:
        // a short target extending into a longer, different phrase must
        // still be able to roll back (unchanged, tested behavior).
        //
        // Snapshots the actual TOKENS (currentTokens), not just their
        // count — see commonPrefixLength's own doc in
        // voiceTasbeehMatch.ts: a later revision of this SAME still-open
        // segment can reshape (shrink or regrow) the recognizer's own
        // word-segmentation of this already-completed span, which would
        // make a stored integer count overshoot and silently truncate the
        // next repetition's own opening tokens out of every future
        // replay for the rest of this segment's life — confirmed via
        // direct reproduction against this exact 10-token dhikr. Storing
        // the tokens themselves lets the NEXT event realign by content
        // instead of trusting a number that can go stale.
        if (targetTokens.length > 3 && state.status === "valid") {
          committedStateRef.current = INITIAL_MATCH_STATE;
          committedTotalRef.current = replayTotal;
          inFlightCommittedTokensRef.current = currentTokens;
        }

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
        // timer locks in its progress, it uses softCommitInFlight (see its
        // own doc above) — NOT commitInFlight — precisely because the
        // segment being "still in-flight" means the browser can still send
        // it MORE updates later (this is the normal, expected shape for a
        // longer dhikr recited with a natural pause before the next
        // repetition, in `continuous` mode, on the SAME result index).
        // commitInFlight's highestCommittedIndexRef bump is only correct
        // once a segment is truly done (isFinal, or superseded by a new
        // index) — using it here would make onresult's own
        // `i <= highestCommittedIndexRef.current` guard silently drop
        // every later update to this still-live segment.
        window.clearTimeout(forgetTimerRef.current);
        if (state.status === "valid") {
          forgetTimerRef.current = window.setTimeout(() => softCommitInFlight("settle-timer-fired"), VALID_SETTLE_DELAY_MS);
        } else if (state.status === "pending" && state.progress > 0) {
          forgetTimerRef.current = window.setTimeout(() => softCommitInFlight("abandon-timer-fired"), PENDING_ABANDON_DELAY_MS);
        }

        if (result.isFinal) commitInFlight("isFinal");
      }
    };

    // Set only by handleDeviceChange's OWN retry failing (see its catch
    // block further below) — a devicechange-triggered start() that itself
    // threw, distinct from the ordinary scheduleRestart retry loop. Read
    // only by handleDeviceChange itself, never in the matching/counting
    // path.
    let audioCaptureFailed = false;

    // Schedules ONE restart attempt RESTART_DELAY_MS from now. Always
    // clears any PREVIOUSLY pending restart timer first — this is what
    // keeps `restartTimer` a true single-timer guard even when two call
    // sites could otherwise both schedule one in quick succession (e.g.
    // an "audio-capture" onerror followed moments later by the onend the
    // spec says always follows an error): without this, the second call
    // would leave the FIRST timer still silently pending (reassigning the
    // `restartTimer` variable does not itself cancel the old timeout),
    // and both would eventually fire, the second one calling
    // recognition.start() on an already-running recognizer purely by
    // accident. Cleanup's own `window.clearTimeout(restartTimer)` still
    // always cancels whichever ONE timer is currently pending.
    //
    // If `recognition.start()` throws — confirmed on real devices as a
    // transient InvalidStateError from calling start() before the
    // previous native session has fully quiesced, NOT a sign anything is
    // actually broken — this calls itself again instead of giving up, so
    // Voice Tasbeeh keeps trying to recover listening exactly as the
    // product requires (stopping only for user-disable, a genuinely fatal
    // onerror, the inactivity timeout, or unmount, all of which already
    // set `stopped = true` and are checked first here). This never
    // becomes a tight/unbounded loop in practice: retries stay spaced at
    // the SAME RESTART_DELAY_MS as a normal restart, and if start() never
    // actually succeeds, no genuine speech ever reaches onresult either —
    // so armInactivityTimer never resets, and the ALREADY-ARMED
    // inactivity timer fires on its own schedule regardless of how many
    // retries happened, sets `stopped = true`, and this loop ends cleanly
    // on its own the next time its pending timer fires.
    const scheduleRestart = (reason: string) => {
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(() => {
        if (stopped) return;
        try {
          // Fold any still-open segment's progress into the committed
          // checkpoint FIRST — same commit that would normally happen on
          // `isFinal` or a same-session segment switch — so we capture
          // what was truly last resolved (valid or not) rather than
          // silently discarding in-flight progress that never got a
          // chance to finalize before the browser ended this session.
          // Idempotent on a retry that follows one that already ran it
          // (a no-op the second time — see commitInFlight's own guard —
          // and resetSessionBookkeeping resetting already-reset values).
          commitInFlight("session-restart");
          // Deliberately resetSessionBookkeeping(), NOT resetAll(): a
          // fresh start() begins a new recognition run whose result
          // indices count from 0 again, so the INDEX bookkeeping must
          // reset — but the match-progress checkpoint commitInFlight()
          // just folded the ending session's progress into must SURVIVE
          // into the new session, not be wiped a line later. Ending
          // mid-utterance is NOT rare here — Safari/iPad in particular
          // ends `continuous` sessions eagerly, often mid-phrase for
          // anything longer than a short dhikr — so a long dhikr's
          // genuinely in-progress recitation must be able to continue
          // seamlessly into the next session instead of restarting from
          // zero every time the browser cuts the session.
          resetSessionBookkeeping("session-restart", { newRecognizerRun: true });
          logVoice("recognition restart", { reason });
          recognition.start();
        } catch (err) {
          logVoice("recognition error", { error: "restart-threw", detail: err instanceof Error ? err.message : String(err) });
          scheduleRestart("retry-after-restart-threw");
        }
      }, RESTART_DELAY_MS);
    };

    recognition.onerror = (event) => {
      // Logged UNCONDITIONALLY, including values otherwise silently
      // ignored below (no-speech/aborted/network/anything else) — this
      // file previously had NO visibility at all into which error values
      // a real device actually produces, or how often.
      logVoice("recognition error", { error: event.error });
      // "no-speech" / "aborted" / "network" are transient — onend (below)
      // decides whether to auto-restart. The rest are effectively fatal
      // for this session: surface them and stop retrying rather than
      // looping a permission prompt or spinning against a missing mic.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        clearInactivityTimer();
        setVoiceStatus("denied", event.error);
      } else if (event.error === "audio-capture") {
        // Ambiguous by nature: this can mean "there has never been a
        // microphone" OR "the microphone that was in use a moment ago
        // just disappeared" — e.g. Bluetooth earbuds disconnecting, or a
        // wired headset being unplugged, mid-session. CONFIRMED on a real
        // device (the "static button" investigation) to also fire
        // TRANSIENTLY mid-session with the microphone never actually
        // having gone anywhere — treating it as unconditionally fatal
        // left Voice Tasbeeh silently dead (status stuck at "no-mic", no
        // restart ever scheduled) for however long it took an unrelated
        // `devicechange` event to happen to fire, which has nothing to do
        // with whether a microphone is actually available and nothing to
        // do with the user's own speech (that apparent "waiting ~5
        // seconds then speaking wakes it up" pattern was coincidence, not
        // causation — confirmed by there being no code path connecting
        // audio content to recovery at all).
        //
        // Fix: treat it exactly like a natural `onend` — schedule the
        // SAME bounded restart loop already used there (never a new
        // timing constant, never a new loop) instead of giving up.
        // Deliberately does NOT set `stopped`, does NOT clear the
        // inactivity timer, and does NOT change `status` here — matching
        // exactly how the OTHER transient errors (no-speech/aborted/
        // network) are already handled above: silently retried, with the
        // untouched, already-armed 60-second inactivity timeout as the
        // sole backstop if the microphone is genuinely, permanently gone
        // (no genuine speech ever reaches onresult to keep resetting it,
        // so it fires on its own schedule and cleanly reports "idle" —
        // already an explicitly accepted terminal state). The
        // `devicechange` listener further below is left in place as a
        // secondary safety net; it simply won't have anything to do for
        // this specific error anymore, since `stopped` no longer becomes
        // true here for it to react to.
        scheduleRestart("retry-after-audio-capture");
      } else if (event.error === "language-not-supported") {
        stopped = true;
        clearInactivityTimer();
        setVoiceStatus("error", event.error);
      }
    };

    recognition.onend = () => {
      logVoice("session stopped", { willRestart: !stopped, committedTotal: committedTotalRef.current });
      if (stopped) return;
      scheduleRestart("auto-restart-after-end");
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
    // when an input/output device is connected or disconnected. A
    // secondary safety net now that "audio-capture" (above) retries on
    // its own via scheduleRestart rather than stopping outright: this
    // only ever has anything to do if a devicechange-triggered restart
    // itself throws (its own catch block below sets `audioCaptureFailed`
    // for exactly that case) and a LATER device change gives it another
    // chance. It deliberately does NOT touch a
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
      setVoiceStatus("requesting", "devicechange-recovery");
      try {
        // Same reasoning as the onend restart above: a fresh start()
        // renumbers result indices from 0, so bookkeeping must reset with
        // it — this clears only the internal matching checkpoint, never
        // the visible Tasbeeh counter (a separate, external piece of
        // state this hook only ever emits deltas into via onMatch/
        // onRollback), so the count and selected Dhikr are both
        // completely unaffected by a device reconnecting.
        resetAll("devicechange-recovery", { newRecognizerRun: true });
        recognition.start();
        armInactivityTimer("devicechange-recovery");
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

    setVoiceStatus("requesting", "mount");
    try {
      recognition.start();
      armInactivityTimer("session-start");
    } catch (err) {
      logVoice("recognition error", { error: "initial-start-threw", detail: err instanceof Error ? err.message : String(err) });
      setVoiceStatus("error", "initial-start-threw");
    }

    return () => {
      stopped = true;
      window.clearTimeout(restartTimer);
      window.clearTimeout(flashTimer.id);
      window.clearTimeout(forgetTimerRef.current);
      clearInactivityTimer();
      if (mediaDevices && typeof mediaDevices.removeEventListener === "function") {
        mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      }
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      logVoice("recognition stopped", { reason: "cleanup" });
      recognition.abort();
      logVoice("microphone session cleanup", { reason: "cleanup" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, justMatched };
}
