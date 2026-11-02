import { memo } from "react";

// The prayer panel's niche (Home, PrayerTimesPanel "hero"): the active look's
// scene — a photograph of a mosque at golden hour, by the water at night, among
// pines or under a violet dusk (theme/looks.ts --look-arch-scene;
// scripts/prepare-theme-photos.py, credits in public/themes/README.md) — inside
// a pointed arch in fine gold lines. Decorative only (aria-hidden): it shows no
// direction and is no compass. Shading keeps the text above it readable.
//
// Sized by CSS (index.css .dithar-scene-arch): the crown has a set height,
// --dithar-crown, stretched to the niche's width; the straight legs below take
// whatever height the content needs, so the content never meets the curve at
// any screen size or text size.
const CROWN_OUTER = "M1.6 100 C1.6 55 32 26 50 1.5 C68 26 98.4 55 98.4 100";
const CROWN_INNER = "M3.4 100 C3.4 62 33 34 50 12 C67 34 96.6 62 96.6 100";

function SceneArchView() {
  return (
    <div className="dithar-scene-arch" aria-hidden="true" data-scene-arch="">
      <div className="dithar-scene-arch__clip">
        <div className="dithar-scene-arch__image" />
        <div className="dithar-scene-arch__shade" />
      </div>
      <svg className="dithar-scene-arch__crown" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={CROWN_OUTER} fill="none" stroke="var(--dithar-arch-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={CROWN_INNER} fill="none" stroke="var(--dithar-arch-line)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className="dithar-scene-arch__legs" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M1.6 -2 V100 H98.4 V-2" fill="none" stroke="var(--dithar-arch-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d="M3.4 -2 V100 M96.6 -2 V100" fill="none" stroke="var(--dithar-arch-line)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export const SceneArch = memo(SceneArchView);
