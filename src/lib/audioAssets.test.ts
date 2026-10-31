// The optional optimized audio (lib/audioAssets.ts): a normal build plays the
// originals unchanged; an optimized build swaps in only verified copies, and
// everything keyed by a recording (durations, catalogues) keeps its original path.
import { describe, expect, it } from "vitest";
import optimized from "../data/audioOptimized.json";
import report from "../../audio-optimized/report.json";
import durations from "../data/audioDurations.json";
import { adhanRecordings } from "../data/adhanRecordings";
import { AUDIO_VARIANT, originalAudioPath, playableAudioPath } from "./audioAssets";
import { audioDurationMs } from "./dailyAzkarWindows";

const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));
const MAP: Record<string, string> = optimized;

describe("playable audio paths", () => {
  it("a normal build plays every original exactly as before", () => {
    expect(AUDIO_VARIANT).toBe("original");
    for (const original of Object.keys(MAP)) expect(playableAudioPath(original)).toBe(original);
    for (const r of adhanRecordings) expect(playableAudioPath(r.path)).toBe(r.path);
  });

  it("an optimized build plays the verified copy of a listed recording, and the original of anything else", () => {
    const [original, copy] = Object.entries(MAP)[0];
    expect(playableAudioPath(original, "optimized")).toBe(copy);
    expect(playableAudioPath("audio/quran/husary-murattal/112001.mp3", "optimized")).toBe("audio/quran/husary-murattal/112001.mp3");
    expect(originalAudioPath(copy)).toBe(original);
    expect(originalAudioPath("audio/reminders/x.mp3")).toBe("audio/reminders/x.mp3");
  });

  it("a played copy's measured length is its original's (the schedules depend on it)", () => {
    const DUR: Record<string, number> = durations;
    for (const [original, copy] of Object.entries(MAP)) {
      if (DUR[original] === undefined) continue;
      expect(audioDurationMs(`public/${copy}`), copy).toBe(DUR[original]);
    }
  });
});

describe("the verified copies", () => {
  const files = (report as { files: { original: string; copy: string; passed: boolean; lag: number; dur_diff_ms: number; sha256_original: string; sha256_copy: string }[] }).files;

  it("only copies that passed every check are listed, each sample-aligned and the same length", () => {
    const passed = files.filter((f) => f.passed);
    expect(Object.keys(MAP).sort()).toEqual(passed.map((f) => f.original).sort());
    for (const f of passed) {
      expect(MAP[f.original]).toBe(f.copy);
      expect(Math.abs(f.lag), f.original).toBeLessThanOrEqual(1);
      expect(Math.abs(f.dur_diff_ms), f.original).toBeLessThanOrEqual(15);
      expect(f.copy.endsWith(".ogg"), f.copy).toBe(true); // .ogg stays uncompressed in the APK (assets.openFd)
      expect(f.copy.slice(0, f.copy.lastIndexOf(".")), f.copy).toBe(f.original.slice(0, f.original.lastIndexOf(".")));
    }
  });

  it("every listed original is still there, unchanged, and every copy is the verified file", async () => {
    const { readFileSync, existsSync } = await nodeModule("fs");
    const { createHash } = await nodeModule("crypto");
    const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
    for (const f of files.filter((x) => x.passed)) {
      expect(sha(`public/${f.original}`), f.original).toBe(f.sha256_original);
      expect(existsSync(`audio-optimized/${f.copy}`), f.copy).toBe(true);
      expect(sha(`audio-optimized/${f.copy}`), f.copy).toBe(f.sha256_copy);
    }
    // Hashes ~150 MB of audio: under a full parallel run that can take well over the 5 s default.
  }, 30_000);

  it("every Adhan recording is either an original or has a listed copy — none is lost", () => {
    for (const r of adhanRecordings) {
      const played = playableAudioPath(r.path, "optimized");
      expect(played === r.path || MAP[r.path] === played, r.id).toBe(true);
    }
  });
});
