// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ available: true, setVolumes: vi.fn<(options: Record<string, number>) => Promise<void>>(async () => {}) }));
vi.mock("./audioAdhkarNative", () => ({
  AudioAdhkarNative: { setVolumes: native.setVolumes },
  isAudioAdhkarNativeAvailable: () => native.available,
}));

import {
  DEFAULT_VOLUMES,
  loadAudioVolumes,
  resetAudioVolumesForTesting,
  saveAudioVolume,
  subscribeAudioVolumes,
  syncAudioVolumesToNative,
  volumeGain,
} from "./audioVolumeSettings";

beforeEach(() => {
  localStorage.clear();
  resetAudioVolumesForTesting();
  native.available = true;
  native.setVolumes.mockClear();
});

describe("audio volume settings", () => {
  it("every category starts at full volume", () => {
    expect(loadAudioVolumes()).toEqual({ adhan: 100, morning: 100, evening: 100, misc: 100 });
    expect(DEFAULT_VOLUMES.adhan).toBe(100);
  });

  it("each category is independent and persists in storage (a restart reads it back)", () => {
    saveAudioVolume("adhan", 35);
    saveAudioVolume("misc", 70);
    resetAudioVolumesForTesting(); // a fresh app start: only storage remains
    expect(loadAudioVolumes()).toEqual({ adhan: 35, morning: 100, evening: 100, misc: 70 });
    expect(JSON.parse(localStorage.getItem("dithar:audio-volumes:v1")!)).toEqual({ adhan: 35, morning: 100, evening: 100, misc: 70 });
  });

  it("clamps and rounds what it is given; unreadable storage falls back to full volume", () => {
    expect(saveAudioVolume("morning", 140).morning).toBe(100);
    expect(saveAudioVolume("morning", -5).morning).toBe(0);
    expect(saveAudioVolume("morning", 42.6).morning).toBe(43);
    localStorage.setItem("dithar:audio-volumes:v1", "{not json");
    expect(loadAudioVolumes()).toEqual(DEFAULT_VOLUMES);
    localStorage.setItem("dithar:audio-volumes:v1", JSON.stringify({ adhan: "loud", evening: 20 }));
    expect(loadAudioVolumes()).toEqual({ ...DEFAULT_VOLUMES, evening: 20 });
  });

  it("is a gain from 0 to 1 for the players", () => {
    saveAudioVolume("evening", 25);
    expect(volumeGain("evening")).toBe(0.25);
    expect(volumeGain("adhan")).toBe(1);
  });

  it("every change reaches the native player (scheduled/background playback) as gains, and listeners", async () => {
    const heard: number[] = [];
    subscribeAudioVolumes((v) => heard.push(v.adhan));
    saveAudioVolume("adhan", 60);
    await Promise.resolve();
    expect(heard).toEqual([60]);
    expect(native.setVolumes).toHaveBeenLastCalledWith({ adhan: 0.6, morning: 1, evening: 1, misc: 1 });
  });

  it("off Android nothing is sent; a native failure is swallowed (the next launch sends again)", async () => {
    native.available = false;
    await syncAudioVolumesToNative();
    expect(native.setVolumes).not.toHaveBeenCalled();
    native.available = true;
    native.setVolumes.mockRejectedValueOnce(new Error("bridge down"));
    await expect(syncAudioVolumesToNative()).resolves.toBeUndefined();
  });

  it("when storage is unavailable, the level still applies for the session", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveAudioVolume("misc", 15).misc).toBe(15);
    expect(loadAudioVolumes().misc).toBe(15);
    setItem.mockRestore();
  });
});
