// Regression coverage for the centralized calculation-method registry
// (Step 1 of the global hybrid prayer-time architecture). This file is
// NOT wired into the live app yet (see calculatePrayerTimes/
// PrayerTimesPanel.tsx, still Kuwait-only) — these tests verify the
// registry is internally correct and complete on its own.
import { describe, expect, it } from "vitest";
import { CalculationMethod } from "adhan";
import { getCalculationParameters, SUPPORTED_CALCULATION_METHODS } from "./calculationMethods";
import type { CalculationMethodId } from "./calculationMethods";

// Every id this registry claims to support, verified against adhan's own
// exported CalculationMethod object — this list is the ground truth of
// "what adhan.js 4.4.6 actually ships", read directly from its source in
// node_modules/adhan/lib/esm/CalculationMethod.js.
const ADHAN_METHOD_KEYS = Object.keys(CalculationMethod).filter((k) => k !== "Other");

describe("SUPPORTED_CALCULATION_METHODS", () => {
  it("contains exactly the real adhan.js presets, minus 'Other' (not a real regional convention)", () => {
    expect([...SUPPORTED_CALCULATION_METHODS].sort()).toEqual([...ADHAN_METHOD_KEYS].sort());
  });

  it("never invents a method id adhan.js doesn't actually export", () => {
    for (const id of SUPPORTED_CALCULATION_METHODS) {
      expect(typeof (CalculationMethod as Record<string, unknown>)[id]).toBe("function");
    }
  });
});

describe("getCalculationParameters", () => {
  it("returns a working CalculationParameters instance for every supported method", () => {
    for (const id of SUPPORTED_CALCULATION_METHODS) {
      const params = getCalculationParameters(id);
      expect(params.method).toBe(id);
      expect(typeof params.fajrAngle).toBe("number");
    }
  });

  it("Kuwait resolves to the exact same parameters as calling adhan's own factory directly (Fajr 18°, Isha 17.5°)", () => {
    const viaRegistry = getCalculationParameters("Kuwait");
    const viaAdhanDirectly = CalculationMethod.Kuwait();
    expect(viaRegistry).toEqual(viaAdhanDirectly);
    expect(viaRegistry.fajrAngle).toBe(18);
    expect(viaRegistry.ishaAngle).toBe(17.5);
  });

  it("returns a FRESH instance every call — mutating one never affects the next", () => {
    const first = getCalculationParameters("Kuwait");
    first.fajrAngle = 999;
    const second = getCalculationParameters("Kuwait");
    expect(second.fajrAngle).toBe(18);
  });

  it("different methods produce different angle parameters, proving the mapping isn't accidentally the same object everywhere", () => {
    const ids: CalculationMethodId[] = ["Kuwait", "MuslimWorldLeague", "Egyptian", "UmmAlQura", "NorthAmerica"];
    const angles = ids.map((id) => getCalculationParameters(id).fajrAngle);
    expect(new Set(angles).size).toBeGreaterThan(1);
  });
});
