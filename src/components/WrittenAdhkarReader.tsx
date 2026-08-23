import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowUp, Check, ChevronDown, ChevronUp, Heart, Info, X } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader } from "./BackHeader";
import { MedallionIcon, SprigIcon } from "../icons/CustomIcons";
import { useLanguage } from "../theme/LanguageContext";
import { useTheme } from "../theme/ThemeContext";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels, writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey, WrittenAdhkarItem } from "../data/written-adhkar";

interface WrittenAdhkarReaderProps {
  category: WrittenAdhkarCategoryKey;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onBackToCategories: () => void;
}

// Deliberately restrained: the active card is the whole point, and the
// spec explicitly asks for "a subtle indication that more adhkar follow"
// rather than a multi-card deck — so there is exactly ONE faint tile
// behind the active one, not a stack.
const BEHIND_OFFSET_Y = 14;
const BEHIND_SCALE = 0.96;
const BEHIND_OPACITY = 0.45;

// Vertical swipe up = next, down = previous — deterministic and
// direction-agnostic w.r.t. RTL/LTR (unlike a horizontal gesture, "up"
// and "down" mean the same thing regardless of reading direction, so no
// mirroring logic is needed here).
const LEAVE_MS = 300;
// Deliberately forgiving — the user should never have to perform a
// precise gesture; a fairly small, decisive movement in either direction
// is enough to commit.
const SWIPE_THRESHOLD = 70;

function DominoTile({
  item,
  language,
  dir,
  labels,
  isActive,
  isBehind,
  transform,
  opacity,
  isDragging,
  isEntering,
  isSnapping,
  OrnamentIcon,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onAnimationEnd,
  onOpenDetail,
}: {
  item: WrittenAdhkarItem;
  language: "ar" | "en";
  dir: "rtl" | "ltr";
  labels: (typeof writtenAdhkarLabels)["ar"];
  isActive: boolean;
  isBehind: boolean;
  transform: string;
  opacity: number;
  isDragging: boolean;
  isEntering?: boolean;
  isSnapping?: boolean;
  OrnamentIcon: typeof MedallionIcon;
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onAnimationEnd?: () => void;
  onOpenDetail?: () => void;
}) {
  const title = language === "ar" ? item.title_ar : item.title_en;
  const text = language === "ar" ? item.text_ar : item.text_en;
  const source = language === "ar" ? item.source_ar : item.source_en;

  const className = [
    "dithar-domino-tile",
    "absolute left-1/2 top-1/2 flex w-[85%] max-w-[320px] flex-col overflow-hidden",
    isDragging ? "dithar-domino-tile--dragging" : "",
    !isDragging && isSnapping ? "dithar-domino-tile--snapping" : "",
    isEntering ? "dithar-domino-tile--entering" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{
        height: "clamp(230px, 46vh, 340px)",
        transform,
        opacity,
        zIndex: isBehind ? 1 : 2,
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        // ONE box-shadow value carries the outer ambient shadow (large,
        // soft, very low opacity — never a hard/dark shadow) AND the
        // thin inset gold hairline "border". Deliberately not a real CSS
        // `border` as well: a border + an inset shadow on the same edge
        // can drift a hair out of alignment while `scale` is animating,
        // which is what was reading as a stray line across the card
        // during a transition.
        boxShadow: isActive
          ? "0 26px 50px -22px rgba(23, 38, 58, 0.2), inset 0 0 0 1px var(--wa-gold-hairline)"
          : "0 14px 30px -20px rgba(23, 38, 58, 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
        touchAction: isActive ? "none" : undefined,
        pointerEvents: isActive ? "auto" : "none",
      }}
      onPointerDown={isActive ? onPointerDown : undefined}
      onPointerMove={isActive ? onPointerMove : undefined}
      onPointerUp={isActive ? onPointerUp : undefined}
      onPointerCancel={isActive ? onPointerUp : undefined}
      onAnimationEnd={isEntering ? onAnimationEnd : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 overflow-hidden px-5 py-4 text-center">
        <OrnamentIcon size={15} style={{ color: "var(--wa-gold)" }} />
        <span className="h-px w-9" style={{ background: "var(--wa-gold-hairline)" }} aria-hidden="true" />

        {title && (
          <p className="text-[12px] font-medium" style={{ color: "var(--wa-gold)" }}>
            {title}
          </p>
        )}
        <p
          dir={dir}
          className="max-h-full overflow-y-auto text-[17px] font-bold leading-[1.9] tracking-[0.005em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
        >
          {text}
        </p>
      </div>

      <div
        className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-2.5"
        style={{ borderColor: "var(--wa-gold-hairline)" }}
      >
        <p className="min-w-0 truncate text-[11px]" style={{ color: "var(--wa-ink-muted)" }}>
          {labels.source}: {source}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {typeof item.repeat === "number" && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
            >
              {labels.repeatTimes(item.repeat)}
            </span>
          )}
          {isActive && onOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              aria-label={labels.details}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ color: "var(--wa-ink-muted)" }}
            >
              <Info size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function WrittenAdhkarReader({
  category,
  onNavigateHome,
  onNavigateToTasbeeh,
  onBackToCategories,
}: WrittenAdhkarReaderProps) {
  const { language, dir } = useLanguage();
  const { theme } = useTheme();
  const t = writtenAdhkarLabels[language];
  const categoryLabel = writtenAdhkarCategoryLabels[category][language];
  const items = useMemo(() => writtenAdhkarItems[category], [category]);
  const OrnamentIcon = theme === "women" ? SprigIcon : MedallionIcon;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  // Only ever populated by advance() — retreat() has no leaving overlay of
  // its own (see its comment below), so this always exits upward.
  const [leaving, setLeaving] = useState<{ item: WrittenAdhkarItem; fromY: number } | null>(null);
  const [leavingAnimateOut, setLeavingAnimateOut] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // First-run "swipe up" hint — shown once, hidden for good the moment
  // the user makes any move (drag, button, or keyboard) and never
  // brought back.
  const [hasInteracted, setHasInteracted] = useState(false);
  // Which tile (by id) just became active via "previous", so it alone
  // gets a one-shot entrance animation — see .dithar-domino-tile--entering
  // in index.css.
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const dragStartYRef = useRef(0);
  const leaveTimeoutRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);

  const isFirst = currentIndex === 0;
  const nextItem = items[currentIndex + 1];

  // Reset the reader whenever a different category is opened (e.g. user
  // goes back and picks another one) — each category starts fresh.
  useEffect(() => {
    setCurrentIndex(0);
    setDragY(0);
    setIsDragging(false);
    setIsSnapping(false);
    setLeaving(null);
    setLeavingAnimateOut(false);
    setIsComplete(false);
    setShowSummary(false);
    setShowDetail(false);
    setFavorites(new Set());
    setHasInteracted(false);
    setEnteringId(null);
  }, [category]);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current !== null) window.clearTimeout(leaveTimeoutRef.current);
      if (snapTimeoutRef.current !== null) window.clearTimeout(snapTimeoutRef.current);
    };
  }, []);

  // Kicks off the leaving tile's own exit transition one frame after it
  // mounts at its starting (drag-offset) position, so the browser
  // actually animates the transform change instead of jumping straight
  // to the end state.
  useEffect(() => {
    if (!leaving) return;
    const raf = requestAnimationFrame(() => setLeavingAnimateOut(true));
    return () => cancelAnimationFrame(raf);
  }, [leaving]);

  function markInteracted() {
    setHasInteracted(true);
  }

  function advance() {
    if (leaving) return;
    const current = items[currentIndex];
    if (!current) return;
    markInteracted();

    setLeaving({ item: current, fromY: dragY });
    setLeavingAnimateOut(false);
    setDragY(0);
    setIsDragging(false);
    setIsSnapping(false);

    const isLast = currentIndex + 1 >= items.length;
    if (!isLast) setCurrentIndex((i) => i + 1);

    leaveTimeoutRef.current = window.setTimeout(() => {
      setLeaving(null);
      setLeavingAnimateOut(false);
      if (isLast) setIsComplete(true);
    }, LEAVE_MS);
  }

  // Previous — reversed, not a sudden index jump: the tile becoming
  // active again was off-stack a moment ago (it isn't the single "behind"
  // tile), so it gets a one-shot entrance dropping down into place from
  // above, mirroring the direction it would have exited by by had the
  // user been going forward.
  function retreat() {
    if (leaving || isFirst) return;
    markInteracted();
    const prevIndex = currentIndex - 1;
    setEnteringId(items[prevIndex]?.id ?? null);
    setCurrentIndex(prevIndex);
    setDragY(0);
    setIsDragging(false);
    setIsSnapping(false);
  }

  function restart() {
    setCurrentIndex(0);
    setDragY(0);
    setIsDragging(false);
    setIsSnapping(false);
    setLeaving(null);
    setLeavingAnimateOut(false);
    setIsComplete(false);
    setShowSummary(false);
    setShowDetail(false);
    setEnteringId(null);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Keyboard support (spec: the reader must remain usable without
  // gestures). Only active while the card stack itself is showing — not
  // while the summary/detail sheets are open (their own Escape handling
  // is separate) or after completion (no more cards to move between).
  useEffect(() => {
    if (isComplete || showSummary || showDetail) return;
    function onKeyDown(e: KeyboardEvent) {
      // Previous/Favorite/Next/Info are all real, focusable <button>s —
      // if one has keyboard focus, Enter already natively activates it.
      // Without this guard, Enter would ALSO fire advance() here
      // (double-firing: focus Info, press Enter -> detail sheet opens
      // AND the deck silently advances underneath it).
      const target = e.target as HTMLElement | null;
      const isButtonFocused = !!target?.closest("button");
      if (e.key === "ArrowUp") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        retreat();
      } else if (e.key === "Enter" && !isButtonFocused) {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isComplete, showSummary, showDetail, currentIndex, leaving, items]);

  useEffect(() => {
    if (!showSummary && !showDetail) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSummary(false);
        setShowDetail(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSummary, showDetail]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (leaving) return;
    markInteracted();
    if (snapTimeoutRef.current !== null) window.clearTimeout(snapTimeoutRef.current);
    setIsSnapping(false);
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    // Translation directly follows the pointer — no damping, no clamp —
    // in either direction (up toward next, down toward previous).
    setDragY(e.clientY - dragStartYRef.current);
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY < -SWIPE_THRESHOLD) {
      advance();
    } else if (dragY > SWIPE_THRESHOLD && !isFirst) {
      retreat();
    } else {
      // Released short of the threshold — spring back to center.
      setIsSnapping(true);
      setDragY(0);
      snapTimeoutRef.current = window.setTimeout(() => setIsSnapping(false), 340);
    }
  }

  // How far "into" the next card's promotion the live drag has gotten —
  // only while actively dragging upward (toward next). A downward drag
  // (previewing "previous") doesn't touch the behind tile at all, since
  // the previous item isn't it.
  const dragProgress = isDragging && dragY < 0 ? Math.min(1, -dragY / SWIPE_THRESHOLD) : 0;

  const current = items[currentIndex];
  const isCurrentFavorite = current ? favorites.has(current.id) : false;

  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
        <div className="dithar-wa-screen-in flex flex-1 flex-col">
          <BackHeader title={categoryLabel} onBack={onBackToCategories} backLabel={t.back} />

          {!isComplete && (
            <>
              <div className="mt-2 flex flex-col items-center gap-1.5">
                <p
                  aria-hidden="true"
                  className="text-center text-[15px] font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)", letterSpacing: "0.04em" }}
                >
                  {t.progressOf(Math.min(currentIndex + 1, items.length), items.length)}
                </p>
                <span className="sr-only" aria-live="polite">
                  {t.progressAria(Math.min(currentIndex + 1, items.length), items.length)}
                </span>
                <div className="dithar-wa-progress-track w-full max-w-[200px]" aria-hidden="true">
                  <div className="dithar-wa-progress-fill" style={{ width: `${(currentIndex / items.length) * 100}%` }} />
                </div>
              </div>

              <div className="relative mt-2 flex-1">
                {current && (
                  <DominoTile
                    key={current.id}
                    item={current}
                    language={language}
                    dir={dir}
                    labels={t}
                    isActive
                    isBehind={false}
                    transform={`translate(-50%, -50%) translate(0px, ${dragY}px)`}
                    opacity={1}
                    isDragging={isDragging}
                    isSnapping={isSnapping}
                    isEntering={current.id === enteringId}
                    OrnamentIcon={OrnamentIcon}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onAnimationEnd={() => setEnteringId(null)}
                    onOpenDetail={() => setShowDetail(true)}
                  />
                )}

                {nextItem && (
                  <DominoTile
                    key={nextItem.id}
                    item={nextItem}
                    language={language}
                    dir={dir}
                    labels={t}
                    isActive={false}
                    isBehind
                    transform={`translate(-50%, -50%) translate(0px, ${-BEHIND_OFFSET_Y * (1 - dragProgress)}px) scale(${BEHIND_SCALE + (1 - BEHIND_SCALE) * dragProgress})`}
                    opacity={BEHIND_OPACITY + (1 - BEHIND_OPACITY) * dragProgress}
                    isDragging={false}
                    OrnamentIcon={OrnamentIcon}
                  />
                )}

                {leaving && (
                  <div
                    className="dithar-domino-tile-leaving pointer-events-none absolute left-1/2 top-1/2"
                    style={{
                      zIndex: 3,
                      transform: leavingAnimateOut
                        ? "translate(-50%, -50%) translate(0px, -520px) scale(0.96)"
                        : `translate(-50%, -50%) translate(0px, ${leaving.fromY}px)`,
                      opacity: leavingAnimateOut ? 0 : 1,
                      transition: `transform ${LEAVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${LEAVE_MS}ms ease`,
                    }}
                  >
                    <DominoTile
                      item={leaving.item}
                      language={language}
                      dir={dir}
                      labels={t}
                      isActive={false}
                      isBehind={false}
                      transform="translate(0, 0)"
                      opacity={1}
                      isDragging={false}
                      OrnamentIcon={OrnamentIcon}
                    />
                  </div>
                )}

                {!hasInteracted && (
                  <div
                    className="dithar-wa-hint pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"
                    style={{ zIndex: 4 }}
                    aria-hidden="true"
                  >
                    <span
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
                      style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
                    >
                      <ArrowUp size={13} strokeWidth={2} />
                      {t.swipeHint}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={retreat}
                  disabled={isFirst}
                  aria-label={t.previous}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[transform,opacity] active:scale-90"
                  style={{
                    boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)",
                    color: "var(--wa-ink-muted)",
                    opacity: isFirst ? 0.35 : 1,
                  }}
                >
                  <ChevronDown size={18} strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={() => current && toggleFavorite(current.id)}
                  aria-label={isCurrentFavorite ? t.removeFavorite : t.addFavorite}
                  aria-pressed={isCurrentFavorite}
                  className="dithar-wa-favorite-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${isCurrentFavorite ? "var(--wa-gold)" : "var(--wa-gold-hairline)"}`,
                    color: isCurrentFavorite ? "var(--wa-gold)" : "var(--wa-ink-muted)",
                    background: isCurrentFavorite ? "var(--wa-badge-bg)" : "transparent",
                  }}
                >
                  <Heart size={18} strokeWidth={1.8} fill={isCurrentFavorite ? "currentColor" : "none"} />
                </button>

                <button
                  type="button"
                  onClick={advance}
                  aria-label={t.next}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ boxShadow: "inset 0 0 0 1.5px var(--wa-gold)", background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
                >
                  <ChevronUp size={20} strokeWidth={1.8} />
                </button>
              </div>
            </>
          )}

          {isComplete && (
            <div className="dithar-wa-complete-in flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
              <span
                className="dithar-wa-complete-glow flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
              >
                <Check size={30} strokeWidth={2} />
              </span>
              <h2 className="text-[20px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
                {t.completeTitle}
              </h2>
              <p className="text-[14px]" style={{ color: "var(--wa-ink-muted)" }}>
                {t.completeSubtitle(categoryLabel)}
              </p>
              <p
                aria-hidden="true"
                className="text-[13px] font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)", letterSpacing: "0.04em" }}
              >
                {t.progressOf(items.length, items.length)}
              </p>

              <div className="mt-2 flex w-full max-w-[280px] flex-col gap-2">
                <button
                  type="button"
                  onClick={onBackToCategories}
                  className="w-full rounded-full py-2.5 text-[14px] font-bold"
                  style={{ boxShadow: "inset 0 0 0 1.5px var(--wa-gold)", background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
                >
                  {t.backToWrittenAdhkar}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="w-full rounded-full py-2.5 text-[14px] font-medium"
                  style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink)" }}
                >
                  {t.restartCategory}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSummary(true)}
                  className="mt-1 text-[12px] font-medium underline underline-offset-2"
                  style={{ color: "var(--wa-ink-muted)" }}
                >
                  {t.viewSummary}
                </button>
              </div>
            </div>
          )}
        </div>

        <BottomNav
          className="mt-2"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            // Tapping "written" while already deep in a category's reader
            // steps back up to the category list, same as the back button.
            if (key === "written") onBackToCategories();
          }}
        />
      </AppShell>

      {showDetail && current && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
          style={{ background: "rgba(23, 38, 58, 0.4)" }}
          role="presentation"
          onClick={() => setShowDetail(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.details}
            onClick={(e) => e.stopPropagation()}
            className="dithar-wa-sheet-in flex max-h-[80%] w-full max-w-sm flex-col overflow-hidden rounded-2xl"
            style={{
              background: "var(--wa-surface)",
              borderRadius: "var(--wa-card-radius)",
              boxShadow: "0 20px 50px -20px rgba(15, 15, 15, 0.4), inset 0 0 0 1px var(--wa-gold-hairline)",
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--wa-gold-hairline)" }}>
              <h3 className="min-w-0 truncate text-[16px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
                {(language === "ar" ? current.title_ar : current.title_en) ?? t.details}
              </h3>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                aria-label={t.closeDetails}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink-muted)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <p
                dir={dir}
                className="text-[16px] font-bold leading-[1.85]"
                style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
              >
                {language === "ar" ? current.text_ar : current.text_en}
              </p>
              <span className="h-px w-full shrink-0" style={{ background: "var(--wa-gold-hairline)" }} aria-hidden="true" />
              <div className="flex flex-col gap-1.5 text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
                <p>
                  <span style={{ color: "var(--wa-ink)", fontWeight: 600 }}>{t.source}: </span>
                  {language === "ar" ? current.source_ar : current.source_en}
                </p>
                {typeof current.repeat === "number" && <p>{t.repeatTimes(current.repeat)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
          style={{ background: "rgba(23, 38, 58, 0.4)" }}
          role="presentation"
          onClick={() => setShowSummary(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.summaryTitle}
            onClick={(e) => e.stopPropagation()}
            className="dithar-wa-sheet-in flex max-h-[80%] w-full max-w-sm flex-col overflow-hidden rounded-2xl"
            style={{
              background: "var(--wa-surface)",
              borderRadius: "var(--wa-card-radius)",
              boxShadow: "0 20px 50px -20px rgba(15, 15, 15, 0.4), inset 0 0 0 1px var(--wa-gold-hairline)",
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--wa-gold-hairline)" }}>
              <div>
                <h3 className="text-[18px] font-bold" style={{ color: "var(--wa-ink)" }}>
                  {t.summaryTitle}
                </h3>
                <p className="mt-0.5 text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
                  {t.summaryCount(items.length)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                aria-label={t.closeSummary}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink-muted)" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => {
                  const label = (language === "ar" ? item.title_ar : item.title_en) ?? (language === "ar" ? item.text_ar : item.text_en);
                  return (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13px] leading-[1.5]" style={{ color: "var(--wa-ink)" }}>
                        {label}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </DeviceFrame>
  );
}
