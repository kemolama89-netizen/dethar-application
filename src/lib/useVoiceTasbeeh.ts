import { useEffect, useRef, useState } from "react";
import { VoiceTasbeehMatcher, type MatcherDebugEvent } from "./voiceTasbeehMatch";

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
  onMatch: (times: number) => void;
  // Called when the 60-second inactivity watchdog fires, so the host can
  // flip its own enabled/toggle state off — the feature must genuinely
  // return to OFF, not just an internal status flag, requiring a fresh,
  // deliberate re-activation.
  onIdleTimeout: () => void;
}

interface UseVoiceTasbeehResult {
  status: VoiceTasbeehStatus;
  justMatched: boolean;
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

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// Owns the native SpeechRecognition lifecycle and the two watchdogs; feeds
// every recognition result through a single VoiceTasbeehMatcher instance
// (src/lib/voiceTasbeehMatch.ts), which does all the actual matching —
// this hook's only job is adapting browser events into that engine's
// small SegmentUpdate shape and reacting to its output.
export function useVoiceTasbeeh({ enabled, targetPhrase, onMatch, onIdleTimeout }: UseVoiceTasbeehOptions): UseVoiceTasbeehResult {
  const [status, setStatus] = useState<VoiceTasbeehStatus>("idle");
  const [justMatched, setJustMatched] = useState(false);

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
  const justMatchedTimerRef = useRef<number | null>(null);

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

  // Target switching NEVER touches recognition — only the matcher's
  // target-specific progress. See VoiceTasbeehMatcher.setTarget.
  useEffect(() => {
    if (isDevBuild) {
      const recognition = recognitionRef.current as unknown as { __ditharInstanceId?: number } | null;
      emitVoiceDebug("target-switch:before", {
        oldTargetPhrase: previousTargetPhraseRef.current,
        newTargetPhrase: targetPhrase,
        snapshotBefore: matcherRef.current!.getDebugSnapshot(),
        recognitionInstanceId: recognition?.__ditharInstanceId ?? null,
        lastResultIndex: lastResultIndexRef.current,
      });
    }
    matcherRef.current!.setTarget(targetPhrase);
    if (isDevBuild) {
      emitVoiceDebug("target-switch:after", {
        newTargetPhrase: targetPhrase,
        snapshotAfter: matcherRef.current!.getDebugSnapshot(),
      });
      previousTargetPhraseRef.current = targetPhrase;
    }
  }, [targetPhrase]);

  useEffect(() => {
    if (!enabled) {
      if (isDevBuild) emitVoiceDebug("abort", { reason: "disabled" });
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
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

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
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
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (recognitionRef.current !== recognition) return;
        // Recognizer-health signal: ANY result event, regardless of its
        // content, proves the recognizer is still alive and talking to
        // us. Updated unconditionally, before matching even runs.
        lastResultEventAtRef.current = Date.now();

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
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const rawTranscript = result[0]?.transcript ?? "";
          if (isDevBuild) {
            emitVoiceDebug("onresult:raw", { instanceId, segmentId: i, isFinal: result.isFinal, rawTranscript });
          }
          const { completions, hadGenuineActivity } = matcherRef.current!.processSegment({
            segmentId: i,
            text: rawTranscript,
            isFinal: result.isFinal,
          });
          totalCompletions += completions;
          if (hadGenuineActivity) anyGenuineActivity = true;
        }
        // User/dhikr-activity signal — deliberately separate from the
        // health signal above: this only moves when the matcher judges
        // the new content as genuinely engaging the current target (see
        // VoiceTasbeehMatcher.processSegment), which is what the
        // 60-second "user stopped reciting" watchdog must key off.
        if (anyGenuineActivity) {
          lastGenuineActivityAtRef.current = Date.now();
        }
        if (totalCompletions > 0) {
          onMatchRef.current(totalCompletions);
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
        if (isDevBuild) emitVoiceDebug("onerror", { instanceId, error: event.error });

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
        } else if (event.error === "no-speech") {
          // Benign in continuous mode — onend decides whether to restart.
        } else {
          setStatus("error");
          if (isDevBuild) emitVoiceDebug("status", { status: "error", instanceId });
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
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
      recognition.start();
    }

    startInstance("initial");

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
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (justMatchedTimerRef.current !== null) {
        window.clearTimeout(justMatchedTimerRef.current);
      }
    };
  }, []);

  return { status, justMatched };
}
