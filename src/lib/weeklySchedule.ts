// The weekly schedule (Settings → الجدول الأسبوعي): one start ("wake-up")
// time per weekday, Sunday through Saturday, because workdays and days off
// begin at different times.
//
// It is a floor, not a new schedule: on each day nothing RECURRING starts
// before that day's time —
//   - the Miscellaneous audio dhikr (its own window still applies; the day's
//     start is whichever is later),
//   - reminder notifications and widget reminders (same rule, against the
//     reminders' own permitted period).
// A day left empty adds no restriction. Morning/Evening Adhkar keep their
// own start times (with optional per-day times of their own, see
// loadDailyDayTimes), and prayer times / the adhan are never affected.
//
// Native receives seven numbers (minutes after midnight, -1 = none) indexed
// Sunday = 0 … Saturday = 6 — the same order as Date#getDay and
// Calendar.DAY_OF_WEEK - 1 — and recomputes each day from the device's own
// local time, so date changes, time-zone changes and DST need no resync.
import { isValidStartTime, startTimeToMinutes } from "./eveningAudioSettings";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export interface WeeklySchedule {
  enabled: boolean;
  /** "HH:mm" per weekday (Sunday first), or "" for no restriction that day. */
  days: string[];
}

const WEEKLY_KEY = "dithar:weekly-schedule:v1";
const DAY_TIMES_KEY = "dithar:audio-adhkar:day-times:v1";

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = { enabled: false, days: ["", "", "", "", "", "", ""] };

function readJson(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort, like the app's other settings.
  }
}

/** Seven "HH:mm" | "" values; anything else becomes "". */
function sevenTimes(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return WEEKDAYS.map((d) => (typeof list[d] === "string" && isValidStartTime(list[d]) ? (list[d] as string) : ""));
}

const listeners = new Set<() => void>();

/** Told whenever the weekly schedule or a per-day time changes (schedules then re-sync). */
export function subscribeWeeklySchedule(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of [...listeners]) listener();
}

export function loadWeeklySchedule(): WeeklySchedule {
  const obj = readJson(WEEKLY_KEY);
  return { enabled: obj.enabled === true, days: sevenTimes(obj.days) };
}

export function saveWeeklySchedule(schedule: WeeklySchedule): void {
  writeJson(WEEKLY_KEY, { enabled: schedule.enabled, days: sevenTimes(schedule.days) });
  notify();
}

/** The weekly start for each weekday (minutes, -1 = none), Sunday first — all -1 while switched off. */
export function weeklyDayStarts(schedule: WeeklySchedule = loadWeeklySchedule()): number[] {
  return WEEKDAYS.map((d) => (schedule.enabled ? startTimeToMinutes(schedule.days[d]) : -1));
}

/** A recurring section's start on a day: its own start, unless that day's weekly start is later. */
export function effectiveStartMinutes(sectionStart: number, dayStart: number): number {
  return dayStart < 0 ? sectionStart : Math.max(sectionStart, dayStart);
}

// ---- Morning/Evening: optional per-day start times ----------------------

export type DailySectionKey = "morning" | "evening";

/** Per-day start times for a Morning/Evening section ("" = its usual start time that day). */
export function loadDailyDayTimes(section: DailySectionKey): string[] {
  return sevenTimes(readJson(DAY_TIMES_KEY)[section]);
}

export function saveDailyDayTimes(section: DailySectionKey, times: string[]): void {
  writeJson(DAY_TIMES_KEY, { ...readJson(DAY_TIMES_KEY), [section]: sevenTimes(times) });
  notify();
}

/** A Morning/Evening section's start on `weekday` (minutes): that day's own time, else its usual one. */
export function dailyStartMinutesFor(section: DailySectionKey, weekday: number, defaultMinutes: number, times = loadDailyDayTimes(section)): number {
  const own = startTimeToMinutes(times[weekday] ?? "");
  return own >= 0 ? own : defaultMinutes;
}
