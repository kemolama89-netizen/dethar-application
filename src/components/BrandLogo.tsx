import { useTheme } from "../theme/ThemeContext";

// Renders the authoritative DITHAR / دِثار logo artwork exactly as supplied
// — the wordmark is part of the image asset and is never reproduced as text.
// width/height attributes (matching the optimized asset's real 480x480
// pixel size) let the browser reserve the correct aspect ratio before the
// bytes arrive, preventing layout shift.
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

export function BrandLogo() {
  const { logoSrc, theme } = useTheme();

  return (
    <img
      src={logoSrc}
      alt="دِثار DITHAR"
      width={480}
      height={480}
      loading="eager"
      decoding="sync"
      // @ts-expect-error -- fetchpriority is valid HTML but not yet in React's DOM typings
      fetchpriority="high"
      className="mx-auto w-auto max-w-[58%] object-contain"
      style={{ height: DISPLAY, marginTop: `calc(-1 * (${DISPLAY} - ${BUDGET}))` }}
      key={theme}
    />
  );
}
