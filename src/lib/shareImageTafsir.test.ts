import { describe, expect, it } from "vitest";
import { forCanvas, verseEndSign } from "./shareImage";
import type { ShareImageColors } from "./shareImage";
import {
  TAFSIR_CARD_BODY_TOP,
  TAFSIR_CARD_FOOTER_H,
  TAFSIR_CARD_MAX_HEIGHT,
  TAFSIR_CARD_MIN_HEIGHT,
  TAFSIR_CARD_SCREEN_HEIGHT,
  TAFSIR_CARD_WIDTH,
  TEXT_FLOOR,
  layoutTafsirCard,
  luminance,
  tafsirColors,
} from "./shareImageTafsir";
import type { TafsirCardLayout } from "./shareImageTafsir";
import { loadSaadiSurah, parseSaadiText } from "./saadiTafsir";
import { saadiTextForSharing, tafsirShareContent } from "./tafsirShare";

const COLORS: ShareImageColors = { bg: "#000", surface: "#111", ink: "#222", muted: "#333", gold: "#444", primary: "#555" };
/** Half an em per character: close enough to Arabic text in these fonts to exercise wrapping. */
const measure = (font: string, s: string) => s.length * Number.parseFloat(/([\d.]+)px/.exec(font)![1]) * 0.5;

const LABELS = { kind: "آية مع تفسيرها", reference: "سورة يوسف · الآية ١١١", tafsirLabel: "تفسير السعدي", source: "تيسير الكريم الرحمن — السعدي" };
// Placeholder words stand in for the verse: no Qur'an is typed here.
const card = (tafsir: string, verse = "نص الآية هنا") => tafsirShareContent({ surah: 12, ayah: 111, text: verse }, tafsir, LABELS);

const role = (layout: TafsirCardLayout, r: string) => layout.lines.filter((l) => l.role === r);
/** The Tafsir's body lines, in reading order, joined. */
const bodyText = (layout: TafsirCardLayout) =>
  role(layout, "tafsir")
    .map((l) => l.text)
    .join(" ");
const words = (s: string) => forCanvas(s).split(/[\s]+/).filter(Boolean);
const sizeOf = (font: string) => Number.parseFloat(/([\d.]+)px/.exec(font)![1]);

function expectWellFormed(layout: TafsirCardLayout) {
  expect(layout.width).toBe(TAFSIR_CARD_WIDTH);
  expect(layout.height).toBeGreaterThanOrEqual(TAFSIR_CARD_MIN_HEIGHT);
  expect(layout.height).toBeLessThanOrEqual(TAFSIR_CARD_MAX_HEIGHT);
  expect(layout.height).toBeGreaterThan(layout.width); // Always portrait.
  // Sharp, but never more pixels than WhatsApp keeps or a WebView can encode.
  expect(layout.ratio).toBeGreaterThanOrEqual(1);
  expect(layout.height * layout.ratio).toBeLessThanOrEqual(4096 + 1);
  for (const line of layout.lines) {
    // Between the header and the footer, inside the frame.
    expect(line.y).toBeGreaterThan(TAFSIR_CARD_BODY_TOP);
    expect(line.y).toBeLessThan(layout.height - TAFSIR_CARD_FOOTER_H);
    expect(line.x).toBeGreaterThan(36);
    expect(line.x).toBeLessThan(layout.width - 36);
  }
  // Top to bottom, in order: verse, reference, label, Tafsir, source.
  const order = ["verse", "reference", "label", "tafsir", "source"];
  const ranks = layout.lines.map((l) => order.indexOf(l.role));
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  for (let i = 1; i < layout.lines.length; i++) expect(layout.lines[i].y).toBeGreaterThan(layout.lines[i - 1].y);
}

describe("the portrait Tafsir card", () => {
  it("is 4:5 for a short Tafsir, set a little larger, drawn at twice the size", () => {
    const layout = layoutTafsirCard(card("تفسير قصير للآية."), "ar", COLORS, measure);
    expectWellFormed(layout);
    expect(layout.height).toBe(TAFSIR_CARD_MIN_HEIGHT);
    expect(layout.scale).toBeGreaterThan(1);
    expect(layout.ratio).toBe(2);
  });

  it("stacks the verse above its Tafsir, in one right-aligned column, with the label on the gold rule", () => {
    const layout = layoutTafsirCard(card("فقرة من التفسير ".repeat(30).trim()), "ar", COLORS, measure);
    expectWellFormed(layout);
    const body = role(layout, "tafsir");
    expect(new Set(body.map((l) => `${l.align}:${l.x}`)).size).toBe(1);
    expect(body[0].align).toBe("right");
    expect(role(layout, "verse").every((l) => l.align === "center" && l.x === TAFSIR_CARD_WIDTH / 2)).toBe(true);
    const [label] = role(layout, "label");
    expect(layout.rule?.y).toBe(label.y);
    expect(layout.rule!.gapLeft).toBeLessThan(TAFSIR_CARD_WIDTH / 2);
    expect(layout.rule!.gapRight).toBeGreaterThan(TAFSIR_CARD_WIDTH / 2);
  });

  it("sets the Tafsir at least three times as large as the wide card did, on a phone's width", () => {
    // The wide card drew 28 px on a 1600 px image; on a phone both are shown at the screen's width.
    const layout = layoutTafsirCard(card("فقرة من التفسير ".repeat(30).trim()), "ar", COLORS, measure);
    const onPhone = sizeOf(role(layout, "tafsir")[0].font) / layout.width;
    expect(onPhone / (28 / 1600)).toBeGreaterThanOrEqual(2.3);
    expect(sizeOf(role(layout, "tafsir")[0].font)).toBeGreaterThanOrEqual(44);
  });

  it("draws the card's own Tafsir (without the verse's quotation) when it has one", () => {
    const content = tafsirShareContent({ surah: 2, ayah: 2, text: "نص الآية" }, "{نص الآية (2)}.\nالتفسير نفسه", LABELS, "التفسير نفسه");
    expect(bodyText(layoutTafsirCard(content, "ar", COLORS, measure))).toBe("التفسير نفسه");
  });

  it("grows taller, to one phone screen, before it makes the text smaller", () => {
    const medium = layoutTafsirCard(card("كلمة من التفسير ".repeat(30).trim()), "ar", COLORS, measure);
    expectWellFormed(medium);
    expect(medium.height).toBeGreaterThan(TAFSIR_CARD_MIN_HEIGHT);
    expect(medium.height).toBeLessThanOrEqual(TAFSIR_CARD_SCREEN_HEIGHT);
    expect(medium.scale).toBe(1);
  });

  it("past one screen keeps the text at its floor and grows taller", () => {
    const long = layoutTafsirCard(card("كلمة من التفسير ".repeat(100).trim()), "ar", COLORS, measure);
    expectWellFormed(long);
    expect(long.height).toBeGreaterThan(TAFSIR_CARD_SCREEN_HEIGHT);
    expect(long.scale).toBe(TEXT_FLOOR);
  });

  it("draws every word of every paragraph, in order, and the verse with its end sign", () => {
    const paragraphs = ["الفقرة الأولى من التفسير ".repeat(40).trim(), "فصل", "الفقرة الثالثة ".repeat(70).trim()];
    const content = card(paragraphs.join("\n"));
    const layout = layoutTafsirCard(content, "ar", COLORS, measure);
    expectWellFormed(layout);
    expect(bodyText(layout).split(" ")).toEqual(words(paragraphs.join(" ")));
    const verse = role(layout, "verse").map((l) => l.text).join(" ");
    expect(verse).toBe(`${content.textAr} ${verseEndSign(111)}`);
  });

  it("sets a long verse smaller, never below its floor and always larger than the Tafsir", () => {
    const longVerse = "كلمات الآية الطويلة ".repeat(25).trim();
    const layout = layoutTafsirCard(card("نص التفسير", longVerse), "ar", COLORS, measure);
    expectWellFormed(layout);
    expect(layout.verseScale).toBeLessThan(1);
    expect(layout.verseScale).toBeGreaterThanOrEqual(0.75);
    expect(sizeOf(role(layout, "verse")[0].font)).toBeGreaterThan(sizeOf(role(layout, "tafsir")[0].font));
    expect(role(layout, "verse").map((l) => l.text).join(" ")).toBe(`${longVerse} ${verseEndSign(111)}`);
  });

  it("in English, keeps the labels left to right and the Arabic Tafsir right to left", () => {
    const content = tafsirShareContent({ surah: 12, ayah: 111, text: "نص الآية" }, "نص التفسير", { kind: "A verse with its Tafsir", reference: "Surah Yusuf · Verse 111", tafsirLabel: "Tafsir al-Sa'di", source: "Taysir al-Karim al-Rahman — al-Sa'di" });
    const layout = layoutTafsirCard(content, "en", COLORS, measure);
    expectWellFormed(layout);
    expect(role(layout, "reference")[0]).toMatchObject({ text: "Source: Surah Yusuf · Verse 111", dir: "ltr", align: "center" });
    expect(role(layout, "label")[0]).toMatchObject({ dir: "ltr", align: "center" });
    expect(role(layout, "tafsir")[0]).toMatchObject({ dir: "rtl", align: "right" });
    expect(role(layout, "source")[0]).toMatchObject({ dir: "ltr", align: "center" });
  });

  it("leaves no single word alone on the source's last line", () => {
    const layout = layoutTafsirCard(
      tafsirShareContent({ surah: 1, ayah: 2, text: "نص" }, "نص التفسير", { ...LABELS, source: "كلمة ".repeat(15) + "أخيرة" }),
      "ar",
      COLORS,
      measure,
    );
    const source = role(layout, "source");
    expect(source.length).toBe(2);
    expect(source[1].text.split(" ").length).toBeGreaterThan(5);
  });

  it("never breaks the source inside parentheses, and draws its words unchanged", () => {
    const source = "كتاب التفسير الطويل العنوان جدا جدا جدا (تفسير المؤلف) — الشيخ المؤلف الكريم ابن فلان الفلاني";
    const layout = layoutTafsirCard(tafsirShareContent({ surah: 1, ayah: 2, text: "نص" }, "نص التفسير", { ...LABELS, source }), "ar", COLORS, measure);
    const lines = role(layout, "source").map((l) => l.text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((l) => l.includes("(تفسير المؤلف)"))).toBe(true);
    expect(lines.join(" ")).toBe(source);
  });

  it("balances a long verse's lines, so its last line isn't one word, and keeps every character", () => {
    const verse = "كلمات الآية ".repeat(12).trim();
    const content = card("نص التفسير", verse);
    const lines = role(layoutTafsirCard(content, "ar", COLORS, measure), "verse").map((l) => l.text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(`${verse} ${verseEndSign(111)}`);
    expect(lines[lines.length - 1].split(" ").length).toBeGreaterThan(2);
  });

  it("carries the longest Tafsir in the book (Yusuf 111) whole, within the tallest card WhatsApp keeps", async () => {
    const surah = await loadSaadiSurah(12);
    const raw = surah!.ayat.find((a) => a.ayah === 111)!.text;
    const tafsir = saadiTextForSharing(parseSaadiText(raw));
    expect(tafsir.length).toBeGreaterThan(15_000);
    const layout = layoutTafsirCard(card(tafsir), "ar", COLORS, measure);
    expectWellFormed(layout);
    expect(layout.scale).toBeLessThan(TEXT_FLOOR);
    // Every word, in order: nothing cut from the longest Tafsir.
    expect(bodyText(layout).split(" ")).toEqual(words(tafsir.split("\n").join(" ")));
  });
});

describe("the Tafsir's colours on the card", () => {
  // The four looks' card colours, as currentShareColors reads them in the app (Classic, Night, Nature, Sunset).
  const LOOKS: Record<string, ShareImageColors> = {
    classic: { bg: "#f2e9da", surface: "#f8f1e4", ink: "#12213f", muted: "#6b6558", gold: "#c6a15b", primary: "#12213f" },
    night: { bg: "#0d1733", surface: "#16224a", ink: "#f3e9d2", muted: "#aeb4c8", gold: "#c6a15b", primary: "#c6a15b" },
    nature: { bg: "#e9eddf", surface: "#f6f7ef", ink: "#2f3d2a", muted: "#58654e", gold: "#c6a15b", primary: "#24553a" },
    sunset: { bg: "#f3e6ef", surface: "#fbf4f8", ink: "#3b2f4f", muted: "#65577a", gold: "#c6a15b", primary: "#4a2c69" },
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each(Object.entries(LOOKS))("%s: the Tafsir reads at AAA contrast and its gold label above 4.5:1; the verse keeps the palette's ink", (_, colors) => {
    const own = tafsirColors(colors);
    expect(contrast(own.body, colors.surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(own.label, colors.surface)).toBeGreaterThanOrEqual(4.5);
    const layout = layoutTafsirCard(card("فقرة من التفسير ".repeat(20).trim()), "ar", colors, measure);
    expect(role(layout, "verse").every((l) => l.color === colors.ink)).toBe(true);
    expect(role(layout, "tafsir").every((l) => l.color === own.body)).toBe(true);
    expect(role(layout, "label").every((l) => l.color === own.label)).toBe(true);
    expect(bodyText(layout)).toBe("فقرة من التفسير ".repeat(20).trim());
  });

  it("is near-black charcoal on the light looks, and keeps Night's light text", () => {
    for (const look of ["classic", "nature", "sunset"]) expect(tafsirColors(LOOKS[look]).body).toBe("#20231f");
    expect(tafsirColors(LOOKS.night).body).toBe(LOOKS.night.ink);
    expect(tafsirColors(LOOKS.night).label).toBe(LOOKS.night.gold);
  });

  it.each(Object.entries(LOOKS))("%s: the source line is darker than the muted text, still secondary to the Tafsir", (_, colors) => {
    const own = tafsirColors(colors);
    expect(contrast(own.source, colors.surface)).toBeGreaterThan(contrast(colors.muted, colors.surface));
    expect(contrast(own.source, colors.surface)).toBeLessThan(contrast(own.body, colors.surface) * 0.8);
    const source = role(layoutTafsirCard(card("نص التفسير"), "ar", colors, measure), "source");
    expect(source.map((l) => l.text).join(" ")).toBe(LABELS.source);
    expect(source.every((l) => l.color === own.source)).toBe(true);
  });

  it("sets the Tafsir in the regular weight, and the verse in its own unchanged font", () => {
    const layout = layoutTafsirCard(card("نص التفسير"), "ar", LOOKS.classic, measure);
    expect(role(layout, "tafsir").every((l) => l.font.startsWith("500 "))).toBe(true);
    expect(role(layout, "verse").every((l) => l.font.startsWith("400 ") && l.font.includes("Scheherazade"))).toBe(true);
  });
});
