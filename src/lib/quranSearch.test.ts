// Searching the Qur'an (lib/quranSearch.ts): ordinary typed Arabic finds the
// Uthmani text's words, phrases and whole verses.
import { describe, expect, it } from "vitest";
import { normalizeQuery, searchQuran, wordForms } from "./quranSearch";
import { QURAN_VERSES } from "./quranText";

const keys = (q: string) => searchQuran(q).map((h) => `${h.surah}:${h.ayah}`);

describe("Qur'an search", () => {
  it("normalises what is typed: marks dropped, alef and hamza forms unified, ى/ي and ة/ه alike", () => {
    expect(normalizeQuery("  إِنَّ   الصَّلاةَ ")).toBe("ان الصلاه");
    expect(normalizeQuery("موسى")).toBe("موسي");
  });

  it("reads Uthmani spellings the way they are typed", () => {
    expect(wordForms("ٱلرَّحْمَٰنِ")).toContain("الرحمن");
    expect(wordForms("ٱلْعَٰلَمِينَ")).toContain("العالمين");
    expect(wordForms("ٱلصَّلَوٰةَ")).toContain(normalizeQuery("الصلاة"));
    expect(wordForms("ٱلسَّمَٰوَٰتِ")).toContain("السماوات");
    expect(wordForms("إِبْرَٰهِـۧمَ")).toContain("ابراهيم");
  });

  it("finds a word wherever it occurs, in Mushaf order", () => {
    const kahf = keys("الكهف");
    expect(kahf).toContain("18:9");
    expect(kahf).toEqual([...kahf].sort((a, b) => {
      const [sa, aa] = a.split(":").map(Number);
      const [sb, ab] = b.split(":").map(Number);
      return sa - sb || aa - ab;
    }));
    expect(keys("الصلاة").length).toBeGreaterThan(50);
    expect(keys("العالمين")).toContain("1:2");
  });

  it("finds a whole verse typed without marks — Ayat al-Kursi — and marks the matched words", () => {
    const hits = searchQuran("الله لا اله الا هو الحي القيوم");
    expect(hits.map((h) => `${h.surah}:${h.ayah}`)).toEqual(["2:255", "3:2"]);
    expect(hits[0].matched).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // Pasted with its marks (Tanzil's own text): found too.
    expect(keys(QURAN_VERSES[1][254])).toEqual(["2:255"]);
  });

  it("finds a phrase the Uthmani text spaces differently (يا أيها → يَٰٓأَيُّهَا), and «آ» typed for «ءَا»", () => {
    expect(keys("يا أيها الذين آمنوا")).toContain("2:104");
    expect(keys("آمنوا")).toContain("2:9");
  });

  it("doesn't search the basmala as part of each surah's first verse; al-Fatihah's own is found", () => {
    expect(keys("بسم الله الرحمن الرحيم")).toEqual(["1:1", "27:30"]);
  });

  it("ignores a query too short to mean anything", () => {
    expect(searchQuran("ا")).toEqual([]);
    expect(searchQuran("  ")).toEqual([]);
  });
});
