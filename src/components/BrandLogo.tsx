import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../theme/LanguageContext";
import { labels } from "../data/content";

// Renders the authoritative DITHAR / دِثار logo artwork exactly as supplied
// — the wordmark is now part of the image asset itself (one of 4 PNGs,
// selected by theme + language in ThemeContext.tsx) and is never
// reproduced as a separate text element anywhere in the UI.
//
// width/height attributes reflect each selected asset's real intrinsic
// pixel size (the 4 PNGs are NOT all the same aspect ratio, since the
// baked-in wordmark differs in shape per identity/language) so the
// browser can reserve the correct aspect ratio before the bytes arrive,
// preventing layout shift.
//
// `alt` is the existing localized app-name string (labels[language].appName)
// — non-empty, since this image is now the ONLY place the app name is
// conveyed at all (there is no more adjacent text label to avoid
// duplicating). This reuses existing label data; it does not introduce
// any new visible text.
const INTRINSIC_SIZE: Record<string, { width: number; height: number }> = {
  men_ar: { width: 480, height: 480 },
  men_en: { width: 400, height: 480 },
  women_ar: { width: 320, height: 480 },
  women_en: { width: 459, height: 480 },
};
//
// Sizing model: two numbers.
// - BUDGET is the flow-footprint reserved for the logo slot in AppShell —
//   unchanged, so growing the logo adds ZERO extra height to the Home
//   Screen composition beyond the small, explicit LogoHeader margin bump
//   made alongside this (14px -> 18px), which IS accounted for in the
//   layout's total height.
// - DISPLAY is the actual (larger) rendered size. Its `marginTop` is the
//   exact negative of (display − budget): it pulls the image's top edge
//   up by exactly the amount it grew, so its BOTTOM edge — and everything
//   below it (featured hadith, both cards, prayer panel, bottom nav) —
//   never moves.
//
// Both now read from --logo-budget/--logo-display (index.css) instead of
// a literal clamp() string — same values as before on a normal/tall
// viewport (the tokens' own default), but trimmed by index.css's short-
// viewport media queries on a shorter phone (Batch 5's responsive Home
// Screen fix), without this component needing to know about that at all.
// Because the marginTop formula below always nets out to exactly BUDGET
// regardless of DISPLAY's value (DISPLAY + marginTop = BUDGET,
// algebraically), this stays correct for WHATEVER the two tokens resolve
// to — growing OR shrinking DISPLAY only ever extends/retracts the image
// from its already-anchored bottom edge; it can never add flow height
// beyond BUDGET.
const BUDGET = "var(--logo-budget)";
const DISPLAY = "var(--logo-display)";

// Extra upward nudge on top of the BUDGET/DISPLAY anchoring above — pulls
// the image a small, fixed amount further up than its BUDGET-anchored
// bottom edge would otherwise sit. Purely additive to marginTop, so
// BUDGET (the reserved flow-footprint) and DISPLAY (the rendered size)
// are both untouched: nothing below the logo shifts, and the logo itself
// doesn't resize — only its position within/above its own slot changes.
const LIFT = "6px";

export function BrandLogo() {
  const { logoSrc, theme } = useTheme();
  const { language } = useLanguage();
  const { width, height } = INTRINSIC_SIZE[`${theme}_${language}`];

  return (
    <img
      src={logoSrc}
      alt={labels[language].appName}
      width={width}
      height={height}
      loading="eager"
      // "async" (rather than "sync") lets the browser present the image
      // the instant it's decoded instead of holding that frame's commit
      // until decode finishes — the fix for the logo visibly trailing the
      // rest of the (image-free, instantly-painted) Home Screen content.
      decoding="async"
      // @ts-expect-error -- fetchpriority is valid HTML but not yet in React's DOM typings
      fetchpriority="high"
      className="mx-auto w-auto max-w-[58%] object-contain"
      style={{ height: DISPLAY, marginTop: `calc(-1 * (${DISPLAY} - ${BUDGET}) - ${LIFT})` }}
      key={`${theme}_${language}`}
    />
  );
}
