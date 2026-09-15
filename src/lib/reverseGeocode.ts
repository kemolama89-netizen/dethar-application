// DITHAR — offline coordinate -> country estimation.
//
// Step 7 of the global hybrid prayer-time architecture. resolveCalculationSettings.ts
// (Step 3) already resolves a country-appropriate calculation-method
// default, but until now that only ever ran for a manually-selected city or
// the Kuwait fallback — both already carry their own `countryCode` (see
// locationSettings.ts's ActiveLocationRecord). A raw device GPS fix has
// NEVER carried one (see useCoordinates.ts's own doc comment: "unknown
// (omitted) for a raw device GPS fix — no reverse-geocoding exists yet"),
// so a device-GPS user always fell through to the neutral Muslim World
// League global default regardless of where they actually are. This module
// closes that specific gap.
//
// Deliberately entirely OFFLINE — reuses the SAME bundled CITIES dataset
// (see cities.ts's own doc comment: "no network call, no API key, works
// with no connectivity... this project's existing 'no external service'
// philosophy") rather than calling a real reverse-geocoding API: no new
// network dependency, no coordinates ever leave the device, and no new
// permission/consent surface — the same constraint the wider plan has
// already set elsewhere (the Step 5 spec's own "Do not add IP
// geolocation": a live third-party lookup is the same category of thing).
//
// APPROXIMATE BY DESIGN — nearest bundled city's own country, never an
// authoritative boundary/polygon lookup (this app bundles no country
// border geometry, and adding one is out of scope here). This is
// proportionate to the precision this codebase already accepts for
// country -> method resolution (see countryCalculationMethod.ts's own
// "reasonable, widely-used defaults... NOT independently verified"
// disclaimer) — being right about the broad region most of the time is
// enough to pick a calculation method, never a claim of exact
// administrative-boundary accuracy.
import { CITIES } from "../data/cities";
import type { Coordinates } from "./prayerTimes";

// Earth's mean radius in km — the same haversine estimate
// locationChangeDetection.ts already uses for its own, unrelated
// significant-move check. Duplicated here rather than imported: the two
// modules solve genuinely different problems (travel detection vs.
// nearest-city country estimation) and each stays self-contained and
// independently testable rather than coupled through a shared import for
// what is, on each side, a single small trig formula.
const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Beyond this distance from EVERY bundled city, the nearest match is too
// far away to trust as "probably the same country" — returning
// `undefined` here is always at least as safe as a wrong guess: the
// caller (useCoordinates.ts) already falls through to the exact same
// Muslim World League global default this whole gap produced before this
// step, so an unresolved country is never a regression, only a missed
// improvement for a location too far from this bundle's sparse (52-city)
// coverage.
export const MAX_MATCH_DISTANCE_KM = 300;

// Returns the ISO 3166-1 alpha-2 country code of the CLOSEST bundled city
// to `coordinates`, or `undefined` when even the closest one is farther
// than MAX_MATCH_DISTANCE_KM away (see its own doc comment). A pure,
// synchronous, offline lookup — no I/O, safe to call on every device GPS
// fix.
export function estimateCountryFromCoordinates(coordinates: Coordinates): string | undefined {
  let closestCountry: string | undefined;
  let closestDistanceKm = Infinity;
  for (const city of CITIES) {
    const distanceKm = haversineDistanceKm(coordinates, { latitude: city.latitude, longitude: city.longitude });
    if (distanceKm < closestDistanceKm) {
      closestDistanceKm = distanceKm;
      closestCountry = city.countryCode;
    }
  }
  return closestDistanceKm <= MAX_MATCH_DISTANCE_KM ? closestCountry : undefined;
}
