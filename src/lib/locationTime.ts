// DITHAR — the prayer location's own calendar date and timezone.
//
// Prayer times belong to the LOCATION being calculated for, not to the
// device: a phone in Kuwait showing a manually-picked New York must use
// New York's calendar day (it is still "yesterday" there for 7-8 hours of
// every Kuwaiti day) and New York's clock. This module is the one place
// that turns an absolute instant into that location-local day, and that
// decides which IANA zone a location record really lives in.
//
// adhan-js reads only the Y/M/D of the Date it is given (via the runtime's
// local getters — see node_modules/adhan/lib/esm/PrayerTimes.js) and
// returns absolute instants, so the device's own timezone never leaks into
// the calculation as long as the Y/M/D handed to it are the location's.
import { countryForTimezone, nearestZoneInCountry, zonesForCountry } from "../data/timezoneCountries";
import { countryAtCoordinates } from "./reverseGeocode";

/** A calendar day, independent of any timezone. `month` is 1-12. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export function isValidTimeZone(timezone: string | undefined): timezone is string {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day it is at `instant` in `timezone` (UTC for an unusable zone). */
export function localDateIn(instant: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: isValidTimeZone(timezone) ? timezone : "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Calendar arithmetic on a LocalDate (month/year roll over correctly). */
export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** "YYYY-MM-DD" — a stable key for memoizing per location-day. */
export function localDateKey(date: LocalDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

// The Date adhan-js should be given for `date`. adhan reads the device-local
// Y/M/D fields, so build it from them — at NOON, never midnight: a few
// zones start DST at local midnight, where a midnight Date would not exist
// and the engine would silently roll it into the next hour of the same day
// (harmless today) — noon is never inside any DST gap.
export function toAdhanDate(date: LocalDate): Date {
  return new Date(date.year, date.month - 1, date.day, 12);
}

// The Umm al-Qura Hijri month (1-12) of a calendar day — from the JS
// engine's built-in ICU `islamic-umalqura` calendar (the same source
// dateTime.ts already uses for the displayed Hijri date). Verified against
// the Umm al-Qura Calendar's own API: Ramadan 1447 = 2026-02-18..03-19 in
// both. `undefined` when the engine lacks that calendar: Intl then silently
// formats in the Gregorian calendar, whose "month 9" is September — never
// mistaken for Ramadan.
export function hijriMonthOf(date: LocalDate): number | undefined {
  const format = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "UTC", month: "numeric" });
  if (format.resolvedOptions().calendar !== "islamic-umalqura") return undefined;
  const month = Number(format.formatToParts(new Date(Date.UTC(date.year, date.month - 1, date.day, 12))).find((p) => p.type === "month")?.value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined;
}

interface LocationRecordLike {
  source: "device" | "manual" | "fallback";
  timezone: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

// The zone's current UTC offset in hours (e.g. 5.5 for Asia/Kolkata), or
// undefined for an unusable zone.
function utcOffsetHours(timezone: string, at: Date): number | undefined {
  if (!isValidTimeZone(timezone)) return undefined;
  const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  const match = name?.match(/^GMT(?:([+-])(\d{2}):(\d{2}))?$/);
  if (!match) return undefined;
  return match[1] ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) + Number(match[3]) / 60) : 0;
}

// Every inhabited place's legal zone is within ~3 h of its solar offset
// (longitude / 15; e.g. western China ≈ 2.9 h, western Spain in summer ≈
// 2.6 h). A device zone further off than this cannot be where the fix is —
// typically a traveller whose phone kept its home zone.
const MAX_PLAUSIBLE_ZONE_DRIFT_HOURS = 3.5;

// Whether a device zone can stand in for the GPS fix's country when the
// fix itself is on no country's territory (at sea): it must name a country
// and fit the fix's longitude (a traveller's far-away home zone does not).
function deviceZoneIsTrustworthy(record: LocationRecordLike, at: Date): boolean {
  if (!countryForTimezone(record.timezone)) return false; // "UTC", "Etc/…", unknown, invalid
  const offset = utcOffsetHours(record.timezone, at);
  if (offset === undefined) return false;
  const drift = ((((offset - record.longitude / 15) % 24) + 36) % 24) - 12; // wrapped to -12..12
  return Math.abs(drift) <= MAX_PLAUSIBLE_ZONE_DRIFT_HOURS;
}

// The country a location record's prayer times are calculated for (and
// labelled with). A manual city and the Kuwait fallback keep their own.
// For a device GPS fix the COORDINATES decide: the country whose borders
// contain the fix (reverseGeocode.ts) — however far from any bundled city,
// whatever zone the phone is set to. Only for a fix on no country's
// territory (at sea) does the stored estimate (nearest bundled city) apply,
// replaced by the device zone's country when that zone is trustworthy;
// with neither it stays undefined (the profile is then still chosen from
// the zone — see calculationProfiles.ts — but the displayed place is never
// guessed).
export function resolveLocationCountry(record: LocationRecordLike, at: Date = new Date()): string | undefined {
  if (record.source !== "device") return record.countryCode;
  const fromBorders = countryAtCoordinates({ latitude: record.latitude, longitude: record.longitude });
  if (fromBorders) return fromBorders;
  if (!record.countryCode) return undefined;
  return deviceZoneIsTrustworthy(record, at) ? countryForTimezone(record.timezone) : record.countryCode;
}

// Which IANA zone a location record's prayer times are shown in.
//
// A manually-picked city and the Kuwait fallback carry their own fixed,
// correct zone. A device fix keeps the device zone whenever that zone
// belongs to the fix's country (resolveLocationCountry) — it is the only
// signal that knows WHICH zone inside a multi-zone country. Otherwise
// (no usable zone: "UTC" on an emulator, an invalid id, or a traveller's
// home zone) the country's own zone is used:
//   - its single zone, when it has exactly one; else
//   - the zone whose tzdata reference point (zone.tab) is nearest the fix;
//   - with no country at all, the device zone stands (never a guess).
export function resolveLocationTimezone(record: LocationRecordLike, at: Date = new Date()): string {
  if (record.source !== "device") return record.timezone;
  const country = resolveLocationCountry(record, at)?.toUpperCase();
  if (!country || countryForTimezone(record.timezone) === country) return record.timezone;
  const zones = zonesForCountry(country);
  if (zones.length === 1) return zones[0];
  return nearestZoneInCountry(country, record.latitude, record.longitude) ?? record.timezone;
}
