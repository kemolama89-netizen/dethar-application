// Regression coverage for the centralized calculation-settings resolver
// (Step 3 of the global hybrid prayer-time architecture, wired into the
// live app since Step 6 — see the module's own doc comment) — these tests
// verify the resolver is correct entirely on its own.
import { describe, expect, it } from "vitest";
import { CalculationMethod, Madhab } from "adhan";
import { resolveCalculationSettings } from "./resolveCalculationSettings";
import { KUWAIT_CITY_COORDINATES, calculatePrayerTimes, formatPrayerTime } from "./prayerTimes";

const KUWAIT_TZ = "Asia/Kuwait";
const KUWAIT_LOCATION = { coordinates: KUWAIT_CITY_COORDINATES, country: "KW" };

describe("resolveCalculationSettings — calculation method hierarchy", () => {
  it("an explicit user method override wins, even when it contradicts the country's default", () => {
    // Kuwait's own country default is "Kuwait" — an explicit override to
    // a different method must still be honored.
    const params = resolveCalculationSettings(KUWAIT_LOCATION, { method: "MuslimWorldLeague" });
    expect(params.method).toBe("MuslimWorldLeague");
  });

  it("with no override, resolves the method from the location's country (Egypt -> Egyptian)", () => {
    const params = resolveCalculationSettings({ coordinates: { latitude: 30.0444, longitude: 31.2357 }, country: "EG" });
    expect(params.method).toBe("Egyptian");
  });

  it("with no override and no mapped/known country, falls back to Muslim World League", () => {
    const unmapped = resolveCalculationSettings({ coordinates: { latitude: -23.5505, longitude: -46.6333 }, country: "BR" });
    expect(unmapped.method).toBe("MuslimWorldLeague");

    const unknown = resolveCalculationSettings({ coordinates: { latitude: 0, longitude: 0 } }); // no country at all
    expect(unknown.method).toBe("MuslimWorldLeague");
  });
});

describe("resolveCalculationSettings — madhab hierarchy", () => {
  it("an explicit user madhab override wins", () => {
    const params = resolveCalculationSettings(KUWAIT_LOCATION, { madhab: "hanafi" });
    expect(params.madhab).toBe(Madhab.Hanafi);
  });

  it("with no override, resolves the standard (Shafi/Maliki/Hanbali) Asr convention for a country not in the Hanafi-majority list — Kuwait unchanged", () => {
    const kuwait = resolveCalculationSettings(KUWAIT_LOCATION);
    expect(kuwait.madhab).toBe(Madhab.Shafi);
  });

  it("with no override, resolves the Hanafi Asr convention for a country in the well-documented Hanafi-majority list (Step 8's countryMadhab.ts)", () => {
    const pakistan = resolveCalculationSettings({ coordinates: { latitude: 24.8607, longitude: 67.0011 }, country: "PK" });
    expect(pakistan.madhab).toBe(Madhab.Hanafi);
  });

  it("method and madhab overrides are independent — one can be set without the other", () => {
    const params = resolveCalculationSettings(KUWAIT_LOCATION, { madhab: "hanafi" }); // method left automatic
    expect(params.method).toBe("Kuwait"); // still resolved from country
    expect(params.madhab).toBe(Madhab.Hanafi); // but madhab is the explicit override
  });
});

describe("resolveCalculationSettings — Kuwait preservation", () => {
  it("Kuwait location with no overrides resolves to the exact same CalculationParameters as the app's current hardcoded path", () => {
    const resolved = resolveCalculationSettings(KUWAIT_LOCATION);
    const current = (() => {
      const params = CalculationMethod.Kuwait();
      params.madhab = Madhab.Shafi;
      return params;
    })();
    expect(resolved.method).toBe(current.method);
    expect(resolved.fajrAngle).toBe(current.fajrAngle);
    expect(resolved.ishaAngle).toBe(current.ishaAngle);
    expect(resolved.madhab).toBe(current.madhab);
  });

  it("feeding the resolved Kuwait params into calculatePrayerTimes produces the exact same pinned times as the app's current hardcoded path", () => {
    const date = new Date("2026-09-14T00:00:00Z");
    const resolvedParams = resolveCalculationSettings(KUWAIT_LOCATION);
    const times = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, resolvedParams);
    // Same pinned values asserted in prayerTimes.test.ts's own Kuwait
    // regression test.
    expect(formatPrayerTime(times.fajr, KUWAIT_TZ)).toBe("04:12");
    expect(formatPrayerTime(times.dhuhr, KUWAIT_TZ)).toBe("11:44");
    expect(formatPrayerTime(times.isha, KUWAIT_TZ)).toBe("19:12");
  });
});

describe("resolveCalculationSettings — high-latitude / polar-circle parameters", () => {
  it("resolves highLatitudeRule from the location's own coordinates via adhan's own recommended() — Kuwait (29.37°N) stays on adhan's unset default", () => {
    const params = resolveCalculationSettings(KUWAIT_LOCATION);
    expect(params.highLatitudeRule).toBe("middleofthenight");
  });

  it("resolves a DIFFERENT highLatitudeRule for a genuinely high-latitude location (>48°N)", () => {
    const reykjavik = resolveCalculationSettings({ coordinates: { latitude: 64.1466, longitude: -21.9426 } });
    expect(reykjavik.highLatitudeRule).toBe("seventhofthenight");
  });

  it("always sets a resolvable polarCircleResolution (never leaves adhan's own invalid-time-producing 'Unresolved' default)", () => {
    const params = resolveCalculationSettings(KUWAIT_LOCATION);
    expect(params.polarCircleResolution).toBe("AqrabBalad");
  });

  it("the resolved params, used directly, prevent invalid (NaN) times at a real polar-circle location — proving item 3 is genuinely wired, not just set-and-ignored", () => {
    const svalbard = { latitude: 78.2232, longitude: 15.6267 };
    const params = resolveCalculationSettings({ coordinates: svalbard });
    const times = calculatePrayerTimes(new Date("2026-06-21T00:00:00Z"), svalbard, params);
    for (const t of [times.fajr, times.shuruq, times.dhuhr, times.asr, times.maghrib, times.isha]) {
      expect(Number.isNaN(t.getTime())).toBe(false);
    }
  });
});

// Step 8: the full pipeline (method tier + madhab tier, each resolved
// independently from the SAME country, then fed into the real
// calculatePrayerTimes engine) exercised end-to-end for several real,
// non-Kuwait countries — proving DITHAR's automatic (no-override) path is
// genuinely worldwide-aware, not just Kuwait-shaped with everything else
// falling through to a single global default.
describe("resolveCalculationSettings — Step 8: worldwide, non-Kuwait countries resolve method and madhab correctly end-to-end", () => {
  it("Turkey (Istanbul): country-mapped Turkey method + Hanafi-majority madhab (Step 8's countryMadhab.ts), valid prayer times", () => {
    const istanbul = { latitude: 41.0082, longitude: 28.9784 };
    const params = resolveCalculationSettings({ coordinates: istanbul, country: "TR" });
    expect(params.method).toBe("Turkey");
    expect(params.madhab).toBe(Madhab.Hanafi);
    const times = calculatePrayerTimes(new Date("2026-06-21T00:00:00Z"), istanbul, params);
    for (const t of Object.values(times)) expect(Number.isNaN(t.getTime())).toBe(false);
  });

  it("Saudi Arabia (Makkah): country-mapped Umm Al-Qura method + standard madhab (not in the Hanafi-majority list)", () => {
    const makkah = { latitude: 21.3891, longitude: 39.8579 };
    const params = resolveCalculationSettings({ coordinates: makkah, country: "SA" });
    expect(params.method).toBe("UmmAlQura");
    expect(params.madhab).toBe(Madhab.Shafi);
    const times = calculatePrayerTimes(new Date("2026-12-21T00:00:00Z"), makkah, params);
    for (const t of Object.values(times)) expect(Number.isNaN(t.getTime())).toBe(false);
  });

  it("Pakistan (Karachi): method and madhab genuinely resolve from INDEPENDENT tiers — no method-table entry (falls to Muslim World League) yet IS in the Hanafi-majority madhab list", () => {
    const karachi = { latitude: 24.8607, longitude: 67.0011 };
    const params = resolveCalculationSettings({ coordinates: karachi, country: "PK" });
    expect(params.method).toBe("MuslimWorldLeague");
    expect(params.madhab).toBe(Madhab.Hanafi);
    const times = calculatePrayerTimes(new Date("2026-03-21T00:00:00Z"), karachi, params);
    for (const t of Object.values(times)) expect(Number.isNaN(t.getTime())).toBe(false);
  });

  it("Malaysia (Kuala Lumpur): country-mapped Singapore-preset method + standard madhab", () => {
    const kualaLumpur = { latitude: 3.139, longitude: 101.6869 };
    const params = resolveCalculationSettings({ coordinates: kualaLumpur, country: "MY" });
    expect(params.method).toBe("Singapore");
    expect(params.madhab).toBe(Madhab.Shafi);
    const times = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), kualaLumpur, params);
    for (const t of Object.values(times)) expect(Number.isNaN(t.getTime())).toBe(false);
  });

  it("United States (New York): country-mapped ISNA/NorthAmerica method + standard madhab", () => {
    const newYork = { latitude: 40.7128, longitude: -74.006 };
    const params = resolveCalculationSettings({ coordinates: newYork, country: "US" });
    expect(params.method).toBe("NorthAmerica");
    expect(params.madhab).toBe(Madhab.Shafi);
    const times = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), newYork, params);
    for (const t of Object.values(times)) expect(Number.isNaN(t.getTime())).toBe(false);
  });
});

// Step 8: high-latitude handling (item 5 — highLatitudeRule/polarCircleResolution,
// already resolved by Step 3) exercised across a wider spread of real
// world locations and BOTH solstices (the extreme case for day/night
// length) — never just Svalbard/Reykjavik in isolation.
describe("resolveCalculationSettings — Step 8: high-latitude handling never produces invalid (NaN) times, across several world locations and both solstices", () => {
  const locations: Array<{ label: string; coordinates: { latitude: number; longitude: number } }> = [
    { label: "Reykjavik, Iceland (64.1°N)", coordinates: { latitude: 64.1466, longitude: -21.9426 } },
    { label: "Tromsø, Norway (69.6°N — no bundled city, still must resolve)", coordinates: { latitude: 69.6492, longitude: 18.9553 } },
    { label: "Svalbard (78.2°N — inside the polar circle)", coordinates: { latitude: 78.2232, longitude: 15.6267 } },
    { label: "Ushuaia, Argentina (54.8°S — southern high latitude)", coordinates: { latitude: -54.8019, longitude: -68.303 } },
  ];

  for (const { label, coordinates } of locations) {
    it(`${label}: resolved params produce no NaN prayer times at the summer AND winter solstice`, () => {
      const params = resolveCalculationSettings({ coordinates });
      for (const iso of ["2026-06-21T00:00:00Z", "2026-12-21T00:00:00Z"]) {
        const times = calculatePrayerTimes(new Date(iso), coordinates, params);
        for (const t of Object.values(times)) {
          expect(Number.isNaN(t.getTime())).toBe(false);
        }
      }
    });
  }
});
