// «تشغيل الكل» / Play All: a section's recorded adhkar one after another
// from one tap — in the app (web build) through the in-app player, and on
// Android as ONE manual native session over the whole list. Pause/resume
// (also in the silence between two adhkar), a single «استماع» or Stop ending
// the run, finishing, leaving the list and re-entering it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import type { NativeAudioAdhkarState, NativePlaylistItem } from "./audioAdhkarNative";

vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));
const native = vi.hoisted(() => ({ available: false }));
const playNow = vi.hoisted(() => vi.fn(async (_options: unknown) => ({ started: true })));
const stopManual = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    playNow,
    stopManual,
    stop: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  },
}));

import { AUDIO_VARIOUS_ITEMS, audioAdhkarItems } from "../data/audio-adhkar";
import {
  applyNativePlaybackState,
  getAudioAdhkarPlayAll,
  getAudioAdhkarSource,
  getAudioVariousSource,
  pauseAudioAdhkar,
  playableAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkarPlayAll,
  startAudioVarious,
  stopAudioAdhkar,
  stopAudioAdhkarPlayback,
} from "./audioAdhkarPlayer";
import type { AudioAdhkarPlayAllEntry } from "./audioAdhkarPlayer";

class FakeAudio implements AudioElementLike {
  src = "";
  played: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.played.push(this.src);
  }
  pause() {}
  removeAttribute() {}
  load() {}
  end() {
    this.onended?.();
  }
}

let fake: FakeAudio;
beforeEach(() => {
  vi.useFakeTimers();
  native.available = false;
  playNow.mockClear();
  stopManual.mockClear();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkarPlayback();
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

const various: AudioAdhkarPlayAllEntry[] = AUDIO_VARIOUS_ITEMS.map((item) => ({ kind: "various", item }));
const recordedVarious = AUDIO_VARIOUS_ITEMS.filter((i) => getAudioVariousSource(i));
const urlOf = (i: number) => getAudioVariousSource(recordedVarious[i])!.urls[0];

describe("Play All in the app", () => {
  it("plays every recorded Various dhikr in order, without a tap between them, then finishes", () => {
    expect(startAudioAdhkarPlayAll("misc", various)).toBe(true);
    expect(getAudioAdhkarPlayAll()).toEqual({ collection: "misc", index: 0, count: recordedVarious.length });
    expect(fake.played.at(-1)).toContain(urlOf(0).split("/").pop());
    for (let i = 1; i < recordedVarious.length; i++) {
      fake.end();
      // The silence between two adhkar: nothing new yet, the finished one still shown.
      expect(getNowPlaying()?.itemId).toBe(recordedVarious[i - 1].id);
      vi.advanceTimersByTime(REPETITION_PAUSE_MS);
      expect(getNowPlaying()).toMatchObject({ itemId: recordedVarious[i].id, status: "playing" });
      expect(getAudioAdhkarPlayAll()?.index).toBe(i);
      expect(fake.played.at(-1)).toContain(urlOf(i).split("/").pop());
    }
    fake.end();
    expect(getNowPlaying()?.status).toBe("finished");
    expect(getAudioAdhkarPlayAll()).toBeNull();
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    expect(fake.played).toHaveLength(recordedVarious.length);
  });

  it("pauses and resumes — during a dhikr and in the silence before the next", () => {
    startAudioAdhkarPlayAll("misc", various);
    pauseAudioAdhkar();
    expect(getNowPlaying()?.status).toBe("paused");
    resumeAudioAdhkar();
    expect(getNowPlaying()?.status).toBe("playing");
    fake.end();
    pauseAudioAdhkar();
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    // Held: the next dhikr hasn't started.
    expect(getNowPlaying()).toMatchObject({ itemId: recordedVarious[0].id, status: "paused" });
    resumeAudioAdhkar();
    vi.advanceTimersByTime(REPETITION_PAUSE_MS);
    expect(getNowPlaying()).toMatchObject({ itemId: recordedVarious[1].id, status: "playing" });
    expect(getAudioAdhkarPlayAll()?.index).toBe(1);
  });

  it("gives way to a single «استماع», and ends with Stop or when the list is left", () => {
    startAudioAdhkarPlayAll("misc", various);
    startAudioVarious(recordedVarious[3]);
    expect(getAudioAdhkarPlayAll()).toBeNull();
    fake.end();
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    expect(getNowPlaying()?.status).toBe("finished");

    startAudioAdhkarPlayAll("misc", various);
    stopAudioAdhkarPlayback();
    expect(getAudioAdhkarPlayAll()).toBeNull();
    expect(getNowPlaying()).toBeNull();

    startAudioAdhkarPlayAll("misc", various);
    stopAudioAdhkar(); // leaving the list (in-app playback)
    expect(getAudioAdhkarPlayAll()).toBeNull();
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    expect(getNowPlaying()).toBeNull();
  });

  it("starts at any time — it doesn't depend on the scheduled window", () => {
    vi.setSystemTime(new Date(2026, 9, 18, 23, 59));
    expect(startAudioAdhkarPlayAll("misc", various)).toBe(true);
    vi.setSystemTime(new Date(2026, 9, 18, 3, 0));
    stopAudioAdhkarPlayback();
    expect(startAudioAdhkarPlayAll("misc", various)).toBe(true);
  });

  it("plays only the adhkar that have a recording, and nothing when none has", () => {
    const morning: AudioAdhkarPlayAllEntry[] = audioAdhkarItems.morning.map((item) => ({ kind: "written", item }));
    const playable = playableAudioAdhkar("morning", morning);
    expect(playable.length).toBeGreaterThan(1);
    for (const e of playable) expect(getAudioAdhkarSource("morning", e.item as (typeof audioAdhkarItems.morning)[number])).not.toBeNull();
    expect(startAudioAdhkarPlayAll("misc", [])).toBe(false);
    expect(getAudioAdhkarPlayAll()).toBeNull();
  });
});

describe("Play All on Android", () => {
  const nativeState = (over: Partial<NativeAudioAdhkarState>): NativeAudioAdhkarState => ({
    active: true,
    collection: "morning",
    dhikrId: "x",
    title: "",
    repetition: 1,
    total: 1,
    status: "playing",
    index: 0,
    count: 1,
    manual: true,
    ...over,
  });

  it("hands the whole section to the native player as ONE session, in order", () => {
    native.available = true;
    const entries: AudioAdhkarPlayAllEntry[] = audioAdhkarItems.morning.map((item) => ({ kind: "written", item }));
    expect(startAudioAdhkarPlayAll("morning", entries)).toBe(true);
    expect(playNow).toHaveBeenCalledTimes(1);
    const { collection, item, items } = playNow.mock.calls[0][0] as { collection: string; item: NativePlaylistItem; items: NativePlaylistItem[] };
    expect(collection).toBe("morning");
    const expected = playableAudioAdhkar("morning", entries).map((e) => e.item.id);
    expect(items.map((i) => i.dhikrId)).toEqual(expected);
    expect(item.dhikrId).toBe(expected[0]);
    expect(getAudioAdhkarPlayAll()).toEqual({ collection: "morning", index: 0, count: expected.length });
  });

  it("follows the native session's place — also after leaving and re-entering, or reopening the app", () => {
    native.available = true;
    applyNativePlaybackState(nativeState({ dhikrId: "morning_007", index: 4, count: 20 }));
    expect(getAudioAdhkarPlayAll()).toEqual({ collection: "morning", index: 4, count: 20 });
    stopAudioAdhkar(); // leaving the list: native keeps playing
    expect(getAudioAdhkarPlayAll()).toEqual({ collection: "morning", index: 4, count: 20 });
    applyNativePlaybackState(nativeState({ dhikrId: "morning_007", index: 4, count: 20, status: "paused" }));
    expect(getNowPlaying()?.status).toBe("paused");
    // A single «استماع» (count 1) or a scheduled session is not a Play All run.
    applyNativePlaybackState(nativeState({ count: 1 }));
    expect(getAudioAdhkarPlayAll()).toBeNull();
    applyNativePlaybackState(nativeState({ index: 2, count: 20, manual: false }));
    expect(getAudioAdhkarPlayAll()).toBeNull();
  });

  it("ends when the native session finishes or is stopped", () => {
    native.available = true;
    applyNativePlaybackState(nativeState({ index: 19, count: 20 }));
    applyNativePlaybackState(nativeState({ active: false, status: "finished", index: 19, count: 20 }));
    expect(getAudioAdhkarPlayAll()).toBeNull();
    expect(getNowPlaying()?.status).toBe("finished");
    applyNativePlaybackState(nativeState({ index: 3, count: 20 }));
    stopAudioAdhkarPlayback();
    expect(stopManual).toHaveBeenCalled();
    expect(getAudioAdhkarPlayAll()).toBeNull();
  });
});
