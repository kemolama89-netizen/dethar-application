import { describe, expect, it } from "vitest";
import { ADHAN_MUEZZINS, adhanMuezzinName, adhanRecordings, getAdhanRecordingById } from "./adhanRecordings";

// File listing via Vite's glob (keys only, nothing is loaded) — same approach as the adhkar/Quran audio tests.
const originals = Object.keys(import.meta.glob("/public/audio/adhan/*.*")).map((p) => p.slice("/public/audio/adhan/".length));
const publicFiles = new Set(Object.keys(import.meta.glob(["/public/audio/adhan/*.*", "/public/audio/adhan/converted/*.*", "/public/audio/adhan/optimized/*.*"])));

describe("adhanRecordings registry", () => {
  it("has the 37 reviewed recordings with unique ids", () => {
    expect(adhanRecordings).toHaveLength(37);
    expect(new Set(adhanRecordings.map((r) => r.id)).size).toBe(37);
  });

  it("points every recording at a real, browser-playable file (never a .wma)", () => {
    for (const r of adhanRecordings) {
      expect(publicFiles.has(`/public/${r.path}`), r.path).toBe(true);
      expect(r.path.toLowerCase().endsWith(".wma"), r.path).toBe(false);
    }
  });

  it("covers every original file in public/audio/adhan (WMA originals via their MP3 copies)", () => {
    // 18, not 37: originals whose optimized/converted copy is identical were
    // removed; "taha alfashni.mp3" stays because its optimized copy is lower
    // quality; Al-Banna's complete replacement is played directly.
    expect(originals).toHaveLength(18);
    const played = new Set(adhanRecordings.map((r) => r.path.replace(/^audio\/adhan\/(converted\/|optimized\/)?/, "")));
    for (const name of originals) {
      const expected = name.toLowerCase().endsWith(".wma") ? name.slice(0, -4) + ".mp3" : name;
      expect(played.has(expected), name).toBe(true);
    }
  });

  it("gives each kind exactly the segments it can play", () => {
    for (const r of adhanRecordings) {
      const { full, takbeer, fajrPhrase } = r.segments;
      if (r.kind === "regular") {
        expect(full && takbeer && !fajrPhrase, r.id).toBeTruthy();
      } else if (r.kind === "fajr") {
        expect(full && takbeer && fajrPhrase, r.id).toBeTruthy();
      } else {
        expect(!full && !takbeer && fajrPhrase, r.id).toBeTruthy();
      }
    }
  });

  it("keeps every segment inside the file and in adhan order", () => {
    for (const r of adhanRecordings) {
      const { full, takbeer, fajrPhrase } = r.segments;
      for (const s of [full, takbeer, fajrPhrase]) {
        if (!s) continue;
        expect(s.start, r.id).toBeGreaterThanOrEqual(0);
        expect(s.end, r.id).toBeGreaterThan(s.start);
        expect(s.end, r.id).toBeLessThanOrEqual(r.duration + 0.01);
      }
      if (full && takbeer) {
        expect(takbeer.start, r.id).toBeCloseTo(full.start, 2);
        expect(takbeer.end, r.id).toBeLessThan(full.end);
      }
      if (full && takbeer && fajrPhrase) {
        expect(fajrPhrase.start, r.id).toBeGreaterThan(takbeer.end);
        expect(fajrPhrase.end, r.id).toBeLessThan(full.end);
      }
    }
  });

  it("plays the slow-to-start recordings from their lossless optimized copies", () => {
    // Embedded cover art (MP3) / a trailing index (M4A) delayed the first sound by 0.4–1.5 s.
    for (const id of ["abdulbasit", "abdulbasit-fajr", "omran", "mahmoud-ramadan", "husary", "refaat", "taha-fashni", "masjid-an-nabawi-fajr", "saad-ghamdi"]) {
      expect(getAdhanRecordingById(id)?.path, id).toMatch(/^audio\/adhan\/optimized\//);
    }
    expect(adhanRecordings.filter((r) => r.path.startsWith("audio/adhan/optimized/"))).toHaveLength(19);
  });

  it("classifies by the audio, not the filename", () => {
    // The source file is named "...al-fajr" but contains no «الصلاة خير من النوم».
    expect(getAdhanRecordingById("alafasy-saba-2")?.kind).toBe("regular");
    // The post-adhan dua is excluded from Saad Al-Ghamdi's full adhan.
    expect(getAdhanRecordingById("saad-ghamdi")?.segments.full?.end).toBeLessThan(120);
  });
});

describe("the muezzin shown while an adhan plays", () => {
  it("every recording says who calls it, or explicitly that it isn't known (a mosque recording) — never left to guessing", () => {
    for (const recording of adhanRecordings) expect(ADHAN_MUEZZINS, recording.id).toHaveProperty(recording.id);
    expect(Object.keys(ADHAN_MUEZZINS).sort()).toEqual(adhanRecordings.map((r) => r.id).sort());
  });

  it("names the person, without the recording's maqam/prayer/place details; mosque recordings have none", () => {
    expect(adhanMuezzinName(getAdhanRecordingById("alafasy-fajr-hijaz")!, "en")).toBe("Mishary Rashid Alafasy");
    expect(adhanMuezzinName(getAdhanRecordingById("mulla-isha-1445")!, "ar")).toBe("علي بن أحمد ملا");
    for (const id of ["masjid-al-haram-fajr", "masjid-an-nabawi-fajr", "masjid-an-nabawi-2", "masjid-an-nabawi-3"]) {
      expect(adhanMuezzinName(getAdhanRecordingById(id)!, "ar"), id).toBeNull();
    }
  });
});
