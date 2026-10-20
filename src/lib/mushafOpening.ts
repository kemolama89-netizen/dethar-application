// The Mushaf's decorated opening pages (1: Al-Fatiha, 2: the opening of
// Al-Baqarah) — public/mushaf/hafs-kfqc-opening/composed, see its README.md —
// shown instead of quran-svg's plain text block. Each is DITHAR's design
// reference's four-sided frame (its lettering cleared, never shown) with
// quran-svg's own page artwork — title, text and verse markers, unchanged —
// laid into its cartouche and medallion (scripts/mushaf/opening/). The verse
// shapes stay quran-svg's, placed by `shapeTransform`: the text's own transform.
import opening from "../data/quran/kfqc-hafs-1441-opening.json";

export interface OpeningArtwork {
  /** Path under public/. */
  path: string;
  /** The image's own pixel box (where the <image> is laid out). */
  imageBox: string;
  /**
   * The part of the image shown, in image pixels: the whole page, frame edge to
   * frame edge. The page fits this box, centred, at its own proportions, and
   * nothing outside it is drawn.
   */
  displayBox: string;
  /** Places quran-svg's verse shapes (its page coordinates) on this image: the transform its text is drawn with. */
  shapeTransform: string;
}

const pages = opening.pages as Record<string, { image: string; viewBox: string; displayBox: string; shapeTransform: string }>;

export function openingArtwork(page: number): OpeningArtwork | null {
  const art = pages[page];
  return art ? { path: `mushaf/hafs-kfqc-opening/${art.image}`, imageBox: art.viewBox, displayBox: art.displayBox, shapeTransform: art.shapeTransform } : null;
}
