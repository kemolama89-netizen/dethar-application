// DITHAR — retiring the old manual calculation overrides.
//
// Earlier versions let users pick a calculation method and madhab in
// Settings and stored that choice under this key. Prayer times are now
// chosen automatically from the location's country (calculationProfiles.ts)
// and nothing reads this key any more, so a stale choice can never override
// the automatic profile. It is also deleted on startup so it does not linger
// in storage.
export const LEGACY_CALCULATION_SETTINGS_KEY = "dithar:calculation:settings:v1";

export function discardLegacyCalculationOverrides(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(LEGACY_CALCULATION_SETTINGS_KEY);
  } catch {
    // Storage unavailable — nothing reads the key anyway.
  }
}
