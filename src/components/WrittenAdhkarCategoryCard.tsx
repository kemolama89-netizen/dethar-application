import { CategoryEmblem } from "../icons/CategoryEmblem";
import type { CategoryEmblemVariant } from "../icons/CategoryEmblem";

interface WrittenAdhkarCategoryCardProps {
  category: CategoryEmblemVariant;
  label: string;
  itemsCountLabel: string;
  cardStateClass: string;
  disabled: boolean;
  onSelect: () => void;
}

// A premium "collection tile", not a settings button: the artwork is a
// full-bleed panel filling the card's entire top zone edge-to-edge (spec:
// "occupy 70-80% of the card... not a small icon or thumbnail" — no
// padding, no centered/inset box, no circular crop, object-fit: cover so
// it fills that zone without letterboxing), with the title as a secondary,
// quieter footer beneath a thin gold hairline. The card fills its grid
// cell height (h-full, not a fixed aspect-ratio) — WrittenAdhkarScreen's
// grid now stretches both rows to fill the available vertical space, so a
// fixed aspect ratio here would leave dead space below the grid again.
// itemsCountLabel is intentionally NOT rendered visually (spec: no "8
// أذكار" on the card) — it only enriches the button's aria-label for
// screen readers, who benefit from the count even though sighted users no
// longer see it. No border (box-shadow only — see the reader's
// DominoTile for why: a real border + this same inset-hairline technique
// can drift a hair out of alignment during the select-transition's scale,
// reading as a stray line), no per-card arrow (the whole tile is obviously
// tappable; an arrow here would be exactly the "redundant navigation
// control" the spec asks to avoid). The ambient shadow lives in the
// dithar-wa-category-card CSS class (not inline) specifically so
// :active can compress it — an inline style always wins over a class,
// which would make that press feedback impossible from CSS alone.
export function WrittenAdhkarCategoryCard({
  category,
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
      className={`dithar-wa-category-card ${cardStateClass} flex h-full flex-col overflow-hidden rounded-2xl text-center`}
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--card-radius)",
      }}
    >
      <div className="dithar-wa-emblem flex-1">
        <CategoryEmblem variant={category} className="h-full w-full" />
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1.5 px-3 pt-3 pb-3.5">
        <span className="h-px w-8" style={{ background: "var(--wa-gold-hairline)" }} aria-hidden="true" />
        <span
          className="text-[16.5px] font-bold leading-[1.3]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
        >
          {label}
        </span>
      </div>
    </button>
  );
}
