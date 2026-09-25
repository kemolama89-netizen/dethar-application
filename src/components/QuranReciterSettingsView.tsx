import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { useQuranReciter } from "../theme/QuranReciterContext";
import { settingsLabels, quranReciterStyleLabels } from "../data/settings";
import { OptionRow } from "./CalculationSettingsView";

// Settings > Quran Reciter — a plain UI over QuranReciterProvider (the
// single source of truth for the selected reciter; it persists the choice
// itself). Same header and OptionRow pattern as CalculationSettingsView.
// Affects Quran recitation only; non-Quran adhkar audio never reads it.
export function QuranReciterSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const { selectedReciterId, setSelectedReciterId, reciters } = useQuranReciter();
  const hasConfiguredAudio = reciters.some((r) => r.audio.kind !== "unconfigured");

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
          {t.quranReciterPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {t.quranReciterSectionTitle}
          </p>
          {reciters.map((reciter) => (
            <OptionRow
              key={reciter.id}
              label={`${reciter.name[language]} — ${quranReciterStyleLabels[reciter.style][language]}`}
              selected={reciter.id === selectedReciterId}
              onSelect={() => setSelectedReciterId(reciter.id)}
            />
          ))}
        </div>

        {!hasConfiguredAudio && (
          <p className="px-1 text-[11.5px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {t.quranReciterAudioPendingNote}
          </p>
        )}
      </div>
    </div>
  );
}
