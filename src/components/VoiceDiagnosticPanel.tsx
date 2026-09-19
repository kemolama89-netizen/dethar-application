import type { VoicePipelineDiagnostic } from "../lib/useVoiceTasbeeh";
import { isNativeVoiceRecognitionAvailable } from "../lib/voiceRecognitionNative";

// TEMPORARY DIAGNOSTIC PANEL — added 2026-09-18 to investigate the "mic
// works, nothing counts" APK report. Read-only display of useVoiceTasbeeh's
// `diagnostics` field — touches no counting/matching/status state. Shown
// ONLY inside the native Android app (the same platform check the voice
// hook uses to pick the native recognizer), because that's the only place
// the existing dev-only logging (emitVoiceDebug) is unavailable and the
// only place this is being investigated — the web/browser build never
// renders it. REMOVE this component (and its one use in TasbeehScreen.tsx)
// once the pipeline issue is confirmed.
export function VoiceDiagnosticPanel({ diagnostics }: { diagnostics: VoicePipelineDiagnostic }) {
  if (!isNativeVoiceRecognitionAvailable()) return null;
  return (
    <pre
      className="mt-1 max-w-[280px] whitespace-pre-wrap rounded-lg border p-2 text-start text-[9.5px] leading-[1.4]"
      style={{
        borderColor: "var(--color-gold-soft)",
        background: "var(--color-glass-tint-soft)",
        color: "var(--color-text-muted)",
        direction: "ltr",
      }}
    >
      {"[TEMP DIAGNOSTIC]\n"}
      {`api=${diagnostics.recognitionApiAvailable} instances=${diagnostics.instancesStarted} lang=${diagnostics.recognitionLang}\n`}
      {`onstart=${diagnostics.onstartCount} onaudiostart=${diagnostics.onaudiostartCount} onspeechstart=${diagnostics.onspeechstartCount}\n`}
      {`onspeechend=${diagnostics.onspeechendCount} onaudioend=${diagnostics.onaudioendCount} onnomatch=${diagnostics.onnomatchCount}\n`}
      {`onresult=${diagnostics.onresultCount} onerror=${diagnostics.onerrorCount} onend=${diagnostics.onendCount}\n`}
      {`lastError=${diagnostics.lastErrorCode ?? "-"} completions=${diagnostics.totalCompletionsSeen}\n`}
      {`lastFinal=${diagnostics.lastIsFinal ?? "-"} lastEventAt=${diagnostics.lastEventAt ?? "-"}\n`}
      {`lastErrorMsg=${diagnostics.lastErrorMessage ?? "-"}\n`}
      {`lastTranscript="${diagnostics.lastRawTranscript ?? ""}"`}
    </pre>
  );
}
