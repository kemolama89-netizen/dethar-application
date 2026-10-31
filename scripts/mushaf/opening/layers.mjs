// The decorated opening pages' Qur'an text (pages 1–2): quran-svg's own 1441H page artwork —
// its surah title, text and verse markers, every path unchanged — laid into the cleared frame
// that frame.py makes from DITHAR's design reference.
//
//   node layers.mjs ink WORK     splits quran-svg's svg/001.svg and 002.svg into the title and
//                                the text (with the Basmala and verse markers), and renders
//                                each one's ink for frame.py fit
//   node layers.mjs build WORK   writes public/mushaf/hafs-kfqc-opening/composed/00N.svg (the
//                                frame, embedded byte for byte at an exact 2x, then the title
//                                and the text as vectors), SHA256SUMS, and
//                                src/data/quran/kfqc-hafs-1441-opening.json — whose
//                                shapeTransform is the text's own transform, so quran-svg's
//                                verse shapes land exactly on their words
//
// Needs Playwright's Chromium (a dev dependency).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const QURAN_SVG = `${ROOT}public/mushaf/hafs-kfqc`;
const OUT = `${ROOT}public/mushaf/hafs-kfqc-opening`;
const JSON_OUT = `${ROOT}src/data/quran/kfqc-hafs-1441-opening.json`;
const REFERENCE = `${ROOT}public/reference/mushaf-opening-design.png`;
const INK_PX = 8; // keep in step with frame.py
const PAGES = ["1", "2"];
const pad = (p) => p.padStart(3, "0");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const [, , command, work] = process.argv;
if (!["ink", "build"].includes(command) || !work) {
  console.error("usage: node layers.mjs ink|build WORK");
  process.exit(1);
}

const browser = await chromium.launch();
try {
  if (command === "ink") await ink();
  else await build();
} finally {
  await browser.close();
}

async function ink() {
  const viewBoxes = {};
  for (const page of PAGES) {
    const svg = readFileSync(`${QURAN_SVG}/svg/${pad(page)}.svg`, "utf8");
    const rows = JSON.parse(readFileSync(`${QURAN_SVG}/json/${pad(page)}.json`, "utf8"));
    // The title is what lies wholly above the page's first verse shape (the Basmala, not a verse of
    // Al-Baqarah, stays with the text).
    const firstVerseTop = Math.min(...rows.flatMap((r) => r.polygon.match(/-?\d+(?:\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 1)));
    const tab = await browser.newPage();
    await tab.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    const split = await tab.evaluate((top) => {
      const root = document.querySelector("svg");
      const vb = root.viewBox.baseVal;
      const R = root.getBoundingClientRect();
      const k = vb.width / R.width;
      const kids = [...document.querySelector("#content").children];
      const isTitle = kids.map((el) => vb.y + (el.getBoundingClientRect().bottom - R.top) * k < top);
      const layer = (title) => {
        const s = root.cloneNode(true);
        [...s.querySelector("#content").children].forEach((el, i) => isTitle[i] !== title && el.remove());
        if (title) s.querySelector("#ayah_markers").remove();
        s.querySelectorAll(".ayahPolygon").forEach((el) => el.remove());
        return s.outerHTML;
      };
      return { viewBox: [vb.x, vb.y, vb.width, vb.height], titles: isTitle.filter(Boolean).length, title: layer(true), text: layer(false) };
    }, firstVerseTop);
    await tab.close();
    if (split.titles !== 1) throw new Error(`page ${page}: expected one title group, found ${split.titles}`);
    viewBoxes[page] = split.viewBox;
    for (const kind of ["title", "text"]) {
      writeFileSync(`${work}/${kind}_${page}.svg`, split[kind]);
      await render(split[kind], split.viewBox, `${work}/ink_${kind}_${page}.png`);
    }
  }
  writeFileSync(`${work}/viewboxes.json`, JSON.stringify(viewBoxes));
}

async function render(svg, [, , w, h], out) {
  const W = Math.round(w * INK_PX), H = Math.round(h * INK_PX);
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  await tab.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${W}" height="${H}" `)}</body></html>`);
  await tab.screenshot({ path: out, omitBackground: true });
  await tab.close();
}

async function build() {
  const fit = JSON.parse(readFileSync(`${work}/fit.json`, "utf8"));
  const inner = (path) => readFileSync(path, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const matrix = ([s, x, y]) => `matrix(${s.toFixed(6)} 0 0 ${s.toFixed(6)} ${x.toFixed(4)} ${y.toFixed(4)})`;
  mkdirSync(`${OUT}/composed`, { recursive: true });
  const pages = {};
  for (const page of PAGES) {
    const f = fit[page];
    const [W, H] = f.size;
    const frame = readFileSync(`${work}/frame_${page}.png`).toString("base64");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:ayah="https://quranpedia.net" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<image href="data:image/png;base64,${frame}" x="0" y="0" width="${W}" height="${H}"/>` +
      `<g id="title" transform="${matrix(f.title)}">${inner(`${work}/title_${page}.svg`)}</g>` +
      `<g id="text" transform="${matrix(f.text)}">${inner(`${work}/text_${page}.svg`)}</g></svg>\n`;
    writeFileSync(`${OUT}/composed/${pad(page)}.svg`, svg);
    const r = (v) => Math.round(v * 100) / 100;
    pages[page] = {
      image: `composed/${pad(page)}.svg`,
      viewBox: `0 0 ${W} ${H}`,
      displayBox: `0 0 ${W} ${H}`,
      shapeTransform: matrix(f.text),
      titleTransform: matrix(f.title),
      referenceCrop: f.crop,
      medallion: f.medallion.map(r),
      cartouche: f.cartouche.map(r),
      textFill: f.textFill,
      quranSvgSha256: sha256(`${QURAN_SVG}/svg/${pad(page)}.svg`),
    };
  }
  writeFileSync(JSON_OUT, JSON.stringify({ referenceSha256: sha256(REFERENCE), pages }, null, 2) + "\n");
  // The 1441H print's opening images (png/, from ../import-opening-pages.py) stay listed: no longer shown, kept.
  const files = [...PAGES.map((p) => `png/${pad(p)}.png`), ...PAGES.map((p) => `composed/${pad(p)}.svg`)];
  writeFileSync(`${OUT}/SHA256SUMS`, files.map((f) => `${sha256(`${OUT}/${f}`)}  ${f}`).join("\n") + "\n");
}
