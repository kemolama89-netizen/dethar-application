import { Check, Download, Play, RotateCcw, Square, Trash2, X } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { quranAudioLabels } from "../data/quranAudioLabels";
import type { QuranReciter } from "../data/quranReciters";
import { cancelQuranDownload, downloadQuranReciter, quranBytesOnDevice, quranDownloadBytes, quranDownloadState, quranDownloadsOffered, removeQuranReciterDownload } from "../lib/quranAudioDownloads";

const smallButton = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold";
const quiet = { background: "var(--color-gold-soft)", color: "var(--color-primary)" };
const muted = { color: "var(--color-text-muted)" };

/**
 * Beneath a reciter's row (the Adhan voices' controls, AdhanVoiceControls, for a
 * reciter): listen to a short sample — streamed unless he is on the device — and,
 * download, cancel, retry or remove his recitations (lib/quranAudioDownloads.ts):
 * into the phone in the Android app, into the browser's storage in the web app.
 */
export function QuranReciterControls({
  reciter,
  playing,
  sampleFailed,
  canRemove,
  onListen,
}: {
  reciter: QuranReciter;
  playing: boolean;
  sampleFailed: boolean;
  /** False while Audio Adhkar plays: its files may be the ones playing. */
  canRemove: boolean;
  onListen: () => void;
}) {
  const { language } = useLanguage();
  const t = quranAudioLabels[language];
  // Download is offered in the Android app and the web app (saved in the browser there).
  const onDemand = quranDownloadsOffered();
  const state = quranDownloadState(reciter.id);
  const name = reciter.name[language];
  // As the Adhan's pills (AdhanVoiceControls): plain digits — a «·» beside Arabic-Indic ones reads as a zero.
  const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
  const streams = onDemand && state.kind !== "built-in" && state.kind !== "downloaded";
  const resumeOrDownload =
    state.kind === "partial" ? (
      <button type="button" onClick={() => void downloadQuranReciter(reciter.id)} aria-label={`${t.resumeSize(mb(state.total - state.received))}: ${name}`} className={smallButton} style={quiet} data-quran-resume={reciter.id}>
        <Download size={13} strokeWidth={2} />
        {t.resumeSize(mb(state.total - state.received))}
      </button>
    ) : state.kind === "failed" ? (
      <button type="button" onClick={() => void downloadQuranReciter(reciter.id)} aria-label={`${t.retrySize(mb(state.total - state.received))}: ${name}`} className={smallButton} style={quiet} data-quran-retry={reciter.id}>
        <RotateCcw size={13} strokeWidth={2} />
        {t.retrySize(mb(state.total - state.received))}
      </button>
    ) : onDemand && (state.kind === "none" || state.kind === "lost") ? (
      <button type="button" onClick={() => void downloadQuranReciter(reciter.id)} aria-label={`${t.downloadSize(mb(quranDownloadBytes(reciter.id)))}: ${name}`} className={smallButton} style={quiet} data-quran-download={reciter.id}>
        <Download size={13} strokeWidth={2} />
        {t.downloadSize(mb(quranDownloadBytes(reciter.id)))}
      </button>
    ) : state.kind === "downloading" ? (
      <button type="button" onClick={() => void cancelQuranDownload(reciter.id)} aria-label={`${t.cancel}: ${name}`} className={smallButton} style={quiet} data-quran-cancel={reciter.id}>
        <X size={13} strokeWidth={2} />
        {t.cancel}
      </button>
    ) : null;
  // Remove is quieter than the action beside it (text only), so a stray tap meant for Continue doesn't delete.
  const remove =
    onDemand && (state.kind === "downloaded" || state.kind === "failed" || state.kind === "partial") && quranBytesOnDevice(reciter.id) > 0 ? (
      <button
        type="button"
        onClick={() => void removeQuranReciterDownload(reciter.id)}
        disabled={!canRemove}
        aria-label={`${t.removeSize(mb(quranBytesOnDevice(reciter.id)))}: ${name}`}
        className="ms-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] font-semibold disabled:opacity-40"
        style={{ color: "var(--color-text-muted)" }}
        data-quran-remove={reciter.id}
      >
        <Trash2 size={13} strokeWidth={2} />
        {t.removeSize(mb(quranBytesOnDevice(reciter.id)))}
      </button>
    ) : null;
  const note =
    state.kind === "failed"
      ? { role: "alert" as const, attr: { "data-quran-failure": state.reason }, text: `${{ offline: t.failureOffline, "source-unavailable": t.failureSource, "no-space": t.failureSpace, mismatch: t.failureMismatch, storage: t.failureStorage, unknown: t.failureUnknown }[state.reason]}${state.received > 0 ? ` ${t.partial(mb(state.received), mb(state.total))}` : ""}` }
      : state.kind === "partial"
        ? { role: "status" as const, attr: { "data-quran-partial": reciter.id }, text: t.partial(mb(state.received), mb(state.total)) }
        : state.kind === "lost"
          ? { role: "status" as const, attr: { "data-quran-lost": reciter.id }, text: t.lostDownload }
          : null;
  // One line (Listen, status, the main action, Remove at the far end) — except while downloading, where the
  // progress stays beside Listen and Cancel takes the next line, the same at every width.
  const inline = state.kind !== "downloading";
  return (
    // Listen and what is on the device, then the actions (see `inline`).
    <div className="flex flex-col gap-1.5 px-1" data-quran-reciter-controls={reciter.id} data-quran-download-state={state.kind}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button type="button" onClick={onListen} aria-pressed={playing} aria-label={`${playing ? t.stop : t.listen}: ${name}`} className={smallButton} style={quiet} data-quran-listen={reciter.id}>
          {playing ? <Square size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
          {playing ? t.stop : t.listen}
        </button>
        {/* Said only while a streamed sample plays: the screen's note says samples stream. */}
        {playing && streams && (
          <span className="text-[11.5px] leading-none" style={muted} data-quran-sample-online="">
            {t.sampleOnline}
          </span>
        )}
        {onDemand && state.kind === "built-in" && (
          <span className="text-[11.5px] leading-none" style={muted} data-quran-built-in="">
            {t.builtIn}
          </span>
        )}
        {state.kind === "downloaded" && (
          <span className="flex items-center gap-1 text-[11.5px] leading-none" style={muted} data-quran-downloaded={reciter.id}>
            <Check size={13} strokeWidth={2.5} style={{ color: "var(--color-gold)" }} />
            {t.downloaded}
          </span>
        )}
        {state.kind === "downloading" && (
          <span className="text-[11.5px] leading-none tabular-nums" role="status" style={muted} data-quran-progress={reciter.id}>
            {t.downloading(String(state.total > 0 ? Math.floor((state.received / state.total) * 100) : 0), mb(state.received), mb(state.total))}
          </span>
        )}
        {inline && resumeOrDownload}
        {inline && remove}
      </div>
      {!inline && (resumeOrDownload || remove) && (
        <div className="flex flex-wrap items-center gap-2">
          {resumeOrDownload}
          {remove}
        </div>
      )}
      {note && (
        <p className="text-[11.5px] leading-relaxed" role={note.role} style={muted} {...note.attr}>
          {note.text}
        </p>
      )}
      {sampleFailed && (
        <p className="text-[11.5px] leading-relaxed" role="alert" style={muted} data-quran-sample-error={reciter.id}>
          {t.sampleError}
        </p>
      )}
    </div>
  );
}
