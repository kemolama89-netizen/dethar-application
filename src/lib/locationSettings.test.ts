// @vitest-environment jsdom
//
// Regression coverage for locationSettings.ts's persistence layer:
// source/coordinates/country/city/timezone all survive round-trips, a
// manual selection stays independent of "last active", and corrupt
// storage never throws.
import { describe, expect, it, beforeEach } from "vitest";
import {
  loadLocationSettings,
  saveManualLocation,
  saveLastActiveLocation,
  saveLastPromptedTimezone,
  saveLastPromptedCoordinates,
  resolveActiveLocationRecord,
  resetLocationSettingsForTesting,
  KUWAIT_FALLBACK_LOCATION,
} from "./locationSettings";
import type { ActiveLocationRecord } from "./locationSettings";

const TOKYO: ActiveLocationRecord = {
  source: "manual",
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: "Asia/Tokyo",
  countryCode: "JP",
  cityNameAr: "طوكيو",
  cityNameEn: "Tokyo",
};

const PARIS_DEVICE_FIX: ActiveLocationRecord = {
  source: "device",
  latitude: 48.8566,
  longitude: 2.3522,
  timezone: "Europe/Paris",
};

beforeEach(() => {
  localStorage.clear();
});

const EMPTY_SETTINGS = { manualLocation: null, lastActiveLocation: null, lastPromptedTimezone: null, lastPromptedCoordinates: null };

describe("loadLocationSettings", () => {
  it("defaults to no manual, no last-active, and no prompted-timezone when nothing is persisted", () => {
    expect(loadLocationSettings()).toEqual(EMPTY_SETTINGS);
  });

  it("starts clean rather than throwing on corrupt storage", () => {
    localStorage.setItem("dithar:location:settings:v1", "{not json");
    expect(loadLocationSettings()).toEqual(EMPTY_SETTINGS);
  });

  it("tolerates a malformed record shape rather than throwing", () => {
    localStorage.setItem("dithar:location:settings:v1", JSON.stringify({ manualLocation: { source: "manual" } }));
    expect(loadLocationSettings()).toEqual(EMPTY_SETTINGS);
  });
});

describe("saveManualLocation / persistence of source, coordinates, country, city, timezone", () => {
  it("persists every field of a manual city selection exactly", () => {
    saveManualLocation(TOKYO);
    expect(loadLocationSettings().manualLocation).toEqual(TOKYO);
  });

  it("selecting a manual location does NOT touch last-active — conflating the two was a real bug (see the module's own doc comment): it would make clearing a manual override silently fall back to that same city instead of genuinely resuming automatic resolution", () => {
    saveManualLocation(TOKYO);
    expect(loadLocationSettings().lastActiveLocation).toBeNull();
  });

  it("clearing the manual location (passing null) leaves last-active exactly as it was — untouched by the manual pick that came before it", () => {
    saveLastActiveLocation(PARIS_DEVICE_FIX); // an earlier automatic resolution
    saveManualLocation(TOKYO);
    saveManualLocation(null);
    expect(loadLocationSettings().manualLocation).toBeNull();
    expect(loadLocationSettings().lastActiveLocation).toEqual(PARIS_DEVICE_FIX);
  });

  it("clearing a manual location genuinely resumes automatic resolution (falls through to Kuwait) when no prior automatic location was ever recorded", () => {
    saveManualLocation(TOKYO);
    saveManualLocation(null);
    expect(resolveActiveLocationRecord()).toEqual(KUWAIT_FALLBACK_LOCATION);
  });

  it("changing the manual city replaces the previous one, not appends to it", () => {
    saveManualLocation(TOKYO);
    const cairo: ActiveLocationRecord = { source: "manual", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo", countryCode: "EG" };
    saveManualLocation(cairo);
    expect(loadLocationSettings().manualLocation).toEqual(cairo);
  });
});

describe("saveLastActiveLocation", () => {
  it("records the location without touching any existing manual override", () => {
    saveManualLocation(TOKYO);
    saveLastActiveLocation(PARIS_DEVICE_FIX); // e.g. a device GPS fix arriving in the background
    const settings = loadLocationSettings();
    expect(settings.manualLocation).toEqual(TOKYO); // untouched — no accidental override
    expect(settings.lastActiveLocation).toEqual(PARIS_DEVICE_FIX);
  });
});

describe("resolveActiveLocationRecord — the synchronous priority chain", () => {
  it("manual beats last-active beats Kuwait fallback", () => {
    saveLastActiveLocation(PARIS_DEVICE_FIX);
    saveManualLocation(TOKYO);
    expect(resolveActiveLocationRecord()).toEqual(TOKYO);
  });

  it("falls back to last-active when no manual location is set", () => {
    saveLastActiveLocation(PARIS_DEVICE_FIX);
    expect(resolveActiveLocationRecord()).toEqual(PARIS_DEVICE_FIX);
  });

  it("falls back to the Kuwait fallback when neither exists — preserving today's exact default", () => {
    expect(resolveActiveLocationRecord()).toEqual(KUWAIT_FALLBACK_LOCATION);
    expect(KUWAIT_FALLBACK_LOCATION.latitude).toBe(29.3759);
    expect(KUWAIT_FALLBACK_LOCATION.longitude).toBe(47.9774);
    expect(KUWAIT_FALLBACK_LOCATION.timezone).toBe("Asia/Kuwait");
  });
});

// resetLocationSettingsForTesting — the dev/test-only "simulate a first
// launch" reset used to make the first-launch permission flow reliably
// reproducible during manual QA (see locationSettings.ts's own doc
// comment on this function for exactly what it does and does NOT reset —
// it never touches the browser's or the native OS's own remembered
// permission decision, only this app's own localStorage entry).
describe("resetLocationSettingsForTesting", () => {
  it("wipes every field this module persists — manual override, last-active, and both prompt dismissals — back to the defaults", () => {
    saveManualLocation(TOKYO);
    saveLastActiveLocation(PARIS_DEVICE_FIX);
    saveLastPromptedTimezone("Europe/Paris");
    saveLastPromptedCoordinates({ latitude: 48.8566, longitude: 2.3522 });

    resetLocationSettingsForTesting();

    expect(loadLocationSettings()).toEqual(EMPTY_SETTINGS);
  });

  it("afterward, resolveActiveLocationRecord() falls all the way back to Kuwait — exactly the genuine first-launch starting point", () => {
    saveManualLocation(TOKYO);
    resetLocationSettingsForTesting();
    expect(resolveActiveLocationRecord()).toEqual(KUWAIT_FALLBACK_LOCATION);
  });

  it("is safe to call with nothing persisted yet (an actual first launch) — never throws", () => {
    expect(() => resetLocationSettingsForTesting()).not.toThrow();
    expect(loadLocationSettings()).toEqual(EMPTY_SETTINGS);
  });
});
