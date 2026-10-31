// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_REGULAR_RECORDING_ID,
  fajrAdhanRecordings,
  regularAdhanRecordings,
  resetAdhanAudioSettingsMemoryForTesting,
  saveFajrAdhanChoice,
  saveRegularAdhanChoice,
} from "./adhanAudioSettings";
import {
  ADHAN_ROTATION_PREFS_KEY,
  ADHAN_ROTATION_STATE_KEY,
  loadAdhanRotationSettings,
  peekNextAdhanVoice,
  resetAdhanRotationMemoryForTesting,
  rotationVoices,
  setAdhanRotationEnabled,
  setAdhanRotationRandomForTesting,
  setAdhanVoiceIncluded,
  startAdhanPreview,
  takeNextAdhanVoice,
  adhanNextToken,
  recordNativeAdhanPlay,
} from "./adhanVoiceRotation";
import type { AdhanSection } from "./adhanVoiceRotation";

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
  resetAdhanRotationMemoryForTesting();
  setAdhanRotationRandomForTesting(null);
});

/** Simulates an app restart: only localStorage survives. */
const restart = () => {
  resetAdhanAudioSettingsMemoryForTesting();
  resetAdhanRotationMemoryForTesting();
};

const takeIds = (which: AdhanSection, n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => takeNextAdhanVoice(which, `day${from + i}:${which}`).recording.id);

/** Leaves only `keep` in the section's rotation. */
const keepOnly = (which: AdhanSection, keep: string[]) => {
  const all = which === "regular" ? regularAdhanRecordings() : fajrAdhanRecordings();
  for (const r of all) setAdhanVoiceIncluded(which, r.id, true);
  for (const r of all) if (!keep.includes(r.id)) setAdhanVoiceIncluded(which, r.id, false);
};

describe("adhan voice rotation", () => {
  it("is off by default: every adhan uses the chosen voice and the rotation never moves", () => {
    expect(loadAdhanRotationSettings()).toEqual({ regular: { enabled: false, excluded: [] }, fajr: { enabled: false, excluded: [] } });
    expect(takeIds("regular", 3)).toEqual([DEFAULT_REGULAR_RECORDING_ID, DEFAULT_REGULAR_RECORDING_ID, DEFAULT_REGULAR_RECORDING_ID]);
    expect(localStorage.getItem(ADHAN_ROTATION_STATE_KEY)).toBeNull();
  });

  it("picks at random among the included voices, never the same one twice in a row", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
    const ids = takeIds("regular", 600);
    for (let i = 1; i < ids.length; i++) expect(ids[i], `adhan ${i}`).not.toBe(ids[i - 1]);
    const counts = Object.fromEntries(["abdulbasit", "husary", "refaat"].map((id) => [id, ids.filter((x) => x === id).length]));
    expect(Object.values(counts).reduce((a, b) => a + b)).toBe(600);
    // Random, not a fixed cycle: every voice shows up often, and the order isn't periodic.
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(120);
    const period3 = ids.slice(3).every((id, i) => id === ids[i]);
    expect(period3).toBe(false);
  });

  it("with exactly two voices, alternates them (the only way to never repeat)", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["husary", "refaat"]);
    const ids = takeIds("regular", 20);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    expect(new Set(ids)).toEqual(new Set(["husary", "refaat"]));
  });

  it("draws from the voices other than the previous one, using the random source", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
    setAdhanRotationRandomForTesting(() => 0); // always the first of the pool
    expect(takeIds("regular", 4)).toEqual(["abdulbasit", "husary", "abdulbasit", "husary"]);
    // The next adhan's voice was already drawn (and previewed): switching the
    // source only affects the draws after it.
    setAdhanRotationRandomForTesting(() => 0.99); // always the last of the pool
    expect(takeIds("regular", 3, 10)).toEqual(["abdulbasit", "refaat", "husary"]);
  });

  it("asking again for the same prayer returns the same voice and never draws twice", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
    const first = takeNextAdhanVoice("regular", "2026-10-10:dhuhr").recording.id;
    const upcoming = peekNextAdhanVoice("regular").recording.id;
    for (let i = 0; i < 5; i++) expect(takeNextAdhanVoice("regular", "2026-10-10:dhuhr").recording.id).toBe(first);
    expect(peekNextAdhanVoice("regular").recording.id).toBe(upcoming);
    expect(takeNextAdhanVoice("regular", "2026-10-10:asr").recording.id).toBe(upcoming);
  });

  it("the previewed next voice is exactly the one the next adhan uses", () => {
    setAdhanRotationEnabled("regular", true);
    for (let i = 0; i < 30; i++) {
      const peeked = peekNextAdhanVoice("regular").recording.id;
      expect(peekNextAdhanVoice("regular").recording.id).toBe(peeked);
      expect(takeNextAdhanVoice("regular", `p${i}`).recording.id).toBe(peeked);
    }
  });

  it("never picks an excluded voice, redraws if the upcoming one is excluded, and lets re-enabled voices back in", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
    setAdhanVoiceIncluded("regular", "husary", false);
    const without = takeIds("regular", 100);
    expect(without).not.toContain("husary");
    const upcoming = peekNextAdhanVoice("regular").recording.id;
    setAdhanVoiceIncluded("regular", upcoming, false);
    expect(peekNextAdhanVoice("regular").recording.id).not.toBe(upcoming);
    setAdhanVoiceIncluded("regular", upcoming, true);
    setAdhanVoiceIncluded("regular", "husary", true);
    expect(takeIds("regular", 200, 100)).toContain("husary");
  });

  it("always uses the only voice left enabled, and refuses to exclude it", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["refaat"]);
    expect(rotationVoices("regular").map((r) => r.id)).toEqual(["refaat"]);
    const before = loadAdhanRotationSettings();
    expect(setAdhanVoiceIncluded("regular", "refaat", false)).toEqual(before);
    expect(takeIds("regular", 3)).toEqual(["refaat", "refaat", "refaat"]);
  });

  it("keeps preferences, the last voice and the drawn next voice across app restarts", () => {
    setAdhanRotationEnabled("regular", true);
    keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
    const last = takeIds("regular", 1)[0];
    const upcoming = peekNextAdhanVoice("regular").recording.id;
    restart();
    expect(loadAdhanRotationSettings().regular).toEqual({ enabled: true, excluded: regularAdhanRecordings().map((r) => r.id).filter((id) => !["abdulbasit", "husary", "refaat"].includes(id)) });
    expect(peekNextAdhanVoice("regular").recording.id).toBe(upcoming);
    const next = takeIds("regular", 1, 50)[0];
    expect(next).toBe(upcoming);
    expect(next).not.toBe(last);
  });

  it("keeps the regular and Fajr rotations fully independent", () => {
    setAdhanRotationEnabled("fajr", true);
    expect(loadAdhanRotationSettings().regular.enabled).toBe(false);
    takeIds("fajr", 3);
    expect(takeNextAdhanVoice("regular", "x").recording.id).toBe(DEFAULT_REGULAR_RECORDING_ID);
    setAdhanVoiceIncluded("regular", "husary", false);
    expect(loadAdhanRotationSettings().fajr.excluded).toEqual([]);
  });

  it("only rotates through Fajr voices that can play the chosen Fajr mode", () => {
    setAdhanRotationEnabled("fajr", true);
    // Full adhan: the phrase-only excerpt can't play it, so it never comes up.
    const full = takeIds("fajr", 300);
    expect(full).not.toContain("alafasy-fajr-phrase-excerpt");
    expect(new Set(full).size).toBe(fajrAdhanRecordings().length - 1);
    // «الصلاة خير من النوم» only: every Fajr voice, the excerpt included, can play it.
    saveFajrAdhanChoice({ mode: "fajrPhrase" });
    expect(rotationVoices("fajr").map((r) => r.id)).toContain("alafasy-fajr-phrase-excerpt");
    expect(takeNextAdhanVoice("fajr", "phrase").mode).toBe("fajrPhrase");
  });

  it("keeps the chosen mode (e.g. Takbeer only) for every rotated voice", () => {
    saveRegularAdhanChoice({ mode: "takbeer" });
    setAdhanRotationEnabled("regular", true);
    for (let i = 0; i < 4; i++) {
      const { recording, mode } = takeNextAdhanVoice("regular", `t${i}`);
      expect(mode).toBe("takbeer");
      expect(recording.segments.takbeer).not.toBeNull();
    }
  });

  it("repairs corrupt or unknown stored values", () => {
    localStorage.setItem(ADHAN_ROTATION_PREFS_KEY, JSON.stringify({ regular: { enabled: "yes", excluded: ["nope", 3, "husary"] }, fajr: 7 }));
    localStorage.setItem(ADHAN_ROTATION_STATE_KEY, "{not json");
    expect(loadAdhanRotationSettings()).toEqual({ regular: { enabled: false, excluded: ["husary"] }, fajr: { enabled: false, excluded: [] } });
    setAdhanRotationEnabled("regular", true);
    expect(takeNextAdhanVoice("regular", "a").recording.id).not.toBe("husary");
  });

  describe("Settings previews", () => {
    it("each preview plays the drawn voice and draws a new one, never repeating back to back", () => {
      setAdhanRotationEnabled("regular", true);
      keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
      let previous: string | null = null;
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const shown = peekNextAdhanVoice("regular").recording.id;
        const played = startAdhanPreview("regular").recording.id;
        expect(played).toBe(shown);
        expect(played).not.toBe(previous);
        expect(peekNextAdhanVoice("regular").recording.id).not.toBe(played);
        previous = played;
        seen.add(played);
      }
      expect(seen).toEqual(new Set(["abdulbasit", "husary", "refaat"]));
    });

    it("a page refresh restores the drawn voice, and the next preview still moves on", () => {
      setAdhanRotationEnabled("regular", true);
      startAdhanPreview("regular");
      const shown = peekNextAdhanVoice("regular").recording.id;
      restart();
      expect(peekNextAdhanVoice("regular").recording.id).toBe(shown);
      expect(startAdhanPreview("regular").recording.id).toBe(shown);
      restart();
      expect(peekNextAdhanVoice("regular").recording.id).not.toBe(shown);
    });

    it("never changes the voice a prayer occurrence already got", () => {
      setAdhanRotationEnabled("regular", true);
      const dhuhr = takeNextAdhanVoice("regular", "2026-10-10:dhuhr").recording.id;
      for (let i = 0; i < 10; i++) startAdhanPreview("regular");
      expect(takeNextAdhanVoice("regular", "2026-10-10:dhuhr").recording.id).toBe(dhuhr);
    });

    it("counts as a play for the next adhan: it won't repeat the previewed voice", () => {
      setAdhanRotationEnabled("regular", true);
      for (let i = 0; i < 50; i++) {
        const previewed = startAdhanPreview("regular").recording.id;
        expect(takeNextAdhanVoice("regular", `after-${i}`).recording.id).not.toBe(previewed);
      }
    });

    it("plays the chosen voice and stores nothing while rotation is off", () => {
      expect(startAdhanPreview("regular").recording.id).toBe(DEFAULT_REGULAR_RECORDING_ID);
      expect(localStorage.getItem(ADHAN_ROTATION_STATE_KEY)).toBeNull();
    });

    it("keeps Regular and Fajr apart and respects exclusions and the mode", () => {
      setAdhanRotationEnabled("regular", true);
      setAdhanRotationEnabled("fajr", true);
      saveFajrAdhanChoice({ mode: "takbeer" });
      setAdhanVoiceIncluded("regular", "husary", false);
      const fajrNext = peekNextAdhanVoice("fajr").recording.id;
      for (let i = 0; i < 60; i++) {
        expect(startAdhanPreview("regular").recording.id).not.toBe("husary");
      }
      expect(peekNextAdhanVoice("fajr").recording.id).toBe(fajrNext);
      const fajr = startAdhanPreview("fajr");
      expect(fajr.mode).toBe("takbeer");
      expect(fajr.recording.id).not.toBe("alafasy-fajr-phrase-excerpt");
    });
  });

  describe("adhans the Android alarm played", () => {
    it("become the last voice — the next is never the same — and each report is taken in once", () => {
      setAdhanRotationEnabled("regular", true);
      keepOnly("regular", ["abdulbasit", "husary", "refaat"]);
      const announced = peekNextAdhanVoice("regular").recording.id;
      recordNativeAdhanPlay("regular", announced, 1_000);
      const next = peekNextAdhanVoice("regular").recording.id;
      expect(next).not.toBe(announced);
      expect(adhanNextToken("regular")).toBe(`${announced}>${next}`);
      recordNativeAdhanPlay("regular", announced, 1_000); // the same report again
      expect(peekNextAdhanVoice("regular").recording.id).toBe(next);
      recordNativeAdhanPlay("regular", next, 500); // older than one already taken in
      expect(peekNextAdhanVoice("regular").recording.id).toBe(next);
    });

    it("keep the announced next voice when it differs from what played", () => {
      setAdhanRotationEnabled("fajr", true);
      const announced = peekNextAdhanVoice("fajr").recording.id;
      const other = rotationVoices("fajr").find((r) => r.id !== announced)!.id;
      recordNativeAdhanPlay("fajr", other, 2_000);
      expect(peekNextAdhanVoice("fajr").recording.id).toBe(announced);
    });

    it("ignore unknown voices and never touch the other section", () => {
      setAdhanRotationEnabled("regular", true);
      setAdhanRotationEnabled("fajr", true);
      const fajrNext = peekNextAdhanVoice("fajr").recording.id;
      recordNativeAdhanPlay("regular", "no-such-voice", 3_000);
      recordNativeAdhanPlay("regular", "husary", 4_000);
      expect(peekNextAdhanVoice("fajr").recording.id).toBe(fajrNext);
    });
  });
});

