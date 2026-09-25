import { Capacitor, registerPlugin } from "@capacitor/core";

// Mirrors android/.../location/LocationPermissionPlugin.kt — location
// PERMISSION status/request/settings only (the fix itself always comes
// from navigator.geolocation; see deviceLocation.ts).
export type LocationPermissionStatus = "granted" | "prompt" | "blocked";

export interface LocationPermissionPlugin {
  getStatus(): Promise<{ status: LocationPermissionStatus }>;
  request(): Promise<{ status: LocationPermissionStatus }>;
  openAppSettings(): Promise<void>;
}

export const LocationPermission = registerPlugin<LocationPermissionPlugin>("LocationPermission");

export function isLocationPermissionNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
