// DITHAR — Date & Time foundation. The ONE place that turns the device's
// own system clock + IANA timezone (never a network time API) into
// everything the rest of the app needs from "now": a formatted Gregorian
// date, a dynamically-converted Hijri date, a formatted local time, the
// device's timezone, and a stable LOCAL-calendar-day key for daily
// content (today: Lataif/Hadith rotation — see dateKeyToDayNumber's own
// doc comment; later: Ramadan/Eid/Ashura/reminders and other date-based
// features, none of which are built here).
//
// Hijri conversion deliberately uses the JS engine's own built-in ICU
// Islamic (Umm al-Qura) calendar via Intl — no hijri-date/moment-hijri
// package was added. The project has no date library of any kind (see
// package.json); Intl's `islamic-umalqura` calendar is already bundled
// with every modern browser/WebView (the same ICU data source used for
// Hijri dates across the Gulf region), so reusing it beats introducing a
// new dependency and a second, hand-maintained conversion table.
import type { Language } from "../theme/LanguageContext";

export interface GregorianDateInfo {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: string;
  /** Fully formatted, locale-correct line, e.g. "Saturday, September 13, 2026" / "السبت، 13 سبتمبر 2026". */
  formatted: string;
}

export interface HijriDateInfo {
  year: number;
  month: string;
  day: number;
  era: string;
  /** Fully formatted line, e.g. "21 Rabiʻ I 1448 AH" / "21 ربيع الأول 1448 هـ". */
  formatted: string;
}

export interface DateTimeInfo {
  gregorianDate: GregorianDateInfo;
  hijriDate: HijriDateInfo;
  /** "HH:MM AM/PM" (or its Arabic ص/م equivalent), device-locale formatted. */
  localTime: string;
  /** The device's own IANA timezone, e.g. "Asia/Kuwait" — read live from the OS via Intl, never hard-coded. */
  timezone: string;
  /** Stable local-calendar-day key, "YYYY-MM-DD" — see getLocalDateKey. */
  dateKey: string;
  /** The raw `Date` this info was derived from — downstream date-dependent
   *  features (e.g. Prayer Times' astronomical calculation, which needs a
   *  real Date, not just the formatted strings above) should read this
   *  rather than calling `new Date()` again themselves, so every "today"
   *  in the app traces back to this one foundation. */
  date: Date;
}

// Latin numerals in Arabic date/time text — matches the existing
// convention already used elsewhere in the app (SettingsScreen's own
// date formatting, Prayer Times' "04:03") rather than Arabic-Indic
// digits, so this strip's numerals read consistently with the rest of
// the UI.
function arabicLatinDigitsLocale(): string {
  return "ar-u-nu-latn";
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// The device's own LOCAL calendar day — deliberately built from
// getFullYear/getMonth/getDate (local getters), never getUTC*/
// toISOString (which would silently shift to the UTC day, wrong by up to
// a day on either side of local midnight for any timezone that isn't
// exactly UTC+0).
export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Turns a "YYYY-MM-DD" local dateKey into a stable integer that increases
// by exactly 1 for every consecutive local calendar day — the same role
// the old `Math.floor(Date.now() / 86_400_000)` UTC-epoch-day trick
// played for Lataif/Hadith's daily rotation, but derived from the LOCAL
// date's own Y/M/D fields via Date.UTC (so no timezone/DST arithmetic is
// involved at all) instead of the current instant's raw UTC day — the
// rotation this drives flips at the device's own local midnight, not at
// UTC midnight.
export function dateKeyToDayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function formatGregorian(date: Date, language: Language): GregorianDateInfo {
  const locale = language === "ar" ? arabicLatinDigitsLocale() : "en-US";
  const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const formatter = new Intl.DateTimeFormat(locale, options);

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: getPart(formatter.formatToParts(date), "weekday"),
    formatted: formatter.format(date),
  };
}

// Hijri (Umm al-Qura) conversion via Intl — see this file's own header
// comment for why no external library was added. Falls back to the
// plain "islamic" calendar (still Intl-native, no manual math) if a
// runtime's ICU data doesn't include the umalqura variant, so this can
// never throw and leave the strip without a Hijri date.
function hijriLocale(language: Language, calendar: "islamic-umalqura" | "islamic"): string {
  return language === "ar" ? `ar-u-ca-${calendar}-nu-latn` : `en-u-ca-${calendar}`;
}

function formatHijri(date: Date, language: Language): HijriDateInfo {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", era: "short" };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat(hijriLocale(language, "islamic-umalqura"), options).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat(hijriLocale(language, "islamic"), options).formatToParts(date);
  }

  const day = Number(getPart(parts, "day"));
  const month = getPart(parts, "month");
  const year = Number(getPart(parts, "year"));
  const era = getPart(parts, "era");

  // Composed in day-month-year-era order deliberately (rather than
  // whatever order a full formatted string from the locale would use) so
  // Arabic and English read in the same structure — the conventional way
  // a Hijri date is written in both languages, e.g. "21 ربيع الأول 1448
  // هـ" / "21 Rabiʻ I 1448 AH".
  return { year, month, day, era, formatted: `${day} ${month} ${year} ${era}` };
}

function formatLocalTime(date: Date, language: Language): string {
  const locale = language === "ar" ? arabicLatinDigitsLocale() : "en-US";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
}

// The single entry point every consumer (the Date & Time strip today,
// future daily-content/religious-occasion logic later) should call —
// never re-derive Gregorian/Hijri/time formatting independently.
export function getDateTimeInfo(date: Date, language: Language): DateTimeInfo {
  return {
    gregorianDate: formatGregorian(date, language),
    hijriDate: formatHijri(date, language),
    localTime: formatLocalTime(date, language),
    timezone: getDeviceTimeZone(),
    dateKey: getLocalDateKey(date),
    date,
  };
}
