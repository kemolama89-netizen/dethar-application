import { BrandLogo } from "./BrandLogo";
import { FeaturedQuote } from "./FeaturedQuote";

// Fixed, width-first spacing — not tied to viewport height. Top margin
// bumped slightly (14px -> 18px) specifically to give BrandLogo's
// upward-anchor growth a little more headroom without touching anything
// else in the approved layout.
//
// The app-name text line that used to render here has been removed: the
// wordmark ("دِثار" / "DETHAR") is now baked into the logo PNG itself
// (see ThemeContext.tsx's per-theme/language asset selection), so a
// separate text label would duplicate it.
export function LogoHeader() {
  return (
    <div className="mt-4.5 flex flex-col items-center gap-0.5">
      <BrandLogo />
      <FeaturedQuote />
    </div>
  );
}
