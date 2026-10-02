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
import { saveQuranReciterMode, saveSelectedQuranReciterId } from "./quranAudioPreferences";

const publicFiles = import.meta.glob(["/public/audio/adhkar/**/*.mp3", "/public/audio/quran/**/*.mp3"]);

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

  it("SilenceGap.SILENCE_MILLIS equals REPETITION_PAUSE_MS (1.5 s) — scheduled playback uses the same pause", () => {
    const m = /const val SILENCE_MILLIS = ([\d_]+)L/.exec(kt("AudioAdhkarLogic.kt"));
    expect(Number(m?.[1].replaceAll("_", ""))).toBe(REPETITION_PAUSE_MS);
    expect(REPETITION_PAUSE_MS).toBe(1_500);
  });

  it("the scheduled queue: Dhikr A → 1.5 s → Dhikr B, the same pause as between repetitions, none after the last", () => {
    // The queue native plays: several adhkar, in Evening order.
    expect(buildEveningAudioPlaylist().length).toBeGreaterThan(1);
    const service = kt("AudioAdhkarPlaybackService.kt");
    // Both "next repetition" and "next dhikr" go through the one silence …
    expect(service).toMatch(/PlaybackCursor\.Step\.NEXT_REPETITION, PlaybackCursor\.Step\.NEXT_DHIKR -> startSilence\(\)/);
    // … which is SilenceGap's default length, 1.5 s (= REPETITION_PAUSE_MS) …
    expect(/private val gap = SilenceGap\(\)/.test(service)).toBe(true);
    expect(/handler\.postDelayed\(playNextAfterSilence, gap\.start\(/.test(service)).toBe(true);
    // … and the last playback finishes the session without one.
    expect(service).toMatch(/PlaybackCursor\.Step\.FINISHED -> finishSession\(\)/);
    expect(kt("AudioAdhkarLogic.kt")).toMatch(/index \+ 1 < items\.size -> Step\.NEXT_DHIKR/);
  });

  it("plays a Quranic recitation's ayah files back to back — chained gaplessly, never through the silence", () => {
    const service = kt("AudioAdhkarPlaybackService.kt");
    const onPart = /private fun onPartCompleted[\s\S]*?\n    }\n/.exec(service)?.[0] ?? "";
    expect(onPart).toContain("onPlaybackCompleted(token)"); // only the LAST file completes the playback
    expect(onPart).not.toContain("startSilence");
    expect(service).toContain("current.setNextMediaPlayer(next)");
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
        assetPaths: ["public/audio/adhkar/shared/اللهم صل على محمد.mp3"],
        repetitions: 5,
      });
    } finally {
      setUserRepeatCount("morning_023", null);
    }
  });

  it("is exactly the Evening dhikr with audio, in Evening order, from the existing mapping", () => {
    const playlist = buildEveningAudioPlaylist();
    const quran = (n: string) => `public/audio/quran/abdulbasit-murattal/${n}.mp3`;
    expect(playlist.map((p) => p.dhikrId)).toEqual(["morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "evening_001"]);
    expect(playlist.map((p) => p.assetPaths)).toEqual([
      // Every Quranic recitation starts with Abdul Basit's own basmala — Ayat al-Kursi too.
      ["basmala", "002255"].map(quran),
      ["basmala", "112001", "112002", "112003", "112004"].map(quran),
      ["basmala", "113001", "113002", "113003", "113004", "113005"].map(quran),
      ["basmala", "114001", "114002", "114003", "114004", "114005", "114006"].map(quran),
      "public/audio/adhkar/evening/morning_003.mp3",
      "public/audio/adhkar/evening/morning_004.mp3",
      "public/audio/adhkar/shared/morning_005.mp3",
      "public/audio/adhkar/evening/morning_006.mp3",
      "public/audio/adhkar/evening/morning_007.mp3",
      "public/audio/adhkar/shared/اللهم عافني في بدني.mp3",
      "public/audio/adhkar/shared/حسبي الله.mp3",
      "public/audio/adhkar/shared/اللهم اني اسالك العفو و العافية.mp3",
      "public/audio/adhkar/shared/اللهم عالم الغيب والشهادة.mp3",
      "public/audio/adhkar/shared/بسم الله الذي لا يضر.mp3",
      "public/audio/adhkar/shared/رضيت بالله ربا.mp3",
      "public/audio/adhkar/shared/morning_014.mp3",
      "public/audio/adhkar/evening/morning_015.mp3",
      "public/audio/adhkar/evening/morning_016.mp3",
      "public/audio/adhkar/shared/سبحان الله وبحمده.mp3",
      "public/audio/adhkar/shared/لا اله الا الله وحده لا شريك له.mp3",
      "public/audio/adhkar/evening/اعوذ بكلمات التامات.mp3",
    ].map((p) => (Array.isArray(p) ? p : [p])));
    for (const p of playlist) for (const path of [...p.assetPaths, ...p.repeatAssetPaths]) expect(publicFiles[`/${path}`], path).toBeDefined();
    for (const p of playlist) expect(p.rotation, p.dhikrId).toEqual([]);
    // Every repetition plays the same files — the basmala before each one.
    for (const p of playlist) expect(p.repeatAssetPaths).toEqual(p.assetPaths);
    for (const p of playlist) expect(p.repeatStartMillis).toBe(0);
    expect(playlist[0].title).toBe("آية الكرسي");
    const byId = (id: string) => playlist.find((p) => p.dhikrId === id)!;
    expect(byId("morning_003").title).toBe("أمسينا وأمسى الملك لله");
    expect(byId("morning_016").title).toBe("أمسينا على فطرة الإسلام");
    expect(byId("morning_005").text.replace(/[\u064B-\u065F\u0670]/g, "").startsWith("اللهم أنت ربي")).toBe(true);
  });

  it("uses each dhikr's written repetition count", () => {
    for (const p of buildEveningAudioPlaylist()) {
      const item = writtenAdhkarItems.evening.find((i) => i.id === p.dhikrId)!;
      expect(p.repetitions).toBe(item.repeat ?? 1);
    }
  });

  it("includes every Evening dhikr once — the new Evening recordings join with their written counts, no duplicates", () => {
    const playlist = buildEveningAudioPlaylist();
    const ids = playlist.map((p) => p.dhikrId);
    expect(new Set(ids).size).toBe(ids.length);
    // Only morning_023 waits for the user's chosen count.
    expect(writtenAdhkarItems.evening.map((i) => i.id).filter((id) => !ids.includes(id))).toEqual(["morning_023"]);
    const reps = Object.fromEntries(playlist.map((p) => [p.dhikrId, p.repetitions]));
    expect([reps.morning_003, reps.morning_004, reps.morning_006, reps.morning_007, reps.morning_015, reps.morning_016]).toEqual([1, 1, 4, 1, 1, 1]);
  });

  it("Quranic items use the selected reciter's own basmala and ayah files (Specific Reciter mode)", () => {
    saveSelectedQuranReciterId("husary-murattal");
    const ayahs = [1, 2, 3, 4].map((a) => `public/audio/quran/husary-murattal/11200${a}.mp3`);
    const ikhlas = buildEveningAudioPlaylist().find((p) => p.dhikrId === "morning_002")!;
    expect(ikhlas).toMatchObject({
      assetPaths: ["public/audio/quran/husary-murattal/basmala.mp3", ...ayahs], // his basmala …
      repeatAssetPaths: ["public/audio/quran/husary-murattal/basmala.mp3", ...ayahs], // … before every repetition
      repeatStartMillis: 0,
      rotation: [],
      repetitions: 3,
    });
  });

  it("a reciter whose first ayah already has his basmala: played as is every repetition (no duplicate); his own basmala before Ayat al-Kursi", () => {
    saveSelectedQuranReciterId("banna-murattal");
    const playlist = buildEveningAudioPlaylist();
    const falaq = playlist.find((p) => p.dhikrId === "morning_002b")!;
    const ayahs = [1, 2, 3, 4, 5].map((a) => `public/audio/quran/banna-murattal/11300${a}.mp3`);
    expect(falaq).toMatchObject({ assetPaths: ayahs, repeatAssetPaths: ayahs, repeatStartMillis: 0 });
    expect(playlist.find((p) => p.dhikrId === "morning_001")!.assetPaths).toEqual([
      "public/audio/quran/banna-murattal/basmala.mp3",
      "public/audio/quran/banna-murattal/002255.mp3",
    ]);
  });

  it("a reciter with no verified own-voice basmala gets none — never another reciter's", () => {
    saveSelectedQuranReciterId("sudais-murattal");
    const nas = buildEveningAudioPlaylist().find((p) => p.dhikrId === "morning_002c")!;
    const ayahs = [1, 2, 3, 4, 5, 6].map((a) => `public/audio/quran/sudais-murattal/11400${a}.mp3`);
    expect(nas).toMatchObject({ assetPaths: ayahs, repeatAssetPaths: ayahs, repeatStartMillis: 0 });
    expect(buildEveningAudioPlaylist().find((p) => p.dhikrId === "morning_001")!.assetPaths).toEqual(["public/audio/quran/sudais-murattal/002255.mp3"]);
  });

  it("Automatic Rotation hands native every reciter's files for each Quranic item, in rotation order", () => {
    saveQuranReciterMode("rotation");
    const playlist = buildEveningAudioPlaylist();
    const order = ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "sudais-murattal", "muaiqly-murattal", "dosari-murattal", "qatami-murattal", "banna-murattal", "mustafaismail-mujawwad"];
    const kursi = playlist.find((p) => p.dhikrId === "morning_001")!;
    expect(kursi.rotation.map((r) => r.assetPaths)).toEqual(
      order.map((r) => [...(r === "sudais-murattal" ? [] : [`public/audio/quran/${r}/basmala.mp3`]), `public/audio/quran/${r}/002255.mp3`]),
    );
    const nas = playlist.find((p) => p.dhikrId === "morning_002c")!;
    // 6 ayahs, plus the reciter's own separate basmala on the first repetition where he has one.
    // (Sudais: none verified; Al-Banna, Mustafa Ismail: inside their first ayah.)
    expect(nas.rotation.map((r) => r.assetPaths.length)).toEqual([7, 7, 7, 7, 6, 7, 7, 7, 6, 6]);
    for (const r of nas.rotation) expect(r.repeatAssetPaths).toEqual(r.assetPaths); // basmala before every repetition
    nas.rotation.forEach((r, i) => {
      for (const path of [...r.assetPaths, ...r.repeatAssetPaths]) expect(path, order[i]).toContain(`/quran/${order[i]}/`); // no voice mixing
    });
    const quranic = new Set(writtenAdhkarItems.evening.filter((i) => i.quranRef).map((i) => i.id));
    for (const p of playlist.filter((x) => !quranic.has(x.dhikrId))) {
      expect(p.rotation, p.dhikrId).toEqual([]); // non-Quran items never rotate
    }
    for (const p of playlist) for (const r of p.rotation) for (const path of [...r.assetPaths, ...r.repeatAssetPaths]) expect(publicFiles[`/${path}`], path).toBeDefined();
  });

  it("never depends on the network: every file is a bundled asset under public/", () => {
    for (const mode of ["specific", "rotation"] as const) {
      saveQuranReciterMode(mode);
      const playlist = buildEveningAudioPlaylist();
      const all = playlist.flatMap((p) => [...p.assetPaths, ...p.repeatAssetPaths, ...p.rotation.flatMap((r) => [...r.assetPaths, ...r.repeatAssetPaths])]);
      expect(all.length).toBeGreaterThan(0);
      for (const path of all) {
        expect(path, path).toMatch(/^public\/audio\/(adhkar|quran)\//);
        expect(path).not.toMatch(/^[a-z]+:|\/\/|everyayah/i);
        expect(publicFiles[`/${path}`], path).toBeDefined();
      }
      expect(JSON.stringify(playlist)).not.toMatch(/https?:/);
    }
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
    const { playlist } = native.plugin.setEveningSchedule.mock.calls[0][0] as unknown as { playlist: { assetPaths: string[]; dhikrId: string }[] };
    const eveningIds = new Set(writtenAdhkarItems.evening.map((i) => i.id));
    for (const p of playlist) {
      expect(eveningIds.has(p.dhikrId)).toBe(true);
      for (const path of p.assetPaths) expect(path).not.toContain("/adhkar/morning/");
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
