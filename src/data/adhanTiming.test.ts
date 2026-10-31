import { describe, expect, it } from "vitest";
import { adhanRecordings, getAdhanRecordingById } from "./adhanRecordings";

// Timing lock for every adhan recording.
//
// reviewedStart / fullEnd / takbeerEnd / fajrPhrase are the values approved
// at the listening review (2026-10-09). They must never drift: the takbeer
// and «الصلاة خير من النوم» segments were approved by ear.
//
// start is the measured first «الله أكبر» (voiced onset + attack, see the
// header of adhanRecordings.ts and docs/adhan-segments-onsets.json). It may
// only TRIM leading silence/noise off the reviewed start — never reach
// earlier (that would bring back excluded intros) and never by more than
// 0.6 s (more would mean cutting into the first takbir).
const TIMING: Record<string, { reviewedStart?: number; start?: number; fullEnd?: number; takbeerEnd?: number; fajrPhrase?: [number, number] }> = {
  "abdulbasit-fajr": { reviewedStart: 1.07, start: 1.2, fullEnd: 292.28, takbeerEnd: 38.62, fajrPhrase: [242.71, 266.7] },
  "alafasy-fajr-hijaz": { reviewedStart: 0.11, start: 0.32, fullEnd: 214.5, takbeerEnd: 24.44, fajrPhrase: [156.27, 182.62] },
  "alafasy-fajr-kurd": { reviewedStart: 0.43, start: 0.62, fullEnd: 161.58, takbeerEnd: 19.32, fajrPhrase: [116.35, 141.42] },
  "alafasy-fajr-nahawand": { reviewedStart: 0.19, start: 0.41, fullEnd: 291.44, takbeerEnd: 36.16, fajrPhrase: [224.01, 255.1] },
  "alafasy-fajr-nawa-athar": { reviewedStart: 0.19, start: 0.4, fullEnd: 239.06, takbeerEnd: 34.94, fajrPhrase: [182.17, 210.08] },
  "alafasy-fajr-rast": { reviewedStart: 0.29, start: 0.49, fullEnd: 208.76, takbeerEnd: 24.76, fajrPhrase: [150.97, 180.84] },
  "alafasy-fajr-saba": { reviewedStart: 0.13, start: 0.33, fullEnd: 206.26, takbeerEnd: 26.76, fajrPhrase: [154.35, 178.08] },
  "alafasy-fajr-phrase-excerpt": { fajrPhrase: [6.71, 22.66] },
  "omran-fajr": { reviewedStart: 0, start: 0.15, fullEnd: 177.74, takbeerEnd: 27.52, fajrPhrase: [134.49, 155.71] },
  "tobar-fajr": { reviewedStart: 0, start: 0.22, fullEnd: 288.37, takbeerEnd: 26.5, fajrPhrase: [232.39, 258.88] },
  "masjid-al-haram-fajr": { reviewedStart: 3.53, start: 3.72, fullEnd: 212.54, takbeerEnd: 29.22, fajrPhrase: [160.09, 186.6] },
  "masjid-an-nabawi-fajr": { reviewedStart: 1.17, start: 1.37, fullEnd: 307.39, takbeerEnd: 36.18, fajrPhrase: [236.65, 270.56] },
  "abdulbasit": { reviewedStart: 1.67, start: 1.9, fullEnd: 242.12, takbeerEnd: 31.38 },
  "shuaisha": { reviewedStart: 0.47, start: 0.65, fullEnd: 233.78, takbeerEnd: 20.96 },
  "nafees": { reviewedStart: 0.27, start: 0.47, fullEnd: 204.76, takbeerEnd: 35.68 },
  "nuaina": { reviewedStart: 0.43, start: 0.62, fullEnd: 209.12, takbeerEnd: 24.36 },
  "ali-mahmoud": { reviewedStart: 0.31, start: 0.31, fullEnd: 148.92, takbeerEnd: 20.37 },
  "mulla-haram": { reviewedStart: 0, start: 0.17, fullEnd: 216.6, takbeerEnd: 33.44 },
  "mulla-isha-1445": { reviewedStart: 4.01, start: 4.22, fullEnd: 220.84, takbeerEnd: 22.52 },
  // Replaced 2026-10-10 (complete opening). Machine-measured, not yet listening-reviewed.
  "banna": { reviewedStart: 0, start: 0.2, fullEnd: 164.6, takbeerEnd: 23.4 },
  "husary": { reviewedStart: 1.07, start: 1.26, fullEnd: 127.88, takbeerEnd: 13.36 },
  "mahmoud-ramadan": { reviewedStart: 0.23, start: 0.43, fullEnd: 232.44, takbeerEnd: 36.02 },
  "alafasy-saba-2": { reviewedStart: 0.31, start: 0.51, fullEnd: 245.84, takbeerEnd: 33.9 },
  "alafasy-classic": { reviewedStart: 0.07, start: 0.26, fullEnd: 230.84, takbeerEnd: 35.32 },
  "alafasy-kuwait": { reviewedStart: 0.15, start: 0.35, fullEnd: 229.56, takbeerEnd: 37.72 },
  "tablawi": { reviewedStart: 0.73, start: 0.93, fullEnd: 188.79, takbeerEnd: 18.88 },
  "omran": { reviewedStart: 1.21, start: 1.41, fullEnd: 182.82, takbeerEnd: 24.36 },
  "refaat": { reviewedStart: 1.11, start: 1.19, fullEnd: 233.38, takbeerEnd: 28.08 },
  "minshawi": { reviewedStart: 0.59, start: 0.59, fullEnd: 188.66, takbeerEnd: 29.52 },
  "mustafa-ismail": { reviewedStart: 0, start: 0.02, fullEnd: 183.14, takbeerEnd: 27.2 },
  "tobar": { reviewedStart: 0, start: 0.25, fullEnd: 220.85, takbeerEnd: 26.08 },
  "qatami": { reviewedStart: 0, start: 0, fullEnd: 128.64, takbeerEnd: 26 },
  "saad-ghamdi": { reviewedStart: 1.13, start: 1.35, fullEnd: 117.28, takbeerEnd: 19.2 },
  "naqshbandi": { reviewedStart: 0, start: 0.07, fullEnd: 136, takbeerEnd: 16.98 },
  "taha-fashni": { reviewedStart: 0.09, start: 0.6, fullEnd: 222.37, takbeerEnd: 31.28 },
  "masjid-an-nabawi-2": { reviewedStart: 0.03, start: 0.23, fullEnd: 235.17, takbeerEnd: 30.96 },
  "masjid-an-nabawi-3": { reviewedStart: 1.11, start: 1.3, fullEnd: 220.52, takbeerEnd: 32.18 },
};

describe("adhan segment timing", () => {
  it("covers every recording", () => {
    expect(Object.keys(TIMING).sort()).toEqual(adhanRecordings.map((r) => r.id).sort());
  });

  it("starts every full adhan and takbeer-only segment at the measured first «الله أكبر»", () => {
    for (const r of adhanRecordings) {
      const t = TIMING[r.id];
      if (t.start === undefined) continue;
      expect(r.segments.full?.start, r.id).toBe(t.start);
      expect(r.segments.takbeer?.start, r.id).toBe(t.start);
    }
  });

  it("only trims leading silence: never earlier than the reviewed start, never more than 0.6 s later", () => {
    for (const [id, t] of Object.entries(TIMING)) {
      if (t.start === undefined || t.reviewedStart === undefined) continue;
      expect(t.start, id).toBeGreaterThanOrEqual(t.reviewedStart);
      expect(t.start - t.reviewedStart, id).toBeLessThanOrEqual(0.6);
    }
  });

  it("applies a per-recording start, not one global offset", () => {
    const trims = Object.values(TIMING)
      .filter((t) => t.start !== undefined && t.reviewedStart !== undefined)
      .map((t) => Math.round((t.start! - t.reviewedStart!) * 100));
    expect(new Set(trims).size).toBeGreaterThan(5);
  });

  it("keeps the approved segment ends and «الصلاة خير من النوم» segments unchanged", () => {
    for (const r of adhanRecordings) {
      const t = TIMING[r.id];
      if (t.fullEnd !== undefined) expect(r.segments.full?.end, r.id).toBe(t.fullEnd);
      if (t.takbeerEnd !== undefined) expect(r.segments.takbeer?.end, r.id).toBe(t.takbeerEnd);
      if (t.fajrPhrase) expect(r.segments.fajrPhrase, r.id).toEqual({ start: t.fajrPhrase[0], end: t.fajrPhrase[1] });
      else expect(r.segments.fajrPhrase, r.id).toBeNull();
    }
  });

  it("keeps the manually reviewed openings", () => {
    // Leading noise before Ali Mulla's Isha adhan stays excluded.
    expect(getAdhanRecordingById("mulla-isha-1445")!.segments.full!.start).toBeGreaterThan(4);
    // Recordings whose voice begins at once are not trimmed into the takbir.
    expect(getAdhanRecordingById("qatami")!.segments.full!.start).toBe(0);
    expect(getAdhanRecordingById("ali-mahmoud")!.segments.full!.start).toBe(0.31);
  });
});
