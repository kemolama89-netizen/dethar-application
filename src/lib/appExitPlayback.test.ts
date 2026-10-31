// @vitest-environment jsdom
// Exit (and Home / the screen turning off, which never reach JS at all)
// must leave Audio Adhkar playing in its native service.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativePlaylistItem } from "./audioAdhkarNative";

const native = vi.hoisted(() => ({
  exitApp: vi.fn(async () => {}),
  plugin: {
    playNow: vi.fn<(options: { collection: string; item: NativePlaylistItem }) => Promise<{ started: boolean }>>(async () => ({ started: true })),
    stopManual: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    log: vi.fn<(options: { message: string }) => Promise<void>>(async () => {}),
  },
}));
vi.mock("@capacitor/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@capacitor/core")>();
  return { ...real, Capacitor: { ...real.Capacitor, isNativePlatform: () => true } };
});
vi.mock("@capacitor/app", () => ({ App: { exitApp: native.exitApp, addListener: vi.fn(async () => ({ remove: async () => {} })) } }));
vi.mock("./audioAdhkarNative", () => ({ AudioAdhkarNative: native.plugin, isAudioAdhkarNativeAvailable: () => true }));

import { exitAppSafely } from "./appExit";
import { applyNativePlaybackState, startAudioAdhkar, startAudioVarious, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { getNowPlaying } from "./audioAdhkarPlayback";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  applyNativePlaybackState(null);
});

describe("Exit leaves Audio Adhkar playing", () => {
  it("a «استماع» dhikr keeps playing in the native service after Exit", async () => {
    startAudioAdhkar("evening", writtenAdhkarItems.evening.find((i) => i.id === "morning_008")!);
    applyNativePlaybackState({ active: true, collection: "evening", dhikrId: "morning_008", title: "", repetition: 1, total: 3, status: "playing", index: 0, count: 1, manual: true });
    await exitAppSafely();
    expect(native.exitApp).toHaveBeenCalledTimes(1);
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
    expect(native.plugin.stop).not.toHaveBeenCalled();
    expect(native.plugin.pause).not.toHaveBeenCalled();
    expect(getNowPlaying()?.status).toBe("playing");
  });

  // The real path: Exit is only on the Home screen, so the Audio Adhkar
  // list unmounts first (its effect calls stopAudioAdhkar), then Exit.
  it("still plays after leaving the list and then pressing Exit", async () => {
    startAudioAdhkar("evening", writtenAdhkarItems.evening.find((i) => i.id === "morning_008")!);
    applyNativePlaybackState({ active: true, collection: "evening", dhikrId: "morning_008", title: "", repetition: 1, total: 3, status: "playing", index: 0, count: 1, manual: true });
    stopAudioAdhkar();
    await exitAppSafely();
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
    expect(native.plugin.stop).not.toHaveBeenCalled();
    expect(getNowPlaying()?.status).toBe("playing");
  });

  it("a Various dhikr too", async () => {
    startAudioVarious(AUDIO_VARIOUS_ITEMS.find((i) => i.id === "tasbeeh-3")!);
    await exitAppSafely();
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
  });

  it("records which player «استماع» used, for the diagnostics trace", () => {
    startAudioAdhkar("evening", writtenAdhkarItems.evening.find((i) => i.id === "morning_008")!);
    expect(native.plugin.log).toHaveBeenCalledWith({ message: expect.stringContaining("listen: native playNow evening/morning_008 ×3") });
  });
});
