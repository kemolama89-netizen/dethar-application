// The text a shared Ayah carries and how the image passes it to the canvas:
// Tanzil's marked edition is the reader's text plus standalone signs and nothing
// else, and what is drawn is that text, character for character, in a font that
// has every one of its characters (src/data/quran/README.md).
import { describe, expect, it } from "vitest";
import markedFile from "../data/quran/tanzil-quran-uthmani-marked.txt?raw";
import { QURAN_VERSES, parseQuranText, verseForSharing } from "./quranText";
import { markedQuranVerses, markedVerseForSharing } from "./quranShareText";
import { fitShareImage, verseEndSign, wrapQuranText } from "./shareImage";

/** Characters that stand as a word of their own in the marked edition. */
const SIGN = /^[\u06D6-\u06DC\u06DE\u06E9]+$/;
const withoutSigns = (verse: string) => verse.split(" ").filter((w) => !SIGN.test(w)).join(" ");
const everyVerse = (visit: (surah: number, ayah: number) => void) => {
  QURAN_VERSES.forEach((verses, s) => verses.forEach((_, a) => visit(s + 1, a + 1)));
};
const colors = { bg: "#000", surface: "#000", ink: "#000", muted: "#000", gold: "#000", primary: "#000" };

describe("the marked Qur'an text for sharing", () => {
  it("is Tanzil's file, verbatim, with the sum recorded in the README", async () => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(markedFile));
    expect([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")).toBe("4b91f9e6e8ac645d039e4ed85b3be492e795232a31cd22d668ac58238722e26f");
    expect(parseQuranText(markedFile).problems).toEqual([]);
  });

  it("is the reader's text exactly, plus standalone signs, in all 6,236 verses", () => {
    let n = 0;
    everyVerse((s, a) => {
      n++;
      const verse = markedQuranVerses()[s - 1][a - 1];
      if (withoutSigns(verse) !== QURAN_VERSES[s - 1][a - 1]) throw new Error(`${s}:${a} differs`);
    });
    expect(n).toBe(6236);
  });

  it("has every sign: the pause marks, sakt, sajdah and rub-el-hizb", () => {
    const counts = new Map<string, number>();
    for (const verses of markedQuranVerses()) {
      for (const verse of verses) {
        for (const word of verse.split(" ")) if (SIGN.test(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
    expect(Object.fromEntries(counts)).toEqual({ "\u06DA": 1972, "\u06D6": 1682, "\u06D7": 603, "\u06DE": 199, "\u06D9": 68, "\u06D8": 22, "\u06E9": 15, "\u06DB": 12, "\u06DC": 5 });
  });

  it("shares the same verse the reader shares, with its signs; the heading basmala is left out as before", () => {
    everyVerse((s, a) => {
      const marked = markedVerseForSharing(s, a)!;
      const plain = verseForSharing(s, a)!;
      if (withoutSigns(marked) !== plain) throw new Error(`${s}:${a} differs from the reader's verse`);
    });
    expect(markedVerseForSharing(2, 2)!.match(/\u06DB/g)).toHaveLength(2);
    expect(markedVerseForSharing(96, 19)!.endsWith(" \u06E9")).toBe(true);
    expect(markedVerseForSharing(2, 287)).toBeNull();
  });
});

describe("the text drawn on a shared Ayah's image", () => {
  const narrow = (s: string) => s.length * 11;

  it("is the source, character for character, at any width, in all 6,236 verses", () => {
    for (const width of [300, 888, 2000]) {
      everyVerse((s, a) => {
        const verse = markedVerseForSharing(s, a)!;
        const lines = wrapQuranText(verse, width, narrow);
        if (lines.join(" ") !== verse) throw new Error(`${s}:${a} changed at width ${width}`);
      });
    }
  });

  it("never starts a line with a pause mark, a sajdah sign or the verse-end sign", () => {
    everyVerse((s, a) => {
      const text = `${markedVerseForSharing(s, a)!} ${verseEndSign(a)}`;
      for (const line of wrapQuranText(text, 300, narrow).slice(1)) {
        if (/^[\u06D6-\u06DD\u06E9]/.test(line)) throw new Error(`${s}:${a}: ${line}`);
      }
    });
  });

  it("lays out the verse in the Qur'anic font, then its end sign; every other share is drawn as before", () => {
    const verse = markedVerseForSharing(2, 2)!;
    const fonts: string[] = [];
    const layout = fitShareImage({ textAr: verse, reference: "سورة البقرة · الآية ٢", quranVerse: { ayah: 2 } }, "ar", colors, (font, s) => {
      fonts.push(font);
      return s.length * 20;
    });
    expect(layout.blocks[0].font).toBe('400 62px "Scheherazade New"');
    expect(layout.blocks[0].lines.join(" ")).toBe(`${verse} \u06DD\u0662`);
    expect(layout.blocks[1].lines.join(" ")).toContain("سورة البقرة · الآية ٢"); // the surah and verse number
    const hadith = fitShareImage({ textAr: "حديث شريف" }, "ar", colors, (_, s) => s.length * 20);
    expect(hadith.blocks[0].font).toContain("Amiri");
  });

  it("numbers the verse-end sign in Arabic-Indic digits", () => {
    expect(verseEndSign(7)).toBe("\u06DD\u0667");
    expect(verseEndSign(286)).toBe("\u06DD\u0662\u0668\u0666");
  });
});
