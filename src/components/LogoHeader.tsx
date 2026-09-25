import { BrandLogo } from "./BrandLogo";
import { FeaturedQuote } from "./FeaturedQuote";

// Top margin reads from --home-header-mt (index.css) — 18px on a
// normal/tall viewport (unchanged from before), trimmed by index.css's
// short-viewport media queries on a shorter phone (Batch 5's responsive
// Home Screen fix).
//
// The app-name text line that used to render here has been removed: the
// wordmark ("دِثار" / "DETHAR") is now baked into the logo PNG itself
// (see ThemeContext.tsx's per-theme/language asset selection), so a
// separate text label would duplicate it.
export function LogoHeader() {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ marginTop: "var(--home-header-mt)" }}>
      <BrandLogo />
      <FeaturedQuote />
    </div>
  );
}
