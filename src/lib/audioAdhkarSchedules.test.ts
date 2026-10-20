// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeAudioAdhkarState, NativePlaylistItem } from "./audioAdhkarNative";

// A fake of the native Android plugin — records every call.
const native = vi.hoisted(() => {
  const listeners: ((e: { state: unknown }) => void)[] = [];
  return {
    available: true,
    listeners,
    plugin: {
      setSchedules: vi.fn(async (o: Record<"morning" | "evening" | "misc", { enabled: boolean }>) => ({
        morning: { scheduledAt: o.morning.enabled ? 1_790_000_000_000 : null, warningAt: null },
        evening: { scheduledAt: o.evening.enabled ? 1_790_000_100_000 : null, warningAt: null },
        misc: { scheduledAt: o.misc.enabled ? 1_790_000_200_000 : null, warningAt: null },
        exact: true,
      })),
      getPlaybackState: vi.fn(async () => ({ state: null })),
      getCompletions: vi.fn(async () => ({ completions: [] as { id: string; collection: "morning" | "evening" | "misc"; dhikrId: string; at: number; timeZone: string }[] })),
      acknowledgeCompletions: vi.fn(async (_: { ids: string[] }) => {}),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      playNow: vi.fn<(options: { collection: string; item: NativePlaylistItem }) => Promise<{ started: boolean }>>(async () => ({ started: true })),
      stopManual: vi.fn(async () => {}),
      log: vi.fn<(options: { message: string }) => Promise<void>>(async () => {}),
      setVolumes: vi.fn<(options: Record<string, number>) => Promise<void>>(async () => {}),
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
const app = vi.hoisted(() => ({ listeners: new Map<string, () => void>() }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (name: string, fn: () => void) => {
      app.listeners.set(name, fn);
      return { remove: async () => {} };
    }),
  },
}));

import { writtenAdhkarItems } from "../data/written-adhkar";
import {
  buildDailyAudioPlaylist,
  buildEveningAudioPlaylist,
  buildMiscAudioPlaylist,
  startAudioAdhkarNativeSync,
  syncAudioAdhkarSchedules,
} from "./audioAdhkarSchedules";
import { saveEveningAudioSettings } from "./eveningAudioSettings";
import { saveDailySchedule, saveExcludedAdhkar, saveMiscSchedule, saveSectionReciterChoice } from "./audioAdhkarScheduleSettings";
import { getAvailableQuranReciters } from "../data/quranReciters";
import { buildAdhanWindows } from "./adhanSuppression";
import { saveManualLocation } from "./locationSettings";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { drainNativeCompletions } from "./audioAdhkarSchedules";
import { getAudioAdhkarCount, resetAudioAdhkarCountsMemoryForTesting } from "./audioAdhkarCounts";
import { clearAllStats, getAudioStats, getDailyActivity, getDailyAudioActivity, todayLocalDate } from "./stats";
import { setUserRepeatCount } from "./audioUserRepeat";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import { applyNativePlaybackState, pauseAudioAdhkar, resumeAudioAdhkar, startAudioAdhkar, startAudioVarious, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { saveQuranReciterMode, saveSelectedQuranReciterId } from "./quranAudioPreferences";
import { sessionDurationMs } from "./dailyAzkarWindows";

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
  it("includes morning_023 (no fixed count) once by default, or the count chosen earlier", () => {
    try {
      expect(buildEveningAudioPlaylist().find((p) => p.dhikrId === "morning_023")?.repetitions).toBe(1);
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
    expect(playlist.map((p) => p.dhikrId)).toEqual(["morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_023", "evening_001"]);
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
      "public/audio/adhkar/shared/اللهم صل على محمد.mp3",
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
    // Every Evening dhikr has audio and joins — morning_023 too, now that no count has to be chosen.
    expect(writtenAdhkarItems.evening.map((i) => i.id).filter((id) => !ids.includes(id))).toEqual([]);
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

  it("names the reciter of every Quranic recitation (each rotation choice its own), and none for generated audio", () => {
    saveQuranReciterMode("rotation");
    const playlist = buildEveningAudioPlaylist();
    const kursi = playlist.find((p) => p.dhikrId === "morning_001")!;
    expect(kursi.rotation.map((r) => r.reciterName)).toEqual(getAvailableQuranReciters().map((r) => r.name.ar));
    saveQuranReciterMode("specific");
    saveSelectedQuranReciterId("husary-murattal");
    expect(buildEveningAudioPlaylist().find((p) => p.dhikrId === "morning_001")!.reciterName).toBe("محمود خليل الحصري");
    const generated = buildEveningAudioPlaylist().find((p) => !p.assetPaths[0].includes("/quran/"))!;
    expect(generated.reciterName).toBeUndefined();
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

describe("schedule sync — Morning, Evening and Misc, each independent", () => {
  const NOW = new Date("2026-10-10T08:00:00Z");
  const sent = () => native.plugin.setSchedules.mock.calls.at(-1)![0] as unknown as {
    morning: { enabled: boolean; startMinutes: number; playlist: { dhikrId: string; assetPaths: string[] }[] };
    evening: { enabled: boolean; startMinutes: number; playlist: { dhikrId: string; assetPaths: string[] }[] };
    misc: { enabled: boolean; startMinutes: number; endMinutes: number; intervalMinutes: number; playlist: { dhikrId: string; assetPaths: string[]; repetitions: number }[] };
    adhanWindows: [number, number][];
  };

  it("creates the Evening schedule when enabled with a start time; the others stay off", async () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    const result = await syncAudioAdhkarSchedules(NOW);
    expect(sent().evening).toEqual({ enabled: true, startMinutes: 22 * 60 + 12, playlist: buildEveningAudioPlaylist(), slots: expect.any(Array), reminderSound: "crickets" });
    expect(sent().morning).toEqual({ enabled: false, startMinutes: -1, playlist: [], slots: [], reminderSound: "birdsong" });
    expect(sent().misc).toMatchObject({ enabled: false, playlist: [] });
    expect(result).toMatchObject({ available: true, exact: true, evening: { scheduledAt: 1_790_000_100_000 }, morning: { scheduledAt: null } });
  });

  it("schedules Morning with its own time and playlist, independently of Evening", async () => {
    saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
    saveDailySchedule("evening", { enabled: false, startTime: "17:00" });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().morning).toEqual({ enabled: true, startMinutes: 5 * 60 + 30, playlist: buildDailyAudioPlaylist("morning"), slots: expect.any(Array), reminderSound: "birdsong" });
    expect(sent().evening).toEqual({ enabled: false, startMinutes: 17 * 60, playlist: [], slots: [], reminderSound: "crickets" });
    const morningIds = new Set(writtenAdhkarItems.morning.map((i) => i.id));
    for (const p of sent().morning.playlist) expect(morningIds.has(p.dhikrId), p.dhikrId).toBe(true);
    // Morning plays its own recordings, in Morning order.
    expect(sent().morning.playlist.map((p) => p.dhikrId)).toEqual(writtenAdhkarItems.morning.filter((i) => sent().morning.playlist.some((p) => p.dhikrId === i.id)).map((i) => i.id));
  });

  it("schedules nothing when enabled without a start time", async () => {
    saveDailySchedule("morning", { enabled: true, startTime: "" });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().morning).toEqual({ enabled: false, startMinutes: -1, playlist: [], slots: [], reminderSound: "birdsong" });
  });

  it("hands native one session per day inside the prayer-time window, planned from the real playlist and its measured length", async () => {
    saveManualLocation({ source: "manual", latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait City" });
    saveDailySchedule("morning", { enabled: true, startTime: "07:00" });
    saveDailySchedule("evening", { enabled: true, startTime: "23:59" });
    await syncAudioAdhkarSchedules(NOW);
    const windows = buildAdhanWindows(NOW);
    for (const section of ["morning", "evening"] as const) {
      const { slots, playlist } = sent()[section] as unknown as { slots: [number, number, number][]; playlist: NativePlaylistItem[] };
      const length = sessionDurationMs(playlist)!;
      expect(length).toBeGreaterThan(0);
      expect(slots.length).toBeGreaterThan(25); // ~30 days ahead, one per day
      for (const [start, at, end] of slots) {
        expect(at).toBeGreaterThanOrEqual(start);
        // Never starts inside an adhan pause, and finishes before the window ends.
        expect(windows.some(([s, e]) => at >= s && at < e)).toBe(false);
        expect(at + length).toBeLessThanOrEqual(end);
      }
      // One per day: strictly increasing, about a day apart.
      for (let i = 1; i < slots.length; i++) expect(slots[i][1] - slots[i - 1][1]).toBeGreaterThan(20 * 3_600_000);
    }
    // Evening's 23:59 can't fit before midnight: it moved earlier, inside the same day.
    const [, eveningAt, eveningEnd] = (sent().evening as unknown as { slots: [number, number, number][] }).slots[0];
    expect(eveningAt).toBeLessThan(eveningEnd);
  });

  it("schedules Misc with its window, interval and the Various recordings, each played once", async () => {
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().misc).toEqual({
      enabled: true,
      startMinutes: 9 * 60,
      endMinutes: 21 * 60,
      intervalMinutes: 5,
      playlist: buildMiscAudioPlaylist(),
      language: "ar",
      // No weekly schedule set: no day is restricted.
      dayStartMinutes: [-1, -1, -1, -1, -1, -1, -1],
      // Fridays and Islamic occasions (lib/islamicOccasions.ts), on by default.
      occasionsEnabled: true,
      occasions: expect.any(Array),
      occasionPlaylists: expect.any(Object),
    });
    expect(sent().misc.playlist.map((p) => p.dhikrId)).toEqual(AUDIO_VARIOUS_ITEMS.filter((i) => i.audio).map((i) => i.id));
    for (const p of sent().misc.playlist) {
      expect(p.repetitions).toBe(1);
      expect(p.assetPaths).toEqual([`public/${AUDIO_VARIOUS_ITEMS.find((i) => i.id === p.dhikrId)!.audio}`]);
    }
  });

  it("sends a window that crosses midnight as is; an empty window (equal times) is off", async () => {
    saveMiscSchedule({ enabled: true, startTime: "22:00", endTime: "02:00", intervalMinutes: 10 });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().misc).toMatchObject({ enabled: true, startMinutes: 22 * 60, endMinutes: 2 * 60, intervalMinutes: 10 });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "09:00", intervalMinutes: 10 });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().misc).toMatchObject({ enabled: false, playlist: [] });
  });

  it("hands native the adhan windows from the app's prayer times — each adhan + 30 minutes", async () => {
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().adhanWindows).toEqual(buildAdhanWindows(NOW));
    expect(sent().adhanWindows.length).toBeGreaterThan(100); // ~30 days × 5 prayers
    for (const [start, end] of sent().adhanWindows.slice(0, 5)) expect(end - start).toBeGreaterThanOrEqual(30 * 60_000);
  });

  it("each section uses its own reciter: a specific one for every Quranic dhikr, or all of them for random rotation", () => {
    saveSectionReciterChoice("morning", "husary-murattal");
    saveSectionReciterChoice("evening", "random");
    const kursi = (section: "morning" | "evening") => buildDailyAudioPlaylist(section).find((p) => p.dhikrId === "morning_001")!;
    expect(kursi("morning").assetPaths.every((p) => p.includes("/quran/husary-murattal/"))).toBe(true);
    expect(kursi("morning").rotation).toEqual([]);
    // Random: every available reciter's recitation, in one fixed order, for native to pick one per dhikr.
    const order = getAvailableQuranReciters().map((r) => r.id);
    expect(kursi("evening").rotation.map((r) => r.assetPaths.at(-1)!.split("/")[3])).toEqual(order);
    for (const id of ["morning_002", "morning_002b", "morning_002c"]) {
      expect(buildDailyAudioPlaylist("evening").find((p) => p.dhikrId === id)!.rotation, id).toHaveLength(order.length);
    }
    // Non-Quranic adhkar never rotate.
    expect(buildDailyAudioPlaylist("evening").find((p) => p.dhikrId === "morning_003")!.rotation).toEqual([]);
  });

  it("plays only the selected adhkar, in their existing order", async () => {
    saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
    const all = buildDailyAudioPlaylist("morning").map((p) => p.dhikrId);
    saveExcludedAdhkar("morning", [all[1], all[4], all[5]]);
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().morning.playlist.map((p) => p.dhikrId)).toEqual(all.filter((id) => ![all[1], all[4], all[5]].includes(id)));
    // Evening is unaffected by Morning's selection.
    expect(buildDailyAudioPlaylist("evening").map((p) => p.dhikrId)).toContain(all[1]);
  });

  it("a section with no adhkar selected schedules nothing (native cancels it)", async () => {
    saveDailySchedule("evening", { enabled: true, startTime: "18:00" });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 });
    saveExcludedAdhkar("evening", buildDailyAudioPlaylist("evening", { all: true }).map((p) => p.dhikrId));
    saveExcludedAdhkar("misc", AUDIO_VARIOUS_ITEMS.map((i) => i.id));
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().evening.playlist).toEqual([]);
    expect(sent().misc.playlist).toEqual([]);
  });

  it("Misc plays only its selected adhkar", async () => {
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 });
    saveExcludedAdhkar("misc", ["tasbeeh-1", "tasbeeh-16"]);
    await syncAudioAdhkarSchedules(NOW);
    const ids = sent().misc.playlist.map((p) => p.dhikrId);
    expect(ids).not.toContain("tasbeeh-1");
    expect(ids).not.toContain("tasbeeh-16");
    expect(ids).toEqual(AUDIO_VARIOUS_ITEMS.filter((i) => i.audio && !["tasbeeh-1", "tasbeeh-16"].includes(i.id)).map((i) => i.id));
  });

  it("hands native a custom interval exactly as entered", async () => {
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 17 });
    await syncAudioAdhkarSchedules(NOW);
    expect(sent().misc.intervalMinutes).toBe(17);
  });

  it("re-syncing (app restart, re-render) sends the identical schedules again — idempotent", async () => {
    saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 3 });
    await syncAudioAdhkarSchedules(NOW);
    await syncAudioAdhkarSchedules(NOW);
    const [a, b] = native.plugin.setSchedules.mock.calls;
    expect(a).toEqual(b);
  });

  it("does nothing off Android (no web timers)", async () => {
    native.available = false;
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    expect(await syncAudioAdhkarSchedules(NOW)).toEqual({ available: false });
    expect(native.plugin.setSchedules).not.toHaveBeenCalled();
  });

  it("startup sync arms the saved schedules, then re-syncs on every return to the app and on a location change", async () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    const stop = startAudioAdhkarNativeSync();
    await Promise.resolve();
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(1);
    expect(native.plugin.addListener).toHaveBeenCalledWith("playbackState", expect.any(Function));
    await Promise.resolve();
    app.listeners.get("resume")!();
    await Promise.resolve();
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(2);
    // A new city → new prayer times → new adhan windows.
    const before = sent().adhanWindows;
    saveManualLocation({ source: "manual", latitude: 21.4225, longitude: 39.8262, timezone: "Asia/Riyadh", countryCode: "SA", cityNameAr: "مكة", cityNameEn: "Makkah" });
    await Promise.resolve();
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(3);
    expect(sent().adhanWindows).not.toEqual(before);
    // The volume levels go to native once per launch (each change is pushed as it is made) — not on every resume.
    expect(native.plugin.setVolumes).toHaveBeenCalledTimes(1);
    expect(native.plugin.setVolumes).toHaveBeenCalledWith({ adhan: 1, morning: 1, evening: 1, misc: 1 });
    stop();
    saveManualLocation(null);
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(3);
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

  it("starting «استماع» replaces the scheduled session in the native player — only one session at a time", () => {
    applyNativePlaybackState(state());
    startAudioAdhkar("evening", writtenAdhkarItems.evening.find((i) => i.id === "morning_016")!);
    expect(native.plugin.playNow).toHaveBeenCalledTimes(1); // native ends the scheduled one as it starts this
    expect(native.plugin.stop).not.toHaveBeenCalled();
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

describe("repetitions the background player completed", () => {
  // Stamped with the device's own time zone, as the phone's player stamps them — the same zone the
  // day's totals are read in (a fixed "Asia/Kuwait" made the day-total check fail every evening
  // between 21:00 and 24:00 UTC, when Kuwait is already on the next day).
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const completion = (id: string, dhikrId = "morning_005", collection: "morning" | "evening" | "misc" = "evening") => ({ id, collection, dhikrId, at: Date.now() - 5_000, timeZone: deviceTimeZone });
  beforeEach(() => {
    clearAllStats();
    resetAudioAdhkarCountsMemoryForTesting();
  });

  it("are taken into the counters and Statistics, then acknowledged so native forgets them", async () => {
    native.plugin.getCompletions.mockResolvedValueOnce({ completions: [completion("n1"), completion("n2"), completion("n3", "tasbeeh-4", "misc")] });
    expect(await drainNativeCompletions()).toBe(3);
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(2);
    expect(getAudioAdhkarCount("misc", "tasbeeh-4")).toBe(1);
    expect(getAudioStats({ kind: "all" }).total).toBe(3);
    expect(native.plugin.acknowledgeCompletions).toHaveBeenCalledWith({ ids: ["n1", "n2", "n3"] });
  });

  it("listening that stopped part-way adds its time only — never a repetition — and is acknowledged too", async () => {
    const at = Date.now();
    const listening = { id: "l1", kind: "listening" as const, collection: "evening" as const, dhikrId: "morning_005", at, timeZone: "", listenedMs: 25_000, sessionId: "native-session:x" };
    native.plugin.getCompletions.mockResolvedValue({ completions: [completion("n1"), listening] as never });
    expect(await drainNativeCompletions()).toBe(1); // one repetition heard to the end
    await drainNativeCompletions(); // delivered again before it was acknowledged
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(1);
    expect(getAudioStats({ kind: "all" }).total).toBe(1);
    const day = getDailyAudioActivity(todayLocalDate());
    expect(day.stoppedEarlyPlays).toBe(1);
    expect(day.listenedMs).toBe(25_000); // the completion carries no length here: counted, never estimated
    expect(day.playsWithoutDuration).toBe(1);
    expect(native.plugin.acknowledgeCompletions).toHaveBeenCalledWith({ ids: ["n1", "l1"] });
    native.plugin.getCompletions.mockReset();
  });

  it("a whole Morning/Evening session heard to its end completes that session once — never a repetition", async () => {
    const at = Date.UTC(2026, 9, 16, 4, 30); // 07:30 in Kuwait
    const session = { id: "native-session-complete:morning:1760580000000", kind: "session" as const, collection: "morning" as const, dhikrId: "", at, timeZone: "Asia/Kuwait", occurrence: 1760580000000 };
    native.plugin.getCompletions.mockResolvedValue({ completions: [session, session] as never });
    expect(await drainNativeCompletions()).toBe(0); // no repetition
    await drainNativeCompletions(); // delivered again before it was acknowledged
    resetAudioAdhkarCountsMemoryForTesting(); // and after a restart
    await drainNativeCompletions();
    const day = getDailyActivity("2026-10-16");
    expect(day.wirds).toEqual(["morning"]);
    expect(day.wirdsHow.morning).toEqual(["listened"]);
    expect(getAudioStats({ kind: "all" }).total).toBe(0);
    expect(getDailyAudioActivity("2026-10-16").completedPlays).toBe(0);
    expect(native.plugin.acknowledgeCompletions).toHaveBeenCalledWith({ ids: [session.id, session.id] });
    native.plugin.getCompletions.mockReset();
  });

  it("a Misc entry or an unknown section is never a completed session", async () => {
    const misc = { id: "native-session-complete:misc:1", kind: "session" as const, collection: "misc" as const, dhikrId: "", at: Date.now(), timeZone: "" };
    native.plugin.getCompletions.mockResolvedValue({ completions: [misc] as never });
    await drainNativeCompletions();
    expect(getDailyActivity(todayLocalDate()).wirds).toEqual([]);
    native.plugin.getCompletions.mockReset();
  });

  it("re-delivered before they were acknowledged (the app died in between) — even after a restart — count once", async () => {
    native.plugin.getCompletions.mockResolvedValue({ completions: [completion("n1")] });
    await drainNativeCompletions();
    await drainNativeCompletions();
    resetAudioAdhkarCountsMemoryForTesting(); // a restart: only storage survives
    await drainNativeCompletions();
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(1);
    expect(getAudioStats({ kind: "all" }).total).toBe(1);
    native.plugin.getCompletions.mockReset();
  });

  it("are taken in at launch, on every return to the app, and live as the native player reports them", async () => {
    const stop = startAudioAdhkarNativeSync();
    await Promise.resolve();
    expect(native.plugin.getCompletions).toHaveBeenCalledTimes(1);
    const live = native.plugin.addListener.mock.calls.find(([name]) => name === "completions")![1] as () => void;
    live();
    expect(native.plugin.getCompletions).toHaveBeenCalledTimes(2);
    app.listeners.get("resume")!();
    expect(native.plugin.getCompletions).toHaveBeenCalledTimes(3);
    stop();
  });
});


describe("the reciter heard is shown while native plays", () => {
  it("mirrors the reciter native reports, updating as the recording changes (random rotation); none when unknown", () => {
    const state = { active: true, collection: "evening", dhikrId: "morning_001", title: "", repetition: 1, total: 1, status: "playing", index: 0, count: 3 } as NativeAudioAdhkarState;
    applyNativePlaybackState({ ...state, reciter: "ماهر المعيقلي" });
    expect(getNowPlaying()?.reciter).toBe("ماهر المعيقلي");
    applyNativePlaybackState({ ...state, dhikrId: "morning_002a", reciter: "ياسر الدوسري" });
    expect(getNowPlaying()?.reciter).toBe("ياسر الدوسري");
    applyNativePlaybackState({ ...state, dhikrId: "morning_003", reciter: "" });
    expect(getNowPlaying()?.reciter).toBeUndefined();
    applyNativePlaybackState(null);
  });
});

describe("«استماع» on Android plays in the native foreground service (keeps playing with the screen off)", () => {
  const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
  const lastPlayNow = () => native.plugin.playNow.mock.calls.at(-1)![0];
  const state = (over: Partial<NativeAudioAdhkarState> = {}): NativeAudioAdhkarState => ({
    active: true,
    collection: "evening",
    dhikrId: "morning_003",
    title: "",
    repetition: 1,
    total: 1,
    status: "playing",
    index: 0,
    count: 1,
    ...over,
  });
  let audioElements = 0;
  beforeEach(() => {
    clearAllStats();
    resetAudioAdhkarCountsMemoryForTesting();
    audioElements = 0;
    setAudioElementFactory(() => {
      audioElements += 1;
      return { src: "", play() {}, pause() {}, removeAttribute() {}, load() {}, onended: null, onerror: null };
    });
  });

  it("hands the dhikr — its bundled files and written repetition count — to native; nothing plays in the WebView", () => {
    expect(startAudioAdhkar("evening", evening("morning_008"))).toBe(true);
    expect(native.plugin.playNow).toHaveBeenCalledTimes(1);
    const { collection, item } = lastPlayNow();
    expect(collection).toBe("evening");
    expect(item).toMatchObject({ dhikrId: "morning_008", repetitions: 3, rotation: [] });
    expect(item.assetPaths.length).toBeGreaterThan(0);
    for (const path of item.assetPaths) expect(path).toMatch(/^public\/audio\//); // APK assets, never a URL
    expect(audioElements).toBe(0);
    expect(getNowPlaying()).toMatchObject({ collection: "evening", itemId: "morning_008", repetition: 1, total: 3, status: "playing" });
  });

  it("a Quranic dhikr plays the section's reciter, as the in-app player did (one fixed reciter, no rotation)", () => {
    const quranic = writtenAdhkarItems.evening.find((i) => i.quranRef && buildDailyAudioPlaylist("evening", { all: true }).some((p) => p.dhikrId === i.id))!;
    const reciter = getAvailableQuranReciters()[0];
    saveSectionReciterChoice("evening", reciter.id);
    startAudioAdhkar("evening", quranic);
    const { item } = lastPlayNow();
    expect(item.rotation).toEqual([]);
    expect(item.assetPaths.some((p) => p.includes(`/quran/${reciter.id}/`))).toBe(true);
  });

  it("a Various dhikr plays its own recording once", () => {
    const tasbeeh = AUDIO_VARIOUS_ITEMS.find((i) => i.id === "tasbeeh-3")!;
    expect(startAudioVarious(tasbeeh)).toBe(true);
    const { collection, item } = lastPlayNow();
    expect(collection).toBe("misc");
    expect(item).toMatchObject({ dhikrId: "tasbeeh-3", repetitions: 1, assetPaths: [`public/${tasbeeh.audio}`] });
    expect(audioElements).toBe(0);
  });

  it("counts only what native reports as heard — each repetition once, never also in JS", async () => {
    startAudioAdhkar("evening", evening("morning_005"));
    applyNativePlaybackState(state({ dhikrId: "morning_005", manual: true }));
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(0); // starting/playing counts nothing
    const done = { id: "native:1", collection: "evening" as const, dhikrId: "morning_005", at: Date.now(), timeZone: "Asia/Kuwait" };
    native.plugin.getCompletions.mockResolvedValue({ completions: [done] });
    await drainNativeCompletions();
    await drainNativeCompletions(); // delivered again
    applyNativePlaybackState(state({ active: false, dhikrId: "morning_005", status: "finished", manual: true }));
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(1);
    expect(getAudioStats({ kind: "all" }).total).toBe(1);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_005", status: "finished" });
  });

  it("Pause/Resume go to the native player", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    applyNativePlaybackState(state({ dhikrId: "morning_005", manual: true }));
    pauseAudioAdhkar();
    resumeAudioAdhkar();
    expect(native.plugin.pause).toHaveBeenCalledTimes(1);
    expect(native.plugin.resume).toHaveBeenCalledTimes(1);
  });

  it("leaving the list leaves a native «استماع» dhikr playing — and a scheduled session", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    applyNativePlaybackState(state({ dhikrId: "morning_005", manual: true }));
    stopAudioAdhkar();
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
    expect(native.plugin.stop).not.toHaveBeenCalled();
    expect(getNowPlaying()?.status).toBe("playing");

    applyNativePlaybackState(state({ manual: false })); // a scheduled session
    stopAudioAdhkar();
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
    expect(native.plugin.stop).not.toHaveBeenCalled();
    expect(getNowPlaying()?.status).toBe("playing");
  });

  it("after leaving the list, Pause and the service's own end still reach the card", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    applyNativePlaybackState(state({ dhikrId: "morning_005", manual: true }));
    stopAudioAdhkar();
    pauseAudioAdhkar();
    expect(native.plugin.pause).toHaveBeenCalledTimes(1);
    applyNativePlaybackState(null); // stopped from the notification
    expect(getNowPlaying()).toBeNull();
  });

  it("when a scheduled session replaces the «استماع» dhikr, leaving the list no longer stops anything", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    applyNativePlaybackState(state({ dhikrId: "morning_003", manual: false }));
    stopAudioAdhkar();
    expect(native.plugin.stopManual).not.toHaveBeenCalled();
  });

  it("if Android refuses (the adhan is playing), the card goes back to idle", async () => {
    native.plugin.playNow.mockResolvedValueOnce({ started: false });
    startAudioAdhkar("evening", evening("morning_005"));
    await Promise.resolve();
    await Promise.resolve();
    expect(getNowPlaying()).toBeNull();
  });

  it("a late refusal of an earlier start doesn't stop the dhikr started after it", async () => {
    let refuseFirst!: (v: { started: boolean }) => void;
    native.plugin.playNow.mockImplementationOnce(() => new Promise((r) => (refuseFirst = r)));
    startAudioAdhkar("evening", evening("morning_005"));
    startAudioAdhkar("evening", evening("morning_008"));
    refuseFirst({ started: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_008", status: "playing" });
  });

  it("the web build keeps the in-app player", () => {
    native.available = false;
    startAudioAdhkar("evening", evening("morning_005"));
    expect(native.plugin.playNow).not.toHaveBeenCalled();
    expect(audioElements).toBeGreaterThan(0);
  });
});

describe("the native service keeps playing with the screen off (source guards — behaviour needs a device test)", () => {
  const sources = import.meta.glob<string>(["/android/app/src/main/java/com/dithar/app/audioadhkar/*.kt", "/android/app/src/main/AndroidManifest.xml"], {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const service = sources["/android/app/src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlaybackService.kt"];
  const body = (name: string) => new RegExp(`private fun ${name}\\([\\s\\S]*?\\n    }\\n`).exec(service)?.[0] ?? "";

  it("runs as a mediaPlayback foreground service with the permissions it needs", () => {
    const manifest = sources["/android/app/src/main/AndroidManifest.xml"];
    expect(manifest).toMatch(/AudioAdhkarPlaybackService"[\s\S]*?foregroundServiceType="mediaPlayback"/);
    for (const permission of ["FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK", "WAKE_LOCK", "POST_NOTIFICATIONS"]) {
      expect(manifest).toContain(`android.permission.${permission}"`);
    }
    expect(service).toContain("ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK");
  });

  it("holds one wake lock for the whole session — through preparation and silences — released while paused and at the end", () => {
    expect(body("beginPlayback")).toContain("acquireSessionWakeLock()");
    expect(body("playCurrent")).toContain("acquireSessionWakeLock()");
    expect(body("pausePlayback")).toContain("releaseSessionWakeLock()");
    expect(body("resumePlayback")).toContain("acquireSessionWakeLock()");
    expect(body("endSession")).toContain("releaseSessionWakeLock()");
    expect(body("cancelSilence")).not.toContain("release"); // the old gap lock dropped it before the next file was ready
  });

  it("«استماع» is a native session: allowed in an adhan pause, stopped at the adhan, never resumed after it", () => {
    expect(service).toContain("ACTION_PLAY_NOW ->");
    // A session the user resumed ("Resume Adhkar") is user-started too, like «استماع».
    expect(body("playCurrent")).toContain("!manualSession && !userResumed && AdhanSuppression.isSuppressed");
    expect(body("startManualSession")).toContain("handler.postDelayed(stopForAdhan");
    expect(body("interruptForAdhan")).toContain("sessionSection.isDaily && !manualSession");
  });

  it("resumes after a short audio-focus loss, stays paused after the user's pause or a permanent loss, pauses on unplug", () => {
    expect(service).toContain("FocusPolicy.onChange(change, pausedForFocus)");
    expect(service).toContain("FocusPolicy.Action.RESUME_AND_RESTORE ->");
    expect(service).toMatch(/AudioManager\.ACTION_AUDIO_BECOMING_NOISY\) \{[\s\S]{0,120}?userPause\(\)/);
    expect(body("beginPlayback")).toContain("registerNoisy()");
    expect(body("endSession")).toContain("unregisterNoisy()");
  });

  it("is sticky only during a daily session, and a restart continues it through the resume alarm — never a burst", () => {
    expect(service).toMatch(/cursor != null && sessionSection\.isDaily && !manualSession && !adhanSession\) START_STICKY else START_NOT_STICKY/);
    expect(service).toMatch(/null -> if \(cursor == null\) \{[\s\S]*?recoverInterruptedSession\(this\)[\s\S]*?stopSelf\(\)/);
    expect(body("endSession")).toContain("activeSession = null");
    expect(sources["/android/app/src/main/java/com/dithar/app/audioadhkar/AudioAdhkarAlarmReceiver.kt"]).toMatch(/ACTION_BOOT_COMPLETED\) AudioAdhkarScheduler\.recoverInterruptedSession/);
  });
});

describe("background-playback diagnostics trace every stage (source guards)", () => {
  const sources = import.meta.glob<string>(["/android/app/src/main/java/com/dithar/app/**/*.kt", "/android/app/src/main/java/com/dithar/app/MainActivity.java"], {
    query: "?raw",
    import: "default",
    eager: true,
  });
  const src = (path: string) => sources[`/android/app/src/main/java/com/dithar/app/${path}`];

  it("the service traces its lifecycle, each audio stage, the wake lock, focus, the screen and a heartbeat", () => {
    const service = src("audioadhkar/AudioAdhkarPlaybackService.kt");
    for (const needle of [
      'trace("created',
      'trace("onStartCommand',
      'trace("destroyed',
      'trace("task removed',
      'trace("onTrimMemory',
      'trace("session begins',
      'trace("dhikr #',
      'trace("file ${part + 1}/${files.size} prepared',
      'trace("playback completed',
      'trace("silence ',
      'trace("silence ended',
      'trace("AUDIO ERROR',
      'trace("CANNOT OPEN',
      'trace("wake lock acquired")',
      'trace("wake lock released")',
      'trace("audio focus change=',
      'trace("audio focus requested',
      'trace("headphones unplugged',
      'trace("FOREGROUND START FAILED',
      'trace("session ends',
      "trace(\n                \"heartbeat ",
    ]) {
      expect(service, needle).toContain(needle);
    }
  });

  it("alarms, boot, the Activity's lifecycle, crashes and Android's exit reasons are recorded too", () => {
    expect(src("audioadhkar/AudioAdhkarAlarmReceiver.kt")).toContain('AudioAdhkarTrace.log(context, "alarm", "${section.key} playback alarm');
    expect(src("audioadhkar/AudioAdhkarAlarmReceiver.kt")).toContain('AudioAdhkarTrace.log(context, "alarm", "re-arm after');
    expect(src("audioadhkar/AudioAdhkarStore.kt")).toContain('AudioAdhkarTrace.log(appContext, "event", message)');
    const activity = src("MainActivity.java");
    for (const event of ["onPause", "onStop", "onDestroy finishing="]) expect(activity).toContain(`trace("${event}`);
    const trace = src("audioadhkar/AudioAdhkarTrace.kt");
    expect(trace).toContain("Thread.setDefaultUncaughtExceptionHandler");
    expect(trace).toContain("getHistoricalProcessExitReasons");
    expect(src("audioadhkar/AudioAdhkarPlugin.kt")).toContain("fun shareDiagnostics(call: PluginCall)");
  });
});
