// DITHAR — bundled prayer-time calculation profiles.
//
// The ONE place that decides HOW prayer times are calculated for a place:
// a location's country selects a profile automatically, and the profile
// fully defines the calculation — angles, Isha interval, minute margins,
// Asr rule, Ramadan rule and rounding. There are no user overrides: the
// app never asks anyone to pick a method, a madhab or a +/- minute.
//
// Everything is local and offline: profiles are built on adhan-js's own
// CalculationParameters, nothing is fetched at runtime.
//
// EVIDENCE — every profile states how well its parameters are supported,
// and nothing derived is ever labelled official:
//   - "official-documented": the authority (or its published criteria)
//     states these parameters.
//   - "official-tables-derived": parameters fitted to the authority's OWN
//     published timetables over many dates (see each profile's `derived`
//     list for exactly which parts) — used where the authority publishes
//     tables but no methodology document could be found.
//   - "recognized-convention": a widely-used convention for the country
//     (adhan-js / AlAdhan list it under that country's name) that has NOT
//     been verified against the authority's own tables.
//   - "general-fallback": an international method for places with no
//     national profile.
//
// The reference tables each verified profile is regression-tested against
// live in src/lib/__fixtures__/prayer-reference/ (see
// calculationProfiles.reference.test.ts), with their sources.
import { CalculationMethod, Madhab } from "adhan";
import type { CalculationParameters } from "adhan";
import { countryForTimezone } from "../data/timezoneCountries";

export type CalculationProfileId =
  | "egypt"
  | "umm-al-qura"
  | "diyanet"
  | "jakim"
  | "kemenag"
  | "oman"
  | "jordan"
  | "kuwait"
  | "qatar"
  | "uae"
  | "muis"
  | "karachi-hanafi"
  | "tehran"
  | "isna"
  | "moonsighting"
  | "mwl";

export type ProfileEvidence = "official-documented" | "official-tables-derived" | "recognized-convention" | "general-fallback";

/**
 * How unrounded engine times become displayed minutes.
 *  - "nearest": to the nearest minute (seconds >= 30 round up).
 *  - "up": every time to the next whole minute.
 *  - "conservative": prayer starts to the NEXT minute (never shown before
 *    it has begun), sunrise — the end of Fajr — to the PREVIOUS minute.
 */
export type RoundingRule = "nearest" | "up" | "conservative";

export interface CalculationProfile {
  id: CalculationProfileId;
  /** Who defines the convention this profile implements. */
  authority: string;
  evidence: ProfileEvidence;
  /** Parts NOT stated by the authority but derived from its published tables (empty = none). */
  derived: readonly string[];
  /** A fresh adhan CalculationParameters (callers may mutate it). Rounding is NOT taken from here — see `rounding`. */
  build: () => CalculationParameters;
  rounding: RoundingRule;
  /** Isha interval (minutes after Maghrib) during Ramadan (Umm al-Qura Hijri month 9), when the authority uses one. */
  ramadanIshaIntervalMinutes?: number;
}

function params(build: () => CalculationParameters, configure: (p: CalculationParameters) => void = () => {}): () => CalculationParameters {
  return () => {
    const p = build();
    p.madhab = Madhab.Shafi;
    configure(p);
    return p;
  };
}

function angles(fajrAngle: number, ishaAngle: number, methodAdjustments: Partial<CalculationParameters["methodAdjustments"]> = {}) {
  return params(CalculationMethod.Other, (p) => {
    p.fajrAngle = fajrAngle;
    p.ishaAngle = ishaAngle;
    p.methodAdjustments = { ...p.methodAdjustments, ...methodAdjustments };
  });
}

export const CALCULATION_PROFILES: Readonly<Record<CalculationProfileId, CalculationProfile>> = {
  // Egyptian General Authority of Survey: Fajr 19.5°, Isha 17.5°, Dhuhr at
  // true solar noon. adhan's Egyptian preset adds +1 min to Dhuhr, which the
  // Authority's own tables do not — removed. Verified against the
  // Authority's 2026 Cairo table (esa.gov.eg, 363 days): every prayer
  // within ±1 min.
  egypt: {
    id: "egypt",
    authority: "Egyptian General Authority of Survey",
    evidence: "official-documented",
    derived: [],
    build: params(CalculationMethod.Egyptian, (p) => {
      p.methodAdjustments = { ...p.methodAdjustments, dhuhr: 0 };
    }),
    rounding: "nearest",
  },

  // Umm al-Qura Calendar (KACST): Fajr 18.5°, Isha 90 min after Maghrib —
  // 120 min during Ramadan, exactly as the Calendar's own API publishes
  // (2026: all 30 days of Ramadan). The Calendar rounds prayer starts up
  // and sunrise down; that rounding is not documented anywhere we found,
  // only consistent across its 2026 Riyadh table (365 days) — hence
  // "derived". With it: every prayer within ±1 min all year.
  "umm-al-qura": {
    id: "umm-al-qura",
    authority: "Umm al-Qura Calendar (King Abdulaziz City for Science and Technology)",
    evidence: "official-documented",
    derived: ["rounding: prayer starts rounded up, sunrise rounded down (from the Calendar's 2026 tables)"],
    build: params(CalculationMethod.UmmAlQura),
    rounding: "conservative",
    ramadanIshaIntervalMinutes: 120,
  },

  // Diyanet İşleri Başkanlığı: Fajr 18°, Isha 17°, and the documented
  // temkin minutes — sunrise −7, Dhuhr +5, Asr +4, Maghrib +7, Fajr/Isha 0
  // (vakithesaplama.diyanet.gov.tr/temkin.php) — which adhan's Turkey
  // preset already encodes. Asr is the STANDARD (majority, shadow = 1)
  // rule: Diyanet's own criteria say "cumhurun görüşüne göre", and its
  // tables confirm it — NOT Hanafi. Diyanet tabulates per district, so a
  // single coordinate stays within ±2 min of its Ankara table (396 days).
  diyanet: {
    id: "diyanet",
    authority: "Diyanet İşleri Başkanlığı (Turkey)",
    evidence: "official-documented",
    derived: [],
    build: params(CalculationMethod.Turkey),
    rounding: "nearest",
  },

  // JAKIM (Malaysia): Subuh 18° since the 2019 national fatwa council
  // decision (MKI #116 — the 20° still found in many libraries is the OLD
  // value), Isyak 18°, and JAKIM's 2-minute ihtiyati (precaution) on the
  // prayer starts. Rounding prayer starts up keeps the time from ever
  // showing early (derived from JAKIM's 2026 tables).
  // LIMITATION: JAKIM publishes one time per ZONE, computed at the zone's
  // westernmost reference point (and sunrise at an eastern point), so a
  // single coordinate cannot reproduce it exactly: against the WLY01
  // (Kuala Lumpur) 2026 table, 93-100% of days are within ±1 min and none
  // is beyond ±2.
  jakim: {
    id: "jakim",
    authority: "Jabatan Kemajuan Islam Malaysia (JAKIM)",
    evidence: "official-documented",
    derived: ["rounding: prayer starts rounded up (from JAKIM's 2026 tables)"],
    build: angles(18, 18, { fajr: 2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }),
    rounding: "conservative",
  },

  // Kementerian Agama RI: Subuh 20°, Isya 18°, and an ihtiyati of 2 minutes
  // added to every prayer and subtracted from sunrise — the Ministry's
  // published criteria (as reproduced by Rukyatul Hilal Indonesia). Rounding
  // up is derived from the Ministry's tables. Not modelled: the Ministry's
  // elevation correction for Maghrib/sunrise (none below 250 m), which we
  // cannot know without the location's altitude. Against the 2026 Jakarta
  // table: Fajr/Asr/Isha 94% exact; Dhuhr and Maghrib up to 2 min earlier
  // than the table.
  kemenag: {
    id: "kemenag",
    authority: "Kementerian Agama Republik Indonesia (Kemenag)",
    evidence: "official-documented",
    derived: ["rounding: prayer starts rounded up, sunrise rounded down (from Kemenag's 2026 tables)"],
    build: angles(20, 18, { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }),
    rounding: "conservative",
  },

  // Oman — Ministry of Endowments and Religious Affairs. No methodology
  // document could be found, but the Ministry's own 2026 tables for Muscat,
  // Salalah, Sohar, Nizwa and Sur (5 × 365 days) are reproduced by Fajr 18°,
  // Isha 18° and a fixed 5-minute margin on Dhuhr, Asr and Maghrib: 99-100%
  // of days within ±1 min, in every season and every city. Derived, not
  // documented — so it is labelled that way.
  oman: {
    id: "oman",
    authority: "Ministry of Endowments and Religious Affairs (Oman)",
    evidence: "official-tables-derived",
    derived: ["Fajr 18°", "Isha 18°", "Dhuhr/Asr/Maghrib +5 min"],
    build: angles(18, 18, { dhuhr: 5, asr: 5, maghrib: 5 }),
    rounding: "nearest",
  },

  // Jordan — Ministry of Awqaf. Only the Ministry's December 2025 Amman
  // table was obtainable (no 2026 data could be reached). Its Fajr and Isha
  // fit 18°/18°, which this profile uses. The same table's ~7-minute
  // sunrise/Maghrib margins are deliberately NOT applied: they are
  // undocumented and seen on 10 days only. Maghrib may therefore be several
  // minutes earlier than Jordanian mosques until verified.
  jordan: {
    id: "jordan",
    authority: "Ministry of Awqaf, Islamic Affairs and Holy Places (Jordan)",
    evidence: "official-tables-derived",
    derived: ["Fajr 18°", "Isha 18°"],
    build: angles(18, 18),
    rounding: "nearest",
  },

  // Kuwait: Fajr 18°, Isha 17.5° — the convention adhan-js and AlAdhan both
  // list for Kuwait. Not verified against the Ministry of Awqaf's tables
  // (unreachable during research).
  kuwait: {
    id: "kuwait",
    authority: "Kuwait convention (Ministry of Awqaf — unverified)",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Kuwait),
    rounding: "nearest",
  },

  // Qatar: Fajr 18°, Isha 90 min after Maghrib — the convention adhan-js and
  // AlAdhan both list. Not verified against the Ministry of Awqaf's tables
  // (unreachable during research); no Ramadan rule is applied because none
  // is documented for Qatar.
  qatar: {
    id: "qatar",
    authority: "Qatar convention (Ministry of Awqaf — unverified)",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Qatar),
    rounding: "nearest",
  },

  // UAE: adhan-js's Dubai preset (18.2°/18.2° with its minute margins) —
  // unchanged from before. AlAdhan itself says this is "not an official
  // calculation", and the two libraries disagree on its margins; the
  // General Authority's tables were unreachable. Kept as the best available
  // recognized convention, explicitly unverified.
  uae: {
    id: "uae",
    authority: "UAE convention (General Authority of Islamic Affairs — unverified)",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Dubai),
    rounding: "nearest",
  },

  // Majlis Ugama Islam Singapura: Fajr 20°, Isha 18°, rounded up (adhan's
  // preset). Unverified against MUIS tables.
  muis: {
    id: "muis",
    authority: "Majlis Ugama Islam Singapura (MUIS)",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Singapore),
    rounding: "up",
  },

  // South Asia: University of Islamic Sciences, Karachi (18°/18°) with the
  // Hanafi Asr (shadow = 2) used by the majority there.
  "karachi-hanafi": {
    id: "karachi-hanafi",
    authority: "University of Islamic Sciences, Karachi",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Karachi, (p) => {
      p.madhab = Madhab.Hanafi;
    }),
    rounding: "nearest",
  },

  // Iran: Institute of Geophysics, University of Tehran (17.7°/14°, Maghrib 4.5°).
  tehran: {
    id: "tehran",
    authority: "Institute of Geophysics, University of Tehran",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.Tehran),
    rounding: "nearest",
  },

  // North America: Islamic Society of North America (15°/15°).
  isna: {
    id: "isna",
    authority: "Islamic Society of North America (ISNA)",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.NorthAmerica),
    rounding: "nearest",
  },

  // United Kingdom: Moonsighting Committee Worldwide (season-adjusted twilight).
  moonsighting: {
    id: "moonsighting",
    authority: "Moonsighting Committee Worldwide",
    evidence: "recognized-convention",
    derived: [],
    build: params(CalculationMethod.MoonsightingCommittee),
    rounding: "nearest",
  },

  // Everywhere else: Muslim World League (18°/17°), the most widely used
  // international method.
  mwl: {
    id: "mwl",
    authority: "Muslim World League",
    evidence: "general-fallback",
    derived: [],
    build: params(CalculationMethod.MuslimWorldLeague),
    rounding: "nearest",
  },
};

// ISO 3166-1 alpha-2 → profile. Chosen by COUNTRY (never by "nearest
// reference city", which assigns e.g. Germany to France's 12° method).
// Any country not listed uses the Muslim World League fallback.
export const COUNTRY_PROFILE: Readonly<Record<string, CalculationProfileId>> = {
  EG: "egypt",
  SA: "umm-al-qura",
  TR: "diyanet",
  MY: "jakim",
  ID: "kemenag",
  OM: "oman",
  JO: "jordan",
  KW: "kuwait",
  QA: "qatar",
  AE: "uae",
  SG: "muis",
  BN: "muis",
  PK: "karachi-hanafi",
  IN: "karachi-hanafi",
  BD: "karachi-hanafi",
  AF: "karachi-hanafi",
  IR: "tehran",
  US: "isna",
  CA: "isna",
  GB: "moonsighting",
};

export const FALLBACK_PROFILE_ID: CalculationProfileId = "mwl";

/** The profile for a place: its country, else the country its timezone identifies, else the fallback. */
export function resolveCalculationProfile(location: { country?: string; timezone?: string }): CalculationProfile {
  const country = (location.country ?? countryForTimezone(location.timezone))?.toUpperCase();
  return CALCULATION_PROFILES[(country && COUNTRY_PROFILE[country]) || FALLBACK_PROFILE_ID];
}
