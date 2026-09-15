// Regression coverage for the pure location-change comparison logic —
// no timers, no Capacitor, no persistence, just the decision itself.
// Covers both signals: an IANA timezone mismatch (Step 5's original
// signal) and a significant GPS distance from the active location (this
// correction's addition — needed because e.g. Kuwait and Egypt can share
// the same UTC offset for part of the year, so timezone alone misses
// that relocation).
import { describe, expect, it } from "vitest";
import { checkLocationChange, SIGNIFICANT_MOVE_KM } from "./locationChangeDetection";
import type { ActiveLocationRecord } from "./locationSettings";

const KUWAIT_ACTIVE: ActiveLocationRecord = {
  source: "device",
  latitude: 29.3759,
  longitude: 47.9774,
  timezone: "Asia/Kuwait",
};

// ~1,900 km from Kuwait — the worked example from this correction's own
// spec (Kuwait -> Egypt), and CAN share Kuwait's UTC+3-ish offset for
// part of the year in reality; here `currentTimezone` is set to the SAME
// string as KUWAIT_ACTIVE's own timezone to specifically simulate that
// same-offset overlap and isolate the distance signal.
const CAIRO_COORDINATES = { latitude: 30.0444, longitude: 31.2357 };

describe("checkLocationChange — timezone signal (unchanged from Step 5)", () => {
  it("no-change: the device timezone still matches the active location, and nothing was ever prompted", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "no-change" });
  });

  it("genuine-change: the device timezone genuinely diverges and was never prompted about before", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Europe/London",
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "genuine-change", detectedTimezone: "Europe/London", detectedCoordinates: undefined, reason: "timezone" });
  });

  it("already-prompted: the SAME mismatch was already prompted about (confirmed or declined) — never repeats", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Europe/London",
      lastPromptedTimezone: "Europe/London",
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "already-prompted" });
  });

  it("genuine-change again for a DIFFERENT new mismatch, even if something else was already prompted", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Tokyo",
      lastPromptedTimezone: "Europe/London",
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "genuine-change", detectedTimezone: "Asia/Tokyo", detectedCoordinates: undefined, reason: "timezone" });
  });

  it("back-in-sync: the device timezone matches the active location again, after a mismatch had been prompted about", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      lastPromptedTimezone: "Europe/London",
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "back-in-sync" });
  });

  it("re-arming: after back-in-sync clears the prompted value, the SAME mismatch value occurring again later is treated as genuinely new", () => {
    const first = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Europe/London",
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(first.kind).toBe("genuine-change");

    const second = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      lastPromptedTimezone: "Europe/London",
      lastPromptedCoordinates: null,
    });
    expect(second).toEqual({ kind: "back-in-sync" });

    const third = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Europe/London",
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(third.kind).toBe("genuine-change");
  });
});

describe("checkLocationChange — GPS distance signal (this correction)", () => {
  it("1) same timezone + small GPS drift -> no prompt", () => {
    // ~5 km from Kuwait City — ordinary drift/local movement.
    const nearbyCoordinates = { latitude: 29.42, longitude: 48.02 };
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: nearbyCoordinates,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "no-change" });
  });

  it("2) same timezone + large geographic move -> prompt (the Kuwait -> Egypt case timezone-only detection misses)", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait", // deliberately UNCHANGED — simulates the same-UTC-offset overlap
      currentCoordinates: CAIRO_COORDINATES,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({
      kind: "genuine-change",
      detectedTimezone: "Asia/Kuwait",
      detectedCoordinates: CAIRO_COORDINATES,
      reason: "distance",
    });
  });

  it("3) different timezone + no significant GPS move -> existing timezone behavior remains correct", () => {
    // A timezone mismatch alone, with a GPS fix that's still right next
    // to the active location (e.g. a timezone database edge case, or the
    // device's OS timezone setting changed without any real relocation)
    // — the timezone signal alone must still correctly fire.
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Europe/London",
      currentCoordinates: { latitude: 29.4, longitude: 48.0 }, // ~5 km from Kuwait
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(result).toEqual({ kind: "genuine-change", detectedTimezone: "Europe/London", detectedCoordinates: { latitude: 29.4, longitude: 48.0 }, reason: "timezone" });
  });

  it("distance exactly at the threshold boundary is not yet significant; just over it is", () => {
    // ~1 degree of longitude at this latitude is roughly 97 km — tuned to
    // land just under vs. just over SIGNIFICANT_MOVE_KM (100 km).
    const justUnder = { latitude: KUWAIT_ACTIVE.latitude, longitude: KUWAIT_ACTIVE.longitude + 0.9 };
    const justOver = { latitude: KUWAIT_ACTIVE.latitude, longitude: KUWAIT_ACTIVE.longitude + 1.2 };

    const underResult = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: justUnder,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(underResult.kind).toBe("no-change");

    const overResult = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: justOver,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(overResult.kind).toBe("genuine-change");
    expect(SIGNIFICANT_MOVE_KM).toBe(100);
  });

  it("a repeated significant-move check with a nearby (but not identical) fresh fix does not re-prompt — deduped via lastPromptedCoordinates", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      // A few km from the ORIGINAL detected Cairo fix, not Cairo itself —
      // simulates a second GPS read of "still obviously the same trip".
      currentCoordinates: { latitude: 30.06, longitude: 31.25 },
      lastPromptedTimezone: null,
      lastPromptedCoordinates: CAIRO_COORDINATES,
    });
    expect(result).toEqual({ kind: "already-prompted" });
  });

  it("re-arms the distance signal too: back-in-sync clears it, so a later genuinely new occurrence of the same displacement re-prompts", () => {
    const first = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: CAIRO_COORDINATES,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null,
    });
    expect(first.kind).toBe("genuine-change");

    const backHome = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: { latitude: KUWAIT_ACTIVE.latitude, longitude: KUWAIT_ACTIVE.longitude },
      lastPromptedTimezone: null,
      lastPromptedCoordinates: CAIRO_COORDINATES,
    });
    expect(backHome).toEqual({ kind: "back-in-sync" });

    const later = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait",
      currentCoordinates: CAIRO_COORDINATES,
      lastPromptedTimezone: null,
      lastPromptedCoordinates: null, // caller cleared it after back-in-sync
    });
    expect(later.kind).toBe("genuine-change");
  });

  it("a genuinely new distance mismatch still fires even if an unrelated timezone dismissal already exists", () => {
    const result = checkLocationChange({
      activeLocation: KUWAIT_ACTIVE,
      currentTimezone: "Asia/Kuwait", // matches — not the trigger
      currentCoordinates: CAIRO_COORDINATES, // the NEW, undismissed trigger
      lastPromptedTimezone: "Europe/London", // an old, unrelated dismissal
      lastPromptedCoordinates: null,
    });
    expect(result.kind).toBe("genuine-change");
  });
});
