// DITHAR — persisted calculation-method / madhab user overrides.
//
// Step 6 of the global hybrid prayer-time architecture: Settings > Calculation
// Method lets the user EXPLICITLY override the method and/or madhab that
// resolveCalculationSettings.ts (Step 3) would otherwise derive automatically
// from the active location's country (see countryCalculationMethod.ts). This
// module is ONLY the persistence layer for that override — completely
// separate storage from locationSettings.ts (this step must never touch
// location resolution, GPS behavior, manual-city selection, or the Step 5
// location-change detector) and from notificationSettings.ts/
// prayerReminderSettings.ts (same "own storage key per feature" isolation
// rule those already document).
//
// Method and madhab are independently persisted: overriding one never
// implies or touches the other — mirrors resolveCalculationSettings.ts's
// own independent two-tier hierarchies.
import type { CalculationMethodId } from "./calculationMethods";
import { SUPPORTED_CALCULATION_METHODS } from "./calculationMethods";
import type { CalculationOverrides, MadhabId } from "./resolveCalculationSettings";

const STORAGE_KEY = "dithar:calculation:settings:v1";

interface StoredCalculationSettings {
  /** `null` means "no override" — Automatic (resolve from country). */
  methodOverride: CalculationMethodId | null;
  /** `null` means "no override" — Automatic (regional default). */
  madhabOverride: MadhabId | null;
}

const DEFAULT_SETTINGS: StoredCalculationSettings = { methodOverride: null, madhabOverride: null };

function isCalculationMethodId(value: unknown): value is CalculationMethodId {
  return typeof value === "string" && (SUPPORTED_CALCULATION_METHODS as readonly string[]).includes(value);
}

function isMadhabId(value: unknown): value is MadhabId {
  return value === "shafi" || value === "hanafi";
}

function load(): StoredCalculationSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const obj = parsed as Partial<StoredCalculationSettings>;
    return {
      methodOverride: isCalculationMethodId(obj.methodOverride) ? obj.methodOverride : null,
      madhabOverride: isMadhabId(obj.madhabOverride) ? obj.madhabOverride : null,
    };
  } catch {
    // Corrupt data or storage unavailable — start clean rather than
    // throwing; falls through to "Automatic" for both fields, exactly as
    // if no override had ever been set.
    return { ...DEFAULT_SETTINGS };
  }
}

function save(data: StoredCalculationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Best-effort only — same convention as locationSettings.ts.
  }
}

// Returns overrides shaped exactly for resolveCalculationSettings.ts's own
// `CalculationOverrides` — `undefined` (not `null`) for "no override on
// this field", since `??` inside resolveCalculationSettings is what
// actually implements "fall through to the automatic tier".
export function loadCalculationOverrides(): CalculationOverrides {
  const { methodOverride, madhabOverride } = load();
  return {
    method: methodOverride ?? undefined,
    madhab: madhabOverride ?? undefined,
  };
}

// Sets (or, passed `null`, clears back to "Automatic") the user's explicit
// calculation-method choice. Never touches the madhab override.
export function saveCalculationMethodOverride(method: CalculationMethodId | null): void {
  const current = load();
  save({ ...current, methodOverride: method });
}

// Sets (or, passed `null`, clears back to "Automatic") the user's explicit
// madhab choice. Never touches the method override.
export function saveMadhabOverride(madhab: MadhabId | null): void {
  const current = load();
  save({ ...current, madhabOverride: madhab });
}
