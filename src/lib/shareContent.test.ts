import { describe, expect, it } from "vitest";
import { composeShareText } from "./shareContent";
import { centreInFrame, coverRect, fitShareImage, layoutShareImage, MAX_IMAGE_HEIGHT, MIN_PHOTO_HEIGHT, wrapText } from "./shareImage";
import type { ShareImageColors } from "./shareImage";

const COLORS: ShareImageColors = { bg: "#000", surface: "#111", ink: "#222", muted: "#333", gold: "#444", primary: "#555" };
// A fake text measure: every character is as wide as its font size × 0.5.
const measure = (font: string, s: string) => s.length * Number(/(\d+)px/.exec(font)![1]) * 0.5;

describe("composeShareText", () => {
  const content = { kindLabel: "حديث", textAr: "ألا أنبئكم بخير أعمالكم", meaningEn: "Shall I not tell you…", reference: "الترمذي 3377" };

  it("carries the complete Arabic text, its reference and DITHAR's name", () => {
    const text = composeShareText(content, "ar");
    expect(text).toContain(content.textAr);
    expect(text).toContain("المصدر: الترمذي 3377");
    expect(text).toContain("دِثار");
    // Arabic mode never adds the English meaning.
    expect(text).not.toContain("Shall I not");
  });

  it("adds the established English meaning in English mode", () => {
    const text = composeShareText(content, "en");
    expect(text.indexOf(content.textAr)).toBe(0);
    expect(text).toContain("Shall I not tell you…");
    expect(text).toContain("Source: الترمذي 3377");
  });

  it("never shortens a long text and omits a missing reference", () => {
    const long = "سبحان الله ".repeat(500).trim();
    const text = composeShareText({ textAr: long }, "ar");
    expect(text.startsWith(long)).toBe(true);
    expect(text).not.toContain("المصدر");
  });
});

describe("share image layout", () => {
  it("wraps at spaces only, never splitting a word, and keeps every word", () => {
    const text = "بسم الله الرحمن الرحيم الحمد لله رب العالمين";
    const lines = wrapText(text, 60, (s) => s.length * 5);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) for (const word of line.split(" ")) expect(text.split(" ")).toContain(word);
  });

  it("keeps a poem's line breaks", () => {
    expect(wrapText("بيت أول\nبيت ثان", 1000, (s) => s.length)).toEqual(["بيت أول", "بيت ثان"]);
  });

  it("places the text, the meaning (English mode) and the reference, growing taller to fit", () => {
    const short = layoutShareImage({ textAr: "سبحان الله", reference: "مسلم" }, "ar", COLORS, measure);
    const long = layoutShareImage({ textAr: "سبحان الله وبحمده ".repeat(60), reference: "مسلم" }, "ar", COLORS, measure);
    expect(short.blocks).toHaveLength(2);
    expect(long.height).toBeGreaterThan(short.height);
    const en = layoutShareImage({ textAr: "سبحان الله", meaningEn: "Glory be to Allah", reference: "Muslim" }, "en", COLORS, measure);
    expect(en.blocks.map((b) => b.dir)).toEqual(["rtl", "ltr", "ltr"]);
    // Blocks never overlap.
    for (let i = 1; i < en.blocks.length; i++) {
      const prev = en.blocks[i - 1];
      expect(en.blocks[i].top).toBeGreaterThanOrEqual(prev.top + prev.lines.length * prev.lineHeight);
    }
  });

  it("draws a very long text smaller rather than cropping it — every word is still there", () => {
    const text = "لا إله إلا الله وحده لا شريك له ".repeat(400).trim();
    const layout = fitShareImage({ textAr: text }, "ar", COLORS, measure);
    expect(layout.scale).toBeLessThan(1);
    expect(layout.blocks[0].lines.join(" ")).toBe(text);
    expect(layout.height).toBeGreaterThan(0);
    const fits = fitShareImage({ textAr: "سبحان الله ".repeat(100) }, "ar", COLORS, measure);
    expect(fits.height).toBeLessThanOrEqual(MAX_IMAGE_HEIGHT);
  });
});

describe("Qur'anic marks in the image", () => {
  it("keeps a waqf mark with its word (never alone at a line start), without changing any letter", () => {
    const text = "ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ";
    const lines = wrapText(text, 40, (s) => s.length * 4);
    for (const line of lines) expect(line).not.toMatch(/^[ۖ-ۭ]/);
    // Only the space before each mark became a no-break space.
    expect(lines.join(" ").replace(/ /g, " ")).toBe(text);
  });
});

describe("share image on a photo background", () => {
  it("crops the photo exactly like CSS background-size: cover, centred", () => {
    // A landscape photo in a portrait frame: full height, centred horizontally.
    const wide = coverRect(2000, 1000, 1080, 1350);
    expect(wide.sx).toBeCloseTo(600);
    expect(wide.sy).toBeCloseTo(0);
    expect(wide.sw).toBeCloseTo(800);
    expect(wide.sh).toBeCloseTo(1000);
    // A tall photo in a wide frame: full width, centred vertically.
    const r = coverRect(1000, 3000, 1080, 1350);
    expect(r.sx).toBeCloseTo(0);
    expect(r.sw).toBeCloseTo(1000);
    expect(r.sy).toBeCloseTo((3000 - 1250) / 2);
  });

  it("centres a short text in the 4:5 frame and never shrinks a tall one", () => {
    const short = layoutShareImage({ textAr: "سبحان الله", reference: "مسلم" }, "ar", COLORS, measure);
    const framed = centreInFrame(short, MIN_PHOTO_HEIGHT);
    expect(framed.height).toBe(MIN_PHOTO_HEIGHT);
    expect(framed.blocks[0].top - short.blocks[0].top).toBe(Math.round((MIN_PHOTO_HEIGHT - short.height) / 2));
    const tall = layoutShareImage({ textAr: "سبحان الله وبحمده ".repeat(120) }, "ar", COLORS, measure);
    expect(centreInFrame(tall, MIN_PHOTO_HEIGHT).height).toBe(tall.height);
  });

  it("leaves the shared text unchanged — the background only concerns the image", () => {
    const content = { kindLabel: "حديث", textAr: "ألا أنبئكم بخير أعمالكم", reference: "الترمذي 3377" };
    expect(composeShareText({ ...content, background: "/backgrounds/mosque-night.jpg" }, "ar")).toBe(composeShareText(content, "ar"));
  });
});

describe("sharing the commentary and evidence with the text", () => {
  const content = {
    kindLabel: "لطائف قرآنية",
    textAr: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    reference: "القرآن الكريم — الشرح: 6",
    sections: [
      { label: "من التفسير", text: "تفسير كامل للآية لا يُختصر", source: "تفسير السعدي — ص 929" },
      { label: "تأمّل دِثار", text: "خاطرة", note: "خاطرة تعليمية من دِثار، وليست نصًّا مأثورًا." },
    ],
  };

  it("puts every section, its label, source and note into the text, after the reference", () => {
    const text = composeShareText(content, "ar");
    expect(text).toContain("من التفسير:\nتفسير كامل للآية لا يُختصر\nالمصدر: تفسير السعدي — ص 929");
    expect(text).toContain("تأمّل دِثار:\nخاطرة\n(خاطرة تعليمية من دِثار، وليست نصًّا مأثورًا.)");
    expect(text.indexOf("المصدر: القرآن الكريم")).toBeLessThan(text.indexOf("من التفسير"));
    expect(text.indexOf("من التفسير")).toBeLessThan(text.indexOf("تأمّل دِثار"));
    expect(text.endsWith("— من تطبيق دِثار")).toBe(true);
  });

  it("draws every section into the image, after the reference", () => {
    const layout = layoutShareImage(content, "ar", COLORS, measure);
    const all = layout.blocks.map((b) => b.lines.join(" "));
    expect(all.some((l) => l.includes("تفسير كامل للآية لا يُختصر"))).toBe(true);
    expect(all.some((l) => l.includes("تفسير السعدي"))).toBe(true);
    expect(all.some((l) => l.includes("وليست نصًّا مأثورًا"))).toBe(true);
    const plain = layoutShareImage({ ...content, sections: undefined }, "ar", COLORS, measure);
    expect(layout.height).toBeGreaterThan(plain.height);
    expect(layout.blocks.find((b) => b.lines.join(" ") === "من التفسير")?.color).toBe(COLORS.gold);
  });
});
