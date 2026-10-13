// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  available: false,
  busy: false,
  listeners: new Map<string, () => void>(),
}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    getPlaybackState: vi.fn(async () => ({ state: null, busy: native.busy })),
    addListener: vi.fn(async (name: string, fn: () => void) => {
      native.listeners.set(name, fn);
      return { remove: async () => {} };
    }),
    setVolumes: vi.fn(async () => {}),
  },
}));

import { endVolumePreview, PREVIEW_IDLE_MS, PREVIEW_TAIL_MS, previewingCategory, previewSampleFor, previewVolume, setPreviewElementFactory, stopVolumePreview } from "./volumePreview";
import type { PreviewElement } from "./volumePreview";
import { claimAudio, getActiveAudio, stopAudio } from "./audioEngine";
import { audioAdhkarPlayback } from "./audioAdhkarPlayback";
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
    expect(previewSampleFor("adhan")).toEqual({ url: expect.stringContaining("Mohamed%20Refaat"), startAt: refaat.segments.takbeer!.start });
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
