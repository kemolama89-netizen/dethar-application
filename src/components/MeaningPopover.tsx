import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

// The one "Meaning" popup implementation shared by every reading card that
// keeps its full English meaning out of the card itself — originally built
// for Written Adhkar's DhikrCard, now reused as-is (not re-implemented) by
// Miscellaneous Adhkar's MiscDuaCard. Two pieces:
//   - `computeMeaningAnchor` — pure geometry: where the popup should sit.
//   - `MeaningPopoverShell` — the presentational chrome (backdrop, card,
//     close button, scrollable body); callers supply their own header/body
//     content so this stays content-agnostic.
// Neither piece owns any state — the caller (e.g. WrittenAdhkarReader,
// MiscCategoryScreen) still owns which item's meaning is open.

export interface MeaningAnchor<T> {
  item: T;
  // Expressed in the anchoring list container's own content coordinate
  // space (see `computeMeaningAnchor`), not raw viewport coordinates.
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

// Margins kept clear between the popup and the visible edges of
// `.device-screen` — the "never partially off-screen" / "safe spacing on
// small screens" requirement.
const MEANING_MODAL_MARGIN_X = 16;
const MEANING_MODAL_MARGIN_Y = 20;
// A comfortable reading width on a wide/desktop preview of the phone
// frame — clamped down to the screen's own width (minus margins) on a
// narrow/mobile one, so this is a ceiling, not a fixed size.
const MEANING_MODAL_MAX_WIDTH = 400;
const MEANING_MODAL_MAX_HEIGHT = 320;
const MEANING_MODAL_MIN_HEIGHT = 140;
// 2026-08 correction (small, targeted fix — see the `cardTop` comment
// below): the vertical gap kept between the popup's own bottom edge and
// the top edge of the card whose Meaning button was tapped, so it reads
// as "sitting just above that card" rather than touching it.
const MEANING_MODAL_CARD_GAP = 10;

// Walks up from `el` to the element that is a DIRECT CHILD of `listEl` —
// i.e. the one list-row wrapper for whichever card `el` is inside,
// regardless of that card's own internal markup (Written Adhkar's rail+card
// row, Misc's plain card root, ...). Generic on purpose: no card-specific
// class name to keep in sync across screens.
function closestListChild(el: HTMLElement, listEl: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node.parentElement !== listEl) {
    node = node.parentElement;
  }
  return node;
}

// Called right before opening the Meaning popup for `buttonEl`'s card —
// NOT part of `computeMeaningAnchor` itself, which stays a pure
// measurement (no side effects). The popup always renders at its full,
// fixed height, fully above the selected card (see `computeMeaningAnchor`
// below) and is never allowed to shrink or slide down onto that card — so
// when the card sits close enough to the screen's own top margin that the
// full-height popup would otherwise render partly above the visible
// screen, this scrolls `.device-screen` UP just enough first (pushing the
// card further down on screen, opening up the needed room above it)
// rather than compromising on size or position. A no-op — no scroll at
// all — for the ordinary case where there's already enough room.
export function ensureRoomAboveCard(buttonEl: HTMLButtonElement, listSelector: string, screenSelector = ".device-screen") {
  const listEl = buttonEl.closest<HTMLElement>(listSelector);
  const screenEl = buttonEl.closest<HTMLElement>(screenSelector);
  if (!listEl || !screenEl) return;

  const screenRect = screenEl.getBoundingClientRect();
  const height = Math.max(
    MEANING_MODAL_MIN_HEIGHT,
    Math.min(MEANING_MODAL_MAX_HEIGHT, screenRect.height - MEANING_MODAL_MARGIN_Y * 2),
  );
  const minTop = screenRect.top + MEANING_MODAL_MARGIN_Y;
  const cardEl = closestListChild(buttonEl, listEl);
  const cardTop = (cardEl ?? buttonEl).getBoundingClientRect().top;
  const deficit = minTop - (cardTop - height - MEANING_MODAL_CARD_GAP);
  if (deficit > 0) {
    // Clamped at 0 by the browser itself if the list is already scrolled
    // to its very top — the popup then simply starts as high as the
    // document allows, exactly the same graceful last resort this
    // popup's very first design already relied on for a squeezed layout.
    screenEl.scrollTop -= deficit;
  }
}

// Computes where the Meaning popup should sit relative to `listSelector`'s
// own top-left corner — the nearest ancestor of `buttonEl` matching that
// selector, made the caller's own positioning context (`position: relative`
// on a plain marker class with no other styling — see each caller).
//
// 2026-08 correction (anchored-popover behavior): the popup keeps its
// EXACT original size (same MIN/MAX_HEIGHT formula as this popup has
// always used — never shrunk, never squeezed to fit) and is always
// positioned FULLY ABOVE the specific card whose Meaning button was
// tapped, its bottom edge sitting `MEANING_MODAL_CARD_GAP` above that
// card's own top edge. It is deliberately allowed to visually overlap
// whatever card(s) sit above the selected one — covering an unrelated,
// not-currently-being-read card is the acceptable trade-off; covering the
// SELECTED card's own Arabic text is not, ever. There is no "flip below"
// and no clamping that would push the popup's bottom edge down past the
// selected card's top — the one thing this must never do. Horizontal
// position and size are otherwise independent of the card, exactly as
// this popup's very first (pre-anchored) design always computed them.
export function computeMeaningAnchor<T>(
  item: T,
  buttonEl: HTMLButtonElement,
  listSelector: string,
  screenSelector = ".device-screen",
): MeaningAnchor<T> | null {
  const listEl = buttonEl.closest<HTMLElement>(listSelector);
  const screenEl = buttonEl.closest<HTMLElement>(screenSelector);
  if (!listEl || !screenEl) return null;

  const listRect = listEl.getBoundingClientRect();
  const screenRect = screenEl.getBoundingClientRect();

  // Fixed size — identical formula to this popup's original design,
  // independent of the card. `MEANING_MODAL_MAX_HEIGHT` is comfortably
  // less than a typical `.device-screen`, so this lands on that cap on
  // any normal viewport; the `screenRect.height`-based lower bound only
  // ever matters on an unusually short one.
  const fullHeight = Math.max(
    MEANING_MODAL_MIN_HEIGHT,
    Math.min(MEANING_MODAL_MAX_HEIGHT, screenRect.height - MEANING_MODAL_MARGIN_Y * 2),
  );
  const width = Math.min(MEANING_MODAL_MAX_WIDTH, screenRect.width - MEANING_MODAL_MARGIN_X * 2);
  const left = screenRect.left + (screenRect.width - width) / 2;

  // The tapped card's own top edge (falls back to the button's own top if,
  // for some reason, no direct list-child wrapper can be found).
  const cardEl = closestListChild(buttonEl, listEl);
  const cardTop = (cardEl ?? buttonEl).getBoundingClientRect().top;
  const minTop = screenRect.top + MEANING_MODAL_MARGIN_Y;

  // Always anchored fully above the selected card, bottom edge pinned at
  // `cardTop - GAP` — deliberately UNCLAMPED downward: nothing here is
  // ever allowed to push `top` toward (or past) the card, since that is
  // exactly what would let the popup creep onto it. `show()` (see
  // `ensureRoomAboveCard`/`useMeaningPopoverState` below) already scrolled
  // the list up first if that alone could make room, so `fullHeight` fits
  // above the card in every ordinary case by the time this runs.
  //
  // The one residual case scrolling can't fix: a card sitting so close to
  // the very START of the whole list (not just the current scroll
  // position) that even a maximally-scrolled-up view still doesn't leave
  // `fullHeight` of room above it — e.g. the first couple of cards. Only
  // then does the popup shrink, and only down to exactly what's needed to
  // stay fully on-screen while still never touching the card — the same
  // non-negotiable priority as everywhere else, just with a smaller popup
  // as the last resort instead of one that's partly invisible.
  const height = Math.min(fullHeight, Math.max(0, cardTop - MEANING_MODAL_CARD_GAP - minTop));
  const top = cardTop - height - MEANING_MODAL_CARD_GAP;

  return {
    item,
    top: top - listRect.top,
    left: left - listRect.left,
    width,
    maxHeight: height,
  };
}

// Closes an open Meaning popup on an outside tap/click — EXCEPT when that
// click is itself another card's own Meaning trigger (marked with
// `data-meaning-trigger`): that button's own onClick already switches
// straight to the new card, and this listener must not also fire and
// immediately close what was just opened.
export function useMeaningOutsideClose(isOpen: boolean, dialogRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (dialogRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-meaning-trigger]")) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, dialogRef, onClose]);
}

// Bundles the state + handlers a screen needs to own ONE Meaning popup
// shared across every MiscDuaCard it renders (matching WrittenAdhkarReader's
// own hand-rolled version of the same four pieces) — `listSelector` is the
// marker class on that screen's own `position: relative` list container
// (see `computeMeaningAnchor`).
export function useMeaningPopoverState<T>(listSelector: string) {
  const [anchor, setAnchor] = useState<MeaningAnchor<T> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const show = useCallback(
    (item: T, buttonEl: HTMLButtonElement) => {
      ensureRoomAboveCard(buttonEl, listSelector);
      setAnchor(computeMeaningAnchor(item, buttonEl, listSelector));
    },
    [listSelector],
  );
  const close = useCallback(() => setAnchor(null), []);
  useMeaningOutsideClose(anchor !== null, dialogRef, close);
  return { anchor, show, close, dialogRef };
}

// The popup's presentational chrome only — floats over `.device-screen`'s
// visible area, NOT a full-page navigation and NOT `position: fixed`
// (which would escape the phone frame on the desktop preview): it's meant
// to be rendered as a plain descendant of the same positioned list
// container `computeMeaningAnchor` measured against, with `position:
// absolute` and the pixel offsets that function derived.
export function MeaningPopoverShell({
  anchor,
  onClose,
  dialogRef,
  ariaLabel,
  closeAria,
  header,
  children,
}: {
  anchor: { top: number; left: number; width: number; maxHeight: number } | null;
  onClose: () => void;
  dialogRef: RefObject<HTMLDivElement | null>;
  ariaLabel: string;
  closeAria: string;
  header: ReactNode;
  children: ReactNode;
}) {
  if (!anchor) return null;
  const { top, left, width, maxHeight } = anchor;

  return (
    <>
      {/* Backdrop spans the full list (not just the current viewport slice
          of `.device-screen`) so whatever portion happens to be visible is
          dimmed. `pointer-events-none`: closing-on-outside-click and
          switching-to-a-different-card's-Meaning are both handled by
          `useMeaningOutsideClose` instead — a click-catching backdrop here
          would sit on top of every OTHER card's own Meaning button too
          (it spans the whole list), silently swallowing that tap instead of
          switching straight to the new card. */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: "rgba(11, 21, 38, 0.45)" }} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="absolute z-30 flex flex-col overflow-hidden rounded-2xl border"
        style={{
          top,
          left,
          width,
          maxHeight,
          background: "var(--wa-surface)",
          borderColor: "var(--wa-gold-hairline)",
          borderRadius: "var(--wa-card-radius)",
          boxShadow: "0 20px 50px -20px rgba(var(--color-shadow-rgb), 0.5)",
        }}
      >
        <div className="flex items-start gap-3 border-b p-3" style={{ borderColor: "var(--wa-gold-hairline)" }}>
          <div className="min-w-0 flex-1 pt-0.5">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeAria}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)" }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3" dir="ltr">
          {children}
        </div>
      </div>
    </>
  );
}
