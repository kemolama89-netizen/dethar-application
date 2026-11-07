import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../theme/LanguageContext";
import { onboardingLabels } from "../data/onboardingLabels";
import type { TourStepId } from "../data/onboardingLabels";
import { useBackDismiss } from "../lib/backOverlays";

/**
 * The first-time tour («العتبة»): seven short steps on Home, each lighting ONE real control — the prayer
 * switches, «مختارات اليوم», then the Adhkar, Tasbeeh, Mushaf and Settings tabs, and a last word on where
 * everything else is (Settings → «جولة داخل التطبيق») — with a short note
 * beside it. It never navigates and never presses anything (the page beneath can't be tapped while it
 * shows); a step whose control isn't on screen is left out. Each section's deeper guidance is a one-line
 * hint on its first visit (FirstVisitHint), never laid over Qur'an or adhkar text.
 *
 * Layered below anything a notification opens (the reminder card, Basa'ir, the launch intro), so a tap
 * on a notification always shows above it. Android Back skips it.
 */
/** A step lights one control — or, for the prayer times, the times row with its two switches as one area. */
const STEPS: { id: TourStepId; target: string; with?: string }[] = [
  { id: "prayer", target: "[data-toggles-row]", with: "[data-prayer-times]" },
  { id: "picks", target: "[data-home-daily-picks]" },
  { id: "adhkar", target: "[data-tour-tab='adhkar']" },
  { id: "tasbeeh", target: "[data-tour-tab='tasbih']" },
  { id: "quran", target: "[data-tour-tab='quran']" },
  { id: "settings", target: "[data-tour-tab='settings']" },
  // The last word: everything else — the film, the feature guide, this tour — is in Settings → «جولة داخل التطبيق».
  { id: "explore", target: "[data-tour-tab='settings']" },
];

const GUTTER = 16;
const RING_PAD = 6;
const STEM = 12;

/** The first matching element that is actually laid out on screen (some markers exist in two layouts). */
function findTarget(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type Box = { top: number; left: number; width: number; height: number };

export function OnboardingTour({ onClose }: { onClose: (how: "finished" | "skipped") => void }) {
  const { language, dir } = useLanguage();
  const t = onboardingLabels[language];
  // Only the steps whose control is on screen now — never a highlight pointing at nothing.
  const steps = useMemo(() => STEPS.filter((s) => findTarget(s.target) !== null), []);
  const [index, setIndex] = useState(0);
  const [ring, setRing] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number; below: boolean; stemX: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const skip = useCallback(() => onClose("skipped"), [onClose]);
  useBackDismiss(true, skip);

  // Nothing to point at (an unusual layout): end quietly rather than show an empty tour.
  useEffect(() => {
    if (steps.length === 0) onClose("skipped");
  }, [steps.length, onClose]);

  // Where the lit control is — and where the note goes: below it if there is room, else above it.
  const place = useCallback(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) return;
    const own = el.getBoundingClientRect();
    const extra = step.with ? findTarget(step.with)?.getBoundingClientRect() : undefined;
    const r = extra
      ? { top: Math.min(own.top, extra.top), left: Math.min(own.left, extra.left), right: Math.max(own.right, extra.right), bottom: Math.max(own.bottom, extra.bottom), width: 0, height: 0 }
      : { top: own.top, left: own.left, right: own.right, bottom: own.bottom, width: own.width, height: own.height };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const box = { top: r.top - RING_PAD, left: r.left - RING_PAD, width: r.width + RING_PAD * 2, height: r.height + RING_PAD * 2 };
    setRing(box);
    const ch = cardRef.current?.offsetHeight ?? 190;
    const cw = cardRef.current?.offsetWidth ?? Math.min(340, vw - GUTTER * 2);
    const spaceBelow = vh - (box.top + box.height);
    const need = ch + STEM + GUTTER;
    // Below when it fits; else above when that fits; else whichever side has more room.
    const below = spaceBelow >= need ? true : box.top >= need ? false : spaceBelow >= box.top;
    const top = below ? box.top + box.height + STEM : box.top - STEM - ch;
    const centre = box.left + box.width / 2;
    // Always centred with the same side margins; only the stem points at the target.
    const left = Math.max(GUTTER, (vw - cw) / 2);
    setCard({ top: Math.max(GUTTER, Math.min(top, vh - ch - GUTTER)), left, below, stemX: Math.min(Math.max(centre - left, 24), cw - 24) });
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    // Off screen (a short phone): brought into view first — the page scrolls, nothing is pressed.
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView?.({ block: "center" });
    }
    place();
    // Again once the note's own size is known.
    const frame = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(frame);
  }, [step, place, language]);

  useEffect(() => {
    const again = () => window.requestAnimationFrame(place);
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, true);
    return () => {
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, true);
    };
  }, [place]);

  // Focus follows the step, for keyboards and screen readers.
  useEffect(() => primaryRef.current?.focus({ preventScroll: true }), [index]);

  if (!step) return null;
  const copy = t.steps[step.id];
  return (
    <div className="dithar-tour fixed inset-0 z-[70]" dir={dir} data-onboarding-tour={step.id}>
      {/* Blocks taps on the app while the tour shows: the tour points, it never presses. */}
      <div className="absolute inset-0" aria-hidden="true" onClick={(e) => e.stopPropagation()} />
      {ring && (
        <div
          className="dithar-tour__ring pointer-events-none absolute"
          style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }}
          aria-hidden="true"
          data-onboarding-ring=""
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialog}
        aria-describedby="dithar-tour-body"
        className="dithar-tour__card absolute"
        style={{ top: card?.top ?? -9999, left: card?.left ?? 0, visibility: card ? "visible" : "hidden" }}
        data-onboarding-card=""
      >
        <span
          className="dithar-tour__stem"
          aria-hidden="true"
          style={{ [card?.below ? "top" : "bottom"]: -STEM, left: (card?.stemX ?? 24) - 0.5, height: STEM }}
        />
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="dithar-tour__title" data-onboarding-title="">
            {copy.title}
          </h2>
          <span className="dithar-tour__count" dir="ltr" data-onboarding-count="">
            {t.step(index + 1, steps.length)}
          </span>
        </div>
        <p id="dithar-tour-body" className="dithar-tour__body" aria-live="polite">
          {copy.body}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button ref={primaryRef} type="button" className="dithar-tour__primary" onClick={() => (last ? onClose("finished") : setIndex(index + 1))} data-onboarding-next="">
            {last ? t.finish : t.next}
          </button>
          {index > 0 && (
            <button type="button" className="dithar-tour__secondary" onClick={() => setIndex(index - 1)} data-onboarding-back="">
              {t.back}
            </button>
          )}
          <span className="flex-1" />
          {!last && (
            <button type="button" className="dithar-tour__skip" onClick={skip} data-onboarding-skip="">
              {t.skip}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
