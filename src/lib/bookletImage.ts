// One image per page of the Tafsir booklet (components/basair/TafsirBooklet.tsx), for sharing.
//
// The page is painted from the booklet's own layout: every word is drawn, whole, where the
// booklet placed it (its line, its page), in the font and colour it is shown in — so an
// image is the page as read, letter for letter, and no word is broken or re-wrapped. Words
// are drawn one at a time; Arabic joins within a word, and words never join one another,
// so each is shaped exactly as on screen. Nothing is left out: every page is drawn.
import { pageOfText } from "./tafsirBooklet";

export interface BookletLayout {
  /** The booklet's page (its paper): the image has its size. */
  sheet: HTMLElement;
  /** The window one page of text shows through. */
  viewport: HTMLElement;
  /** The flowing text, laid out as columns — one column per page. */
  flow: HTMLElement;
  /** The flow's current horizontal shift (px) — the page on screen. */
  shift: number;
  /** Page width + gap (px). */
  step: number;
  rtl: boolean;
}

export interface BookletPageTexts {
  /** Top, at the start side: «تفسير السعدي». */
  title: string;
  /** Top, at the end side: the surah and verse. */
  reference: string;
  /** Bottom, centred: «٣ من ٩ · دِثار». */
  footer: string;
}

export const BOOKLET_COLORS = {
  backdrop: "#f2e9da",
  paper: "#fdf9ef",
  edge: "#d9c9a3",
  rule: "#e3d3ad",
  gold: "#b08a45",
  muted: "#8a7a5c",
  navy: "#12213f",
};

/**
 * Letters of the Arabic script with every mark on them (harakat are Unicode "Inherited", not
 * "Arabic"), the tatweel and the joiners: drawn together, so letters join and marks stay on them.
 */
const ARABIC = /[\p{Script=Arabic}\p{M}\u0640\u200c\u200d]/u;

/** A word as runs of Arabic letters (drawn whole) and single other characters (drawn where each stands). */
export function pieces(word: string): { text: string; at: number; arabic: boolean }[] {
  const out: { text: string; at: number; arabic: boolean }[] = [];
  let i = 0;
  for (const ch of word) {
    const arabic = ARABIC.test(ch);
    const last = out[out.length - 1];
    if (arabic && last?.arabic) last.text += ch;
    else out.push({ text: ch, at: i, arabic });
    i += ch.length;
  }
  return out;
}

const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Where a box of the flow lies on page [page], in the viewport's coordinates, or null when it is on another page. */
function onPage(rect: DOMRect, layout: BookletLayout, vp: DOMRect, page: number): { left: number; right: number; top: number; bottom: number } | null {
  const left0 = rect.left - layout.shift;
  const right0 = rect.right - layout.shift;
  const at = layout.rtl ? pageOfText(right0, vp.right, layout.step, true) : pageOfText(left0, vp.left, layout.step, false);
  if (at !== page) return null;
  const dx = layout.rtl ? page * layout.step : -page * layout.step;
  return { left: left0 + dx - vp.left, right: right0 + dx - vp.left, top: rect.top - vp.top, bottom: rect.bottom - vp.top };
}

/** Page [page] (0-based) of the booklet as a PNG data URL, [scale] times its on-screen size. */
export function paintBookletPage(layout: BookletLayout, page: number, texts: BookletPageTexts, scale = 3): string {
  const sheet = layout.sheet.getBoundingClientRect();
  const vp = layout.viewport.getBoundingClientRect();
  const margin = 14;
  const W = Math.round(sheet.width + margin * 2);
  const H = Math.round(sheet.height + margin * 2);
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.scale(scale, scale);
  const c = BOOKLET_COLORS;

  // The paper: the backdrop, the sheet with its edge, the double rule inside it.
  ctx.fillStyle = c.backdrop;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = "rgba(18, 33, 63, 0.16)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundedRect(ctx, margin, margin, sheet.width, sheet.height, 8);
  ctx.fillStyle = c.paper;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1;
  roundedRect(ctx, margin + 0.5, margin + 0.5, sheet.width - 1, sheet.height - 1, 8);
  ctx.stroke();
  ctx.strokeStyle = c.rule;
  roundedRect(ctx, margin + 7.5, margin + 7.5, sheet.width - 15, sheet.height - 15, 4);
  ctx.stroke();
  ctx.lineWidth = 0.5;
  roundedRect(ctx, margin + 10, margin + 10, sheet.width - 20, sheet.height - 20, 3);
  ctx.stroke();

  // The running head, as on the booklet.
  const startX = layout.rtl ? margin + sheet.width - 20 : margin + 20;
  const endX = layout.rtl ? margin + 20 : margin + sheet.width - 20;
  ctx.textBaseline = "alphabetic";
  ctx.direction = layout.rtl ? "rtl" : "ltr";
  ctx.font = `700 13px Amiri, serif`;
  ctx.fillStyle = c.gold;
  ctx.textAlign = layout.rtl ? "right" : "left";
  ctx.fillText(texts.title, startX, margin + 28);
  ctx.font = `600 11.5px Tajawal, sans-serif`;
  ctx.fillStyle = c.muted;
  ctx.textAlign = layout.rtl ? "left" : "right";
  ctx.fillText(texts.reference, endX, margin + 28);

  // The text of this page: each word where the booklet laid it out.
  const ox = margin + (vp.left - sheet.left);
  const oy = margin + (vp.top - sheet.top);
  const walker = document.createTreeWalker(layout.flow, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const parent = node.parentElement;
    if (!parent || !text.trim()) continue;
    const cs = getComputedStyle(parent);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    ctx.font = fontOf(cs);
    ctx.fillStyle = cs.color;
    const rtl = cs.direction === "rtl";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    for (const m of text.matchAll(/\S+/g)) {
      // A word of Arabic letters is drawn whole (its letters join as on screen). In a word that
      // mixes in digits or punctuation — «(810)», «{وَأَمَّا», «عنه.» — the browser lays those out
      // in their own direction, so each is drawn where it stands, and each Arabic run whole.
      for (const piece of pieces(m[0])) {
        const start = m.index + piece.at;
        range.setStart(node, start);
        range.setEnd(node, start + piece.text.length);
        const rect = range.getClientRects()[0];
        if (!rect || rect.width === 0) continue;
        const box = onPage(rect, layout, vp, page);
        if (!box) continue;
        const ascent = ctx.measureText(piece.text).fontBoundingBoxAscent || rect.height * 0.8;
        if (piece.arabic) {
          ctx.textAlign = rtl ? "right" : "left";
          ctx.fillText(piece.text, ox + (rtl ? box.right : box.left), oy + box.top + ascent);
        } else {
          ctx.textAlign = "center";
          ctx.fillText(piece.text, ox + (box.left + box.right) / 2, oy + box.top + ascent);
        }
      }
    }
  }
  range.detach?.();

  // The rules the booklet draws between its parts (the verse's, the source's).
  ctx.strokeStyle = c.rule;
  ctx.lineWidth = 1;
  for (const el of layout.flow.querySelectorAll<HTMLElement>("[data-booklet-rule]")) {
    const sides = el.dataset.bookletRule ?? "";
    for (const rect of el.getClientRects()) {
      const box = onPage(rect, layout, vp, page);
      if (!box) continue;
      for (const y of [sides.includes("top") ? box.top : null, sides.includes("bottom") ? box.bottom : null]) {
        if (y === null) continue;
        ctx.beginPath();
        ctx.moveTo(ox + box.left, oy + y - 0.5);
        ctx.lineTo(ox + box.right, oy + y - 0.5);
        ctx.stroke();
      }
    }
  }

  // The page's number and DITHAR's name, where the booklet's buttons are.
  ctx.font = `700 14px Amiri, serif`;
  ctx.fillStyle = c.navy;
  ctx.textAlign = "center";
  ctx.direction = layout.rtl ? "rtl" : "ltr";
  ctx.fillText(texts.footer, margin + sheet.width / 2, margin + sheet.height - 20);
  return canvas.toDataURL("image/png");
}
