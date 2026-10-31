// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { getNowPlaying } from "./audioAdhkarPlayback";
import { getAudioAdhkarSource, startAudioAdhkar, startAudioVarious, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { buildAdhanWindows } from "./adhanSuppression";
import { saveSectionReciterChoice } from "./audioAdhkarScheduleSettings";
import { loadQuranRotationIndex, saveQuranReciterMode, saveQuranRotationIndex } from "./quranAudioPreferences";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";

class FakeAudio implements AudioElementLike {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {}
}

let fake: FakeAudio;
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
const morning = (id: string) => writtenAdhkarItems.morning.find((i) => i.id === id)!;

/** Sets the clock to `minutes` before the next adhan the app shows; returns that adhan time. */
function minutesBeforeAdhan(minutes: number): number {
  vi.setSystemTime(new Date("2026-10-10T06:00:00Z"));
  const adhan = buildAdhanWindows(new Date())[0][0];
  vi.setSystemTime(adhan - minutes * 60_000);
  return adhan;
}

describe("in-app Audio Adhkar and the adhan", () => {
  it("a dhikr playing when the adhan begins stops right then", () => {
    const adhan = minutesBeforeAdhan(2);
    expect(startAudioAdhkar("evening", evening("morning_006"))).toBe(true); // ×4: still playing at the adhan
    vi.advanceTimersByTime(adhan - Date.now() - 1);
    expect(getNowPlaying()?.status).toBe("playing");
    vi.advanceTimersByTime(1);
    expect(getNowPlaying()).toBeNull();
  });

  it("applies to Various too", () => {
    const adhan = minutesBeforeAdhan(1);
    startAudioVarious(AUDIO_VARIOUS_ITEMS[0]);
    vi.advanceTimersByTime(adhan - Date.now());
    expect(getNowPlaying()).toBeNull();
  });

  it("leaves no timer behind once playback ends on its own — nothing runs between adhkar", () => {
    // Counting pending timers exactly: keep jsdom's per-write "storage" event timers (the heard-count) out of it.
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    minutesBeforeAdhan(20);
    startAudioAdhkar("evening", evening("morning_005")); // ×1
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    fake.onended?.();
    expect(getNowPlaying()).toMatchObject({ status: "finished" });
    expect(vi.getTimerCount()).toBe(0);
    setItem.mockRestore();
  });
});

describe("a section's own reciter applies to in-app playback too", () => {
  it("Morning's Quranic adhkar use Morning's reciter; Evening uses its own", () => {
    saveSectionReciterChoice("morning", "husary-murattal");
    saveSectionReciterChoice("evening", "minshawi-murattal");
    expect(getAudioAdhkarSource("morning", morning("morning_001"))!.urls.every((u) => u.includes("/quran/husary-murattal/"))).toBe(true);
    expect(getAudioAdhkarSource("evening", evening("morning_001"))!.urls.every((u) => u.includes("/quran/minshawi-murattal/"))).toBe(true);
  });

  it("Audio Adhkar never moves the app-wide Quran rotation any more", () => {
    saveQuranReciterMode("rotation");
    saveQuranRotationIndex(2);
    saveSectionReciterChoice("morning", "random");
    saveSectionReciterChoice("evening", "minshawi-murattal");
    startAudioAdhkar("morning", morning("morning_001"));
    stopAudioAdhkar();
    startAudioAdhkar("evening", evening("morning_001"));
    expect(loadQuranRotationIndex()).toBe(2);
  });
});
