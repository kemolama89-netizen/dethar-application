// DITHAR — persisted location state.
//
// Step 4 of the global hybrid prayer-time architecture. Completely
// separate storage from prayerReminderSettings.ts/notificationSettings.ts
// (same isolation rule those files already document — a change here must
// never affect reminders, and vice versa).
//
// Two independent things are persisted here, both keyed under one
// storage object:
//
//   - `manualLocation`: the user's EXPLICIT, STICKY city choice. Once
//     set, it stays the active location — see useCoordinates.ts — even
//     if a device GPS fix later becomes available; it is never silently
//     replaced. `null` means "no manual override": the automatic
//     device-GPS -> Kuwait-fallback hierarchy applies instead. Cleared
//     only by an explicit user action (selecting a different city, or an
//     explicit "use my location automatically" reset).
//
//   - `lastActiveLocation`: whatever the AUTOMATIC hierarchy (device GPS,
//     or the Kuwait fallback) last produced — deliberately NEVER touched
//     by a manual selection (see saveManualLocation's own doc comment for
//     why that distinction matters: conflating the two was a real bug
//     caught during testing, where clearing a manual override appeared to
//     do nothing because it fell through to the very city just cleared).
//     Two jobs: (1) a better initial guess than Kuwait when the app
//     restarts with no manual override and a previous automatic
//     resolution exists, and (2) a LATER step can compare "the timezone/
//     country we last automatically confirmed" against a freshly-read
//     device timezone to detect a genuine relocation, without that later
//     step needing to implement any of its own location bookkeeping.
import { KUWAIT_CITY_COORDINATES, KUWAIT_TIMEZONE } from "./prayerTimes";
import type { Coordinates } from "./prayerTimes";

const STORAGE_KEY = "dithar:location:settings:v1";

export type LocationSource = "device" | "manual" | "fallback";

export interface ActiveLocationRecord {
  source: LocationSource;
  latitude: number;
  longitude: number;
  timezone: string;
  /** ISO 3166-1 alpha-2 — known for "manual" (the picked city's own
   *  record) and "fallback" (Kuwait); unknown (omitted) for a raw
   *  "device" GPS fix, since no reverse-geocoding exists yet. */
  countryCode?: string;
  cityNameAr?: string;
  cityNameEn?: string;
}

export interface LocationSettingsData {
  manualLocation: ActiveLocationRecord | null;
  lastActiveLocation: ActiveLocationRecord | null;
  /** The device timezone value the user was last PROMPTED about (and
   *  either confirmed or declined) for a detected location change — see
   *  useLocationChangeDetector.ts. `null` means there's no dismissal to
   *  suppress a repeat prompt for. Set on confirm/decline; cleared the
   *  moment the device timezone matches `lastActiveLocation` again (see
   *  useLocationChangeDetector.ts's own check), so a LATER, genuinely new
   *  occurrence of that same mismatch re-prompts instead of being
   *  silently suppressed forever by a stale old dismissal. */
  lastPromptedTimezone: string | null;
  /** The device GPS coordinates the user was last PROMPTED about for a
   *  GPS-distance-triggered location change (see
   *  useLocationChangeDetector.ts / locationChangeDetection.ts's
   *  SIGNIFICANT_MOVE_KM) — a SEPARATE signal from
   *  `lastPromptedTimezone`, needed because two genuinely different
   *  locations can share the same UTC offset for part of the year (e.g.
   *  Kuwait and Egypt), so a timezone-only comparison would miss that
   *  relocation entirely. `null` means no GPS-based dismissal to
   *  suppress a repeat prompt for; cleared once a fresh fix falls back
   *  within the insignificant-drift range of `lastActiveLocation` again,
   *  for the same "allow a later genuinely new recurrence to re-prompt"
   *  reason `lastPromptedTimezone` is cleared. */
  lastPromptedCoordinates: Coordinates | null;
}

const DEFAULT_SETTINGS: LocationSettingsData = {
  manualLocation: null,
  lastActiveLocation: null,
  lastPromptedTimezone: null,
  lastPromptedCoordinates: null,
};

// A coordinate pair is only usable if both parts are real, finite numbers
// on the globe — a stored NaN/Infinity/out-of-range value (from a corrupt
// or hand-edited entry) must count as "no saved location" rather than being
// fed into the prayer-time calculation.
function isValidLatLon(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isActiveLocationRecord(value: unknown): value is ActiveLocationRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<ActiveLocationRecord>;
  return (
    (r.source === "device" || r.source === "manual" || r.source === "fallback") &&
    isValidLatLon(r.latitude, r.longitude) &&
    typeof r.timezone === "string" &&
    r.timezone !== ""
  );
}

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<Coordinates>;
  return isValidLatLon(c.latitude, c.longitude);
}

export function loadLocationSettings(): LocationSettingsData {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const obj = parsed as Partial<LocationSettingsData>;
    return {
      manualLocation: isActiveLocationRecord(obj.manualLocation) ? obj.manualLocation : null,
      lastActiveLocation: isActiveLocationRecord(obj.lastActiveLocation) ? obj.lastActiveLocation : null,
      lastPromptedTimezone: typeof obj.lastPromptedTimezone === "string" ? obj.lastPromptedTimezone : null,
      lastPromptedCoordinates: isCoordinates(obj.lastPromptedCoordinates) ? obj.lastPromptedCoordinates : null,
    };
  } catch {
    // Corrupt data or storage unavailable — start clean rather than
    // throwing; falls through to the automatic device-GPS/Kuwait-fallback
    // hierarchy exactly as if no manual location had ever been set.
    return { ...DEFAULT_SETTINGS };
  }
}

function save(data: LocationSettingsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Best-effort only.
  }
}

// Sets (or, passed `null`, clears) the sticky manual override.
// Deliberately does NOT touch `lastActiveLocation` — that field means
// specifically "the last location the AUTOMATIC (device-GPS/Kuwait-
// fallback) hierarchy produced" (see saveLastActiveLocation and
// resolveActiveLocationRecord's own doc comments), so a manual pick must
// never contaminate it. Getting this wrong was a real bug caught during
// manual testing: if selecting a manual city also overwrote
// `lastActiveLocation`, then clearing that manual override later would
// make resolveActiveLocationRecord fall through to the very city the
// user just asked to stop using, instead of genuinely returning to
// "automatic" — "Use automatic location" would have silently done
// nothing.
export function saveManualLocation(location: ActiveLocationRecord | null): void {
  const current = loadLocationSettings();
  save({ ...current, manualLocation: location });
}

// Records whatever became active WITHOUT touching the manual override —
// used when a device GPS fix (or the Kuwait fallback) becomes active in
// the absence of a manual selection.
export function saveLastActiveLocation(location: ActiveLocationRecord): void {
  const current = loadLocationSettings();
  save({ ...current, lastActiveLocation: location });
}

// Records (or, passed `null`, clears) which device-timezone mismatch the
// user was last prompted about — see useLocationChangeDetector.ts.
export function saveLastPromptedTimezone(value: string | null): void {
  const current = loadLocationSettings();
  save({ ...current, lastPromptedTimezone: value });
}

// Records (or, passed `null`, clears) which device GPS coordinates the
// user was last prompted about for a GPS-distance-triggered change — see
// useLocationChangeDetector.ts and LocationSettingsData.lastPromptedCoordinates's
// own doc comment for why this is a separate signal from
// saveLastPromptedTimezone.
export function saveLastPromptedCoordinates(value: Coordinates | null): void {
  const current = loadLocationSettings();
  save({ ...current, lastPromptedCoordinates: value });
}

// Final fallback when neither a manual selection nor any previously
// confirmed location exists — unchanged from before this step's location
// hierarchy was introduced (the app's original, single hardcoded
// default).
export const KUWAIT_FALLBACK_LOCATION: ActiveLocationRecord = {
  source: "fallback",
  latitude: KUWAIT_CITY_COORDINATES.latitude,
  longitude: KUWAIT_CITY_COORDINATES.longitude,
  timezone: KUWAIT_TIMEZONE,
  countryCode: "KW",
  cityNameAr: "الكويت",
  cityNameEn: "Kuwait",
};

// Records the Kuwait fallback as the last-active location ONLY when the
// app has nothing better persisted — i.e. neither a manual selection nor
// any previously confirmed (valid) location exists. A failed/denied/
// timed-out geolocation request, or a runtime with no geolocation at all,
// must never overwrite a real earlier location with Kuwait: a single
// indoor GPS timeout would otherwise make every later launch calculate
// prayer times for Kuwait. See useCoordinates.ts.
export function saveFallbackLocationIfNoneSaved(): void {
  const { manualLocation, lastActiveLocation } = loadLocationSettings();
  if (manualLocation || lastActiveLocation) return;
  saveLastActiveLocation(KUWAIT_FALLBACK_LOCATION);
}

// Synchronous, side-effect-free resolution of "what location record is
// currently active", from PERSISTED state alone: manual override, else
// the last AUTOMATICALLY confirmed location (a previous device GPS fix,
// or the Kuwait fallback — never a manual pick, see saveManualLocation's
// own doc comment — a better initial guess than jumping straight back to
// Kuwait on every app restart), else the Kuwait fallback outright.
//
// Deliberately does NOT trigger a live geolocation request — see
// useCoordinates.ts for the one hook that does that, and is the only
// thing in the app that should. This function is for synchronous reads/
// initial-render guesses (useCoordinates's own initial state, and
// Settings > Location's live display) that must never themselves prompt
// for GPS permission just by rendering.
export function resolveActiveLocationRecord(): ActiveLocationRecord {
  const { manualLocation, lastActiveLocation } = loadLocationSettings();
  return manualLocation ?? lastActiveLocation ?? KUWAIT_FALLBACK_LOCATION;
}

// TEST/DEV-ONLY: wipes this module's ENTIRE persisted state (manual
// override, last automatic resolution, both change-detector prompt
// dismissals) in one atomic reset. Afterwards, resolveActiveLocationRecord()
// returns the Kuwait fallback and — crucially — useCoordinates.ts's mount
// effect (gated ONLY by `manualLocation`, see its own doc comment) calls
// navigator.geolocation.getCurrentPosition() again on the next mount,
// exactly as it would on a genuine first launch.
//
// Deliberately does NOT and CANNOT reset the browser's own remembered
// Permissions-API decision for this origin, nor (on the native Capacitor
// Android build) the OS's own granted/denied permission record — neither
// is readable or writable from page JS, by design (see MDN's Permissions
// API / Android's runtime permission model). Simulating a truly fresh
// install also requires clearing THAT layer separately:
//   - Web preview: the browser's own site-settings UI (chrome://settings
//     /content/siteDetails?site=<origin>) → reset the Location permission
//     for this origin, or just test in a fresh Incognito/private window.
//   - Native Android: Settings → Apps → DITHAR → Permissions → Location
//     → remove, or `adb shell pm reset-permissions`, or a full uninstall/
//     reinstall.
// This function only ever touches THIS app's own localStorage entry —
// never anything OS/browser-level — so it's safe to call from a real
// (non-automated) testing session with no risk of touching prod data
// (there is no prod backend; this key is the only place this state
// lives).
export function resetLocationSettingsForTesting(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only, matching this file's other storage access.
  }
}

// DEV-ONLY console convenience wrapper around the reset above — same
// import.meta.env.DEV gating (and complete production dead-code
// elimination once Vite statically inlines the constant) already
// established by useVoiceTasbeeh.ts's window.__ditharVoiceDebugLog. No
// user-facing UI of any kind; call it from the browser DevTools console
// while running the dev server (`__ditharResetLocationForTesting()`),
// then reload the page to see the app behave like a first launch.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __ditharResetLocationForTesting?: () => void }).__ditharResetLocationForTesting = () => {
    resetLocationSettingsForTesting();
    console.log("[dithar:dev] Location settings cleared. Reload the page to simulate a first launch.");
  };
}
