// DITHAR — centralized calculation-method registry.
//
// Step 1 of the global hybrid prayer-time architecture: the ONE place in
// the app that should ever reference an adhan.js CalculationMethod
// factory by name. Consumed by resolveCalculationSettings.ts (Step 3),
// which PrayerTimesPanel.tsx has called since Step 6 — no other call site
// should construct a CalculationMethod factory directly.
//
// Every id below is verified 1:1 against the ACTUAL installed adhan.js
// version (see package.json — "adhan": "^4.4.6") by reading its own
// node_modules/adhan/lib/esm/CalculationMethod.js source, never assumed
// or invented. The angles noted in each comment are that source file's
// real values, kept here so this table stays auditable without
// re-reading adhan's source every time it's reviewed.
//
// "Other" (adhan's raw 0°/0° escape hatch — not a real regional
// convention) is deliberately excluded from this registry.
import { CalculationMethod } from "adhan";
import type { CalculationParameters } from "adhan";

export type CalculationMethodId =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran"
  | "Turkey";

const METHOD_FACTORIES: Readonly<Record<CalculationMethodId, () => CalculationParameters>> = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague, // Fajr 18°, Isha 17°
  Egyptian: CalculationMethod.Egyptian, // Egyptian General Authority of Survey — Fajr 19.5°, Isha 17.5°
  Karachi: CalculationMethod.Karachi, // University of Islamic Sciences, Karachi — Fajr 18°, Isha 18°
  UmmAlQura: CalculationMethod.UmmAlQura, // Umm al-Qura University, Makkah — Fajr 18.5°, Isha 90 min after Maghrib
  Dubai: CalculationMethod.Dubai, // Fajr/Isha 18.2°, + method-specific minute adjustments
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee, // Fajr/Isha 18°, + minute adjustments
  NorthAmerica: CalculationMethod.NorthAmerica, // ISNA — Fajr/Isha 15°
  Kuwait: CalculationMethod.Kuwait, // Kuwait Ministry of Awqaf convention — Fajr 18°, Isha 17.5° (today's only live method)
  Qatar: CalculationMethod.Qatar, // Fajr 18°, Isha 90 min after Maghrib
  Singapore: CalculationMethod.Singapore, // MUIS — Fajr 20°, Isha 18°
  Tehran: CalculationMethod.Tehran, // Institute of Geophysics, University of Tehran — Fajr 17.7°, Isha 14°, Maghrib 4.5°
  Turkey: CalculationMethod.Turkey, // Diyanet — Fajr 18°, Isha 17°, + minute adjustments
};

export const SUPPORTED_CALCULATION_METHODS: readonly CalculationMethodId[] = Object.keys(
  METHOD_FACTORIES,
) as CalculationMethodId[];

// Returns a FRESH CalculationParameters instance every call — adhan's own
// factories already do this (each is a plain function returning `new
// CalculationParameters(...)`), and callers (e.g. calculatePrayerTimes)
// may mutate the instance they receive (see its own doc comment), so
// never memoize/share a single instance here.
export function getCalculationParameters(methodId: CalculationMethodId): CalculationParameters {
  return METHOD_FACTORIES[methodId]();
}
