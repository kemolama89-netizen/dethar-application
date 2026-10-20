import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ pauseAdhan: vi.fn(() => Promise.resolve()), resumeAdhan: vi.fn(() => Promise.resolve()), stopAdhan: vi.fn(() => Promise.resolve()) }));
vi.mock("./audioAdhkarNative", () => ({ AudioAdhkarNative: native, isAudioAdhkarNativeAvailable: () => true }));

import { applyNativeAdhanState, getAdhanNowPlaying, pauseAdhan, resetAdhanPlaybackForTesting, resumeAdhan, stopAdhan } from "./adhanPlayback";

const playing = { active: true, status: "playing" as const, title: "حان وقت الظهر", voice: "Mishary — Kuwait", muezzin: "مشاري العفاسي" };

afterEach(() => {
  resetAdhanPlaybackForTesting();
  vi.clearAllMocks();
});

describe("adhan playback state", () => {
  it("follows what the native player reports, including waiting for the audio and the end", () => {
    applyNativeAdhanState(playing);
    expect(getAdhanNowPlaying()).toMatchObject({ status: "playing", muezzin: "مشاري العفاسي" });
    applyNativeAdhanState({ ...playing, status: "waiting" });
    expect(getAdhanNowPlaying()?.status).toBe("waiting");
    applyNativeAdhanState(null);
    expect(getAdhanNowPlaying()).toBeNull();
  });

  it("ignores an inactive or unknown state", () => {
    applyNativeAdhanState({ ...playing, active: false });
    expect(getAdhanNowPlaying()).toBeNull();
    applyNativeAdhanState({ ...playing, status: "buffering" as never });
    expect(getAdhanNowPlaying()).toBeNull();
  });

  it("controls act on the adhan only, and only from a matching state", () => {
    pauseAdhan();
    stopAdhan();
    expect(native.pauseAdhan).not.toHaveBeenCalled();
    expect(native.stopAdhan).not.toHaveBeenCalled();
    applyNativeAdhanState(playing);
    resumeAdhan(); // already playing: nothing to resume
    expect(native.resumeAdhan).not.toHaveBeenCalled();
    pauseAdhan();
    expect(native.pauseAdhan).toHaveBeenCalledTimes(1);
    expect(getAdhanNowPlaying()?.status).toBe("paused");
    resumeAdhan();
    expect(native.resumeAdhan).toHaveBeenCalledTimes(1);
    applyNativeAdhanState({ ...playing, status: "waiting" });
    resumeAdhan(); // the user's tap takes the audio back for a waiting adhan
    expect(native.resumeAdhan).toHaveBeenCalledTimes(2);
    stopAdhan();
    expect(native.stopAdhan).toHaveBeenCalledTimes(1);
    expect(getAdhanNowPlaying()).toBeNull();
  });
});
