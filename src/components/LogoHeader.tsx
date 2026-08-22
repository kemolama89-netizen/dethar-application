import { BrandLogo } from "./BrandLogo";
import { FeaturedQuote } from "./FeaturedQuote";

export function LogoHeader() {
  return (
    <div className="flex flex-col items-center gap-2">
      <BrandLogo />
      <FeaturedQuote />
    </div>
  );
}
