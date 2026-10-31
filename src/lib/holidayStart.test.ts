// @vitest-environment jsdom
// The weekly holiday start (lib/weeklySchedule.ts): chosen days off and one
// time — nothing scheduled starts before it on those days; every other day
// is exactly as before.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HOLIDAY_START,
  holidayDayStarts,
  holidayStartOn,
  loadHolidayStart,
  saveHolidayStart,
  saveWeeklySchedule,
  subscribeWeeklySchedule,
} from "./weeklySchedule";
import { buildDailySlots } from "./dailyAzkarWindows";
import type { DailySlot } from "./dailyAzkarWindows";
import type { NativePlaylistItem } from "./audioAdhkarNative";
import { buildPrayerNotifications } from "./prayerNotifications";
import type { PrayerReminderSettings } from "./prayerReminderSettings";
import { upcomingAdhanTimes } from "./prayerSchedule";

const MIN = 60_000;
const TZ = "Asia/Kuwait";
const location = { coordinates: { latitude: 29.3759, longitude: 47.9774 }, timezone: TZ, country: "KW" };
// Saturday 10 Oct 2026, 03:00 in Kuwait; Thursday is the 15th, Friday the 16th, Saturday the 17th.
const NOW = new Date("2026-10-10T00:00:00Z");
const FRI_SAT = (minutes: number) => [-1, -1, -1, -1, -1, minutes, minutes];
const hm = (h: number, m = 0) => h * 60 + m;

/** "Fri 09:00" in Kuwait. */
const label = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(ms);
const weekday = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(ms);
const byDay = (slots: DailySlot[]) => new Map(slots.map((s) => [weekday(s.at), s]));

describe("holiday start setting", () => {
  beforeEach(() => localStorage.clear());

  it("is off by default (Friday and Saturday preselected) and restricts nothing", () => {
    expect(loadHolidayStart()).toEqual(DEFAULT_HOLIDAY_START);
    expect(DEFAULT_HOLIDAY_START.days).toEqual([5, 6]);
    expect(holidayDayStarts()).toEqual([-1, -1, -1, -1, -1, -1, -1]);
  });

  it("persists the chosen days and one time for all of them, every week until changed", () => {
    saveHolidayStart({ enabled: true, days: [6, 5], time: "12:00" });
    expect(loadHolidayStart()).toEqual({ enabled: true, days: [5, 6], time: "12:00" });
    expect(holidayDayStarts()).toEqual(FRI_SAT(hm(12)));
    // A new time applies at once to every holiday.
    saveHolidayStart({ ...loadHolidayStart(), time: "11:00" });
    expect(holidayDayStarts()).toEqual(FRI_SAT(hm(11)));
  });

  it("only the selected days are restricted", () => {
    saveHolidayStart({ enabled: true, days: [0], time: "10:15" });
    expect(holidayDayStarts()).toEqual([hm(10, 15), -1, -1, -1, -1, -1, -1]);
  });

  it("switched off keeps the saved days and time but restricts nothing", () => {
    saveHolidayStart({ enabled: false, days: [5], time: "12:00" });
    expect(holidayDayStarts()).toEqual([-1, -1, -1, -1, -1, -1, -1]);
    expect(loadHolidayStart()).toMatchObject({ days: [5], time: "12:00" });
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem("dithar:weekly-holiday-start:v1", JSON.stringify({ enabled: true, days: [9, "5", 6], time: "25:00" }));
    expect(loadHolidayStart()).toEqual({ enabled: true, days: [6], time: DEFAULT_HOLIDAY_START.time });
  });

  it("every change re-syncs the schedules (same listeners as the weekly schedule)", () => {
    const listener = vi.fn();
    const stop = subscribeWeeklySchedule(listener);
    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    saveHolidayStart({ enabled: true, days: [5, 6], time: "11:00" });
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it("a previously saved weekly schedule (its page is gone) never changes the holiday floor", () => {
    saveWeeklySchedule({ enabled: true, days: ["07:00", "07:00", "07:00", "07:00", "07:00", "13:00", "09:00"] });
    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    expect(holidayDayStarts()).toEqual(FRI_SAT(hm(12)));
  });

  it("finds the holiday start of the day an instant falls on, in the given time zone", () => {
    const starts = FRI_SAT(hm(12));
    expect(holidayStartOn(Date.UTC(2026, 9, 16, 5, 0), TZ, starts)).toBe(Date.UTC(2026, 9, 16, 9, 0)); // Fri 08:00 → Fri 12:00
    expect(holidayStartOn(Date.UTC(2026, 9, 15, 21, 30), TZ, starts)).toBe(Date.UTC(2026, 9, 16, 9, 0)); // Thu 21:30 UTC = Fri 00:30 in Kuwait
    expect(holidayStartOn(Date.UTC(2026, 9, 15, 5, 0), TZ, starts)).toBeNull(); // Thursday
  });
});

describe("Morning/Evening sessions on a holiday", () => {
  const playlist: NativePlaylistItem[] = [
    { dhikrId: "x", title: "x", text: "x", assetPaths: ["a.mp3"], repeatAssetPaths: ["a.mp3"], repeatStartMillis: 0, rotation: [], repetitions: 1 },
  ];
  const input = { section: "morning" as const, startMinutes: hm(6), playlist, location, adhanWindows: [], now: NOW, days: 8, durationOf: () => MIN };

  it("a morning session starts no earlier than the holiday start; other days and its window are unchanged", () => {
    const usual = byDay(buildDailySlots(input));
    const holiday = byDay(buildDailySlots({ ...input, holidayStartMinutes: FRI_SAT(hm(9)) }));
    expect(label(holiday.get("Fri")!.at)).toBe("Fri 09:00");
    expect(label(holiday.get("Thu")!.at)).toBe("Thu 06:00");
    expect(holiday.get("Thu")).toEqual(usual.get("Thu"));
    // Same window (native's one-session-per-day identity), only a later start — and marked for native.
    expect(holiday.get("Fri")).toMatchObject({ start: usual.get("Fri")!.start, end: usual.get("Fri")!.end, notBefore: Date.UTC(2026, 9, 16, 6, 0) });
    expect(holiday.get("Thu")!.notBefore).toBeUndefined();
  });

  it("follows a changed holiday time", () => {
    const slots = byDay(buildDailySlots({ ...input, holidayStartMinutes: FRI_SAT(hm(10, 30)) }));
    expect(label(slots.get("Fri")!.at)).toBe("Fri 10:30");
    expect(label(slots.get("Sat")!.at)).toBe("Sat 10:30");
  });

  it("keeps a start that is already after the holiday start", () => {
    const slots = byDay(buildDailySlots({ ...input, startMinutes: hm(10), holidayStartMinutes: FRI_SAT(hm(8)) }));
    expect(label(slots.get("Fri")!.at)).toBe("Fri 10:00");
  });

  it("a holiday start past the morning window (before Dhuhr) leaves that day without a morning session — never after it", () => {
    const slots = byDay(buildDailySlots({ ...input, holidayStartMinutes: FRI_SAT(hm(12)) }));
    expect(slots.has("Fri")).toBe(false);
    expect(slots.has("Sat")).toBe(false);
    expect(label(slots.get("Thu")!.at)).toBe("Thu 06:00");
  });

  it("a session that would no longer fit before the window's end is not squeezed in", () => {
    const long = buildDailySlots({ ...input, durationOf: () => 90 * MIN, holidayStartMinutes: FRI_SAT(hm(10)) });
    for (const slot of long) expect(slot.at + 90 * MIN).toBeLessThanOrEqual(slot.end);
    expect(byDay(long).has("Fri")).toBe(false);
  });

  it("a weekday's own morning time earlier than the holiday start moves to it", () => {
    const slots = byDay(buildDailySlots({ ...input, dayStartMinutes: FRI_SAT(hm(7)), holidayStartMinutes: FRI_SAT(hm(9, 30)) }));
    expect(label(slots.get("Fri")!.at)).toBe("Fri 09:30");
  });

  it("an evening session after the holiday start keeps its normal time", () => {
    const evening = { ...input, section: "evening" as const, startMinutes: hm(19) };
    expect(buildDailySlots({ ...evening, holidayStartMinutes: FRI_SAT(hm(12)) }).map((s) => s.at)).toEqual(buildDailySlots(evening).map((s) => s.at));
  });
});

describe("prayer notifications and adhan on a holiday", () => {
  const ON: PrayerReminderSettings = { enabled: true, prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } };
  const AUTO = { regular: true, fajr: true };
  const build = (starts: number[]) => buildPrayerNotifications(NOW, ON, "en", location, 8, AUTO, starts);
  // "Fri 16": a calendar day in Kuwait.
  const dayKey = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric" }).format(ms);
  const on = (entries: { at: number; prayer: string }[], day: string) => entries.filter((e) => dayKey(e.at) === day).map((e) => e.prayer);

  it("nothing before the holiday start; the first one is the first prayer at or after it", () => {
    const entries = build(FRI_SAT(hm(12)));
    // Kuwait mid-October: Fajr ≈ 04:20, Dhuhr ≈ 11:35 — both before noon.
    expect(on(entries, "Fri 16")).toEqual(["asr", "maghrib", "isha"]);
    expect(on(entries, "Sat 17")).toEqual(["asr", "maghrib", "isha"]);
    for (const e of entries.filter((e) => ["Fri", "Sat"].includes(weekday(e.at)))) expect(e.at).toBeGreaterThanOrEqual(holidayStartOn(e.at, TZ, FRI_SAT(hm(12)))!);
  });

  it("an earlier holiday start lets the earlier prayers through", () => {
    expect(on(build(FRI_SAT(hm(11))), "Fri 16")).toEqual(["dhuhr", "asr", "maghrib", "isha"]);
    expect(on(build(FRI_SAT(hm(3))), "Fri 16")).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
  });

  it("other days are untouched, and kept prayers keep their exact times", () => {
    const usual = build([-1, -1, -1, -1, -1, -1, -1]);
    const holiday = build(FRI_SAT(hm(12)));
    expect(on(holiday, "Thu 15")).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
    for (const e of holiday) expect(usual).toContainEqual(e);
    // Exactly the holiday entries before noon were left out: Fajr and Dhuhr of each Friday and Saturday.
    const dropped = usual.filter((e) => !holiday.includes(e) && !holiday.some((h) => h.at === e.at));
    expect(dropped.length).toBeGreaterThan(0);
    for (const e of dropped) {
      expect(["Fri", "Sat"]).toContain(weekday(e.at));
      expect(["fajr", "dhuhr"]).toContain(e.prayer);
    }
  });

  it("the prayer-time source (and so the 30-minute adhkar pause) is not filtered", () => {
    // adhanSuppression builds its windows from upcomingAdhanTimes, never from the notification list.
    expect(upcomingAdhanTimes(NOW, location, 8).filter((t) => dayKey(t.at) === "Fri 16").map((t) => t.prayer)).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
  });
});
