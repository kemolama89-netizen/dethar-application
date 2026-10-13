// DITHAR — Prayer Times calculation engine.
//
// Real astronomical calculation via adhan.js, run entirely on the device.
// `calculatePrayerDay` is the app's entry point: given a location
// (coordinates + its own IANA timezone + country) and that location's
// calendar day, it picks the location's calculation profile automatically
// (calculationProfiles.ts), applies the profile's Ramadan rule and
// rounding, and returns the day's six times as absolute instants.
// `calculatePrayerTimes` is the lower-level adhan call it builds on.
//
// Coordinates come from useCoordinates.ts; this module never guesses them
// from a timezone. The calendar day must be the LOCATION's (see
// locationTime.ts), never the device's.
import {
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  PolarCircleResolution,
  PrayerTimes as AdhanPrayerTimes,
  Rounding,
} from "adhan";
import type { CalculationParameters } from "adhan";
import type { PrayerKey } from "../data/content";
import { resolveCalculationProfile } from "./calculationProfiles";
import type { CalculationProfile, RoundingRule } from "./calculationProfiles";
import { addDays, hijriMonthOf, toAdhanDate } from "./locationTime";
import type { LocalDate } from "./locationTime";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Kuwait City — used only as the fallback when device geolocation is
// unavailable or denied (see useCoordinates.ts), matching the app's
// existing "الكويت"/"Kuwait" city label, which previously had no
// coordinates attached to it at all.
export const KUWAIT_CITY_COORDINATES: Coordinates = { latitude: 29.3759, longitude: 47.9774 };

// Paired with the fallback above — Kuwait's own fixed IANA zone (UTC+3,
// no DST), used to FORMAT its calculated times. This must NOT be the
// device's own reported timezone: when there's no real location fix, the
// device could physically be anywhere (this exact mismatch was caught
// during testing — a dev container reporting UTC while calculating for
// Kuwait's coordinates produced times off by exactly the UTC+3 gap). Once
// a real device geolocation fix lands, the device's own OS timezone
// becomes the right choice again (a phone's OS timezone already tracks
// its physical location) — see useCoordinates.ts for exactly where each
// applies.
export const KUWAIT_TIMEZONE = "Asia/Kuwait";

export type PrayerTimesResult = Record<PrayerKey, Date>;

// The five ACTUAL prayers, in chronological order, excluding Sunrise
// (shuruq) — Sunrise is a solar marker this card displays, not something
// to remind for or count down to as "the next prayer". Shared by
// usePrayerReminder.ts (which prayer to notify for) and nextPrayer.ts
// (which prayer is "next") so both stay in exact agreement about what
// counts as a prayer, rather than each hand-rolling its own list.
export type ReminderPrayerKey = Exclude<PrayerKey, "shuruq">;
export const REMINDER_PRAYER_ORDER: readonly ReminderPrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

// `params` is the caller's fully-built adhan CalculationParameters —
// method and madhab are entirely its choice; this function has no opinion
// on either. It DOES mutate `params.highLatitudeRule`/
// `.polarCircleResolution` in place before use (a safety net applied
// identically regardless of which method/madhab was chosen — see below),
// so pass a freshly-constructed instance per call rather than one shared/
// reused across multiple calculatePrayerTimes calls.
//
// The high-latitude/polar safety net:
//   - `HighLatitudeRule.recommended(coordinates)` is adhan's OWN built-in
//     recommendation (never a custom formula here). It only changes
//     anything once the ordinary angle-based Fajr/Isha calculation has
//     already failed or produced an unreasonable time — verified by
//     reading adhan's own PrayerTimes.js: `nightPortions()` (which reads
//     `highLatitudeRule`) is called only inside that fallback branch. For
//     Kuwait (29.37°N — well under adhan's own 48° threshold) this
//     resolves to `MiddleOfTheNight`, IDENTICAL to adhan's unset default,
//     so Kuwait's output is provably unaffected — verified in
//     prayerTimes.test.ts.
//   - `PolarCircleResolution.AqrabBalad` ("nearest latitude with a valid
//     day" — one of adhan's own three documented resolution strategies,
//     never an invented algorithm) only activates when sunrise/sunset
//     genuinely cannot be computed at all (true polar day/night).
//     Leaving this on adhan's own unset default, `Unresolved`, produces
//     INVALID (NaN) Date objects in that case instead — a real bug this
//     closes. AqrabBalad is exposed here as the default, overridable
//     behavior, never claimed as the one universally agreed scholarly
//     answer for extreme high-latitude locations.
export function calculatePrayerTimes(date: Date, coordinates: Coordinates, params: CalculationParameters): PrayerTimesResult {
  const adhanCoordinates = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
  params.highLatitudeRule = HighLatitudeRule.recommended(adhanCoordinates);
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad;

  const times = new AdhanPrayerTimes(adhanCoordinates, date, params);

  return {
    fajr: times.fajr,
    shuruq: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

/** A place to calculate for: where it is, the IANA zone it lives in, and (when known) its country. */
export interface PrayerLocation {
  coordinates: Coordinates;
  timezone: string;
  /** ISO 3166-1 alpha-2; when unknown the timezone's country is used. */
  country?: string;
}

export interface PrayerDay {
  /** The location's own calendar day these times belong to. */
  localDate: LocalDate;
  times: PrayerTimesResult;
  /** Tomorrow's Fajr at the same location — the "next prayer" after Isha. */
  tomorrowFajr: Date;
  profile: CalculationProfile;
  /** True when the profile's Ramadan Isha rule was applied for this day. */
  ramadanRuleApplied: boolean;
}

const MINUTE_MS = 60_000;

// Rounds one unrounded engine time per the profile's rule (see
// RoundingRule). adhan's own rounding is switched off for every profile so
// this is the only rounding step — which also avoids adhan's Rounding.Up
// adding a whole minute to a time already exactly on the minute.
function roundTime(time: Date, rule: RoundingRule, key: PrayerKey): Date {
  const ms = time.getTime();
  if (Number.isNaN(ms)) return time;
  const floor = Math.floor(ms / MINUTE_MS) * MINUTE_MS;
  const ceil = ms === floor ? floor : floor + MINUTE_MS;
  if (rule === "up") return new Date(ceil);
  if (rule === "conservative") return new Date(key === "shuruq" ? floor : ceil);
  return new Date(ms - floor >= 30_000 ? floor + MINUTE_MS : floor);
}

function calculateRoundedDay(location: PrayerLocation, localDate: LocalDate, profile: CalculationProfile): { times: PrayerTimesResult; ramadanRuleApplied: boolean } {
  const params = profile.build();
  params.rounding = Rounding.None;
  // A Ramadan rule only ever replaces an interval-based Isha (Umm al-Qura's
  // 90 → 120 min), judged by the location's own day in the Umm al-Qura calendar.
  const ramadanRuleApplied = profile.ramadanIshaIntervalMinutes !== undefined && params.ishaInterval > 0 && hijriMonthOf(localDate) === 9;
  if (ramadanRuleApplied) params.ishaInterval = profile.ramadanIshaIntervalMinutes!;
  const raw = calculatePrayerTimes(toAdhanDate(localDate), location.coordinates, params);
  const times = Object.fromEntries((Object.keys(raw) as PrayerKey[]).map((key) => [key, roundTime(raw[key], profile.rounding, key)])) as PrayerTimesResult;
  return { times, ramadanRuleApplied };
}

// The whole prayer day for a location: its profile is chosen automatically
// from `location.country` (else its timezone's country, else the global
// fallback) — there is no override of any kind.
export function calculatePrayerDay(location: PrayerLocation, localDate: LocalDate): PrayerDay {
  const profile = resolveCalculationProfile(location);
  const today = calculateRoundedDay(location, localDate, profile);
  const tomorrow = calculateRoundedDay(location, addDays(localDate, 1), profile);
  return { localDate, times: today.times, tomorrowFajr: tomorrow.times.fajr, profile, ramadanRuleApplied: today.ramadanRuleApplied };
}

// Renders an absolute instant (a Date from calculatePrayerTimes) as a
// plain zero-padded 24-hour "HH:MM" in the given IANA timezone — always
// ASCII digits, matching the existing "04:03"/"19:22" style (the Prayer
// Times value span already forces `direction: ltr` for this reason; see
// PrayerTimesPanel.tsx) regardless of interface language. `timezone` is
// for DISPLAY formatting only — converting the already-correct computed
// instant into the right wall-clock reading — never used to derive or
// substitute for the geographic coordinates the calculation itself needs.
export function formatPrayerTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}
