// The card, continued (Task 5): a long Tafsir shared as pages of the card, at its normal size.
import { describe, expect, it } from "vitest";
import { forCanvas } from "./shareImage";
import type { ShareImageColors } from "./shareImage";
import { TAFSIR_CARD_BODY_TOP, TAFSIR_CARD_FOOTER_H, TAFSIR_PAGE_FOLIO_H, TAFSIR_PAGE_HEIGHT, layoutTafsirCard, layoutTafsirPages, tafsirNeedsPages } from "./shareImageTafsir";
import { loadSaadiSurah, parseSaadiText } from "./saadiTafsir";
import { saadiTextForCard, saadiTextForSharing, tafsirShareContent } from "./tafsirShare";
import { dataUrlBytes, pdfFromJpegs, pdfTextString } from "./pdfFromJpegs";

const COLORS: ShareImageColors = { bg: "#000", surface: "#111", ink: "#222", muted: "#333", gold: "#444", primary: "#555" };
const measure = (font: string, s: string) => s.length * Number.parseFloat(/([\d.]+)px/.exec(font)![1]) * 0.5;
const LABELS = { kind: "آية مع تفسيرها", reference: "سورة البقرة · الآية ٢٥٥", tafsirLabel: "تفسير السعدي", source: "تيسير الكريم الرحمن — السعدي" };
// Placeholder words stand in for the verse: no Qur'an is typed here.
const content = (tafsir: string, verse = "نص الآية هنا") => tafsirShareContent({ surah: 2, ayah: 255, text: verse }, tafsir, LABELS);
const words = (s: string) => forCanvas(s).split(/\s+/).filter(Boolean);
const sizeOf = (font: string) => Number.parseFloat(/([\d.]+)px/.exec(font)![1]);
const bodyBottom = TAFSIR_PAGE_HEIGHT - TAFSIR_CARD_FOOTER_H - TAFSIR_PAGE_FOLIO_H;

async function stored(surah: number, ayah: number) {
  const s = await loadSaadiSurah(surah);
  const v = s!.ayat.find((x) => x.ayah === ayah)!;
  return parseSaadiText(v.text);
}

describe("short and medium Tafsir stay one card", () => {
  it("a few lines are one card", () => {
    expect(tafsirNeedsPages(content("كلمة ".repeat(40)), "ar", COLORS, measure)).toBe(false);
  });
  it("a Tafsir that would need smaller text on one screen becomes pages", () => {
    expect(tafsirNeedsPages(content("كلمة ".repeat(1500)), "ar", COLORS, measure)).toBe(true);
  });
});

describe("a long Tafsir as pages", () => {
  it("keeps every word of al-Sa'di's text, in order, at the normal size, on pages that never overflow", async () => {
    for (const [surah, ayah] of [
      [2, 255],
      [2, 282],
      [2, 186],
    ]) {
      const parsed = await stored(surah, ayah);
      const c = tafsirShareContent({ surah, ayah, text: "نص الآية هنا" }, saadiTextForSharing(parsed), LABELS, saadiTextForCard(parsed, ayah));
      const layout = layoutTafsirPages(c, "ar", COLORS, measure);
      const tafsir = layout.pages.flatMap((p) => p.lines.filter((l) => l.role === "tafsir"));
      expect(words(tafsir.map((l) => l.text).join(" "))).toEqual(words(c.sections![0].imageText ?? c.sections![0].text));
      // The normal size (44 px), never smaller.
      expect(new Set(tafsir.map((l) => sizeOf(l.font)))).toEqual(new Set([44]));
      for (const page of layout.pages) {
        for (const line of page.lines) {
          expect(line.y).toBeGreaterThan(TAFSIR_CARD_BODY_TOP);
          expect(line.y).toBeLessThan(bodyBottom);
        }
      }
      // Page 1 is the card's own opening; the others run on.
      expect(layout.pages[0].head).toBe("card");
      expect(layout.pages.slice(1).every((p) => p.head === "continued")).toBe(true);
    }
  });

  it("never ends a page with the Tafsir's label, and never leaves the source alone on the last page", async () => {
    const parsed = await stored(2, 255);
    const c = tafsirShareContent({ surah: 2, ayah: 255, text: "نص الآية هنا" }, saadiTextForSharing(parsed), LABELS, saadiTextForCard(parsed, 255));
    const layout = layoutTafsirPages(c, "ar", COLORS, measure);
    for (const page of layout.pages) {
      const roles = page.lines.map((l) => l.role);
      const label = roles.indexOf("label");
      if (label >= 0) expect(roles.slice(label + 1).filter((r) => r === "tafsir").length).toBeGreaterThanOrEqual(3);
    }
    const last = layout.pages[layout.pages.length - 1].lines.map((l) => l.role);
    expect(last).toContain("source");
    expect(last.filter((r) => r === "tafsir").length).toBeGreaterThanOrEqual(3);
  });

  it("splits a verse only when it alone is taller than a page, and says it goes on", () => {
    const longVerse = "كلمة ".repeat(900).trim();
    const layout = layoutTafsirPages(content("كلمة ".repeat(1500), longVerse), "ar", COLORS, measure);
    expect(layout.pages[0].verseContinues).toBe(true);
    expect(layout.pages[1].opensWithVerse).toBe(true);
    // A verse that fits a page is never split.
    const short = layoutTafsirPages(content("كلمة ".repeat(1500)), "ar", COLORS, measure);
    expect(short.pages.every((p) => !p.verseContinues)).toBe(true);
  });

  it("draws the same rows as the single card would at the normal size — only the page breaks are new", () => {
    const c = content("كلمة ".repeat(300));
    const single = layoutTafsirCard(c, "ar", COLORS, measure);
    const paged = layoutTafsirPages(c, "ar", COLORS, measure);
    if (single.scale === 1) {
      expect(paged.pages.flatMap((p) => p.lines.map((l) => l.text))).toEqual(single.lines.map((l) => l.text));
    }
  });
});

describe("the PDF of the pages", () => {
  // A 1×1 JPEG (its bytes go into the PDF unchanged).
  const JPEG = dataUrlBytes(
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  );
  const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

  it("has one page per image, in order, each image as it is, and a valid cross-reference table", () => {
    const pdf = pdfFromJpegs(
      [
        { jpeg: JPEG, width: 1620, height: 2880 },
        { jpeg: JPEG, width: 1620, height: 2880 },
        { jpeg: JPEG, width: 1620, height: 2880 },
      ],
      { title: "تفسير السعدي · سورة البقرة · الآية ٢٥٥", author: "الشيخ عبد الرحمن بن ناصر السعدي" },
    );
    const s = text(pdf);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(s).toContain("/Type /Pages /Count 3 /Kids [4 0 R 7 0 R 10 0 R]");
    expect(s.match(/\/Filter \/DCTDecode/g)).toHaveLength(3);
    expect(s).toContain("/MediaBox [0 0 540 960]");
    // Every xref offset points at its object.
    const xref = Number(/startxref\n(\d+)/.exec(s)![1]);
    const entries = s.slice(xref).split("\n").slice(3, 3 + 12);
    entries.forEach((line, i) => {
      const at = Number(line.slice(0, 10));
      expect(s.slice(at, at + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
    expect(s).toContain(`/Title ${pdfTextString("تفسير السعدي · سورة البقرة · الآية ٢٥٥")}`);
  });

  it("writes Arabic metadata as UTF-16 text", () => {
    // د ِ ث ا ر
    expect(pdfTextString("دِثار")).toBe("<FEFF062F0650062B06270631>");
  });

  it("refuses an empty document", () => {
    expect(() => pdfFromJpegs([])).toThrow();
  });
});
