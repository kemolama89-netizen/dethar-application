// The Android build's last web step (npm run build:android:optimized), beside
// exclude-adhan-from-apk.mjs: removes from dist/ every Qur'an reciter's
// recitations except the built-in reciter's (src/data/quranAudioDownloads.json
// `bundled`). The APK downloads the others on demand (src/lib/quranAudioDownloads.ts).
// Only dist/ changes: public/audio/quran keeps every reciter, and the web app's
// own build is what hosts the downloads (and catalog.json).
//
// Refuses (and changes nothing) unless the bundle was built for it, because the
// app would otherwise still look for those files in the APK — and unless every
// built-in file is there, so the Qur'anic adhkar always play offline.
//   node scripts/audio/exclude-quran-from-apk.mjs dist [--dry-run]
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const dryRun = process.argv.includes("--dry-run");
const root = new URL("../../", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "src/data/quranAudioDownloads.json"), "utf8"));

if (process.env.VITE_QURAN_ON_DEMAND !== "1" && !dryRun) {
  console.error("exclude-quran-from-apk: VITE_QURAN_ON_DEMAND=1 is not set — the bundle would still expect these files. Nothing changed.");
  process.exit(1);
}
const quranDir = join(dist, "audio/quran");
const builtIn = manifest.bundled;
const keepFiles = Object.keys(manifest.reciters[builtIn]?.files ?? {});
if (keepFiles.length === 0) {
  console.error(`exclude-quran-from-apk: nothing changed — no files listed for the built-in reciter ${builtIn}.`);
  process.exit(1);
}
for (const name of keepFiles) {
  if (!existsSync(join(quranDir, builtIn, name))) {
    console.error(`exclude-quran-from-apk: nothing changed — a built-in file is missing: ${join(quranDir, builtIn, name)}`);
    process.exit(1);
  }
}
const size = (path) => (statSync(path).isDirectory() ? readdirSync(path).reduce((n, e) => n + size(join(path, e)), 0) : statSync(path).size);
let removed = 0;
let bytes = 0;
for (const entry of readdirSync(quranDir, { withFileTypes: true })) {
  // The catalog stays (a few bytes); every other reciter's folder goes.
  if (!entry.isDirectory() || entry.name === builtIn) continue;
  const path = join(quranDir, entry.name);
  removed += readdirSync(path).length;
  bytes += size(path);
  if (!dryRun) rmSync(path, { recursive: true });
}
const kept = keepFiles.reduce((n, f) => n + statSync(join(quranDir, builtIn, f)).size, 0);
console.log(`exclude-quran-from-apk: ${dryRun ? "(dry run) would leave" : "left"} ${removed} files, ${bytes} bytes (${(bytes / 1e6).toFixed(2)} MB) out of the APK; kept ${builtIn}: ${keepFiles.length} files, ${kept} bytes.`);
