// The adhan pause for Audio Adhkar: from each prayer's adhan time, for
// 30 minutes, no Audio Adhkar starts, and whatever is playing stops.
// Computed from the app's own prayer times (prayerSchedule.ts — the same
// source prayer notifications use) — never hardcoded. Shuruq has no adhan
// and is not included.
import type { PrayerLocation } from "./prayerTimes";
import { currentPrayerLocation, upcomingPrayerTimes } from "./prayerSchedule";

export { currentPrayerLocation };

export const ADHAN_PAUSE_MINUTES = 30;
const PAUSE_MS = ADHAN_PAUSE_MINUTES * 60_000;

/** [start, end) in epoch millis. */
export type AdhanWindow = readonly [number, number];

/**
 * Every adhan window that hasn't ended yet, from yesterday's prayers (a
 * late Isha can still be running) through `days` days ahead — sorted, with
 * overlapping windows merged into one.
 */
export function buildAdhanWindows(now: Date, location: PrayerLocation = currentPrayerLocation(), days = 30): AdhanWindow[] {
  const raw = upcomingPrayerTimes(now, location, days)
    .filter(({ at }) => at + PAUSE_MS > now.getTime())
    .map(({ at }): [number, number] => [at, at + PAUSE_MS]);
  return mergeWindows(raw);
}

export function mergeWindows(windows: readonly AdhanWindow[]): AdhanWindow[] {
  const merged: [number, number][] = [];
  for (const [start, end] of [...windows].filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function isInAdhanPause(at: number, windows: readonly AdhanWindow[]): boolean {
  return windows.some(([start, end]) => at >= start && at < end);
}

/** When the next adhan pause begins strictly after `at`, or null. */
export function nextAdhanPauseStart(at: number, windows: readonly AdhanWindow[]): number | null {
  const next = windows.find(([start]) => start > at);
  return next ? next[0] : null;
}
