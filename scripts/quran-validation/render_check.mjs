// Renders the Qur'an reader's Mushaf pages in Chromium and checks them as a
// reader would see them on a phone. Run from the repo root with the dev
// server on :5173:
//   node scripts/quran-validation/render_check.mjs 393 852 out.json [shots-dir] [pages]
// pages: "all" (default) or a comma-separated list, e.g. 1,2,3,590,604.
// For each page: the page's own image loaded; drawn at its own proportions
// (no distortion); entirely inside the page area (no clipping) between the
// header and the page buttons; no horizontal scroll; the verse shapes are
// exactly over the image (same box, same viewBox) and every one lies within
// the page; and the verses are the ones the edition puts on that page.
import { chromium } from "playwright";
import fs from "node:fs";
const [w, h, out, shots, pagesArg = "all"] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4], process.argv[5], process.argv[6]];
const index = JSON.parse(fs.readFileSync("src/data/quran/kfqc-hafs-1441-pages.json", "utf8"));
const pad = (n) => String(n).padStart(3, "0");
const editionVerses = (n) => JSON.parse(fs.readFileSync(`public/mushaf/hafs-kfqc/json/${pad(n)}.json`, "utf8")).map((v) => `${v.surahNumber}:${v.ayahNumber}`);
const pages = pagesArg === "all" ? Array.from({ length: 604 }, (_, i) => i + 1) : pagesArg.split(",").map(Number);
if (shots) fs.mkdirSync(shots, { recursive: true });

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: "reduce" })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
await p.addInitScript(() => localStorage.setItem("dithar:appearance:language:v1", "ar"));
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);

const problems = [];
const report = [];
for (const n of pages) {
  const [s, a] = index.pageStarts[n - 1];
  await p.evaluate(([s, a]) => localStorage.setItem("dithar:quran:position:v1", JSON.stringify({ surah: s, ayah: a, at: 1 })), [s, a]);
  await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.locator("[data-home-quran]").click();
  await p.waitForSelector(`[data-quran-hits="${n}"] path`, { timeout: 15000 });
  await p.waitForFunction(() => document.querySelector("[data-quran-page-image]")?.complete, null, { timeout: 15000 });
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect().toJSON();
    const img = document.querySelector("[data-quran-page-image]");
    const hits = document.querySelector("[data-quran-hits]");
    const area = document.querySelector("[data-quran-area]");
    const screen = document.querySelector(".device-screen") ?? document.scrollingElement;
    const paths = [...hits.querySelectorAll("path")];
    return {
      page: Number(document.querySelector("[data-quran-mushaf-page]").dataset.quranMushafPage),
      src: img.getAttribute("src"),
      natural: [img.naturalWidth, img.naturalHeight],
      img: rect(img), hits: rect(hits), area: rect(area),
      header: rect(document.querySelector("header")), pager: rect(document.querySelector("[data-quran-pager]")),
      folio: rect(document.querySelector("[data-quran-folio]")),
      viewBox: hits.getAttribute("viewBox"),
      verses: paths.map((el) => ({ key: el.dataset.verse, box: rect(el) })),
      scrollable: area.scrollHeight > area.clientHeight + 1 || area.scrollWidth > area.clientWidth + 1,
      hscroll: screen.scrollWidth - screen.clientWidth,
    };
  });
  const bad = (msg) => problems.push(`p${n}: ${msg}`);
  if (r.page !== n) bad(`shown page ${r.page}`);
  if (r.src !== `/mushaf/hafs-kfqc/svg/${pad(n)}.svg`) bad(`image ${r.src}`);
  if (!(r.natural[0] > 0)) bad("image did not load");
  const ratio = r.img.width / r.img.height;
  if (Math.abs(ratio - 345 / 550) > 0.01) bad(`page drawn at ${ratio.toFixed(4)}, not 345:550`);
  const inside = (x, o, tol = 0.5) => x.left >= o.left - tol && x.right <= o.right + tol && x.top >= o.top - tol && x.bottom <= o.bottom + tol;
  if (!inside(r.img, r.area)) bad(`page image clipped: ${JSON.stringify(r.img)} vs area ${JSON.stringify(r.area)}`);
  if (r.img.top < r.header.bottom - 0.5 || r.folio.bottom > r.pager.top + 0.5) bad("page overlaps the header or the page buttons");
  if (["left", "top", "width", "height"].some((k) => Math.abs(r.img[k] - r.hits[k]) > 0.5)) bad("verse shapes not over the image");
  if (r.viewBox !== (index.viewBoxes[n] ?? index.defaultViewBox)) bad(`viewBox ${r.viewBox}`);
  for (const v of r.verses) if (!inside(v.box, r.img, 1)) bad(`${v.key} shape outside the page`);
  if (r.scrollable) bad("page scrolls at fit-to-screen");
  if (r.hscroll > 0) bad(`horizontal scroll ${r.hscroll}`);
  const want = editionVerses(n), got = r.verses.map((v) => v.key);
  if (JSON.stringify(want) !== JSON.stringify(got)) bad(`verses ${got.join(",")} ≠ ${want.join(",")}`);
  report.push({ page: n, img: { w: +r.img.width.toFixed(1), h: +r.img.height.toFixed(1) }, area: { w: +r.area.width.toFixed(1), h: +r.area.height.toFixed(1) }, verses: got.length });
  if (shots) await p.screenshot({ path: `${shots}/page-${pad(n)}-${w}x${h}.png` });
}
await b.close();
const result = { viewport: [w, h], pages: pages.length, problems, errors, report };
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`${w}x${h}: ${pages.length} pages, ${problems.length} problems, ${errors.length} errors`);
for (const x of [...problems, ...errors].slice(0, 20)) console.log("  " + x);
