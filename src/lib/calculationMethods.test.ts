// Regression coverage for the centralized calculation-method registry
// (Step 1 of the global hybrid prayer-time architecture). This file is
// NOT wired into the live app yet (see calculatePrayerTimes/
// PrayerTimesPanel.tsx, still Kuwait-only) — these tests verify the
// registry is internally correct and complete on its own.
import { describe, expect, it } from "vitest";
import { CalculationMethod } from "adhan";
import { getCalculationParameters, SUPPORTED_CALCULATION_METHODS } from "./calculationMethods";
import type { CalculationMethodId } from "./calculationMethods";
import { resolveCalculationSettings } from "./resolveCalculationSettings";
import { calculatePrayerTimes, formatPrayerTime } from "./prayerTimes";

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

describe("Egyptian method — Dhuhr is true midday (Egyptian Survey / Dar al-Ifta)", () => {
  const OFFICIAL_CAIRO_2026_10_02 = { fajr: "05:22", shuruq: "06:49", dhuhr: "12:44", asr: "16:07", maghrib: "18:39", isha: "19:56" };
  const DATE = new Date(2026, 9, 2);
  const TZ = "Africa/Cairo";
  const times = (coordinates: { latitude: number; longitude: number }) => {
    const t = calculatePrayerTimes(DATE, coordinates, resolveCalculationSettings({ coordinates, country: "EG", timezone: TZ }));
    return Object.fromEntries(Object.entries(t).map(([k, d]) => [k, formatPrayerTime(d, TZ)]));
  };

  it("has no Dhuhr adjustment; everything else is adhan's own Egyptian preset", () => {
    const ours = getCalculationParameters("Egyptian");
    const adhan = CalculationMethod.Egyptian();
    expect(adhan.methodAdjustments.dhuhr).toBe(1); // the preset's extra minute …
    expect(ours.methodAdjustments).toEqual({ ...adhan.methodAdjustments, dhuhr: 0 }); // … removed, nothing else
    expect([ours.fajrAngle, ours.ishaAngle, ours.rounding, ours.adjustments]).toEqual([19.5, 17.5, adhan.rounding, adhan.adjustments]);
  });

  it("every other method is exactly adhan's own preset (unchanged)", () => {
    for (const id of SUPPORTED_CALCULATION_METHODS.filter((m) => m !== "Egyptian")) {
      expect(getCalculationParameters(id), id).toEqual(CalculationMethod[id]());
    }
  });

  it("Cairo, 2 Oct 2026, at the city reference point 30°03′N 31°15′E: all six match Dar al-Ifta", () => {
    expect(times({ latitude: 30.05, longitude: 31.25 })).toEqual(OFFICIAL_CAIRO_2026_10_02);
  });

  it("Cairo, 2 Oct 2026, at 30.0444, 31.2357: Fajr, Sunrise, Dhuhr and Asr match; Maghrib/Isha sit on the half-minute boundary", () => {
    const t = times({ latitude: 30.0444, longitude: 31.2357 });
    expect([t.fajr, t.shuruq, t.dhuhr, t.asr]).toEqual(["05:22", "06:49", "12:44", "16:07"]);
    // 18:39:30 and 19:56:31 unrounded here — ~1.4 km west of the reference point; nearest-minute rounding unchanged.
    expect([t.maghrib, t.isha]).toEqual(["18:40", "19:57"]);
  });

  it("a manual 'Egyptian' choice in Settings gets the same Dhuhr", () => {
    const coordinates = { latitude: 30.05, longitude: 31.25 };
    const t = calculatePrayerTimes(DATE, coordinates, resolveCalculationSettings({ coordinates, country: "KW" }, { method: "Egyptian" }));
    expect(formatPrayerTime(t.dhuhr, TZ)).toBe("12:44");
  });
});
