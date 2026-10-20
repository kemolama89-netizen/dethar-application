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
  loadAdhanAutoPlay,
  saveAdhanAutoPlay,
  regularAdhanRecordings,
  saveFajrAdhanChoice,
  saveRegularAdhanChoice,
  supportedModes,
} from "../lib/adhanAudioSettings";
import type { AdhanAudioSettings, AdhanMode } from "../lib/adhanAudioSettings";
import { adhanAudioKey, playAdhanSegment } from "../lib/adhanAudio";
import { getActiveAudio, stopAudio, subscribeAudio } from "../lib/audioEngine";
import {
  loadAdhanRotationSettings,
  peekNextAdhanVoice,
  startAdhanPreview,
  rotationCandidates,
  setAdhanRotationEnabled,
  setAdhanVoiceIncluded,
} from "../lib/adhanVoiceRotation";
import type { AdhanRotationSettings } from "../lib/adhanVoiceRotation";
import { requestPrayerNotificationPermission, syncPrayerNotifications } from "../lib/prayerNotifications";
import { OptionRow } from "./OptionRow";
import { loadPrayerReminderSettings } from "../lib/prayerReminderSettings";

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
  const [rotation, setRotation] = useState<AdhanRotationSettings>(loadAdhanRotationSettings);
  const [autoPlay, setAutoPlay] = useState(loadAdhanAutoPlay);
  // The prayer notifications master gates the adhan too (prayerNotifications.ts).
  const [prayerMaster] = useState(() => loadPrayerReminderSettings().enabled);
  // Every change re-sends the adhan settings to the Android prayer-time alarm (no-op elsewhere).
  const resync = () => void syncPrayerNotifications(new Date(), language).catch(() => {});
  // Which section last refused to exclude its only remaining voice.
  const [keepOneIn, setKeepOneIn] = useState<"regular" | "fajr" | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Per section, the rotated voice its running preview is playing.
  const [previewing, setPreviewing] = useState<Partial<Record<"regular" | "fajr", string>>>({});
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
    const chosenRecording = getAdhanRecordingById(choice.recordingId)!;
    const modes = supportedModes(chosenRecording, allowedModes);
    const rotating = rotation[which].enabled;
    // With rotation on, the preview plays the voice the next adhan will use.
    // With rotation on: while a preview plays, the voice it drew; otherwise
    // the voice the next play (preview or adhan) will use.
    const previewed = rotating && previewing[which] ? getAdhanRecordingById(previewing[which]!) : undefined;
    const previewPlaying = !!previewed && playingKey === adhanAudioKey(previewed, choice.mode);
    const recording = !rotating ? chosenRecording : previewPlaying ? previewed! : peekNextAdhanVoice(which).recording;
    const key = adhanAudioKey(recording, choice.mode);
    const isPlaying = playingKey === key;
    const onPreview = () => {
      if (isPlaying) {
        stopAudio("adhan");
        return;
      }
      // A new preview uses up the drawn voice; "Next adhan" moves on once it ends.
      const next = rotating ? startAdhanPreview(which).recording : chosenRecording;
      if (rotating) {
        setPreviewing((p) => ({ ...p, [which]: next.id }));
        resync(); // the preview used up the announced voice: tell the alarm the new one
      }
      togglePreview(next, choice.mode);
    };
    const select = (patch: { recordingId?: string; mode?: AdhanMode }) => {
      // A running preview of this section's old choice would no longer match the screen — stop it.
      if (isPlaying) stopAudio("adhan");
      setSettings(which === "regular" ? saveRegularAdhanChoice(patch as { recordingId?: string; mode?: "full" | "takbeer" }) : saveFajrAdhanChoice(patch));
      resync();
    };
    const toggleAutoPlay = async () => {
      const on = !autoPlay[which];
      // The adhan's media notification needs this on Android 13+; asked only on an explicit enable tap.
      if (on) await requestPrayerNotificationPermission();
      setAutoPlay(saveAdhanAutoPlay(which, on));
      resync();
    };
    const updateRotation = (next: AdhanRotationSettings) => {
      if (isPlaying) stopAudio("adhan");
      setRotation(next);
      resync();
    };
    const toggleIncluded = (id: string) => {
      const include = rotation[which].excluded.includes(id);
      const next = setAdhanVoiceIncluded(which, id, include);
      setKeepOneIn(!include && next[which].excluded.length === rotation[which].excluded.length ? which : null);
      updateRotation(next);
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

        <div className="flex flex-col gap-1.5" data-adhan-autoplay={which}>
          <OptionRow label={t.autoPlay} selected={autoPlay[which]} onSelect={() => void toggleAutoPlay()} />
          <p className="px-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {t.autoPlayHint}
          </p>
          {autoPlay[which] && !prayerMaster && (
            <p className="px-1 text-[11.5px] font-medium" style={{ color: "var(--color-primary)" }} role="status" data-adhan-master-off="">
              {t.autoPlayMasterOff}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <OptionRow label={t.rotate} selected={rotating} onSelect={() => updateRotation(setAdhanRotationEnabled(which, !rotating))} />
          <p className="px-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {!rotating ? t.rotateHint : previewPlaying ? t.nowPlaying(recording.name[language]) : t.nextVoice(recording.name[language])}
          </p>
        </div>

        <button
          type="button"
          onClick={onPreview}
          aria-pressed={isPlaying}
          data-adhan-preview={which}
          className="flex items-center justify-center gap-2 self-start rounded-full px-4 py-2 text-[13px] font-semibold"
          style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
        >
          {isPlaying ? <Square size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
          {isPlaying ? t.stop : t.preview}
        </button>
        {(errorKey === key || (!!previewed && errorKey === adhanAudioKey(previewed, choice.mode))) && (
          <p className="px-1 text-[11.5px]" role="alert" style={{ color: "var(--color-text-muted)" }}>
            {t.previewError}
          </p>
        )}

        <div className="flex flex-col gap-1.5" data-adhan-voices={rotating ? "rotation" : "single"}>
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {rotating ? t.rotationVoices : t.voice}
          </p>
          {rotating && keepOneIn === which && (
            <p className="px-1 text-[11.5px]" role="status" style={{ color: "var(--color-text-muted)" }}>
              {t.keepOneVoice}
            </p>
          )}
          {rotating
            ? rotationCandidates(which).map((r) => (
                <OptionRow key={r.id} label={r.name[language]} selected={!rotation[which].excluded.includes(r.id)} onSelect={() => toggleIncluded(r.id)} />
              ))
            : recordings.map((r) => (
                <OptionRow key={r.id} label={r.name[language]} selected={r.id === choice.recordingId} onSelect={() => select({ recordingId: r.id })} />
              ))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
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
