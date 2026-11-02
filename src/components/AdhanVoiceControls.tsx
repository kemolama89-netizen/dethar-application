import { Check, Download, Play, Square, Trash2, X } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { adhanAudioLabels } from "../data/adhanAudioLabels";
import type { AdhanRecording } from "../data/adhanRecordings";
import { adhanDownloadBytes, adhanDownloadState, cancelAdhanDownload, downloadAdhan, removeAdhanDownload } from "../lib/adhanDownloads";

const smallButton = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold";
const quiet = { background: "var(--color-gold-soft)", color: "var(--color-primary)" };

/**
 * Beneath a voice's row in the Android app: listen to it (streamed unless it's
 * on the device) and download or remove it (lib/adhanDownloads.ts). The voice
 * chosen for the section can't be removed from here: it would only download again.
 */
export function AdhanVoiceControls({ recording, playing, canRemove, onListen }: { recording: AdhanRecording; playing: boolean; canRemove: boolean; onListen: () => void }) {
  const { language } = useLanguage();
  const t = adhanAudioLabels[language];
  const state = adhanDownloadState(recording.id);
  const name = recording.name[language];
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-1" data-adhan-voice-controls={recording.id} data-adhan-download-state={state.kind}>
      <button type="button" onClick={onListen} aria-pressed={playing} aria-label={`${playing ? t.stop : t.listen}: ${name}`} className={smallButton} style={quiet} data-adhan-listen={recording.id}>
        {playing ? <Square size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
        {playing ? t.stop : t.listen}
      </button>
      {state.kind === "built-in" && (
        <span className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
          {t.builtIn}
        </span>
      )}
      {(state.kind === "none" || state.kind === "failed" || state.kind === "lost") && (
        <button type="button" onClick={() => void downloadAdhan(recording)} aria-label={`${t.download}: ${name}`} className={smallButton} style={quiet} data-adhan-download={recording.id}>
          <Download size={13} strokeWidth={2} />
          {t.downloadSize((adhanDownloadBytes(recording.id) / 1e6).toFixed(1))}
        </button>
      )}
      {state.kind === "downloading" && (
        <>
          <span className="text-[11.5px] tabular-nums" role="status" style={{ color: "var(--color-text-muted)" }} data-adhan-progress={recording.id}>
            {t.downloading(Math.round(state.progress * 100))}
          </span>
          <button type="button" onClick={() => void cancelAdhanDownload(recording.id)} aria-label={`${t.cancel}: ${name}`} className={smallButton} style={quiet} data-adhan-cancel={recording.id}>
            <X size={13} strokeWidth={2} />
            {t.cancel}
          </button>
        </>
      )}
      {state.kind === "downloaded" && (
        <>
          <span className="flex items-center gap-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            <Check size={13} strokeWidth={2.5} style={{ color: "var(--color-gold)" }} />
            {t.downloaded}
          </span>
          {canRemove && (
            <button type="button" onClick={() => void removeAdhanDownload(recording.id)} aria-label={`${t.remove}: ${name}`} className={smallButton} style={quiet} data-adhan-remove={recording.id}>
              <Trash2 size={13} strokeWidth={2} />
              {t.remove}
            </button>
          )}
        </>
      )}
      {state.kind === "failed" && (
        <span className="w-full text-[11.5px]" role="alert" style={{ color: "var(--color-text-muted)" }}>
          {{ offline: t.failureOffline, "source-unavailable": t.failureSource, "no-space": t.failureSpace, mismatch: t.failureMismatch, storage: t.failureStorage, unknown: t.downloadFailed }[state.reason]}
        </span>
      )}
      {state.kind === "lost" && (
        <span className="w-full text-[11.5px]" role="status" style={{ color: "var(--color-text-muted)" }} data-adhan-lost={recording.id}>
          {t.lostDownload}
        </span>
      )}
    </div>
  );
}
