import { X } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// The one "Meaning" popup implementation shared by every reading card that
// keeps its full English meaning out of the card itself — originally built
// for Written Adhkar's DhikrCard (verified there first), now reused as-is
// by Miscellaneous Adhkar's MiscDuaCard too, rather than the two keeping
// separate implementations. Two pieces:
//   - `useMeaningCardState` — tracks which item is open and the specific
//     DOM card it was opened from.
//   - `DraggableMeaningCard` — the presentational + interactive card
//     itself; callers supply their own header/body content so this stays
//     content-agnostic.
//
// 2026-08: this popup has NO internal scroll and no max-height cap — it
// always renders its complete content in full (an earlier, capped-height
// design could crop part of a long popup, most visibly Ayat al-Kursi's
// full English meaning on the very first Written Adhkar Dhikr). It opens
// anchored just above the SPECIFIC card whose Meaning button was tapped,
// then is freely draggable to anywhere on screen by pressing and dragging
// the card itself — it never snaps back or auto-repositions afterward.
//
// `position: fixed` (not `absolute` within the scrolling list the way an
// earlier version of this popup worked) — verified none of
// .device-backdrop/.device-frame/.device-screen sets
// transform/filter/will-change, so a fixed-position descendant here is NOT
// trapped by `.device-screen`'s own `overflow-x:hidden`/`overflow-y:auto`
// (the actual cropping risk the old `position:absolute` version was still
// exposed to for tall content) — it renders directly against the real
// viewport, with left/width clamped to `.device-frame`'s own current
// on-screen rect so it never visually escapes the phone-frame illusion on
// a wide desktop preview.

const MEANING_CARD_MARGIN_X = 16;
const MEANING_CARD_MARGIN_Y = 20;
const MEANING_CARD_GAP = 10;

export interface MeaningCardTarget<T> {
  item: T;
  cardEl: HTMLElement;
}

// Bundles the state a screen needs to own ONE Meaning popup shared across
// every card it renders — keyed by which item is open AND the specific DOM
// card it was opened from (needed to anchor `DraggableMeaningCard` above
// THAT card). `cardSelector` is a marker class on the card's own root
// (Written Adhkar's `.dithar-wa-dhikr-card`, Misc's
// `.dithar-misc-dua-card`) — a direct `.closest()` on it, so this works
// correctly no matter how deeply a caller's own layout nests the card
// (MiscLibraryScreen wraps its cards in extra layout divs; MiscCategoryScreen
// doesn't — both resolve the same way).
export function useMeaningCardState<T extends { id: string }>(cardSelector: string) {
  const [target, setTarget] = useState<MeaningCardTarget<T> | null>(null);
  const show = useCallback(
    (item: T, buttonEl: HTMLButtonElement) => {
      const cardEl = buttonEl.closest<HTMLElement>(cardSelector) ?? buttonEl;
      setTarget({ item, cardEl });
    },
    [cardSelector],
  );
  const close = useCallback(() => setTarget(null), []);
  return { target, show, close };
}

// The popup itself — position, free-drag, and the always-fully-visible
// correction logic; callers supply `cardEl` (which card to anchor above),
// `listSelector` (the nearest scrollable list ancestor — used only for the
// post-render "make room" correction below, via `cardEl.closest(...)`, so
// it's resolved independently of how `cardEl` itself was found), plus
// their own header/body content.
export function DraggableMeaningCard({
  cardEl,
  listSelector,
  onClose,
  ariaLabel,
  closeAria,
  header,
  children,
}: {
  cardEl: HTMLElement;
  listSelector: string;
  onClose: () => void;
  ariaLabel: string;
  closeAria: string;
  header: ReactNode;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // `left`/`width` are fixed once computed (a comfortable reading width,
  // centered, clamped to the phone frame minus margins). `bottom` (not
  // `top`) is what lets the box grow upward to fit its full, uncapped
  // content with no height measurement needed before first paint — its
  // actual height is left entirely to the browser (`height: auto`); only
  // its bottom edge is pinned, just above the selected card. A pure
  // computation from `cardEl` (stable for this component's whole
  // lifetime — callers remount it per open, keyed by item id) — no
  // state/effect needed for it, unlike the post-render correction below.
  const basePos = useMemo(() => {
    const frameEl = (cardEl.closest(".device-frame") as HTMLElement | null) ?? cardEl;
    const frameRect = frameEl.getBoundingClientRect();
    const width = Math.min(400, frameRect.width - MEANING_CARD_MARGIN_X * 2);
    const left = frameRect.left + (frameRect.width - width) / 2;
    const cardRect = cardEl.getBoundingClientRect();
    const bottom = window.innerHeight - (cardRect.top - MEANING_CARD_GAP);
    return { left, width, bottom };
  }, [cardEl]);
  // Free-drag offset, applied as a `transform` on top of `basePos` —
  // callers remount this component fresh (keyed by item id) each time a
  // different item's Meaning is opened, so a previous drag never carries
  // over; within one open, nothing else ever resets it.
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Once the (now fully, uncapped-height) card has actually rendered,
  // confirm its own top edge didn't land above the frame's visible top
  // margin — if it did (a long Meaning opened for a card near the top of
  // the list — most visibly Ayat al-Kursi on Written Adhkar's very first
  // Dhikr), scroll the list up just enough to reveal the room, driven by
  // this card's REAL measured height rather than a fixed formula, since
  // nothing here is capped.
  //
  // Scrolling alone can only ever close a gap up to however much the list
  // was ALREADY scrolled down. For a card at or near the very top of the
  // whole list, that can be less than the popup needs, with nowhere
  // further to scroll. Rather than let the popup stay partly off-screen
  // (or shrink it, which this popup must never do), the remainder is made
  // up with a temporary `padding-top` on the card list — invisible in the
  // ordinary case (it's 0 whenever scrolling alone was enough) and removed
  // the moment this popup closes (the effect's own cleanup, run on unmount
  // since callers remount this component per open).
  //
  // Written to be idempotent/safe to run more than once (React
  // StrictMode's dev-only double-invoke of effects runs this, its
  // cleanup, then this again before first paint) — every value here is
  // freshly re-measured from the CURRENT live DOM on each run rather than
  // accumulated from a previous pass, so re-running it lands on the exact
  // same correct result instead of drifting.
  useLayoutEffect(() => {
    const screenEl = cardEl.closest<HTMLElement>(".device-screen");
    const listEl = cardEl.closest<HTMLElement>(listSelector);
    if (!screenEl || !listEl || !cardRef.current) return;
    const frameEl = (cardEl.closest(".device-frame") as HTMLElement | null) ?? cardEl;
    const frameRect = frameEl.getBoundingClientRect();
    const minTop = frameRect.top + MEANING_CARD_MARGIN_Y;
    // The popup's own natural height is stable across re-runs (content
    // doesn't change) even though its POSITION might have been touched by
    // an earlier run — only the card's actual current position is used
    // below to decide what (if anything) still needs correcting.
    const popupHeight = cardRef.current.getBoundingClientRect().height;
    const requiredCardTop = minTop + popupHeight + MEANING_CARD_GAP;
    const currentCardTop = cardEl.getBoundingClientRect().top;
    const pushNeeded = requiredCardTop - currentCardTop;
    if (pushNeeded > 0.5) {
      const scrollable = screenEl.scrollTop;
      const scrollBy = Math.min(scrollable, pushNeeded);
      screenEl.scrollTop = scrollable - scrollBy;
      const remaining = pushNeeded - scrollBy;
      listEl.style.paddingTop = remaining > 0.5 ? `${remaining}px` : "";
    } else {
      listEl.style.paddingTop = "";
    }
    // Re-anchor the popup's bottom edge fresh, relative to the card's
    // CURRENT (possibly just-adjusted) position — never a delta from the
    // initial `basePos`, so this is exact regardless of how many times
    // the effect has run.
    const finalCardTop = cardEl.getBoundingClientRect().top;
    cardRef.current.style.bottom = `${window.innerHeight - (finalCardTop - MEANING_CARD_GAP)}px`;

    return () => {
      listEl.style.paddingTop = "";
    };
    // Deliberately empty deps: this only needs `cardEl`, captured in the
    // closure, which never changes for a given open popup (callers
    // remount this component, and this effect, for every new open) — it
    // must not re-run on later renders this same instance produces (e.g.
    // while dragging).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag the whole card by pressing anywhere on it EXCEPT the close button
  // (`data-meaning-no-drag`, so a plain tap still closes it instead of
  // starting a drag). `setPointerCapture` keeps receiving move/up events
  // even if the finger/cursor leaves the card's own bounds mid-drag.
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-meaning-no-drag]")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: dragDelta.x, baseY: dragDelta.y };
    },
    [dragDelta],
  );
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDragDelta({ x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) });
  }, []);
  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }, []);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[999] flex touch-none flex-col overflow-hidden rounded-2xl border-[1.5px]"
      style={{
        left: basePos.left,
        bottom: basePos.bottom,
        width: basePos.width,
        transform: dragDelta.x || dragDelta.y ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : undefined,
        cursor: "grab",
        touchAction: "none",
        // A calm, warm wash — the SAME `--wa-gold-hairline` token every
        // card's own border already uses, just layered as a flat fill
        // instead of a 1px line — over the plain `--wa-surface` the card
        // underneath also uses. Composed entirely from existing palette
        // tokens (no new colors, no color-mix), so it stays correct for
        // every accent in both the men's and women's identities. This is
        // the actual fix for "blends with the card underneath": once the
        // free-floating redesign dropped the old dimming backdrop, the
        // popup and the card beneath were left sharing the exact same flat
        // `--wa-surface` — this warm tint plus the stronger border/shadow
        // below are what now separate them, entirely on the popup's own
        // surface rather than dimming the rest of the screen.
        background: "linear-gradient(var(--wa-gold-hairline), var(--wa-gold-hairline)), var(--wa-surface)",
        borderColor: "var(--wa-gold-soft)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: "0 22px 54px -18px rgba(var(--color-shadow-rgb), 0.55)",
      }}
    >
      <div className="flex items-start gap-3 border-b p-3" style={{ borderColor: "var(--wa-gold-soft)" }}>
        <div className="min-w-0 flex-1 pt-0.5">{header}</div>
        {/* Same "gold accent trigger" language the Meaning button itself
            already uses on the card underneath (inset gold-hairline ring,
            gold icon) — reused here rather than the previous muted
            ink-colored X, so the close action reads as clearly actionable
            against the new tinted background. */}
        <button
          type="button"
          data-meaning-no-drag="true"
          onClick={onClose}
          aria-label={closeAria}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--wa-gold-soft)", background: "var(--wa-surface)", color: "var(--wa-gold)" }}
        >
          <X size={15} strokeWidth={2.25} />
        </button>
      </div>

      <div className="p-3" dir="ltr">
        {children}
      </div>
    </div>
  );
}
