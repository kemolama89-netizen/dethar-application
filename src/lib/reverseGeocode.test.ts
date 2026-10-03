// Regression coverage for the offline GPS → country lookup: bundled
// country borders first, the nearest bundled city only at sea — no timers,
// no storage, no network, just the pure lookup itself.
import { describe, expect, it } from "vitest";
import { countryAtCoordinates, estimateCountryFromCoordinates, MAX_MATCH_DISTANCE_KM } from "./reverseGeocode";

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

  it("on land, the country comes from the borders — however far from every bundled city", () => {
    // Each of these is hundreds of km from the nearest bundled city (or nearer a neighbour's).
    expect(estimateCountryFromCoordinates({ latitude: 28.3835, longitude: 36.5662 })).toBe("SA"); // Tabuk
    expect(estimateCountryFromCoordinates({ latitude: 17.5656, longitude: 44.2289 })).toBe("SA"); // Najran
    expect(estimateCountryFromCoordinates({ latitude: 17.0151, longitude: 54.0924 })).toBe("OM"); // Salalah
    expect(estimateCountryFromCoordinates({ latitude: 25.6872, longitude: 32.6396 })).toBe("EG"); // Luxor
    expect(estimateCountryFromCoordinates({ latitude: -2.5337, longitude: 140.7181 })).toBe("ID"); // Jayapura
    expect(estimateCountryFromCoordinates({ latitude: 61.2181, longitude: -149.9003 })).toBe("US"); // Anchorage
    expect(estimateCountryFromCoordinates({ latitude: 22.785, longitude: 5.5228 })).toBe("DZ"); // Tamanrasset
    expect(estimateCountryFromCoordinates({ latitude: 26.4207, longitude: 50.0888 })).toBe("SA"); // Dammam — nearest bundled city is Manama
    expect(estimateCountryFromCoordinates({ latitude: 1.0456, longitude: 104.0305 })).toBe("ID"); // Batam — nearest bundled city is Singapore
  });

  it("uses territory-level codes matching tzdata (Svalbard SJ, Puerto Rico PR)", () => {
    expect(countryAtCoordinates({ latitude: 78.2232, longitude: 15.6267 })).toBe("SJ");
    expect(countryAtCoordinates({ latitude: 18.4655, longitude: -66.1057 })).toBe("PR");
  });

  it("at sea, falls back to the nearest bundled city within MAX_MATCH_DISTANCE_KM", () => {
    const gulf = { latitude: 27.0, longitude: 51.0 }; // open water between Bahrain and Qatar
    expect(countryAtCoordinates(gulf)).toBeUndefined();
    expect(["BH", "QA"]).toContain(estimateCountryFromCoordinates(gulf));
    expect(MAX_MATCH_DISTANCE_KM).toBe(300);
  });

  it("in open ocean far from everything, returns undefined — never a wrong guess", () => {
    expect(estimateCountryFromCoordinates({ latitude: -40, longitude: -30 })).toBeUndefined(); // South Atlantic
  });
});
