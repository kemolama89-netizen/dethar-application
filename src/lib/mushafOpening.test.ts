// The decorated opening pages (public/mushaf/hafs-kfqc-opening — see its
// README.md): DITHAR's design reference's four-sided frame with quran-svg's own
// 1441H page artwork laid into its medallion and cartouche
// (scripts/mushaf/opening/), each laid out in its own pixel box, and the verse
// shapes placed by the very transform the text is drawn with.
import { describe, expect, it } from "vitest";
import { openingArtwork } from "./mushafOpening";
import opening from "../data/quran/kfqc-hafs-1441-opening.json";

const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));
const publicUrl = (path: string) => new URL(`../../public/${path}`, import.meta.url);
const read = async (path: string): Promise<string> => (await nodeModule("fs")).readFileSync(publicUrl(path), "utf8");
const numbers = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** The path data of a page's artwork (quran-svg's verse polygons, which are hit shapes, left out). */
const artPaths = (svg: string) => [...svg.matchAll(/<path([^>]*?) d="([^"]+)"/g)].filter((m) => !m[1].includes("ayahPolygon")).map((m) => m[2]).sort();

describe("Mushaf opening pages", () => {
  it("are the composed pages listed in SHA256SUMS, each laid out in its own box, from the recorded reference", async () => {
    const fs = await nodeModule("fs");
    const { createHash } = await nodeModule("crypto");
    const dir = publicUrl("mushaf/hafs-kfqc-opening/");
    expect(fs.existsSync(new URL("README.md", dir))).toBe(true);
    const sums: string[] = fs.readFileSync(new URL("SHA256SUMS", dir), "utf8").trim().split("\n");
    expect(sums.map((l) => l.split(/\s+/)[1])).toEqual(expect.arrayContaining(["composed/001.svg", "composed/002.svg"]));
    for (const line of sums) {
      const [hash, file] = line.split(/\s+/);
      expect(createHash("sha256").update(fs.readFileSync(new URL(file, dir))).digest("hex"), file).toBe(hash);
    }
    for (const page of [1, 2] as const) {
      const svg = await read(openingArtwork(page)!.path);
      expect(svg.match(/^<svg[^>]* viewBox="([^"]+)"/)![1]).toBe(openingArtwork(page)!.imageBox);
    }
    const reference: Uint8Array = fs.readFileSync(publicUrl("reference/mushaf-opening-design.png"));
    expect(createHash("sha256").update(reference).digest("hex")).toBe(opening.referenceSha256);
  });

  it("draw quran-svg's own page artwork — every title, text and verse-marker path, unchanged — and no other lettering", async () => {
    for (const page of [1, 2] as const) {
      const quranSvg = await read(`mushaf/hafs-kfqc/svg/00${page}.svg`);
      const { createHash } = await nodeModule("crypto");
      expect(createHash("sha256").update(quranSvg).digest("hex")).toBe(opening.pages[page].quranSvgSha256);
      const composed = await read(openingArtwork(page)!.path);
      expect(artPaths(composed)).toEqual(artPaths(quranSvg));
      // Besides those paths, only the frame image (the reference's lettering cleared from it).
      expect(composed.match(/<image /g)).toHaveLength(1);
      expect(composed).not.toMatch(/<text[\s>]/);
    }
  });

  it("place the verse shapes with the transform the text is drawn with, inside the medallion and centred in it", async () => {
    for (const page of [1, 2] as const) {
      const { shapeTransform } = openingArtwork(page)!;
      const composed = await read(openingArtwork(page)!.path);
      expect(composed.match(/<g id="text" transform="([^"]+)"/)![1]).toBe(shapeTransform);
      const [s, , , , tx, ty] = numbers(shapeTransform);
      const [cx, cy, a, b] = opening.pages[page].medallion;
      const rows: { x: number; y: number; polygon: string }[] = JSON.parse(await read(`mushaf/hafs-kfqc/json/00${page}.json`));
      const radius = (x: number, y: number) => Math.hypot((s * x + tx - cx) / a, (s * y + ty - cy) / b);
      const xs: number[] = [];
      for (const r of rows) {
        expect(radius(r.x, r.y), `page ${page} marker`).toBeLessThan(0.9);
        const p = numbers(r.polygon);
        for (let i = 0; i + 1 < p.length; i += 2) {
          expect(radius(p[i], p[i + 1]), `page ${page} verse shape`).toBeLessThan(1);
          xs.push(s * p[i] + tx);
        }
      }
      // Centred: the text block's middle is on the medallion's (within 0.3% of the page width).
      expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - cx)).toBeLessThan(1432 * 0.003);
      // The medallion is itself centred on the page.
      expect(Math.abs(cx - 1432 / 2)).toBeLessThan(3);
    }
    // One text size and one title size on both pages, as in the printed Mushaf.
    expect(numbers(openingArtwork(1)!.shapeTransform)[0]).toBe(numbers(openingArtwork(2)!.shapeTransform)[0]);
    expect(numbers(opening.pages[1].titleTransform)[0]).toBe(numbers(opening.pages[2].titleTransform)[0]);
  });

  it("show each whole page, frame edge to frame edge, the same box on both pages", () => {
    for (const page of [1, 2] as const) {
      const { imageBox, displayBox } = openingArtwork(page)!;
      expect(displayBox).toBe(imageBox);
      // An exact 2x of the reference's own page (never stretched).
      const [, , w, h] = imageBox.split(" ").map(Number);
      const [, , cw, ch] = opening.pages[page].referenceCrop;
      expect([w, h]).toEqual([cw * 2, ch * 2]);
    }
    expect(openingArtwork(1)!.displayBox).toBe(openingArtwork(2)!.displayBox);
  });

  it("applies to pages 1 and 2 only", () => {
    expect(openingArtwork(1)?.path).toBe("mushaf/hafs-kfqc-opening/composed/001.svg");
    expect(openingArtwork(2)?.path).toBe("mushaf/hafs-kfqc-opening/composed/002.svg");
    for (const page of [3, 4, 300, 604]) expect(openingArtwork(page)).toBeNull();
  });
});
