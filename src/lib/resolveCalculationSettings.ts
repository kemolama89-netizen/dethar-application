// DITHAR — the centralized calculation-SETTINGS resolver.
//
// Step 3 of the global hybrid prayer-time architecture. This is the ONE
// place that turns "where is the user" + "what has the user explicitly
// chosen" into a ready-to-use adhan `CalculationParameters` — method,
// madhab, high-latitude rule, and polar-circle resolution, all resolved
// here, never scattered across components.
//
// WIRED INTO THE LIVE APP since Step 6: PrayerTimesPanel.tsx now calls this
// directly (with the user's Settings > Calculation Method overrides — see
// calculationSettings.ts) instead of its old local `kuwaitCalculationParams()`.
// `ActiveLocation.country` is populated from a manually-selected city's own
// stored country, the Kuwait fallback's fixed "KW", or — since Step 7 — an
// offline nearest-bundled-city estimate for a raw device GPS fix (see
// reverseGeocode.ts); it stays `undefined` only when a device fix is too
// far from every bundled city to estimate, in which case this resolver's
// own country tier already falls through to the Muslim World League
// default. The Kuwait fallback's own country ("KW") resolves to the exact
// same CalculationMethod.Kuwait()+Shafi'i params the old hardcoded path
// used — see this file's own "Kuwait preservation" tests — so today's
// default Kuwait behavior is unchanged.
//
// Location resolution stays STRICTLY separate from this: `ActiveLocation`
// below is an INPUT this module consumes, never something it derives —
// useCoordinates.ts, locationSettings.ts (persisted manual city), and
// reverseGeocode.ts (the device-fix country estimate) remain the only
// sources of where the user is.
import { Coordinates as AdhanCoordinates, HighLatitudeRule, Madhab, PolarCircleResolution } from "adhan";
import type { CalculationParameters } from "adhan";
import type { Coordinates } from "./prayerTimes";
import type { CalculationMethodId } from "./calculationMethods";
import { getCalculationParameters } from "./calculationMethods";
import { getCalculationMethodForCountry } from "./countryCalculationMethod";
import { getMadhabForCountry } from "./countryMadhab";

// adhan's own Madhab runtime values are the lowercase strings "shafi"/
// "hanafi" (see node_modules/adhan/lib/esm/Madhab.js) — reused directly
// rather than inventing a parallel "Shafi"/"Hanafi" enum that would need
// its own translation step.
export type MadhabId = "shafi" | "hanafi";

export interface ActiveLocation {
  coordinates: Coordinates;
  /** ISO 3166-1 alpha-2 country code, when known — `undefined` until a
   *  later step resolves it (reverse geocoding, or a manually-selected
   *  city's own stored country). Drives calculation-method resolution
   *  ONLY; the astronomical calculation itself always uses `coordinates`,
   *  never a country's capital or any other proxy for the real location. */
  country?: string;
}

export interface CalculationOverrides {
  /** Explicit user method choice, or `undefined` for "Automatic" (resolve
   *  from `location.country`). */
  method?: CalculationMethodId;
  /** Explicit user madhab choice, or `undefined` for "Automatic" (resolve
   *  from the country's Asr-convention default — see countryMadhab.ts). */
  madhab?: MadhabId;
}

// The three-tier hierarchies, applied independently of each other (a
// method override doesn't imply a madhab override, and vice versa):
//
//   method: overrides.method -> COUNTRY_CALCULATION_METHOD[country] -> MuslimWorldLeague
//   madhab: overrides.madhab -> COUNTRY_MADHAB[country]             -> "shafi" (see countryMadhab.ts)
//
// High-latitude rule / polar-circle resolution are resolved here too
// (from `location.coordinates`, via the SAME adhan primitives already
// proven in prayerTimes.ts's calculatePrayerTimes — HighLatitudeRule.
// recommended(), never a custom formula, and PolarCircleResolution.
// AqrabBalad as the same documented default) so this function's return
// value is a COMPLETE, ready-to-use CalculationParameters on its own,
// testable in isolation. calculatePrayerTimes itself is UNCHANGED by this
// step and still applies the identical safety net unconditionally to
// whatever params it's given — so calling it with this resolver's output
// re-derives the same two values again. That's intentional, harmless
// redundancy (deterministic given the same coordinates), not a bug: it
// means calculatePrayerTimes keeps its own existing safety guarantee for
// ANY caller, including ones that never went through this resolver.
export function resolveCalculationSettings(
  location: ActiveLocation,
  overrides: CalculationOverrides = {},
): CalculationParameters {
  const methodId = overrides.method ?? getCalculationMethodForCountry(location.country);
  const params = getCalculationParameters(methodId);

  const madhabId = overrides.madhab ?? getMadhabForCountry(location.country);
  params.madhab = madhabId === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;

  const adhanCoordinates = new AdhanCoordinates(location.coordinates.latitude, location.coordinates.longitude);
  params.highLatitudeRule = HighLatitudeRule.recommended(adhanCoordinates);
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad;

  return params;
}
