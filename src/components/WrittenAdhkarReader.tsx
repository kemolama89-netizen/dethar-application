import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { BookOpenText, Check, X } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { CATEGORY_ARTWORK } from "../icons/CategoryEmblem";
import { useLanguage } from "../theme/LanguageContext";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels, writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey, WrittenAdhkarItem, PrayerName, PrayerScope } from "../data/written-adhkar";
// The same "Transliteration"/"Meaning" heading strings Miscellaneous
// Adhkar's MiscDuaCard already uses — from a small shared module (NOT a
// direct import of misc-library.ts), which would otherwise drag that
// module's entire 89-record dataset and its own module-level side effects
// into this reader's chunk merely for two label strings.
import { dhikrLanguageLabels } from "../data/dhikr-language-labels";
import { usePrefersReducedMotion } from "../lib/motion";
import { recordWrittenRepetition, recordWirdComplete } from "../lib/stats";

interface WrittenAdhkarReaderProps {
  category: WrittenAdhkarCategoryKey;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
  onBackToCategories: () => void;
}

type Labels = (typeof writtenAdhkarLabels)["ar"];

// Items with no established repetition count are read once — the ring
// still gives them the same tap-to-confirm interaction (target 1) rather
// than a separate, different affordance, so the whole journey uses one
// consistent gesture throughout. `selectedPrayer` only ever matters for the
// small number of items carrying `repeatByPrayer` (the three Quls after
// prayer) — every other item's target is completely unaffected by it.
//
// `unboundedCount` items (Salat al-Ibrahimiyyah, Morning/Evening) are the
// one exception: `Infinity` keeps `count < target` true forever, so every
// ring tap always just increments (see handleTap) and the ring's own
// target-reached checkmark state never triggers — completion instead comes
// ONLY from the separate external Finish button (see DhikrCard/handleFinish).
function targetFor(item: WrittenAdhkarItem, selectedPrayer: PrayerName): number {
  if (item.unboundedCount) return Infinity;
  return item.repeatByPrayer?.[selectedPrayer] ?? item.repeat ?? 1;
}

// The ONLY place that decides whether a Dhikr is shown for the currently
// selected prayer — see `WrittenAdhkarItem.prayerScope`'s doc comment in
// written-adhkar.ts. Irrelevant outside `category === "prayer"`, where
// every item is always visible regardless of `prayerScope`.
function isInPrayerScope(item: WrittenAdhkarItem, category: WrittenAdhkarCategoryKey, selectedPrayer: PrayerName): boolean {
  if (category !== "prayer") return true;
  const scope: PrayerScope = item.prayerScope ?? "all";
  if (scope === "all") return true;
  if (Array.isArray(scope)) return scope.includes(selectedPrayer);
  return scope === selectedPrayer;
}

const PRAYER_NAMES: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function prayerLabel(labels: Labels, prayer: PrayerName): string {
  switch (prayer) {
    case "fajr":
      return labels.prayerFajr;
    case "dhuhr":
      return labels.prayerDhuhr;
    case "asr":
      return labels.prayerAsr;
    case "maghrib":
      return labels.prayerMaghrib;
    case "isha":
      return labels.prayerIsha;
  }
}

const RING_SIZE = 56;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;

// Written Adhkar's ring is a SIMPLE STATIC BUTTON — no timer, no countdown,
// no reading-duration calculation, no progress arc/fill, no automatic
// completion, and no automatic advancement based on elapsed time. This is
// deliberately the opposite of the Tasbeeh screen's timed pacing ring (see
// TasbeehScreen.tsx / tasbeehTiming.ts) — the two experiences are
// intentionally different and must not share behavior. The circle draws
// exactly one plain, always-fully-visible hairline ring (pure decoration,
// never animated, never a progress indicator) and shows either a number or
// a checkmark inside it, purely from `count`/`target`/`isCompleted` — no
// SVG arc, no stroke-dashoffset, no fill fraction of any kind.
//
// Two-step completion, for EVERY target (including target === 1):
//   - While `count < target`: tapping increments the repetition count (see
//     WrittenAdhkarReader's handleTap) and the ring shows that number.
//   - Once `count === target` (all repetitions read) but not yet
//     `isCompleted`: the ring shows ✓ but stays enabled — this tells the
//     user "all repetitions done, tap again to confirm." Tapping now does
//     NOT increment anything further; it is the explicit confirmation tap
//     that marks the Dhikr as `isCompleted` (see handleTap) and only THEN
//     triggers the parent's existing advance/scroll-to-next-Dhikr logic.
//   - Once `isCompleted`: the ring shows ✓ and is disabled — final state.
// So `showCheck` is true in the last two of those states; only `isCompleted`
// additionally disables the button.
function RepetitionRing({
  target,
  count,
  isCompleted,
  onConfirm,
  instructionLabel,
  ofTargetLabel,
  doneLabel,
}: {
  target: number;
  count: number;
  isCompleted: boolean;
  onConfirm: () => void;
  instructionLabel: string;
  ofTargetLabel: string;
  doneLabel: string;
}) {
  // `target` is `Infinity` for unbounded (Salat al-Ibrahimiyyah) cards — see
  // `targetFor` — so `count >= target` is never true for them; only an
  // explicit `isCompleted` (via the external Finish button) shows the check.
  const showCheck = isCompleted || count >= target;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onConfirm}
        disabled={isCompleted}
        aria-label={isCompleted ? doneLabel : instructionLabel}
        className="dithar-wa-ring-btn relative flex shrink-0 items-center justify-center rounded-full"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--wa-gold-hairline)"
            strokeWidth={RING_STROKE}
          />
        </svg>
        {showCheck ? (
          <Check size={20} strokeWidth={2.5} style={{ color: "var(--wa-gold)" }} />
        ) : (
          <span className="flex flex-col items-center leading-none">
            <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
              {count}
            </span>
            {Number.isFinite(target) && target > 1 && (
              <span className="mt-0.5 text-[8.5px]" style={{ color: "var(--wa-ink-muted)" }}>
                {ofTargetLabel}
              </span>
            )}
          </span>
        )}
      </button>
      {!isCompleted && (
        <span className="max-w-[72px] text-center text-[9px] leading-tight" style={{ color: "var(--wa-ink-muted)" }}>
          {instructionLabel}
        </span>
      )}
    </div>
  );
}

// The approved category artwork, reused (never redrawn) as a very faint
// background presence — "part of the card's material", not a picture
// pasted behind the text. Always absolutely positioned, filling and
// clipped to its own positioned ancestor (the caller MUST be
// `position: relative; overflow: hidden` — every caller here already is)
// so it can NEVER extend past that container's edges. object-fit: cover
// with no circular mask, no frame, no border, per spec.
function AdhkarWatermark({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`dithar-wa-watermark pointer-events-none absolute inset-0 h-full w-full select-none object-cover ${className ?? ""}`}
      style={{ opacity: 0.06, ...style }}
    />
  );
}

const DhikrCard = memo(function DhikrCard({
  item,
  language,
  labels,
  isActive,
  isCompleted,
  count,
  target,
  onTap,
  onFinish,
  onShowMeaning,
  artworkSrc,
}: {
  item: WrittenAdhkarItem;
  language: "ar" | "en";
  labels: Labels;
  isActive: boolean;
  isCompleted: boolean;
  count: number;
  target: number;
  onTap: (id: string) => void;
  // ONLY meaningful for `item.unboundedCount` cards (currently just Salat
  // al-Ibrahimiyyah) — see the external Finish button below. Every other
  // card's completion still goes exclusively through `onTap`/the ring.
  onFinish: (id: string) => void;
  // Passes the button's own DOM node (not just the item) so the reader can
  // measure its actual on-screen position and anchor the Meaning popover
  // to THIS specific card — see `handleShowMeaning`'s own comment for why.
  onShowMeaning: (item: WrittenAdhkarItem, buttonEl: HTMLButtonElement) => void;
  artworkSrc: string;
}) {
  const title = language === "ar" ? item.title_ar : item.title_en;
  const source = language === "ar" ? item.source_ar : item.source_en;
  const mt = dhikrLanguageLabels[language];
  const isUnbounded = item.unboundedCount === true;
  // Once every repetition has been read (count >= target) the ring shows ✓
  // but is NOT yet `isCompleted` — that next tap is the explicit
  // confirmation that advances to the next Dhikr (see handleTap in
  // WrittenAdhkarReader), so the helper text must say so instead of the
  // ordinary "tap to count/confirm" wording for that state only. Unbounded
  // cards never reach that state (target is Infinity — see `targetFor`),
  // so they always just show the plain "tap to count" wording; completion
  // is entirely the separate Finish button's job for these.
  const instructionLabel = isUnbounded
    ? labels.tapToIncrement
    : count >= target
      ? labels.tapToAdvance
      : target > 1
        ? labels.tapToIncrement
        : labels.tapToConfirm;
  const ofTargetLabel = !isUnbounded && target > 1 ? labels.ofTarget(target) : "";

  return (
    <div
      className="dithar-wa-dhikr-card relative overflow-hidden px-4 py-4"
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: isActive
          ? "0 16px 34px -18px rgba(var(--color-shadow-rgb), 0.24), inset 0 0 0 1.5px var(--wa-gold-soft)"
          : "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
      }}
    >
      <AdhkarWatermark src={artworkSrc} />

      <div className="relative">
        {title && (
          <p className="text-[11.5px] font-medium" style={{ color: "var(--wa-gold)" }}>
            {title}
          </p>
        )}
        {/* Always the Arabic dhikr, in both languages — per this task's
            fix, English mode no longer replaces it with `text_en`; that
            translation now renders as the "MEANING" section below instead.
            `dir="rtl"` is hardcoded (not the ambient `dir` from the app's
            current language) because this text is always Arabic script
            regardless of which language the UI itself is in — exactly the
            same convention MiscDuaCard already uses for `text_ar`. */}
        <p
          dir="rtl"
          className="mt-1 text-[16px] font-bold leading-[1.9]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
        >
          {item.text_ar}
        </p>

        {/* English mode keeps the transliteration inline (essential for
            pronunciation, per this task) but no longer shows the full
            Meaning text directly in the card — that now lives behind the
            compact "Meaning" button next to the repetition ring below,
            opening WrittenMeaningPopover. Arabic mode shows neither. */}
        {language === "en" && item.transliteration_en && (
          <div className="mt-3" dir="ltr">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
              {mt.transliterationHeading}
            </p>
            <p className="mt-0.5 text-[13px] italic leading-[1.6]" style={{ color: "var(--wa-ink-muted)" }}>
              {item.transliteration_en}
            </p>
          </div>
        )}

        {/* Salat al-Ibrahimiyyah (unboundedCount) only — concise note that
            this dhikr has no Sunnah-prescribed fixed count, per this task's
            approved correction. */}
        {isUnbounded && (
          <p className="mt-3 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
            {labels.unboundedNote}
          </p>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
              {labels.source}
            </p>
            {/* No line-clamp — a couple of SHORT_SOURCE entries (see
                written-adhkar.ts) run past two lines (e.g. the Abu
                al-Darda' grading note), and a fixed clamp would cut those
                off mid-word. The card has no fixed height, so letting this
                paragraph wrap fully just grows the card to fit. */}
            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {source}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* English-only, per this task: a compact trigger for the full
                Meaning (see WrittenMeaningPopover) instead of showing that
                text inline in every card. Same small-icon-button styling
                already used for Misc library's Listen/Copy/Favorite
                buttons, so it reads as the same design system. */}
            {language === "en" && (
              <button
                type="button"
                data-meaning-trigger="true"
                onClick={(e) => onShowMeaning(item, e.currentTarget)}
                aria-label={mt.meaningButtonAria}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-gold)" }}
              >
                <BookOpenText size={15} strokeWidth={1.8} />
              </button>
            )}
            <RepetitionRing
              target={target}
              count={count}
              isCompleted={isCompleted}
              onConfirm={() => onTap(item.id)}
              instructionLabel={instructionLabel}
              ofTargetLabel={ofTargetLabel}
              doneLabel={labels.dhikrDone}
            />
          </div>
        </div>

        {/* External Finish button — ONLY for the unboundedCount card, ONLY
            once the user has counted at least once, and never once already
            confirmed. Outside the ring itself per this task's spec: this
            is the sole way an unbounded card's repetition is ever marked
            done, since its ring can never reach a target to auto-prompt
            confirmation. */}
        {isUnbounded && count >= 1 && !isCompleted && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onFinish(item.id)}
              className="rounded-full px-4 py-1.5 text-[11.5px] font-semibold"
              style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-gold)" }}
            >
              {labels.finishDhikr}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// The thin vertical rail beside each card: a numbered node (upcoming /
// active / completed) plus a line segment continuing down into the next
// row. The line lives in the SAME flex column as the node (node fixed
// size, line flex-1) rather than as one absolutely-positioned strip
// spanning the whole list — that keeps each segment's color tied directly
// to whether ITS OWN dhikr is completed, and needs no height math synced
// against variable card heights (title present or not, RTL/LTR, repeat
// count length).
function JourneyRail({ index, isLast, isActive, isCompleted }: { index: number; isLast: boolean; isActive: boolean; isCompleted: boolean }) {
  const nodeStyle: React.CSSProperties = isCompleted
    ? { background: "var(--wa-gold)", color: "var(--wa-surface)" }
    : isActive
      ? { background: "var(--wa-surface)", color: "var(--wa-gold)", boxShadow: "inset 0 0 0 1.5px var(--wa-gold)" }
      : { background: "var(--wa-surface)", color: "var(--wa-ink-muted)", boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)" };

  return (
    <div className="flex w-7 shrink-0 flex-col items-center">
      <div className="dithar-wa-node flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={nodeStyle}>
        {isCompleted ? <Check size={13} strokeWidth={2.5} /> : String(index + 1).padStart(2, "0")}
      </div>
      {!isLast && (
        <div
          className="mt-1 w-px flex-1 rounded-full transition-colors duration-300"
          style={{ background: isCompleted ? "var(--wa-gold)" : "var(--wa-gold-hairline)" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// The end-of-journey moment — appended inline in the same spot the reading
// cards occupied, never a takeover of the whole screen. Deliberately
// minimal per spec: no artwork, no glow, no particles, no badge — just a
// calm text reveal ("تقبّل الله ذكرك" as the primary line, "أتممت وردك"
// smaller beneath it) plus the existing Back/Repeat controls. The
// dispersal of the completed cards themselves (see .dithar-wa-dispersing
// in index.css) happens in the PARENT before this component ever mounts;
// this component only ever renders once that's finished, so its own
// entrance only needs one small, quiet fade+rise — reusing
// .dithar-adhkar-text-in, already exactly that: "calm, non-celebratory
// entrance (fade + tiny rise) ... no confetti, no bounce".
function AdhkarCompletionMessage({
  labels,
  onBackToCategories,
  onRestart,
}: {
  labels: Labels;
  onBackToCategories: () => void;
  onRestart: () => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const revealClass = prefersReducedMotion ? "" : "dithar-adhkar-text-in";
  const textDelay = (ms: number) => (prefersReducedMotion ? undefined : `${ms}ms`);

  return (
    <div
      className="relative overflow-hidden px-5 py-10 text-center"
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: "0 16px 34px -20px rgba(var(--color-shadow-rgb), 0.2), inset 0 0 0 1px var(--wa-gold-hairline)",
      }}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Primary message, per spec. */}
        <p
          className={`text-[19px] font-bold ${revealClass}`}
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)", animationDelay: textDelay(80) }}
        >
          {labels.journeyCompleteDua}
        </p>
        {/* Secondary, smaller and more subtle, beneath it. */}
        <p className={`text-[13px] ${revealClass}`} style={{ color: "var(--wa-ink-muted)", animationDelay: textDelay(180) }}>
          {labels.journeyCompleteTitle}
        </p>

        <div className={`mt-4 flex w-full max-w-[260px] flex-col gap-2 ${revealClass}`} style={{ animationDelay: textDelay(300) }}>
          <button
            type="button"
            onClick={onBackToCategories}
            className="w-full rounded-full py-2.5 text-[13.5px] font-bold"
            style={{ boxShadow: "inset 0 0 0 1.5px var(--wa-gold)", background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
          >
            {labels.backToWrittenAdhkar}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-1.5 text-[12.5px] font-medium underline underline-offset-2"
            style={{ color: "var(--wa-ink-muted)" }}
          >
            {labels.restartCategory}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2026-08 UX fix: the Meaning popup for Written Adhkar no longer shares
// MeaningPopoverShell/computeMeaningAnchor (see MeaningPopover.tsx) — that
// implementation is untouched and still exactly what Miscellaneous
// Adhkar's MiscDuaCard uses. Written Adhkar's own popup now:
//   - has NO internal scroll and no max-height cap — it always renders its
//     complete content in full (the previous shared design capped height
//     and could crop part of a long popup, most visibly on Ayat al-Kursi's
//     full English meaning and the very first Dhikr).
//   - opens anchored just above the SPECIFIC card whose Meaning button was
//     tapped (`cardEl`, captured once at open time), then is freely
//     draggable to anywhere on screen by pressing and dragging the card
//     itself — it never snaps back or auto-repositions afterward.
// `position: fixed` (not `absolute` within the scrolling list the way
// MeaningPopoverShell still works) — verified none of .device-backdrop/
// .device-frame/.device-screen sets transform/filter/will-change, so a
// fixed-position descendant here is NOT trapped by `.device-screen`'s own
// `overflow-x:hidden`/`overflow-y:auto` (the actual cropping risk the old
// `position:absolute` version was still exposed to for tall content) — it
// renders directly against the real viewport, with left/width clamped to
// `.device-frame`'s own current on-screen rect so it never visually
// escapes the phone-frame illusion on a wide desktop preview.
const MEANING_CARD_MARGIN_X = 16;
const MEANING_CARD_MARGIN_Y = 20;
const MEANING_CARD_GAP = 10;

function WrittenMeaningPopover({
  item,
  cardEl,
  onClose,
}: {
  item: WrittenAdhkarItem;
  cardEl: HTMLElement;
  onClose: () => void;
}) {
  const mt = dhikrLanguageLabels.en;
  const cardRef = useRef<HTMLDivElement>(null);
  // `left`/`width` are fixed once computed (same "centered, screen-width-
  // minus-margins" sizing this popup has always used). `bottom` (not
  // `top`) is what lets the box grow upward to fit its full, uncapped
  // content with no height measurement needed before first paint — its
  // actual height is left entirely to the browser (`height: auto`); only
  // its bottom edge is pinned, just above the selected card. A pure
  // computation from `cardEl` (stable for this component's whole
  // lifetime — it remounts per open, see `key={item.id}` at the call
  // site) — no state/effect needed for it, unlike the post-render
  // correction below.
  const basePos = useMemo(() => {
    const frameEl = (cardEl.closest(".device-frame") as HTMLElement | null) ?? cardEl;
    const frameRect = frameEl.getBoundingClientRect();
    const width = Math.min(400, frameRect.width - MEANING_CARD_MARGIN_X * 2);
    const left = frameRect.left + (frameRect.width - width) / 2;
    const cardRect = cardEl.getBoundingClientRect();
    const bottom = window.innerHeight - (cardRect.top - MEANING_CARD_GAP);
    return { left, width, bottom };
  }, [cardEl]);
  // Free-drag offset, applied as a `transform` on top of `basePos` — this
  // component remounts fresh (via `key={item.id}` at the call site) each
  // time a different Dhikr's Meaning is opened, so a previous drag never
  // carries over; within one open, nothing else ever resets it.
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Once the (now fully, uncapped-height) card has actually rendered,
  // confirm its own top edge didn't land above the frame's visible top
  // margin — if it did (a long Meaning opened for a card near the top of
  // the list — most visibly Ayat al-Kursi on the very first Dhikr), scroll
  // the list up just enough to reveal the room, the same idea as
  // `ensureRoomAboveCard` in MeaningPopover.tsx but driven by this card's
  // REAL measured height rather than a fixed formula, since nothing here
  // is capped anymore.
  //
  // Scrolling alone can only ever close a gap up to however much the list
  // was ALREADY scrolled down (`screenEl.scrollTop`) — for a card at or
  // near the very top of the whole list, that can be less than the popup
  // needs, with nowhere further to scroll. Rather than let the popup stay
  // partly off-screen (or shrink it, which this popup must never do), the
  // remainder is made up with a temporary `padding-top` on the card list
  // — invisible in the ordinary case (it's 0 whenever scrolling alone was
  // enough) and removed the moment this popup closes (the effect's own
  // cleanup, run on unmount since a fresh `key={item.id}` remounts this
  // component for every open).
  //
  // Written to be idempotent/safe to run more than once (React
  // StrictMode's dev-only double-invoke of effects runs this, its
  // cleanup, then this again before first paint) — every value here is
  // freshly re-measured from the CURRENT live DOM on each run rather than
  // accumulated from a previous pass, so re-running it lands on the exact
  // same correct result instead of drifting.
  useLayoutEffect(() => {
    const screenEl = cardEl.closest<HTMLElement>(".device-screen");
    const listEl = cardEl.closest<HTMLElement>(".dithar-wa-list");
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
    // Deliberately empty deps: this only needs the props captured in the
    // closure (`cardEl`), which never change for a given open popup (a
    // fresh `key={item.id}` remounts this component, and this effect,
    // for every new open) — it must not re-run on later renders this same
    // instance produces (e.g. while dragging).
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
      aria-label={mt.meaningHeading}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[999] flex touch-none flex-col overflow-hidden rounded-2xl border"
      style={{
        left: basePos.left,
        bottom: basePos.bottom,
        width: basePos.width,
        transform: dragDelta.x || dragDelta.y ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : undefined,
        cursor: "grab",
        touchAction: "none",
        background: "var(--wa-surface)",
        borderColor: "var(--wa-gold-hairline)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: "0 20px 50px -20px rgba(var(--color-shadow-rgb), 0.5)",
      }}
    >
      <div className="flex items-start gap-3 border-b p-3" style={{ borderColor: "var(--wa-gold-hairline)" }}>
        <div className="min-w-0 flex-1 pt-0.5">
          {item.title_en && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {item.title_en}
            </p>
          )}
          <p dir="rtl" className="mt-1 line-clamp-1 text-[12.5px]" style={{ color: "var(--wa-ink-muted)" }}>
            {item.text_ar}
          </p>
        </div>
        <button
          type="button"
          data-meaning-no-drag="true"
          onClick={onClose}
          aria-label={mt.close}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)" }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="p-3" dir="ltr">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
          {mt.meaningHeading}
        </p>
        <p className="mt-1 text-[14px] leading-[1.6]" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
          {item.text_en}
        </p>
      </div>
    </div>
  );
}

// The "Adhkar Journey" reader — a single vertical scroll (the app's
// existing convention: .device-screen scrolls internally, see AppShell's
// own doc comment; there is deliberately no nested overflow region here)
// combining a thin numbered progress rail with a stack of premium,
// typography-led reading cards. Replaces the previous one-card-at-a-time
// swipe deck entirely — see git history for that implementation (drag
// physics, spiral-bound page metaphor, favorites/share/detail/summary
// sheets) if any of its secondary features need reviving; this redesign
// deliberately drops them in favor of the spec's explicit "Dhikr number,
// Arabic text, repetition count, status — avoid unnecessary icons" card
// content and a single consistent tap-to-count interaction per item.
// How long the completed cards' dispersal fade/drift plays before the
// content is actually removed and replaced by the completion message (spec
// 3D/3F: "Adhkar dispersal/fade -> completion message fades in"). Matches
// the .dithar-wa-dispersing CSS animation duration in index.css exactly —
// this is the ONE place both are driven from, so they can never drift out
// of sync with each other.
const DISPERSAL_MS = 480;
const DISPERSAL_MS_REDUCED = 120;

export function WrittenAdhkarReader({
  category,
  onNavigateHome,
  onNavigateToTasbeeh,
  onNavigateToSettings,
  onBackToCategories,
}: WrittenAdhkarReaderProps) {
  const { language, dir } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const categoryLabel = writtenAdhkarCategoryLabels[category][language];
  const items = useMemo(() => writtenAdhkarItems[category], [category]);
  const artworkSrc = CATEGORY_ARTWORK[category];
  const prefersReducedMotion = usePrefersReducedMotion();

  // counts[item.id] = how many repetitions have been read/tapped so far
  // (0..target) — one per tap while count < target. Purely a running tally;
  // reaching `target` alone does NOT mean the Dhikr is done (see
  // `confirmed` below) — it only switches the ring to show ✓ and wait for
  // one more, explicit confirming tap.
  const [counts, setCounts] = useState<Record<string, number>>({});
  // confirmed[item.id] = true only after the user's EXTRA tap on the ✓ once
  // count === target. This — not `counts` — is what actually marks a Dhikr
  // "done" for the journey (activeIndex/scrolling/completion below), so
  // reaching the repetition target by itself never advances anything.
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  // Mirrors of the two state values above, read from inside `handleTap`
  // instead of the state itself — keeps `handleTap`'s identity stable
  // across taps (it no longer depends on `counts`/`confirmed`, which change
  // on every single tap), so it can be passed straight down to every
  // memoized DhikrCard without breaking that memoization on each repetition
  // — same fix already applied to MiscDuaCard/useMiscSpeech.
  const countsRef = useRef(counts);
  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);
  const confirmedRef = useRef(confirmed);
  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const completionRef = useRef<HTMLDivElement | null>(null);
  // "active" — normal reading, cards shown as usual.
  // "dispersing" — the FINAL ✓-confirmation of the FINAL Dhikr has already
  //   been recorded to Statistics (see handleTap); the completed cards are
  //   now fading away, nothing else has changed yet.
  // "completed" — the cards are gone; the completion message is shown in
  //   their place. Set only after DISPERSAL_MS has elapsed, never before.
  const [journeyPhase, setJourneyPhase] = useState<"active" | "dispersing" | "completed">("active");
  // Which of the five daily prayers this session's Adhkar are being read
  // after — only relevant for `category === "prayer"` (see targetFor and
  // PRAYER_SPECIFIC_REPEAT), and only ever affects the three Quls' target
  // count. Session-scoped, not persisted — the app has no existing
  // general-purpose settings mechanism this would fit into.
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerName>("fajr");
  // Which single item's full Meaning is currently shown, and the specific
  // DOM card it was opened from (captured once, at open time) — English
  // mode only, see DhikrCard's meaning button and WrittenMeaningPopover
  // above. Setting a NEW value always fully replaces whatever was open
  // before, so tapping a different card's button can never show two
  // popovers or the wrong item.
  const [meaningState, setMeaningState] = useState<{ item: WrittenAdhkarItem; cardEl: HTMLElement } | null>(null);
  // Stable identity (empty deps — reads no outside state) so it can be
  // passed straight to every memoized DhikrCard as `onShowMeaning`;
  // opening/closing only ever re-renders WrittenMeaningPopover, never the
  // journey's card list.
  const handleShowMeaning = useCallback((item: WrittenAdhkarItem, buttonEl: HTMLButtonElement) => {
    const cardEl = buttonEl.closest<HTMLElement>(".dithar-wa-dhikr-card") ?? buttonEl;
    setMeaningState({ item, cardEl });
  }, []);
  const handleCloseMeaning = useCallback(() => setMeaningState(null), []);

  // The journey only ever reads/renders `visibleItems` — every Dhikr whose
  // `prayerScope` includes the currently selected prayer (or has no scope
  // at all, i.e. "all"/common Adhkar said after every prayer). This is the
  // ONLY place prayer-specific visibility is decided — never a UI-level
  // filter layered on top separately from the data. For any category other
  // than "prayer", `prayerScope` is irrelevant and every item is visible.
  const visibleItems = useMemo(
    () => items.filter((item) => isInPrayerScope(item, category, selectedPrayer)),
    [items, category, selectedPrayer],
  );

  // Fresh journey every time a different category OR prayer is selected —
  // the visible set of Adhkar (and, for a few of them, their target count)
  // can differ between prayers, so continuing stale progress across a
  // prayer switch would be confusing (e.g. "3 of 9" suddenly becoming
  // "3 of 7"). Same reset already applied on category change.
  useEffect(() => {
    setCounts({});
    setConfirmed({});
    setJourneyPhase("active");
  }, [category, selectedPrayer]);

  function isDone(item: WrittenAdhkarItem) {
    return confirmed[item.id] === true;
  }

  const activeIndex = visibleItems.findIndex((item) => !isDone(item));
  const allDone = activeIndex === -1;
  const displayPosition = allDone ? visibleItems.length : activeIndex + 1;

  // Shared by handleTap's target-reached branch AND handleFinish (the
  // unboundedCount card's external Finish button) — marks one Dhikr done
  // and, if that was the last one, ends the journey. Neither caller passes
  // another repetition through here; `counts` is untouched.
  const confirmItem = useCallback(
    (id: string) => {
      if (confirmedRef.current[id] === true) return;
      const updatedConfirmed = { ...confirmedRef.current, [id]: true };

      // CRITICAL ORDER (spec 3B): record + persist BEFORE any part of the
      // visual transition begins. recordWirdComplete writes to localStorage
      // synchronously, so it has already completed by the time
      // setJourneyPhase runs — the dispersal animation can only ever start
      // after the statistics event exists.
      setConfirmed(updatedConfirmed);

      const journeyFinished = visibleItems.every((i) => updatedConfirmed[i.id] === true);
      if (journeyFinished) {
        recordWirdComplete(category);
        setJourneyPhase("dispersing");
      }
    },
    [visibleItems, category],
  );

  // Stable across taps (deps are category/prayer/list identity, not the
  // per-tap `counts`/`confirmed` state — read via the refs above instead)
  // — see the refs' own comment for why this matters for DhikrCard's memo.
  const handleTap = useCallback(
    (id: string) => {
      const item = visibleItems.find((i) => i.id === id);
      if (!item || confirmedRef.current[id] === true) return;
      const target = targetFor(item, selectedPrayer);
      const current = countsRef.current[id] ?? 0;

      if (current < target) {
        // Reading tap: count this repetition. Never advances/scrolls by
        // itself, even when this brings `current` up to `target` — the ring
        // switches to showing ✓, but the Dhikr is not yet "done". For
        // `unboundedCount` items `target` is Infinity (see `targetFor`), so
        // this branch is the ONLY thing the ring ever does for them — they
        // never fall through to the confirm branch below via the ring.
        setCounts({ ...countsRef.current, [id]: current + 1 });
        recordWrittenRepetition(category, id);
        return;
      }

      // current === target: every repetition has already been read/tapped —
      // this tap is the user's EXPLICIT confirmation (pressing the ✓), not
      // another repetition.
      confirmItem(id);
    },
    [visibleItems, selectedPrayer, category, confirmItem],
  );

  // The unboundedCount card's external Finish button (see DhikrCard) — the
  // ONLY way such a card is ever marked done, since its ring's `target` is
  // Infinity and can never be "reached" to prompt the usual ring-tap
  // confirmation. Deliberately does not check/require a target at all.
  const handleFinish = useCallback((id: string) => confirmItem(id), [confirmItem]);

  function handleRestart() {
    setCounts({});
    setConfirmed({});
    setJourneyPhase("active");
    itemRefs.current[visibleItems[0]?.id ?? ""]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Move focus toward the next Dhikr the moment the active one completes —
  // "the journey" advancing on its own rather than requiring a manual
  // "next" action. This only ever runs off an explicit ✓ confirmation
  // changing `activeIndex`, never off elapsed internal timing alone.
  //
  // `block: "start"` (not "center"): `center` asks the browser to position
  // the element's middle at the scroll container's middle, which it can
  // only do if there's enough content on BOTH sides to scroll to — near
  // the end of the journey (fewer cards left below the new active one)
  // there often isn't, so the browser scrolls as far as it can and the
  // card lands lower than intended, sometimes still partially below the
  // fold. `start` has no such shortfall: it always brings the target
  // card's own top edge to the top of `.device-screen` (this reader's
  // actual scrolling container — see DeviceFrame/index.css), which is
  // never behind anything else here since neither TopBar nor BackHeader
  // is sticky/fixed (verified in index.css — no `position: sticky|fixed`
  // at all in this app), so no extra header-height offset is needed.
  useEffect(() => {
    if (allDone) return;
    const activeItem = visibleItems[activeIndex];
    if (!activeItem) return;
    const el = itemRefs.current[activeItem.id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Only re-run when the ACTIVE item itself changes, not on every tap
    // (which would fight the user's own scroll position mid-repetition).
    // `selectedPrayer` is included because switching prayers can change
    // WHICH item sits at a given `activeIndex` (the visible set itself
    // changes) even when the numeric index happens to stay the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, category, selectedPrayer]);

  // Once the dispersal animation has had time to play, swap the (now
  // invisible) cards out for the completion message. The statistics event
  // itself was already recorded synchronously back in handleTap, well
  // before this effect even exists — this only ever controls the VISUAL
  // hand-off from cards to message.
  useEffect(() => {
    if (journeyPhase !== "dispersing") return;
    const timer = window.setTimeout(
      () => setJourneyPhase("completed"),
      prefersReducedMotion ? DISPERSAL_MS_REDUCED : DISPERSAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [journeyPhase, prefersReducedMotion]);

  // A light courtesy scroll toward the completion message once it appears
  // — it renders "in the same area" the cards occupied, so the user's
  // existing scroll position (already following the active card via the
  // effect above) is normally already close; this just settles it exactly.
  useEffect(() => {
    if (journeyPhase !== "completed") return;
    completionRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  }, [journeyPhase, prefersReducedMotion]);

  return (
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={meaningState !== null}>
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <BackHeader title={categoryLabel} onBack={onBackToCategories} backLabel={t.back} hideButton />
          <StickyBackButton onBack={onBackToCategories} backLabel={t.back} dir={dir} />

          <div className="mt-1.5 flex flex-col items-center gap-1">
            <p className="text-[12.5px]" style={{ color: "var(--wa-on-page-muted)" }}>
              {t.dailyWird}
            </p>
            <p
              className="text-[14px] font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)", letterSpacing: "0.04em" }}
            >
              {t.journeyProgress(displayPosition, visibleItems.length)}
            </p>
            <span className="sr-only" aria-live="polite">
              {t.progressAria(displayPosition, visibleItems.length)}
            </span>
          </div>

          {/* Prayer picker — Prayer Adhkar only. A handful of these Adhkar
              (the three Quls) have a repetition count that genuinely
              differs by which prayer was just performed (see
              PRAYER_SPECIFIC_REPEAT in written-adhkar.ts); everything else
              about the journey (reading, repeating, confirming, scrolling)
              is completely unaffected by this choice. Reuses the same
              small-pill visual language already established for
              JourneyRail's own node states just below (gold fill = the
              active choice, plain surface + hairline ring = the rest) —
              no new colors or component styles introduced. */}
          {category === "prayer" && journeyPhase !== "completed" && (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <span className="text-[11px]" style={{ color: "var(--wa-on-page-muted)" }}>
                {t.choosePrayer}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {PRAYER_NAMES.map((prayer) => {
                  const isSelected = prayer === selectedPrayer;
                  return (
                    <button
                      key={prayer}
                      type="button"
                      onClick={() => setSelectedPrayer(prayer)}
                      aria-pressed={isSelected}
                      className="rounded-full px-3 py-1 text-[11.5px] font-medium"
                      style={
                        isSelected
                          ? { background: "var(--wa-gold)", color: "var(--wa-surface)" }
                          : { background: "var(--wa-surface)", color: "var(--wa-ink-muted)", boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)" }
                      }
                    >
                      {prayerLabel(t, prayer)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {journeyPhase !== "completed" ? (
            <div
              // `dithar-wa-list` — plain marker class, kept for other
              // comments' sake; no longer a positioning context anything
              // relies on (WrittenMeaningPopover is `position: fixed`
              // against the real viewport now — see its own comment).
              className={`dithar-wa-list relative mt-4 flex flex-col ${journeyPhase === "dispersing" ? "dithar-wa-dispersing" : ""}`}
            >
              {visibleItems.map((item, index) => {
                const completed = isDone(item);
                const active = !allDone && index === activeIndex;
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    className="flex items-stretch gap-3"
                  >
                    <JourneyRail index={index} isLast={index === visibleItems.length - 1} isActive={active} isCompleted={completed} />
                    <div className="min-w-0 flex-1 pb-5">
                      <DhikrCard
                        item={item}
                        language={language}
                        labels={t}
                        isActive={active}
                        isCompleted={completed}
                        count={counts[item.id] ?? 0}
                        target={targetFor(item, selectedPrayer)}
                        onTap={handleTap}
                        onFinish={handleFinish}
                        onShowMeaning={handleShowMeaning}
                        artworkSrc={artworkSrc}
                      />
                    </div>
                  </div>
                );
              })}

              {meaningState && (
                <WrittenMeaningPopover key={meaningState.item.id} item={meaningState.item} cardEl={meaningState.cardEl} onClose={handleCloseMeaning} />
              )}
            </div>
          ) : (
            <div ref={completionRef} className="mt-4">
              <AdhkarCompletionMessage labels={t} onBackToCategories={onBackToCategories} onRestart={handleRestart} />
            </div>
          )}
        </div>

        <BottomNav
          className="mt-3"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onBackToCategories();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
