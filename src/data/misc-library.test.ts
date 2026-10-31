// @vitest-environment jsdom
// Source verification, batch 1 (2026-10-23): each dua's Arabic is its cited
// narration's own words, its English is the published translation of that
// same narration (with only the adjustments its credit names), and the
// review screen sees the link and the credit. The fixture holds the
// narrations as fetched (see its `source`).
import { describe, expect, it } from "vitest";
import batch1 from "../lib/__fixtures__/hadith-api-misc-duas-batch1.json";
import { MISC_DUAS } from "./misc-library";
import { contentCatalog } from "../lib/contentCatalog";

interface Narration {
  ref: string;
  text: string;
  textEn: string;
  grades: { name: string; grade: string }[];
}
const narrations = batch1.narrations as Narration[];
const narration = (ref: string) => narrations.find((n) => n.ref === ref)!;

const plain = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]+/g, " ")
    .trim();
const flat = (s: string) => s.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
const dua = (id: string) => MISC_DUAS.find((d) => d.id === id)!;

// id → [cited narration, link, published-text → app-text substitutions named in the item's translation credit]
const HADITH_ITEMS: Record<string, [string, string, [string, string][]]> = {
  "allahumma-inni-asaluka-alhuda": ["Sahih Muslim 2721a", "https://sunnah.com/muslim:2721a", [["O Allah. I", "O Allah, I"]]],
  "allahumma-ighfir-li-warhamni": ["Sahih Muslim 2697b", "https://sunnah.com/muslim:2697b", []],
  "allahumma-ihdini-wasaddidni": ["Sahih Muslim 2725a", "https://sunnah.com/muslim:2725a", []],
  "allahumma-aslih-li-dini": ["Sahih Muslim 2720", "https://sunnah.com/muslim:2720", []],
  "allahumma-inni-asaluka-min-al-khayr-kullih": ["Sunan Ibn Majah 3846", "https://sunnah.com/ibnmajah:3846", []],
  "allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah": [
    "Sunan Abi Dawud 5074",
    "https://sunnah.com/abudawud/43/302",
    [
      ["my fault or faults (according to Uthman's version)", "my faults"],
      ["I seek in Thy greatness", "I seek [refuge] in Thy greatness"],
    ],
  ],
  "allahumma-iqsim-lana-min-khashyatik": ["Jami' at-Tirmidhi 3502", "https://sunnah.com/tirmidhi:3502", []],
  "allahumma-bi-ilmika-al-ghayb": ["Sunan an-Nasa'i 1305", "https://sunnah.com/nasai:1305", [["I askYou", "I ask You"]]],
};

describe("batch 1 — Arabic", () => {
  it("each hadith dua is its cited narration's own words, letter for letter", () => {
    for (const [id, [ref]] of Object.entries(HADITH_ITEMS)) {
      if (id === "allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah") continue;
      expect(plain(narration(ref).text).includes(plain(dua(id).text_ar)), `${id} in ${ref}`).toBe(true);
    }
  });

  it("2697b is the narration with «وعافني», not 2697a", () => {
    const text = plain(dua("allahumma-ighfir-li-warhamni").text_ar);
    expect(plain(narration("Sahih Muslim 2697a").text).includes(text)).toBe(false);
  });

  it("the afiyah dua is Abu Dawud's wording (Uthman's «عوراتي»), not merged with Ibn Majah 3871", () => {
    const text = dua("allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah").text_ar;
    const [before, after] = text.split("عوراتي");
    // Abu Dawud gives Yahya's «عورتي», then «وقال عثمان: عوراتي ...» — the dua follows Uthman's version.
    const abuDawud = plain(narration("Sunan Abi Dawud 5074").text);
    expect(abuDawud.includes(plain(before))).toBe(true);
    expect(abuDawud.includes(plain(`عوراتي${after}`))).toBe(true);
    const ibnMajah = plain(narration("Sunan Ibn Majah 3871").text);
    expect(ibnMajah.includes(plain("اللهم إني أسألك العافية في الدنيا"))).toBe(false);
    expect(ibnMajah.includes(plain("بعظمتك"))).toBe(false);
  });

  it("the Nasa'i dua no longer carries «اللهم إني أسألك خشيتك», which neither Nasa'i narration has", () => {
    const old = plain("اللهم إني أسألك خشيتك");
    expect(plain(dua("allahumma-bi-ilmika-al-ghayb").text_ar).includes(old)).toBe(false);
    for (const ref of ["Sunan an-Nasa'i 1305", "Sunan an-Nasa'i 1306"]) expect(plain(narration(ref).text).includes(old), ref).toBe(false);
  });

  it("the thabat dua is the wording al-Albani graded in al-Silsilah as-Sahihah 3228", () => {
    const d = dua("allahumma-inni-asaluka-al-thabat-fi-al-amr");
    expect(plain(batch1.silsilah.text).includes(plain(d.text_ar))).toBe(true);
    expect(batch1.silsilah.verdict).toBe("إسناده صحيح");
    expect(d.source_ar).toContain("(7135)");
    expect(d.source_ar).toContain("السلسلة الصحيحة (3228): إسناده صحيح");
    expect(d.narrator_ar).toContain("شداد بن أوس");
  });
});

describe("batch 1 — English and links", () => {
  it("each hadith dua's English is the published translation of its narration, with only the named adjustments", () => {
    for (const [id, [ref, url, swaps]] of Object.entries(HADITH_ITEMS)) {
      const d = dua(id);
      let published = flat(narration(ref).textEn);
      for (const [from, to] of swaps) {
        expect(published.includes(from), `${id}: "${from}"`).toBe(true);
        published = published.replace(from, to);
      }
      expect(published.includes(flat(d.englishMeaning!)), id).toBe(true);
      expect(d.url, id).toBe(url);
      expect(d.translation, id).toMatchObject({ kind: "published", url, reviewed: false });
    }
  });

  it("2:201 uses Saheeh International, trimmed to the dua", () => {
    const d = dua("rabbana-atina");
    expect(batch1.quran.text.includes(d.englishMeaning!)).toBe(true);
    expect(d.url).toBe("https://quran.com/2/201");
    expect(d.translation?.source).toContain("Saheeh International");
  });

  it("the thabat dua's English is marked as DITHAR's editorial translation, not a published quotation", () => {
    const d = dua("allahumma-inni-asaluka-al-thabat-fi-al-amr");
    expect(d.url).toBe("https://dorar.net/h/tD2SBsyX");
    expect(d.translation).toMatchObject({ kind: "editorial", reviewed: false });
    expect(d.translation?.url).toBeUndefined();
    expect(d.reviewNote).toBeTruthy();
  });

  it("the source lines name each grader the dataset lists for a disputed or qualified grade", () => {
    expect(narration("Jami' at-Tirmidhi 3502").grades).toContainEqual({ name: "Zubair Ali Zai", grade: "Daif" });
    expect(narration("Jami' at-Tirmidhi 3502").text).toContain("حَسَنٌ غَرِيبٌ");
    const tirmidhi = dua("allahumma-iqsim-lana-min-khashyatik");
    expect(tirmidhi.source_ar).toContain("قال الترمذي: حسن غريب");
    expect(tirmidhi.source_ar).toContain("حسّنه الألباني");
    expect(tirmidhi.source_ar).toContain("ضعّفه زبير علي زئي");
    expect(tirmidhi.source_en).toMatch(/hasan gharib.*hasan by al-Albani.*da'if by Zubair Ali Za'i/);
    expect(narration("Sunan an-Nasa'i 1305").grades).toContainEqual({ name: "Zubair Ali Zai", grade: "Isnaad Hasan" });
    expect(dua("allahumma-bi-ilmika-al-ghayb").source_en).toContain("Zubair Ali Za'i graded its chain hasan");
    expect(narration("Sunan Ibn Majah 3846").grades).toContainEqual({ name: "Al-Albani", grade: "Sahih" });
  });

  it("the review screen shows the link and the credit instead of 'source not recorded'", () => {
    const ids = [...Object.keys(HADITH_ITEMS), "rabbana-atina", "allahumma-inni-asaluka-al-thabat-fi-al-amr"];
    const catalog = contentCatalog();
    for (const id of ids) {
      const item = catalog.find((c) => c.id === `dua:${id}`)!;
      expect(item.url, id).toBe(dua(id).url);
      expect(item.translationSource, id).toBe(dua(id).translation!.source);
      expect(item.warnings, id).not.toContain("missing-url");
      expect(item.warnings, id).not.toContain("translation-source-unknown");
      expect(item.warnings, id).toContain("unverified-translation");
    }
    expect(catalog.find((c) => c.id === "dua:dua-al-karb")!.warnings).toContain("translation-source-unknown");
  });
});
