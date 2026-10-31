// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ADHAN_AUDIO_STORAGE_KEY,
  DEFAULT_FAJR_RECORDING_ID,
  DEFAULT_REGULAR_RECORDING_ID,
  fajrAdhanRecordings,
  loadAdhanAudioSettings,
  regularAdhanRecordings,
  resetAdhanAudioSettingsMemoryForTesting,
  saveFajrAdhanChoice,
  saveRegularAdhanChoice,
  loadAdhanAutoPlay,
  saveAdhanAutoPlay,
  ADHAN_AUTOPLAY_STORAGE_KEY,
} from "./adhanAudioSettings";
import { QURAN_RECITER_STORAGE_KEY } from "./quranAudioPreferences";

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
});

describe("adhan audio settings", () => {
  it("defaults to a full regular adhan and a full Fajr adhan", () => {
    expect(loadAdhanAudioSettings()).toEqual({
      regular: { recordingId: DEFAULT_REGULAR_RECORDING_ID, mode: "full" },
      fajr: { recordingId: DEFAULT_FAJR_RECORDING_ID, mode: "full" },
    });
  });

  it("offers only regular recordings for the regular adhan and only Fajr ones for Fajr", () => {
    expect(regularAdhanRecordings().every((r) => r.kind === "regular")).toBe(true);
    expect(fajrAdhanRecordings().every((r) => r.kind !== "regular")).toBe(true);
    expect(regularAdhanRecordings().length + fajrAdhanRecordings().length).toBe(37);
  });

  it("keeps the regular and Fajr choices independent", () => {
    saveRegularAdhanChoice({ recordingId: "refaat", mode: "takbeer" });
    saveFajrAdhanChoice({ recordingId: "omran-fajr", mode: "fajrPhrase" });
    expect(loadAdhanAudioSettings()).toEqual({
      regular: { recordingId: "refaat", mode: "takbeer" },
      fajr: { recordingId: "omran-fajr", mode: "fajrPhrase" },
    });

    saveFajrAdhanChoice({ mode: "full" });
    expect(loadAdhanAudioSettings().regular).toEqual({ recordingId: "refaat", mode: "takbeer" });
    saveRegularAdhanChoice({ mode: "full" });
    expect(loadAdhanAudioSettings().fajr).toEqual({ recordingId: "omran-fajr", mode: "full" });
  });

  it("rejects cross-kind and unsupported choices", () => {
    saveRegularAdhanChoice({ recordingId: "omran-fajr" });
    expect(loadAdhanAudioSettings().regular.recordingId).toBe(DEFAULT_REGULAR_RECORDING_ID);
    saveFajrAdhanChoice({ recordingId: "refaat" });
    expect(loadAdhanAudioSettings().fajr.recordingId).toBe(DEFAULT_FAJR_RECORDING_ID);
    // The regular adhan has no «الصلاة خير من النوم» mode.
    saveRegularAdhanChoice({ mode: "fajrPhrase" as never });
    expect(loadAdhanAudioSettings().regular.mode).toBe("full");
  });

  it("switches the phrase-only excerpt to the only mode it supports", () => {
    saveFajrAdhanChoice({ recordingId: "alafasy-fajr-phrase-excerpt", mode: "full" });
    expect(loadAdhanAudioSettings().fajr).toEqual({ recordingId: "alafasy-fajr-phrase-excerpt", mode: "fajrPhrase" });
  });

  it("repairs a corrupt half without touching the valid one", () => {
    localStorage.setItem(ADHAN_AUDIO_STORAGE_KEY, JSON.stringify({ regular: { recordingId: "husary", mode: "takbeer" }, fajr: { recordingId: "nope", mode: 7 } }));
    expect(loadAdhanAudioSettings()).toEqual({
      regular: { recordingId: "husary", mode: "takbeer" },
      fajr: { recordingId: DEFAULT_FAJR_RECORDING_ID, mode: "full" },
    });
    localStorage.setItem(ADHAN_AUDIO_STORAGE_KEY, "{not json");
    expect(loadAdhanAudioSettings().regular.recordingId).toBe(DEFAULT_REGULAR_RECORDING_ID);
  });

  it("uses its own storage key and never writes other features' keys", () => {
    saveRegularAdhanChoice({ recordingId: "refaat" });
    expect(Object.keys(localStorage)).toEqual([ADHAN_AUDIO_STORAGE_KEY]);
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBeNull();
  });

  it("auto-adhan is off by default, set per section, and survives a restart", () => {
    expect(loadAdhanAutoPlay()).toEqual({ regular: false, fajr: false });
    saveAdhanAutoPlay("fajr", true);
    expect(loadAdhanAutoPlay()).toEqual({ regular: false, fajr: true });
    resetAdhanAudioSettingsMemoryForTesting();
    expect(loadAdhanAutoPlay()).toEqual({ regular: false, fajr: true });
    expect(JSON.parse(localStorage.getItem(ADHAN_AUTOPLAY_STORAGE_KEY)!)).toEqual({ regular: false, fajr: true });
    // The voice/mode choices are untouched.
    expect(loadAdhanAudioSettings().fajr.recordingId).toBe(DEFAULT_FAJR_RECORDING_ID);
  });
});

