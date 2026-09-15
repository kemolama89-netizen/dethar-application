// DITHAR — Prayer Times calculation engine.
//
// Real astronomical calculation via adhan.js (the standard, maintained
// library for this — see package.json), replacing the original Phase-1
// placeholder: six hardcoded strings in src/data/content.ts that never
// changed for date, season, or location (see that file's git history).
//
// GENERALIZED (global hybrid architecture, Step 2): `calculatePrayerTimes`
// takes a caller-supplied adhan `CalculationParameters` — method AND
// madhab are entirely the CALLER's choice, never hardcoded in here. Today
// there is exactly one caller (PrayerTimesPanel.tsx), and it still
// explicitly constructs `CalculationMethod.Kuwait()` + `Madhab.Shafi` —
// so Kuwait's calculated output is UNCHANGED, just moved from being an
// internal constant to an explicit argument. A later step (the
// location→country→method resolver — see calculationMethods.ts /
// countryCalculationMethod.ts, already built but not yet wired in) will
// make that caller choose dynamically instead.
//
// Coordinates are a caller-supplied Coordinates value (see
// useCoordinates.ts for how the app obtains them — device geolocation
// with a Kuwait City fallback) — this module has no opinion on where they
// came from, and never guesses coordinates from timezone. `date` should
// be the LOCAL calendar date from the app's existing Date & Time
// foundation (src/lib/dateTime.ts) — adhan reads only the date's local
// Y/M/D fields, so any Date instance representing the correct local day
// works.
import {
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  PolarCircleResolution,
  PrayerTimes as AdhanPrayerTimes,
} from "adhan";
import type { CalculationParameters } from "adhan";
import type { PrayerKey } from "../data/content";

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

// Local calendar day + 1 — for computing tomorrow's Fajr (see
// nextPrayer.ts's after-Isha wraparound case). Built from local
// getters/constructor args (never UTC), consistent with
// src/lib/dateTime.ts's own "local, never UTC" rule; JS's Date
// constructor correctly rolls the month/year over on its own (e.g. Dec 31
// + 1 day -> Jan 1 of the next year), so no manual calendar math is
// needed here.
export function addOneLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

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
