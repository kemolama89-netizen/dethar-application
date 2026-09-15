// @vitest-environment jsdom
//
// Regression coverage for useLocationChangeDetector: detects a genuine
// device-timezone mismatch AND/OR a significant GPS distance from the
// active location (this correction's addition — needed because e.g.
// Kuwait and Egypt can share the same UTC offset for part of the year) on
// mount and on every appStateChange("isActive: true") — reusing the SAME
// @capacitor/app primitive floatingTasbeehSync.ts already relies on
// (mocked here the same way floatingTasbeehSync.test.ts mocks it) —
// never prompts for a manual location, never repeats a prompt for the
// same unresolved mismatch, confirming activates the new device location
// (reusing a check-time GPS fix when one was already obtained, or making
// one fresh attempt otherwise), and declining changes nothing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

let currentTimezone = "Asia/Kuwait";
vi.mock("./dateTime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./dateTime")>();
  return { ...actual, getDeviceTimeZone: () => currentTimezone };
});

let appStateChangeCallback: ((state: { isActive: boolean }) => void) | undefined;
const removeListenerSpy = vi.fn();
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_event: string, cb: (state: { isActive: boolean }) => void) => {
      appStateChangeCallback = cb;
      return Promise.resolve({ remove: removeListenerSpy });
    }),
  },
}));

import { useLocationChangeDetector } from "./useLocationChangeDetector";
import { loadLocationSettings, saveLastActiveLocation, saveManualLocation, saveLastPromptedTimezone, saveLastPromptedCoordinates } from "./locationSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: ReturnType<typeof useLocationChangeDetector> | undefined;
function Probe() {
  latest = useLocationChangeDetector();
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

const KUWAIT_ACTIVE = { source: "device" as const, latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait" };
const NEARBY_DRIFT = { latitude: 29.42, longitude: 48.02 }; // ~5 km from Kuwait — ordinary drift
const CAIRO_COORDINATES = { latitude: 30.0444, longitude: 31.2357 }; // ~1,900 km from Kuwait

beforeEach(() => {
  localStorage.clear();
  currentTimezone = "Asia/Kuwait";
  appStateChangeCallback = undefined;
  removeListenerSpy.mockClear();
  // `navigator.geolocation` is a real global mutated via Object.defineProperty
  // by individual tests (mockGeolocation/clearGeolocation/custom stubs) — reset
  // it here so one test's mock never leaks into the next (each test sets up
  // exactly the geolocation state it needs).
  clearGeolocation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Every `check()` call (mount AND every appStateChange) now attempts ONE
// single-shot geolocation read itself (this correction's change) — so
// unlike Step 5's original tests, geolocation is mocked up front for
// every test that has an opinion about it, with an IMMEDIATE
// (synchronous-callback) response by default. A separate, dedicated test
// covers the deferred/in-flight race case.
function mockGeolocation(succeed: boolean, coords?: { latitude: number; longitude: number }) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback, error: PositionErrorCallback) => {
        if (succeed) success({ coords } as GeolocationPosition);
        else error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    },
  });
}

function clearGeolocation() {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
}

describe("useLocationChangeDetector — baseline", () => {
  it("does nothing on a fresh install — no lastActiveLocation established yet, nothing to compare against", async () => {
    clearGeolocation();
    const { unmount } = await mount();
    expect(latest?.pending).toBeNull();
    await unmount();
  });

  it("does nothing while the device timezone matches and geolocation is unavailable (timezone-only path preserved)", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    clearGeolocation();
    const { unmount } = await mount();
    expect(latest?.pending).toBeNull();
    await unmount();
  });
});

describe("useLocationChangeDetector — GPS distance signal (this correction)", () => {
  it("1) same timezone + small GPS drift -> no prompt", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    mockGeolocation(true, NEARBY_DRIFT);
    const { unmount } = await mount();
    expect(latest?.pending).toBeNull();
    await unmount();
  });

  it("2) same timezone + large geographic move -> prompt", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    mockGeolocation(true, CAIRO_COORDINATES); // currentTimezone stays "Asia/Kuwait" — matches
    const { unmount } = await mount();
    expect(latest?.pending).toEqual({ detectedTimezone: "Asia/Kuwait", detectedCoordinates: CAIRO_COORDINATES });
    await unmount();
  });

  it("3) different timezone + no significant GPS move -> existing timezone behavior remains correct", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    currentTimezone = "Europe/London";
    mockGeolocation(true, NEARBY_DRIFT); // GPS still right next to Kuwait
    const { unmount } = await mount();
    expect(latest?.pending).toEqual({ detectedTimezone: "Europe/London", detectedCoordinates: NEARBY_DRIFT });
    await unmount();
  });

  it("falls back to the timezone-only path (identical to Step 5's original behavior) when geolocation is denied", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    currentTimezone = "Europe/London";
    mockGeolocation(false);
    const { unmount } = await mount();
    expect(latest?.pending).toEqual({ detectedTimezone: "Europe/London", detectedCoordinates: undefined });
    await unmount();
  });
});

describe("useLocationChangeDetector — manual location", () => {
  it("4) manual location is never silently replaced by GPS — no prompt at all while one is active, regardless of timezone/distance", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    saveManualLocation({ source: "manual", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai", countryCode: "AE" });
    currentTimezone = "Europe/London";
    mockGeolocation(true, CAIRO_COORDINATES); // wildly different from Kuwait, Dubai, AND London
    const { unmount } = await mount();
    expect(latest?.pending).toBeNull();
    await unmount();
  });
});

describe("useLocationChangeDetector — decline / confirm", () => {
  it("5) decline keeps the previous active location unchanged", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    mockGeolocation(true, CAIRO_COORDINATES);
    const { unmount } = await mount();
    expect(latest?.pending).not.toBeNull();

    await act(async () => {
      latest?.decline();
    });
    expect(latest?.pending).toBeNull();
    expect(loadLocationSettings().lastActiveLocation).toEqual(KUWAIT_ACTIVE);
    expect(latest?.refreshToken).toBe(0);
    await unmount();
  });

  it("6) confirm activates the new device location (reusing the check-time GPS fix) and bumps refreshToken", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    mockGeolocation(true, CAIRO_COORDINATES);
    const { unmount } = await mount();
    expect(latest?.pending).not.toBeNull();

    await act(async () => {
      latest?.confirmUpdate();
    });
    expect(latest?.pending).toBeNull();
    expect(latest?.refreshToken).toBe(1);
    expect(loadLocationSettings().lastActiveLocation).toEqual({
      source: "device",
      latitude: CAIRO_COORDINATES.latitude,
      longitude: CAIRO_COORDINATES.longitude,
      timezone: "Asia/Kuwait",
      // Step 7: CAIRO_COORDINATES exactly matches cities.ts's own Cairo
      // entry, so the offline country estimate resolves to Egypt.
      countryCode: "EG",
    });
    await unmount();
  });

  it("confirming a timezone-only prompt (no check-time GPS fix) makes exactly one fresh attempt and activates it", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    currentTimezone = "Europe/London";
    mockGeolocation(false); // denied at check time -> timezone-only prompt
    const { unmount } = await mount();
    expect(latest?.pending).toEqual({ detectedTimezone: "Europe/London", detectedCoordinates: undefined });

    // Permission is granted between the prompt appearing and the user
    // tapping confirm (a realistic sequence: check ran before the user
    // had granted it, then they grant it and tap Update).
    mockGeolocation(true, { latitude: 51.5072, longitude: -0.1276 });
    await act(async () => {
      latest?.confirmUpdate();
    });
    expect(latest?.refreshToken).toBe(1);
    expect(loadLocationSettings().lastActiveLocation).toEqual({
      source: "device",
      latitude: 51.5072,
      longitude: -0.1276,
      timezone: "Europe/London",
      // Step 7: this exactly matches cities.ts's own London entry.
      countryCode: "GB",
    });
    await unmount();
  });

  it("confirming does NOT change the active location if no GPS fix is obtainable at all", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    currentTimezone = "Europe/London";
    mockGeolocation(false);
    const { unmount } = await mount();

    await act(async () => {
      latest?.confirmUpdate();
    });
    expect(latest?.pending).toBeNull(); // dismissed regardless
    expect(latest?.refreshToken).toBe(0);
    expect(loadLocationSettings().lastActiveLocation).toEqual(KUWAIT_ACTIVE);
    await unmount();
  });

  it("confirming never overwrites a manual location selected while the fallback GPS request is still in flight", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    currentTimezone = "Europe/London";
    mockGeolocation(false); // check-time: denied -> timezone-only prompt, no coordinates captured
    const { unmount } = await mount();
    expect(latest?.pending).toEqual({ detectedTimezone: "Europe/London", detectedCoordinates: undefined });

    let resolvePosition: (() => void) | undefined;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          resolvePosition = () => success({ coords: { latitude: 51.5072, longitude: -0.1276 } } as GeolocationPosition);
        },
      },
    });

    await act(async () => {
      latest?.confirmUpdate(); // fires confirmUpdate's own fallback fetch, doesn't resolve yet
    });
    // A manual pick lands WHILE that async request is still in flight.
    saveManualLocation({ source: "manual", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai", countryCode: "AE" });

    await act(async () => {
      resolvePosition?.();
    });
    expect(loadLocationSettings().manualLocation).toEqual({
      source: "manual",
      latitude: 25.2048,
      longitude: 55.2708,
      timezone: "Asia/Dubai",
      countryCode: "AE",
    });
    expect(latest?.refreshToken).toBe(0); // the late GPS result never took effect
    await unmount();
  });
});

describe("useLocationChangeDetector — no repeated prompts", () => {
  it("7) repeated foreground events for the SAME still-unresolved mismatch do not repeatedly (re-)prompt after it was already dismissed", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    mockGeolocation(true, CAIRO_COORDINATES);
    const { unmount } = await mount();
    expect(latest?.pending).not.toBeNull();

    await act(async () => {
      latest?.decline();
    });
    expect(latest?.pending).toBeNull();

    // Further foreground-returns with the exact same unresolved
    // displacement must not resurrect the prompt.
    await act(async () => {
      appStateChangeCallback?.({ isActive: true });
    });
    expect(latest?.pending).toBeNull();
    await act(async () => {
      appStateChangeCallback?.({ isActive: true });
    });
    expect(latest?.pending).toBeNull();
    await unmount();
  });

  it("does NOT re-check on appStateChange(isActive: false) — backgrounding is not a foreground-return", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    const { unmount } = await mount();
    mockGeolocation(true, CAIRO_COORDINATES);
    await act(async () => {
      appStateChangeCallback?.({ isActive: false });
    });
    expect(latest?.pending).toBeNull();
    await unmount();
  });

  it("re-arms after returning to a synced state: a genuinely new later occurrence of the same displacement still prompts", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    saveLastPromptedTimezone(null);
    saveLastPromptedCoordinates(CAIRO_COORDINATES); // simulates: already resolved a past Cairo-distance mismatch
    mockGeolocation(true, KUWAIT_ACTIVE); // back in sync now
    const { unmount } = await mount();
    expect(latest?.pending).toBeNull();
    expect(loadLocationSettings().lastPromptedCoordinates).toBeNull(); // cleared on re-sync

    mockGeolocation(true, CAIRO_COORDINATES); // travels to the same area again, later
    await act(async () => {
      appStateChangeCallback?.({ isActive: true });
    });
    expect(latest?.pending).toEqual({ detectedTimezone: "Asia/Kuwait", detectedCoordinates: CAIRO_COORDINATES });
    await unmount();
  });

  it("cleans up its appStateChange listener on unmount — no leaked subscription", async () => {
    saveLastActiveLocation(KUWAIT_ACTIVE);
    clearGeolocation();
    const { unmount } = await mount();
    await unmount();
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });
});
