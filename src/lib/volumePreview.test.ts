// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  available: false,
  busy: false,
  inCall: false,
  listeners: new Map<string, () => void>(),
}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    getPlaybackState: vi.fn(async () => ({ state: null, busy: native.busy, inCall: native.inCall })),
    addListener: vi.fn(async (name: string, fn: () => void) => {
      native.listeners.set(name, fn);
      return { remove: async () => {} };
    }),
    setVolumes: vi.fn(async () => {}),
  },
}));

import {
  blockedPreviewCategory,
  endVolumePreview,
  PREVIEW_IDLE_MS,
  PREVIEW_TAIL_MS,
  previewingCategory,
  previewSampleFor,
  previewVolume,
  setPreviewElementFactory,
  stopVolumePreview,
  subscribeVolumePreview,
  testVolumePreview,
} from "./volumePreview";
import { AudioAdhkarNative } from "./audioAdhkarNative";
import { loadAudioVolumes, resetAudioVolumesForTesting, saveAudioVolume, volumeGain } from "./audioVolumeSettings";
import type { PreviewElement } from "./volumePreview";
import { claimAudio, getActiveAudio, stopAudio } from "./audioEngine";
import { audioAdhkarPlayback, getNowPlaying } from "./audioAdhkarPlayback";
import { getAdhanRecordingById } from "../data/adhanRecordings";
import { saveRegularAdhanChoice } from "./adhanAudioSettings";

interface Fake extends PreviewElement {
  playing: boolean;
  plays: number;
}
let elements: Fake[] = [];

function fake(): Fake {
  const el: Fake = {
    src: "",
    volume: 1,
    currentTime: 0,
    playing: false,
    plays: 0,
    play() {
      el.playing = true;
      el.plays += 1;
    },
    pause() {
      el.playing = false;
    },
    removeAttribute(name: string) {
      if (name === "src") el.src = "";
    },
    load() {},
    onloadedmetadata: null,
    onended: null,
    onerror: null,
    ontimeupdate: null,
  };
  elements.push(el);
  return el;
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const playing = () => elements.filter((e) => e.playing);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  native.available = false;
  native.busy = false;
  native.inCall = false;
  elements = [];
  setPreviewElementFactory(fake);
  audioAdhkarPlayback.stop();
  stopAudio();
});
afterEach(() => {
  stopVolumePreview();
  vi.useRealTimers();
});

describe("each slider previews its own kind of audio", () => {
  it("the adhan: the selected voice's opening takbir; the adhkar: a recording of that section", () => {
    saveRegularAdhanChoice({ recordingId: "refaat", mode: "full" });
    const refaat = getAdhanRecordingById("refaat")!;
    expect(previewSampleFor("adhan")).toEqual({ url: expect.stringContaining("Mohamed%20Refaat"), startAt: refaat.segments.takbeer!.start, endAt: refaat.segments.takbeer!.end });
    expect(previewSampleFor("morning")!.url).toContain("audio/adhkar/morning/");
    expect(previewSampleFor("evening")!.url).toContain("audio/adhkar/evening/");
    expect(previewSampleFor("misc")!.url).toContain("audio/audio-azkar/");
  });
});

describe("the preview while adjusting", () => {
  it("plays at the chosen level; moving the same slider only changes the volume — never restarts or overlaps", async () => {
    expect(previewVolume("adhan", 40)).toBe(true);
    await flush();
    expect(playing()).toHaveLength(1);
    const el = playing()[0];
    expect(el.volume).toBe(0.4);
    expect(getActiveAudio()).toEqual({ channel: "preview", key: "preview:adhan" });
    previewVolume("adhan", 75);
    previewVolume("adhan", 20);
    expect(el.volume).toBe(0.2);
    expect(el.plays).toBe(1);
    expect(elements).toHaveLength(1);
  });

  it("another slider switches the sample: the first stops before the second plays, each at its own level", async () => {
    previewVolume("adhan", 30);
    await flush();
    previewVolume("evening", 90);
    await flush();
    expect(playing()).toHaveLength(1);
    expect(playing()[0].volume).toBe(0.9);
    expect(previewingCategory()).toBe("evening");
    expect(elements[0].playing).toBe(false);
  });

  it("stops a moment after the adjustment ends (a tap is heard), or after the slider stops moving", async () => {
    previewVolume("misc", 50);
    await flush();
    endVolumePreview();
    vi.advanceTimersByTime(PREVIEW_TAIL_MS - 1);
    expect(playing()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(playing()).toHaveLength(0);
    expect(getActiveAudio()).toBeNull();

    previewVolume("misc", 60);
    await flush();
    vi.advanceTimersByTime(PREVIEW_IDLE_MS);
    expect(playing()).toHaveLength(0);
  });

  it("stops at once when the user leaves the screen or the app goes to the background", async () => {
    previewVolume("morning", 50);
    await flush();
    stopVolumePreview();
    expect(playing()).toHaveLength(0);
    previewVolume("morning", 50);
    await flush();
    document.dispatchEvent(new Event("pause"));
    expect(playing()).toHaveLength(0);
    document.dispatchEvent(new Event("resume"));
  });
});

describe("never over real playback", () => {
  it("in-app playback starting stops the sample", async () => {
    previewVolume("evening", 50);
    await flush();
    claimAudio("adhkar", "adhkar:evening/morning_003", () => {});
    expect(playing()).toHaveLength(0);
    expect(previewingCategory()).toBeNull();
  });

  it("while something plays, no sample starts (the level then applies to that playback)", async () => {
    claimAudio("quran", "q", () => {});
    expect(previewVolume("morning", 50)).toBe(false);
    stopAudio();
    audioAdhkarPlayback.startDhikr({ collection: "morning", itemId: "morning_003" }, 1);
    expect(previewVolume("morning", 50)).toBe(false);
    await flush();
    expect(elements).toHaveLength(0);
  });

  it("the playback state going active (a native session mirrored) stops the sample", async () => {
    previewVolume("adhan", 50);
    await flush();
    audioAdhkarPlayback.mirror({ collection: "evening", itemId: "morning_003", repetition: 1, total: 1, status: "playing" });
    expect(playing()).toHaveLength(0);
  });

  it("Android: nothing starts while the native player is busy (the adhan too); a native session starting stops it", async () => {
    native.available = true;
    native.busy = true;
    expect(previewVolume("adhan", 50)).toBe(true); // checking…
    await flush();
    expect(elements).toHaveLength(0);
    expect(previewingCategory()).toBeNull();

    native.busy = false;
    previewVolume("adhan", 50);
    await flush();
    expect(playing()).toHaveLength(1);
    native.listeners.get("sessionStarted")!();
    expect(playing()).toHaveLength(0);
  });
});

describe("«تجربة الصوت» (Test audio)", () => {
  it("plays that category's sample at the selected level to its natural end — no time limit", async () => {
    expect(testVolumePreview("morning", 40)).toBe(true);
    await flush();
    expect(playing()).toHaveLength(1);
    expect(playing()[0].src).toContain("audio/adhkar/morning/");
    expect(playing()[0].volume).toBeCloseTo(0.4);
    vi.advanceTimersByTime(10 * 60_000);
    expect(playing()).toHaveLength(1);
    playing()[0].onended!();
    expect(playing()).toHaveLength(0);
    expect(previewingCategory()).toBeNull();
  });

  it("moving the slider during the test changes its volume at once and never ends it", async () => {
    testVolumePreview("misc", 100);
    await flush();
    const el = playing()[0];
    expect(previewVolume("misc", 30)).toBe(true);
    expect(el.volume).toBeCloseTo(0.3);
    endVolumePreview(); // the slider let go
    vi.advanceTimersByTime(PREVIEW_IDLE_MS + PREVIEW_TAIL_MS + 60_000);
    expect(el.playing).toBe(true);
    expect(elements).toHaveLength(1); // same sample, never restarted
  });

  it("the adhan's sample ends with its takbir segment, not the whole recording", async () => {
    saveRegularAdhanChoice({ recordingId: "refaat", mode: "full" });
    const takbeer = getAdhanRecordingById("refaat")!.segments.takbeer!;
    expect(previewSampleFor("adhan")!.endAt).toBe(takbeer.end);
    testVolumePreview("adhan", 100);
    await flush();
    const el = playing()[0];
    el.currentTime = takbeer.end - 1;
    el.ontimeupdate!();
    expect(el.playing).toBe(true);
    el.currentTime = takbeer.end;
    el.ontimeupdate!();
    expect(el.playing).toBe(false);
    expect(previewingCategory()).toBeNull();
  });

  it("the slider's own preview keeps its short tail", async () => {
    previewVolume("morning", 50);
    await flush();
    endVolumePreview();
    vi.advanceTimersByTime(PREVIEW_TAIL_MS);
    expect(playing()).toHaveLength(0);
  });

  it("each button uses its own category's sample — the adhan's is the adhan, never an adhkar", async () => {
    testVolumePreview("adhan", 70);
    await flush();
    expect(playing()[0].src).toBe(previewSampleFor("adhan")!.url);
    expect(playing()[0].volume).toBeCloseTo(0.7);
    testVolumePreview("misc", 20);
    await flush();
    expect(playing()).toHaveLength(1); // the adhan's sample stopped first — never two at once
    expect(playing()[0].src).toContain("audio/audio-azkar/");
    expect(playing()[0].volume).toBeCloseTo(0.2);
  });

  it("stops cleanly when cancelled, or when the sample ends first", async () => {
    testVolumePreview("evening", 100);
    await flush();
    const el = playing()[0];
    stopVolumePreview();
    expect(el.playing).toBe(false);
    expect(el.src).toBe("");
    testVolumePreview("evening", 100);
    await flush();
    playing()[0].onended!();
    expect(playing()).toHaveLength(0);
    expect(previewingCategory()).toBeNull();
  });

  it("tapping again restarts the sample from its start, at the newly selected level", async () => {
    testVolumePreview("morning", 30);
    await flush();
    testVolumePreview("morning", 90);
    await flush();
    expect(playing()).toHaveLength(1);
    expect(playing()[0].volume).toBeCloseTo(0.9);
    expect(elements).toHaveLength(2);
  });

  it("tells the Settings screen when a sample starts and stops", async () => {
    const listener = vi.fn();
    const stop = subscribeVolumePreview(listener);
    testVolumePreview("misc", 50);
    await flush();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    stopVolumePreview();
    expect(listener).toHaveBeenCalled();
    stop();
  });

  it("Android: never starts during a call (or ringing), and says so", async () => {
    native.available = true;
    native.inCall = true;
    expect(testVolumePreview("adhan", 80)).toBe(true); // asked; refused once native answers
    await flush();
    expect(playing()).toHaveLength(0);
    expect(previewingCategory()).toBeNull();
    expect(blockedPreviewCategory()).toBe("adhan");
    native.inCall = false;
    testVolumePreview("adhan", 80);
    await flush();
    expect(playing()).toHaveLength(1);
    expect(blockedPreviewCategory()).toBeNull();
  });

  it("Android: never overlaps the adhan or an adhkar session playing natively", async () => {
    native.available = true;
    native.busy = true;
    testVolumePreview("morning", 80);
    await flush();
    expect(playing()).toHaveLength(0);
    expect(blockedPreviewCategory()).toBe("morning");
  });

  it("never over in-app playback: refused at once", () => {
    claimAudio("adhkar", "real", () => {});
    expect(testVolumePreview("misc", 50)).toBe(false);
    expect(blockedPreviewCategory()).toBe("misc");
    expect(getActiveAudio()?.key).toBe("real");
  });

  it("changes nothing else: no saved setting, no volume push, no playback state", async () => {
    native.available = true;
    vi.mocked(AudioAdhkarNative.setVolumes).mockClear();
    const before = JSON.stringify({ ...localStorage });
    testVolumePreview("adhan", 10);
    await flush();
    playing()[0].onended!();
    expect(JSON.stringify({ ...localStorage })).toBe(before);
    expect(AudioAdhkarNative.setVolumes).not.toHaveBeenCalled();
    expect(getNowPlaying()).toBeNull();
  });
});

describe("each volume setting is its own", () => {
  beforeEach(() => resetAudioVolumesForTesting());

  it("changing one category's level leaves the others as they were, and is saved for later playback", () => {
    saveAudioVolume("adhan", 35);
    expect(loadAudioVolumes()).toEqual({ adhan: 35, morning: 100, evening: 100, misc: 100 });
    saveAudioVolume("misc", 60);
    expect(volumeGain("adhan")).toBeCloseTo(0.35);
    expect(volumeGain("misc")).toBeCloseTo(0.6);
    expect(volumeGain("morning")).toBe(1);
    resetAudioVolumesForTesting();
    expect(loadAudioVolumes().adhan).toBe(35); // survives a restart
  });

  it("Android: every level reaches the native player keyed by category", async () => {
    native.available = true;
    saveAudioVolume("evening", 45);
    await flush();
    expect(AudioAdhkarNative.setVolumes).toHaveBeenLastCalledWith({ adhan: 1, morning: 1, evening: 0.45, misc: 1 });
  });
});
