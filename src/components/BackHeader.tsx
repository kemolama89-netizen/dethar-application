import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";

// Small back-button + title row, used by the Written Adhkar screens only
// (Category list and Reading Deck) — its own dedicated --wa-* tokens
// throughout (not the global --color-* ones), since this component isn't
// shared with Home/Tasbeeh: on the men's theme the title sits directly on
// the reading screen's dark page background (--wa-page-bg), so it needs
// --wa-on-page (an ivory tone) rather than --wa-ink, which stays dark for
// text drawn on top of the light card surface instead.
export function BackHeader({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel: string }) {
  const { dir } = useLanguage();
  const Icon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <div className="mt-1 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          boxShadow: "inset 0 0 0 1.5px var(--wa-gold)",
          background: "var(--wa-surface)",
          color: "var(--wa-ink)",
        }}
      >
        <Icon size={18} strokeWidth={1.8} />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--wa-on-page)" }}>
        {title}
      </h1>
      <div className="h-9 w-9 shrink-0" aria-hidden="true" />
    </div>
  );
}
