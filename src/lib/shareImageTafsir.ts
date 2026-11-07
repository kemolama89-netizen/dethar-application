// The portrait card for a verse shared with its Tafsir (lib/tafsirShare.ts), made for
// a phone held upright and WhatsApp's full-screen viewer, which fits the whole
// image to the screen's width.
//
//  - One reading column, top to bottom: the kind label between gold rules (the
//    portrait card's own header), the verse alone in the bundled Qur'anic font with
//    its end sign, its reference, a gold rule that carries the Tafsir's label, the
//    Tafsir right-aligned (each paragraph from the line's start), its source, and
//    DITHAR's name beneath — inside the app's gold-framed reading card.
//  - Sized for what the phone shows: 1080 wide, so on a 390 px screen the Tafsir's
//    44 px are about 16 px and the verse's 68 px about 25 px. Lines stay at about 50
//    characters (PAD_X), a comfortable length for Arabic.
//  - Nothing is cut and no character changes. A short Tafsir fills a 4:5 card, set
//    a little larger; a longer one makes the card taller, up to one phone screen
//    (9:19.5). Past that the text gets smaller, never below TEXT_FLOOR; then the card
//    grows taller still (the reader zooms in), to 4096 px, the most WhatsApp keeps;
//    only a Tafsir too long even for that (about 1% of verses) is set below the floor.
//  - A long verse takes a smaller size of its own (to VERSE_FLOOR), so it never fills
//    the whole first screen; it is always larger than the Tafsir.
//  - Drawn at up to 2× (renderShareImage), never past WhatsApp's 4096 px long side,
//    so the letters stay sharp after it recompresses the photo.
//
// Pure layout here (given [measure]) so it is tested without a canvas.
import type { ShareableContent } from "./shareContent";
import { verseEndSign, wrapQuranText, wrapText } from "./shareImage";
import type { ShareImageColors } from "./shareImage";

export const TAFSIR_CARD_WIDTH = 1080;
/** 4:5, the smallest card: a portrait photo in WhatsApp. */
export const TAFSIR_CARD_MIN_HEIGHT = 1350;
/** 9:19.5, a phone's own screen: up to here the whole card shows at full width. */
export const TAFSIR_CARD_SCREEN_HEIGHT = 2340;
/** The most pixels drawn: 4096 × 4096, the canvas every Android WebView can encode. */
export const TAFSIR_CARD_MAX_PIXELS = 16_777_216;
/**
 * WhatsApp keeps at most this many pixels on an image's long side ("HD"): drawing more only makes a
 * bigger file, and a card taller than this would come out narrower than a phone after it scales it.
 * So it is also the tallest card.
 */
const LONG_SIDE = 4096;
export const TAFSIR_CARD_MAX_HEIGHT = LONG_SIDE;
const MAX_RATIO = 2;

const PAD_X = 108;
/** Below the kind label (drawn at y 140 by the renderer). */
export const TAFSIR_CARD_BODY_TOP = 196;
/** The portrait card's footer: gold rule, دِثار, D I T H A R. */
export const TAFSIR_CARD_FOOTER_H = 190;
const BODY_BOTTOM_GAP = 28;

const VERSE_SIZE = 68;
const VERSE_LEADING = 1.95;
/** A long verse is set smaller, to this, so it leaves room on the first screen for its Tafsir. */
const VERSE_FLOOR = 0.75;
/** The share of one screen's body a verse may take before it is set smaller. */
const VERSE_SHARE = 0.4;
const TEXT_SIZE = 44;
const TEXT_LEADING = 1.8;
/** A short Tafsir is set larger, up to this, so the 4:5 card is filled rather than left empty. */
const TEXT_MAX = 1.15;
/** The smallest the Tafsir is set before the card grows past one screen: 36 px, about 13 px on a phone. */
export const TEXT_FLOOR = 0.82;

const TAJAWAL = '"Tajawal", "Segoe UI", sans-serif';

/** The Tafsir's text on a light card: a near-black charcoal, 14:1 or more on every light look's surface. */
export const TAFSIR_INK_ON_LIGHT = "#20231f";
/** Its source line on a light card: a green-grey, 6.5:1 or more, still clearly lighter than the text. */
export const TAFSIR_SOURCE_ON_LIGHT = "#4d5a51";
/** The Tafsir's weight: Tajawal's regular text weight, as on the rest of the card. */
export const TAFSIR_WEIGHT = 500;
/** Its gold label on a light card: the palette's gold is 2.2:1 there; this deeper gold is 5.5:1. */
export const TAFSIR_GOLD_ON_LIGHT = "#7a5c22";

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/**
 * The Tafsir's own colours on the card. On a light card (Classic, Nature, Sunset) its text is
 * near-black charcoal and its label a deeper gold; on a dark one (Night) the palette's light text
 * and gold stay. The verse keeps the palette's ink throughout.
 */
export function tafsirColors(colors: ShareImageColors): { body: string; label: string; source: string } {
  const light = /^#[0-9a-f]{6}$/i.test(colors.surface) && luminance(colors.surface) > 0.5;
  return light
    ? { body: TAFSIR_INK_ON_LIGHT, label: TAFSIR_GOLD_ON_LIGHT, source: TAFSIR_SOURCE_ON_LIGHT }
    : { body: colors.ink, label: colors.gold, source: mix(colors.muted, colors.ink, 0.35) };
}

/** [a] moved [t] of the way toward [b] (#rrggbb); [a] itself when either isn't one. */
function mix(a: string, b: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const at = (s: string, i: number) => Number.parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(at(a, i) + (at(b, i) - at(a, i)) * t).toString(16).padStart(2, "0")).join("")}`;
}

export type TafsirLineRole = "verse" | "reference" | "label" | "tafsir" | "source";

export interface TafsirCardLine {
  text: string;
  role: TafsirLineRole;
  font: string;
  color: string;
  dir: "rtl" | "ltr";
  align: "center" | "right" | "left";
  /** Where the line is drawn: its x (centre, right or left edge) and the middle of its line box. */
  x: number;
  y: number;
}

export interface TafsirCardLayout {
  /** In design units; the canvas is these × [ratio]. */
  width: number;
  height: number;
  /** The Tafsir's scale against its design size (1 = 44 px). */
  scale: number;
  /** The verse's own scale (1 = 68 px). */
  verseScale: number;
  /** Pixels per design unit. */
  ratio: number;
  lines: TafsirCardLine[];
  /** The gold rule that carries the Tafsir's label: drawn from the frame's padding to either side of the label. */
  rule: { y: number; gapLeft: number; gapRight: number; left: number; right: number } | null;
}

type Measure = (font: string, s: string) => number;

interface Row {
  text: string;
  role: TafsirLineRole;
  font: string;
  color: string;
  dir: "rtl" | "ltr";
  align: "center" | "start";
  height: number;
  /** Space above it. */
  gap: number;
}

const isArabic = (s: string) => /[؀-ۿ]/.test(s);
const px = (n: number) => Math.round(n * 100) / 100;
const TEXT_W = TAFSIR_CARD_WIDTH - PAD_X * 2;
const screenBody = TAFSIR_CARD_SCREEN_HEIGHT - TAFSIR_CARD_BODY_TOP - TAFSIR_CARD_FOOTER_H - BODY_BOTTOM_GAP;

function verseRows(content: ShareableContent, measure: Measure, zv: number, colors: ShareImageColors): Row[] {
  const size = VERSE_SIZE * zv;
  const font = `400 ${px(size)}px "Scheherazade New"`;
  const text = content.quranVerse ? `${content.textAr} ${verseEndSign(content.quranVerse.ayah)}` : content.textAr;
  // Balanced, so a long verse doesn't end on one word alone: only where its lines break changes, never a character.
  const lines = balanced(TEXT_W, (w) => (content.quranVerse ? wrapQuranText(text, w, (s) => measure(font, s)) : wrapText(text, w, (s) => measure(font, s))));
  return lines.map((line) => ({ text: line, role: "verse", font, color: colors.ink, dir: "rtl", align: "center", height: size * VERSE_LEADING, gap: 0 }));
}

function rows(content: ShareableContent, language: "ar" | "en", colors: ShareImageColors, measure: Measure, z: number, zv: number): Row[] {
  const out = verseRows(content, measure, zv, colors);
  const uiDir = language === "en" ? "ltr" : "rtl";
  if (content.reference) {
    const font = `500 30px ${TAJAWAL}`;
    const label = language === "en" ? "Source: " : "المصدر: ";
    wrapText(`${label}${content.reference}`, TEXT_W, (s) => measure(font, s)).forEach((line, i) =>
      out.push({ text: line, role: "reference", font, color: colors.muted, dir: uiDir, align: "center", height: 30 * 1.55, gap: i === 0 ? 24 : 0 }),
    );
  }
  const own = tafsirColors(colors);
  for (const section of content.sections ?? []) {
    const text = section.imageText ?? section.text;
    if (!text.trim()) continue;
    const labelFont = `700 30px ${TAJAWAL}`;
    out.push({ text: section.label, role: "label", font: labelFont, color: own.label, dir: uiDir, align: "center", height: 30 * 1.6, gap: 64 });
    const size = TEXT_SIZE * z;
    const font = `${TAFSIR_WEIGHT} ${px(size)}px ${TAJAWAL}`;
    const dir = isArabic(text) ? "rtl" : "ltr";
    // After a short one-line paragraph (a heading such as «وهي مكية») the gap is smaller, so the opening reads as one passage, not a list.
    let shortBefore = false;
    text
      .split("\n")
      .filter((p) => p.trim())
      .forEach((paragraph, p) => {
        const lines = wrapText(paragraph, TEXT_W, (s) => measure(font, s));
        lines.forEach((line, i) =>
          out.push({ text: line, role: "tafsir", font, color: own.body, dir, align: "start", height: size * TEXT_LEADING, gap: i === 0 ? (p === 0 ? 32 : size * (shortBefore ? 0.15 : 0.55)) : 0 }),
        );
        shortBefore = lines.length === 1 && measure(font, lines[0]) < TEXT_W * 0.6;
      });
    const metaFont = `500 ${px(24 * Math.max(z, 1))}px ${TAJAWAL}`;
    for (const meta of [section.source, section.note]) {
      if (!meta?.trim()) continue;
      // Balanced, and never broken inside parentheses («(تفسير السعدي)» stays on one line).
      const keep = meta.replace(/\([^)]*\)/g, (m) => m.replace(/ /g, "\u00A0"));
      balanced(TEXT_W, (w) => wrapText(keep, w, (s) => measure(metaFont, s)).map((l) => l.replace(/\u00A0/g, " "))).forEach((line, i) =>
        out.push({ text: line, role: "source", font: metaFont, color: own.source, dir: isArabic(line) ? "rtl" : "ltr", align: "center", height: 24 * Math.max(z, 1) * 1.6, gap: i === 0 ? 36 : 0 }),
      );
    }
  }
  return out;
}

/** [wrap] at the narrowest width that still takes no more lines than at [width], so a centred line isn't left with a single word. */
function balanced(width: number, wrap: (width: number) => string[]): string[] {
  const lines = wrap(width);
  if (lines.length < 2) return lines;
  let lo = width / lines.length;
  let hi = width;
  while (hi - lo > 4) {
    const mid = (lo + hi) / 2;
    if (wrap(mid).length <= lines.length) hi = mid;
    else lo = mid;
  }
  return wrap(hi);
}

const stackHeight = (list: Row[]) => list.reduce((h, r, i) => h + r.height + (i ? r.gap : 0), 0);
/** The card's height for a body [bodyH] tall. */
const cardHeight = (bodyH: number) => Math.ceil(TAFSIR_CARD_BODY_TOP + bodyH + BODY_BOTTOM_GAP + TAFSIR_CARD_FOOTER_H);

/** The verse's scale: full size unless it would take more than VERSE_SHARE of a screen; then smaller, to VERSE_FLOOR. */
function verseScale(content: ShareableContent, colors: ShareImageColors, measure: Measure): number {
  for (let zv = 1; zv > VERSE_FLOOR; zv -= 0.05) {
    if (stackHeight(verseRows(content, measure, zv, colors)) <= screenBody * VERSE_SHARE) return zv;
  }
  return VERSE_FLOOR;
}

/** The largest scale in [lo, hi] whose body is no taller than [maxBody]; null if even [lo] isn't. */
function largestFitting(maxBody: number, lo: number, hi: number, bodyAt: (z: number) => number): number | null {
  if (bodyAt(lo) > maxBody) return null;
  if (bodyAt(hi) <= maxBody) return hi;
  while (hi - lo > 0.01) {
    const mid = (lo + hi) / 2;
    if (bodyAt(mid) <= maxBody) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The card for [content]: 1080×1350 when it fits; taller, to one phone screen (1080×2340),
 * when the Tafsir needs it; then smaller text, to TEXT_FLOOR; then taller again. Always portrait.
 */
export function layoutTafsirCard(content: ShareableContent, language: "ar" | "en", colors: ShareImageColors, measure: Measure): TafsirCardLayout {
  const W = TAFSIR_CARD_WIDTH;
  const minBody = TAFSIR_CARD_MIN_HEIGHT - TAFSIR_CARD_BODY_TOP - BODY_BOTTOM_GAP - TAFSIR_CARD_FOOTER_H;
  const maxBody = TAFSIR_CARD_MAX_HEIGHT - TAFSIR_CARD_BODY_TOP - BODY_BOTTOM_GAP - TAFSIR_CARD_FOOTER_H;
  const textScale = (zv: number) => {
    const bodyAt = (z: number) => stackHeight(rows(content, language, colors, measure, z, zv));
    return (
      largestFitting(minBody, 1, TEXT_MAX, bodyAt) ?? // fills the 4:5 card, a little larger
      (bodyAt(1) <= screenBody ? 1 : null) ?? // a taller card, up to one screen, at full size
      largestFitting(screenBody, TEXT_FLOOR, 1, bodyAt) ?? // one screen, smaller text
      (bodyAt(TEXT_FLOOR) <= maxBody ? TEXT_FLOOR : null) ?? // taller than a screen, at the floor
      largestFitting(maxBody, 0.05, TEXT_FLOOR, bodyAt) // the very longest: as large as the tallest card allows
    );
  };
  let zv = verseScale(content, colors, measure);
  let z = textScale(zv);
  // A verse that alone would overflow the tallest card (none in the Qur'an at these sizes) goes below its floor too, rather than fail.
  while (z === null && zv > 0.1) {
    zv = Math.max(0.1, zv - 0.1);
    z = textScale(zv);
  }
  if (z === null) throw new Error("text too long for the Tafsir card");

  const list = rows(content, language, colors, measure, z, zv);
  const bodyH = stackHeight(list);
  const height = Math.max(TAFSIR_CARD_MIN_HEIGHT, cardHeight(bodyH));
  // Centred between the header and the footer (only a 4:5 card has room to spare).
  const avail = height - TAFSIR_CARD_BODY_TOP - BODY_BOTTOM_GAP - TAFSIR_CARD_FOOTER_H;
  let y = TAFSIR_CARD_BODY_TOP + Math.max(0, (avail - bodyH) / 2);
  const lines: TafsirCardLine[] = [];
  let rule: TafsirCardLayout["rule"] = null;
  list.forEach((row, i) => {
    if (i) y += row.gap;
    const align = row.align === "center" ? "center" : row.dir === "rtl" ? "right" : "left";
    const x = align === "center" ? W / 2 : align === "right" ? W - PAD_X : PAD_X;
    const mid = y + row.height / 2;
    lines.push({ text: row.text, role: row.role, font: row.font, color: row.color, dir: row.dir, align, x, y: mid });
    if (row.role === "label" && !rule) {
      const half = measure(row.font, row.text) / 2 + 28;
      rule = { y: mid, left: PAD_X, right: W - PAD_X, gapLeft: W / 2 - half, gapRight: W / 2 + half };
    }
    y += row.height;
  });

  const ratio = Math.max(1, Math.min(MAX_RATIO, LONG_SIDE / height, Math.sqrt(TAFSIR_CARD_MAX_PIXELS / (W * height))));
  return { width: W, height, scale: z, verseScale: zv, ratio, lines, rule };
}
