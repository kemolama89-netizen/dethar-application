import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, hijriMonthOf, isValidTimeZone, localDateIn, localDateKey, resolveLocationCountry, resolveLocationTimezone, toAdhanDate } from "./locationTime";
import { estimateCountryFromCoordinates } from "./reverseGeocode";
import { resolveCalculationProfile } from "./calculationProfiles";
import { calculatePrayerDay } from "./prayerTimes";
import type { PrayerLocation } from "./prayerTimes";

describe("localDateIn — the location's own calendar day at an instant", () => {
  const instant = new Date("2026-09-14T00:00:00Z");
  it.each([
    ["Asia/Kuwait", { year: 2026, month: 9, day: 14 }],
    ["America/New_York", { year: 2026, month: 9, day: 13 }],
    ["Pacific/Honolulu", { year: 2026, month: 9, day: 13 }],
    ["Pacific/Pago_Pago", { year: 2026, month: 9, day: 13 }], // UTC−11
    ["Pacific/Kiritimati", { year: 2026, month: 9, day: 14 }], // UTC+14
    ["Pacific/Auckland", { year: 2026, month: 9, day: 14 }],
    ["UTC", { year: 2026, month: 9, day: 14 }],
  ])("%s", (timezone, expected) => {
    expect(localDateIn(instant, timezone)).toEqual(expected);
  });

  it("flips exactly at the location's own midnight", () => {
    expect(localDateIn(new Date("2026-10-03T20:59:59Z"), "Asia/Riyadh")).toEqual({ year: 2026, month: 10, day: 3 });
    expect(localDateIn(new Date("2026-10-03T21:00:00Z"), "Asia/Riyadh")).toEqual({ year: 2026, month: 10, day: 4 });
  });

  it("falls back to UTC for an unusable zone rather than throwing", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(localDateIn(new Date("2026-09-14T00:00:00Z"), "Not/AZone")).toEqual({ year: 2026, month: 9, day: 14 });
  });
});

describe("calendar helpers", () => {
  it("addDays rolls months, years and leap days", () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({ year: 2028, month: 2, day: 29 });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it("localDateKey is zero-padded", () => {
    expect(localDateKey({ year: 2026, month: 3, day: 5 })).toBe("2026-03-05");
  });

  it("toAdhanDate carries the location's Y/M/D at noon", () => {
    const d = toAdhanDate({ year: 2026, month: 2, day: 18 });
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 2, 18, 12]);
  });

  it("hijriMonthOf never reads a Gregorian month as Hijri when the engine lacks the Umm al-Qura calendar", () => {
    const RealDateTimeFormat = Intl.DateTimeFormat;
    // An engine without islamic-umalqura silently formats in the Gregorian calendar.
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      return new RealDateTimeFormat(String(locales).replace("-u-ca-islamic-umalqura", "-u-ca-gregory"), options);
    } as unknown as typeof Intl.DateTimeFormat);
    try {
      expect(hijriMonthOf({ year: 2026, month: 9, day: 10 })).toBeUndefined(); // September, not "month 9"
      const riyadh: PrayerLocation = { coordinates: { latitude: 24.7136, longitude: 46.6753 }, timezone: "Asia/Riyadh", country: "SA" };
      const day = calculatePrayerDay(riyadh, { year: 2026, month: 9, day: 10 });
      expect(day.ramadanRuleApplied).toBe(false);
      expect((day.times.isha.getTime() - day.times.maghrib.getTime()) / 60_000).toBe(90);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("hijriMonthOf follows the Umm al-Qura calendar (Ramadan 1447 = 2026-02-18..03-19)", () => {
    expect(hijriMonthOf({ year: 2026, month: 2, day: 17 })).toBe(8);
    expect(hijriMonthOf({ year: 2026, month: 2, day: 18 })).toBe(9);
    expect(hijriMonthOf({ year: 2026, month: 3, day: 19 })).toBe(9);
    expect(hijriMonthOf({ year: 2026, month: 3, day: 20 })).toBe(10);
  });
});

// The test runner's own process environment (Node's `process`, not in the
// app's browser type set) — setting TZ switches the runtime's local zone.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

describe("device timezone independence — the device's own zone never changes a location's times", () => {
  const originalTz = env.TZ;
  afterEach(() => {
    env.TZ = originalTz;
  });

  const places: PrayerLocation[] = [
    { coordinates: { latitude: -33.8688, longitude: 151.2093 }, timezone: "Australia/Sydney", country: "AU" },
    { coordinates: { latitude: 24.7136, longitude: 46.6753 }, timezone: "Asia/Riyadh", country: "SA" },
    { coordinates: { latitude: 40.7128, longitude: -74.006 }, timezone: "America/New_York", country: "US" },
    { coordinates: { latitude: 21.3069, longitude: -157.8583 }, timezone: "Pacific/Honolulu", country: "US" },
  ];
  // Includes zones whose DST starts AT local midnight (Santiago, Beirut on
  // these dates) — the noon-anchored date keeps adhan on the right day.
  const deviceZones = ["UTC", "Asia/Kuwait", "America/Los_Angeles", "Pacific/Kiritimati", "America/Santiago", "Asia/Beirut"];
  const dates = [
    { year: 2026, month: 9, day: 6 }, // Chile's DST start (midnight)
    { year: 2026, month: 3, day: 29 }, // Lebanon's DST start (midnight)
    { year: 2026, month: 2, day: 18 }, // 1 Ramadan
  ];

  it("identical instants whatever zone the device is set to", () => {
    const run = () => places.flatMap((p) => dates.map((d) => Object.values(calculatePrayerDay(p, d).times).map((t) => t.getTime())));
    env.TZ = "UTC";
    const reference = run();
    for (const zone of deviceZones) {
      env.TZ = zone;
      expect(run(), zone).toEqual(reference);
    }
    // Guard: the runtime really did switch zones (else this test proves nothing).
    env.TZ = "Pacific/Kiritimati";
    expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(-14 * 60);
  });
});

describe("resolveLocationTimezone / resolveLocationCountry — which zone and country a location record uses", () => {
  const riyadh = { latitude: 24.7136, longitude: 46.6753 };
  it("a manual city or the Kuwait fallback keeps its own zone and country", () => {
    const manual = { source: "manual" as const, timezone: "Asia/Riyadh", countryCode: "SA", ...riyadh };
    const fallback = { source: "fallback" as const, timezone: "Asia/Kuwait", countryCode: "KW", latitude: 29.3759, longitude: 47.9774 };
    expect([resolveLocationTimezone(manual), resolveLocationCountry(manual)]).toEqual(["Asia/Riyadh", "SA"]);
    expect([resolveLocationTimezone(fallback), resolveLocationCountry(fallback)]).toEqual(["Asia/Kuwait", "KW"]);
  });

  it("a device fix whose device zone is in the same country keeps it", () => {
    expect(resolveLocationTimezone({ source: "device", timezone: "Asia/Riyadh", countryCode: "SA", ...riyadh })).toBe("Asia/Riyadh");
    expect(resolveLocationTimezone({ source: "device", timezone: "America/Chicago", countryCode: "US", latitude: 41.8781, longitude: -87.6298 })).toBe("America/Chicago");
  });

  it("an emulator/device on a country-less zone (UTC) gets the estimated country's zone", () => {
    expect(resolveLocationTimezone({ source: "device", timezone: "UTC", countryCode: "EG", latitude: 30.0444, longitude: 31.2357 })).toBe("Africa/Cairo");
  });

  it("a traveller whose phone kept a home zone hours away gets the visited country's zone and country", () => {
    const inRiyadh = { source: "device" as const, timezone: "America/New_York", countryCode: "SA", ...riyadh };
    expect([resolveLocationTimezone(inRiyadh), resolveLocationCountry(inRiyadh)]).toEqual(["Asia/Riyadh", "SA"]);
    // Multi-zone country: the nearest bundled city's zone.
    const inNewYork = { source: "device" as const, timezone: "Asia/Kuwait", countryCode: "US", latitude: 40.73, longitude: -73.99 };
    expect([resolveLocationTimezone(inNewYork), resolveLocationCountry(inNewYork)]).toEqual(["America/New_York", "US"]);
  });

  it("on no country's territory with no estimate, the device zone stands and no country is invented", () => {
    const ocean = { source: "device" as const, timezone: "Asia/Kuwait", latitude: -40, longitude: -30 };
    expect([resolveLocationTimezone(ocean), resolveLocationCountry(ocean)]).toEqual(["Asia/Kuwait", undefined]);
  });

  it("at sea, a trustworthy device zone names the country; an untrustworthy one leaves the stored estimate", () => {
    const gulf = { latitude: 27.0, longitude: 51.0 };
    expect(resolveLocationCountry({ source: "device", timezone: "Asia/Qatar", countryCode: "BH", ...gulf })).toBe("QA");
    expect(resolveLocationCountry({ source: "device", timezone: "UTC", countryCode: "BH", ...gulf })).toBe("BH");
  });

  // Border cities whose nearest BUNDLED city is across the border: the
  // device zone (set from the local mobile network) decides — never the
  // neighbour's clock or profile.
  it.each([
    ["Kuwait City", 29.3759, 47.9774, "Asia/Kuwait", "KW", "kuwait"],
    ["Jahra (Kuwait)", 29.3375, 47.6581, "Asia/Kuwait", "KW", "kuwait"],
    ["Ahmadi (Kuwait)", 29.0769, 48.0838, "Asia/Kuwait", "KW", "kuwait"],
    ["Doha", 25.2854, 51.531, "Asia/Qatar", "QA", "qatar"],
    ["Al Khor (Qatar)", 25.6839, 51.5058, "Asia/Qatar", "QA", "qatar"],
    ["Abu Dhabi", 24.4539, 54.3773, "Asia/Dubai", "AE", "uae"],
    ["Al Ain (UAE)", 24.2075, 55.7447, "Asia/Dubai", "AE", "uae"],
    ["Fujairah (UAE)", 25.1288, 56.3265, "Asia/Dubai", "AE", "uae"],
    ["Dammam (Saudi Arabia; nearest bundled city Manama)", 26.4207, 50.0888, "Asia/Riyadh", "SA", "umm-al-qura"],
    ["Hafar Al-Batin (Saudi Arabia; nearest Kuwait City)", 28.4328, 45.9708, "Asia/Riyadh", "SA", "umm-al-qura"],
    ["Sohar (Oman; nearest Dubai)", 24.3474, 56.7094, "Asia/Muscat", "OM", "oman"],
    ["Buraimi (Oman; nearest Abu Dhabi)", 24.2508, 55.7931, "Asia/Muscat", "OM", "oman"],
    ["Basra (Iraq; nearest Kuwait City)", 30.5085, 47.7804, "Asia/Baghdad", "IQ", "mwl"],
    ["Johor Bahru (Malaysia; nearest Singapore)", 1.4927, 103.7414, "Asia/Kuala_Lumpur", "MY", "jakim"],
    ["Batam (Indonesia, UTC+7; nearest Singapore, UTC+8)", 1.0456, 104.0305, "Asia/Jakarta", "ID", "kemenag"],
    ["Ahvaz (Iran, UTC+3:30; nearest Kuwait City, UTC+3)", 31.3183, 48.6706, "Asia/Tehran", "IR", "tehran"],
    ["Amritsar (India, UTC+5:30; nearest Lahore, UTC+5)", 31.634, 74.8723, "Asia/Kolkata", "IN", "karachi-hanafi"],
  ] as const)("%s", (_name, latitude, longitude, deviceZone, country, profile) => {
    const record = { source: "device" as const, timezone: deviceZone, countryCode: estimateCountryFromCoordinates({ latitude, longitude }), latitude, longitude };
    const timezone = resolveLocationTimezone(record);
    const resolvedCountry = resolveLocationCountry(record);
    expect([timezone, resolvedCountry]).toEqual([deviceZone, country]);
    expect(resolveCalculationProfile({ country: resolvedCountry, timezone }).id).toBe(profile);
  });
});

// A GPS fix far from every bundled city, with the device zone right, "UTC"
// (emulators), an invalid id, or empty: the borders give the country and
// profile, and the clock is the country's (compared by UTC offset — e.g.
// Asia/Pontianak and Asia/Jakarta are both UTC+7).
describe("GPS far from bundled cities, any device timezone — correct country, profile and clock", () => {
  const offsetAt = (timezone: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(new Date("2026-10-03T12:00:00Z")).find((p) => p.type === "timeZoneName")?.value;
  it.each([
    ["Tabuk (Saudi Arabia)", 28.3835, 36.5662, "Asia/Riyadh", "SA", "umm-al-qura"],
    ["Najran (Saudi Arabia)", 17.5656, 44.2289, "Asia/Riyadh", "SA", "umm-al-qura"],
    ["Salalah (Oman)", 17.0151, 54.0924, "Asia/Muscat", "OM", "oman"],
    ["Duqm (Oman)", 19.665, 57.7041, "Asia/Muscat", "OM", "oman"],
    ["Luxor (Egypt)", 25.6872, 32.6396, "Africa/Cairo", "EG", "egypt"],
    ["Aswan (Egypt)", 24.0889, 32.8998, "Africa/Cairo", "EG", "egypt"],
    ["Van (Turkey)", 38.5012, 43.3729, "Europe/Istanbul", "TR", "diyanet"],
    ["Kota Kinabalu (Malaysia)", 5.9804, 116.0735, "Asia/Kuching", "MY", "jakim"],
    ["Medan (Indonesia)", 3.5952, 98.6722, "Asia/Jakarta", "ID", "kemenag"],
    ["Jayapura (Indonesia, UTC+9)", -2.5337, 140.7181, "Asia/Jayapura", "ID", "kemenag"],
    ["Anchorage (USA)", 61.2181, -149.9003, "America/Anchorage", "US", "isna"],
    ["Tamanrasset (Algeria)", 22.785, 5.5228, "Africa/Algiers", "DZ", "mwl"],
    ["Kuwait City", 29.3759, 47.9774, "Asia/Kuwait", "KW", "kuwait"],
    ["Doha", 25.2854, 51.531, "Asia/Qatar", "QA", "qatar"],
    ["Al Ain (UAE)", 24.2075, 55.7447, "Asia/Dubai", "AE", "uae"],
  ] as const)("%s", (_name, latitude, longitude, zone, country, profile) => {
    for (const deviceZone of [zone, "UTC", "Not/AZone", ""]) {
      const record = { source: "device" as const, timezone: deviceZone, countryCode: estimateCountryFromCoordinates({ latitude, longitude }), latitude, longitude };
      const timezone = resolveLocationTimezone(record);
      const resolvedCountry = resolveLocationCountry(record);
      expect(resolvedCountry, deviceZone).toBe(country);
      expect(resolveCalculationProfile({ country: resolvedCountry, timezone }).id, deviceZone).toBe(profile);
      expect(offsetAt(timezone), deviceZone).toBe(offsetAt(zone));
      if (deviceZone === zone) expect(timezone).toBe(zone); // a correct device zone is always kept as-is
    }
  });
});
