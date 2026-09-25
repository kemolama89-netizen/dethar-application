// @vitest-environment jsdom
//
// Settings → الموقع → "تحديد موقعي تلقائيًا": the explicit re-detect runs the
// SAME device-location flow as the app's automatic request
// (navigator.geolocation → positionToDeviceRecord → locationSettings), with
// Android permission recovery on top. The native permission plugin is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";

const perm = vi.hoisted(() => ({
  native: true,
  status: "prompt" as string,
  afterRequest: "granted" as string,
  plugin: {
    getStatus: vi.fn(),
    request: vi.fn(),
    openAppSettings: vi.fn(async () => {}),
  },
}));
vi.mock("./locationPermissionNative", () => ({
  LocationPermission: perm.plugin,
  isLocationPermissionNativeAvailable: () => perm.native,
}));

import { detectMyLocation } from "./deviceLocation";
import { loadLocationSettings, resolveActiveLocationRecord, saveManualLocation } from "./locationSettings";
import { useCoordinates } from "./useCoordinates";

const originalGeolocation = navigator.geolocation;
let getCurrentPosition: ReturnType<typeof vi.fn>;

function fakeGeolocation(result: { lat: number; lon: number } | { code: number }) {
  getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
    if ("code" in result) fail({ code: result.code } as GeolocationPositionError);
    else ok({ coords: { latitude: result.lat, longitude: result.lon } } as GeolocationPosition);
  });
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
}

// Jeddah — deliberately not Kuwait, so nothing can pass by falling back.
const JEDDAH = { lat: 21.4858, lon: 39.1925 };

beforeEach(() => {
  localStorage.clear();
  perm.native = true;
  perm.status = "prompt";
  perm.afterRequest = "granted";
  perm.plugin.getStatus.mockImplementation(async () => ({ status: perm.status }));
  perm.plugin.request.mockImplementation(async () => {
    perm.status = perm.afterRequest;
    return { status: perm.status };
  });
  vi.clearAllMocks();
  fakeGeolocation(JEDDAH);
});
afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { value: originalGeolocation, configurable: true });
});

describe("detectMyLocation", () => {
  it("permission never granted → asks Android, then uses the device fix", async () => {
    const result = await detectMyLocation();
    expect(perm.plugin.request).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ kind: "success", record: { source: "device", latitude: JEDDAH.lat, longitude: JEDDAH.lon, countryCode: "SA" } });
  });

  it("permission already granted → no prompt, just the current device location", async () => {
    perm.status = "granted";
    const result = await detectMyLocation();
    expect(perm.plugin.request).not.toHaveBeenCalled();
    expect(result.kind).toBe("success");
  });

  it("persists the detected location as the active one — replacing a manual city", async () => {
    saveManualLocation({ source: "manual", latitude: 29.37, longitude: 47.98, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" });
    perm.status = "granted";
    await detectMyLocation();
    expect(loadLocationSettings().manualLocation).toBeNull();
    expect(resolveActiveLocationRecord()).toMatchObject({ source: "device", latitude: JEDDAH.lat, longitude: JEDDAH.lon });
  });

  it("Prayer Times starts from the detected location (useCoordinates reads the same record)", async () => {
    perm.status = "granted";
    await detectMyLocation();
    // Home's PrayerTimesPanel remounts and its hook starts from the persisted record.
    fakeGeolocation({ code: 3 }); // even if the next automatic fix times out
    const seen: { state?: ReturnType<typeof useCoordinates> } = {};
    function Probe({ onState }: { onState: (s: ReturnType<typeof useCoordinates>) => void }) {
      const s = useCoordinates();
      useEffect(() => {
        onState(s);
      });
      return null;
    }
    const div = document.createElement("div");
    const root = createRoot(div);
    await act(async () => root.render(<Probe onState={(s) => void (seen.state = s)} />));
    expect(seen.state?.coordinates).toEqual({ latitude: JEDDAH.lat, longitude: JEDDAH.lon });
    expect(seen.state?.source).toBe("device");
    await act(async () => root.unmount());
  });

  it("declined but Android can ask again → 'denied', no location read", async () => {
    perm.afterRequest = "prompt";
    expect(await detectMyLocation()).toEqual({ kind: "denied" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("permanently denied → 'blocked' without re-requesting (no loop)", async () => {
    perm.status = "blocked";
    expect(await detectMyLocation()).toEqual({ kind: "blocked" });
    expect(await detectMyLocation()).toEqual({ kind: "blocked" });
    expect(perm.plugin.request).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("a request that Android answers without a dialog (Don't ask again) → 'blocked' after exactly one request", async () => {
    perm.afterRequest = "blocked";
    expect(await detectMyLocation()).toEqual({ kind: "blocked" });
    expect(await detectMyLocation()).toEqual({ kind: "blocked" });
    expect(perm.plugin.request).toHaveBeenCalledTimes(1);
  });

  it("no fix (location services off / timeout) → 'unavailable', nothing overwritten", async () => {
    perm.status = "granted";
    fakeGeolocation({ code: 2 });
    expect(await detectMyLocation()).toEqual({ kind: "unavailable" });
    expect(loadLocationSettings().lastActiveLocation).toBeNull();
  });

  it("web: uses the browser's own permission prompt through geolocation", async () => {
    perm.native = false;
    expect((await detectMyLocation()).kind).toBe("success");
    fakeGeolocation({ code: 1 });
    expect(await detectMyLocation()).toEqual({ kind: "denied" });
    expect(perm.plugin.getStatus).not.toHaveBeenCalled();
  });
});
