// The Android build's last web step (npm run build:android:optimized): removes
// from dist/ every Adhan recording except the built-in ones. The APK downloads
// the others on demand (src/lib/adhanDownloads.ts). Only dist/ changes, so the
// web app's own build still has them all, and it is what hosts the downloads.
//
// Refuses (and changes nothing) unless the bundle was built for it, because the
// app would otherwise still look for those files in the APK.
//   node scripts/audio/exclude-adhan-from-apk.mjs dist
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { adhanRecordings } from "../../src/data/adhanRecordings.ts";

const dist = process.argv[2] ?? "dist";
const root = new URL("../../", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "src/data/adhanDownloads.json"), "utf8"));
const copies = JSON.parse(readFileSync(join(root, "src/data/audioOptimized.json"), "utf8"));

if (process.env.VITE_ADHAN_ON_DEMAND !== "1") {
  console.error("exclude-adhan-from-apk: VITE_ADHAN_ON_DEMAND=1 is not set — the bundle would still expect these files. Nothing changed.");
  process.exit(1);
}
const keep = new Set(
  Object.values(manifest.bundled).map((id) => {
    const recording = adhanRecordings.find((r) => r.id === id);
    if (!recording) throw new Error(`unknown built-in recording ${id}`);
    return join(dist, copies[recording.path] ?? recording.path);
  }),
);
for (const file of keep) {
  if (!existsSync(file)) {
    console.error(`exclude-adhan-from-apk: nothing changed — the built-in recording is missing: ${file}`);
    process.exit(1);
  }
}
const adhanDir = join(dist, "audio/adhan");
let removed = 0;
let bytes = 0;
const sweep = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      sweep(path);
      if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
    } else if (!keep.has(path)) {
      bytes += statSync(path).size;
      removed++;
      rmSync(path);
    }
  }
};
sweep(adhanDir);
console.log(`exclude-adhan-from-apk: ${removed} files, ${(bytes / 1e6).toFixed(1)} MB left out of the APK; ${keep.size} built-in recordings kept.`);
