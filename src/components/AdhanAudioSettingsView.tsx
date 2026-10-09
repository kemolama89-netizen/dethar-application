import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Square } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { adhanAudioLabels } from "../data/adhanAudioLabels";
import { getAdhanRecordingById } from "../data/adhanRecordings";
import type { AdhanRecording } from "../data/adhanRecordings";
import {
  FAJR_ADHAN_MODES,
  REGULAR_ADHAN_MODES,
  fajrAdhanRecordings,
  loadAdhanAudioSettings,
  regularAdhanRecordings,
  saveFajrAdhanChoice,
  saveRegularAdhanChoice,
  supportedModes,
} from "../lib/adhanAudioSettings";
import type { AdhanAudioSettings, AdhanMode } from "../lib/adhanAudioSettings";
import { adhanAudioKey, playAdhanSegment } from "../lib/adhanAudio";
import { getActiveAudio, stopAudio, subscribeAudio } from "../lib/audioEngine";
import { OptionRow } from "./OptionRow";

// Settings > Adhan audio — pick the regular adhan (Dhuhr/Asr/Maghrib/Isha)
// and the Fajr adhan independently: a voice and a playback mode for each,
// with a preview that plays exactly the selected segment. Saves the choice
// only; nothing here schedules the adhan at prayer times. Same header and
// OptionRow pattern as the other Settings sub-pages.
export function AdhanAudioSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = adhanAudioLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [settings, setSettings] = useState<AdhanAudioSettings>(loadAdhanAudioSettings);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const previewKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Reflect whatever actually owns the audio (e.g. the preview ended, or
    // another feature took over), and stop our own preview on leaving.
    const unsubscribe = subscribeAudio((active) => setPlayingKey(active?.channel === "adhan" ? active.key : null));
    return () => {
      unsubscribe();
      if (previewKeyRef.current && getActiveAudio()?.key === previewKeyRef.current) stopAudio("adhan");
    };
  }, []);

  const modeLabel = (mode: AdhanMode) => (mode === "full" ? t.modeFull : mode === "takbeer" ? t.modeTakbeer : t.modeFajrPhrase);

  const togglePreview = (recording: AdhanRecording, mode: AdhanMode) => {
    const key = adhanAudioKey(recording, mode);
    setErrorKey(null);
    if (playingKey === key) {
      stopAudio("adhan");
      return;
    }
    previewKeyRef.current = key;
    playAdhanSegment(recording, mode, { onError: () => setErrorKey(key) });
  };

  const section = (
    which: "regular" | "fajr",
    title: string,
    hint: string,
    recordings: AdhanRecording[],
    allowedModes: readonly AdhanMode[],
  ) => {
    const choice = settings[which];
    const recording = getAdhanRecordingById(choice.recordingId)!;
    const modes = supportedModes(recording, allowedModes);
    const key = adhanAudioKey(recording, choice.mode);
    const isPlaying = playingKey === key;
    const select = (patch: { recordingId?: string; mode?: AdhanMode }) => {
      // A running preview of this section's old choice would no longer match the screen — stop it.
      if (isPlaying) stopAudio("adhan");
      setSettings(which === "regular" ? saveRegularAdhanChoice(patch as { recordingId?: string; mode?: "full" | "takbeer" }) : saveFajrAdhanChoice(patch));
    };

    return (
      <section className="flex flex-col gap-3" data-adhan-section={which}>
        <div className="px-1">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h2>
          <p className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {hint}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {t.playback}
          </p>
          {modes.map((mode) => (
            <OptionRow key={mode} label={modeLabel(mode)} selected={choice.mode === mode} onSelect={() => select({ mode })} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => togglePreview(recording, choice.mode)}
          aria-pressed={isPlaying}
          data-adhan-preview={which}
          className="flex items-center justify-center gap-2 self-start rounded-full px-4 py-2 text-[13px] font-semibold"
          style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
        >
          {isPlaying ? <Square size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
          {isPlaying ? t.stop : t.preview}
        </button>
        {errorKey === key && (
          <p className="px-1 text-[11.5px]" role="alert" style={{ color: "var(--color-text-muted)" }}>
            {t.previewError}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {t.voice}
          </p>
          {recordings.map((r) => (
            <OptionRow key={r.id} label={r.name[language]} selected={r.id === choice.recordingId} onSelect={() => select({ recordingId: r.id })} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.pageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
        <p className="px-1 text-[11.5px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {t.note}
        </p>
        {section("regular", t.regularTitle, t.regularHint, regularAdhanRecordings(), REGULAR_ADHAN_MODES)}
        {section("fajr", t.fajrTitle, t.fajrHint, fajrAdhanRecordings(), FAJR_ADHAN_MODES)}
      </div>
    </div>
  );
}
