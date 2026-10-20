// When a Morning/Evening Audio Adhkar session may play, day by day, from
// the app's own prayer times (prayerSchedule.ts — the same source as the
// adhan pause and prayer notifications):
//
//   Morning: from 30 minutes after Fajr until 30 minutes before Dhuhr.
//   Evening: from 30 minutes after Asr until midnight.
//
// A session starts only if it can finish inside its window — its length
// comes from the selected adhkar, their repetition counts, the measured
// length of every file (data/audioDurations.json) and the silence between
// playbacks, plus any adhan pause it would have to wait out. The user's
// start time is the preferred moment; when the session doesn't fit there
// (or it lies outside the window) it moves to the nearest minute that does
// fit, inside the same window. A day whose window is too short gets no
// session — nothing is ever carried to another day.
//
// The resulting slots ([window start, start, window end], epoch millis)
// are pushed to the native scheduler (AudioAdhkarPlugin), which plays each
// at most once and never continues a session past its window's end.
import audioDurations from "../data/audioDurations.json";
import type { DailySection } from "./audioAdhkarScheduleSettings";
import type { NativePlaylistItem, NativeRecitation } from "./audioAdhkarNative";
import type { AdhanWindow } from "./adhanSuppression";
import { REPETITION_PAUSE_MS } from "./audioAdhkarPlayback";
import { calculatePrayerDay } from "./prayerTimes";
import type { PrayerLocation } from "./prayerTimes";
import { addDays, localDateIn } from "./locationTime";
import type { LocalDate } from "./locationTime";

export const WINDOW_MARGIN_MINUTES = 30;
const MINUTE_MS = 60_000;
const MARGIN_MS = WINDOW_MARGIN_MINUTES * MINUTE_MS;

/** [start, end) in epoch millis. */
export interface DailyWindow {
  start: number;
  end: number;
}

/** One day's session: its window and when it starts inside it. */
export interface DailySlot extends DailyWindow {
  /** The planned start, epoch millis — window.start <= at, and the session ends by window.end. */
  at: number;
}

const DURATIONS: Readonly<Record<string, number>> = audioDurations;
const APK_PREFIX = "public/";

/** A bundled file's measured length in millis (path as the native playlist has it), or undefined when unknown. */
export function audioDurationMs(assetPath: string): number | undefined {
  return DURATIONS[assetPath.startsWith(APK_PREFIX) ? assetPath.slice(APK_PREFIX.length) : assetPath];
}

type DurationOf = (assetPath: string) => number | undefined;

function sum(paths: readonly string[], durationOf: DurationOf): number | null {
  let total = 0;
  for (const path of paths) {
    const ms = durationOf(path);
    if (ms === undefined) return null;
    total += ms;
  }
  return total;
}

/** One recitation played `repetitions` times (no silences), or null when a file's length is unknown. */
function recitationMs(recitation: NativeRecitation, repetitions: number, durationOf: DurationOf): number | null {
  const first = sum(recitation.assetPaths, durationOf);
  const repeat = sum(recitation.repeatAssetPaths, durationOf);
  if (first === null || repeat === null) return null;
  return first + Math.max(0, repetitions - 1) * Math.max(0, repeat - recitation.repeatStartMillis);
}

/** One dhikr, every repetition, without silences — the longest reciter's when it rotates. Null when unknown. */
export function itemDurationMs(item: NativePlaylistItem, durationOf: DurationOf = audioDurationMs): number | null {
  const recitations = item.rotation.length > 0 ? item.rotation : [item];
  let longest = 0;
  for (const recitation of recitations) {
    const ms = recitationMs(recitation, item.repetitions, durationOf);
    if (ms === null) return null;
    longest = Math.max(longest, ms);
  }
  return longest;
}

/**
 * How long the session plays: every dhikr, every repetition, and the
 * silence between two playbacks (never after the last). Null when the
 * length of a file isn't known.
 */
export function sessionDurationMs(playlist: readonly NativePlaylistItem[], durationOf: DurationOf = audioDurationMs): number | null {
  let total = 0;
  let playbacks = 0;
  for (const item of playlist) {
    const ms = itemDurationMs(item, durationOf);
    if (ms === null) return null;
    total += ms;
    playbacks += item.repetitions;
  }
  return total + Math.max(0, playbacks - 1) * REPETITION_PAUSE_MS;
}

/** The location's wall-clock offset from UTC at `instant`, in millis. */
function zoneOffsetMs(instant: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant it is `minutes` after midnight of `date` at the location (DST-safe: re-checked at the result). */
export function zonedInstant(date: LocalDate, minutes: number, timezone: string): number {
  const wall = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  let at = wall - zoneOffsetMs(wall, timezone);
  at = wall - zoneOffsetMs(at, timezone);
  return at;
}

/** The section's window on the location's day `date`, or null when the prayer times don't give one. */
export function dailyWindowFor(section: DailySection, date: LocalDate, location: PrayerLocation): DailyWindow | null {
  const { times } = calculatePrayerDay(location, date);
  const window =
    section === "morning"
      ? { start: times.fajr.getTime() + MARGIN_MS, end: times.dhuhr.getTime() - MARGIN_MS }
      : { start: times.asr.getTime() + MARGIN_MS, end: zonedInstant(addDays(date, 1), 0, location.timezone) };
  return Number.isFinite(window.start) && Number.isFinite(window.end) && window.end > window.start ? window : null;
}

/**
 * When a session that plays `durationMs` and starts at `start` is over,
 * given the adhan pauses: nothing starts inside one (the start waits for
 * its end), and one that begins mid-session stops it — it continues after
 * the pause from the dhikr it was on, which plays again from its first
 * repetition (`redoMs`: the longest dhikr, to be safe).
 */
export function sessionEndMs(start: number, durationMs: number, adhanWindows: readonly AdhanWindow[], redoMs: number): number {
  let t = start;
  let remaining = durationMs;
  for (const [ws, we] of adhanWindows) {
    if (we <= t) continue;
    if (ws >= t + remaining) break;
    if (ws > t) {
      remaining = remaining - (ws - t) + redoMs;
    }
    t = Math.max(t, we);
  }
  return t + remaining;
}

function inAdhanWindow(at: number, adhanWindows: readonly AdhanWindow[]): boolean {
  return adhanWindows.some(([s, e]) => at >= s && at < e);
}

/**
 * Where in `window` the session starts: `preferred` when it fits there,
 * otherwise the nearest whole minute (from `preferred`, earlier first on a
 * tie) at which it starts outside an adhan pause and still ends by the
 * window's end. Null when it fits nowhere in the window. An unknown
 * `durationMs` (null) is only kept inside the window.
 */
export function planStartInWindow(
  window: DailyWindow,
  preferred: number,
  durationMs: number | null,
  adhanWindows: readonly AdhanWindow[] = [],
  redoMs = 0,
): number | null {
  const fits = (at: number) =>
    at >= window.start && at < window.end && !inAdhanWindow(at, adhanWindows) && (durationMs === null || sessionEndMs(at, durationMs, adhanWindows, redoMs) <= window.end);
  const steps = Math.ceil((window.end - window.start) / MINUTE_MS) + Math.ceil(Math.abs(preferred - window.start) / MINUTE_MS) + 1;
  for (let k = 0; k <= steps; k++) {
    const earlier = preferred - k * MINUTE_MS;
    if (fits(earlier)) return earlier;
    const later = preferred + k * MINUTE_MS;
    if (k > 0 && fits(later)) return later;
  }
  return null;
}

export interface DailySlotsInput {
  section: DailySection;
  /** The user's start time: minutes after the location's midnight. */
  startMinutes: number;
  /**
   * Optional per-weekday start times (Sunday = 0 … Saturday = 6; -1 = the
   * usual `startMinutes` that day) — the section's "customize by day" times.
   */
  dayStartMinutes?: readonly number[];
  playlist: readonly NativePlaylistItem[];
  location: PrayerLocation;
  adhanWindows: readonly AdhanWindow[];
  now: Date;
  days?: number;
  durationOf?: DurationOf;
}

/**
 * Today's and the next days' sessions (as many as `days`), each inside its
 * own day's window — a day where the session can't fit has none. Windows
 * already over are left out.
 */
export function buildDailySlots({ section, startMinutes, dayStartMinutes, playlist, location, adhanWindows, now, days = 30, durationOf = audioDurationMs }: DailySlotsInput): DailySlot[] {
  if (startMinutes < 0 || playlist.length === 0) return [];
  const durationMs = sessionDurationMs(playlist, durationOf);
  const redoMs = Math.max(0, ...playlist.map((item) => itemDurationMs(item, durationOf) ?? 0)) + REPETITION_PAUSE_MS;
  const today = localDateIn(now, location.timezone);
  const slots: DailySlot[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = addDays(today, offset);
    const window = dailyWindowFor(section, date, location);
    if (!window || window.end <= now.getTime()) continue;
    // That weekday's own start time when one is set, else the usual one.
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    const dayStart = dayStartMinutes?.[weekday] ?? -1;
    const at = planStartInWindow(window, zonedInstant(date, dayStart >= 0 ? dayStart : startMinutes, location.timezone), durationMs, adhanWindows, redoMs);
    if (at !== null) slots.push({ ...window, at });
  }
  return slots;
}
