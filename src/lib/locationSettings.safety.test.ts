// @vitest-environment jsdom
//
// C6 — validation of stored locations, and the Kuwait fallback is never a
// stored (let alone "detected") location for anyone.
import { beforeEach, describe, expect, it } from "vitest";
import {
  KUWAIT_FALLBACK_LOCATION,
  loadLocationSettings,
  resolveActiveLocationRecord,
  resolveKnownLocationRecord,
  saveLastActiveLocation,
  saveManualLocation,
} from "./locationSettings";

const KEY = "dithar:location:settings:v1";
const PARIS = { source: "device" as const, latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };

beforeEach(() => {
  localStorage.clear();
});

describe("a stored Kuwait fallback is never treated as this user's location", () => {
  it("a 'fallback' record persisted by an older version is ignored — it was never detected", () => {
    localStorage.setItem(KEY, JSON.stringify({ manualLocation: null, lastActiveLocation: KUWAIT_FALLBACK_LOCATION, lastPromptedTimezone: null, lastPromptedCoordinates: null }));
    expect(loadLocationSettings().lastActiveLocation).toBeNull();
    expect(resolveKnownLocationRecord()).toBeNull(); // nothing known → the app detects instead of assuming Kuwait
    expect(resolveActiveLocationRecord()).toEqual(KUWAIT_FALLBACK_LOCATION); // only as the labelled default
    expect(resolveActiveLocationRecord().source).toBe("fallback");
  });

  it("a saved device fix and a manual pick are still known locations", () => {
    saveLastActiveLocation(PARIS);
    expect(resolveKnownLocationRecord()).toEqual(PARIS);
    saveManualLocation({ ...PARIS, source: "manual" });
    expect(resolveKnownLocationRecord()?.source).toBe("manual");
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
