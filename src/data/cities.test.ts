// Sanity coverage for the bundled offline city dataset (Step 4) — no
// duplicate/malformed entries, every coordinate/timezone is plausible,
// and every country code actually referenced is a real one this app's
// calculation-method table (or its documented MWL fallback) can resolve.
import { describe, expect, it } from "vitest";
import { CITIES, getCountryName } from "./cities";
import { COUNTRY_PROFILE, resolveCalculationProfile } from "../lib/calculationProfiles";

describe("CITIES", () => {
  it("has no duplicate ids", () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has non-empty bilingual names and a valid-looking country code", () => {
    for (const city of CITIES) {
      expect(city.nameAr.length).toBeGreaterThan(0);
      expect(city.nameEn.length).toBeGreaterThan(0);
      expect(city.countryNameAr.length).toBeGreaterThan(0);
      expect(city.countryNameEn.length).toBeGreaterThan(0);
      expect(city.countryCode).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("every coordinate is within valid real-world ranges", () => {
    for (const city of CITIES) {
      expect(city.latitude).toBeGreaterThanOrEqual(-90);
      expect(city.latitude).toBeLessThanOrEqual(90);
      expect(city.longitude).toBeGreaterThanOrEqual(-180);
      expect(city.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("every timezone is a real IANA identifier Intl can actually format with", () => {
    for (const city of CITIES) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: city.timezone })).not.toThrow();
    }
  });

  it("includes Kuwait City with the app's exact existing fallback coordinates", () => {
    const kuwait = CITIES.find((c) => c.id === "kuwait-city");
    expect(kuwait).toBeDefined();
    expect(kuwait?.latitude).toBe(29.3759);
    expect(kuwait?.longitude).toBe(47.9774);
    expect(kuwait?.timezone).toBe("Asia/Kuwait");
  });

  it("resolves a calculation profile for every city (never throws)", () => {
    for (const city of CITIES) {
      expect(resolveCalculationProfile({ country: city.countryCode, timezone: city.timezone }).id).toBeTruthy();
    }
  });

  it("includes at least one deliberately-unmapped-country city to exercise the MWL fallback", () => {
    const unmapped = CITIES.filter((c) => !(c.countryCode in COUNTRY_PROFILE));
    expect(unmapped.length).toBeGreaterThan(0);
  });
});

// getCountryName — used by PrayerTimesPanel.tsx to build the "City,
// Country" displayed-location label from an ActiveLocationRecord's own
// countryCode, instead of ever hardcoding a country name.
describe("getCountryName", () => {
  it("resolves the bilingual country name for a code present in the bundle", () => {
    expect(getCountryName("SA", "en")).toBe("Saudi Arabia");
    expect(getCountryName("SA", "ar")).toBe("السعودية");
    expect(getCountryName("GB", "en")).toBe("United Kingdom");
    expect(getCountryName("KW", "en")).toBe("Kuwait");
  });

  it("returns undefined for a code with no bundled city, rather than guessing", () => {
    expect(getCountryName("ZZ", "en")).toBeUndefined();
  });
});
