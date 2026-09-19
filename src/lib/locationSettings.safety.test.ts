// @vitest-environment jsdom
//
// C6 — validation of stored locations and the "record Kuwait only when
// nothing valid is saved" rule (see saveFallbackLocationIfNoneSaved).
import { beforeEach, describe, expect, it } from "vitest";
import {
  KUWAIT_FALLBACK_LOCATION,
  loadLocationSettings,
  resolveActiveLocationRecord,
  saveFallbackLocationIfNoneSaved,
  saveLastActiveLocation,
  saveManualLocation,
} from "./locationSettings";

const KEY = "dithar:location:settings:v1";
const PARIS = { source: "device" as const, latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };

beforeEach(() => {
  localStorage.clear();
});

describe("saveFallbackLocationIfNoneSaved", () => {
  it("records Kuwait when nothing is saved", () => {
    saveFallbackLocationIfNoneSaved();
    expect(loadLocationSettings().lastActiveLocation).toEqual(KUWAIT_FALLBACK_LOCATION);
  });

  it("does not overwrite a saved device location", () => {
    saveLastActiveLocation(PARIS);
    saveFallbackLocationIfNoneSaved();
    expect(loadLocationSettings().lastActiveLocation).toEqual(PARIS);
    expect(resolveActiveLocationRecord()).toEqual(PARIS);
  });

  it("does not write anything when a manual location exists", () => {
    saveManualLocation({ ...PARIS, source: "manual" });
    saveFallbackLocationIfNoneSaved();
    expect(loadLocationSettings().lastActiveLocation).toBeNull();
  });

  it("does not touch an already-saved fallback record either (no needless rewrite)", () => {
    saveLastActiveLocation(KUWAIT_FALLBACK_LOCATION);
    const before = localStorage.getItem(KEY);
    saveFallbackLocationIfNoneSaved();
    expect(localStorage.getItem(KEY)).toBe(before);
  });
});

describe("stored-location validation", () => {
  const stored = (record: unknown) =>
    localStorage.setItem(KEY, JSON.stringify({ manualLocation: null, lastActiveLocation: record, lastPromptedTimezone: null, lastPromptedCoordinates: null }));

  it("accepts a well-formed record, including the exact boundary coordinates", () => {
    stored({ ...PARIS, latitude: 90, longitude: -180 });
    expect(loadLocationSettings().lastActiveLocation).not.toBeNull();
  });

  it.each([
    ["latitude above 90", { ...PARIS, latitude: 91 }],
    ["latitude below -90", { ...PARIS, latitude: -90.5 }],
    ["longitude above 180", { ...PARIS, longitude: 181 }],
    ["latitude as a string", { ...PARIS, latitude: "48.85" }],
    ["longitude missing", { source: "device", latitude: 1, timezone: "UTC" }],
    ["latitude null (what JSON turns NaN/Infinity into)", { ...PARIS, latitude: null }],
    ["empty timezone", { ...PARIS, timezone: "" }],
    ["unknown source", { ...PARIS, source: "gps" }],
  ])("treats %s as no saved location", (_name, record) => {
    stored(record);
    expect(loadLocationSettings().lastActiveLocation).toBeNull();
    expect(resolveActiveLocationRecord()).toEqual(KUWAIT_FALLBACK_LOCATION);
  });

  it("rejects out-of-range last-prompted coordinates too", () => {
    localStorage.setItem(KEY, JSON.stringify({ lastPromptedCoordinates: { latitude: 200, longitude: 0 } }));
    expect(loadLocationSettings().lastPromptedCoordinates).toBeNull();
  });
});
