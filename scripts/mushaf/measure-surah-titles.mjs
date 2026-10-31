// Measures where each printed surah title sits on its Mushaf page, from the
// page artwork's own pixels, so the reader can centre a heading frame on it
// exactly (src/lib/mushafHeadings.ts). Writes
// src/data/quran/kfqc-hafs-1441-surah-titles.json.
//
//   node scripts/mushaf/measure-surah-titles.mjs
//
// Method: each page with a surah start is rendered at SCALE px per viewBox unit
// (Chromium, via Playwright). The verse shapes (json/NNN.json) give the empty
// band above the surah's first verse, which holds the title line (then the
// Bismillah, except At-Tawbah). The title's ink is the contiguous run of inked
// rows around that band's middle (a blank gap of at least GAP units separates it
// from the lines above and below), and every inked column within those rows.
// Also recorded: the blank space between the title's ink and the nearest other
// ink above and below it, across the widest frame (so a test can prove the
// frame never reaches another line). Pages 1–2 are the decorated opening pages
// and are not measured.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCALE = 4;
const GAP = 1;
/** Half the widest heading frame (lib/mushafHeadings.ts FRAME_WIDTH / 2) — clearance is measured across it. */
const HALF_FRAME = 62;

const browser = await chromium.launch();
const page = await browser.newPage();
const titles = {};
for (let n = 3; n <= 604; n++) {
  const id = String(n).padStart(3, "0");
  const rows = JSON.parse(readFileSync(`${ROOT}public/mushaf/hafs-kfqc/json/${id}.json`, "utf8"));
  if (!rows.some((r) => r.ayahNumber === 1)) continue;
  const svg = readFileSync(`${ROOT}public/mushaf/hafs-kfqc/svg/${id}.svg`);
  const measured = await page.evaluate(
    async ({ url, rows, S, GAP, HALF }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 345 * S;
      canvas.height = 550 * S;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const inked = (x, y) => data[(y * width + x) * 4 + 3] > 40;
      const rowInked = (y, from = 0, to = width) => {
        for (let x = Math.max(0, from); x < Math.min(width, to); x++) if (inked(x, y)) return true;
        return false;
      };
      const ys = (poly) => (poly.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
      const out = [];
      for (const start of rows.filter((r) => r.ayahNumber === 1)) {
        const first = Math.min(...rows.filter((r) => r.surahNumber === start.surahNumber).flatMap((r) => ys(r.polygon)));
        const before = rows.filter((r) => r.surahNumber < start.surahNumber).flatMap((r) => ys(r.polygon));
        const top = before.length ? Math.max(...before) : 0;
        const slot = (first - top) / (start.surahNumber === 9 ? 1 : 2);
        const mid = Math.round((top + slot / 2) * S);
        let seed = -1;
        for (let d = 0; d < (slot * S) / 2 && seed < 0; d++) for (const y of [mid - d, mid + d]) if (seed < 0 && rowInked(y)) seed = y;
        if (seed < 0) throw new Error(`no title ink for surah ${start.surahNumber}`);
        const grow = (dir) => {
          let y = seed, last = seed, blank = 0;
          while (blank < GAP * S && y > 0 && y < height - 1) {
            y += dir;
            if (rowInked(y)) { last = y; blank = 0; } else blank++;
          }
          return last;
        };
        const y0 = grow(-1), y1 = grow(1);
        let x0 = width, x1 = -1;
        for (let y = y0; y <= y1; y++) for (let x = 0; x < width; x++) if (inked(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
        const cx = Math.round((x0 + x1 + 1) / 2);
        let above = y0 - 1;
        while (above > 0 && !rowInked(above, cx - HALF * S, cx + HALF * S)) above--;
        let below = y1 + 1;
        while (below < height - 1 && !rowInked(below, cx - HALF * S, cx + HALF * S)) below++;
        out.push([start.surahNumber, x0 / S, y0 / S, (x1 + 1) / S, (y1 + 1) / S, (y0 - above - 1) / S, (below - y1 - 1) / S]);
      }
      return out;
    },
    { url: `data:image/svg+xml;base64,${svg.toString("base64")}`, rows, S: SCALE, GAP, HALF: HALF_FRAME },
  );
  titles[n] = measured;
}
await browser.close();

const file = `${ROOT}src/data/quran/kfqc-hafs-1441-surah-titles.json`;
writeFileSync(
  file,
  JSON.stringify({
    about: "Ink bounds of each printed surah title, in its page's viewBox units: [surah, x0, y0, x1, y1, blank space above, blank space below] — scripts/mushaf/measure-surah-titles.mjs",
    scale: SCALE,
    titles,
  }) + "\n",
);
console.log(`${Object.values(titles).flat().length} surah titles measured → ${file}`);
