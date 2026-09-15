// Pure "which prayer is next, and how long until it" logic — no React, no
// timers, no I/O, so it's trivially unit-testable and has exactly one job.
// See useNextPrayerCountdown.ts for the hook that ticks `now` and calls
// this on every tick.
import type { PrayerTimesResult, ReminderPrayerKey } from "./prayerTimes";
import { REMINDER_PRAYER_ORDER } from "./prayerTimes";

export interface NextPrayer {
  key: ReminderPrayerKey;
  /** The absolute instant (a real Date) the next prayer begins. */
  time: Date;
}

// `now`, every prayer in `todayTimes`, and `tomorrowFajr` are all real
// Date instances — absolute instants — so this comparison is inherently
// timezone/UTC-safe: `Date#getTime()` is the same UTC-epoch millisecond
// value no matter what timezone anything is later FORMATTED in. This
// function itself never formats or reads any timezone.
//
//   - before today's Fajr -> next = today's Fajr (the loop's first hit).
//   - between two prayers -> next = the following one in order.
//   - after today's Isha  -> next = `tomorrowFajr` (nothing in
//     REMINDER_PRAYER_ORDER is still ahead of `now`, so the loop falls
//     through to this explicit wraparound).
export function getNextPrayer(todayTimes: PrayerTimesResult, tomorrowFajr: Date, now: Date): NextPrayer {
  for (const key of REMINDER_PRAYER_ORDER) {
    const time = todayTimes[key];
    if (time.getTime() > now.getTime()) return { key, time };
  }
  return { key: "fajr", time: tomorrowFajr };
}

export interface RemainingTime {
  hours: number;
  minutes: number;
}

// Floors to whole minutes (never rounds) so e.g. "1 minute remaining"
// doesn't flip to "0" while there are still 40 seconds left — the display
// only ever undercounts by under a minute, never overcounts. Clamped at 0
// so a stale `target` in the past (there shouldn't be one, by
// construction of getNextPrayer) can never show a negative countdown.
export function getRemainingTime(target: Date, now: Date): RemainingTime {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(totalMs / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
