// The weekly schedule: one start ("wake-up") time per weekday, Sunday
// through Saturday. Its settings page was replaced by the weekly holiday
// start (below), and it is no longer sent to native — a saved schedule is
// kept in storage but restricts nothing, so ordinary days keep their own
// times. The rest of this note describes it as it was.
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
// The weekly holiday start (same page, its own switch): chosen days off
// and ONE time for all of them — a stricter floor that also covers what
// the weekly schedule leaves alone. On a holiday nothing starts before it:
// the Misc dhikr and reminders/widget (sent to native as their per-day
// floor, holidayDayStarts), Morning/Evening sessions (dailyAzkarWindows.ts
// moves them no earlier than it — a session that no longer fits its
// window that day is skipped, as always) and prayer notifications with
// their adhan (prayerNotifications.ts leaves out every one before it).
// The 30-minute adhan pause of the audio adhkar is never changed.
//
// Native receives seven numbers (minutes after midnight, -1 = none) indexed
// Sunday = 0 … Saturday = 6 — the same order as Date#getDay and
// Calendar.DAY_OF_WEEK - 1 — and recomputes each day from the device's own
// local time, so date changes, time-zone changes and DST need no resync.
import { isValidStartTime, startTimeToMinutes } from "./eveningAudioSettings";
import { localDateIn, zonedInstant } from "./locationTime";

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

// ---- Weekly holiday start ------------------------------------------------

export interface HolidayStart {
  enabled: boolean;
  /** The holiday weekdays (Sunday = 0 … Saturday = 6). */
  days: Weekday[];
  /** "HH:mm": nothing starts before it on those days. */
  time: string;
}

const HOLIDAY_KEY = "dithar:weekly-holiday-start:v1";

export const DEFAULT_HOLIDAY_START: HolidayStart = { enabled: false, days: [5, 6], time: "12:00" };

export function loadHolidayStart(): HolidayStart {
  const obj = readJson(HOLIDAY_KEY);
  const days = Array.isArray(obj.days) ? WEEKDAYS.filter((d) => (obj.days as unknown[]).includes(d)) : DEFAULT_HOLIDAY_START.days;
  const time = typeof obj.time === "string" && isValidStartTime(obj.time) ? obj.time : DEFAULT_HOLIDAY_START.time;
  return { enabled: obj.enabled === true, days, time };
}

export function saveHolidayStart(holiday: HolidayStart): void {
  writeJson(HOLIDAY_KEY, { enabled: holiday.enabled, days: WEEKDAYS.filter((d) => holiday.days.includes(d)), time: holiday.time });
  notify();
}

/** The holiday start per weekday (minutes, -1 = not a holiday), Sunday first — all -1 while switched off. */
export function holidayDayStarts(holiday: HolidayStart = loadHolidayStart()): number[] {
  const minutes = holiday.enabled ? startTimeToMinutes(holiday.time) : -1;
  return WEEKDAYS.map((d) => (holiday.days.includes(d) ? minutes : -1));
}

/**
 * The holiday start of the day (in `timezone`) that `at` falls on, epoch
 * millis — null when that day isn't a holiday.
 */
export function holidayStartOn(at: number, timezone: string, starts: readonly number[] = holidayDayStarts()): number | null {
  const date = localDateIn(new Date(at), timezone);
  const minutes = starts[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()] ?? -1;
  return minutes >= 0 ? zonedInstant(date, minutes, timezone) : null;
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

// ---- Misc: optional per-day start and end times -------------------------

const MISC_DAY_TIMES_KEY = "dithar:audio-adhkar:misc-day-times:v1";

/** Misc's own times per weekday ("" = its usual start / end that day). */
export interface MiscDayTimes {
  start: string[];
  end: string[];
}

export function loadMiscDayTimes(): MiscDayTimes {
  const obj = readJson(MISC_DAY_TIMES_KEY);
  return { start: sevenTimes(obj.start), end: sevenTimes(obj.end) };
}

export function saveMiscDayTimes(times: MiscDayTimes): void {
  writeJson(MISC_DAY_TIMES_KEY, { start: sevenTimes(times.start), end: sevenTimes(times.end) });
  notify();
}

/** What native receives (MiscDayTimes in audioadhkar/AudioAdhkarLogic.kt): minutes per weekday, -1 = the usual time that day. */
export function miscDayTimesPush(times: MiscDayTimes = loadMiscDayTimes()): { startMinutes: number[]; endMinutes: number[] } {
  return { startMinutes: times.start.map(startTimeToMinutes), endMinutes: times.end.map(startTimeToMinutes) };
}

// ---- Adhan: optional later time per prayer and weekday ------------------

export type AdhanDayPrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const ADHAN_DAY_PRAYERS: readonly AdhanDayPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ADHAN_DAY_TIMES_KEY = "dithar:adhan:day-times:v1";

/**
 * A later Adhan time for a prayer on chosen weekdays ("" = at the prayer
 * time). It is a delay only: it applies when it falls at or after that
 * day's prayer time and before the next prayer (lib/prayerSchedule.ts
 * upcomingAdhanTimes) — an Adhan is never called before its time.
 */
export function loadAdhanDayTimes(): Record<AdhanDayPrayer, string[]> {
  const obj = readJson(ADHAN_DAY_TIMES_KEY);
  return Object.fromEntries(ADHAN_DAY_PRAYERS.map((p) => [p, sevenTimes(obj[p])])) as Record<AdhanDayPrayer, string[]>;
}

export function saveAdhanDayTimes(prayer: AdhanDayPrayer, times: string[]): void {
  writeJson(ADHAN_DAY_TIMES_KEY, { ...readJson(ADHAN_DAY_TIMES_KEY), [prayer]: sevenTimes(times) });
  notify();
}
