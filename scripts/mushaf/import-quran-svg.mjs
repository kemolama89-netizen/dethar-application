// Imports the Qur'an reader's Mushaf pages from quran-svg
// (https://github.com/quran-ws/quran-svg): the Hafs pages of the King Fahd
// Complex's 1441H Madinah Mushaf, traced to SVG from the Complex's own master
// files, with a polygon per verse for tapping. See public/mushaf/hafs-kfqc/README.md
// (which this script leaves as it is).
//
//   node scripts/mushaf/import-quran-svg.mjs [--from <dir with the release zips>]
//
// Pinned to one release; each archive is checked against its SHA-256 before
// anything is copied. The 604 page SVGs and their JSON are copied byte for
// byte (the per-surah split files the release also has are not needed); the
// only thing generated is src/data/quran/kfqc-hafs-1441-pages.json, the page
// index the app reads (each page's first verse and its viewBox).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPO = "quran-ws/quran-svg";
const TAG = "v1.1.1";
const ARCHIVES = {
  "hafs-kfqc-svg.zip": "5d5e29eae66d9353dd8e0e51af4274c7768f81f722414b538dfd7c8de014fc91",
  "hafs-kfqc-json.zip": "27dd192cec6b5f919ffd6e7df5216464aa57a671e326fc1a37a9d82dee3f6c13",
};
// The licence and notices, from the commit that added docs/PROVENANCE.md (after the
// release; LICENSE and the CC BY text are byte-identical to the release's, and
// NOTICE.md only gained a link to PROVENANCE.md).
const NOTICES_COMMIT = "b4155f07e4aea087d2c458069acff9f7c7e749f6";
const NOTICES = ["LICENSE", "NOTICE.md", "docs/PROVENANCE.md", "LICENSES/CC-BY-4.0.txt"];
const PAGES = 604;
const OUT = join(ROOT, "public/mushaf/hafs-kfqc");
const INDEX = join(ROOT, "src/data/quran/kfqc-hafs-1441-pages.json");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const pad = (p) => String(p).padStart(3, "0");

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const fromArg = process.argv.indexOf("--from");
const from = fromArg > 0 ? process.argv[fromArg + 1] : null;
const work = mkdtempSync(join(tmpdir(), "quran-svg-"));
try {
  for (const [name, expected] of Object.entries(ARCHIVES)) {
    const local = from && join(from, name);
    const buf = local && existsSync(local) ? readFileSync(local) : await download(`https://github.com/${REPO}/releases/download/${TAG}/${name}`);
    const actual = sha256(buf);
    if (actual !== expected) throw new Error(`${name}: SHA-256 ${actual}, expected ${expected}`);
    writeFileSync(join(work, name), buf);
    execFileSync("unzip", ["-q", "-o", join(work, name), "-d", join(work, "x")]);
    console.log(`${name}: SHA-256 verified`);
  }

  // Only the imported files are replaced; README.md (hand-written) stays.
  for (const dir of ["svg", "json"]) {
    rmSync(join(OUT, dir), { recursive: true, force: true });
    mkdirSync(join(OUT, dir), { recursive: true });
  }
  const pageStarts = [];
  const viewBoxes = {};
  const sums = [];
  const seen = new Set();
  for (let p = 1; p <= PAGES; p++) {
    for (const [dir, ext] of [["svg", "svg"], ["", "json"]]) {
      const src = join(work, "x", dir, `${pad(p)}.${ext}`);
      const dest = join(OUT, ext, `${pad(p)}.${ext}`);
      copyFileSync(src, dest);
      sums.push(`${sha256(readFileSync(dest))}  ${ext}/${pad(p)}.${ext}`);
    }
    const verses = JSON.parse(readFileSync(join(OUT, "json", `${pad(p)}.json`), "utf8")).map((v) => [v.surahNumber, v.ayahNumber]);
    for (const [s, a] of verses) {
      if (seen.has(`${s}:${a}`)) throw new Error(`${s}:${a} is on more than one page`);
      seen.add(`${s}:${a}`);
    }
    pageStarts.push(verses[0]);
    const viewBox = readFileSync(join(OUT, "svg", `${pad(p)}.svg`), "utf8").slice(0, 1000).match(/viewBox="([^"]+)"/)?.[1];
    if (!viewBox) throw new Error(`page ${p}: no viewBox`);
    if (viewBox !== "0 0 345 550") viewBoxes[p] = viewBox;
  }
  if (seen.size !== 6236) throw new Error(`${seen.size} verses on the pages, expected 6236`);

  for (const path of NOTICES) {
    const buf = await download(`https://raw.githubusercontent.com/${REPO}/${NOTICES_COMMIT}/${path}`);
    writeFileSync(join(OUT, path.split("/").pop()), buf);
  }
  writeFileSync(join(OUT, "SHA256SUMS"), sums.join("\n") + "\n");
  writeFileSync(
    INDEX,
    JSON.stringify({
      source: `https://github.com/${REPO}/releases/tag/${TAG}`,
      edition: "King Fahd Complex, Madinah Mushaf (Hafs), 1441H",
      defaultViewBox: "0 0 345 550",
      viewBoxes,
      pageStarts,
    }) + "\n",
  );
  console.log(`${PAGES} pages → ${OUT}\npage index → ${INDEX}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
