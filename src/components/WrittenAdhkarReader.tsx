import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader } from "./BackHeader";
import { CATEGORY_ARTWORK } from "../icons/CategoryEmblem";
import { useLanguage } from "../theme/LanguageContext";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels, writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey, WrittenAdhkarItem, PrayerName, PrayerScope } from "../data/written-adhkar";
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
function targetFor(item: WrittenAdhkarItem, selectedPrayer: PrayerName): number {
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
            {target > 1 && (
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

function DhikrCard({
  item,
  language,
  dir,
  labels,
  isActive,
  isCompleted,
  count,
  target,
  onTap,
  artworkSrc,
}: {
  item: WrittenAdhkarItem;
  language: "ar" | "en";
  dir: "rtl" | "ltr";
  labels: Labels;
  isActive: boolean;
  isCompleted: boolean;
  count: number;
  target: number;
  onTap: () => void;
  artworkSrc: string;
}) {
  const title = language === "ar" ? item.title_ar : item.title_en;
  const text = language === "ar" ? item.text_ar : item.text_en;
  const source = language === "ar" ? item.source_ar : item.source_en;
  // Once every repetition has been read (count >= target) the ring shows ✓
  // but is NOT yet `isCompleted` — that next tap is the explicit
  // confirmation that advances to the next Dhikr (see handleTap in
  // WrittenAdhkarReader), so the helper text must say so instead of the
  // ordinary "tap to count/confirm" wording for that state only.
  const instructionLabel = count >= target ? labels.tapToAdvance : target > 1 ? labels.tapToIncrement : labels.tapToConfirm;
  const ofTargetLabel = target > 1 ? labels.ofTarget(target) : "";

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
        <p
          dir={dir}
          className="mt-1 text-[16px] font-bold leading-[1.9]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
        >
          {text}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
              {labels.source}
            </p>
            {/* Short, card-ready source strings (see SHORT_SOURCE in
                written-adhkar.ts) normally fit on one line; line-clamp-2
                (instead of a single-line truncate) is the safety net for
                the few that run long, so the grading never gets cut off
                mid-word — it wraps to a second line instead. */}
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {source}
            </p>
          </div>

          <RepetitionRing
            target={target}
            count={count}
            isCompleted={isCompleted}
            onConfirm={onTap}
            instructionLabel={instructionLabel}
            ofTargetLabel={ofTargetLabel}
            doneLabel={labels.dhikrDone}
          />
        </div>
      </div>
    </div>
  );
}

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

  function handleTap(item: WrittenAdhkarItem) {
    if (isDone(item)) return;
    const target = targetFor(item, selectedPrayer);
    const current = counts[item.id] ?? 0;

    if (current < target) {
      // Reading tap: count this repetition. Never advances/scrolls by
      // itself, even when this brings `current` up to `target` — the ring
      // switches to showing ✓, but the Dhikr is not yet "done".
      setCounts({ ...counts, [item.id]: current + 1 });
      recordWrittenRepetition(category, item.id);
      return;
    }

    // current === target: every repetition has already been read/tapped —
    // this tap is the user's EXPLICIT confirmation (pressing the ✓), not
    // another repetition, so it does not touch `counts` or record another
    // repetition. Only this action marks the Dhikr done and can trigger
    // advancing to the next one / finishing the journey.
    const updatedConfirmed = { ...confirmed, [item.id]: true };

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
  }

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
    <DeviceFrame background="var(--wa-page-bg)">
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <BackHeader title={categoryLabel} onBack={onBackToCategories} backLabel={t.back} />

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
            <div className={`mt-4 flex flex-col ${journeyPhase === "dispersing" ? "dithar-wa-dispersing" : ""}`}>
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
                        dir={dir}
                        labels={t}
                        isActive={active}
                        isCompleted={completed}
                        count={counts[item.id] ?? 0}
                        target={targetFor(item, selectedPrayer)}
                        onTap={() => handleTap(item)}
                        artworkSrc={artworkSrc}
                      />
                    </div>
                  </div>
                );
              })}
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
