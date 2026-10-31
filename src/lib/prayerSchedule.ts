// The upcoming prayer times of the place the app shows — the ONE source
// for everything scheduled around prayers (prayer notifications, the Audio
// Adhkar adhan pause). Same location (manual city, else the last detected
// one, else the Kuwait fallback the app displays) and the same calculation
// (calculatePrayerDay: the location's automatic profile and rounding) as
// the Prayer Times card — never a second, independent computation.
import { calculatePrayerDay, REMINDER_PRAYER_ORDER } from "./prayerTimes";
import type { PrayerLocation, ReminderPrayerKey } from "./prayerTimes";
import { KUWAIT_FALLBACK_LOCATION, resolveKnownLocationRecord } from "./locationSettings";
import type { ActiveLocationRecord } from "./locationSettings";
import { addDays, localDateIn, resolveLocationCountry, resolveLocationTimezone, zonedInstant } from "./locationTime";
import { loadAdhanDayTimes } from "./weeklySchedule";
import type { AdhanDayPrayer } from "./weeklySchedule";
import { startTimeToMinutes } from "./eveningAudioSettings";

function toPrayerLocation(record: ActiveLocationRecord): PrayerLocation {
  return {
    coordinates: { latitude: record.latitude, longitude: record.longitude },
    timezone: resolveLocationTimezone(record),
    country: resolveLocationCountry(record),
  };
}

/** The location whose prayer times the app shows (the Kuwait fallback until one is known). */
export function currentPrayerLocation(): PrayerLocation {
  return toPrayerLocation(resolveKnownLocationRecord() ?? KUWAIT_FALLBACK_LOCATION);
}

/** The user's own location — null while none has been chosen or detected yet. */
export function knownPrayerLocation(): PrayerLocation | null {
  const record = resolveKnownLocationRecord();
  return record ? toPrayerLocation(record) : null;
}

export interface UpcomingPrayer {
  prayer: ReminderPrayerKey;
  /** The adhan time, epoch millis. */
  at: number;
}

/**
 * Fajr, Dhuhr, Asr, Maghrib and Isha (no Shuruq — it has no adhan) from
 * yesterday's (a late Isha) through `days` days ahead, in time order.
 */
export function upcomingPrayerTimes(now: Date, location: PrayerLocation, days: number): UpcomingPrayer[] {
  const today = localDateIn(now, location.timezone);
  const out: UpcomingPrayer[] = [];
  for (let offset = -1; offset <= days; offset++) {
    const { times } = calculatePrayerDay(location, addDays(today, offset));
    for (const prayer of REMINDER_PRAYER_ORDER) {
      const at = times[prayer].getTime();
      if (Number.isFinite(at)) out.push({ prayer, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export interface UpcomingAdhan extends UpcomingPrayer {
  /** The prayer time itself — the alert's identity (native posts each prayer once, by this). */
  prayerAt: number;
}

/**
 * The prayer alerts' times: each prayer's time, or — on a weekday where
 * the user set a later Adhan time for that prayer — that time, when it
 * falls at or after the prayer time and before the next prayer (a delay
 * only: never earlier than the time, never into the next prayer's).
 */
export function upcomingAdhanTimes(
  now: Date,
  location: PrayerLocation,
  days: number,
  dayTimes: Record<AdhanDayPrayer, string[]> = loadAdhanDayTimes(),
): UpcomingAdhan[] {
  const prayers = upcomingPrayerTimes(now, location, days);
  return prayers.map(({ prayer, at }, i) => {
    const next = prayers[i + 1]?.at;
    const date = localDateIn(new Date(at), location.timezone);
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    const minutes = startTimeToMinutes(dayTimes[prayer]?.[weekday] ?? "");
    const delayed = minutes >= 0 ? zonedInstant(date, minutes, location.timezone) : NaN;
    const usable = delayed >= at && next !== undefined && delayed < next;
    return { prayer, at: usable ? delayed : at, prayerAt: at };
  });
}
