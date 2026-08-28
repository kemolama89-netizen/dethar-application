import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Palette } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { useTheme } from "../theme/ThemeContext";
import { usePalette } from "../theme/PaletteContext";
import type { PaletteId } from "../theme/PaletteContext";
import { MAIN1_PALETTES, MAIN2_PALETTES, type PaletteOption } from "../theme/palettes";
import { settingsLabels } from "../data/settings";

// A compact, elegant preview row — name + 2-3 small swatch dots + a
// checkmark when selected — never a giant color block, per spec 6.
function PaletteRow({
  option,
  language,
  selected,
  onSelect,
}: {
  option: PaletteOption;
  language: "ar" | "en";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start"
      style={{
        borderColor: selected ? "var(--color-gold)" : "var(--color-gold-soft)",
        background: "var(--color-surface)",
        boxShadow: selected ? "inset 0 0 0 1px var(--color-gold)" : undefined,
      }}
    >
      <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
        {option.swatches.map((color, i) => (
          <span key={i} className="block h-4 w-4 rounded-full" style={{ background: color, boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }} />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {language === "ar" ? option.nameAr : option.nameEn}
      </span>
      {selected && <Check size={16} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--color-gold)" }} />}
    </button>
  );
}

// "المظهر" (Appearance) -> "الألوان" (Colors) — a two-level sub-flow inside
// Settings, per spec: colors are never a top-level Settings section on
// their own. Only ever shows the palette group matching the user's
// CURRENT identity (men/women, from ThemeContext) — identity selection
// itself lives entirely elsewhere (ThemeToggleButton) and is untouched by
// anything here; this only ever recolors within the active identity.
export function AppearanceSettings({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const { theme } = useTheme();
  const { activePalette, selectPalette } = usePalette();
  const t = settingsLabels[language];
  const [subView, setSubView] = useState<"menu" | "colors">("menu");
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const palettes = theme === "men" ? MAIN1_PALETTES : MAIN2_PALETTES;

  const header = (title: string, onHeaderBack: () => void) => (
    <div className="mt-1 flex items-center gap-2">
      <button
        type="button"
        onClick={onHeaderBack}
        aria-label={t.back}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      >
        <BackIcon size={18} strokeWidth={1.8} />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h1>
      <div className="h-9 w-9 shrink-0" aria-hidden="true" />
    </div>
  );

  if (subView === "colors") {
    return (
      <div className="flex flex-1 flex-col">
        {header(t.colorsPageTitle, () => setSubView("menu"))}
        <div className="mt-4 flex flex-col gap-2.5 pb-2">
          {palettes.map((option) => (
            <PaletteRow
              key={option.id}
              option={option}
              language={language}
              selected={activePalette === option.id}
              // The palette registry's ids are authored to exactly match
              // PaletteId's literals for the current identity's group.
              onSelect={() => selectPalette(option.id as PaletteId)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {header(t.appearancePageTitle, onBack)}
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setSubView("colors")}
          className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
          >
            <Palette size={18} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.colorsRow}
            </span>
            <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {t.colorsRowHint}
            </span>
          </span>
          <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>
    </div>
  );
}
