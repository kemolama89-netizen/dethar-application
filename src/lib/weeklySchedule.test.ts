// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dailyStartMinutesFor,
  effectiveStartMinutes,
  loadDailyDayTimes,
  loadWeeklySchedule,
  saveDailyDayTimes,
  saveWeeklySchedule,
  subscribeWeeklySchedule,
  weeklyDayStarts,
} from "./weeklySchedule";
import { buildDailySlots } from "./dailyAzkarWindows";
import type { NativePlaylistItem } from "./audioAdhkarNative";

describe("weekly schedule", () => {
  beforeEach(() => localStorage.clear());

  it("is off with no day restricted until the user sets it", () => {
    expect(loadWeeklySchedule()).toEqual({ enabled: false, days: ["", "", "", "", "", "", ""] });
    expect(weeklyDayStarts()).toEqual([-1, -1, -1, -1, -1, -1, -1]);
  });

  it("stores a separate time per weekday (Sunday first) and survives a restart", () => {
    saveWeeklySchedule({ enabled: true, days: ["06:30", "06:30", "06:30", "06:30", "06:30", "10:00", "09:15"] });
    expect(loadWeeklySchedule().days[5]).toBe("10:00");
    expect(weeklyDayStarts()).toEqual([390, 390, 390, 390, 390, 600, 555]);
  });

  it("sends no restriction while switched off, keeping the saved days", () => {
    saveWeeklySchedule({ enabled: false, days: ["06:30", "", "", "", "", "10:00", ""] });
    expect(weeklyDayStarts()).toEqual([-1, -1, -1, -1, -1, -1, -1]);
    expect(loadWeeklySchedule().days[0]).toBe("06:30");
  });

  it("drops anything malformed instead of scheduling with it", () => {
    localStorage.setItem("dithar:weekly-schedule:v1", JSON.stringify({ enabled: true, days: ["25:00", 7, "07:00"] }));
    expect(loadWeeklySchedule().days).toEqual(["", "", "07:00", "", "", "", ""]);
  });

  it("is a floor: a recurring section never starts before the day's time, and keeps its own later start", () => {
    expect(effectiveStartMinutes(540, 600)).toBe(600);
    expect(effectiveStartMinutes(540, 420)).toBe(540);
    expect(effectiveStartMinutes(540, -1)).toBe(540);
  });

  it("tells listeners (the schedule re-sync) about every change", () => {
    const listener = vi.fn();
    const stop = subscribeWeeklySchedule(listener);
    saveWeeklySchedule({ enabled: true, days: ["", "", "", "", "", "", ""] });
    saveDailyDayTimes("morning", ["", "", "", "", "", "08:00", ""]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    saveWeeklySchedule({ enabled: false, days: [] });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("Morning/Evening keep their own start time, with optional per-day times", () => {
    saveDailyDayTimes("morning", ["", "", "", "", "", "08:30", ""]);
    expect(loadDailyDayTimes("morning")[5]).toBe("08:30");
    expect(loadDailyDayTimes("evening")).toEqual(["", "", "", "", "", "", ""]);
    expect(dailyStartMinutesFor("morning", 5, 360)).toBe(510);
    expect(dailyStartMinutesFor("morning", 4, 360)).toBe(360);
  });

  it("a per-day Morning time moves that weekday's planned session only", () => {
    const playlist: NativePlaylistItem[] = [
      { dhikrId: "x", title: "x", text: "x", assetPaths: ["a.mp3"], repeatAssetPaths: ["a.mp3"], repeatStartMillis: 0, rotation: [], repetitions: 1 },
    ];
    const location = { coordinates: { latitude: 29.3759, longitude: 47.9774 }, timezone: "Asia/Kuwait", country: "KW" };
    const input = { section: "morning" as const, startMinutes: 6 * 60, playlist, location, adhanWindows: [], now: new Date("2026-10-11T00:00:00+03:00"), days: 7, durationOf: () => 60_000 };
    const usual = buildDailySlots(input);
    const friday = buildDailySlots({ ...input, dayStartMinutes: [-1, -1, -1, -1, -1, 8 * 60 + 30, -1] });
    const hhmm = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuwait", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(ms);
    expect(usual.map((s) => hhmm(s.at))).toContain("Fri 06:00");
    expect(friday.map((s) => hhmm(s.at))).toContain("Fri 08:30");
    expect(friday.map((s) => hhmm(s.at))).toContain("Thu 06:00");
  });
});
