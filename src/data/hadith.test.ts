// Regression coverage for getHadithDetailFields and the dictionary-based
// English renderings it uses — the fix for two bugs:
// (1) Arabic metadata (source/reference/grade/gradingSource/narrator)
//     leaking into English mode under English labels, or disappearing
//     entirely (grade/gradingSource/narrator all used to vanish or leak).
// (2) The Hadith card's single expand control's visibility being tied to
//     Hadith text length instead of whether detail data actually exists.
import { describe, expect, it } from "vitest";
import {
  HADITHS,
  getHadithDetailFields,
  translateHadithSourceToEnglish,
  translateHadithReferenceToEnglish,
  translateHadithGradeToEnglish,
  translateHadithGradingSourceToEnglish,
  translateHadithNarratorToEnglish,
} from "./hadith";

// Verified against the library (see hadith.ts's own header comment; 104
// entries since the 2026-10-30 audit cleanup removed the other 96) — entries whose Arabic Source/Reference contains something
// beyond this module's book-name dictionary (an explanatory clause, or a
// grading remark embedded in the reference field itself). These MUST NOT
// silently regress to guessing/inventing a translation; they must keep
// resolving to `undefined`.
const IDS_WITHOUT_ENGLISH_SOURCE = [77];
// (70 resolves since its reference became «المستدرك للحاكم 58» in the 2026-10-31 corrections.)
const IDS_WITHOUT_ENGLISH_REFERENCE = [77];

const ARABIC_CHAR_RE = /[؀-ۿ]/;

describe("getHadithDetailFields — Arabic", () => {
  it("returns all five Arabic detail fields for every Hadith in the library", () => {
    for (const entry of HADITHS) {
      const fields = getHadithDetailFields(entry, "ar");
      expect(fields).toHaveLength(5);
      expect(fields.map((f) => f.key)).toEqual(["source", "reference", "grade", "gradingSource", "narrator"]);
      for (const field of fields) {
        expect(field.value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("Arabic details are available even for a very short Hadith text (id 38) — not gated by text length", () => {
    const shortHadith = HADITHS.find((h) => h.id === 38)!;
    expect(shortHadith.textAr.length).toBeLessThan(100);
    expect(getHadithDetailFields(shortHadith, "ar")).toHaveLength(5);
  });
});

describe("getHadithDetailFields — English", () => {
  it("resolves GradingSource and Narrator for every entry (exact-match dictionaries built from the closed set actually present in the data)", () => {
    const missingGradingSource = HADITHS.filter((h) => translateHadithGradingSourceToEnglish(h.gradingSourceAr) === undefined);
    const missingNarrator = HADITHS.filter((h) => translateHadithNarratorToEnglish(h.narratorAr) === undefined);
    expect(missingGradingSource).toEqual([]);
    expect(missingNarrator).toEqual([]);
  });

  it("every entry's English details include gradingSource and narrator — grading/takhrij is never lost in English", () => {
    for (const entry of HADITHS) {
      const keys = getHadithDetailFields(entry, "en").map((f) => f.key);
      expect(keys).toContain("gradingSource");
      expect(keys).toContain("narrator");
    }
  });

  it("never returns a value containing Arabic script — no mixed-language leftovers, ever", () => {
    for (const entry of HADITHS) {
      for (const field of getHadithDetailFields(entry, "en")) {
        expect(ARABIC_CHAR_RE.test(field.value)).toBe(false);
      }
    }
  });

  it("resolves Grade for every entry (a small, closed, standardized vocabulary)", () => {
    const missing = HADITHS.filter((h) => translateHadithGradeToEnglish(h.gradeAr) === undefined);
    expect(missing).toEqual([]);
  });

  it("resolves Source for every entry except the known, reported exceptions", () => {
    const missing = HADITHS.filter((h) => translateHadithSourceToEnglish(h.sourceAr) === undefined).map((h) => h.id);
    expect(missing).toEqual(IDS_WITHOUT_ENGLISH_SOURCE);
  });

  it("resolves Reference for every entry except the known, reported exceptions", () => {
    const missing = HADITHS.filter((h) => translateHadithReferenceToEnglish(h.referenceAr) === undefined).map(
      (h) => h.id,
    );
    expect(missing).toEqual(IDS_WITHOUT_ENGLISH_REFERENCE);
  });

  it("a normal entry (id 8) resolves clean English Source/Reference/Grade", () => {
    const entry = HADITHS.find((h) => h.id === 8)!;
    const fields = getHadithDetailFields(entry, "en");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.value]));
    expect(byKey.source).toBe("Sahih al-Bukhari / Sahih Muslim");
    expect(byKey.reference).toBe("Bukhari 13, Muslim 45");
    expect(byKey.grade).toBe("Sahih, agreed upon");
    expect(byKey.gradingSource).toBe("Al-Bukhari and Muslim");
    expect(byKey.narrator).toBe("Anas ibn Malik (may Allah be pleased with him)");
  });

  it("id 38 (short Hadith) still resolves full English details — not gated by text length", () => {
    const entry = HADITHS.find((h) => h.id === 38)!;
    expect(entry.textEn.length).toBeLessThan(150);
    const fields = getHadithDetailFields(entry, "en");
    expect(fields.length).toBeGreaterThan(0);
  });
});
