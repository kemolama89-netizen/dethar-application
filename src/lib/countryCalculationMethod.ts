// DITHAR — country → default calculation-method mapping.
//
// Step 1 of the global hybrid prayer-time architecture, alongside
// calculationMethods.ts. Consumed by resolveCalculationSettings.ts (Step
// 3), which PrayerTimesPanel.tsx has called since Step 6 — `country` comes
// from a manually-selected city, the Kuwait fallback, or (Step 7) an
// offline device-GPS country estimate (see reverseGeocode.ts).
//
// ACCURACY DISCLAIMER — read before editing this table: these are
// REASONABLE, WIDELY-USED defaults per country, chosen only from
// adhan.js's own 12 actually-supported presets (see
// calculationMethods.ts's own SUPPORTED_CALCULATION_METHODS) — they are
// NOT independently verified as each country's religious authority's
// "official" method. Where adhan.js has no preset matching a country's
// own specific convention, the closest available preset is used and
// explicitly flagged below as an approximation, never silently presented
// as official. This table is the ONE place to review or correct any of
// these choices — a country/method decision must never be duplicated
// anywhere else in the app.
import type { CalculationMethodId } from "./calculationMethods";

// ISO 3166-1 alpha-2 country codes.
export const COUNTRY_CALCULATION_METHOD: Readonly<Record<string, CalculationMethodId>> = {
  KW: "Kuwait", // Kuwait Ministry of Awqaf convention — this app's home market, today's only live method
  EG: "Egyptian", // Egyptian General Authority of Survey
  SA: "UmmAlQura", // Umm al-Qura University, Makkah
  AE: "Dubai", // UAE — Dubai (General Authority of Islamic Affairs, Dubai)
  QA: "Qatar",
  TR: "Turkey", // Diyanet İşleri Başkanlığı
  US: "NorthAmerica", // ISNA
  CA: "NorthAmerica", // ISNA
  GB: "MoonsightingCommittee",
  // Southeast Asia — adhan.js has NO Malaysia/Indonesia/Brunei-specific
  // preset. Singapore (MUIS, 20°/18°) is the closest available regional
  // preset and is used for all four countries below as a DOCUMENTED
  // APPROXIMATION, not a verified match to each country's own official
  // authority — JAKIM (Malaysia), Kemenag (Indonesia), and MUIB (Brunei)
  // each publish their own tables that may differ by several minutes
  // from this preset. Flagged here exactly as the audit called for:
  // "do not claim exact official parity unless verified."
  MY: "Singapore",
  ID: "Singapore",
  SG: "Singapore",
  BN: "Singapore",
};

// The documented global fallback for any country not explicitly mapped
// above (or when no country is known at all) — the Muslim World League
// method is the most widely used international default and adhan.js's
// own first-listed preset.
export const DEFAULT_CALCULATION_METHOD: CalculationMethodId = "MuslimWorldLeague";

export function getCalculationMethodForCountry(countryCode: string | undefined): CalculationMethodId {
  if (!countryCode) return DEFAULT_CALCULATION_METHOD;
  return COUNTRY_CALCULATION_METHOD[countryCode.toUpperCase()] ?? DEFAULT_CALCULATION_METHOD;
}
