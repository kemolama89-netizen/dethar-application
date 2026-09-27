// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeAudioAdhkarState } from "./audioAdhkarNative";

// A fake of the native Android plugin — records every call.
const native = vi.hoisted(() => {
  const listeners: ((e: { state: unknown }) => void)[] = [];
  return {
    available: true,
    listeners,
    plugin: {
      setEveningSchedule: vi.fn(async (o: { enabled: boolean }) => ({ scheduledAt: o.enabled ? 1_790_000_000_000 : null, exact: true })),
      getPlaybackState: vi.fn(async () => ({ state: null })),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      addListener: vi.fn(async (_: string, fn: (e: { state: unknown }) => void) => {
        listeners.push(fn);
        return { remove: async () => {} };
      }),
    },
  };
});
vi.mock("./audioAdhkarNative", () => ({
  AudioAdhkarNative: native.plugin,
  isAudioAdhkarNativeAvailable: () => native.available,
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(async () => ({ remove: async () => {} })) } }));

import { writtenAdhkarItems } from "../data/written-adhkar";
import { buildEveningAudioPlaylist, startEveningAudioNativeSync, syncEveningAudioSchedule } from "./eveningAudioSchedule";
import { saveEveningAudioSettings } from "./eveningAudioSettings";
import { setUserRepeatCount } from "./audioUserRepeat";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import { applyNativePlaybackState, pauseAudioAdhkar, resumeAudioAdhkar, startAudioAdhkar, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { setAudioElementFactory, stopAudio } from "./audioEngine";

const publicFiles = import.meta.glob("/public/audio/adhkar/**/*.mp3");

beforeEach(() => {
  localStorage.clear();
  native.available = true;
  native.listeners.length = 0;
  vi.clearAllMocks();
  setAudioElementFactory(() => ({ src: "", play() {}, pause() {}, removeAttribute() {}, load() {}, onended: null, onerror: null }));
});
afterEach(() => {
  applyNativePlaybackState(null);
  stopAudioAdhkar();
  stopAudio();
});

describe("scheduled Android playback uses the same repetition pause", () => {
  const sources = import.meta.glob<string>("/android/app/src/main/java/com/dithar/app/audioadhkar/*.kt", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const kt = (name: string) => sources[`/android/app/src/main/java/com/dithar/app/audioadhkar/${name}`];

  it("SilenceGap.SILENCE_MILLIS equals REPETITION_PAUSE_MS (3 s)", () => {
    const m = /const val SILENCE_MILLIS = ([\d_]+)L/.exec(kt("AudioAdhkarLogic.kt"));
    expect(Number(m?.[1].replaceAll("_", ""))).toBe(REPETITION_PAUSE_MS);
    expect(REPETITION_PAUSE_MS).toBe(3_000);
  });

  it("pauses after a repetition that is followed by another, never after the final one", () => {
    const service = kt("AudioAdhkarPlaybackService.kt");
    expect(service).toMatch(/Step\.NEXT_REPETITION, PlaybackCursor\.Step\.NEXT_DHIKR -> startSilence\(\)/);
    expect(service).toMatch(/Step\.FINISHED -> finishSession\(\)/);
    expect(kt("AudioAdhkarLogic.kt")).toMatch(/repetition < item\.repetitions -> Step\.NEXT_REPETITION/);
  });

  it("hands native each dhikr's own repetition count, Morning/Evening rules unchanged", () => {
    for (const p of buildEveningAudioPlaylist()) {
      const item = writtenAdhkarItems.evening.find((i) => i.id === p.dhikrId)!;
      expect(p.repetitions, p.dhikrId).toBe(item.repeat ?? 1);
    }
  });
});

describe("Evening playlist", () => {
  it("adds morning_023 only once its count is chosen, with exactly that many repetitions", () => {
    try {
      expect(buildEveningAudioPlaylist().some((p) => p.dhikrId === "morning_023")).toBe(false);
      setUserRepeatCount("morning_023", 5);
      const playlist = buildEveningAudioPlaylist();
      expect(playlist.map((p) => p.dhikrId).slice(-2)).toEqual(["morning_023", "evening_001"]);
      expect(playlist.find((p) => p.dhikrId === "morning_023")).toMatchObject({
        assetPath: "public/audio/adhkar/shared/اللهم صل على محمد.mp3",
        repetitions: 5,
      });
    } finally {
      setUserRepeatCount("morning_023", null);
    }
  });

  it("is exactly the recorded Evening dhikr, in Evening order, from the existing mapping", () => {
    const playlist = buildEveningAudioPlaylist();
    expect(playlist.map((p) => p.dhikrId)).toEqual(["morning_003", "morning_005", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_016", "morning_017", "morning_018", "evening_001"]);
    expect(playlist.map((p) => p.assetPath)).toEqual([
      "public/audio/adhkar/evening/morning_003.mp3",
      "public/audio/adhkar/shared/morning_005.mp3",
      "public/audio/adhkar/shared/اللهم عافني في بدني.mp3",
      "public/audio/adhkar/shared/حسبي الله.mp3",
      "public/audio/adhkar/shared/اللهم اني اسالك العفو و العافية.mp3",
      "public/audio/adhkar/shared/اللهم عالم الغيب والشهادة.mp3",
      "public/audio/adhkar/shared/بسم الله الذي لا يضر.mp3",
      "public/audio/adhkar/shared/رضيت بالله ربا.mp3",
      "public/audio/adhkar/evening/morning_016.mp3",
      "public/audio/adhkar/shared/سبحان الله وبحمده.mp3",
      "public/audio/adhkar/shared/لا اله الا الله وحده لا شريك له.mp3",
      "public/audio/adhkar/evening/اعوذ بكلمات التامات.mp3",
    ]);
    for (const p of playlist) expect(publicFiles[`/${p.assetPath}`], p.assetPath).toBeDefined();
    expect(playlist[0].title).toBe("أمسينا وأمسى الملك لله");
    expect(playlist[8].title).toBe("أمسينا على فطرة الإسلام");
    expect(playlist[1].text.replace(/[\u064B-\u065F\u0670]/g, "").startsWith("اللهم أنت ربي")).toBe(true);
  });

  it("uses each dhikr's written repetition count", () => {
    for (const p of buildEveningAudioPlaylist()) {
      const item = writtenAdhkarItems.evening.find((i) => i.id === p.dhikrId)!;
      expect(p.repetitions).toBe(item.repeat ?? 1);
    }
  });

  it("never includes Quranic or unrecorded Evening items", () => {
    const ids = new Set(buildEveningAudioPlaylist().map((p) => p.dhikrId));
    for (const item of writtenAdhkarItems.evening.filter((i) => i.quranRef)) expect(ids.has(item.id)).toBe(false);
  });
});

describe("schedule sync", () => {
  it("creates the schedule when enabled with a start time", async () => {
    const result = await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    expect(native.plugin.setEveningSchedule).toHaveBeenCalledWith({ enabled: true, startMinutes: 22 * 60 + 12, playlist: buildEveningAudioPlaylist() });
    expect(result).toEqual({ available: true, scheduledAt: 1_790_000_000_000, exact: true });
  });

  it("schedules nothing when disabled (native cancels its alarm)", async () => {
    await syncEveningAudioSchedule({ eveningAudioEnabled: false, eveningAudioStartTime: "22:12" });
    expect(native.plugin.setEveningSchedule).toHaveBeenCalledWith({ enabled: false, startMinutes: 22 * 60 + 12, playlist: [] });
  });

  it("schedules nothing when enabled without a start time", async () => {
    await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "" });
    expect(native.plugin.setEveningSchedule).toHaveBeenCalledWith({ enabled: false, startMinutes: -1, playlist: [] });
  });

  it("changing the time sends the new time (the native alarm is replaced, never added)", async () => {
    await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "22:15" });
    await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    expect(native.plugin.setEveningSchedule).toHaveBeenLastCalledWith(expect.objectContaining({ startMinutes: 22 * 60 + 12 }));
  });

  it("re-syncing (app restart, re-render) sends the identical schedule again — idempotent", async () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    await syncEveningAudioSchedule();
    await syncEveningAudioSchedule();
    const [a, b] = native.plugin.setEveningSchedule.mock.calls;
    expect(a).toEqual(b);
  });

  it("does nothing off Android (no web timers)", async () => {
    native.available = false;
    expect(await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" })).toEqual({ available: false });
    expect(native.plugin.setEveningSchedule).not.toHaveBeenCalled();
  });

  it("only ever schedules Evening — no Morning or Various schedule exists", async () => {
    await syncEveningAudioSchedule({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    const { playlist } = native.plugin.setEveningSchedule.mock.calls[0][0] as unknown as { playlist: { assetPath: string; dhikrId: string }[] };
    const eveningIds = new Set(writtenAdhkarItems.evening.map((i) => i.id));
    for (const p of playlist) {
      expect(eveningIds.has(p.dhikrId)).toBe(true);
      expect(p.assetPath).not.toContain("/morning/");
    }
    expect(Object.keys(native.plugin).filter((k) => /schedule/i.test(k))).toEqual(["setEveningSchedule"]);
  });

  it("startup sync arms the saved schedule and listens for native playback", async () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    const stop = startEveningAudioNativeSync();
    await Promise.resolve();
    expect(native.plugin.setEveningSchedule).toHaveBeenCalledTimes(1);
    expect(native.plugin.addListener).toHaveBeenCalledWith("playbackState", expect.any(Function));
    stop();
  });
});

describe("scheduled (native) playback drives the one playback state", () => {
  const state = (over: Partial<NativeAudioAdhkarState> = {}): NativeAudioAdhkarState => ({
    active: true,
    collection: "evening",
    dhikrId: "morning_003",
    title: "أمسينا وأمسى الملك لله",
    repetition: 1,
    total: 1,
    status: "playing",
    index: 0,
    count: 3,
    ...over,
  });

  it("scheduled playback starts at the first Evening dhikr, repetition 1", () => {
    applyNativePlaybackState(state());
    expect(getNowPlaying()).toEqual({ collection: "evening", itemId: "morning_003", repetition: 1, total: 1, status: "playing" });
  });

  it("follows the native player from dhikr to dhikr", () => {
    applyNativePlaybackState(state());
    applyNativePlaybackState(state({ dhikrId: "morning_005", index: 1 }));
    expect(getNowPlaying()?.itemId).toBe("morning_005");
    applyNativePlaybackState(state({ dhikrId: "morning_016", index: 2 }));
    expect(getNowPlaying()?.itemId).toBe("morning_016");
  });

  it("a repeated identical native state never advances the repetition", () => {
    applyNativePlaybackState(state({ repetition: 2, total: 3 }));
    applyNativePlaybackState(state({ repetition: 2, total: 3 }));
    expect(getNowPlaying()?.repetition).toBe(2);
  });

  it("Pause goes to the native player and keeps the same dhikr and repetition", () => {
    applyNativePlaybackState(state({ dhikrId: "morning_005", repetition: 2, total: 3 }));
    pauseAudioAdhkar();
    expect(native.plugin.pause).toHaveBeenCalledTimes(1);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_005", repetition: 2, status: "paused" });
  });

  it("Resume continues the same repetition — no restart, no increment", () => {
    applyNativePlaybackState(state({ dhikrId: "morning_005", repetition: 2, total: 3 }));
    pauseAudioAdhkar();
    resumeAudioAdhkar();
    expect(native.plugin.resume).toHaveBeenCalledTimes(1);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_005", repetition: 2, status: "playing" });
  });

  it("leaving the Audio screen does not stop a scheduled session", () => {
    applyNativePlaybackState(state());
    stopAudioAdhkar();
    expect(native.plugin.stop).not.toHaveBeenCalled();
    expect(getNowPlaying()?.status).toBe("playing");
  });

  it("starting in-app playback ends the scheduled session — only one session at a time", () => {
    applyNativePlaybackState(state());
    startAudioAdhkar("evening", writtenAdhkarItems.evening.find((i) => i.id === "morning_016")!);
    expect(native.plugin.stop).toHaveBeenCalledTimes(1);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", repetition: 1, status: "playing" });
  });

  it("the session finishing shows ✓ on the last dhikr; a stop clears the state", () => {
    applyNativePlaybackState(state({ dhikrId: "morning_016" }));
    applyNativePlaybackState(state({ active: false, dhikrId: "morning_016", status: "finished" }));
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", status: "finished" });

    applyNativePlaybackState(state());
    applyNativePlaybackState(null);
    expect(getNowPlaying()).toBeNull();
  });
});
