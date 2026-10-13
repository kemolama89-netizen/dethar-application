// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MISC_SCHEDULE,
  MISC_INTERVAL_PRESETS,
  isMiscInterval,
  isValidMiscWindow,
  loadDailySchedule,
  loadExcludedAdhkar,
  loadMiscSchedule,
  loadSectionReciterChoice,
  miscWindowCrossesMidnight,
  parseMiscInterval,
  peekSectionReciter,
  saveDailySchedule,
  saveExcludedAdhkar,
  saveMiscSchedule,
  resetAudioAdhkarScheduleSettingsMemoryForTesting,
  saveSectionReciterChoice,
  setSectionReciterRandomForTesting,
  takeSectionReciter,
} from "./audioAdhkarScheduleSettings";
import { loadEveningAudioSettings, saveEveningAudioSettings } from "./eveningAudioSettings";
import { saveQuranReciterMode, saveSelectedQuranReciterId } from "./quranAudioPreferences";
import { getAvailableQuranReciters } from "../data/quranReciters";

beforeEach(() => {
  localStorage.clear();
  setSectionReciterRandomForTesting(null);
});

describe("Audio Adhkar schedule settings", () => {
  it("defaults: everything off; Misc offers 9:00 – 21:00 every 5 minutes", () => {
    expect(loadDailySchedule("morning")).toEqual({ enabled: false, startTime: "" });
    expect(loadDailySchedule("evening")).toEqual({ enabled: false, startTime: "" });
    expect(loadMiscSchedule()).toEqual(DEFAULT_MISC_SCHEDULE);
    expect(DEFAULT_MISC_SCHEDULE).toEqual({ enabled: false, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 });
    expect(MISC_INTERVAL_PRESETS).toEqual([2, 3, 5, 10, 60]);
  });

  it("an existing Evening schedule carries over unchanged (same storage as before)", () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "19:45" });
    expect(loadDailySchedule("evening")).toEqual({ enabled: true, startTime: "19:45" });
    saveDailySchedule("evening", { enabled: false, startTime: "20:00" });
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: false, eveningAudioStartTime: "20:00" });
  });

  it("keeps Morning, Evening and Misc independent", () => {
    saveDailySchedule("morning", { enabled: true, startTime: "05:00" });
    saveMiscSchedule({ enabled: true, startTime: "10:00", endTime: "12:00", intervalMinutes: 2 });
    expect(loadDailySchedule("evening")).toEqual({ enabled: false, startTime: "" });
    saveDailySchedule("evening", { enabled: true, startTime: "18:00" });
    expect(loadDailySchedule("morning")).toEqual({ enabled: true, startTime: "05:00" });
    expect(loadMiscSchedule()).toEqual({ enabled: true, startTime: "10:00", endTime: "12:00", intervalMinutes: 2 });
  });

  it("everything survives a restart (read back from storage) and corrupt values fall back safely", () => {
    saveMiscSchedule({ enabled: true, startTime: "22:00", endTime: "02:00", intervalMinutes: 60 });
    expect(JSON.parse(localStorage.getItem("dithar:audio-adhkar:misc:v1")!)).toEqual({ enabled: true, startTime: "22:00", endTime: "02:00", intervalMinutes: 60 });
    expect(loadMiscSchedule().intervalMinutes).toBe(60);
    localStorage.setItem("dithar:audio-adhkar:misc:v1", JSON.stringify({ enabled: "yes", startTime: "25:00", endTime: 3, intervalMinutes: 0 }));
    expect(loadMiscSchedule()).toEqual(DEFAULT_MISC_SCHEDULE);
    localStorage.setItem("dithar:audio-adhkar:morning:v1", "{oops");
    expect(loadDailySchedule("morning")).toEqual({ enabled: false, startTime: "" });
  });

  it("defaults each section's reciter from the old app-wide setting: its reciter, or random for its rotation", () => {
    saveSelectedQuranReciterId("husary-murattal");
    expect(loadSectionReciterChoice("morning")).toBe("husary-murattal");
    saveQuranReciterMode("rotation");
    expect(loadSectionReciterChoice("evening")).toBe("random");
  });

  it("keeps Morning's and Evening's reciter choices independent and persisted; unknown ids fall back", () => {
    saveSectionReciterChoice("morning", "random");
    saveSectionReciterChoice("evening", "minshawi-murattal");
    expect(loadSectionReciterChoice("morning")).toBe("random");
    expect(loadSectionReciterChoice("evening")).toBe("minshawi-murattal");
    saveSectionReciterChoice("evening", "no-such-reciter");
    expect(loadSectionReciterChoice("evening")).toBe(getAvailableQuranReciters()[0].id);
  });

  it("a specific reciter is used for every Quranic dhikr", () => {
    saveSectionReciterChoice("morning", "husary-murattal");
    for (let i = 0; i < 5; i++) expect(takeSectionReciter("morning").id).toBe("husary-murattal");
  });

  it("random: a random reciter per dhikr, never the same twice in a row, every reciter reachable", () => {
    saveSectionReciterChoice("evening", "random");
    const used = Array.from({ length: 200 }, () => takeSectionReciter("evening").id);
    for (let i = 1; i < used.length; i++) expect(used[i]).not.toBe(used[i - 1]);
    expect(new Set(used).size).toBe(getAvailableQuranReciters().length);
  });

  it("random: peeking shows the next reciter without drawing again; taking uses exactly it", () => {
    saveSectionReciterChoice("morning", "random");
    const shown = peekSectionReciter("morning").id;
    expect(peekSectionReciter("morning").id).toBe(shown);
    expect(takeSectionReciter("morning").id).toBe(shown);
    expect(peekSectionReciter("morning").id).not.toBe(shown);
  });

  it("random: the draw survives an app restart (it's saved), so what was shown still plays", () => {
    saveSectionReciterChoice("morning", "random");
    setSectionReciterRandomForTesting(() => 0.55);
    const shown = peekSectionReciter("morning").id;
    setSectionReciterRandomForTesting(() => 0.05); // a "restart" with different randomness
    expect(takeSectionReciter("morning").id).toBe(shown);
  });

  it("random in one section never moves the other", () => {
    saveSectionReciterChoice("morning", "random");
    saveSectionReciterChoice("evening", "random");
    const evening = peekSectionReciter("evening").id;
    for (let i = 0; i < 10; i++) takeSectionReciter("morning");
    expect(peekSectionReciter("evening").id).toBe(evening);
  });

  it("custom interval: whole minutes from 1 to 720; zero, negative, decimals, text and huge values are refused", () => {
    expect(parseMiscInterval("7")).toBe(7);
    expect(parseMiscInterval(" 45 ")).toBe(45);
    expect(parseMiscInterval("720")).toBe(720);
    for (const bad of ["0", "-5", "2.5", "abc", "", "721", "99999", "1e3"]) expect(parseMiscInterval(bad), bad).toBeNull();
    expect(isMiscInterval(15)).toBe(true);
    expect(isMiscInterval(0)).toBe(false);
    saveMiscSchedule({ ...DEFAULT_MISC_SCHEDULE, intervalMinutes: 17 });
    expect(loadMiscSchedule().intervalMinutes).toBe(17);
  });

  it("each section remembers which adhkar were left out; none by default", () => {
    expect(loadExcludedAdhkar("morning")).toEqual([]);
    saveExcludedAdhkar("morning", ["morning_003", "morning_005", "morning_003"]);
    saveExcludedAdhkar("misc", ["tasbeeh-2"]);
    expect(loadExcludedAdhkar("morning")).toEqual(["morning_003", "morning_005"]);
    expect(loadExcludedAdhkar("evening")).toEqual([]);
    expect(loadExcludedAdhkar("misc")).toEqual(["tasbeeh-2"]);
  });

  it("validates the Misc window: two different times; past midnight when the end is earlier", () => {
    expect(isValidMiscWindow({ startTime: "09:00", endTime: "21:00" })).toBe(true);
    expect(isValidMiscWindow({ startTime: "09:00", endTime: "09:00" })).toBe(false);
    expect(miscWindowCrossesMidnight({ startTime: "09:00", endTime: "21:00" })).toBe(false);
    expect(miscWindowCrossesMidnight({ startTime: "22:00", endTime: "02:00" })).toBe(true);
  });

  it("keeps working for the session when storage is blocked", () => {
    resetAudioAdhkarScheduleSettingsMemoryForTesting();
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      saveSectionReciterChoice("morning", "random");
      saveMiscSchedule({ enabled: true, startTime: "08:00", endTime: "20:00", intervalMinutes: 25 });
      saveExcludedAdhkar("evening", ["morning_003"]);
      expect(loadSectionReciterChoice("morning")).toBe("random");
      expect(loadMiscSchedule().intervalMinutes).toBe(25);
      expect(loadExcludedAdhkar("evening")).toEqual(["morning_003"]);
    } finally {
      get.mockRestore();
      set.mockRestore();
      resetAudioAdhkarScheduleSettingsMemoryForTesting();
    }
  });
});
