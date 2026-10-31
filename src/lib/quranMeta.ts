// Qur'an metadata. From Tanzil (src/data/quran/tanzil-quran-metadata.txt,
// stored verbatim — see src/data/quran/README.md): each surah's verse count,
// Tanzil's transliterated and English names, and the juz starts. Small and
// text-free, so the Home screen's "continue reading" card can use it without
// loading the Qur'an text itself (src/lib/quranText.ts, loaded only with the reader).
//
// The PAGES are the reader's own: the King Fahd Complex's 1441H Madinah
// Mushaf, whose page images the reader shows (public/mushaf/hafs-kfqc — see
// its README.md). Their first verses come from that edition's page data
// (src/data/quran/kfqc-hafs-1441-pages.json, written by
// scripts/mushaf/import-quran-svg.mjs). Tanzil's page starts are of the older
// print, which breaks 25 pages differently; they are kept (TANZIL_PAGE_STARTS)
// only for the data checks.
//
// Arabic surah names shown in the app come from src/data/quranSurahs.ts
// (the app's own spelling, used everywhere else); the verse counts there and
// here are checked to be identical (src/lib/quranText.test.ts).
import metadataRaw from "../data/quran/tanzil-quran-metadata.txt?raw";
import { SURAHS } from "../data/quranSurahs";
import mushafPages from "../data/quran/kfqc-hafs-1441-pages.json";
import quarterMarks from "../data/quran/kfqc-hafs-1441-quarter-marks.json";

export interface SurahMeta {
  number: number;
  ayahCount: number;
  nameAr: string;
  /** Tanzil's transliteration, e.g. "Al-Baqara". */
  nameTranslit: string;
  nameEn: string;
  type: "Meccan" | "Medinan";
}

function parseSurahs(raw: string): SurahMeta[] {
  const block = raw.match(/QuranData\.Sura = \[([\s\S]*?)\];/)?.[1] ?? "";
  const rows = [...block.matchAll(/\[(\d+), (\d+), (\d+), (\d+), '([^']*)', "([^"]*)", '([^']*)', '(Meccan|Medinan)'\]/g)];
  return rows.map((m, i) => ({
    number: i + 1,
    ayahCount: Number(m[2]),
    nameAr: SURAHS[i]?.nameAr ?? m[5],
    nameTranslit: m[6],
    nameEn: m[7],
    type: m[8] as "Meccan" | "Medinan",
  }));
}

function parseStarts(raw: string, name: "Page" | "Juz" | "HizbQaurter"): [number, number][] {
  const block = raw.match(new RegExp(`QuranData\\.${name} = \\[([\\s\\S]*?)\\];`))?.[1] ?? "";
  // Entry n (1-based) is where page (or juz) n starts; the last entry [115, 1] marks the end.
  return [...block.matchAll(/\[(\d+), (\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]).filter(([s]) => s <= 114);
}

export const SURAH_META: readonly SurahMeta[] = parseSurahs(metadataRaw);
/** TANZIL_PAGE_STARTS[p - 1] begins page p of the older Medina Mushaf print, per Tanzil (data checks only). */
export const TANZIL_PAGE_STARTS: readonly (readonly [number, number])[] = parseStarts(metadataRaw, "Page");
/** PAGE_STARTS[p - 1] is the [surah, ayah] that begins page p of the 1441H Madinah Mushaf the reader shows. */
export const PAGE_STARTS: readonly (readonly [number, number])[] = mushafPages.pageStarts as [number, number][];
export const TOTAL_PAGES = PAGE_STARTS.length;

/** The SVG viewBox of a page's image (the opening two pages have their own). */
export function mushafViewBox(page: number): string {
  return (mushafPages.viewBoxes as Record<string, string>)[page] ?? mushafPages.defaultViewBox;
}
/**
 * The part of every quran-svg page that is shown, in its 345 × 550 viewBox:
 * the text block (on pages 3–604 its ink lies within x 2.6–337 and
 * y 3–547.5, measured from the artwork; page 17 also holds an element
 * outside its 345 × 550 box, never drawn) with a slim margin — not the
 * blank paper around it, so the lines are drawn as large as the screen
 * allows. The artwork is only framed, never scaled unevenly or moved within
 * itself: every line, word and verse shape stays exactly where it is printed.
 * The opening pages have their own box (lib/mushafOpening.ts). Used by the
 * reader (components/QuranReaderScreen.tsx).
 */
export const MUSHAF_SHOWN_BOX = "2 3 337 546";
/** JUZ_STARTS[j - 1] is the [surah, ayah] that begins juz j (30). */
export const JUZ_STARTS: readonly (readonly [number, number])[] = parseStarts(metadataRaw, "Juz");
/**
 * QUARTER_STARTS[q - 1] is the [surah, ayah] that begins quarter-hizb q
 * (240: 60 hizbs of four quarters) — Tanzil's "HizbQaurter" list (its own
 * spelling). Checked against Quran.com (src/lib/__fixtures__/quran-com-rub-el-hizb.json):
 * all 240 agree but one, quarter 106, where Tanzil starts at 15:50 and
 * Quran.com at 15:49 — and the 1441H print's own page 264 draws the
 * quarter sign before 15:49 («نَبِّئْ عِبَادِيٓ», seen 2026-10-19), as
 * Quran.com has it. Both verses are on that page, so the page-level markers
 * the reader shows (quarterStartsOnPage) are right either way; nothing shows
 * a quarter verse by verse.
 */
export const QUARTER_STARTS: readonly (readonly [number, number])[] = parseStarts(metadataRaw, "HizbQaurter");

/**
 * The quarter starts as the 1441H print begins them — what the reader opens
 * when a hizb or quarter is chosen: QUARTER_STARTS, except quarter 106, which
 * the print begins at 15:49 (its ۞ is drawn there, and none at 15:50 —
 * src/data/quran/kfqc-hafs-1441-quarter-marks.json).
 */
export const PRINT_QUARTER_STARTS: readonly (readonly [number, number])[] = QUARTER_STARTS.map((start, i) => (i === 105 ? ([15, 49] as const) : start));

/** Where quarter q (1–240) begins in the print, and on which page. */
export function quarterStart(quarter: number): { surah: number; ayah: number; page: number } | null {
  const start = PRINT_QUARTER_STARTS[quarter - 1];
  if (!start) return null;
  return { surah: start[0], ayah: start[1], page: pageOf(start[0], start[1]) ?? 1 };
}

/**
 * The ۞ signs printed on a page, each with its box in the page's own
 * 345 × 550 units (src/data/quran/kfqc-hafs-1441-quarter-marks.json, found
 * on the artwork by scripts/mushaf/find-quarter-marks.py). The reader draws
 * each one in its own colour, exactly over the printed sign, so a quarter
 * reads apart from the verse numbers. A quarter that begins a surah has no
 * sign in the text, as printed.
 */
export function quarterMarksOnPage(page: number): { quarter: number; box: readonly [number, number, number, number] }[] {
  return MARKS_BY_PAGE.get(page) ?? [];
}
const MARKS_BY_PAGE = new Map<number, { quarter: number; box: readonly [number, number, number, number] }[]>();
for (const m of quarterMarks.marks) {
  MARKS_BY_PAGE.set(m.page, [...(MARKS_BY_PAGE.get(m.page) ?? []), { quarter: m.quarter, box: m.box as [number, number, number, number] }]);
}

export function surahMeta(surah: number): SurahMeta | undefined {
  return SURAH_META[surah - 1];
}

export function isValidVerse(surah: number, ayah: number): boolean {
  const meta = surahMeta(surah);
  return !!meta && Number.isInteger(ayah) && ayah >= 1 && ayah <= meta.ayahCount;
}

/** The Mushaf page a verse is on, or null for an invalid verse. */
export function pageOf(surah: number, ayah: number): number | null {
  return isValidVerse(surah, ayah) ? lastStartAtOrBefore(PAGE_STARTS, surah, ayah) : null;
}

/** The juz a verse is in (from Tanzil's juz starts), or null for an invalid verse. */
export function juzOf(surah: number, ayah: number): number | null {
  return isValidVerse(surah, ayah) ? lastStartAtOrBefore(JUZ_STARTS, surah, ayah) : null;
}

/** The hizb (1–60) a verse is in, or null for an invalid verse. */
export function hizbOf(surah: number, ayah: number): number | null {
  return isValidVerse(surah, ayah) ? Math.ceil(lastStartAtOrBefore(QUARTER_STARTS, surah, ayah) / 4) : null;
}

/**
 * The quarter-hizbs that BEGIN on a page, as { quarter (1–240), hizb (1–60),
 * part: 0 = the hizb itself begins, 1 = ¼, 2 = ½, 3 = ¾ } — the "۞" markers of
 * the printed Mushaf, page by page. Empty when none begins there.
 */
export function quarterStartsOnPage(page: number): { quarter: number; hizb: number; part: 0 | 1 | 2 | 3 }[] {
  const verses = pageVerses(page);
  if (verses.length === 0) return [];
  const keys = new Set(verses.map(([s, a]) => `${s}:${a}`));
  const out: { quarter: number; hizb: number; part: 0 | 1 | 2 | 3 }[] = [];
  QUARTER_STARTS.forEach(([s, a], i) => {
    if (keys.has(`${s}:${a}`)) out.push({ quarter: i + 1, hizb: Math.floor(i / 4) + 1, part: (i % 4) as 0 | 1 | 2 | 3 });
  });
  return out;
}

/**
 * Every verse on a Mushaf page, in order, as [surah, ayah] — from the page's
 * start up to (not including) the next page's start. Empty for a page that
 * doesn't exist. Nothing is estimated: the boundaries are the edition's.
 */
export function pageVerses(page: number): [number, number][] {
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) return [];
  const out: [number, number][] = [];
  let [s, a] = PAGE_STARTS[page - 1];
  const end = PAGE_STARTS[page];
  while (s <= SURAH_META.length && !(end && s === end[0] && a === end[1])) {
    out.push([s, a]);
    a += 1;
    if (a > SURAH_META[s - 1].ayahCount) {
      s += 1;
      a = 1;
    }
  }
  return out;
}

function lastStartAtOrBefore(starts: readonly (readonly [number, number])[], surah: number, ayah: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  // The last entry whose start is at or before the verse.
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const [s, a] = starts[mid];
    if (s < surah || (s === surah && a <= ayah)) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Arabic-Indic digits for a verse/page number (١٢٣). */
export function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
