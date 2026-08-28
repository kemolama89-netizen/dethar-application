import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLanguage } from "../theme/LanguageContext";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { navLabels } from "../data/content";
import { dhikrItems, sourceAr, tasbeehLabels } from "../data/tasbeeh";
import { recordTasbeehRepetition } from "../lib/stats";
import { loadTasbeehCounters, saveTasbeehCounters } from "../lib/tasbeehCounters";
import { computeTasbeehReadyDurationMs } from "../lib/tasbeehTiming";
import { usePrefersReducedMotion } from "../lib/motion";

interface TasbeehScreenProps {
  onNavigateHome: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
}

interface Bubble {
  id: number;
  text: string;
  drift: number;
  rotate: number;
  size: number;
}

type ConfettiShape = "bar" | "spark" | "petal";

interface ConfettiPiece {
  id: number;
  ux: number;
  uy: number;
  cx: number;
  cy: number;
  rot: number;
  gold: boolean;
  shape: ConfettiShape;
}

const MAX_VISIBLE_BUBBLES = 8;
const BUBBLE_LIFETIME_MS = 4800; // must match the CSS animation duration below

// Calm-counting pacing ring geometry — a viewBox-relative circle (r=47 of
// a 0-100 viewBox) so the ring scales fluidly with the main circle's own
// responsive clamp() size without any JS measurement.
const TASBEEH_RING_RADIUS = 47;
const TASBEEH_RING_CIRCUMFERENCE = 2 * Math.PI * TASBEEH_RING_RADIUS;

const CONFETTI_COUNT = 28;
const CONFETTI_LIFETIME_MS = 2300; // must match the CSS animation duration below

// Vite statically replaces `import.meta.env.DEV` with a literal
// true/false and dead-code-eliminates the losing branch at build time, so
// none of the diagnostic logging below — or its console output — exists
// in the production bundle. It is purely a development aid for debugging
// real-device behavior; there is no visible UI change of any kind.
const isDevBuild = import.meta.env.DEV;

// One subtle pulse per successful tap in production. 20ms turned out to be
// inconsistent on the physical test device (borderline-short requests were
// not reliably felt); tuned up into the 25–30ms range typical Android
// vibration motors render more reliably, while staying a short/subtle
// pulse rather than a strong buzz.
const TAP_VIBRATION_MS = 28;

// Haptic-ONLY pacing guard. Root cause of the reported "inconsistent
// between consecutive taps": per the Vibration API spec, calling
// navigator.vibrate() again CANCELS whatever pulse is currently running
// and starts the new one immediately — so on fast repeated taps, each new
// request was stomping the previous pulse before the motor had physically
// finished (or even really started) it, which reads as random/inconsistent
// strength. This throttles how often a vibrate() call is actually ISSUED —
// it never touches handleTap's count/bubble/target logic below, which run
// unconditionally on every tap no matter what this guard decides. A tap
// that arrives too soon after the last actual vibration simply has no
// haptic that time; the counter still increments normally.
const HAPTIC_MIN_INTERVAL_MS = 80;
let lastHapticAt = -Infinity;

// Very short, subtle confirmation buzz for a successful tap. Called
// synchronously from the button's onClick (see handleTap) — i.e. directly
// inside the same user-gesture call stack that increments the counter, not
// from a timeout/effect/animation/state-change callback — which is what
// real "user activation" for the Vibration API requires.
//
// KNOWN PLATFORM LIMITATION: iOS/iPadOS Safari — and every other browser
// on iOS, since Apple requires them all to use WebKit, Chrome/Firefox for
// iOS included — has never implemented the Vibration API at all. If this
// is tested on an iPhone/iPad, `"vibrate" in navigator` itself is false
// and no vibration can occur no matter what this function does; that is
// Apple's own platform limitation, not a bug in this code. Android
// Chrome/Firefox/Samsung Internet do implement it.
function triggerTapHaptic() {
  const now = Date.now();
  if (now - lastHapticAt < HAPTIC_MIN_INTERVAL_MS) {
    if (isDevBuild) {
      console.log("[dithar:haptic] tap — skipped by haptic-only pacing guard", {
        msSinceLastHaptic: now - lastHapticAt,
      });
    }
    return;
  }

  const hasVibrateProp = "vibrate" in navigator;
  const vibrateIsFunction = typeof navigator.vibrate === "function";
  const diagnostics = isDevBuild
    ? {
        vibrateInNavigator: hasVibrateProp,
        vibrateIsFunction,
        isSecureContext: typeof window !== "undefined" ? window.isSecureContext : undefined,
        maxTouchPoints: navigator.maxTouchPoints,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        durationMs: TAP_VIBRATION_MS,
      }
    : null;

  try {
    if (hasVibrateProp && vibrateIsFunction) {
      lastHapticAt = now;
      const vibrateReturned = navigator.vibrate(TAP_VIBRATION_MS);
      if (isDevBuild) {
        console.log("[dithar:haptic] tap", { ...diagnostics, vibrateReturned });
      }
    } else if (isDevBuild) {
      console.log("[dithar:haptic] tap — Vibration API not available on this device/browser", diagnostics);
    }
  } catch (error) {
    if (isDevBuild) {
      console.log("[dithar:haptic] tap — navigator.vibrate threw", { ...diagnostics, error });
    }
    // Vibration is a nice-to-have only — counting must never depend on it.
  }
}

// Graduated Dhikr font size inside the main circle. This library's items
// range from ~11 to ~161 characters (verified against
// src/data/tasbeeh-library.json) — a single fixed size either wastes
// space on short items or overflows on long ones, so the size steps down
// as length grows. Ordinary responsive typography, not a fit "hack". The
// longest tier is a touch tighter than before to leave headroom now that
// the circle itself is moderately smaller.
function dhikrTextClass(length: number) {
  if (length > 110) return "text-[10px] font-bold leading-[1.45]";
  if (length > 70) return "text-[12px] font-bold leading-[1.5]";
  if (length > 45) return "text-[14px] font-bold leading-[1.5]";
  return "text-[18px] font-bold leading-[1.5]";
}

// Same idea for the much smaller floating bubbles — text must stay small
// enough that even the library's longest item (161 chars) never forces
// the bubble to grow; the bubble's own line-clamp (in the JSX) truncates
// gracefully rather than ever stretching the circle out of shape.
function bubbleTextClass(length: number) {
  if (length > 90) return "text-[8px] leading-[1.15]";
  if (length > 45) return "text-[9px] leading-[1.2]";
  return "text-[10px] leading-[1.25]";
}

// Independent screen — its own DeviceFrame/AppShell instance, reusing
// existing theme tokens/TopBar/BottomNav unmodified, same as before. All
// Dhikr text/virtue/source below comes verbatim from
// src/data/tasbeeh-library.json (an untouched copy of the supplied
// asset) — nothing here invents, edits, or "corrects" any of it.
//
// Per-dhikr state: `counts`/`targets` are keyed by dhikr id, so switching
// the selected dhikr never touches another item's count or target, and
// Reset only zeroes the currently selected one. Still plain local
// component state (a couple of Records), not a new global store — `counts`
// is just seeded from, and written back to, localStorage on every change
// (see src/lib/tasbeehCounters.ts) so it survives this component
// unmounting on navigation; `targetInputs`/`celebratedFor` remain
// session-only exactly as before.
export function TasbeehScreen({ onNavigateHome, onNavigateToWritten, onNavigateToSettings }: TasbeehScreenProps) {
  const { language } = useLanguage();
  const t = tasbeehLabels[language];
  const nav = navLabels[language];

  const [selectedId, setSelectedId] = useState<number>(dhikrItems[0]?.id ?? 1);
  // Lazily seeded from localStorage on mount (see src/lib/tasbeehCounters.ts)
  // — the lazy-initializer form runs loadTasbeehCounters() exactly once,
  // the moment this component mounts, so switching Tasbeeh Dhikr, leaving
  // and returning to this screen, or any other navigation that unmounts
  // and remounts it always picks the persisted counts back up rather than
  // starting over at {}.
  const [counts, setCounts] = useState<Record<number, number>>(() => loadTasbeehCounters());
  const [targetInputs, setTargetInputs] = useState<Record<number, string>>({});
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleIdRef = useRef(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const confettiIdRef = useRef(0);
  // Per-dhikr: the target value (if any) that celebration has already fired
  // for, so it triggers exactly once per target reach — not on every tap
  // past it — and can fire again after Reset or after the target changes.
  const [celebratedFor, setCelebratedFor] = useState<Record<number, number>>({});

  const selected = dhikrItems.find((d) => d.id === selectedId) ?? dhikrItems[0];
  const count = counts[selectedId] ?? 0;
  const targetInput = targetInputs[selectedId] ?? "";
  const targetNum = /^[1-9]\d*$/.test(targetInput) ? Number(targetInput) : null;
  const justReached = targetNum !== null && count === targetNum;

  // Calm-counting pacing ring — a SEPARATE, word-count-based timing model
  // from the Written Adhkar reader's (see src/lib/tasbeehTiming.ts). "ready"
  // means the next tap is accepted; "pacing" means a successful count was
  // just registered and the ring is running — any tap while pacing is
  // silently ignored (no count, no haptic, no Statistics record). This gate
  // is mandatory and has no user-facing bypass/disable control by design.
  const reducedMotion = usePrefersReducedMotion();
  const readyDurationMs = useMemo(() => computeTasbeehReadyDurationMs(selected?.dhikr_ar ?? ""), [selected?.dhikr_ar]);
  const [pacingPhase, setPacingPhase] = useState<"ready" | "pacing">("ready");
  // 0..1 — recomputed every animation frame from real elapsed time (see the
  // effect below), never from a CSS transition: a CSS-eased sweep would
  // visually reach "looks full" well before the real duration elapses,
  // exactly the mismatch already fixed the same way in the Written Adhkar
  // reader's RepetitionRing. This is the one authoritative timing source.
  const [pacingFraction, setPacingFraction] = useState(0);

  // Switching Dhikr always presents a fresh, immediately-ready circle —
  // pacing is per-current-interaction, never carried over from a
  // different Dhikr's in-progress ring.
  useEffect(() => {
    setPacingPhase("ready");
    setPacingFraction(0);
  }, [selectedId]);

  // Arms the pacing timer/ring ONLY while "pacing" — i.e. only right after
  // a successful count — never on mount, never independently of a count.
  useEffect(() => {
    if (pacingPhase !== "pacing") return;

    if (reducedMotion) {
      const timer = window.setTimeout(() => setPacingPhase("ready"), readyDurationMs);
      return () => window.clearTimeout(timer);
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - start) / readyDurationMs);
      setPacingFraction(fraction);
      if (fraction >= 1) {
        setPacingPhase("ready");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pacingPhase, readyDurationMs, reducedMotion]);

  if (!selected) {
    // Defensive only — dhikrItems is always populated from the supplied
    // library; this can't happen in practice.
    return null;
  }

  function spawnCelebration() {
    const pieces: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, () => {
      // Upward-biased but full spread — up, diagonal, and sideways — around
      // the circle, framing it rather than covering the whole screen.
      // Particles START right at the glass circle's own edge (--ux/--uy is
      // a unit vector combined in CSS with --tasbeeh-circle-radius, which
      // mirrors the button's own responsive clamp() size) and travel OUT
      // to (cx, cy) — comfortably beyond that edge at every viewport width
      // — so the burst always reads as framing the sphere from outside it,
      // never as hidden behind it.
      const angleDeg = -90 + (Math.random() * 200 - 100);
      const dist = 100 + Math.random() * 90;
      const rad = (angleDeg * Math.PI) / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      const shapeRoll = Math.random();
      const shape: ConfettiShape = shapeRoll > 0.65 ? "petal" : shapeRoll > 0.4 ? "spark" : "bar";
      return {
        id: confettiIdRef.current++,
        ux,
        uy,
        cx: Math.round(ux * dist),
        cy: Math.round(uy * dist),
        rot: Math.round(Math.random() * 240 - 120),
        gold: Math.random() > 0.4,
        shape,
      };
    });
    setConfetti((prev) => [...prev, ...pieces]);
    const ids = new Set(pieces.map((p) => p.id));
    setTimeout(() => {
      setConfetti((prev) => prev.filter((p) => !ids.has(p.id)));
    }, CONFETTI_LIFETIME_MS);
  }

  function handleTap() {
    // Calm-counting pacing gate: a tap while the ring hasn't reached READY
    // is silently ignored — no count, no haptic, no bubble, no Statistics
    // record. "No warning" per spec — it simply does nothing. Mandatory,
    // with no user-facing bypass/disable control.
    if (pacingPhase !== "ready") return;

    const nextCount = (counts[selectedId] ?? 0) + 1;
    const updatedCounts = { ...counts, [selectedId]: nextCount };
    setCounts(updatedCounts);
    // Persisted synchronously (not from an effect) so a count is never at
    // risk of being lost to a same-tick navigation away from this screen —
    // by the time this function returns, localStorage already reflects it.
    saveTasbeehCounters(updatedCounts);
    triggerTapHaptic();
    recordTasbeehRepetition(selectedId);

    const id = bubbleIdRef.current++;
    const drift = Math.round(Math.random() * 48 - 24); // px, natural sideways variation
    const rotate = Math.round(Math.random() * 16 - 8); // deg, subtle tilt
    const size = Math.round(52 + Math.random() * 20); // px, subtle size variation between bubbles
    setBubbles((prev) => [...prev.slice(-(MAX_VISIBLE_BUBBLES - 1)), { id, text: selected!.dhikr_ar, drift, rotate, size }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, BUBBLE_LIFETIME_MS);

    // One-time celebration: fires only on the exact tap that brings the
    // count to the target, not on every subsequent tap past it.
    if (targetNum !== null && nextCount === targetNum && celebratedFor[selectedId] !== targetNum) {
      setCelebratedFor((prev) => ({ ...prev, [selectedId]: targetNum }));
      spawnCelebration();
    }

    // The count just registered — start the pacing ring for the NEXT one.
    setPacingFraction(0);
    setPacingPhase("pacing");
  }

  function handleReset() {
    const updatedCounts = { ...counts, [selectedId]: 0 };
    setCounts(updatedCounts);
    // RESET COUNTER ≠ DELETE STATISTICS: this only ever touches the
    // persistent counter store (tasbeehCounters.ts) for the CURRENTLY
    // selected Dhikr — it never imports or calls anything from
    // src/lib/stats.ts, so previously recorded Statistics history for this
    // (or any other) Dhikr is completely untouched by pressing Reset.
    saveTasbeehCounters(updatedCounts);
    // Allows the same target to celebrate again after a reset.
    setCelebratedFor((prev) => {
      if (!(selectedId in prev)) return prev;
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
    // Resets THIS Dhikr's own pacing cycle back to immediately ready —
    // never "the timing system globally" (the tiers/rates in
    // tasbeehTiming.ts are untouched); the user shouldn't be left waiting
    // out a stale ring for a counter they just zeroed.
    setPacingPhase("ready");
    setPacingFraction(0);
  }

  function handleTargetChange(value: string) {
    // Digits only, so an invalid value can never break the counter/target
    // logic — parsing above already treats anything non-matching as "no
    // target" rather than throwing.
    if (value === "" || /^\d*$/.test(value)) {
      setTargetInputs((prev) => ({ ...prev, [selectedId]: value }));
      // A changed target gets its own fresh chance to celebrate.
      setCelebratedFor((prev) => {
        if (!(selectedId in prev)) return prev;
        const next = { ...prev };
        delete next[selectedId];
        return next;
      });
    }
  }

  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />

        {/* Quiet spiritual reminder — a small decorative card using the
            same translucent-ivory/gold-edge glass tokens as the Tasbeeh
            circle/bubbles, so it visually belongs to this screen. No icon,
            no heavy border, no dark fill; text wraps naturally (no
            truncation/nowrap/hard-coded break — the exact wording is
            untouched) and stays visually lighter/smaller than the title
            below it. `max-w-[240px]` + `mx-auto` narrows the card itself
            (rather than spanning the full screen width) just enough that
            both the approved Arabic and English sentences wrap into two
            balanced lines at their natural word boundaries, instead of
            one long line. */}
        <div
          className="mx-auto mt-1 max-w-[240px] rounded-xl border px-3 py-2 text-center"
          style={{
            borderColor: "var(--color-glass-edge)",
            background: "var(--color-glass-tint-soft)",
            boxShadow: "0 4px 10px -6px rgba(var(--color-shadow-rgb), 0.18)",
          }}
        >
          <p className="text-[11px] italic leading-[1.5]" style={{ color: "var(--color-text-muted)" }}>
            {t.reminder}
          </p>
        </div>

        <h1 className="mt-1 text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {nav.tasbih}
        </h1>

        {/* Dhikr selector — intentionally horizontally scrollable; 16 items
            today, architected to grow without any screen changes. */}
        <div className="mt-1.5 -mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {dhikrItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={isSelected}
                  // This button's text (`item.dhikr_ar`) is ALWAYS Arabic,
                  // regardless of interface language — but `dir` is set on
                  // <html> from the INTERFACE language (see
                  // LanguageContext.tsx), so in English mode the ambient
                  // direction is "ltr" here unless overridden. Without this,
                  // the `truncate` class's ellipsis (below) anchors/clips
                  // against that inherited ltr direction while the text
                  // itself is RTL, so a long Dhikr shows its LAST words with
                  // the ellipsis, not its first — this explicit `dir="rtl"`
                  // is what fixes that, matching the content's actual
                  // script rather than the current UI language.
                  dir="rtl"
                  className="max-w-[150px] shrink-0 truncate rounded-full border px-3 py-1.5 text-[13px] font-medium"
                  style={{
                    fontFamily: "var(--font-display)",
                    borderColor: isSelected ? "var(--color-gold)" : "var(--color-gold-soft)",
                    background: isSelected ? "var(--color-primary)" : "var(--color-surface)",
                    color: isSelected ? "var(--color-gold)" : "var(--color-text-primary)",
                  }}
                >
                  {item.dhikr_ar}
                </button>
              );
            })}
          </div>
        </div>

        {language === "en" && (
          <div className="mt-1.5 text-center">
            <p className="text-[12px] italic" style={{ color: "var(--color-text-muted)" }}>
              {selected.transliteration_en}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {t.meaning}: {selected.dhikr_en}
            </p>
          </div>
        )}

        {/* Virtue moved above the circle (was below it) — all other
            informational content (selector, meaning/pronunciation, virtue)
            now precedes the circle, per the requested vertical order.
            Some dhikr items intentionally carry no virtue (virtue_ar and
            virtue_en both "") when no sufficiently authentic source could
            be established — the whole card is omitted for those rather
            than showing an empty label. */}
        {selected.virtue_ar !== "" && selected.virtue_en !== "" && (
          <div
            className="mt-1.5 rounded-2xl border p-3"
            style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
          >
            <p className="text-[11px] font-bold" style={{ color: "var(--color-gold)" }}>
              {t.virtueLabel}
            </p>
            <p className="mt-1 text-[13px] leading-[1.6]" style={{ color: "var(--color-text-primary)" }}>
              {language === "ar" ? selected.virtue_ar : selected.virtue_en}
            </p>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {t.sourceLabel}: {language === "ar" ? sourceAr[selected.id] : selected.source}
            </p>
          </div>
        )}

        {/* Open bubble stage — sized by flexbox to whatever vertical room is
            available (shrinks toward 0 on a short viewport rather than
            causing overflow), pushing the circle/target/reset group down
            into a lower, easier one-handed-thumb reach. `overflow-hidden`
            makes this the bubbles' dedicated animation region: each bubble
            animates its `bottom` as a PERCENTAGE of this region's own
            height (see .dithar-bubble-float in index.css), so on any
            viewport a bubble is guaranteed to fade out and be clipped
            before it can ever reach the Dhikr selector/virtue content
            above — never a fixed px distance that could overshoot on a
            short screen. Absolutely-positioned children never affect this
            div's own flex-computed height, so this cannot cause scroll. */}
        <div className="relative flex-1 overflow-hidden">
          {bubbles.map((b) => (
            <span
              key={b.id}
              className="dithar-bubble-glass pointer-events-none flex items-center justify-center overflow-hidden rounded-full"
              style={
                {
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  "--drift": `${b.drift}px`,
                  "--bubble-rotate": `${b.rotate}deg`,
                } as CSSProperties
              }
            >
              <span
                className={`line-clamp-3 px-1.5 text-center font-medium ${bubbleTextClass(b.text.length)}`}
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
              >
                {b.text}
              </span>
            </span>
          ))}
        </div>

        <div className="relative mt-2 flex justify-center">
          {/* Confetti celebration layer — centered on the circle, fires once
              per target reach (see spawnCelebration). Independent from and
              additional to the normal Dhikr bubbles above, never replaces
              them. pointer-events-none so it can never block tapping. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {confetti.map((p) => {
              const shapeClass =
                p.shape === "spark"
                  ? "dithar-confetti--spark h-[7px] w-[7px] rounded-full"
                  : p.shape === "petal"
                    ? "dithar-confetti--petal h-[10px] w-[16px]"
                    : "h-[7px] w-[11px] rounded-[2px]";
              return (
                <span
                  key={p.id}
                  className={`dithar-confetti absolute ${shapeClass}`}
                  style={
                    {
                      background: p.gold ? "var(--color-gold)" : "var(--color-primary-contrast)",
                      "--ux": `${p.ux}`,
                      "--uy": `${p.uy}`,
                      "--cx": `${p.cx}px`,
                      "--cy": `${p.cy}px`,
                      "--crot": `${p.rot}deg`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>

          {/* Main Tasbeeh control — a true glass/translucent CRYSTAL BUBBLE
              rather than a solid button: a light, low-alpha ivory fill (not
              a colored fill), soft white highlight, delicate champagne/gold
              rim, and a whisper of the theme's own primary color as a low-
              alpha accent stop so Men/Women keep a subtle identity. Same
              tokens (--color-glass-*) as the floating bubbles, so the two
              read as one visual family. Text is dark-on-light accordingly. */}
          <button
            type="button"
            onClick={handleTap}
            aria-label={t.incrementAria}
            className="relative flex flex-col items-center justify-center gap-1.5 rounded-full border-2 px-6 py-3 text-center backdrop-blur-sm transition-transform active:scale-[0.98]"
            style={{
              width: "clamp(152px, 42vw, 180px)",
              height: "clamp(152px, 42vw, 180px)",
              borderColor: justReached ? "var(--color-gold)" : "var(--color-glass-edge)",
              background:
                "radial-gradient(circle at 30% 22%, var(--color-glass-highlight), transparent 45%), " +
                "radial-gradient(circle at 72% 82%, var(--color-glass-edge), transparent 60%), " +
                "radial-gradient(circle at 50% 100%, var(--color-glass-accent), transparent 70%), " +
                "var(--color-glass-tint)",
              boxShadow:
                "0 18px 34px -18px rgba(var(--color-shadow-rgb), 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.55), inset 0 -12px 22px -16px rgba(var(--color-shadow-rgb), 0.07)",
            }}
          >
            {/* Calm-counting pacing ring — only present while the NEXT tap
                is gated (pacingPhase === "pacing"); it disappears entirely
                once ready, leaving the plain glass circle with no lingering
                indicator. viewBox-relative sizing (not fixed pixels) so it
                scales fluidly with the circle's own responsive clamp()
                size. No CSS transition on the arc itself — `pacingFraction`
                is already recomputed every animation frame from real
                elapsed time, so this is the one authoritative visual, never
                a separately-timed sweep that could look "done" early. */}
            {pacingPhase === "pacing" && (
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-glass-edge)" strokeWidth="2.5" />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={TASBEEH_RING_CIRCUMFERENCE}
                  strokeDashoffset={TASBEEH_RING_CIRCUMFERENCE * (1 - (reducedMotion ? 0 : pacingFraction))}
                />
              </svg>
            )}
            <span
              className={dhikrTextClass(selected.dhikr_ar.length)}
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              {selected.dhikr_ar}
            </span>
            <span
              aria-live="polite"
              className="text-[36px] font-bold leading-none"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-gold)",
                textShadow: "0 0 10px rgba(var(--color-gold-rgb), 0.3)",
              }}
            >
              {count}
            </span>
          </button>
        </div>

        {justReached && (
          <p className="mt-1 text-center text-[13px] font-medium" style={{ color: "var(--color-gold)" }}>
            {t.targetReached}
          </p>
        )}

        <div className="mt-2 flex items-center justify-center gap-2">
          <label className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            {t.target}
            <input
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={(e) => handleTargetChange(e.target.value)}
              placeholder={t.targetPlaceholder}
              aria-label={t.target}
              className="w-16 rounded-full border px-2 py-1 text-center text-[13px]"
              style={{
                borderColor: "var(--color-gold-soft)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleReset}
            aria-label={t.resetAria}
            className="rounded-full border px-5 py-1.5 text-[13px] font-medium"
            style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}
          >
            {t.reset}
          </button>
        </div>

        <BottomNav
          className="mt-2"
          activeKey="tasbih"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "written") onNavigateToWritten();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
