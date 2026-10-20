// A recording that can't play is reported for THAT dhikr (the player shows
// a short notice under it) — from the in-app engine's error, from Android
// refusing or failing «استماع», and from the background service ending a
// session on a MediaPlayer error. A pause, a stop, another source taking
// over, or a normal finish never reports one; starting any dhikr clears it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import { getNowPlaying } from "./audioAdhkarPlayback";
import type { NativeAudioAdhkarState } from "./audioAdhkarNative";

vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));
const native = vi.hoisted(() => ({
  available: false,
  playNow: { result: Promise.resolve({ started: true }) as Promise<{ started: boolean }> },
}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    playNow: vi.fn(() => native.playNow.result),
    stop: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  },
}));

import { writtenAdhkarItems } from "../data/written-adhkar";
import { applyNativePlaybackState, getAudioAdhkarPlaybackFailure, startAudioAdhkar, stopAudioAdhkar, subscribeAudioAdhkarPlaybackFailure } from "./audioAdhkarPlayer";

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
const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
const morning = (id: string) => writtenAdhkarItems.morning.find((i) => i.id === id)!;

beforeEach(() => {
  vi.useFakeTimers();
  native.available = false;
  native.playNow.result = Promise.resolve({ started: true });
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

describe("playback failures", () => {
  it("an in-app playback error stops the dhikr and is reported for it; starting again clears it", () => {
    const seen = vi.fn();
    const unsubscribe = subscribeAudioAdhkarPlaybackFailure(seen);
    startAudioAdhkar("evening", evening("morning_016"));
    fake.onerror?.();
    expect(getNowPlaying()).toBeNull();
    expect(getAudioAdhkarPlaybackFailure()).toEqual({ collection: "evening", itemId: "morning_016" });
    expect(seen).toHaveBeenCalledTimes(1);
    startAudioAdhkar("evening", evening("morning_016"));
    expect(getAudioAdhkarPlaybackFailure()).toBeNull();
    unsubscribe();
  });

  it("stopping, another source taking over and finishing are not failures", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    stopAudioAdhkar();
    expect(getAudioAdhkarPlaybackFailure()).toBeNull();
    startAudioAdhkar("evening", evening("morning_016"));
    claimAudio("quran", "quran:x", () => {});
    expect(getAudioAdhkarPlaybackFailure()).toBeNull();
    startAudioAdhkar("evening", evening("morning_016"));
    fake.onended?.();
    expect(getNowPlaying()?.status).toBe("finished");
    expect(getAudioAdhkarPlaybackFailure()).toBeNull();
  });

  it("Android refusing or failing «استماع» is reported for that dhikr", async () => {
    native.available = true;
    native.playNow.result = Promise.resolve({ started: false });
    expect(startAudioAdhkar("morning", morning("morning_016"))).toBe(true);
    await vi.runAllTimersAsync();
    expect(getNowPlaying()).toBeNull();
    expect(getAudioAdhkarPlaybackFailure()).toEqual({ collection: "morning", itemId: "morning_016" });

    native.playNow.result = Promise.reject(new Error("bridge"));
    startAudioAdhkar("morning", morning("morning_016"));
    expect(getAudioAdhkarPlaybackFailure()).toBeNull(); // cleared as it starts
    await vi.runAllTimersAsync();
    expect(getAudioAdhkarPlaybackFailure()).toEqual({ collection: "morning", itemId: "morning_016" });
  });

  it("the background service ending a session on a playback error is reported; a plain end is not", () => {
    const playing: NativeAudioAdhkarState = { active: true, collection: "morning", dhikrId: "morning_016", title: "", repetition: 1, total: 1, status: "playing", index: 0, count: 1 };
    applyNativePlaybackState(playing);
    applyNativePlaybackState(null);
    expect(getAudioAdhkarPlaybackFailure()).toBeNull();

    applyNativePlaybackState(playing);
    applyNativePlaybackState({ ...playing, active: false, status: "error" });
    expect(getNowPlaying()).toBeNull();
    expect(getAudioAdhkarPlaybackFailure()).toEqual({ collection: "morning", itemId: "morning_016" });

    // A late copy of the same final state (e.g. read again on resume) changes nothing.
    applyNativePlaybackState({ ...playing, active: false, status: "error" });
    expect(getNowPlaying()).toBeNull();
  });
});
