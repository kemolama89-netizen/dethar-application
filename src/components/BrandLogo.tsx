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
// DISPLAY uses the SAME `21vw` coefficient as BUDGET, offset by a constant
// `calc(... + 15px)`: because both share breakpoints and slope, the gap
// between them is EXACTLY 15px at every width, not just at a few sampled
// widths — leaving exactly 3px of LogoHeader's 18px top margin as a
// consistent breathing gap below the frame's inner border, at every phone
// size, never touching or crossing it.
const BUDGET = "clamp(78px,21vw,100px)";
const DISPLAY = "clamp(93px,calc(21vw + 15px),115px)";

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
