// Draws a shared Hadith / dhikr / dua / reminder as a PNG card
// (lib/shareContent.ts): the complete Arabic text, its English meaning in
// English mode, its reference, every labelled section shown with it (tafsir,
// evidence, DITHAR's reflection — each with its source), and DITHAR's name — in the active palette, or,
// when the item was shown on a photo (the full-screen reminder's background),
// on that same photo with the same scrim, exactly as it was previewed.
//
//  - Drawn on a <canvas> by the WebView's own text engine, so Arabic is
//    shaped (joined letters, harakat, «») exactly as on screen; each line is
//    drawn with direction "rtl" (Arabic) or "ltr" (English).
//  - Nothing is ever cropped or cut: lines wrap at word boundaries (a word
//    is never split, which would break its letter joins) and the image
//    grows taller to fit. Only for very long texts is the whole card scaled
//    down — never below MIN_SCALE — so it stays within a canvas size every
//    Android WebView can encode.
//  - It waits for Amiri/Tajawal (index.html) before drawing; offline, the
//    system Arabic font is used instead, still correctly shaped.
import type { ShareableContent } from "./shareContent";

export const IMAGE_WIDTH = 1080;
/** Taller than this and the card is drawn smaller rather than risk an unencodable canvas. */
export const MAX_IMAGE_HEIGHT = 12_000;
const MIN_SCALE = 0.55;
const PAD_X = 96;

export interface ShareImageColors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  gold: string;
  primary: string;
}

/**
 * The Qur'an's small annotation marks (waqf signs such as ۚ ۖ ۗ) follow a
 * space in the text. On a <canvas>, Chromium draws a mark sitting on an
 * ordinary space detached from the line, where the page itself draws it in
 * place; on a no-break space the canvas draws it exactly as the page does.
 * So, for the image only — the shared text is never changed — that space
 * becomes a no-break space, which also keeps the mark with its word when
 * lines wrap.
 */
const QURAN_MARK_AFTER_SPACE = /[ \t]+(?=[\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED])/g;

export function forCanvas(text: string): string {
  return text.replace(QURAN_MARK_AFTER_SPACE, "\u00A0");
}

/** Splits [text] into lines no wider than [maxWidth], at ordinary spaces only (never a no-break space); a paragraph break (\n) always starts a new line. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of forCanvas(text).split(/\n/)) {
    const words = paragraph.split(/[ \t\r]+/).filter(Boolean);
    if (words.length === 0) {
      if (lines.length > 0) lines.push("");
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (measure(candidate) <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  // No trailing blank line from a final "\n".
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

interface Block {
  lines: string[];
  font: string;
  color: string;
  lineHeight: number;
  dir: "rtl" | "ltr";
  /** Space above this block. */
  gap: number;
}

export interface ShareImageLayout {
  width: number;
  height: number;
  scale: number;
  blocks: (Block & { top: number })[];
}

const HEADER_H = 150;
const FOOTER_H = 190;

/** Lays the card out at a given scale. Pure (given [measure]) — tested without a canvas. */
export function layoutShareImage(
  content: ShareableContent,
  language: "ar" | "en",
  colors: ShareImageColors,
  measure: (font: string, s: string) => number,
  scale = 1,
): ShareImageLayout {
  const maxWidth = IMAGE_WIDTH - PAD_X * 2;
  const px = (n: number) => Math.round(n * scale);
  const blocks: Block[] = [];
  const push = (text: string, font: string, color: string, size: number, lh: number, dir: "rtl" | "ltr", gap: number) => {
    const lines = wrapText(text, maxWidth, (s) => measure(font, s));
    if (lines.length) blocks.push({ lines, font, color, lineHeight: Math.round(size * lh), dir, gap });
  };
  const arSize = px(content.isPoetry ? 50 : 56);
  push(content.textAr, `700 ${arSize}px "Amiri", "Noto Naskh Arabic", serif`, colors.ink, arSize, 1.85, "rtl", 0);
  if (language === "en" && content.meaningEn) {
    const size = px(34);
    push(content.meaningEn, `italic 400 ${size}px "Tajawal", "Segoe UI", sans-serif`, colors.muted, size, 1.5, "ltr", px(44));
  }
  if (content.reference) {
    const size = px(30);
    const label = language === "en" ? "Source: " : "المصدر: ";
    push(`${label}${content.reference}`, `500 ${size}px "Tajawal", "Segoe UI", sans-serif`, colors.muted, size, 1.55, language === "en" ? "ltr" : "rtl", px(56));
  }
  // Each section: its label in gold, its complete text, then its source and note — the same order as on screen.
  const uiDir = language === "en" ? "ltr" : "rtl";
  for (const section of content.sections ?? []) {
    if (!section.text.trim()) continue;
    const labelSize = px(28);
    push(section.label, `700 ${labelSize}px "Tajawal", "Segoe UI", sans-serif`, colors.gold, labelSize, 1.5, uiDir, px(60));
    const size = px(36);
    // Arabic text (a verse, a tafsir) reads right to left even in English mode; English text left to right.
    const dir = /[\u0600-\u06FF]/.test(section.text) ? "rtl" : "ltr";
    push(section.text, `500 ${size}px "Tajawal", "Segoe UI", sans-serif`, colors.ink, size, 1.7, dir, px(12));
    const metaSize = px(26);
    const meta = `500 ${metaSize}px "Tajawal", "Segoe UI", sans-serif`;
    if (section.source?.trim()) push(section.source, meta, colors.muted, metaSize, 1.5, uiDir, px(12));
    if (section.note?.trim()) push(section.note, meta, colors.muted, metaSize, 1.5, uiDir, px(8));
  }

  let y = HEADER_H + 40;
  const placed = blocks.map((b) => {
    y += b.gap;
    const top = y;
    y += b.lines.length * b.lineHeight;
    return { ...b, top };
  });
  return { width: IMAGE_WIDTH, height: Math.ceil(y + 40 + FOOTER_H), scale, blocks: placed };
}

/** The largest scale (≤ 1, ≥ MIN_SCALE) whose layout fits MAX_IMAGE_HEIGHT; the smallest one otherwise — taller, but still complete. */
export function fitShareImage(
  content: ShareableContent,
  language: "ar" | "en",
  colors: ShareImageColors,
  measure: (font: string, s: string) => number,
): ShareImageLayout {
  let layout = layoutShareImage(content, language, colors, measure, 1);
  let scale = 1;
  while (layout.height > MAX_IMAGE_HEIGHT && scale > MIN_SCALE) {
    scale = Math.max(MIN_SCALE, scale - 0.05);
    layout = layoutShareImage(content, language, colors, measure, scale);
  }
  return layout;
}

/** The active palette, read from the page (theme and colour choice), with DITHAR's default navy/gold as fallback. */
export function currentShareColors(): ShareImageColors {
  const fallback: ShareImageColors = { bg: "#f2e9da", surface: "#f8f1e4", ink: "#12213f", muted: "#6b6558", gold: "#c6a15b", primary: "#12213f" };
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  // The theme's variables live on ThemeContext's [data-theme] wrapper, not on <body>.
  const style = getComputedStyle(document.querySelector("[data-theme]") ?? document.body ?? document.documentElement);
  const read = (name: string, alt: string) => style.getPropertyValue(name).trim() || alt;
  return {
    bg: read("--color-bg", fallback.bg),
    surface: read("--color-surface", fallback.surface),
    ink: read("--color-text-primary", fallback.ink),
    muted: read("--color-text-muted", fallback.muted),
    gold: read("--color-gold", fallback.gold),
    primary: read("--color-primary", fallback.primary),
  };
}

async function fontsReady(text: string): Promise<void> {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts || typeof fonts.load !== "function") return;
  const wait = Promise.all([
    fonts.load('700 56px "Amiri"', text.slice(0, 200) || "ذكر"),
    fonts.load('500 30px "Tajawal"', "المصدر DITHAR"),
    fonts.load('italic 400 34px "Tajawal"', "Meaning"),
  ]).catch(() => undefined);
  // Offline the web fonts may never arrive: the system Arabic font is used after a short wait.
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2_500))]);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A photo image is at least this tall (4:5 portrait), so the photo is cropped like the phone screen that previewed it, not to a strip. */
export const MIN_PHOTO_HEIGHT = 1350;

/** The part of an image that `background-size: cover; background-position: center` shows in a W×H box. */
export function coverRect(imgW: number, imgH: number, W: number, H: number): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(W / imgW, H / imgH);
  const sw = W / scale;
  const sh = H / scale;
  return { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh };
}

/** Moves the text blocks down so they sit centred between header and footer in a frame [height] tall (as the reminder view centres them). */
export function centreInFrame(layout: ShareImageLayout, height: number): ShareImageLayout {
  const shift = Math.max(0, Math.round((height - layout.height) / 2));
  return { ...layout, height: Math.max(height, layout.height), blocks: layout.blocks.map((b) => ({ ...b, top: b.top + shift })) };
}

/** The reminder view's colours on a photo: white text, the palette's light accent, and its tint for the scrim. */
function photoStyle(): { colors: ShareImageColors; accent: string; tintRgb: string } {
  const el = typeof document !== "undefined" ? document.querySelector("[data-theme]") ?? document.body : null;
  const style = el && typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  const read = (name: string, alt: string) => style?.getPropertyValue(name).trim() || alt;
  const accent = read("--color-accent-on-dark", "#e6d5a7");
  return {
    accent,
    tintRgb: read("--reminder-tint-rgb", "18, 33, 63"),
    colors: { bg: "#000", surface: "#000", ink: "#ffffff", muted: "rgba(255,255,255,0.88)", gold: accent, primary: "#ffffff" },
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("background unavailable"));
    img.src = url;
  });
}

/** Draws the card and returns it as a PNG data URL. */
export async function renderShareImage(content: ShareableContent, language: "ar" | "en", palette = currentShareColors()): Promise<string> {
  let colors = palette;
  await fontsReady(content.textAr);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const measure = (font: string, s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };
  // On a photo (the background the full-screen reminder showed it on): that photo, its scrim, white text.
  const photo = content.background ? await loadImage(content.background) : null;
  const style = photo ? photoStyle() : null;
  if (style) colors = style.colors;
  let layout = fitShareImage(content, language, colors, measure);
  if (photo) layout = centreInFrame(layout, MIN_PHOTO_HEIGHT);
  canvas.width = layout.width;
  canvas.height = layout.height;
  const W = layout.width;
  const H = layout.height;

  if (photo && style) {
    // Exactly the reminder view: the photo (cover, centred), then its two scrims —
    // a wash of the palette's primary (0.22 → 0.12) over a darkening (0.38 → 0.5 at 40% → 0.62).
    const r = coverRect(photo.naturalWidth, photo.naturalHeight, W, H);
    ctx.drawImage(photo, r.sx, r.sy, r.sw, r.sh, 0, 0, W, H);
    const dark = ctx.createLinearGradient(0, 0, 0, H);
    dark.addColorStop(0, "rgba(0,0,0,0.38)");
    dark.addColorStop(0.4, "rgba(0,0,0,0.5)");
    dark.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    const tint = ctx.createLinearGradient(0, 0, 0, H);
    tint.addColorStop(0, `rgba(${style.tintRgb}, 0.22)`);
    tint.addColorStop(1, `rgba(${style.tintRgb}, 0.12)`);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Page, then a framed card in the surface colour with a gold hairline — the app's own reading-card look.
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    roundRect(ctx, 36, 36, W - 72, H - 72, 44);
    ctx.fillStyle = colors.surface;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.gold;
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Header: the kind of text (حديث شريف، ذكر…) — between two short gold rules on the card; in the view's dark chip on a photo.
  ctx.fillStyle = colors.gold;
  if (!photo) ctx.fillRect(W / 2 - 30, 92, 60, 3);
  if (content.kindLabel) {
    ctx.direction = language === "en" ? "ltr" : "rtl";
    ctx.font = '700 32px "Tajawal", "Segoe UI", sans-serif';
    if (photo) {
      const w = ctx.measureText(content.kindLabel).width + 56;
      roundRect(ctx, W / 2 - w / 2, 108, w, 64, 32);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
      ctx.fillStyle = colors.gold;
    }
    ctx.fillText(content.kindLabel, W / 2, 140);
  }

  for (const block of layout.blocks) {
    ctx.font = block.font;
    ctx.fillStyle = block.color;
    ctx.direction = block.dir;
    // The view's text shadow (0 2px 12px rgba(0,0,0,0.55)), scaled to the image.
    if (photo) Object.assign(ctx, { shadowColor: "rgba(0,0,0,0.55)", shadowBlur: 26, shadowOffsetY: 4 });
    block.lines.forEach((line, i) => {
      if (line) ctx.fillText(line, W / 2, block.top + block.lineHeight * (i + 0.5));
    });
    Object.assign(ctx, { shadowColor: "transparent", shadowBlur: 0, shadowOffsetY: 0 });
  }

  // Footer: gold rule, then DITHAR's name.
  const footerTop = H - FOOTER_H;
  ctx.fillStyle = colors.gold;
  ctx.fillRect(W / 2 - 30, footerTop + 10, 60, 3);
  ctx.direction = "rtl";
  ctx.fillStyle = colors.primary;
  ctx.font = '700 46px "Amiri", "Noto Naskh Arabic", serif';
  ctx.fillText("دِثار", W / 2, footerTop + 70);
  ctx.direction = "ltr";
  ctx.fillStyle = colors.gold;
  ctx.font = '600 22px "Tajawal", "Segoe UI", sans-serif';
  ctx.fillText("D I T H A R", W / 2, footerTop + 118);

  return canvas.toDataURL("image/png");
}
