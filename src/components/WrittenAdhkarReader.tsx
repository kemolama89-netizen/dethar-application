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
import type { WrittenAdhkarCategoryKey, WrittenAdhkarItem } from "../data/written-adhkar";

interface WrittenAdhkarReaderProps {
  category: WrittenAdhkarCategoryKey;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onBackToCategories: () => void;
}

type Labels = (typeof writtenAdhkarLabels)["ar"];

// Items with no established repetition count are read once — the ring
// still gives them the same tap-to-confirm interaction (target 1) rather
// than a separate, different affordance, so the whole journey uses one
// consistent gesture throughout.
function targetFor(item: WrittenAdhkarItem): number {
  return item.repeat ?? 1;
}

const RING_SIZE = 56;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// The tap-to-count interaction shared by every card, regardless of
// whether its target is 1 (a plain "mark as read" confirmation) or a
// real repeated count (3, 7, 33...) — one consistent gesture and visual
// language throughout the journey, per spec.
function RepetitionRing({
  target,
  count,
  isCompleted,
  onTap,
  instructionLabel,
  ofTargetLabel,
  doneLabel,
}: {
  target: number;
  count: number;
  isCompleted: boolean;
  onTap: () => void;
  instructionLabel: string;
  ofTargetLabel: string;
  doneLabel: string;
}) {
  const fraction = Math.min(1, count / target);
  const offset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onTap}
        disabled={isCompleted}
        aria-label={isCompleted ? doneLabel : instructionLabel}
        className="dithar-wa-ring-btn relative flex shrink-0 items-center justify-center rounded-full"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 -rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--wa-gold-hairline)"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--wa-gold)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="dithar-wa-ring-progress"
          />
        </svg>
        {isCompleted ? (
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
  const instructionLabel = target > 1 ? labels.tapToIncrement : labels.tapToConfirm;
  const ofTargetLabel = target > 1 ? labels.ofTarget(target) : "";

  return (
    <div
      className="dithar-wa-dhikr-card relative overflow-hidden px-4 py-4"
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: isActive
          ? "0 16px 34px -18px rgba(23, 38, 58, 0.24), inset 0 0 0 1.5px var(--wa-gold-soft)"
          : "0 8px 20px -16px rgba(23, 38, 58, 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
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
            <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--wa-ink-muted)" }}>
              {source}
            </p>
          </div>

          <RepetitionRing
            target={target}
            count={count}
            isCompleted={isCompleted}
            onTap={onTap}
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

// One tiny light particle drifting a short distance outward and fading —
// see the .dithar-adhkar-particle keyframe for the actual motion; this
// just picks each particle's own direction/reach so they fan out rather
// than all traveling identically.
const PARTICLE_COUNT = 9;
function buildParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 2 === 0 ? 0.18 : -0.18);
    const distance = 30 + (i % 3) * 9;
    return {
      id: i,
      px: `${Math.cos(angle) * distance}px`,
      // Biased slightly upward (negative y) — light rising, not falling.
      py: `${Math.sin(angle) * distance * 0.7 - 8}px`,
      delay: 150 + i * 45,
    };
  });
}

// How long the celebration's own motion (glow/breathe/particles) plays
// before settling into the calm, still, final state — long enough for
// the slowest piece (the 1700ms glow) to fully finish.
const CELEBRATION_MS = 1900;
const CELEBRATION_MS_REDUCED = 260;

// The end-of-journey moment — appended inline after the last card, never
// a takeover of the whole screen (spec: "do NOT immediately replace the
// screen with a new page"). Plays its celebration sequence exactly once
// per mount (i.e. once per finished journey): the SAME approved category
// artwork that has been sitting as a quiet watermark on every card above
// rises in visibility, a soft gold light and a handful of tiny particles
// appear, the artwork takes one breath, and only then does the message
// reveal. After ~1.9s everything settles back to stillness — no looping
// animation is left running.
function AdhkarCompletionCelebration({
  artworkSrc,
  labels,
  categoryLabel,
  onBackToCategories,
  onRestart,
}: {
  artworkSrc: string;
  labels: Labels;
  categoryLabel: string;
  onBackToCategories: () => void;
  onRestart: () => void;
}) {
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  ).current;
  const [phase, setPhase] = useState<"celebrating" | "settled">("celebrating");
  const particles = useMemo(() => (prefersReducedMotion ? [] : buildParticles()), [prefersReducedMotion]);

  // Runs the celebration exactly once: this component only ever mounts
  // when the journey first becomes fully complete (its parent renders it
  // conditionally on `allDone`), so "on mount" already means "on
  // completion" — no separate trigger/guard needed.
  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("settled"), prefersReducedMotion ? CELEBRATION_MS_REDUCED : CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  const celebrating = phase === "celebrating";
  const textDelay = (ms: number) => (prefersReducedMotion ? "0ms" : `${ms}ms`);

  return (
    <div
      className="relative overflow-hidden px-5 py-8 text-center"
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: "0 16px 34px -20px rgba(23, 38, 58, 0.2), inset 0 0 0 1px var(--wa-gold-hairline)",
      }}
    >
      {/* Step 2 + 10: the same watermark every card carries, rising to a
          still-subtle peak while celebrating, then settling back down. */}
      <AdhkarWatermark
        src={artworkSrc}
        className={celebrating && !prefersReducedMotion ? "dithar-adhkar-watermark--rising dithar-adhkar-breathe" : ""}
        style={
          celebrating
            ? ({ "--wm-start": 0.06, "--wm-peak": 0.22, opacity: prefersReducedMotion ? 0.22 : undefined } as CSSProperties)
            : { opacity: 0.09 }
        }
      />

      {/* Step 3: soft warm light, once. Step 4: a handful of tiny points
          of light drifting out and fading. Both removed entirely once the
          celebration settles — nothing keeps animating afterward. */}
      {celebrating && !prefersReducedMotion && (
        <>
          <div
            className="dithar-adhkar-glow pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 40%, var(--wa-gold-soft), transparent 65%)" }}
            aria-hidden="true"
          />
          {particles.map((p) => (
            <span
              key={p.id}
              className="dithar-adhkar-particle"
              style={{ "--px": p.px, "--py": p.py, animationDelay: `${p.delay}ms` } as CSSProperties}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      <div className="relative flex flex-col items-center gap-3">
        <span
          className="dithar-adhkar-text-in flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--wa-badge-bg)", animationDelay: textDelay(500) }}
        >
          <Check size={26} strokeWidth={2} style={{ color: "var(--wa-gold)" }} />
        </span>

        {/* Step 6: title, then the dua beneath it exactly as specified. */}
        <h2
          className="dithar-adhkar-text-in text-[19px] font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)", animationDelay: textDelay(600) }}
        >
          {labels.journeyCompleteTitle}
        </h2>
        <p
          className="dithar-adhkar-text-in text-[14.5px]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)", animationDelay: textDelay(680) }}
        >
          {labels.journeyCompleteDua}
        </p>
        <p className="dithar-adhkar-text-in text-[13px]" style={{ color: "var(--wa-ink-muted)", animationDelay: textDelay(750) }}>
          {labels.journeyCompleteSubtitle(categoryLabel)}
        </p>

        <div
          className="dithar-adhkar-text-in mt-2 flex w-full max-w-[260px] flex-col gap-2"
          style={{ animationDelay: textDelay(820) }}
        >
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
export function WrittenAdhkarReader({ category, onNavigateHome, onNavigateToTasbeeh, onBackToCategories }: WrittenAdhkarReaderProps) {
  const { language, dir } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const categoryLabel = writtenAdhkarCategoryLabels[category][language];
  const items = useMemo(() => writtenAdhkarItems[category], [category]);
  const artworkSrc = CATEGORY_ARTWORK[category];

  // counts[item.id] = how many times its ring has been tapped so far.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fresh journey every time a different category is opened.
  useEffect(() => {
    setCounts({});
  }, [category]);

  function isDone(item: WrittenAdhkarItem) {
    return (counts[item.id] ?? 0) >= targetFor(item);
  }

  const activeIndex = items.findIndex((item) => !isDone(item));
  const allDone = activeIndex === -1;
  const displayPosition = allDone ? items.length : activeIndex + 1;

  function handleTap(item: WrittenAdhkarItem) {
    if (isDone(item)) return;
    const target = targetFor(item);
    setCounts((prev) => ({ ...prev, [item.id]: Math.min(target, (prev[item.id] ?? 0) + 1) }));
  }

  function handleRestart() {
    setCounts({});
    itemRefs.current[items[0]?.id ?? ""]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Move focus toward the next Dhikr the moment the active one completes —
  // "the journey" advancing on its own rather than requiring a manual
  // "next" action.
  useEffect(() => {
    if (allDone) return;
    const activeItem = items[activeIndex];
    if (!activeItem) return;
    const el = itemRefs.current[activeItem.id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Only re-run when the ACTIVE item itself changes, not on every tap
    // (which would fight the user's own scroll position mid-repetition).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, category]);

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
              {t.journeyProgress(displayPosition, items.length)}
            </p>
            <span className="sr-only" aria-live="polite">
              {t.progressAria(displayPosition, items.length)}
            </span>
          </div>

          <div className="mt-4 flex flex-col">
            {items.map((item, index) => {
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
                  <JourneyRail index={index} isLast={index === items.length - 1} isActive={active} isCompleted={completed} />
                  <div className="min-w-0 flex-1 pb-5">
                    <DhikrCard
                      item={item}
                      language={language}
                      dir={dir}
                      labels={t}
                      isActive={active}
                      isCompleted={completed}
                      count={counts[item.id] ?? 0}
                      target={targetFor(item)}
                      onTap={() => handleTap(item)}
                      artworkSrc={artworkSrc}
                    />
                  </div>
                </div>
              );
            })}

            {allDone && (
              <AdhkarCompletionCelebration
                artworkSrc={artworkSrc}
                labels={t}
                categoryLabel={categoryLabel}
                onBackToCategories={onBackToCategories}
                onRestart={handleRestart}
              />
            )}
          </div>
        </div>

        <BottomNav
          className="mt-3"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onBackToCategories();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
