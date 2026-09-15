// Pure "has the device's context genuinely moved away from the active
// location" logic — no React, no timers, no Capacitor, so it's trivially
// unit-testable. See useLocationChangeDetector.ts for the hook that reads
// live state and calls this on every check.
//
// TWO independent signals, either of which alone can indicate a genuine
// relocation:
//
//   1. An IANA timezone mismatch (the original Step 5 signal).
//   2. A SIGNIFICANT GPS distance from the active location's own
//      coordinates (added in this correction) — needed because two
//      genuinely different locations can share the same UTC offset for
//      part of the year (e.g. Kuwait and Egypt both sit at UTC+2 during
//      Egypt's non-DST months), so timezone alone would miss that
//      relocation entirely.
//
// `currentCoordinates` is OPTIONAL and, when present, comes from a
// single, on-demand geolocation read taken at foreground-return (see
// useLocationChangeDetector.ts's own doc comment) — this module has no
// opinion on how it was obtained and never triggers a fetch itself; when
// it's absent (permission denied/unavailable/timed out that cycle), only
// the timezone signal is evaluated, exactly as this file behaved before
// this correction.
import type { ActiveLocationRecord } from "./locationSettings";
import type { Coordinates } from "./prayerTimes";

// Earth's mean radius in km — standard constant for a haversine estimate,
// accurate to well under 1% at these distances, more than sufficient for
// a "is this a significant relocation" decision (not a navigation tool).
const EARTH_RADIUS_KM = 6371;

// A "significant" relocation threshold for prayer-time purposes: 100 km.
// Documented reasoning, not an arbitrary number:
//   - Prayer times (Fajr/Isha angle-based twilight, Dhuhr solar noon)
//     shift by only a few minutes across 100 km at most inhabited
//     latitudes — comparable to the variation ordinary method/rounding
//     differences already produce (see prayerTimes.ts's own accuracy
//     notes), so staying under this threshold never meaningfully affects
//     accuracy.
//   - Ordinary GPS noise/drift is a few meters up to low single-digit km
//     even in poor conditions, and normal movement within a single city/
//     metro area can span 30-50 km (e.g. commuting across a large city)
//     — both stay comfortably under 100 km, so neither ever triggers a
//     false prompt.
//   - A genuine cross-region/cross-country relocation is almost always
//     far larger: the worked example this correction was written for,
//     Kuwait City to Cairo, is ~1,900 km — nearly 20x this threshold.
export const SIGNIFICANT_MOVE_KM = 100;

// A much smaller radius used ONLY to decide whether a fresh GPS fix still
// represents "the same already-prompted-about displacement" rather than a
// further, separately significant move — e.g. the user is still
// somewhere within the same general area they were already prompted
// about, drifting by a few km between repeated foreground checks.
// Deliberately much smaller than SIGNIFICANT_MOVE_KM: this only needs to
// recognize "obviously still the same trip", not decide significance —
// that's SIGNIFICANT_MOVE_KM's job.
const SAME_PROMPT_RADIUS_KM = 20;

function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocationChangeCheckInput {
  /** The currently active location's own record (manual, device, or
   *  fallback) — compared against, never mutated. */
  activeLocation: ActiveLocationRecord;
  /** A freshly-read device timezone (see dateTime.ts's getDeviceTimeZone). */
  currentTimezone: string;
  /** A freshly-read device GPS coordinate, when one was obtainable this
   *  check (see this file's own header comment). */
  currentCoordinates?: Coordinates;
  /** The timezone value the user was already prompted about last time
   *  (see locationSettings.ts's lastPromptedTimezone) — suppresses a
   *  repeat prompt for the exact same still-unresolved timezone mismatch. */
  lastPromptedTimezone: string | null;
  /** The GPS coordinates the user was already prompted about last time
   *  for a distance-triggered mismatch (see locationSettings.ts's
   *  lastPromptedCoordinates) — same idea, for the distance signal. */
  lastPromptedCoordinates: Coordinates | null;
}

export type LocationChangeCheckResult =
  | { kind: "no-change" }
  /** Back in sync on EVERY signal that previously had a dismissal
   *  recorded — the caller should clear both lastPromptedTimezone and
   *  lastPromptedCoordinates so a later, genuinely new occurrence of
   *  either can re-prompt. */
  | { kind: "back-in-sync" }
  | { kind: "already-prompted" }
  | { kind: "genuine-change"; detectedTimezone: string; detectedCoordinates?: Coordinates; reason: "timezone" | "distance" };

export function checkLocationChange(input: LocationChangeCheckInput): LocationChangeCheckResult {
  const { activeLocation, currentTimezone, currentCoordinates, lastPromptedTimezone, lastPromptedCoordinates } = input;

  const timezoneMismatch = currentTimezone !== activeLocation.timezone;
  const distanceKm = currentCoordinates
    ? haversineDistanceKm(currentCoordinates, { latitude: activeLocation.latitude, longitude: activeLocation.longitude })
    : null;
  const significantMove = distanceKm !== null && distanceKm > SIGNIFICANT_MOVE_KM;

  if (!timezoneMismatch && !significantMove) {
    const hadPriorDismissal = lastPromptedTimezone !== null || lastPromptedCoordinates !== null;
    return hadPriorDismissal ? { kind: "back-in-sync" } : { kind: "no-change" };
  }

  // Something is genuinely different from the active location on at
  // least one signal. A prompt is suppressed only when EVERY signal that
  // actually fired has already been prompted about — a fresh mismatch on
  // one signal is still genuinely new information even if the other
  // signal's mismatch (if any) was already dismissed.
  const timezoneAlreadyHandled = !timezoneMismatch || currentTimezone === lastPromptedTimezone;
  const distanceAlreadyHandled =
    !significantMove ||
    (currentCoordinates !== undefined &&
      lastPromptedCoordinates !== null &&
      haversineDistanceKm(currentCoordinates, lastPromptedCoordinates) <= SAME_PROMPT_RADIUS_KM);

  if (timezoneAlreadyHandled && distanceAlreadyHandled) {
    return { kind: "already-prompted" };
  }

  return {
    kind: "genuine-change",
    detectedTimezone: currentTimezone,
    detectedCoordinates: currentCoordinates,
    reason: timezoneMismatch ? "timezone" : "distance",
  };
}
