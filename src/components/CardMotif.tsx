import quranInsightMen from "../assets/illustrations/quran-insight-men.png";
import hadithMen from "../assets/illustrations/hadith-men.png";

// The real decorative illustration, extracted as a standalone transparent
// asset from the approved reference designs (ASSETS/dithar-home-*-ar.png —
// those reference files themselves are untouched; see
// src/assets/illustrations/README.md for how these were derived). Same
// slot size/position as before — only the artwork changed.
const ILLUSTRATIONS = {
  quran: quranInsightMen,
  hadith: hadithMen,
} as const;

export function CardMotif({ variant }: { variant: "quran" | "hadith" }) {
  const src = ILLUSTRATIONS[variant];

  return (
    <div className="w-[clamp(76px,24vw,108px)] shrink-0 self-stretch">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="h-full w-full object-contain object-bottom"
      />
    </div>
  );
}
