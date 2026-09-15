// Regression coverage for the country -> Asr-convention (madhab) default
// table (Step 8) — mirrors countryCalculationMethod.test.ts's own
// structure for the parallel method table.
import { describe, expect, it } from "vitest";
import { getMadhabForCountry, COUNTRY_MADHAB, DEFAULT_MADHAB } from "./countryMadhab";

describe("getMadhabForCountry", () => {
  it("resolves the well-documented Hanafi-Asr-convention-majority countries to hanafi", () => {
    expect(getMadhabForCountry("TR")).toBe("hanafi");
    expect(getMadhabForCountry("PK")).toBe("hanafi");
    expect(getMadhabForCountry("IN")).toBe("hanafi");
    expect(getMadhabForCountry("BD")).toBe("hanafi");
    expect(getMadhabForCountry("AF")).toBe("hanafi");
  });

  it("is case-insensitive on the country code, same convention as getCalculationMethodForCountry", () => {
    expect(getMadhabForCountry("tr")).toBe("hanafi");
    expect(getMadhabForCountry("Pk")).toBe("hanafi");
  });

  it("Kuwait — and every other country not explicitly listed — falls through to the standard default, exactly preserving prior behavior", () => {
    expect(getMadhabForCountry("KW")).toBe("shafi");
    expect(getMadhabForCountry("SA")).toBe("shafi");
    expect(getMadhabForCountry("EG")).toBe("shafi");
    expect(getMadhabForCountry("GB")).toBe("shafi");
    expect(getMadhabForCountry("BR")).toBe("shafi"); // an unmapped country entirely
  });

  it("falls back to the default when no country is known at all", () => {
    expect(getMadhabForCountry(undefined)).toBe("shafi");
    expect(getMadhabForCountry(undefined)).toBe(DEFAULT_MADHAB);
  });

  it("DEFAULT_MADHAB is the standard shadow-factor-1 convention, not the Hanafi one", () => {
    expect(DEFAULT_MADHAB).toBe("shafi");
  });

  it("every entry in the table is a valid MadhabId ('shafi' or 'hanafi')", () => {
    for (const value of Object.values(COUNTRY_MADHAB)) {
      expect(["shafi", "hanafi"]).toContain(value);
    }
  });
});
