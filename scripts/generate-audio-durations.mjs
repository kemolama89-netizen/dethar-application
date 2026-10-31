// Measures every bundled Audio Adhkar file (Morning/Evening recordings, the
// Quran recitations they use, the Various recordings) with ffprobe and
// writes src/data/audioDurations.json: { "<path under public/>": millis }.
// Scheduling (lib/dailyAzkarWindows.ts) uses it to know how long a session
// takes. Re-run after adding or replacing audio:
//
//   node scripts/generate-audio-durations.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const publicDir = join(root, "public");
const dirs = ["audio/adhkar", "audio/quran", "audio/audio-azkar"];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const durations = {};
for (const dir of dirs) {
  for (const file of walk(join(publicDir, dir)).filter((f) => /\.(mp3|m4a|ogg|wav)$/i.test(f)).sort()) {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
    const seconds = Number(out.trim());
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`no duration for ${file}`);
    durations[relative(publicDir, file)] = Math.ceil(seconds * 1000);
  }
}
writeFileSync(join(root, "src/data/audioDurations.json"), `${JSON.stringify(durations, null, 1)}\n`);
console.log(`${Object.keys(durations).length} files measured`);
