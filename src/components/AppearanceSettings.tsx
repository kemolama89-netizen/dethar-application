import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { settingsLabels } from "../data/settings";
import { LookCustomizer } from "./LookCustomizer";

// "المظهر" (Appearance) in Settings: one entry, «تخصيص المظهر» — the four
// themes, the wallpaper (built-in or the user's photo), the cards'
// transparency and automatic dark mode (LookCustomizer). The theme sets the
// app's colours by itself: the manual colour palette that used to be a
// second entry here («الألوان») was removed, and no saved palette is applied
// any more (theme/paletteStore.ts). Identity selection (men/women) lives
// elsewhere (ThemeToggleButton) and is untouched.
export function AppearanceSettings({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const [subView, setSubView] = useState<"menu" | "look">("menu");
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  if (subView === "look") return <LookCustomizer onBack={() => setSubView("menu")} />;

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
          {t.appearancePageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {/* Themes, wallpaper, transparency and dark mode, with a preview (LookCustomizer). */}
        <button
          type="button"
          onClick={() => setSubView("look")}
          className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
          data-appearance-look-row=""
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
            <Sparkles size={18} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.lookRow}
            </span>
            <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {t.lookRowHint}
            </span>
          </span>
          <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>
    </div>
  );
}
