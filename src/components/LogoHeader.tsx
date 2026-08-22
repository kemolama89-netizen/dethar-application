import { BrandLogo } from "./BrandLogo";
import { FeaturedQuote } from "./FeaturedQuote";

// Fixed, width-first spacing — not tied to viewport height. Top margin
// bumped slightly (14px -> 18px) specifically to give BrandLogo's
// upward-anchor growth a little more headroom without touching anything
// else in the approved layout. Logo-to-quote gap trimmed slightly
// (4px -> 2px) as a small, localized spacing reclaim to help the always-
// complete Featured Hadith fit without touching the logo or anything else.
export function LogoHeader() {
  return (
    <div className="mt-4.5 flex flex-col items-center gap-0.5">
      <BrandLogo />
      <FeaturedQuote />
    </div>
  );
}
