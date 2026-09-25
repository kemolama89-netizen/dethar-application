// The app's automatic (device) location — shared by useCoordinates (the
// automatic request on Home/Prayer Times) and Settings → الموقع →
// "تحديد موقعي تلقائيًا" (an explicit re-detect), so both go through the
// SAME geolocation call, the SAME record shape and the SAME persistence
// (locationSettings.ts). There is no second location system.
//
// On Android the WebView's navigator.geolocation is backed by the native
// location permission (Capacitor's BridgeWebChromeClient requests it);
// LocationPermissionPlugin only adds the permission status/recovery the
// WebView can't express (e.g. "Don't ask again").
import { getDeviceTimeZone } from "./dateTime";
import { saveLastActiveLocation, saveManualLocation } from "./locationSettings";
import type { ActiveLocationRecord } from "./locationSettings";
import { estimateCountryFromCoordinates } from "./reverseGeocode";
import { LocationPermission, isLocationPermissionNativeAvailable } from "./locationPermissionNative";

/** A geolocation fix → the "device" location record Prayer Times uses. */
export function positionToDeviceRecord(position: Pick<GeolocationPosition, "coords">): ActiveLocationRecord {
  const { latitude, longitude } = position.coords;
  return {
    source: "device",
    latitude,
    longitude,
    timezone: getDeviceTimeZone(),
    // Best-effort offline country estimate — `undefined` when too far from
    // every bundled city (see reverseGeocode.ts).
    countryCode: estimateCountryFromCoordinates({ latitude, longitude }),
  };
}

export type DetectLocationResult =
  | { kind: "success"; record: ActiveLocationRecord }
  /** The user declined; Android can still ask again. */
  | { kind: "denied" }
  /** Android won't show the dialog again — only the app's settings page can grant it. */
  | { kind: "blocked" }
  /** Permission is fine but no fix came (location services off, no signal, timeout). */
  | { kind: "unavailable" };

// An explicit re-detect wants a fresh fix, not a 30-minute-old cached one.
const DETECT_OPTIONS: PositionOptions = { maximumAge: 60 * 1000, timeout: 20_000 };

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

/**
 * "تحديد موقعي تلقائيًا": permission (asking only when Android still can),
 * then the device fix, then persisted as the active location — replacing
 * any manual city, since this is the user's explicit choice. Prayer Times
 * reads the same persisted record (resolveActiveLocationRecord).
 */
export async function detectMyLocation(): Promise<DetectLocationResult> {
  if (isLocationPermissionNativeAvailable()) {
    let { status } = await LocationPermission.getStatus();
    if (status === "prompt") ({ status } = await LocationPermission.request());
    if (status === "blocked") return { kind: "blocked" };
    if (status !== "granted") return { kind: "denied" };
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return { kind: "unavailable" };

  let position: GeolocationPosition;
  try {
    position = await getPosition(DETECT_OPTIONS);
  } catch (error) {
    const code = (error as GeolocationPositionError | undefined)?.code;
    // PERMISSION_DENIED === 1
    return code === 1 ? { kind: "denied" } : { kind: "unavailable" };
  }
  const record = positionToDeviceRecord(position);
  saveManualLocation(null);
  saveLastActiveLocation(record);
  return { kind: "success", record };
}

export function openAppLocationSettings(): Promise<void> {
  return LocationPermission.openAppSettings();
}
