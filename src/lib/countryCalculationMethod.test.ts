// Regression coverage for the country → default calculation-method
// mapping (Step 1 of the global hybrid prayer-time architecture). NOT
// wired into the live app yet — these tests verify the table itself is
// correct and complete on its own, ready for a later step's resolver.
import { describe, expect, it } from "vitest";
import { getCalculationMethodForCountry, DEFAULT_CALCULATION_METHOD, COUNTRY_CALCULATION_METHOD } from "./countryCalculationMethod";
import { SUPPORTED_CALCULATION_METHODS } from "./calculationMethods";

describe("getCalculationMethodForCountry", () => {
  it("Kuwait -> Kuwait", () => {
    expect(getCalculationMethodForCountry("KW")).toBe("Kuwait");
  });

  it("Egypt -> Egyptian", () => {
    expect(getCalculationMethodForCountry("EG")).toBe("Egyptian");
  });

  it("Saudi Arabia -> UmmAlQura", () => {
    expect(getCalculationMethodForCountry("SA")).toBe("UmmAlQura");
  });

  it("UAE -> Dubai", () => {
    expect(getCalculationMethodForCountry("AE")).toBe("Dubai");
  });

  it("Qatar -> Qatar", () => {
    expect(getCalculationMethodForCountry("QA")).toBe("Qatar");
  });

  it("Turkey -> Turkey", () => {
    expect(getCalculationMethodForCountry("TR")).toBe("Turkey");
  });

  it("USA and Canada -> NorthAmerica (ISNA)", () => {
    expect(getCalculationMethodForCountry("US")).toBe("NorthAmerica");
    expect(getCalculationMethodForCountry("CA")).toBe("NorthAmerica");
  });

  it("UK -> MoonsightingCommittee", () => {
    expect(getCalculationMethodForCountry("GB")).toBe("MoonsightingCommittee");
  });

  it("an unmapped country falls back to Muslim World League", () => {
    expect(getCalculationMethodForCountry("BR")).toBe("MuslimWorldLeague"); // Brazil — deliberately not in the table
    expect(getCalculationMethodForCountry("XX")).toBe(DEFAULT_CALCULATION_METHOD);
  });

  it("no country at all (undefined) falls back to Muslim World League", () => {
    expect(getCalculationMethodForCountry(undefined)).toBe("MuslimWorldLeague");
  });

  it("is case-insensitive on the country code", () => {
    expect(getCalculationMethodForCountry("kw")).toBe("Kuwait");
  });

  it("Malaysia/Indonesia/Singapore/Brunei use the documented Singapore approximation, not silently the global fallback", () => {
    for (const code of ["MY", "ID", "SG", "BN"]) {
      expect(getCalculationMethodForCountry(code)).toBe("Singapore");
    }
  });

  it("every mapped method id is actually one of adhan.js's real supported presets — never an invented one", () => {
    for (const methodId of Object.values(COUNTRY_CALCULATION_METHOD)) {
      expect(SUPPORTED_CALCULATION_METHODS).toContain(methodId);
    }
    expect(SUPPORTED_CALCULATION_METHODS).toContain(DEFAULT_CALCULATION_METHOD);
  });
});
