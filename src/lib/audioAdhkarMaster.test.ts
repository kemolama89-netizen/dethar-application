// @vitest-environment jsdom
// The Audio Adhkar master switch (home toggle beside "الصلاة القادمة" and
// Settings): off, every section goes to native disabled — native then
// cancels all its alarms and notices, and re-arms nothing after a reboot —
// and a scheduled session playing now stops; on, every section comes back
// from its own saved settings. Preferences are never changed by it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NativePlaylistItem } from "./audioAdhkarNative";

type Section = { enabled: boolean; startMinutes: number; playlist: NativePlaylistItem[] } & Record<string, unknown>;
type Payload = Record<"morning" | "evening" | "misc", Section> & { adhanWindows: [number, number][] };

const native = vi.hoisted(() => ({
  available: true,
  calls: [] as string[],
  plugin: {
    setSchedules: vi.fn(async (o: Record<"morning" | "evening" | "misc", { enabled: boolean }>) => {
      native.calls.push("setSchedules");
      return {
        morning: { scheduledAt: o.morning.enabled ? 1 : null, warningAt: null },
        evening: { scheduledAt: o.evening.enabled ? 2 : null, warningAt: null },
        misc: { scheduledAt: o.misc.enabled ? 3 : null, warningAt: null },
        exact: true,
      };
    }),
    stopScheduled: vi.fn(async () => {
      native.calls.push("stopScheduled");
    }),
    stopManual: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    playNow: vi.fn(async () => ({ started: true })),
    getPlaybackState: vi.fn(async () => ({ state: null })),
    getCompletions: vi.fn(async () => ({ completions: [] as { id: string; collection: "morning" | "evening" | "misc"; dhikrId: string; at: number; timeZone: string }[] })),
    acknowledgeCompletions: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}));
vi.mock("./audioAdhkarNative", () => ({ AudioAdhkarNative: native.plugin, isAudioAdhkarNativeAvailable: () => native.available }));
const app = vi.hoisted(() => ({ listeners: new Map<string, () => void>() }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (name: string, fn: () => void) => {
      app.listeners.set(name, fn);
      return { remove: async () => {} };
    }),
  },
}));

import { drainNativeCompletions, setAudioAdhkarMasterEnabled, startAudioAdhkarNativeSync, syncAudioAdhkarSchedules } from "./audioAdhkarSchedules";
import {
  loadAudioAdhkarMasterEnabled,
  loadDailySchedule,
  loadExcludedAdhkar,
  loadMiscSchedule,
  loadSectionReciterChoice,
  loadSectionStatus,
  saveAudioAdhkarMasterEnabled,
  saveDailySchedule,
  saveExcludedAdhkar,
  saveMiscSchedule,
  saveSectionReciterChoice,
  subscribeAudioAdhkarMaster,
} from "./audioAdhkarScheduleSettings";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import { saveManualLocation } from "./locationSettings";
import { applyNativePlaybackState, startAudioVarious } from "./audioAdhkarPlayer";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { getAudioAdhkarCount, resetAudioAdhkarCountsMemoryForTesting } from "./audioAdhkarCounts";

const NOW = new Date("2026-10-10T06:00:00Z");
const KUWAIT = { source: "manual" as const, latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" };
const sent = () => native.plugin.setSchedules.mock.calls.at(-1)![0] as unknown as Payload;
const SECTIONS = ["morning", "evening", "misc"] as const;
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** Every section on, with its own choices — the preferences the switch must keep. */
function configureAllSections() {
  saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
  saveDailySchedule("evening", { enabled: true, startTime: "17:15" });
  saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 10 });
  saveSectionReciterChoice("morning", "random");
  saveExcludedAdhkar("misc", [AUDIO_VARIOUS_ITEMS[0].id]);
}
const preferences = () => ({
  morning: loadDailySchedule("morning"),
  evening: loadDailySchedule("evening"),
  misc: loadMiscSchedule(),
  reciter: loadSectionReciterChoice("morning"),
  excluded: loadExcludedAdhkar("misc"),
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  native.available = true;
  native.calls.length = 0;
  app.listeners.clear();
  applyNativePlaybackState(null);
  saveManualLocation(KUWAIT);
});

describe("the Audio Adhkar master switch", () => {
  it("is on by default, so schedules set up before it existed keep running", async () => {
    configureAllSections();
    expect(loadAudioAdhkarMasterEnabled()).toBe(true);
    await syncAudioAdhkarSchedules(NOW);
    for (const s of SECTIONS) expect(sent()[s].enabled, s).toBe(true);
  });

  it("off: every section goes to native disabled with nothing to play, then a scheduled session playing now is stopped", async () => {
    configureAllSections();
    await setAudioAdhkarMasterEnabled(false, NOW);
    for (const s of SECTIONS) {
      expect(sent()[s].enabled, s).toBe(false);
      expect(sent()[s].playlist, s).toEqual([]);
    }
    expect(native.calls).toEqual(["setSchedules", "stopScheduled"]);
  });

  it("off covers every section native is sent — whichever sections exist", async () => {
    configureAllSections();
    await setAudioAdhkarMasterEnabled(false, NOW);
    const { adhanWindows: _, ...sections } = sent();
    expect(Object.keys(sections).length).toBeGreaterThanOrEqual(3);
    for (const [key, section] of Object.entries(sections)) expect((section as Section).enabled, key).toBe(false);
  });

  it("off never erases a preference: times, window, interval, reciter and selection stay", async () => {
    configureAllSections();
    const before = preferences();
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(preferences()).toEqual(before);
  });

  it("on restores exactly what was scheduled before, without stopping anything", async () => {
    configureAllSections();
    await syncAudioAdhkarSchedules(NOW);
    const before = sent();
    await setAudioAdhkarMasterEnabled(false, NOW);
    native.calls.length = 0;
    await setAudioAdhkarMasterEnabled(true, NOW);
    expect(sent()).toEqual(before);
    expect(native.calls).toEqual(["setSchedules"]);
  });

  it("keeps the 30-minute adhan pause: the windows are sent whatever the switch", async () => {
    configureAllSections();
    await setAudioAdhkarMasterEnabled(true, NOW);
    const windows = sent().adhanWindows;
    expect(windows.length).toBeGreaterThan(0);
    for (const [start, end] of windows) expect(end - start).toBeGreaterThanOrEqual(30 * 60_000);
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(sent().adhanWindows).toEqual(windows);
  });

  it("never duplicates: each switch is one full replacement, and repeating it sends the same", async () => {
    configureAllSections();
    await setAudioAdhkarMasterEnabled(true, NOW);
    const first = sent();
    await setAudioAdhkarMasterEnabled(true, NOW);
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(2);
    expect(sent()).toEqual(first);
    await setAudioAdhkarMasterEnabled(false, NOW);
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(4);
    expect(native.plugin.stopScheduled).toHaveBeenCalledTimes(2);
  });

  it("persists: the next launch and every return to the app keep everything off", async () => {
    configureAllSections();
    await setAudioAdhkarMasterEnabled(false, NOW);
    native.plugin.setSchedules.mockClear();
    const stop = startAudioAdhkarNativeSync();
    await settle();
    for (const s of SECTIONS) expect(sent()[s].enabled, s).toBe(false);
    app.listeners.get("resume")!();
    await settle();
    expect(native.plugin.setSchedules).toHaveBeenCalledTimes(2);
    for (const s of SECTIONS) expect(sent()[s].enabled, s).toBe(false);
    stop();
  });

  it("tells every subscriber (the home toggle and Settings follow each other)", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeAudioAdhkarMaster((enabled) => seen.push(enabled));
    saveAudioAdhkarMasterEnabled(false);
    saveAudioAdhkarMasterEnabled(true);
    unsubscribe();
    saveAudioAdhkarMasterEnabled(false);
    expect(seen).toEqual([false, true]);
  });

  it("is independent of prayer notifications: their switch is untouched either way", async () => {
    const prayer = { enabled: true, prayers: { fajr: true, dhuhr: false, asr: true, maghrib: true, isha: true } };
    savePrayerReminderSettings(prayer);
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(loadPrayerReminderSettings()).toEqual(prayer);
    savePrayerReminderSettings({ ...prayer, enabled: false });
    await setAudioAdhkarMasterEnabled(true, NOW);
    expect(loadPrayerReminderSettings().enabled).toBe(false);
  });

  it("leaves a «استماع» dhikr the user starts, and its counter, working", async () => {
    resetAudioAdhkarCountsMemoryForTesting();
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(startAudioVarious(AUDIO_VARIOUS_ITEMS[1])).toBe(true);
    expect(native.plugin.playNow).toHaveBeenCalledTimes(1);
    native.plugin.getCompletions.mockResolvedValueOnce({
      completions: [{ id: "c1", collection: "misc", dhikrId: AUDIO_VARIOUS_ITEMS[1].id, at: NOW.getTime(), timeZone: "Asia/Kuwait" }],
    });
    expect(await drainNativeCompletions()).toBe(1);
    expect(getAudioAdhkarCount("misc", AUDIO_VARIOUS_ITEMS[1].id)).toBe(1);
  });

  it("native gets exactly the status the settings show: a section on without a start time goes disabled", async () => {
    saveDailySchedule("morning", { enabled: true, startTime: "" });
    saveDailySchedule("evening", { enabled: true, startTime: "17:15" });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "09:00", intervalMinutes: 5 });
    await syncAudioAdhkarSchedules(NOW);
    for (const s of SECTIONS) expect(sent()[s].enabled, s).toBe(loadSectionStatus(s).ready);
    expect(sent().morning.enabled).toBe(false);
    expect(sent().evening.enabled).toBe(true);
    expect(sent().misc.enabled).toBe(false);
  });

  it("off Android: saves the switch, sends nothing", async () => {
    native.available = false;
    await setAudioAdhkarMasterEnabled(false, NOW);
    expect(loadAudioAdhkarMasterEnabled()).toBe(false);
    expect(native.plugin.setSchedules).not.toHaveBeenCalled();
    expect(native.plugin.stopScheduled).not.toHaveBeenCalled();
  });
});
