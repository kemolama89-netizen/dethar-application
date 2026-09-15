// Regression coverage for the offline nearest-bundled-city country
// estimator (Step 7) — no timers, no storage, no network, just the pure
// lookup itself.
import { describe, expect, it } from "vitest";
import { estimateCountryFromCoordinates, MAX_MATCH_DISTANCE_KM } from "./reverseGeocode";

describe("estimateCountryFromCoordinates", () => {
  it("returns the exact bundled city's own country for an exact coordinate match", () => {
    expect(estimateCountryFromCoordinates({ latitude: 29.3759, longitude: 47.9774 })).toBe("KW"); // Kuwait City
  });

  it("returns the genuinely nearest city's country, not just the first city in the bundled list", () => {
    // ~10 km from Riyadh, but Riyadh is listed AFTER Kuwait City in
    // cities.ts — proves this is a real nearest-search, not a first-match
    // short-circuit. Kuwait City itself is ~880 km away, far further.
    const nearRiyadh = { latitude: 24.8, longitude: 46.7 };
    expect(estimateCountryFromCoordinates(nearRiyadh)).toBe("SA");
  });

  it("still resolves for ordinary GPS drift/a few km off a bundled city's exact center", () => {
    const nearLondon = { latitude: 51.52, longitude: -0.12 }; // a couple of km from London
    expect(estimateCountryFromCoordinates(nearLondon)).toBe("GB");
  });

  it("returns undefined when even the closest bundled city is far beyond MAX_MATCH_DISTANCE_KM", () => {
    // Open Pacific Ocean — thousands of km from every bundled city.
    expect(estimateCountryFromCoordinates({ latitude: 0, longitude: -160 })).toBeUndefined();
    expect(MAX_MATCH_DISTANCE_KM).toBe(300);
  });

  it("distance exactly at the threshold boundary still resolves; just beyond it does not (relative to Kuwait City, the nearest bundled city in this range)", () => {
    const KUWAIT = { latitude: 29.3759, longitude: 47.9774 };
    // Pure latitude offsets (no longitude change) so 1 degree is a
    // constant ~111.32 km regardless of location, unlike longitude which
    // scales by cos(latitude) — makes the two test points' real distance
    // to Kuwait City easy to reason about precisely. Baghdad (the next-
    // nearest bundled city in this direction) is ~370-450 km away from
    // both points, so Kuwait City stays the nearest match either way and
    // this test genuinely isolates the MAX_MATCH_DISTANCE_KM cutoff.
    const justUnder = { latitude: KUWAIT.latitude + 2.5, longitude: KUWAIT.longitude }; // ~278 km
    const justOver = { latitude: KUWAIT.latitude + 2.9, longitude: KUWAIT.longitude }; // ~323 km

    expect(estimateCountryFromCoordinates(justUnder)).toBe("KW");
    expect(estimateCountryFromCoordinates(justOver)).toBeUndefined();
  });
});
