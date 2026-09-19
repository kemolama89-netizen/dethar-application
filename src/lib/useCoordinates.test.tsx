// @vitest-environment jsdom
//
// Regression coverage for useCoordinates' full Layer-1 hierarchy (Step 4):
// a persisted manual city (sticky — never silently replaced by GPS),
// else a real device geolocation fix, else the Kuwait City fallback
// (never throws, never re-requests a permission the user already
// answered). Mounts a tiny real component (same plain react-dom/client +
// act pattern as InsightCard.test.tsx, no testing-library) rather than a
// renderHook utility, matching this repo's existing convention.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useCoordinates } from "./useCoordinates";
import { KUWAIT_CITY_COORDINATES, KUWAIT_TIMEZONE } from "./prayerTimes";
import { getDeviceTimeZone } from "./dateTime";
import { saveLastActiveLocation, saveManualLocation, resetLocationSettingsForTesting, loadLocationSettings } from "./locationSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: ReturnType<typeof useCoordinates> | undefined;
function Probe() {
  latest = useCoordinates();
  return null;
}

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Probe />);
  });
  return {
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
      latest = undefined;
    },
  };
}

const originalGeolocation = navigator.geolocation;
const KUWAIT_FALLBACK_STATE = {
  coordinates: KUWAIT_CITY_COORDINATES,
  timezone: KUWAIT_TIMEZONE,
  source: "fallback",
  countryCode: "KW",
  cityNameAr: "الكويت",
  cityNameEn: "Kuwait",
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { value: originalGeolocation, configurable: true });
});

describe("useCoordinates — no manual location set", () => {
  it("starts on the Kuwait City fallback before any geolocation result lands", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: () => {} }, // never resolves in this test
    });
    const { unmount } = await mount();
    expect(latest).toEqual(KUWAIT_FALLBACK_STATE);
    await unmount();
  });

  it("upgrades to the device fix (paired with the device's own timezone, not Kuwait's) once geolocation succeeds", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 51.5072, longitude: -0.1276 } } as GeolocationPosition);
        },
      },
    });
    const { unmount } = await mount();
    expect(latest).toEqual({
      coordinates: { latitude: 51.5072, longitude: -0.1276 },
      timezone: getDeviceTimeZone(),
      source: "device",
      // Step 7: this exactly matches cities.ts's own London entry, so the
      // offline reverse-geocode estimate resolves to the United Kingdom.
      countryCode: "GB",
    });
    await unmount();
  });

  it("a device fix too far from every bundled city (Step 7's offline estimate) has no countryCode — never a wrong guess", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 0, longitude: -160 } } as GeolocationPosition); // open Pacific Ocean
        },
      },
    });
    const { unmount } = await mount();
    expect(latest).toEqual({
      coordinates: { latitude: 0, longitude: -160 },
      timezone: getDeviceTimeZone(),
      source: "device",
    });
    expect(latest?.countryCode).toBeUndefined();
    await unmount();
  });

  it("stays on the Kuwait fallback (and Kuwait's timezone) when geolocation errors/denies (never throws)", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: "User denied Geolocation" } as GeolocationPositionError);
        },
      },
    });
    const { unmount } = await mount();
    expect(latest).toEqual(KUWAIT_FALLBACK_STATE);
    await unmount();
  });

  it("stays on the Kuwait fallback (and Kuwait's timezone) when the runtime has no geolocation support at all", async () => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const { unmount } = await mount();
    expect(latest).toEqual(KUWAIT_FALLBACK_STATE);
    await unmount();
  });

  it("a returning session (a previous device fix was last confirmed) starts on that last-known location instead of flashing back to Kuwait first", async () => {
    // Simulates: the app previously ran, got a real GPS fix, and recorded
    // it (see useCoordinates.ts's own saveLastActiveLocation calls) —
    // then the app restarted. No manual override exists, but a better
    // initial guess than Kuwait is available.
    saveManualLocation(null); // no manual override
    saveLastActiveLocation({ source: "device", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" });

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: () => {} }, // never resolves in this test — only the INITIAL state matters here
    });
    const { unmount } = await mount();
    expect(latest).toEqual({ coordinates: { latitude: 48.8566, longitude: 2.3522 }, timezone: "Europe/Paris", source: "device" });
    await unmount();
  });
});

describe("useCoordinates — a manual location is set", () => {
  const TOKYO_MANUAL = {
    source: "manual" as const,
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
    countryCode: "JP",
    cityNameAr: "طوكيو",
    cityNameEn: "Tokyo",
  };

  it("the manual location is active immediately, with no geolocation request needed", async () => {
    saveManualLocation(TOKYO_MANUAL);
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: () => { throw new Error("must not be called — a manual location is sticky"); } },
    });
    const { unmount } = await mount();
    expect(latest).toEqual({
      coordinates: { latitude: 35.6762, longitude: 139.6503 },
      timezone: "Asia/Tokyo",
      source: "manual",
      countryCode: "JP",
      cityNameAr: "طوكيو",
      cityNameEn: "Tokyo",
    });
    await unmount();
  });

  it("a manual location is NEVER silently replaced by a device GPS fix, even when one is available", async () => {
    saveManualLocation(TOKYO_MANUAL);
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          // A real fix IS available (e.g. London) — it must be ignored.
          success({ coords: { latitude: 51.5072, longitude: -0.1276 } } as GeolocationPosition);
        },
      },
    });
    const { unmount } = await mount();
    expect(latest?.source).toBe("manual");
    expect(latest?.coordinates).toEqual({ latitude: 35.6762, longitude: 139.6503 });
    await unmount();
  });

  it("remains active/persistent across a simulated app restart (a fresh mount)", async () => {
    saveManualLocation(TOKYO_MANUAL);
    const first = await mount();
    expect(first.unmount).toBeDefined();
    await first.unmount();

    // Simulated restart: a completely fresh mount, nothing carried over
    // except what's in localStorage.
    const second = await mount();
    expect(latest?.source).toBe("manual");
    expect(latest?.cityNameEn).toBe("Tokyo");
    await second.unmount();
  });

  // Reproduces the dev-only "simulate a first launch" reset (see
  // locationSettings.ts's resetLocationSettingsForTesting) actually doing
  // what it's for: after a manual selection made the hook permanently skip
  // requesting geolocation (the "manual is sticky" behavior verified
  // above), clearing that state must re-arm the request on the very next
  // mount — otherwise the reset wouldn't be a usable way to reproduce
  // first-launch behavior during testing.
  it("resetLocationSettingsForTesting() re-arms the geolocation request on the next mount, after a manual selection had suppressed it", async () => {
    saveManualLocation(TOKYO_MANUAL);
    let getCurrentPositionCalled = false;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: () => {
          getCurrentPositionCalled = true;
        },
      },
    });

    const first = await mount();
    expect(getCurrentPositionCalled).toBe(false); // still sticky-manual, as verified above
    await first.unmount();

    resetLocationSettingsForTesting();

    const second = await mount();
    expect(getCurrentPositionCalled).toBe(true); // now behaves like a genuine first launch
    expect(latest?.source).toBe("fallback"); // Kuwait, pending that fresh fix — same as a real first launch
    await second.unmount();
  });
});

// C6 — a failed GPS request must never replace a real saved location with
// Kuwait; Kuwait is only ever RECORDED when nothing valid is saved yet.
describe("useCoordinates — GPS failure never overwrites a valid saved location", () => {
  const PARIS_DEVICE = { source: "device" as const, latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", countryCode: "FR" };

  function geolocationErrors(code: number) {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code, message: "failed" } as GeolocationPositionError);
        },
      },
    });
  }

  it.each([
    [1, "permission denied"],
    [2, "position unavailable"],
    [3, "timeout"],
  ])("keeps the saved device location active AND persisted after a GPS error (%i: %s)", async (code) => {
    saveLastActiveLocation(PARIS_DEVICE);
    geolocationErrors(code);
    const { unmount } = await mount();

    expect(latest?.source).toBe("device");
    expect(latest?.coordinates).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    expect(latest?.timezone).toBe("Europe/Paris");
    expect(loadLocationSettings().lastActiveLocation).toEqual(PARIS_DEVICE);
    await unmount();

    // Next launch (with GPS failing again) still resolves to the real location — not Kuwait.
    geolocationErrors(code);
    const second = await mount();
    expect(latest?.coordinates).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    expect(latest?.source).toBe("device");
    await second.unmount();
  });

  it("keeps the saved device location when the runtime has no geolocation support at all", async () => {
    saveLastActiveLocation(PARIS_DEVICE);
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const { unmount } = await mount();
    expect(latest?.coordinates).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    expect(loadLocationSettings().lastActiveLocation).toEqual(PARIS_DEVICE);
    await unmount();
  });

  it("first launch (nothing saved) + GPS failure still records the Kuwait fallback, so the location-change detector has its baseline", async () => {
    geolocationErrors(1);
    const { unmount } = await mount();
    expect(latest).toEqual(KUWAIT_FALLBACK_STATE);
    expect(loadLocationSettings().lastActiveLocation).toEqual({
      source: "fallback",
      latitude: KUWAIT_CITY_COORDINATES.latitude,
      longitude: KUWAIT_CITY_COORDINATES.longitude,
      timezone: KUWAIT_TIMEZONE,
      countryCode: "KW",
      cityNameAr: "الكويت",
      cityNameEn: "Kuwait",
    });
    await unmount();
  });

  it("an unusable saved location (out-of-range coordinates) counts as 'nothing saved': Kuwait is used and recorded", async () => {
    localStorage.setItem(
      "dithar:location:settings:v1",
      JSON.stringify({ manualLocation: null, lastActiveLocation: { source: "device", latitude: 999, longitude: 2, timezone: "Europe/Paris" } }),
    );
    geolocationErrors(1);
    const { unmount } = await mount();
    expect(latest).toEqual(KUWAIT_FALLBACK_STATE);
    expect(loadLocationSettings().lastActiveLocation?.source).toBe("fallback");
    await unmount();
  });

  it("a later successful GPS fix still replaces a previously saved location (only FAILURES are non-destructive)", async () => {
    saveLastActiveLocation(PARIS_DEVICE);
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 51.5072, longitude: -0.1276 } } as GeolocationPosition);
        },
      },
    });
    const { unmount } = await mount();
    expect(latest?.coordinates).toEqual({ latitude: 51.5072, longitude: -0.1276 });
    expect(loadLocationSettings().lastActiveLocation?.latitude).toBe(51.5072);
    await unmount();
  });

  it("a saved manual location is untouched by a GPS failure", async () => {
    const manual = { source: "manual" as const, latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", countryCode: "JP" };
    saveManualLocation(manual);
    saveLastActiveLocation(PARIS_DEVICE);
    geolocationErrors(3);
    const { unmount } = await mount();
    expect(latest?.source).toBe("manual");
    expect(loadLocationSettings().manualLocation).toEqual(manual);
    expect(loadLocationSettings().lastActiveLocation).toEqual(PARIS_DEVICE);
    await unmount();
  });
});
