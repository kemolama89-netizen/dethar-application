// Settings → إعدادات الصوت: one volume slider per kind of audio (the adhan,
// Morning, Evening and Miscellaneous Audio Adhkar). Levels are the app's
// own gain — the phone's media volume is never changed — and persist
// (lib/audioVolumeSettings.ts), reaching the native player for scheduled
// and background playback too. Moving a slider plays a short sample at the
// chosen level (lib/volumePreview.ts) — never over real playback, which
// instead takes the new level itself.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { settingsLabels } from "../data/settings";
import {
  loadAudioVolumes,
  saveAudioVolume,
  subscribeAudioVolumes,
  VOLUME_CATEGORIES,
  VOLUME_MAX,
  VOLUME_MIN,
  VOLUME_STEP,
} from "../lib/audioVolumeSettings";
import type { VolumeCategory } from "../lib/audioVolumeSettings";
import { endVolumePreview, previewVolume, stopVolumePreview } from "../lib/volumePreview";

type Labels = (typeof settingsLabels)["ar"];

const CATEGORY_LABEL: Record<VolumeCategory, keyof Labels> = {
  adhan: "audioVolumeAdhan",
  morning: "audioVolumeMorning",
  evening: "audioVolumeEvening",
  misc: "audioVolumeMisc",
};

export function AudioSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [volumes, setVolumes] = useState(() => loadAudioVolumes());

  useEffect(() => subscribeAudioVolumes(setVolumes), []);
  // Leaving the screen stops the sample.
  useEffect(() => () => stopVolumePreview(), []);

  return (
    <div className="flex flex-1 flex-col" data-settings-view="audio">
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
          {t.audioSettingsPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <p className="mt-3 text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
        {t.audioSettingsIntro}
      </p>

      <div className="mt-3 flex flex-col gap-4 rounded-2xl border p-4" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        {VOLUME_CATEGORIES.map((category) => {
          const id = `audio-volume-${category}`;
          const value = volumes[category];
          const Icon = value === 0 ? VolumeX : Volume2;
          return (
            <div key={category} className="flex flex-col gap-1.5" data-volume-category={category}>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={id} className="text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {t[CATEGORY_LABEL[category]] as string}
                </label>
                <span className="flex items-center gap-1 text-[12px] tabular-nums" style={{ color: "var(--color-text-muted)" }} dir="ltr">
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                  {value}%
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={VOLUME_MIN}
                max={VOLUME_MAX}
                step={VOLUME_STEP}
                value={value}
                onChange={(e) => {
                  const percent = Number(e.target.value);
                  setVolumes(saveAudioVolume(category, percent));
                  previewVolume(category, percent);
                }}
                // The adjustment ends: the sample stops a moment later.
                onPointerUp={endVolumePreview}
                onPointerCancel={endVolumePreview}
                onTouchEnd={endVolumePreview}
                onKeyUp={endVolumePreview}
                onBlur={endVolumePreview}
                className="w-full"
                style={{ accentColor: "var(--color-gold)" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
