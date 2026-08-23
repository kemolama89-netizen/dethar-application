import type { ComponentType } from "react";

interface WrittenAdhkarCategoryCardProps {
  Illustration: ComponentType<{ className?: string }>;
  label: string;
  itemsCountLabel: string;
  cardStateClass: string;
  disabled: boolean;
  onSelect: () => void;
}

// A premium "collection tile", not a settings button: the illustration
// IS the card's dominant visual area (spec: "occupy meaningful space...
// integrated into the composition" — not a small icon badge), with the
// title/count as a secondary, quieter footer beneath a thin gold
// hairline. No border (box-shadow only — see the reader's DominoTile for
// why: a real border + this same inset-hairline technique can drift a
// hair out of alignment during the select-transition's scale, reading as
// a stray line), no per-card arrow (the whole tile is obviously tappable;
// an arrow here would be exactly the "redundant navigation control" the
// spec asks to avoid).
export function WrittenAdhkarCategoryCard({
  Illustration,
  label,
  itemsCountLabel,
  cardStateClass,
  disabled,
  onSelect,
}: WrittenAdhkarCategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`${label} — ${itemsCountLabel}`}
      className={`dithar-wa-category-card ${cardStateClass} flex aspect-[4/5] flex-col overflow-hidden rounded-2xl text-center`}
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--card-radius)",
        boxShadow: "0 14px 28px -18px rgba(23, 38, 58, 0.22), inset 0 0 0 1px var(--wa-gold-hairline)",
      }}
    >
      <div className="flex flex-1 items-center justify-center px-3 pt-4 pb-1">
        <Illustration className="h-full w-full max-h-[76px]" />
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-3.5">
        <span className="h-px w-7" style={{ background: "var(--wa-gold-hairline)" }} aria-hidden="true" />
        <span
          className="text-[14.5px] font-bold leading-[1.3]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
        >
          {label}
        </span>
        <span className="text-[11px]" style={{ color: "var(--wa-ink-muted)" }}>
          {itemsCountLabel}
        </span>
      </div>
    </button>
  );
}
