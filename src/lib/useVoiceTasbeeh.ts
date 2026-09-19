import { useEffect, useRef, useState } from "react";
import { VoiceTasbeehMatcher, type MatcherDebugEvent } from "./voiceTasbeehMatch";
import { isNativeVoiceRecognitionAvailable } from "./voiceRecognitionNative";
import { NativeAndroidSpeechRecognition } from "./nativeSpeechRecognitionAdapter";

// DEV-ONLY diagnostic logging for forensic live-device traces. Vite
// statically replaces `import.meta.env.DEV` with a literal true/false and
// dead-code-eliminates the losing branch at build time (same mechanism
// already used for the haptics diagnostics in TasbeehScreen.tsx) — none of
// this exists in the production bundle, and every call below is a no-op
// when DEV is false. Purely observational: nothing here feeds back into
// any decision the hook or matcher makes, so wiring it up cannot change
// counting/lifecycle/switching behavior in any way.
const isDevBuild = import.meta.env.DEV;

interface VoiceDebugEntry {
  t: string;
  tag: string;
  data?: unknown;
}

const MAX_DEBUG_LOG_ENTRIES = 4000;

function emitVoiceDebug(tag: string, data?: unknown): void {
  if (!isDevBuild) return;
  const t = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  console.log(`[dithar:voice] ${t} ${tag}`, data ?? "");
  if (typeof window === "undefined") return;
  const w = window as unknown as { __ditharVoiceDebugLog?: VoiceDebugEntry[] };
  if (!w.__ditharVoiceDebugLog) w.__ditharVoiceDebugLog = [];
  w.__ditharVoiceDebugLog.push({ t, tag, data });
  if (w.__ditharVoiceDebugLog.length > MAX_DEBUG_LOG_ENTRIES) {
    w.__ditharVoiceDebugLog.splice(0, w.__ditharVoiceDebugLog.length - MAX_DEBUG_LOG_ENTRIES);
  }
}

// One console-invokable helper, attached once at module load — never a
// visible UI element. Run `__ditharVoiceDebugDownload()` in the browser
// devtools console after a reproduction to save the full captured session
// as a JSON file (also available live as `window.__ditharVoiceDebugLog`).
if (isDevBuild && typeof window !== "undefined") {
  const w = window as unknown as { __ditharVoiceDebugDownload?: () => void; __ditharVoiceDebugLog?: VoiceDebugEntry[] };
  if (!w.__ditharVoiceDebugDownload) {
    w.__ditharVoiceDebugDownload = () => {
      const log = w.__ditharVoiceDebugLog ?? [];
      const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dithar-voice-debug-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`[dithar:voice] downloaded ${log.length} log entries`);
    };
  }
}

export type VoiceTasbeehStatus = "idle" | "requesting" | "listening" | "denied" | "no-mic" | "unsupported" | "error";

interface UseVoiceTasbeehOptions {
  enabled: boolean;
  targetPhrase: string;
  // `matchedTargetPhrase` is the target the completion was ACTUALLY matched
  // against — read from inside this hook at the moment the matcher produced
  // it, never inferred by the caller from its own current state. This is
  // deliberately NOT always equal to the `targetPhrase` most recently passed
  // in: a target switch's superseded native instance can still deliver one
  // last, fully valid trailing completion (see the stop()-based lifecycle
  // fix below) for the OLD target after the caller has already moved its
  // own selection on to a new one. Callers MUST credit whatever this
  // parameter says, not whatever they currently consider "selected" —
  // otherwise a real, correctly-isolated completion for the old target can
  // end up credited to the new one.
  onMatch: (times: number, matchedTargetPhrase: string) => void;
  // Called when the 60-second inactivity watchdog fires, so the host can
  // flip its own enabled/toggle state off — the feature must genuinely
  // return to OFF, not just an internal status flag, requiring a fresh,
  // deliberate re-activation.
  onIdleTimeout: () => void;
}

interface UseVoiceTasbeehResult {
  status: VoiceTasbeehStatus;
  justMatched: boolean;
  // TEMPORARY — see the VoicePipelineDiagnostic block above. Remove this
  // field alongside that block once the pipeline issue is confirmed.
  diagnostics: VoicePipelineDiagnostic;
}

// Named, explicit recognition locale (see the approved design's locale
// strategy) rather than an inline/implicit value — the matcher's
// normalization/fuzzy layers carry the real burden of tolerating diverse
// pronunciation; this only selects the recognizer's starting transcription
// quality. Changing it is a session-level reconfiguration (like enable),
// never a live/runtime toggle — unlike target switching, which never
// restarts recognition.
const VOICE_TASBEEH_LOCALE = "ar-SA";

// Answers "has the USER stopped reciting" — driven by
// lastGenuineActivityAtRef, which only moves on genuine dhikr-attempt
// speech (see VoiceTasbeehMatcher.processSegment's hadGenuineActivity).
// Unchanged in meaning by the recognizer-health mechanism below.
export const INACTIVITY_TIMEOUT_MS = 60_000;

// Answers a DIFFERENT question — "has the RECOGNIZER ITSELF gone quiet,
// independent of whether the user is speaking" — driven by
// lastResultEventAtRef, which moves on ANY event the recognizer produces
// (a result OR an error), not just ones the matcher judges as genuine
// dhikr engagement.
//
// Deliberately expressed as a fraction of INACTIVITY_TIMEOUT_MS (1/4)
// rather than a standalone guessed number, so the two stay tunable
// together and their relationship stays explicit. The rationale: the
// longest item in the dhikr library (src/data/tasbeeh-library.json item
// 14 — seven comma-separated clauses, "...اللهم اغفر لي، اللهم ارحمني،
// اللهم ارزقني") has natural inter-clause breathing pauses on the order
// of a few seconds, nowhere near a quarter of a minute, and ordinary
// SpeechRecognition interim-update gaps are shorter still. 15s therefore
// leaves a wide, deliberate margin above any plausible natural pause or
// recognizer buffering gap — it will not misfire on genuine continued
// use — while still recovering a genuinely stalled session with most of
// the 60s budget still intact, rather than silently burning nearly all
// of it before anything reacts.
export const RECOGNIZER_STALL_THRESHOLD_MS = INACTIVITY_TIMEOUT_MS / 4;

const WATCHDOG_CHECK_INTERVAL_MS = 1_000;
const JUST_MATCHED_PULSE_MS = 400;

// After this many consecutive restarts caused by a GENERIC (non-benign,
// non-permission/mic) recognition error — e.g. a persistent "network"
// failure with no connectivity — the session stops outright instead of
// continuing to restart. Without this, such a failure would otherwise
// keep restarting on every onend, bounded only by the 60s inactivity
// watchdog (INACTIVITY_TIMEOUT_MS), which could still mean many rapid
// restarts within that window for a condition that isn't going to
// resolve itself. 3 is deliberately small: "no-speech" (silence between
// repetitions, the overwhelmingly common restart cause during normal use)
// never counts toward this at all (see the onerror branch below), so
// legitimate use is never at risk of tripping it — only a genuinely
// persistent, non-benign failure is.
const MAX_CONSECUTIVE_GENERIC_ERRORS = 3;

// On native Android, prefer NativeAndroidSpeechRecognition over the
// browser's own webkitSpeechRecognition: the embedded WebView accepts a
// SpeechRecognition session (onstart fires) but never engages its
// recognition backend at all (confirmed via the temporary pipeline
// diagnostic — onaudiostart/onspeechstart/onresult never fire), a
// platform limitation of embedded WebView specifically, not present in
// the standalone Chrome browser. Everywhere else (the web/browser build,
// this app's own dev server, GitHub Pages, any future non-Android
// platform) keeps using window.SpeechRecognition/webkitSpeechRecognition
// completely unchanged. Nothing below this function needs to know which
// branch fired — both sides return a constructor for a class that
// satisfies the exact same ambient `SpeechRecognition` interface.
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (isNativeVoiceRecognitionAvailable()) {
    return NativeAndroidSpeechRecognition as unknown as SpeechRecognitionConstructor;
  }
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ============================================================================
// TEMPORARY VOICE PIPELINE DIAGNOSTIC — added 2026-09-18 to investigate the
// "microphone permission now works, but Voice Tasbeeh never counts anything"
// APK report. Deliberately UNCONDITIONAL — never gated by
// isDevBuild/import.meta.env.DEV like emitVoiceDebug above: that entire
// system is compiled out of the exact production JS bundle this app's APK
// ships (Vite's DEV flag is false for `vite build`, dev or release native
// shell alike), so today there is literally no way to observe anything about
// the recognition pipeline on a real device. This block is read-only
// bookkeeping ONLY — every field is derived AFTER the fact from events the
// existing handlers already receive; nothing here is ever read back by any
// matching/counting/lifecycle decision, and it changes no existing
// behavior except adding a small number of extra re-renders while Voice
// Tasbeeh is enabled.
//
// REMOVAL: once the pipeline issue is confirmed and this is no longer
// needed, delete this whole block, the `diagnosticsRef`/`updateDiagnostics`
// wiring inside the hook below, the five new recognition.on*
// (onaudiostart/onspeechstart/onspeechend/onaudioend/onnomatch) handlers,
// the extra updateDiagnostics(...) calls inside the existing
// onstart/onresult/onerror/onend handlers, the `diagnostics` field from
// this hook's return value and UseVoiceTasbeehResult, the matching optional
// fields in speechRecognition.d.ts, and TasbeehScreen.tsx's diagnostic panel.
export interface VoicePipelineDiagnostic {
  recognitionApiAvailable: boolean;
  instancesStarted: number;
  onstartCount: number;
  onaudiostartCount: number;
  onspeechstartCount: number;
  onspeechendCount: number;
  onaudioendCount: number;
  onresultCount: number;
  onnomatchCount: number;
  onerrorCount: number;
  onendCount: number;
  lastRawTranscript: string | null;
  lastIsFinal: boolean | null;
  recognitionLang: string;
  lastErrorCode: string | null;
  // TEMPORARY DIAGNOSTIC — added 2026-09-19 alongside
  // VoiceRecognitionPlugin.kt's own onError diagnostic logging, to
  // investigate the "onstart=0 onerror=1610" APK report. Round-tripped
  // from the native layer via the spec's own
  // SpeechRecognitionErrorEvent.message field — carries the RAW Android
  // SpeechRecognizer.ERROR_* int/name that `lastErrorCode` above
  // deliberately collapses away. Always null on the browser
  // (webkitSpeechRecognition) path, which never populates `message`.
  lastErrorMessage: string | null;
  totalCompletionsSeen: number;
  lastEventAt: string | null;
}

function makeEmptyVoicePipelineDiagnostic(): VoicePipelineDiagnostic {
  return {
    recognitionApiAvailable: getSpeechRecognitionConstructor() !== null,
    instancesStarted: 0,
    onstartCount: 0,
    onaudiostartCount: 0,
    onspeechstartCount: 0,
    onspeechendCount: 0,
    onaudioendCount: 0,
    onresultCount: 0,
    onnomatchCount: 0,
    onerrorCount: 0,
    onendCount: 0,
    lastRawTranscript: null,
    lastIsFinal: null,
    recognitionLang: VOICE_TASBEEH_LOCALE,
    lastErrorCode: null,
    lastErrorMessage: null,
    totalCompletionsSeen: 0,
    lastEventAt: null,
  };
}
// ============================================================================

// Owns the native SpeechRecognition lifecycle and the two watchdogs; feeds
// every recognition result through a single VoiceTasbeehMatcher instance
// (src/lib/voiceTasbeehMatch.ts), which does all the actual matching —
// this hook's only job is adapting browser events into that engine's
// small SegmentUpdate shape and reacting to its output.
export function useVoiceTasbeeh({ enabled, targetPhrase, onMatch, onIdleTimeout }: UseVoiceTasbeehOptions): UseVoiceTasbeehResult {
  const [status, setStatus] = useState<VoiceTasbeehStatus>("idle");
  const [justMatched, setJustMatched] = useState(false);

  // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
  // `diagnosticsRef` is the source of truth (read/patched synchronously from
  // inside recognition event handlers, same pattern as this hook's other
  // refs); `diagnostics` state exists only to make those patches visible to
  // TasbeehScreen's diagnostic panel via a re-render. Remove both alongside
  // that block once the pipeline issue is confirmed.
  const diagnosticsRef = useRef<VoicePipelineDiagnostic>(makeEmptyVoicePipelineDiagnostic());
  const [diagnostics, setDiagnostics] = useState<VoicePipelineDiagnostic>(diagnosticsRef.current);
  function updateDiagnostics(patch: Partial<VoicePipelineDiagnostic>) {
    diagnosticsRef.current = { ...diagnosticsRef.current, ...patch, lastEventAt: new Date().toISOString().slice(11, 23) };
    setDiagnostics(diagnosticsRef.current);
  }

  const matcherRef = useRef<VoiceTasbeehMatcher | null>(null);
  if (matcherRef.current === null) {
    matcherRef.current = new VoiceTasbeehMatcher(
      isDevBuild ? (event: MatcherDebugEvent) => emitVoiceDebug("matcher:segment", event) : undefined,
    );
  }

  // DEV-ONLY: always-current mirror of the latest targetPhrase, read from
  // inside the recognition-lifecycle effect below (which intentionally
  // depends only on `enabled`, never `targetPhrase` — target switching must
  // never restart recognition) purely for log labeling. Kept current via
  // its own effect (same established pattern as onMatchRef/onIdleTimeoutRef
  // above) rather than a real dependency, which would defeat that guarantee.
  const targetPhraseRef = useRef(targetPhrase);
  useEffect(() => {
    targetPhraseRef.current = targetPhrase;
  }, [targetPhrase]);

  // The target the MATCHER actually currently has loaded — i.e. whatever
  // was last passed to `matcherRef.current!.setTarget(...)`. Deliberately
  // NOT the same thing as `targetPhraseRef` above: that mirrors the PROP
  // (the caller's current selection) the instant it changes, via a
  // `targetPhrase`-dependent effect — exactly the value a target switch's
  // trailing completion must NOT be attributed to, since the prop can (and
  // during a switch, always does) change before the superseded native
  // instance's own last result has been processed. This ref instead only
  // ever moves at the two places `setTarget` itself is called (immediately
  // below, and inside `apply` further down), so it always reflects reality
  // one matching call behind the prop when a switch is in flight — which is
  // exactly the OLD target, for exactly as long as the old instance can
  // still legitimately report against it. Read once, synchronously, at the
  // moment `onMatch` is invoked inside `onresult` — nothing else can call
  // `setTarget` in between, since JS execution of that handler is atomic.
  const activeTargetPhraseRef = useRef(targetPhrase);

  // DEV-ONLY bookkeeping, purely for log context — never read by any
  // matching/lifecycle decision.
  const instanceIdRef = useRef(0);
  const previousTargetPhraseRef = useRef<string | null>(null);
  const lastResultIndexRef = useRef<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const intentionalStopRef = useRef(false);
  const lastGenuineActivityAtRef = useRef(0);
  // Whether the CURRENT instance has confirmed onstart and is therefore
  // expected to be actively producing events. Deliberately a ref (not
  // derived from `status`, which the health-check interval's closure
  // would otherwise read as a stale snapshot from whenever the effect
  // last ran) — false during the initial mic/engine startup handshake
  // (so the health check never misfires on issue-#1-style startup
  // latency, which is a separate, unfixable-by-us concern), true from
  // onstart until the instance is torn down for any reason.
  const isListeningRef = useRef(false);
  const lastResultEventAtRef = useRef(0);
  // Counts consecutive restarts caused by a GENERIC (else-branch) onerror
  // — never "no-speech" (benign, the expected gap between repetitions) or
  // "not-allowed"/"service-not-allowed"/"audio-capture" (those already
  // stop outright via intentionalStopRef, see onerror below). Without
  // this, a persistent underlying failure (e.g. no network reachable for
  // a cloud-backed recognizer) would restart on every onend indefinitely
  // — bounded only by the 60s inactivity watchdog, which could still mean
  // many rapid restarts in that window. Reset to 0 the moment there's any
  // real sign of life (a genuine onresult) or a fresh, deliberate
  // `enabled` activation — see both reset sites below — so a single
  // transient glitch during otherwise-healthy use never trips this.
  const consecutiveGenericErrorCountRef = useRef(0);
  const justMatchedTimerRef = useRef<number | null>(null);
  // Populated by the recognition-lifecycle effect below (only while
  // `enabled`) with a closure that safely swaps in a brand-new native
  // recognizer instance for whatever target is now active — see the
  // target-switching effect, which is the only caller. Kept as a ref
  // (rather than making the lifecycle effect depend on `targetPhrase`
  // too) so a target switch never tears down/recreates the watchdog
  // interval or touches session-wide state — it only ever swaps the one
  // native recognition object. Null whenever no recognizer is running
  // (not yet enabled, or torn down) — calling it is then simply a no-op,
  // which is exactly correct: nothing to refresh.
  const refreshRecognitionRef = useRef<((newTargetPhrase: string) => void) | null>(null);
  // Set only while a target-switch refresh is waiting for the SUPERSEDED
  // native instance to finish gracefully (see refreshRecognitionRef below):
  // holds the continuation that applies the new target and starts the
  // fresh instance, invoked from that old instance's own onend once it
  // actually stops (never a fixed delay — purely event-driven). Null the
  // rest of the time, including whenever no target switch is in flight.
  const pendingTargetSwitchRef = useRef<(() => void) | null>(null);

  // Kept current via refs rather than effect dependencies, so a caller
  // passing a fresh onMatch/onIdleTimeout closure every render never
  // tears down and restarts the native recognition session.
  const onMatchRef = useRef(onMatch);
  const onIdleTimeoutRef = useRef(onIdleTimeout);
  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);
  useEffect(() => {
    onIdleTimeoutRef.current = onIdleTimeout;
  }, [onIdleTimeout]);

  // Target switching refreshes the native recognizer for whatever target
  // is now active (see refreshRecognitionRef below for why a refresh
  // happens at all). The new logical matching boundary (setTarget — see
  // VoiceTasbeehMatcher.setTarget and, for the fallback-replay case
  // specifically, its postSwitchFloor/preSwitchSnapshot mechanism) is
  // applied by that same refresh, NOT here directly — see refreshRecognitionRef's
  // own comment for why that matters (it must stay behind, not ahead of,
  // whatever the superseded instance still has left to report). This is
  // never a user-visible restart: status stays "listening"
  // (refreshRecognitionRef's own startInstance call re-derives it from
  // scratch, same as any transparent restart already does), no UI change,
  // and any late event from the SUPERSEDED instance that arrives after ITS
  // OWN teardown is inert by construction (every recognition.onstart/
  // onresult/onerror/onend handler already guards on
  // `recognitionRef.current !== recognition` — a plain object-identity
  // check that a brand-new instance automatically defeats, with no
  // separate generation counter needed). refreshRecognitionRef is null
  // until the OTHER (enabled-driven) effect has actually started a first
  // recognizer, so the very first target application (before anything is
  // listening yet) safely no-ops here.
  useEffect(() => {
    if (isDevBuild) {
      const recognition = recognitionRef.current as unknown as { __ditharInstanceId?: number } | null;
      emitVoiceDebug("target-switch:requested", {
        oldTargetPhrase: previousTargetPhraseRef.current,
        newTargetPhrase: targetPhrase,
        snapshotBefore: matcherRef.current!.getDebugSnapshot(),
        recognitionInstanceId: recognition?.__ditharInstanceId ?? null,
        lastResultIndex: lastResultIndexRef.current,
      });
    }
    if (refreshRecognitionRef.current) {
      refreshRecognitionRef.current(targetPhrase);
    } else {
      // No recognizer subsystem running yet to hand off gracefully — this
      // is the very first target application, on initial mount, before
      // the enabled-driven effect below has populated refreshRecognitionRef.
      // There is nothing to preserve/stop, so apply directly; the
      // enabled-driven effect's own startInstance("initial") call (later
      // in this same commit) picks up whatever target is already set.
      matcherRef.current!.setTarget(targetPhrase);
      activeTargetPhraseRef.current = targetPhrase;
      if (isDevBuild) {
        emitVoiceDebug("target-switch:applied", {
          newTargetPhrase: targetPhrase,
          snapshotAfter: matcherRef.current!.getDebugSnapshot(),
        });
        previousTargetPhraseRef.current = targetPhrase;
      }
    }
  }, [targetPhrase]);

  useEffect(() => {
    if (!enabled) {
      if (isDevBuild) emitVoiceDebug("abort", { reason: "disabled" });
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      refreshRecognitionRef.current = null;
      // A pending target-switch continuation (see refreshRecognitionRef)
      // would otherwise survive this teardown and wrongly fire on some
      // unrelated future instance's onend after a later re-enable.
      pendingTargetSwitchRef.current = null;
      matcherRef.current!.resetAll();
      setStatus("idle");
      if (isDevBuild) emitVoiceDebug("status", { status: "idle", reason: "disabled" });
      return;
    }

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setStatus("unsupported");
      if (isDevBuild) emitVoiceDebug("status", { status: "unsupported" });
      return;
    }

    intentionalStopRef.current = false;
    matcherRef.current!.resetAll();
    lastGenuineActivityAtRef.current = Date.now();
    consecutiveGenericErrorCountRef.current = 0;
    setStatus("requesting");
    if (isDevBuild) emitVoiceDebug("status", { status: "requesting", targetPhrase: targetPhraseRef.current });

    // A single entry point for both the initial start and every
    // transparent restart — whether the browser dropped the session on
    // its own, or our own recognizer-health check proactively aborted a
    // silently stalled one (see the watchdog below). Always a brand-new
    // instance (safer across browsers than reusing a stopped one),
    // always reassigning recognitionRef so the
    // `recognitionRef.current !== recognition` guard in every handler
    // below can tell a stale/superseded instance's late events apart
    // from the current one. No timers are involved in restarting itself:
    // it is driven entirely by onend, so there is exactly one restart
    // path and no possibility of overlapping sessions.
    function startInstance(debugReason?: string) {
      const recognition = new RecognitionCtor!();
      recognition.lang = VOICE_TASBEEH_LOCALE;
      recognition.continuous = true;
      recognition.interimResults = true;

      const instanceId = isDevBuild ? ++instanceIdRef.current : 0;
      if (isDevBuild) {
        (recognition as unknown as { __ditharInstanceId: number }).__ditharInstanceId = instanceId;
      }

      // Per-instance — NOT a ref — since it must reset to false for every
      // fresh startInstance() call. Answers "did THIS instance ever
      // confirm onstart before it errored/ended". Feeds the onerror
      // "no-speech" branch below: see that branch's own comment for why a
      // benign classification is only valid AFTER a session actually got
      // going.
      let reachedOnStart = false;

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        reachedOnStart = true;
        // A fresh native session (including any restart) means the
        // browser's result indexing starts over — clear per-session
        // transport bookkeeping. Target progress deliberately survives
        // (see VoiceTasbeehMatcher.resetSession) — a health restart must
        // never lose progress toward the current target.
        matcherRef.current!.resetSession();
        // Fresh grace period for the new instance: it hasn't produced a
        // single event yet, which must not itself look like a stall.
        lastResultEventAtRef.current = Date.now();
        isListeningRef.current = true;
        setStatus("listening");
        if (isDevBuild) {
          emitVoiceDebug("onstart", { instanceId, debugReason, snapshot: matcherRef.current!.getDebugSnapshot() });
          emitVoiceDebug("status", { status: "listening", instanceId });
        }
        // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
        updateDiagnostics({ onstartCount: diagnosticsRef.current.onstartCount + 1 });
      };

      // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
      // Five additional lifecycle events this hook has never listened to
      // before: purely observational, no existing behavior (status/
      // matching/watchdogs) reacts to any of them.
      recognition.onaudiostart = () => {
        if (recognitionRef.current !== recognition) return;
        updateDiagnostics({ onaudiostartCount: diagnosticsRef.current.onaudiostartCount + 1 });
      };
      recognition.onspeechstart = () => {
        if (recognitionRef.current !== recognition) return;
        updateDiagnostics({ onspeechstartCount: diagnosticsRef.current.onspeechstartCount + 1 });
      };
      recognition.onspeechend = () => {
        if (recognitionRef.current !== recognition) return;
        updateDiagnostics({ onspeechendCount: diagnosticsRef.current.onspeechendCount + 1 });
      };
      recognition.onaudioend = () => {
        if (recognitionRef.current !== recognition) return;
        updateDiagnostics({ onaudioendCount: diagnosticsRef.current.onaudioendCount + 1 });
      };
      recognition.onnomatch = () => {
        if (recognitionRef.current !== recognition) return;
        updateDiagnostics({ onnomatchCount: diagnosticsRef.current.onnomatchCount + 1 });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (recognitionRef.current !== recognition) return;
        // Recognizer-health signal: ANY result event, regardless of its
        // content, proves the recognizer is still alive and talking to
        // us. Updated unconditionally, before matching even runs.
        lastResultEventAtRef.current = Date.now();
        // A real result is proof of life — clears any generic-error
        // restart streak (see consecutiveGenericErrorCountRef's own
        // comment) so a later, unrelated transient error still gets its
        // own full retry budget instead of inheriting an unrelated
        // earlier streak.
        consecutiveGenericErrorCountRef.current = 0;

        if (isDevBuild) {
          lastResultIndexRef.current = event.resultIndex;
          emitVoiceDebug("onresult:event", {
            instanceId,
            resultIndex: event.resultIndex,
            resultsLength: event.results.length,
            allResults: Array.from({ length: event.results.length }, (_, i) => ({
              i,
              isFinal: event.results[i].isFinal,
              rawTranscript: event.results[i][0]?.transcript ?? "",
            })),
            isListening: isListeningRef.current,
            msSinceLastResultEvent: 0, // this event IS the last one, by definition
            msSinceLastGenuineActivity: Date.now() - lastGenuineActivityAtRef.current,
          });
        }

        let totalCompletions = 0;
        let anyGenuineActivity = false;
        // TEMPORARY — see the VoicePipelineDiagnostic block above this
        // hook. Captured from inside the loop below (never read by it) so
        // the diagnostic reflects whatever the LAST segment in this event
        // actually was, same raw text/isFinal the matcher itself just saw.
        let lastRawTranscriptThisEvent: string | null = null;
        let lastIsFinalThisEvent: boolean | null = null;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const rawTranscript = result[0]?.transcript ?? "";
          if (isDevBuild) {
            emitVoiceDebug("onresult:raw", { instanceId, segmentId: i, isFinal: result.isFinal, rawTranscript });
          }
          lastRawTranscriptThisEvent = rawTranscript;
          lastIsFinalThisEvent = result.isFinal;
          const { completions, hadGenuineActivity } = matcherRef.current!.processSegment({
            segmentId: i,
            text: rawTranscript,
            isFinal: result.isFinal,
          });
          totalCompletions += completions;
          if (hadGenuineActivity) anyGenuineActivity = true;
        }
        // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
        updateDiagnostics({
          onresultCount: diagnosticsRef.current.onresultCount + 1,
          lastRawTranscript: lastRawTranscriptThisEvent,
          lastIsFinal: lastIsFinalThisEvent,
          totalCompletionsSeen: diagnosticsRef.current.totalCompletionsSeen + totalCompletions,
        });
        // User/dhikr-activity signal — deliberately separate from the
        // health signal above: this only moves when the matcher judges
        // the new content as genuinely engaging the current target (see
        // VoiceTasbeehMatcher.processSegment), which is what the
        // 60-second "user stopped reciting" watchdog must key off.
        if (anyGenuineActivity) {
          lastGenuineActivityAtRef.current = Date.now();
        }
        if (totalCompletions > 0) {
          // activeTargetPhraseRef, never targetPhraseRef/the `targetPhrase`
          // prop: this must credit whatever target the matcher ACTUALLY had
          // loaded for the processSegment calls above, which — during a
          // target switch's trailing-completion window — is still the OLD
          // target, even though the prop (and targetPhraseRef, and the
          // caller's own "selected" state) may have already moved on.
          onMatchRef.current(totalCompletions, activeTargetPhraseRef.current);
          setJustMatched(true);
          if (justMatchedTimerRef.current !== null) {
            window.clearTimeout(justMatchedTimerRef.current);
          }
          justMatchedTimerRef.current = window.setTimeout(() => setJustMatched(false), JUST_MATCHED_PULSE_MS);
        }
        if (isDevBuild) {
          emitVoiceDebug("onresult:summary", {
            instanceId,
            totalCompletions,
            anyGenuineActivity,
            snapshotAfter: matcherRef.current!.getDebugSnapshot(),
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (recognitionRef.current !== recognition) return;
        // An error event — any error — is still proof the recognizer is
        // alive and communicating, so it counts toward recognizer health
        // exactly like a result does; it never counts toward user/dhikr
        // activity (that stays scoped to genuine matched speech only).
        lastResultEventAtRef.current = Date.now();
        if (isDevBuild) emitVoiceDebug("onerror", { instanceId, error: event.error, message: event.message, reachedOnStart });
        // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
        updateDiagnostics({
          onerrorCount: diagnosticsRef.current.onerrorCount + 1,
          lastErrorCode: event.error,
          lastErrorMessage: event.message || null,
        });

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          intentionalStopRef.current = true;
          isListeningRef.current = false;
          setStatus("denied");
          if (isDevBuild) emitVoiceDebug("status", { status: "denied", instanceId });
        } else if (event.error === "audio-capture") {
          intentionalStopRef.current = true;
          isListeningRef.current = false;
          setStatus("no-mic");
          if (isDevBuild) emitVoiceDebug("status", { status: "no-mic", instanceId });
        } else if (event.error === "no-speech" && reachedOnStart) {
          // Benign in continuous mode — onend decides whether to restart.
          // Deliberately does NOT touch consecutiveGenericErrorCountRef:
          // this is the expected, frequent gap between repetitions during
          // completely normal use, never a sign of an actual problem.
          // Guarded on reachedOnStart (see its own declaration above) —
          // see the else branch immediately below for why a "no-speech"
          // BEFORE onstart is treated completely differently.
        } else {
          // Reached for every non-benign error, AND for "no-speech" when
          // reachedOnStart is still false — i.e. the recognizer errored
          // out before ever confirming it was actually listening. That is
          // NOT the expected "quiet gap between repetitions" case the
          // branch above exists for (this session never got that far), so
          // it must count toward the circuit breaker just like any other
          // persistent failure. Without this, a recognizer/service that
          // fails immediately on every single session — reported
          // "no-speech"/timeout by the OS before onReadyForSpeech ever
          // fires — would restart as fast as the event loop allows,
          // completely unbounded until the 60s inactivity watchdog
          // (thousands of restarts observed on a real device from exactly
          // this pattern), instead of stopping outright after
          // MAX_CONSECUTIVE_GENERIC_ERRORS like any other persistent
          // failure already does.
          consecutiveGenericErrorCountRef.current += 1;
          if (consecutiveGenericErrorCountRef.current >= MAX_CONSECUTIVE_GENERIC_ERRORS) {
            // A persistent, non-benign failure that isn't resolving on
            // its own (e.g. no network reachable) — stop outright rather
            // than let onend keep restarting for up to the full 60s
            // inactivity window. Same shutdown shape as the
            // denied/no-mic branches above: intentionalStopRef prevents
            // onend's restart path, isListeningRef reflects that nothing
            // is listening anymore.
            intentionalStopRef.current = true;
            isListeningRef.current = false;
          }
          setStatus("error");
          if (isDevBuild) {
            emitVoiceDebug("status", {
              status: "error",
              instanceId,
              consecutiveGenericErrorCount: consecutiveGenericErrorCountRef.current,
            });
          }
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
        updateDiagnostics({ onendCount: diagnosticsRef.current.onendCount + 1 });
        // A target-switch refresh is waiting on THIS instance specifically
        // (see refreshRecognitionRef below) — stop() has now finished
        // flushing whatever was already captured (any trailing onresult
        // for it has already fired above, using the OLD target, before
        // this), so it's safe to apply the new target and start fresh.
        // Checked before intentionalStopRef below because a target-switch
        // stop is a distinct case from a plain intentional full stop: it
        // must restart (for the new target), not just tear down.
        const pending = pendingTargetSwitchRef.current;
        if (pending !== null) {
          pendingTargetSwitchRef.current = null;
          recognitionRef.current = null;
          if (isDevBuild) emitVoiceDebug("onend", { instanceId, intentionalStop: true, willRestart: true, reason: "target-switch-refresh" });
          pending();
          return;
        }
        if (intentionalStopRef.current) {
          if (isDevBuild) emitVoiceDebug("onend", { instanceId, intentionalStop: true, willRestart: false });
          recognitionRef.current = null;
          return;
        }
        // Not our doing — either the browser dropped the session on its
        // own, or the recognizer-health check below proactively aborted
        // a silently stalled one. Both take the exact same, single
        // restart path: transparent to the user, no distinction needed.
        if (isDevBuild) emitVoiceDebug("onend", { instanceId, intentionalStop: false, willRestart: true });
        startInstance("restart-after-onend");
      };

      recognitionRef.current = recognition;
      if (isDevBuild) {
        emitVoiceDebug("start", { instanceId, debugReason: debugReason ?? "initial", targetPhrase: targetPhraseRef.current });
      }
      // TEMPORARY — see the VoicePipelineDiagnostic block above this hook.
      updateDiagnostics({ instancesStarted: diagnosticsRef.current.instancesStarted + 1 });
      recognition.start();
    }

    startInstance("initial");

    // See refreshRecognitionRef's own declaration above — the ONLY caller
    // is the separate target-switching effect. Uses recognition.stop(),
    // never abort(): abort() cancels immediately and discards whatever
    // audio the browser had already captured for the CURRENT, not-yet-
    // finalized recitation but hadn't transcribed yet — on a real device,
    // that silently ate a genuine, already-spoken final repetition right
    // at the moment the user switched dhikr (proven on a real-device
    // capture — see voice-tasbeeh-validation-report.md). stop() instead
    // lets the engine finish processing already-captured audio (firing
    // any trailing onresult first) before onend fires.
    //
    // That trailing onresult, if it comes, MUST be scored against the OLD
    // target, never the new one — so, unlike before, setTarget is
    // deliberately NOT called here up front. It's deferred into `apply`
    // below, which only runs from the superseded instance's OWN onend
    // handler (see above) once that instance has fully finished — by
    // construction, any onresult this instance still fires arrives before
    // that, while the matcher still has the OLD target loaded, so it's
    // matched and counted exactly like any other mid-recitation result.
    // Only once `apply` actually runs does the new logical boundary get
    // established and the fresh native session start — mirroring the
    // ordering the original synchronous version had, just resolved by an
    // event instead of happening unconditionally in the same tick.
    //
    // A rapid second target switch before the first has finished simply
    // overwrites pendingTargetSwitchRef with the newer closure (`apply`
    // captures its own `newTargetPhrase`) — the superseded instance's
    // eventual onend then applies whichever target is newest, which is
    // exactly correct: the intermediate target was already abandoned by
    // the user's own next switch.
    refreshRecognitionRef.current = (newTargetPhrase) => {
      // A target switch is itself genuine user engagement — it must
      // never be allowed to silently eat into the 60s inactivity budget
      // while the fresh instance's own first result is still pending.
      lastGenuineActivityAtRef.current = Date.now();

      const apply = () => {
        matcherRef.current!.setTarget(newTargetPhrase);
        activeTargetPhraseRef.current = newTargetPhrase;
        if (isDevBuild) {
          emitVoiceDebug("target-switch:applied", {
            newTargetPhrase,
            snapshotAfter: matcherRef.current!.getDebugSnapshot(),
          });
          previousTargetPhraseRef.current = newTargetPhrase;
        }
        intentionalStopRef.current = false;
        startInstance("refresh-after-target-switch");
      };

      if (recognitionRef.current === null) {
        // Nothing currently listening (e.g. the very first target
        // application before startup finished) — nothing to gracefully
        // stop, so apply immediately, exactly as the old synchronous
        // version did.
        apply();
        return;
      }

      if (isDevBuild) emitVoiceDebug("stop", { reason: "target-switch-refresh" });
      pendingTargetSwitchRef.current = apply;
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current.stop();
    };

    // Two independent signals, one shared interval. Order matters: a
    // full 60s of true silence always wins and hard-stops, even if a
    // health-stall condition also happens to be true at that instant —
    // there's nothing left to "recover" for a session the user has
    // genuinely abandoned.
    const watchdog = window.setInterval(() => {
      const now = Date.now();

      if (now - lastGenuineActivityAtRef.current >= INACTIVITY_TIMEOUT_MS) {
        // Fires exactly once: stop checking immediately, since the
        // session is now over and lastGenuineActivityAtRef will never
        // move again on its own — without this, the interval would keep
        // re-firing (and re-aborting/re-notifying) every tick until the
        // host reacts to onIdleTimeout by flipping `enabled` off. This
        // is a full, deliberate shutdown — never a gate on counting
        // speed, and unchanged in meaning from before this fix.
        if (isDevBuild) {
          emitVoiceDebug("abort", { reason: "60s-idle-timeout" });
          emitVoiceDebug("status", { status: "idle", reason: "60s-idle-timeout" });
        }
        window.clearInterval(watchdog);
        intentionalStopRef.current = true;
        isListeningRef.current = false;
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        refreshRecognitionRef.current = null;
        matcherRef.current!.resetAll();
        setStatus("idle");
        onIdleTimeoutRef.current();
        return;
      }

      if (isListeningRef.current && now - lastResultEventAtRef.current >= RECOGNIZER_STALL_THRESHOLD_MS) {
        // Recognizer-health recovery: the instance confirmed onstart but
        // has produced NOTHING AT ALL — not even a benign error — for
        // longer than any plausible natural pause. This is never true
        // merely because the user is quietly reciting slowly, and it is
        // never triggered by a target switch (switching never touches
        // recognition at all — see VoiceTasbeehMatcher.setTarget).
        //
        // Proactively abort WITHOUT marking this an intentional stop, so
        // onend above takes its already-tested restart branch. Nothing
        // is counted by this abort itself (no SegmentUpdate is ever
        // produced by calling abort()), matchProgress/targetTokens are
        // untouched (only resetSession()-scoped transport bookkeeping
        // clears, exactly as for any other restart), and the very next
        // genuinely new spoken token — once the fresh instance is up —
        // is processed completely normally.
        //
        // No restart storm is possible: isListeningRef is set false
        // immediately (so this same tick, and any tick before the new
        // instance's own onstart re-arms it, cannot re-trigger), and the
        // new instance gets its own full RECOGNIZER_STALL_THRESHOLD_MS
        // grace period from its own onstart — so even a recognizer that
        // stalls again immediately every single time can restart at
        // most once per threshold window, never faster.
        if (isDevBuild) emitVoiceDebug("abort", { reason: "recognizer-health-stall" });
        isListeningRef.current = false;
        recognitionRef.current?.abort();
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    return () => {
      if (isDevBuild) emitVoiceDebug("abort", { reason: "effect-cleanup" });
      window.clearInterval(watchdog);
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      refreshRecognitionRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (justMatchedTimerRef.current !== null) {
        window.clearTimeout(justMatchedTimerRef.current);
      }
    };
  }, []);

  return { status, justMatched, diagnostics };
}
