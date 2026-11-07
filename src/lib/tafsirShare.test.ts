import { describe, expect, it } from "vitest";
import { loadSaadiSurah, parseSaadiText } from "./saadiTafsir";
import { composeShareText } from "./shareContent";
import { saadiTextForCard, saadiTextForSharing, tafsirShareContent } from "./tafsirShare";

/** The source with the editor's notes (¬…¥, or ¬… up to the next ¬ or the end) and stray ¥ removed — written apart from the parser. */
function withoutNotes(text: string): string {
  return text
    .replace(/¬[^¬¥]*(¥|(?=¬)|$)/g, "")
    .replace(/¥/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

describe("saadiTextForSharing", () => {
  it("is al-Sa'di's text character for character, without the editor's notes, for every verse", async () => {
    let checked = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const data = await loadSaadiSurah(surah);
      if (!data) throw new Error(`surah ${surah} missing`);
      for (const { ayah, text } of data.ayat) {
        const shared = saadiTextForSharing(parseSaadiText(text));
        expect(shared, `${data.surah}:${ayah}`).toBe(withoutNotes(text));
        expect(shared).not.toMatch(/[¬¥]/);
        checked++;
      }
    }
    expect(checked).toBe(6236);
  }, 60_000);
});

describe("saadiTextForCard", () => {
  const verse = async (surah: number, ayah: number) => {
    const data = await loadSaadiSurah(surah);
    return parseSaadiText(data!.ayat.find((a) => a.ayah === ayah)!.text);
  };

  it("for every verse, leaves out only the book's quotations of that verse alone, and keeps everything else in order", async () => {
    let without = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const data = await loadSaadiSurah(surah);
      for (const { ayah, text } of data!.ayat) {
        const parsed = parseSaadiText(text);
        const all = saadiTextForSharing(parsed).split("\n");
        const card = saadiTextForCard(parsed, ayah).split("\n");
        const left = all.filter((line) => !card.includes(line));
        expect(card.every((line) => all.includes(line)), `${surah}:${ayah}`).toBe(true);
        // Same order: the card's lines are the whole text's, with lines only left out.
        expect(all.filter((line) => card.includes(line))).toEqual(card);
        // Each line left out is a quotation in braces of this verse and no other (Baqarah 16 quotes itself twice).
        for (const line of left) {
          // Opens and closes as a quotation (the source has a stray brace inside one, Nisa' 61).
          expect(line, `${surah}:${ayah}`).toMatch(/^[[{]\{?.*[}\]]\]?[.\s]*$/);
          expect(line, `${surah}:${ayah}`).not.toMatch(/(قوله|قال|تعالى):/);
          expect([...line.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])), `${surah}:${ayah}`).toEqual([ayah]);
        }
        if (left.length) without++;
      }
    }
    expect(without).toBeGreaterThan(6200);
  }, 60_000);

  it("leaves out Baqarah 2's quotation of itself (its first paragraph), and nothing of the comment", async () => {
    const parsed = await verse(2, 2);
    const [first, ...rest] = saadiTextForSharing(parsed).split("\n");
    expect(first).toMatch(/^\{.*\(2\)\}\.$/);
    expect(saadiTextForCard(parsed, 2)).toBe(rest.join("\n"));
    expect(rest[0].startsWith("{2}")).toBe(true); // The comment, with the book's own verse marker.
  });

  it("keeps a heading that quotes other verses too, and a heading that is all the book gives", async () => {
    const twoSix = await verse(2, 6);
    expect(saadiTextForCard(twoSix, 6)).toBe(saadiTextForSharing(twoSix)); // Quotes verses 6 and 7 together.
    const nahl = await verse(16, 64);
    expect(saadiTextForCard(nahl, 64)).toBe(saadiTextForSharing(nahl)); // The book has no comment here.
    expect(saadiTextForCard(nahl, 64).trim()).not.toBe("");
  });
});

describe("tafsirShareContent", () => {
  const content = tafsirShareContent(
    { surah: 1, ayah: 1, text: "VERSE" },
    "TAFSIR\nSECOND",
    { kind: "آية مع تفسيرها", reference: "سورة الفاتحة · الآية ١", tafsirLabel: "تفسير السعدي", source: "BOOK — AUTHOR" },
  );

  it("draws the verse as Qur'an with its end sign, and the Tafsir as its own section", () => {
    expect(content.quranVerse).toEqual({ ayah: 1 });
    expect(content.textAr).toBe("VERSE");
    expect(content.sections).toEqual([{ label: "تفسير السعدي", text: "TAFSIR\nSECOND", source: "BOOK — AUTHOR" }]);
    expect(content.tafsirCard).toBe(true);
    expect(content.sections![0].imageText).toBeUndefined();
  });

  it("draws the card's own Tafsir when given, and still shares the complete text", () => {
    const withCard = tafsirShareContent({ surah: 1, ayah: 1, text: "VERSE" }, "HEADING\nTAFSIR", { kind: "k", reference: "r", tafsirLabel: "l", source: "s" }, "TAFSIR");
    expect(withCard.sections![0].imageText).toBe("TAFSIR");
    expect(composeShareText(withCard, "ar")).toContain("l:\nHEADING\nTAFSIR\n");
  });

  it("shares the verse, its reference, the complete Tafsir and its source as text", () => {
    expect(composeShareText(content, "ar")).toBe(
      ["VERSE", "المصدر: سورة الفاتحة · الآية ١", "تفسير السعدي:\nTAFSIR\nSECOND\nالمصدر: BOOK — AUTHOR", "— من تطبيق دِثار"].join("\n\n"),
    );
  });
});
