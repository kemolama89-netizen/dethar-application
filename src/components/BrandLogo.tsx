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
// DISPLAY is exactly 1.2x the prior DISPLAY clamp at every width (93->111.6,
// 115->138, and the shared 21vw coefficient scaled to 25.2vw + 18px) — a
// uniform ~20% size increase. Because the marginTop formula below always
// nets out to exactly BUDGET regardless of DISPLAY's value (DISPLAY +
// marginTop = BUDGET, algebraically), growing DISPLAY only ever extends the
// image upward from its already-anchored bottom edge — it can never add
// flow height. That's also what supplies the requested "move it up" as a
// pure side effect of the size increase, with no separate offset needed.
const BUDGET = "clamp(78px,21vw,100px)";
const DISPLAY = "clamp(111.6px,calc(25.2vw + 18px),138px)";

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
