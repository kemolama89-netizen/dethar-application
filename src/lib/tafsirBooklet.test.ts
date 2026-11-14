import { describe, expect, it } from "vitest";
import { BOOKLET_MAX_HEIGHT, pageOfText, sharedPageHeight, verseNeedsExcerpt, wordsThatFit } from "./tafsirBooklet";
import { pieces } from "./bookletImage";

describe("its pages", () => {
  it("counts pages from the right (Arabic) or the left, a page and its gap apart", () => {
    // First page's right edge at 360; pages 300 wide with a 40 gap.
    expect(pageOfText(360, 360, 340, true)).toBe(0);
    expect(pageOfText(20, 360, 340, true)).toBe(1);
    expect(pageOfText(-660, 360, 340, true)).toBe(3);
    expect(pageOfText(30, 30, 340, false)).toBe(0);
    expect(pageOfText(370, 30, 340, false)).toBe(1);
  });

  it("opens a verse with an excerpt only when it alone would fill more than a page and a half", () => {
    expect(verseNeedsExcerpt(300, 300)).toBe(false);
    expect(verseNeedsExcerpt(450, 300)).toBe(false);
    expect(verseNeedsExcerpt(451, 300)).toBe(true);
    expect(verseNeedsExcerpt(900, 0)).toBe(false);
  });

  it("takes whole words for an excerpt — the most that fit, at least one", () => {
    const words = ["يَٰٓأَيُّهَا", "ٱلَّذِينَ", "ءَامَنُوٓاْ", "إِذَا", "تَدَايَنتُم"];
    expect(wordsThatFit(words, (n) => n <= 3)).toBe(3);
    expect(wordsThatFit(words, () => true)).toBe(5);
    expect(wordsThatFit(words, () => false)).toBe(1);
  });
});

describe("a shared page", () => {
  it("is phone-shaped and taller than any booklet on screen, so a long Tafsir takes fewer images", () => {
    expect(sharedPageHeight(342)).toBe(608);
    expect(sharedPageHeight(200)).toBe(BOOKLET_MAX_HEIGHT);
  });
});

describe("painting a word for a shared page", () => {
  it("keeps Arabic letters together with their marks, so they join and the marks stay on them", () => {
    expect(pieces("وَأَمَّا")).toEqual([{ text: "وَأَمَّا", at: 0, arabic: true }]);
    expect(pieces("ٱلرَّحۡمَٰنِ")).toEqual([{ text: "ٱلرَّحۡمَٰنِ", at: 0, arabic: true }]);
  });

  it("separates digits and punctuation, each drawn where the page shows it", () => {
    expect(pieces("(810)").map((p) => p.text)).toEqual(["(", "8", "1", "0", ")"]);
    expect(pieces("{وَأَمَّا")).toEqual([
      { text: "{", at: 0, arabic: false },
      { text: "وَأَمَّا", at: 1, arabic: true },
    ]);
    expect(pieces("عنه.").map((p) => [p.text, p.arabic])).toEqual([
      ["عنه", true],
      [".", false],
    ]);
  });
});
