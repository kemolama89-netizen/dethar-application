// DITHAR — offline coordinate -> country estimation.
//
// Prayer times pick their calculation profile from the location's country
// (calculationProfiles.ts). A manually-selected city and the Kuwait
// fallback carry their own `countryCode` (see locationSettings.ts's
// ActiveLocationRecord); a raw device GPS fix does not — this module
// determines it, so a device-GPS user gets their country's profile too.
//
// PRIMARY: point-in-polygon against bundled country borders
// (@rapideditor/country-coder — the OpenStreetMap iD editor's offline
// borders, ISC licence), at territory level so its codes match tzdata's
// zone.tab (SJ, PR, RE, HK…). Works anywhere on land, however far from a
// city. FALLBACK ONLY (a fix on no country's territory, e.g. at sea): the
// nearest bundled city below.
//
// Deliberately entirely OFFLINE — the borders and the CITIES dataset are
// bundled: no network call, no API key, works with no connectivity, and no
// coordinates ever leave the device.
import { iso1A2Code } from "@rapideditor/country-coder";
import { CITIES } from "../data/cities";
import type { CityRecord } from "../data/cities";
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
// profile is then chosen from the location's timezone, else the Muslim
// World League fallback (see calculationProfiles.ts) — an unresolved
// country is only a missed improvement for a location too far from this
// bundle's sparse coverage.
export const MAX_MATCH_DISTANCE_KM = 300;

// The closest bundled city to `coordinates` (within MAX_MATCH_DISTANCE_KM)
// and its distance — a pure, synchronous, offline lookup (no I/O). Only the
// fallback for a fix on no country's territory (see below).
function nearestBundledCity(coordinates: Coordinates): { city: CityRecord; distanceKm: number } | undefined {
  let nearest: { city: CityRecord; distanceKm: number } | undefined;
  for (const city of CITIES) {
    const distanceKm = haversineDistanceKm(coordinates, { latitude: city.latitude, longitude: city.longitude });
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { city, distanceKm };
  }
  return nearest && nearest.distanceKm <= MAX_MATCH_DISTANCE_KM ? nearest : undefined;
}

// The ISO 3166-1 alpha-2 code of the country/territory whose borders contain
// `coordinates`, or `undefined` when none does (open sea, Antarctica).
export function countryAtCoordinates(coordinates: Coordinates): string | undefined {
  try {
    return iso1A2Code([coordinates.longitude, coordinates.latitude], { level: "territory" }) ?? undefined;
  } catch {
    return undefined;
  }
}

// The country a GPS fix is in: from the borders, else — only when the fix
// is on no country's territory — the nearest bundled city's country (within
// MAX_MATCH_DISTANCE_KM), else `undefined`. A pure, synchronous, offline
// lookup, safe to call on every device fix.
export function estimateCountryFromCoordinates(coordinates: Coordinates): string | undefined {
  return countryAtCoordinates(coordinates) ?? nearestBundledCity(coordinates)?.city.countryCode;
}
