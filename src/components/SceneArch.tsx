import { memo } from "react";

// The prayer-times panel's arch (Home, PrayerTimesPanel "hero"): the active
// look's scene — a photograph of a mosque at golden hour, by the water at
// night, among pines or under a violet dusk (theme/looks.ts --look-arch-scene;
// scripts/prepare-theme-photos.py, credits in public/themes/README.md) — framed by a pointed arch in fine
// gold lines, with the card's own colour in the spandrels and a plain round
// medallion in each. Decorative only (aria-hidden): it shows no direction and
// is no compass. Shading keeps the panel's text readable over the scene.
//
// Drawn in a 100×100 box stretched to the panel (the strokes keep their width:
// non-scaling), so it fits any panel height; the crown sits under the title,
// the arch springs above the prayer times. Its legs run close to the panel's
// edges (2.5% / 97.5%), outside the content's own padding, so the prayer times
// and the switches always sit on the photograph — never half over the light
// spandrel, where their light text would vanish.
const ARCH = "M2.5 100 V46 C2.5 26 33 16 50 8 C67 16 97.5 26 97.5 46 V100";
const SPANDRELS = "M0 0 H100 V100 H97.5 V46 C97.5 26 67 16 50 8 C33 16 2.5 26 2.5 46 V100 H0 Z";
const INNER = "M4.6 100 V47 C4.6 29 34 19 50 12 C66 19 95.4 29 95.4 47 V100";

function SceneArchView() {
  return (
    <div className="dithar-scene-arch" aria-hidden="true" data-scene-arch="">
      <div className="dithar-scene-arch__image" />
      <div className="dithar-scene-arch__shade" />
      <svg className="dithar-scene-arch__frame" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={SPANDRELS} fill="rgba(var(--look-card-rgb), 0.94)" />
        <path d={ARCH} fill="none" stroke="var(--color-gold)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        <path d={INNER} fill="none" stroke="var(--color-gold)" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* A plain medallion in each spandrel (a ring and a dot — no star). */}
      {(["5.5%", "94.5%"] as const).map((left) => (
        <span
          key={left}
          className="absolute h-[11px] w-[11px] -translate-x-1/2 rounded-full"
          style={{ left, top: "16%", boxShadow: "inset 0 0 0 1.4px var(--color-gold)", background: "radial-gradient(circle, var(--color-gold) 0 1.6px, transparent 2.2px)" }}
        />
      ))}
    </div>
  );
}

export const SceneArch = memo(SceneArchView);
