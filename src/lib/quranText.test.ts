// The Qur'an text and metadata (Tanzil), checked on every test run: the files
// are the verbatim downloads, all 114 surahs are complete and in order, their
// verse counts agree with Tanzil's metadata AND with the app's own table,
// verses are taken exactly as written, Tanzil's page and juz divisions
// match Quran.com's for every page (src/data/quran/README.md), and the
// reader's own pages are the 1441H edition's (public/mushaf/hafs-kfqc).
import { describe, expect, it } from "vitest";
import quranFile from "../data/quran/tanzil-quran-uthmani.txt?raw";
import metadataFile from "../data/quran/tanzil-quran-metadata.txt?raw";
import { QURAN_VERSES, TANZIL_NOTICE, parseQuranText, quranTextProblems, splitBasmala } from "./quranText";
import { JUZ_STARTS, PAGE_STARTS, SURAH_META, TANZIL_PAGE_STARTS, TOTAL_PAGES, arabicDigits, isValidVerse, juzOf, mushafViewBox, pageOf, pageVerses } from "./quranMeta";
import quranCom from "./__fixtures__/quran-com-pages.json";
import { SURAHS } from "../data/quranSurahs";

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("the Qur'an text (Tanzil, Uthmani)", () => {
  it("is the verbatim download (byte-identical to the recorded SHA-256)", async () => {
    expect(await sha256(quranFile)).toBe("bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8");
    expect(await sha256(metadataFile)).toBe("9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4");
  });

  it("has all 114 surahs and 6,236 verses, in order, none empty — and validation finds no problem", () => {
    expect(QURAN_VERSES).toHaveLength(114);
    expect(QURAN_VERSES.reduce((n, s) => n + s.length, 0)).toBe(6236);
    expect(quranTextProblems()).toEqual([]);
  });

  it("agrees with Tanzil's metadata and with the app's own surah table, surah by surah", () => {
    expect(SURAH_META).toHaveLength(114);
    for (let i = 0; i < 114; i++) {
      expect(QURAN_VERSES[i].length, `surah ${i + 1}`).toBe(SURAH_META[i].ayahCount);
      expect(SURAHS[i].ayahCount, `surah ${i + 1}`).toBe(SURAH_META[i].ayahCount);
    }
  });

  it("keeps each verse exactly as written in the file", () => {
    const lines = quranFile.split("\n").filter((l: string) => /^\d+\|\d+\|/.test(l));
    for (const line of [lines[0], lines[261], lines[6235]]) {
      const [s, a, ...rest] = line.split("|");
      expect(QURAN_VERSES[Number(s) - 1][Number(a) - 1]).toBe(rest.join("|"));
    }
    // Ayat al-Kursi (2:255) is exactly its line in the file.
    expect(QURAN_VERSES[1][254]).toBe(lines.find((l: string) => l.startsWith("2|255|"))!.slice("2|255|".length));
  });

  it("parses every line back to exactly the same characters (round trip of all 6,236 verse lines)", () => {
    const lines = quranFile.split("\n").filter((l: string) => /^\d+\|\d+\|/.test(l));
    expect(lines).toHaveLength(6236);
    let i = 0;
    for (let s = 1; s <= 114; s++) for (let a = 1; a <= QURAN_VERSES[s - 1].length; a++) expect(`${s}|${a}|${QURAN_VERSES[s - 1][a - 1]}`).toBe(lines[i++]);
  });

  it("holds only Arabic-script letters, marks and single spaces — no digits, control characters or stray spacing — and is never normalized", () => {
    for (let s = 1; s <= 114; s++) {
      QURAN_VERSES[s - 1].forEach((verse, i) => {
        const where = `${s}:${i + 1}`;
        expect(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF ]+$/u.test(verse), where).toBe(true);
        expect(/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(verse), where).toBe(false);
        expect(verse === verse.trim() && !verse.includes("  "), where).toBe(true);
        expect(/^\p{M}/u.test(verse) || / \p{M}/u.test(verse), where).toBe(false); // no word starts with a detached mark
      });
    }
    // Tanzil's own mark order is kept: normalizing would reorder marks in thousands of verses.
    expect(QURAN_VERSES.flat().filter((v) => v.normalize("NFC") !== v).length).toBeGreaterThan(5000);
  });

  it("carries Tanzil's copyright notice from the file itself", () => {
    expect(TANZIL_NOTICE).toContain("Tanzil Quran Text");
    expect(TANZIL_NOTICE).toContain("Creative Commons Attribution 3.0");
    expect(TANZIL_NOTICE).toContain("CHANGING IT IS NOT ALLOWED");
  });

  it("reports a damaged text instead of hiding it", () => {
    const broken = parseQuranText("1|1|a\n1|3|c\n2|1|\n");
    expect(broken.problems).toContain("out of order at 1:3");
    expect(quranTextProblems(broken).some((p) => p.includes("surahs"))).toBe(true);
  });
});

describe("Mushaf page numbers (the 1441H Madinah Mushaf)", () => {
  it("has the 604 pages of the Madinah Mushaf, starting at al-Fatihah", () => {
    expect(TOTAL_PAGES).toBe(604);
    expect(PAGE_STARTS[0]).toEqual([1, 1]);
  });

  it("puts these verses on the same pages as Quran.com (pages the two prints share)", () => {
    const samples: [number, number, number][] = [[1, 1, 1], [2, 1, 2], [2, 255, 42], [2, 286, 49], [3, 1, 50], [9, 1, 187], [18, 1, 293], [18, 110, 304], [20, 14, 313], [36, 1, 440], [55, 1, 531], [67, 1, 562], [78, 1, 582], [112, 1, 604], [114, 6, 604]];
    for (const [s, a, page] of samples) expect(pageOf(s, a), `${s}:${a}`).toBe(page);
  });

  it("never invents a page for a verse that doesn't exist", () => {
    expect(pageOf(115, 1)).toBeNull();
    expect(pageOf(1, 8)).toBeNull();
    expect(isValidVerse(2, 286)).toBe(true);
    expect(isValidVerse(2, 287)).toBe(false);
  });

  it("writes numbers in Arabic-Indic digits for Arabic", () => {
    expect(arabicDigits(255)).toBe("٢٥٥");
  });
});

// Each page's verses as the edition's own page data has them (public/mushaf/hafs-kfqc/json).
const PAGE_JSON = import.meta.glob<{ surahNumber: number; ayahNumber: number }[]>("/public/mushaf/hafs-kfqc/json/*.json", { eager: true, import: "default" });
const editionPage = (p: number) => PAGE_JSON[`/public/mushaf/hafs-kfqc/json/${String(p).padStart(3, "0")}.json`].map((v) => `${v.surahNumber}:${v.ayahNumber}`);

describe("Mushaf pages for the page-by-page reader", () => {
  it("Tanzil's (older print) page and juz divisions are Quran.com's, for all 604 pages and 30 juz", () => {
    // Fixture: the first verse of every page and juz from Quran.com's API
    // (retrieved 2026-10-16); with the pages in order, that fixes every verse's page.
    expect(TANZIL_PAGE_STARTS.map(([s, a]) => `${s}:${a}`)).toEqual(quranCom.pageStarts);
    expect(JUZ_STARTS.map(([s, a]) => `${s}:${a}`)).toEqual(quranCom.juzStarts);
  });

  it("the reader's pages are exactly the 1441H edition's: each page holds the verses its page data lists", () => {
    for (let p = 1; p <= TOTAL_PAGES; p++) expect(pageVerses(p).map(([s, a]) => `${s}:${a}`), `page ${p}`).toEqual(editionPage(p));
  });

  it("differs from the older print on exactly the 25 pages the 1441H print breaks differently", () => {
    const differing = PAGE_STARTS.map((start, i) => (`${start}` === `${TANZIL_PAGE_STARTS[i]}` ? 0 : i + 1)).filter(Boolean);
    expect(differing).toEqual([121, 122, 123, 145, 532, 533, 534, 565, 568, 570, 576, 584, 586, 588, 589, 590, 592, 593, 594, 595, 596, 597, 598, 599, 600]);
    expect(PAGE_STARTS[3 - 1]).toEqual([2, 6]);
    expect(PAGE_STARTS[586 - 1]).toEqual([80, 41]);
    expect(PAGE_STARTS[590 - 1]).toEqual([84, 25]);
    expect(mushafViewBox(1)).toBe("-53.3109 -198.4777 345 550");
    expect(mushafViewBox(3)).toBe("0 0 345 550");
  });

  it("puts every verse on exactly one page, in order, with no gap", () => {
    const all = Array.from({ length: TOTAL_PAGES }, (_, i) => pageVerses(i + 1)).flat();
    expect(all).toHaveLength(6236);
    let i = 0;
    for (let s = 1; s <= 114; s++) for (let a = 1; a <= SURAH_META[s - 1].ayahCount; a++) expect(all[i++]).toEqual([s, a]);
    for (let p = 1; p <= TOTAL_PAGES; p++) for (const [s, a] of pageVerses(p)) if (pageOf(s, a) !== p) throw new Error(`${s}:${a} is on page ${pageOf(s, a)}, listed on ${p}`);
  });

  it("lists a page's verses across surahs (page 604: al-Ikhlas, al-Falaq, an-Nas)", () => {
    expect(pageVerses(42).map(([s, a]) => `${s}:${a}`)).toEqual(["2:253", "2:254", "2:255", "2:256"]);
    expect(new Set(pageVerses(604).map(([s]) => s))).toEqual(new Set([112, 113, 114]));
    expect(pageVerses(604)).toHaveLength(4 + 5 + 6);
    expect(pageVerses(0)).toEqual([]);
    expect(pageVerses(605)).toEqual([]);
  });

  it("knows each verse's juz", () => {
    expect(juzOf(1, 1)).toBe(1);
    expect(juzOf(2, 142)).toBe(2);
    expect(juzOf(2, 255)).toBe(3);
    expect(juzOf(114, 6)).toBe(30);
    expect(juzOf(115, 1)).toBeNull();
  });

  it("lays out the basmala on its own line without changing a character", () => {
    let split = 0;
    for (let s = 1; s <= 114; s++) {
      const verse = QURAN_VERSES[s - 1][0];
      const parts = splitBasmala(s, 1, verse);
      if (s === 1 || s === 9) expect(parts, `surah ${s}`).toBeNull();
      else {
        expect(parts, `surah ${s}`).not.toBeNull();
        expect(parts!.basmala + parts!.rest).toBe(verse);
        expect(parts!.rest.length).toBeGreaterThan(0);
        split++;
      }
    }
    expect(split).toBe(112);
    expect(splitBasmala(2, 2, QURAN_VERSES[1][1])).toBeNull();
  });
});
