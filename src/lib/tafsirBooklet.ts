// The Tafsir booklet over the Mushaf (components/basair/TafsirBooklet.tsx): where it sits,
// how its pages are counted, and when its opening verse is shown as an excerpt. Pure
// geometry — no text is ever changed here.
//
//  - Its pages are the Mushaf page's size (TafsirBooklet places and sizes it); a Tafsir that fits
//    one page is one page, as tall as it needs.
//  - Its pages are the columns of one flowing text (CSS multi-column): the browser breaks
//    lines between words only, and Arabic letters join exactly as everywhere else.

/** The tallest booklet the share pages are measured against (sharedPageHeight's floor). */
export const BOOKLET_MAX_HEIGHT = 460;
/** Room kept between the booklet and the screen's edges (px). */
export const BOOKLET_EDGE = 10;
/** A verse taller than this many booklet pages is opened with an excerpt (it is complete in the Mushaf). */
export const VERSE_EXCERPT_PAGES = 1.5;
/** How much of the first page an excerpt may take. */
export const VERSE_EXCERPT_SHARE = 0.55;

/**
 * A shared page's height for a booklet [width] wide: phone-shaped (16:9 portrait), so it reads
 * full-screen when opened — taller than any booklet on screen, at the same type size, so a long
 * Tafsir needs fewer images. Never shorter than the tallest on-screen booklet.
 */
export function sharedPageHeight(width: number): number {
  return Math.max(BOOKLET_MAX_HEIGHT, Math.round((width * 16) / 9));
}

/**
 * The page (column) a piece of text is on: columns run from the right (RTL) — or the left
 * (LTR) — of the first page, [step] apart (page width + gap). [edge] is the text's
 * start-side edge, [firstEdge] the first page's, both untranslated.
 */
export function pageOfText(edge: number, firstEdge: number, step: number, rtl: boolean): number {
  const offset = rtl ? firstEdge - edge : edge - firstEdge;
  return Math.max(0, Math.floor((offset + 1) / step));
}

/** Whether the opening verse is shown as an excerpt: only when it alone would fill more than VERSE_EXCERPT_PAGES pages. */
export function verseNeedsExcerpt(verseHeight: number, pageHeight: number): boolean {
  return pageHeight > 0 && verseHeight > pageHeight * VERSE_EXCERPT_PAGES;
}

/** The longest run of whole words from the start for which [fits] holds (at least one word). */
export function wordsThatFit(words: readonly string[], fits: (count: number) => boolean): number {
  let lo = 1;
  let hi = words.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
