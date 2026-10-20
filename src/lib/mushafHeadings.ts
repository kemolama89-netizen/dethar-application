// The frame the reader draws BEHIND each surah's printed title
// (components/QuranReaderScreen.tsx, components/MushafSurahFrame.tsx) — the
// page artwork itself is never touched. The artwork already prints every
// surah's title line and its Bismillah, as plain lines of text; only the
// printed Mushaf's ornamental frame around the title is missing, which made
// short surahs (Al-Ikhlas, Al-Falaq, An-Nas on page 604) run together.
//
// The frame follows the opening pages' title panel (public/mushaf/hafs-kfqc-opening):
// a teal band with gold rules around a navy arabesque field, and the title in a
// cream cartouche with pointed ends at its centre. It spans the text block's
// width (the lines run from x ≈ 6 to 336 of the 345-unit page) and is centred
// on its title's ACTUAL ink bounds, measured from the page artwork's own pixels
// (scripts/mushaf/measure-surah-titles.mjs →
// data/quran/kfqc-hafs-1441-surah-titles.json), horizontally and vertically,
// on every page. All frames are the same size: the cartouche fits every title
// with room to spare, and the frame never reaches the line above or the
// Bismillah below (the data records the blank space on both sides; a test
// checks it). Pages 1–2 are the decorated opening pages, whose own panels these
// follow, and get no frame.
import titleData from "../data/quran/kfqc-hafs-1441-surah-titles.json";

/** Every frame's size, in the page's viewBox units: the text block's width; the tallest title is 29. */
export const FRAME_WIDTH = 330;
export const FRAME_HEIGHT = 38;
/** The teal band and its gold rules, inside the frame's edge: the navy field starts this far in. */
export const FRAME_BORDER = 2.4;
/** Half the width of the cartouche's straight top and bottom (the widest title is 87.75), and to its pointed ends. */
export const CARTOUCHE_HALF_WIDTH = 56;
export const CARTOUCHE_TIP = 67;

/** A title's ink box, in its page's viewBox units, and the blank space above and below it. */
export interface SurahTitleInk {
  surah: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  clearAbove: number;
  clearBelow: number;
}

export interface SurahHeadingFrame {
  surah: number;
  /** Top-left corner and size, in the page's viewBox units. */
  x: number;
  y: number;
  width: number;
  height: number;
}

const titles = titleData.titles as Record<string, number[][]>;

/** The measured title ink of every surah that begins on this page. */
export function surahTitleInk(page: number): SurahTitleInk[] {
  return (titles[page] ?? []).map(([surah, x0, y0, x1, y1, clearAbove, clearBelow]) => ({ surah, x0, y0, x1, y1, clearAbove, clearBelow }));
}

/** The frame for each surah title on this page: centred exactly on the title's ink box. */
export function surahHeadingFrames(page: number): SurahHeadingFrame[] {
  return surahTitleInk(page).map(({ surah, x0, y0, x1, y1 }) => ({
    surah,
    x: (x0 + x1) / 2 - FRAME_WIDTH / 2,
    y: (y0 + y1) / 2 - FRAME_HEIGHT / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  }));
}
