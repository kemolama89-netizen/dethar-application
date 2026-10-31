// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { buildDailySlots, dailyWindowFor, zonedInstant } from "./dailyAzkarWindows";
import type { NativePlaylistItem } from "./audioAdhkarNative";
import { calculatePrayerDay, KUWAIT_CITY_COORDINATES } from "./prayerTimes";
import type { PrayerLocation } from "./prayerTimes";
import { upcomingAdhanTimes, upcomingPrayerTimes } from "./prayerSchedule";
import { buildAdhanWindows } from "./adhanSuppression";
import { loadAdhanDayTimes, loadMiscDayTimes, miscDayTimesPush, saveAdhanDayTimes, saveMiscDayTimes, subscribeWeeklySchedule } from "./weeklySchedule";

const MIN = 60_000;
const TZ = "Asia/Kuwait";
const kuwait: PrayerLocation = { coordinates: KUWAIT_CITY_COORDINATES, timezone: TZ, country: "KW" };
/** October 2026: the 16th is a Friday, the 17th a Saturday. */
const day = (d: number) => ({ year: 2026, month: 10, day: d });
const at = (d: number, minutes: number) => zonedInstant(day(d), minutes, TZ);
const SAT = 6;
const FRI = 5;
const seven = (overrides: Record<number, string>) => [0, 1, 2, 3, 4, 5, 6].map((d) => overrides[d] ?? "");

beforeEach(() => localStorage.clear());

describe("Morning Adhkar: a weekday's own time plays at exactly that time", () => {
  const a: NativePlaylistItem = { dhikrId: "a", title: "a", text: "a", assetPaths: ["public/a.mp3"], repeatAssetPaths: ["public/a.mp3"], repeatStartMillis: 0, rotation: [], repetitions: 1 };
  const base = { section: "morning" as const, playlist: [a], location: kuwait, adhanWindows: [], durationOf: () => 10 * MIN };
  // Usually 09:00; Saturday 12:00 — after the Morning window's end (30 min before Dhuhr, ~11:10 in Kuwait).
  const dayStartMinutes = [-1, -1, -1, -1, -1, -1, 12 * 60];
  const now = new Date(at(15, 0)); // Thursday 00:00

  it("starts at noon on Saturday only; every other day keeps 09:00 inside its window", () => {
    const slots = buildDailySlots({ ...base, startMinutes: 9 * 60, dayStartMinutes, now, days: 4 });
    expect(slots.map((s) => s.at)).toEqual([at(15, 540), at(16, 540), at(17, 720), at(18, 540)]);
    const saturdayWindow = dailyWindowFor("morning", day(17), kuwait)!;
    expect(at(17, 720)).toBeGreaterThan(saturdayWindow.end); // outside the usual window, and still planned there
    expect(slots[2].end).toBeGreaterThanOrEqual(at(17, 720) + 10 * MIN); // its window holds the whole session
  });

  it("keeps native's one-session-per-day rule: each slot opens no later than its start, and after the previous day's start", () => {
    const slots = buildDailySlots({ ...base, startMinutes: 9 * 60, dayStartMinutes: [-1, -1, -1, -1, -1, -1, 4 * 60], now, days: 4 });
    for (let i = 0; i < slots.length; i++) {
      expect(slots[i].start).toBeLessThanOrEqual(slots[i].at);
      if (i > 0) expect(slots[i].start).toBeGreaterThan(slots[i - 1].at);
    }
    expect(slots[2].at).toBe(at(17, 240)); // Saturday 04:00 — before even Fajr — exactly as set
  });

  it("an adhan pause it falls in still applies (native waits it out; the window allows for it)", () => {
    const dhuhr = calculatePrayerDay(kuwait, day(17)).times.dhuhr.getTime();
    const pause: [number, number] = [dhuhr, dhuhr + 30 * MIN];
    const slots = buildDailySlots({ ...base, adhanWindows: [pause], startMinutes: 9 * 60, dayStartMinutes: [-1, -1, -1, -1, -1, -1, Math.round((dhuhr - at(17, 0)) / MIN) + 5], now, days: 4 });
    expect(slots[2].end).toBeGreaterThanOrEqual(pause[1] + 10 * MIN);
  });
});

describe("Misc: its own start and end on chosen weekdays", () => {
  it("is saved per weekday and pushed as minutes (-1 = the usual time)", () => {
    saveMiscDayTimes({ start: seven({ [SAT]: "12:00" }), end: seven({ [SAT]: "22:00" }) });
    expect(loadMiscDayTimes().start[SAT]).toBe("12:00");
    expect(miscDayTimesPush()).toEqual({ startMinutes: [-1, -1, -1, -1, -1, -1, 720], endMinutes: [-1, -1, -1, -1, -1, -1, 1320] });
  });

  it("a change re-syncs the schedules", () => {
    let told = 0;
    const off = subscribeWeeklySchedule(() => told++);
    saveMiscDayTimes({ start: seven({}), end: seven({ [FRI]: "23:00" }) });
    saveAdhanDayTimes("dhuhr", seven({ [FRI]: "12:30" }));
    off();
    expect(told).toBe(2);
  });
});

describe("the Adhan: a later time per prayer on chosen weekdays — a delay only", () => {
  const now = new Date(at(15, 0));
  const fridayDhuhr = calculatePrayerDay(kuwait, day(16)).times.dhuhr.getTime();
  const fridayAsr = calculatePrayerDay(kuwait, day(16)).times.asr.getTime();
  const minutesOf = (instant: number) => Math.round((instant - at(16, 0)) / MIN);
  const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const dhuhrOn = (times: ReturnType<typeof upcomingAdhanTimes>, d: number) =>
    times.find((t) => t.prayer === "dhuhr" && t.prayerAt === calculatePrayerDay(kuwait, day(d)).times.dhuhr.getTime())!;

  it("Friday's Dhuhr Adhan plays at its later time; other days and prayers keep the prayer time", () => {
    const later = minutesOf(fridayDhuhr) + 25;
    const times = upcomingAdhanTimes(now, kuwait, 4, { ...loadAdhanDayTimes(), dhuhr: seven({ [FRI]: hhmm(later) }) });
    expect(dhuhrOn(times, 16).at).toBe(at(16, later));
    expect(dhuhrOn(times, 17).at).toBe(dhuhrOn(times, 17).prayerAt);
    const plain = upcomingPrayerTimes(now, kuwait, 4);
    expect(times.filter((t) => !(t.prayer === "dhuhr" && t.prayerAt === fridayDhuhr)).map((t) => t.at)).toEqual(plain.filter((p) => p.at !== fridayDhuhr).map((p) => p.at));
  });

  it("is never earlier than the prayer time, nor at or after the next prayer: then it plays at the prayer time", () => {
    for (const minutes of [minutesOf(fridayDhuhr) - 10, minutesOf(fridayAsr), minutesOf(fridayAsr) + 5]) {
      const times = upcomingAdhanTimes(now, kuwait, 4, { ...loadAdhanDayTimes(), dhuhr: seven({ [FRI]: hhmm(minutes) }) });
      expect(dhuhrOn(times, 16).at).toBe(fridayDhuhr);
    }
  });

  it("Audio Adhkar pause around both the prayer time and the delayed Adhan", () => {
    const later = minutesOf(fridayDhuhr) + 45;
    saveAdhanDayTimes("dhuhr", seven({ [FRI]: hhmm(later) }));
    const windows = buildAdhanWindows(now, kuwait, 4);
    const covers = (t: number) => windows.some(([s, e]) => t >= s && t < e);
    expect(covers(fridayDhuhr + MIN)).toBe(true);
    expect(covers(at(16, later) + MIN)).toBe(true);
  });
});
