// The Android build's web step (npm run build:android:optimized), beside the audio
// exclusions: removes from dist/ the opening pages' source PNGs
// (mushaf/hafs-kfqc-opening/png/), which nothing in the app loads — the reader and
// the intro film use composed/001.svg and composed/002.svg, which carry the same
// artwork (src/data/quran/kfqc-hafs-1441-opening.json, lib/mushafOpening.ts).
// Only dist/ changes: public/mushaf keeps every file, byte for byte.
//
// Refuses (and changes nothing) if anything in the built bundle names those PNGs,
// if the opening data points at anything but composed/, or if a composed page is missing.
//   node scripts/mushaf/exclude-opening-png-from-apk.mjs dist
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dist = process.argv[2] ?? "dist";
const root = new URL("../../", import.meta.url).pathname;
const opening = JSON.parse(readFileSync(join(root, "src/data/quran/kfqc-hafs-1441-opening.json"), "utf8"));
const pngDir = join(dist, "mushaf/hafs-kfqc-opening/png");
const fail = (message) => {
  console.error(`exclude-opening-png-from-apk: nothing changed — ${message}`);
  process.exit(1);
};

const images = Object.values(opening.pages).map((p) => p.image);
if (images.length !== 2 || images.some((image) => !image.startsWith("composed/"))) fail(`the opening pages don't all use composed/ (${images.join(", ")})`);
for (const image of images) if (!existsSync(join(dist, "mushaf/hafs-kfqc-opening", image))) fail(`a composed opening page is missing: ${image}`);
if (!existsSync(pngDir)) {
  console.log("exclude-opening-png-from-apk: no opening PNGs in this bundle — nothing to do.");
  process.exit(0);
}

// Every text file of the bundle (code, styles, pages, data): none may name the PNGs.
const TEXT = /\.(js|mjs|css|html|json|webmanifest|svg|txt|xml)$/i;
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const referencing = walk(dist).filter((file) => TEXT.test(file) && !file.startsWith(pngDir) && /hafs-kfqc-opening\/png|opening\/png\//.test(readFileSync(file, "utf8")));
if (referencing.length) fail(`the bundle refers to the opening PNGs: ${referencing.map((f) => relative(dist, f)).join(", ")}`);

const files = readdirSync(pngDir);
const bytes = files.reduce((n, f) => n + statSync(join(pngDir, f)).size, 0);
rmSync(pngDir, { recursive: true });
console.log(`exclude-opening-png-from-apk: ${files.length} unused opening PNGs, ${bytes} bytes (${(bytes / 1e6).toFixed(2)} MB) left out of the APK; the composed pages stay.`);
