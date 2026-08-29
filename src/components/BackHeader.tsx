import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";

// Small back-button + title row, shared by every screen that needs a
// simple "go back" header (Written Adhkar Reader, Miscellaneous Adhkar's
// two screens, ...). Its own dedicated --wa-* tokens throughout, not the
// global --color-* ones, since this component isn't shared with
// Home/Tasbeeh. The title sits directly on the reader's page background
// (--wa-page-bg, dark for men) so it uses --wa-on-page rather than
// --wa-ink, which stays dark for text drawn on the light page surface.
export function BackHeader({
  title,
  onBack,
  backLabel,
  hideButton,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
  /**
   * For screens that render their own persistent, scroll-following
   * `StickyBackButton` (see below) instead of this header's inline one, so
   * a second, redundant button doesn't sit right next to it at the top of
   * the page. The title still centers exactly as before — the trailing
   * spacer stays so it doesn't drift toward the (now-empty) button's side.
   * Every caller that omits this prop is unaffected (button shows as
   * before).
   */
  hideButton?: boolean;
}) {
  const { dir } = useLanguage();
  const Icon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <div className="mt-1 flex items-center gap-2">
      {hideButton ? (
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      ) : (
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
      )}
      <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--wa-on-page)" }}>
        {title}
      </h1>
      <div className="h-9 w-9 shrink-0" aria-hidden="true" />
    </div>
  );
}

// A screen's own exit/back control (same icon/styling as BackHeader's
// button, which this REPLACES for a given screen — see `hideButton` above)
// but positioned so it stays reachable no matter how far the user has
// scrolled into a long list, in either direction — not just while the
// header itself is in view. Shared verbatim by every screen with a long
// scrolling card list (Written Adhkar Reader; Miscellaneous Adhkar's own
// two screens) rather than re-implemented per screen.
//
// `position: sticky` (never `fixed` — fixed would escape `.device-screen`
// and float outside the phone frame on the desktop preview, same reason
// MeaningPopoverShell avoids it) with `top` pins it near the top of
// `.device-screen`'s own current scroll viewport. For that sticking to
// hold across the ENTIRE list (not just the ~40px the header row itself
// occupies), this button needs a containing block at least as tall as the
// full scrollable column — callers achieve that by rendering it as a
// plain sibling inside their outer flex column (which naturally spans
// every card), NOT nested inside the short BackHeader row.
// `margin-bottom: -2.25rem` (its own height) cancels the flow-space it
// would otherwise reserve at its natural insertion point, so it doesn't
// push the rest of the screen's content down by its own height.
//
// Positioned to the SIDE via `insetInlineStart` (resolves to the same
// side BackHeader's own button used to sit on: right in Arabic/RTL, left
// in English/LTR) rather than spanning full-width like a header bar —
// clearly separated from the cards, never overlapping their own
// text/counter/source (a card's content starts well inside its own
// padding; this only ever floats over a card's empty outer margin).
export function StickyBackButton({ onBack, backLabel, dir }: { onBack: () => void; backLabel: string; dir: "rtl" | "ltr" }) {
  const Icon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={backLabel}
      className="sticky z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{
        top: 8,
        insetInlineStart: 2,
        marginBottom: "-2.25rem",
        boxShadow: "inset 0 0 0 1.5px var(--wa-gold), 0 8px 18px -8px rgba(var(--color-shadow-rgb), 0.5)",
        background: "var(--wa-surface)",
        color: "var(--wa-ink)",
      }}
    >
      <Icon size={18} strokeWidth={1.8} />
    </button>
  );
}
