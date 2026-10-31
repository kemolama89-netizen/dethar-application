import { describe, expect, it } from "vitest";
import { CARTOUCHE_HALF_WIDTH, FRAME_BORDER, FRAME_HEIGHT, surahHeadingFrames, surahTitleInk } from "./mushafHeadings";

const pages = Array.from({ length: 604 }, (_, i) => i + 1);

describe("surah heading frames (drawn behind the artwork)", () => {
  it("covers every surah that begins on pages 3–604 — 3 to 114 — once, and nothing on the opening pages", () => {
    const surahs = pages.flatMap((p) => surahHeadingFrames(p).map((f) => f.surah));
    expect(surahs).toEqual(Array.from({ length: 112 }, (_, i) => i + 3));
    expect(surahHeadingFrames(1)).toEqual([]);
    expect(surahHeadingFrames(2)).toEqual([]);
  });

  it("centres each frame exactly on its title's measured ink, horizontally and vertically", () => {
    for (const p of pages) {
      const frames = surahHeadingFrames(p);
      surahTitleInk(p).forEach((ink, i) => {
        const f = frames[i];
        expect(f.x + f.width / 2, `page ${p} surah ${ink.surah} x`).toBeCloseTo((ink.x0 + ink.x1) / 2, 10);
        expect(f.y + f.height / 2, `page ${p} surah ${ink.surah} y`).toBeCloseTo((ink.y0 + ink.y1) / 2, 10);
      });
    }
  });

  it("holds every title inside its cartouche, spans the text width, and never reaches the line above or the Bismillah below", () => {
    for (const p of pages) {
      const frames = surahHeadingFrames(p);
      surahTitleInk(p).forEach((ink, i) => {
        const f = frames[i];
        const label = `page ${p} surah ${ink.surah}`;
        expect(f.x, label).toBeLessThan(ink.x0);
        expect(f.x + f.width, label).toBeGreaterThan(ink.x1);
        expect(f.y, label).toBeLessThan(ink.y0);
        expect(f.y + f.height, label).toBeGreaterThan(ink.y1);
        // The measured blank space around the title is larger than the frame's margin on each side.
        expect(ink.y0 - f.y, label).toBeLessThan(ink.clearAbove);
        expect(f.y + f.height - ink.y1, label).toBeLessThan(ink.clearBelow);
        // The title sits in the cartouche, on the cream: never over the navy field or the band.
        const cx = f.x + f.width / 2;
        expect(ink.x0, label).toBeGreaterThan(cx - CARTOUCHE_HALF_WIDTH + 4);
        expect(ink.x1, label).toBeLessThan(cx + CARTOUCHE_HALF_WIDTH - 4);
        expect(ink.y0, label).toBeGreaterThan(f.y + FRAME_BORDER + 1);
        expect(ink.y1, label).toBeLessThan(f.y + f.height - FRAME_BORDER - 1);
        // The text block's width (its lines run from x ≈ 6 to 336), within the 345-unit-wide page.
        expect(f.x, label).toBeGreaterThan(2);
        expect(f.x, label).toBeLessThan(8);
        expect(f.x + f.width, label).toBeGreaterThan(332);
        expect(f.x + f.width, label).toBeLessThan(343);
      });
    }
  });

  it("measures Al-Ikhlas, Al-Falaq and An-Nas on page 604 as printed titles, not whole lines", () => {
    const ink = surahTitleInk(604);
    expect(ink.map((t) => t.surah)).toEqual([112, 113, 114]);
    for (const t of ink) {
      expect(t.x1 - t.x0).toBeGreaterThan(50);
      expect(t.x1 - t.x0).toBeLessThan(2 * CARTOUCHE_HALF_WIDTH - 20);
      expect(t.y1 - t.y0).toBeGreaterThan(20);
      expect(t.y1 - t.y0).toBeLessThan(FRAME_HEIGHT - 4);
    }
  });
});
