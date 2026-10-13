// The automatic calculation-profile system: which profile each place gets,
// how honestly each is labelled, and that it calculates correctly for
// representative locations worldwide — through the app's real entry point
// (calculatePrayerDay). Official-table accuracy is covered separately in
// calculationProfiles.reference.test.ts.
import { describe, expect, it } from "vitest";
import { Madhab } from "adhan";
import { CALCULATION_PROFILES, COUNTRY_PROFILE, FALLBACK_PROFILE_ID, resolveCalculationProfile } from "./calculationProfiles";
import type { CalculationProfileId } from "./calculationProfiles";
import { calculatePrayerDay, formatPrayerTime } from "./prayerTimes";
import type { PrayerLocation } from "./prayerTimes";
import { localDateIn } from "./locationTime";
import type { LocalDate } from "./locationTime";
import type { PrayerKey } from "../data/content";

const ORDER: PrayerKey[] = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"];
const localDayOf = (instant: Date, timezone: string) => localDateIn(instant, timezone);
const minutesOfDay = (instant: Date, timezone: string) => {
  const [h, m] = formatPrayerTime(instant, timezone).split(":").map(Number);
  return h * 60 + m;
};

describe("profile selection — automatic, by country", () => {
  it.each([
    ["EG", "egypt"],
    ["SA", "umm-al-qura"],
    ["TR", "diyanet"],
    ["MY", "jakim"],
    ["ID", "kemenag"],
    ["OM", "oman"],
    ["JO", "jordan"],
    ["KW", "kuwait"],
    ["QA", "qatar"],
    ["AE", "uae"],
  ] as const)("%s → %s", (country, profile) => {
    expect(resolveCalculationProfile({ country }).id).toBe(profile);
    expect(resolveCalculationProfile({ country: country.toLowerCase() }).id).toBe(profile);
  });

  it("an unmapped country, and no country at all, get the Muslim World League fallback", () => {
    expect(resolveCalculationProfile({ country: "FR" }).id).toBe("mwl");
    expect(resolveCalculationProfile({}).id).toBe("mwl");
    expect(FALLBACK_PROFILE_ID).toBe("mwl");
  });

  it("with no country, the location's timezone identifies it (Asia/Riyadh → Umm al-Qura)", () => {
    expect(resolveCalculationProfile({ timezone: "Asia/Riyadh" }).id).toBe("umm-al-qura");
    expect(resolveCalculationProfile({ timezone: "Asia/Muscat" }).id).toBe("oman");
    expect(resolveCalculationProfile({ timezone: "UTC" }).id).toBe("mwl");
  });

  it("an explicit country wins over the timezone (a Saudi city shown in another zone stays Saudi)", () => {
    expect(resolveCalculationProfile({ country: "SA", timezone: "Europe/Istanbul" }).id).toBe("umm-al-qura");
  });

  it("every mapped country points at a real profile", () => {
    for (const id of Object.values(COUNTRY_PROFILE)) expect(CALCULATION_PROFILES[id]).toBeDefined();
  });
});

describe("profile contents — documented methodology only, labelled honestly", () => {
  const build = (id: CalculationProfileId) => CALCULATION_PROFILES[id].build();

  it("Turkey uses the STANDARD Asr (Diyanet), never Hanafi", () => {
    expect(build("diyanet").madhab).toBe(Madhab.Shafi);
  });

  it("only the South Asian profile uses the Hanafi Asr", () => {
    for (const id of Object.keys(CALCULATION_PROFILES) as CalculationProfileId[]) {
      expect(build(id).madhab, id).toBe(id === "karachi-hanafi" ? Madhab.Hanafi : Madhab.Shafi);
    }
  });

  it("Diyanet's documented temkin: sunrise −7, Dhuhr +5, Asr +4, Maghrib +7, Fajr/Isha 0; 18°/17°", () => {
    const p = build("diyanet");
    expect([p.fajrAngle, p.ishaAngle]).toEqual([18, 17]);
    expect(p.methodAdjustments).toEqual({ fajr: 0, sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7, isha: 0 });
  });

  it("Egypt: 19.5°/17.5°, Dhuhr at true noon (no +1)", () => {
    const p = build("egypt");
    expect([p.fajrAngle, p.ishaAngle, p.methodAdjustments.dhuhr]).toEqual([19.5, 17.5, 0]);
  });

  it("Malaysia is NOT the Singapore approximation: Subuh 18° (MKI 2019), Isyak 18°, +2 min ihtiyati", () => {
    const p = build("jakim");
    expect([p.fajrAngle, p.ishaAngle]).toEqual([18, 18]);
    expect(p.methodAdjustments).toEqual({ fajr: 2, sunrise: 0, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 });
    expect(resolveCalculationProfile({ country: "MY" }).id).not.toBe("muis");
  });

  it("Indonesia is NOT the Singapore approximation: Kemenag 20°/18° with its published ±2 min ihtiyati", () => {
    const p = build("kemenag");
    expect([p.fajrAngle, p.ishaAngle]).toEqual([20, 18]);
    expect(p.methodAdjustments).toEqual({ fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 });
    expect(resolveCalculationProfile({ country: "ID" }).id).not.toBe("muis");
  });

  it("Umm al-Qura: 18.5°, Isha 90 min, 120 min in Ramadan", () => {
    const p = build("umm-al-qura");
    expect([p.fajrAngle, p.ishaInterval, CALCULATION_PROFILES["umm-al-qura"].ramadanIshaIntervalMinutes]).toEqual([18.5, 90, 120]);
  });

  it("only Umm al-Qura has a Ramadan rule (none is documented for Qatar or anywhere else)", () => {
    const withRule = Object.values(CALCULATION_PROFILES).filter((p) => p.ramadanIshaIntervalMinutes !== undefined).map((p) => p.id);
    expect(withRule).toEqual(["umm-al-qura"]);
  });

  it("Oman and Jordan are labelled as DERIVED from official tables, never as documented", () => {
    for (const id of ["oman", "jordan"] as const) {
      expect(CALCULATION_PROFILES[id].evidence).toBe("official-tables-derived");
      expect(CALCULATION_PROFILES[id].derived.length).toBeGreaterThan(0);
    }
  });

  it("Jordan does not apply the unverified sunrise/Maghrib margins seen in its 2025 table", () => {
    expect(build("jordan").methodAdjustments).toEqual({ fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  });

  it("Kuwait, Qatar and UAE are recognized conventions, explicitly unverified — no invented corrections", () => {
    for (const id of ["kuwait", "qatar", "uae"] as const) {
      expect(CALCULATION_PROFILES[id].evidence).toBe("recognized-convention");
      expect(CALCULATION_PROFILES[id].authority).toMatch(/unverified/);
    }
  });

  it("no profile carries user-level adjustments — only the authority's own method margins", () => {
    for (const id of Object.keys(CALCULATION_PROFILES) as CalculationProfileId[]) {
      expect(build(id).adjustments, id).toEqual({ fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
    }
  });

  it("build() returns a fresh instance every time (callers mutate it)", () => {
    expect(build("egypt")).not.toBe(build("egypt"));
  });
});

describe("Kuwait, Qatar, UAE — unchanged recognized conventions (pinned 2026-10-03)", () => {
  it.each([
    ["Kuwait City", { latitude: 29.3759, longitude: 47.9774 }, "Asia/Kuwait", "KW", ["04:23", "05:42", "11:37", "14:59", "17:32", "18:48"]],
    ["Doha", { latitude: 25.2854, longitude: 51.531 }, "Asia/Qatar", "QA", ["04:11", "05:27", "11:23", "14:46", "17:19", "18:49"]],
    ["Abu Dhabi", { latitude: 24.4539, longitude: 54.3773 }, "Asia/Dubai", "AE", ["04:59", "06:12", "12:15", "15:38", "18:11", "19:24"]],
  ] as const)("%s", (_name, coordinates, timezone, country, expected) => {
    const { times } = calculatePrayerDay({ coordinates, timezone, country }, { year: 2026, month: 10, day: 3 });
    expect(ORDER.map((k) => formatPrayerTime(times[k], timezone))).toEqual(expected);
  });
});

describe("Ramadan — Umm al-Qura's documented Isha rule, automatic", () => {
  const riyadh: PrayerLocation = { coordinates: { latitude: 24.7136, longitude: 46.6753 }, timezone: "Asia/Riyadh", country: "SA" };
  const ishaGap = (location: PrayerLocation, date: LocalDate) => {
    const { times, ramadanRuleApplied } = calculatePrayerDay(location, date);
    return { gap: (times.isha.getTime() - times.maghrib.getTime()) / 60_000, ramadanRuleApplied };
  };

  it("Isha is Maghrib + 120 min from 1 Ramadan 1447 (2026-02-18) to 30 Ramadan (2026-03-19)", () => {
    for (const date of [{ year: 2026, month: 2, day: 18 }, { year: 2026, month: 3, day: 5 }, { year: 2026, month: 3, day: 19 }]) {
      expect(ishaGap(riyadh, date)).toEqual({ gap: 120, ramadanRuleApplied: true });
    }
  });

  it("and Maghrib + 90 min on the days just outside Ramadan", () => {
    for (const date of [{ year: 2026, month: 2, day: 17 }, { year: 2026, month: 3, day: 20 }]) {
      expect(ishaGap(riyadh, date)).toEqual({ gap: 90, ramadanRuleApplied: false });
    }
  });

  it("is never applied outside Saudi Arabia (Qatar's 90-min Isha is unchanged in Ramadan)", () => {
    const doha: PrayerLocation = { coordinates: { latitude: 25.2854, longitude: 51.531 }, timezone: "Asia/Qatar", country: "QA" };
    expect(ishaGap(doha, { year: 2026, month: 3, day: 5 })).toEqual({ gap: 90, ramadanRuleApplied: false });
  });
});

describe("rounding — whole minutes, per the profile's rule", () => {
  it("every displayed time is exactly on a minute", () => {
    for (const country of ["EG", "SA", "TR", "MY", "ID", "OM", "SG"]) {
      const { times } = calculatePrayerDay({ coordinates: { latitude: 21.4, longitude: 39.8 }, timezone: "UTC", country }, { year: 2026, month: 6, day: 1 });
      for (const key of ORDER) expect(times[key].getTime() % 60_000, `${country} ${key}`).toBe(0);
    }
  });
});

// Representative places on every continent. For each: the expected profile,
// six valid times in order, Dhuhr near the location's own solar noon on its
// own clock, and every time on the location's own calendar day.
const WORLD: Array<{ name: string; location: PrayerLocation; profile: CalculationProfileId }> = [
  { name: "London (Europe)", location: { coordinates: { latitude: 51.5072, longitude: -0.1276 }, timezone: "Europe/London", country: "GB" }, profile: "moonsighting" },
  { name: "Paris (Europe)", location: { coordinates: { latitude: 48.8566, longitude: 2.3522 }, timezone: "Europe/Paris", country: "FR" }, profile: "mwl" },
  { name: "Berlin (Europe)", location: { coordinates: { latitude: 52.52, longitude: 13.405 }, timezone: "Europe/Berlin", country: "DE" }, profile: "mwl" },
  { name: "Sarajevo (Europe)", location: { coordinates: { latitude: 43.8563, longitude: 18.4131 }, timezone: "Europe/Sarajevo", country: "BA" }, profile: "mwl" },
  { name: "New York (North America)", location: { coordinates: { latitude: 40.7128, longitude: -74.006 }, timezone: "America/New_York", country: "US" }, profile: "isna" },
  { name: "Los Angeles (North America)", location: { coordinates: { latitude: 34.0522, longitude: -118.2437 }, timezone: "America/Los_Angeles", country: "US" }, profile: "isna" },
  { name: "Toronto (North America)", location: { coordinates: { latitude: 43.6532, longitude: -79.3832 }, timezone: "America/Toronto", country: "CA" }, profile: "isna" },
  { name: "São Paulo (South America)", location: { coordinates: { latitude: -23.5505, longitude: -46.6333 }, timezone: "America/Sao_Paulo", country: "BR" }, profile: "mwl" },
  { name: "Buenos Aires (South America)", location: { coordinates: { latitude: -34.6037, longitude: -58.3816 }, timezone: "America/Argentina/Buenos_Aires", country: "AR" }, profile: "mwl" },
  { name: "Lagos (Africa)", location: { coordinates: { latitude: 6.5244, longitude: 3.3792 }, timezone: "Africa/Lagos", country: "NG" }, profile: "mwl" },
  { name: "Nairobi (Africa)", location: { coordinates: { latitude: -1.2921, longitude: 36.8219 }, timezone: "Africa/Nairobi", country: "KE" }, profile: "mwl" },
  { name: "Casablanca (Africa)", location: { coordinates: { latitude: 33.5731, longitude: -7.5898 }, timezone: "Africa/Casablanca", country: "MA" }, profile: "mwl" },
  { name: "Johannesburg (Africa)", location: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, timezone: "Africa/Johannesburg", country: "ZA" }, profile: "mwl" },
  { name: "Cairo (Africa)", location: { coordinates: { latitude: 30.0444, longitude: 31.2357 }, timezone: "Africa/Cairo", country: "EG" }, profile: "egypt" },
  { name: "Karachi (South Asia)", location: { coordinates: { latitude: 24.8607, longitude: 67.0011 }, timezone: "Asia/Karachi", country: "PK" }, profile: "karachi-hanafi" },
  { name: "Delhi (South Asia)", location: { coordinates: { latitude: 28.6139, longitude: 77.209 }, timezone: "Asia/Kolkata", country: "IN" }, profile: "karachi-hanafi" },
  { name: "Dhaka (South Asia)", location: { coordinates: { latitude: 23.8103, longitude: 90.4125 }, timezone: "Asia/Dhaka", country: "BD" }, profile: "karachi-hanafi" },
  { name: "Kuala Lumpur (Southeast Asia)", location: { coordinates: { latitude: 3.139, longitude: 101.6869 }, timezone: "Asia/Kuala_Lumpur", country: "MY" }, profile: "jakim" },
  { name: "Jakarta (Southeast Asia)", location: { coordinates: { latitude: -6.2088, longitude: 106.8456 }, timezone: "Asia/Jakarta", country: "ID" }, profile: "kemenag" },
  { name: "Makassar (Southeast Asia, UTC+8)", location: { coordinates: { latitude: -5.1477, longitude: 119.4327 }, timezone: "Asia/Makassar", country: "ID" }, profile: "kemenag" },
  { name: "Singapore (Southeast Asia)", location: { coordinates: { latitude: 1.3521, longitude: 103.8198 }, timezone: "Asia/Singapore", country: "SG" }, profile: "muis" },
  { name: "Manila (Southeast Asia)", location: { coordinates: { latitude: 14.5995, longitude: 120.9842 }, timezone: "Asia/Manila", country: "PH" }, profile: "mwl" },
  { name: "Sydney (Australia)", location: { coordinates: { latitude: -33.8688, longitude: 151.2093 }, timezone: "Australia/Sydney", country: "AU" }, profile: "mwl" },
  { name: "Perth (Australia)", location: { coordinates: { latitude: -31.9505, longitude: 115.8605 }, timezone: "Australia/Perth", country: "AU" }, profile: "mwl" },
  { name: "Auckland (Oceania, UTC+12/13)", location: { coordinates: { latitude: -36.8485, longitude: 174.7633 }, timezone: "Pacific/Auckland", country: "NZ" }, profile: "mwl" },
  { name: "Honolulu (UTC−10)", location: { coordinates: { latitude: 21.3069, longitude: -157.8583 }, timezone: "Pacific/Honolulu", country: "US" }, profile: "isna" },
  { name: "Tehran (Middle East)", location: { coordinates: { latitude: 35.6892, longitude: 51.389 }, timezone: "Asia/Tehran", country: "IR" }, profile: "tehran" },
];

const DATES: LocalDate[] = [
  { year: 2026, month: 1, day: 15 },
  { year: 2026, month: 3, day: 20 },
  { year: 2026, month: 6, day: 21 },
  { year: 2026, month: 10, day: 3 },
  { year: 2026, month: 12, day: 21 },
];

describe("worldwide — every region gets an automatic profile and sane local times", () => {
  for (const { name, location, profile } of WORLD) {
    it(`${name} → ${profile}: valid, ordered, on the location's own day, Dhuhr near local solar noon`, () => {
      for (const date of DATES) {
        const day = calculatePrayerDay(location, date);
        expect(day.profile.id).toBe(profile);
        const instants = ORDER.map((k) => day.times[k].getTime());
        for (const t of instants) expect(Number.isNaN(t)).toBe(false);
        for (let i = 1; i < instants.length; i++) expect(instants[i], `${name} ${ORDER[i]}`).toBeGreaterThan(instants[i - 1]);
        for (const key of ["fajr", "shuruq", "dhuhr", "asr", "maghrib"] as PrayerKey[]) {
          expect(localDayOf(day.times[key], location.timezone), `${name} ${key}`).toEqual(date);
        }
        // Solar noon on the location's clock is within ~1.5 h of 12:00
        // everywhere people live (zone offset + DST + equation of time);
        // a wrong day or wrong zone would be hours off.
        const dhuhr = minutesOfDay(day.times.dhuhr, location.timezone);
        expect(dhuhr, name).toBeGreaterThan(10 * 60 + 30);
        expect(dhuhr, name).toBeLessThan(14 * 60);
      }
    });
  }
});

describe("high latitudes — always valid times, never NaN", () => {
  const places: Array<[string, PrayerLocation]> = [
    ["Oslo 59.9°N", { coordinates: { latitude: 59.9139, longitude: 10.7522 }, timezone: "Europe/Oslo", country: "NO" }],
    ["Helsinki 60.2°N", { coordinates: { latitude: 60.1699, longitude: 24.9384 }, timezone: "Europe/Helsinki", country: "FI" }],
    ["Reykjavik 64.1°N", { coordinates: { latitude: 64.1466, longitude: -21.9426 }, timezone: "Atlantic/Reykjavik", country: "IS" }],
    ["Tromsø 69.6°N (midnight sun / polar night)", { coordinates: { latitude: 69.6492, longitude: 18.9553 }, timezone: "Europe/Oslo", country: "NO" }],
    ["Longyearbyen 78.2°N", { coordinates: { latitude: 78.2232, longitude: 15.6267 }, timezone: "Arctic/Longyearbyen", country: "SJ" }],
    ["Edmonton 53.5°N", { coordinates: { latitude: 53.5461, longitude: -113.4938 }, timezone: "America/Edmonton", country: "CA" }],
    ["Ushuaia 54.8°S", { coordinates: { latitude: -54.8019, longitude: -68.303 }, timezone: "America/Argentina/Ushuaia", country: "AR" }],
  ];
  it.each(places)("%s on the solstices and an equinox", (_name, location) => {
    for (const date of [{ year: 2026, month: 6, day: 21 }, { year: 2026, month: 12, day: 21 }, { year: 2026, month: 3, day: 20 }]) {
      const { times, tomorrowFajr } = calculatePrayerDay(location, date);
      for (const key of ORDER) expect(Number.isNaN(times[key].getTime()), key).toBe(false);
      expect(Number.isNaN(tomorrowFajr.getTime())).toBe(false);
      expect(times.fajr.getTime()).toBeLessThan(times.dhuhr.getTime());
      expect(times.dhuhr.getTime()).toBeLessThan(times.isha.getTime());
    }
  });
});

describe("daylight-saving transitions — the clock moves, the sun does not", () => {
  // Across a DST change the displayed Dhuhr jumps by ~1 h, while the real
  // instant moves by ~24 h (± a couple of minutes of solar drift).
  const cases: Array<[string, PrayerLocation, LocalDate, LocalDate]> = [
    ["New York spring forward (2026-03-08)", { coordinates: { latitude: 40.7128, longitude: -74.006 }, timezone: "America/New_York", country: "US" }, { year: 2026, month: 3, day: 7 }, { year: 2026, month: 3, day: 8 }],
    ["New York fall back (2026-11-01)", { coordinates: { latitude: 40.7128, longitude: -74.006 }, timezone: "America/New_York", country: "US" }, { year: 2026, month: 10, day: 31 }, { year: 2026, month: 11, day: 1 }],
    ["London (2026-03-29)", { coordinates: { latitude: 51.5072, longitude: -0.1276 }, timezone: "Europe/London", country: "GB" }, { year: 2026, month: 3, day: 28 }, { year: 2026, month: 3, day: 29 }],
    ["Cairo summer time ends (after 2026-10-29)", { coordinates: { latitude: 30.0444, longitude: 31.2357 }, timezone: "Africa/Cairo", country: "EG" }, { year: 2026, month: 10, day: 29 }, { year: 2026, month: 10, day: 30 }],
    ["Sydney spring forward (2026-10-04)", { coordinates: { latitude: -33.8688, longitude: 151.2093 }, timezone: "Australia/Sydney", country: "AU" }, { year: 2026, month: 10, day: 3 }, { year: 2026, month: 10, day: 4 }],
  ];
  it.each(cases)("%s", (_name, location, before, after) => {
    const a = calculatePrayerDay(location, before).times.dhuhr;
    const b = calculatePrayerDay(location, after).times.dhuhr;
    const clockJump = Math.abs(minutesOfDay(b, location.timezone) - minutesOfDay(a, location.timezone));
    expect(clockJump).toBeGreaterThanOrEqual(58);
    expect(clockJump).toBeLessThanOrEqual(62);
    const realGapMinutes = (b.getTime() - a.getTime()) / 60_000;
    expect(Math.abs(realGapMinutes - 24 * 60)).toBeLessThanOrEqual(2);
  });

  it("Cairo matches the Egyptian Survey Authority on both sides of the summer-time change", () => {
    const cairo: PrayerLocation = { coordinates: { latitude: 30.0444, longitude: 31.2357 }, timezone: "Africa/Cairo", country: "EG" };
    expect(formatPrayerTime(calculatePrayerDay(cairo, { year: 2026, month: 10, day: 29 }).times.dhuhr, cairo.timezone)).toBe("12:39");
    expect(formatPrayerTime(calculatePrayerDay(cairo, { year: 2026, month: 10, day: 30 }).times.dhuhr, cairo.timezone)).toBe("11:39");
  });
});

describe("travel — the profile and clock follow the location", () => {
  it("moving from Kuwait to Istanbul switches profile and zone; the same instant is a different local day only where it should be", () => {
    const instant = new Date("2026-10-03T21:30:00Z"); // 00:30 Oct 4 in Kuwait, 00:30 Oct 4 in Istanbul (both UTC+3)
    const kuwait: PrayerLocation = { coordinates: { latitude: 29.3759, longitude: 47.9774 }, timezone: "Asia/Kuwait", country: "KW" };
    const istanbul: PrayerLocation = { coordinates: { latitude: 41.0082, longitude: 28.9784 }, timezone: "Europe/Istanbul", country: "TR" };
    const k = calculatePrayerDay(kuwait, localDateIn(instant, kuwait.timezone));
    const i = calculatePrayerDay(istanbul, localDateIn(instant, istanbul.timezone));
    expect([k.profile.id, i.profile.id]).toEqual(["kuwait", "diyanet"]);
    expect(k.localDate).toEqual({ year: 2026, month: 10, day: 4 });
    expect(i.localDate).toEqual({ year: 2026, month: 10, day: 4 });
    expect(formatPrayerTime(k.times.dhuhr, kuwait.timezone)).not.toBe(formatPrayerTime(i.times.dhuhr, istanbul.timezone));
  });

  it("flying Riyadh → New York: at one instant the two locations are on different calendar days", () => {
    const instant = new Date("2026-10-04T02:00:00Z"); // 05:00 Oct 4 Riyadh, 22:00 Oct 3 New York
    expect(localDateIn(instant, "Asia/Riyadh")).toEqual({ year: 2026, month: 10, day: 4 });
    expect(localDateIn(instant, "America/New_York")).toEqual({ year: 2026, month: 10, day: 3 });
    const ny = calculatePrayerDay({ coordinates: { latitude: 40.7128, longitude: -74.006 }, timezone: "America/New_York", country: "US" }, localDateIn(instant, "America/New_York"));
    expect(ny.profile.id).toBe("isna");
    // New York's Isha on Oct 3 is still ahead or just past — and tomorrow's Fajr is Oct 4 local.
    expect(localDateIn(ny.tomorrowFajr, "America/New_York")).toEqual({ year: 2026, month: 10, day: 4 });
  });
});
