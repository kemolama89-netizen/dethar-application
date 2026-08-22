import { Globe, ChevronDown } from "lucide-react";
import { labels } from "../data/content";

// Structural placeholder for a future language switcher.
// Non-functional in this phase per spec (no real i18n yet).
// Same visual affordance (globe icon + chevron) in both themes.
export function LanguageControl() {
  return (
    <button
      type="button"
      onClick={() => {
        /* language switching deferred to a later phase */
      }}
      className="flex h-12 items-center gap-2 rounded-full border px-4 text-[14px] font-medium"
      style={{
        borderColor: "var(--color-gold-soft)",
        background: "var(--color-surface)",
        color: "var(--color-text-primary)",
      }}
    >
      <Globe size={17} strokeWidth={1.7} style={{ color: "var(--color-gold)" }} />
      <span>{labels.language}</span>
      <ChevronDown size={15} strokeWidth={2} style={{ color: "var(--color-text-muted)" }} />
    </button>
  );
}
