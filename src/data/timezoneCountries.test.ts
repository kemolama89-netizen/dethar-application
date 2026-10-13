import { describe, expect, it } from "vitest";
import { countryForTimezone, zonesForCountry } from "./timezoneCountries";
import { COUNTRY_PROFILE } from "../lib/calculationProfiles";

describe("countryForTimezone", () => {
  it.each([
    ["Africa/Cairo", "EG"],
    ["Asia/Kuwait", "KW"],
    ["Asia/Riyadh", "SA"],
    ["Asia/Dubai", "AE"],
    ["Asia/Qatar", "QA"],
    ["Europe/Istanbul", "TR"],
    ["America/New_York", "US"],
    ["America/Toronto", "CA"],
    ["Europe/London", "GB"],
    ["Asia/Kuala_Lumpur", "MY"],
    ["Asia/Jakarta", "ID"],
    ["Asia/Singapore", "SG"],
    ["Asia/Brunei", "BN"],
    ["Egypt", "EG"], // legacy alias still reported by some devices
    ["Asia/Calcutta", "IN"],
  ])("%s → %s", (zone, country) => {
    expect(countryForTimezone(zone)).toBe(country);
  });

  it("returns undefined for zones that don't identify a country", () => {
    for (const zone of [undefined, "", "UTC", "Etc/UTC", "Etc/GMT+2", "Nowhere/Fake"]) expect(countryForTimezone(zone), String(zone)).toBeUndefined();
  });

  it("every country with its own calculation profile is reachable from its own timezones", () => {
    for (const country of Object.keys(COUNTRY_PROFILE)) {
      const zones = zonesForCountry(country);
      expect(zones.length, country).toBeGreaterThan(0);
      for (const zone of zones) expect(countryForTimezone(zone), zone).toBe(country);
    }
  });
});

describe("zonesForCountry", () => {
  it("lists a single-zone country's one zone and a multi-zone country's several", () => {
    expect(zonesForCountry("SA")).toEqual(["Asia/Riyadh"]);
    expect(zonesForCountry("eg")).toEqual(["Africa/Cairo"]);
    expect(zonesForCountry("ID")).toEqual(expect.arrayContaining(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]));
    expect(zonesForCountry("XX")).toEqual([]);
    expect(zonesForCountry(undefined)).toEqual([]);
  });
});
