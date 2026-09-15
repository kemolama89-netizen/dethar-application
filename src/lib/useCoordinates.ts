import { useEffect, useState } from "react";
import type { Coordinates } from "./prayerTimes";
import { getDeviceTimeZone } from "./dateTime";
import { loadLocationSettings, resolveActiveLocationRecord, saveLastActiveLocation, KUWAIT_FALLBACK_LOCATION } from "./locationSettings";
import type { ActiveLocationRecord, LocationSource } from "./locationSettings";
import { estimateCountryFromCoordinates } from "./reverseGeocode";

export interface CoordinatesState {
  coordinates: Coordinates;
  /** The IANA zone to FORMAT this location's calculated times in — paired
   *  with `coordinates`, never taken from the device's own clock/timezone
   *  independently of which coordinates are actually in effect (see the
   *  comment below). */
  timezone: string;
  /** "manual" — a persisted, EXPLICIT city choice, sticky until the user
   *  changes or clears it (see locationSettings.ts). "device" — a live
   *  geolocation fix, only used when no manual override exists. "fallback"
   *  — Kuwait City, used only when neither of the above is available. */
  source: LocationSource;
  /** ISO 3166-1 alpha-2 — known for "manual" and "fallback" from their own
   *  stored/fixed record. For "device", populated on a best-effort basis
   *  by reverseGeocode.ts's offline nearest-bundled-city estimate (Step
   *  7) — `undefined` when that fix is too far from every bundled city to
   *  trust (see MAX_MATCH_DISTANCE_KM), in which case
   *  resolveCalculationSettings.ts's own country tier just falls through
   *  to the Muslim World League default, exactly as it did before Step 7
   *  for every device fix. Consumed by PrayerTimesPanel.tsx via
   *  resolveCalculationSettings (Step 6's wiring). */
  countryCode?: string;
  cityNameAr?: string;
  cityNameEn?: string;
}

function recordToState(record: ActiveLocationRecord): CoordinatesState {
  return {
    coordinates: { latitude: record.latitude, longitude: record.longitude },
    timezone: record.timezone,
    source: record.source,
    countryCode: record.countryCode,
    cityNameAr: record.cityNameAr,
    cityNameEn: record.cityNameEn,
  };
}

// The app's one source of the coordinates (and their matching timezone)
// Prayer Times calculates for — implementing the full Layer 1 hierarchy:
//
//   1. A persisted MANUAL city selection, if one exists — STICKY: once
//      the user has explicitly picked a city (see LocationSettingsView.tsx
//      / locationSettings.ts), it stays active even if a device GPS fix
//      later becomes available. Never silently replaced by GPS; only an
//      explicit user action (picking a different city, or clearing the
//      override) changes it.
//   2. Otherwise, a live device GPS fix, when the browser's Geolocation
//      API grants one.
//   3. Otherwise, the Kuwait City fallback (unchanged from before this
//      step) — paired with Kuwait's own fixed zone, NOT the device's
//      reported timezone: without a real fix the device could physically
//      be anywhere (this exact mismatch showed up in earlier testing — a
//      dev container reporting UTC while calculating for Kuwait produced
//      times off by the UTC+3 gap).
//
// IP geolocation is deliberately NOT implemented here (reserved as a
// later, lower-priority tertiary fallback only, per the approved plan).
//
// Initial state comes from resolveActiveLocationRecord() (manual, else
// the last CONFIRMED location of any source, else Kuwait) — a better
// first guess than always flashing back to Kuwait on every app restart
// for a returning device-GPS user, while still never itself triggering a
// geolocation request (only the effect below does that). Whatever
// actually becomes active here (a device fix or the Kuwait fallback —
// NOT a manual pick, which is already persisted by whoever set it) is
// also recorded via saveLastActiveLocation, so a later step can compare
// "the last location we confirmed" against a freshly-read device
// timezone to detect a genuine relocation, without needing to duplicate
// any of this hook's own resolution logic.
export function useCoordinates(): CoordinatesState {
  const [state, setState] = useState<CoordinatesState>(() => recordToState(resolveActiveLocationRecord()));

  useEffect(() => {
    // A manual selection is sticky — skip requesting geolocation
    // entirely rather than fetching a fix that would never be used.
    if (loadLocationSettings().manualLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      saveLastActiveLocation(KUWAIT_FALLBACK_LOCATION);
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        // Re-check here too: a manual selection could have been made
        // WHILE this async geolocation request was in flight (e.g. the
        // user picked a city in Settings from another mounted instance
        // before this one's fix ever resolved) — never overwrite it.
        if (loadLocationSettings().manualLocation) return;
        const record: ActiveLocationRecord = {
          source: "device",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: getDeviceTimeZone(),
          // Step 7: best-effort offline country estimate for this fix —
          // `undefined` when too far from every bundled city (see
          // reverseGeocode.ts), same as before this step.
          countryCode: estimateCountryFromCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        };
        saveLastActiveLocation(record);
        setState(recordToState(record));
      },
      () => {
        // Denied, unavailable, or timed out — stay on the Kuwait
        // fallback (already the initial state, unless a previous device
        // fix was the last confirmed location — see
        // resolveActiveLocationRecord) and record it as such.
        if (!cancelled) saveLastActiveLocation(KUWAIT_FALLBACK_LOCATION);
      },
      { maximumAge: 30 * 60 * 1000, timeout: 10_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
