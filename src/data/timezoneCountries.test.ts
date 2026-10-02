import { describe, expect, it } from "vitest";
import { countryForTimezone } from "./timezoneCountries";
import { COUNTRY_CALCULATION_METHOD } from "../lib/countryCalculationMethod";

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

  it("every country with its own calculation method is reachable from at least one timezone", () => {
    const reachable = new Set(["Africa/Cairo", "Asia/Kuwait", "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Europe/Istanbul", "America/New_York", "America/Toronto", "Europe/London", "Asia/Kuala_Lumpur", "Asia/Jakarta", "Asia/Singapore", "Asia/Brunei"].map(countryForTimezone));
    for (const country of Object.keys(COUNTRY_CALCULATION_METHOD)) expect(reachable.has(country), country).toBe(true);
  });
});
