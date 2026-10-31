// The optimized build's last web step (npm run build:android:optimized): puts
// each verified copy listed in src/data/audioOptimized.json into the built
// bundle in place of its original. Only dist/ changes — public/audio and the
// copies in audio-optimized/ are read, never written.
//
// Refuses (and changes nothing) unless the bundle was built for the copies
// (VITE_AUDIO_VARIANT=optimized: otherwise the app would still ask for the
// originals) and every copy is byte-for-byte the one verified
// (audio-optimized/report.json's SHA-256).
//   node scripts/audio/apply-optimized-audio.mjs dist
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const dist = process.argv[2] ?? "dist";
const root = new URL("../../", import.meta.url).pathname;
const map = JSON.parse(readFileSync(join(root, "src/data/audioOptimized.json"), "utf8"));
const report = JSON.parse(readFileSync(join(root, "audio-optimized/report.json"), "utf8"));
const verified = new Map(report.files.filter((f) => f.passed).map((f) => [f.copy, f.sha256_copy]));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

if (process.env.VITE_AUDIO_VARIANT !== "optimized") {
  console.error("apply-optimized-audio: VITE_AUDIO_VARIANT=optimized is not set — the bundle would still play the originals. Nothing changed.");
  process.exit(1);
}
const problems = [];
for (const [original, copy] of Object.entries(map)) {
  const src = join(root, "audio-optimized", copy);
  if (!existsSync(src)) problems.push(`missing copy ${copy}`);
  else if (verified.get(copy) !== sha(src)) problems.push(`copy differs from the verified one: ${copy}`);
  if (!existsSync(join(dist, original))) problems.push(`not in the bundle: ${original}`);
}
if (problems.length) {
  console.error(`apply-optimized-audio: nothing changed —\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
let before = 0;
let after = 0;
for (const [original, copy] of Object.entries(map)) {
  const from = join(dist, original);
  const to = join(dist, copy);
  before += statSync(from).size;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(root, "audio-optimized", copy), to);
  rmSync(from);
  after += statSync(to).size;
}
const audioBytes = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? audioBytes(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
console.log(`apply-optimized-audio: ${Object.keys(map).length} recordings replaced by their verified copies: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB; dist/audio now ${(audioBytes(join(dist, "audio")) / 1e6).toFixed(1)} MB.`);
