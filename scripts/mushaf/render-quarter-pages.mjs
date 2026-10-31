// Renders the pages that hold a quarter-hizb start (public/mushaf/hafs-kfqc/svg)
// to PNG at 4x, for scripts/mushaf/find-quarter-marks.py. Needs the dev server
// (npm run dev) and Playwright's Chromium.
//   node scripts/mushaf/render-quarter-pages.mjs <quarters.json> <out dir>
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";

const SCALE = 4;
const [quartersPath, outDir, base = "http://localhost:5173"] = process.argv.slice(2);
const pages = [...new Set(JSON.parse(readFileSync(quartersPath, "utf8")).map((q) => q.page))].filter((p) => p > 2);
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 345 * SCALE, height: 550 * SCALE } });
await tab.goto(`${base}/`);
for (const n of pages) {
  const id = String(n).padStart(3, "0");
  const out = `${outDir}/${id}.png`;
  if (existsSync(out)) continue;
  await tab.setContent(`<body style="margin:0;background:#fff"><img id="i" src="${base}/mushaf/hafs-kfqc/svg/${id}.svg" style="width:${345 * SCALE}px;height:${550 * SCALE}px"></body>`);
  await tab.waitForFunction(() => document.getElementById("i").complete);
  await tab.screenshot({ path: out });
}
await browser.close();
console.log(`rendered ${pages.length} pages`);
