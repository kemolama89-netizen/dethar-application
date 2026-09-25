import { afterEach, describe, expect, it } from "vitest";
import { afterRepetitionEnded, audioAdhkarPlayback, getNowPlaying, playbackFor, startedState, subscribeAudioAdhkarPlayback } from "./audioAdhkarPlayback";

const ref = { collection: "evening", itemId: "morning_003" } as const;

afterEach(() => audioAdhkarPlayback.stop());

describe("repetition transitions", () => {
  it("starts on repetition 1", () => {
    expect(startedState(ref, 3)).toEqual({ ...ref, repetition: 1, total: 3, status: "playing" });
  });

  it("advances 1 → 2 → 3 → finished after each complete playback", () => {
    let s = afterRepetitionEnded(startedState(ref, 3));
    expect(s?.repetition).toBe(2);
    s = afterRepetitionEnded(s);
    expect(s?.repetition).toBe(3);
    s = afterRepetitionEnded(s);
    expect(s).toMatchObject({ repetition: 3, status: "finished" });
    expect(afterRepetitionEnded(s)).toBe(s);
  });

  it("finishes a single-repetition dhikr after one playback", () => {
    expect(afterRepetitionEnded(startedState(ref, 1))?.status).toBe("finished");
  });

  it("keeps counting up when there is no fixed total", () => {
    const s = afterRepetitionEnded(afterRepetitionEnded(startedState(ref, null)));
    expect(s).toMatchObject({ repetition: 3, status: "playing" });
  });

  it("ignores repetitionEnded while idle", () => {
    expect(afterRepetitionEnded(null)).toBeNull();
  });
});

describe("store", () => {
  it("notifies subscribers and handles pause / resume / stop", () => {
    let calls = 0;
    const unsubscribe = subscribeAudioAdhkarPlayback(() => calls++);
    audioAdhkarPlayback.startDhikr(ref, 3);
    audioAdhkarPlayback.pause();
    expect(getNowPlaying()?.status).toBe("paused");
    audioAdhkarPlayback.pause();
    audioAdhkarPlayback.resume();
    expect(getNowPlaying()?.status).toBe("playing");
    audioAdhkarPlayback.repetitionEnded();
    expect(getNowPlaying()?.repetition).toBe(2);
    audioAdhkarPlayback.stop();
    expect(getNowPlaying()).toBeNull();
    expect(calls).toBe(5);
    unsubscribe();
  });

  it("matches playback to one dhikr in one collection — Morning and Evening share ids", () => {
    const playing = startedState(ref, 3);
    expect(playbackFor(playing, ref)).toBe(playing);
    expect(playbackFor(playing, { collection: "morning", itemId: "morning_003" })).toBeNull();
    expect(playbackFor(null, ref)).toBeNull();
  });
});
