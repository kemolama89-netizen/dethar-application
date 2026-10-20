// @vitest-environment jsdom
//
// Step 9 of the global hybrid prayer-time architecture: end-to-end
// verification that the LIVE component actually wires resolved GPS
// coordinates + resolved country + the automatic calculation profile
// (calculationProfiles.ts) + the location's own calendar day together —
// not just the underlying library functions in isolation (already covered
// by calculationProfiles*.test.ts / prayerTimes.test.ts). Mounts the REAL PrayerTimesPanel (same plain
// react-dom/client + act pattern as SettingsScreen.test.tsx /
// InsightCard.test.tsx, no testing-library).
//
// Location is controlled via a persisted MANUAL city selection (see
// locationSettings.ts) rather than mocking navigator.geolocation — this
// is the SAME mechanism Settings > Location already uses, is fully
// synchronous/deterministic (useCoordinates.ts resolves a manual location
// immediately, no async geolocation race to manage), and exercises the
// exact same `countryCode` field PrayerTimesPanel actually reads.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PrayerTimesPanel } from "./PrayerTimesPanel";
import { LanguageProvider } from "../theme/LanguageContext";
import { saveManualLocation, saveLastActiveLocation, resetLocationSettingsForTesting } from "../lib/locationSettings";
import { calculatePrayerDay, formatPrayerTime, KUWAIT_CITY_COORDINATES } from "../lib/prayerTimes";
import { localDateIn } from "../lib/locationTime";
import { LEGACY_CALCULATION_SETTINGS_KEY } from "../lib/legacyCalculationSettings";
import { prayerOrder } from "../data/content";
import type { PrayerKey } from "../data/content";
import { CITIES } from "../data/cities";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Fixed instant — same one prayerTimes.test.ts already pins its own Kuwait
// regression values against, so this file's
// own Kuwait assertion can reuse those exact, already-verified numbers
// instead of re-deriving them.
const DATE = new Date("2026-09-14T00:00:00Z");

async function mount(variant: "compact" | "hero" = "compact") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <PrayerTimesPanel date={DATE} variant={variant} />
      </LanguageProvider>,
    );
  });
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

// Independently computes the SAME six times PrayerTimesPanel's own
// `times` useMemo computes (the location's own calendar day ->
// calculatePrayerDay -> formatPrayerTime) — used to assert the
// live-rendered DOM text matches, proving the component's wiring, not just
// the library functions in isolation.
function expectedFormattedTimes(coordinates: { latitude: number; longitude: number }, country: string | undefined, timezone: string) {
  const { times } = calculatePrayerDay({ coordinates, timezone, country }, localDateIn(DATE, timezone));
  const formatted: Record<PrayerKey, string> = {} as Record<PrayerKey, string>;
  for (const key of prayerOrder) formatted[key] = formatPrayerTime(times[key], timezone);
  return formatted;
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
});

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
});

describe("PrayerTimesPanel — Step 9: Kuwait remains unchanged", () => {
  it("with no manual location and no geolocation (the Kuwait fallback), renders the exact byte-for-byte-preserved pinned Kuwait times", async () => {
    const { container, unmount } = await mount();
    // Same pinned values asserted in prayerTimes.test.ts's own "Kuwait
    // preservation" tests.
    expect(container.textContent).toContain("04:12"); // fajr
    expect(container.textContent).toContain("11:44"); // dhuhr
    expect(container.textContent).toContain("19:12"); // isha
    await unmount();
  });
});

describe("PrayerTimesPanel — Step 9: worldwide, non-Kuwait locations reach the real calculation path", () => {
  const cases: Array<{ label: string; countryCode: string; latitude: number; longitude: number; timezone: string }> = [
    { label: "Europe (London, GB)", countryCode: "GB", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
    { label: "Saudi Arabia (Makkah)", countryCode: "SA", latitude: 21.3891, longitude: 39.8579, timezone: "Asia/Riyadh" },
    { label: "Pakistan (Karachi)", countryCode: "PK", latitude: 24.8607, longitude: 67.0011, timezone: "Asia/Karachi" },
    { label: "Malaysia (Kuala Lumpur)", countryCode: "MY", latitude: 3.139, longitude: 101.6869, timezone: "Asia/Kuala_Lumpur" },
    { label: "USA (New York)", countryCode: "US", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  ];

  for (const { label, countryCode, latitude, longitude, timezone } of cases) {
    it(`${label}: the live component renders exactly what calculatePrayerDay independently computes for this country`, async () => {
      saveManualLocation({ source: "manual", latitude, longitude, timezone, countryCode });
      const expected = expectedFormattedTimes({ latitude, longitude }, countryCode, timezone);

      const { container, unmount } = await mount();
      for (const key of prayerOrder) {
        expect(container.textContent).toContain(expected[key]);
      }
      await unmount();
    });
  }
});

describe("PrayerTimesPanel — Step 9: changing location to another country changes the resolved calculation settings", () => {
  it("Kuwait fallback vs. a manually-selected Saudi Arabia location render genuinely different Isha times", async () => {
    const kuwaitRun = await mount();
    expect(kuwaitRun.container.textContent).toContain("19:12"); // Kuwait's pinned Isha
    await kuwaitRun.unmount();

    saveManualLocation({ source: "manual", latitude: 21.3891, longitude: 39.8579, timezone: "Asia/Riyadh", countryCode: "SA" });
    const expectedSaudi = expectedFormattedTimes({ latitude: 21.3891, longitude: 39.8579 }, "SA", "Asia/Riyadh");
    // Umm Al-Qura's Isha convention (90 minutes after Maghrib, not
    // angle-based) on genuinely different coordinates must not coincide
    // with Kuwait's own pinned Isha value.
    expect(expectedSaudi.isha).not.toBe("19:12");

    const saudiRun = await mount();
    expect(saudiRun.container.textContent).toContain(expectedSaudi.isha);
    expect(saudiRun.container.textContent).not.toContain("19:12");
    await saudiRun.unmount();
  });
});

describe("PrayerTimesPanel — automatic profile, location-local day, no overrides", () => {
  it("a method/madhab choice stored by an older version has no effect on the displayed times", async () => {
    const turkey = { latitude: 39.9334, longitude: 32.8597, timezone: "Europe/Istanbul", countryCode: "TR" };
    saveManualLocation({ source: "manual", ...turkey });
    const expected = expectedFormattedTimes(turkey, "TR", turkey.timezone);
    // Exactly what the removed Settings screen used to persist.
    localStorage.setItem(LEGACY_CALCULATION_SETTINGS_KEY, JSON.stringify({ methodOverride: "Egyptian", madhabOverride: "hanafi" }));

    const { container, unmount } = await mount();
    for (const key of prayerOrder) expect(container.textContent).toContain(expected[key]);
    await unmount();
  });

  it("a city in a zone behind the device's day shows ITS calendar day, not the device's", async () => {
    // DATE is 2026-09-14T00:00Z — still the evening of Sept 13 in New York.
    const newYork = { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", countryCode: "US" };
    saveManualLocation({ source: "manual", ...newYork });
    const sept13 = calculatePrayerDay({ coordinates: newYork, timezone: newYork.timezone, country: "US" }, { year: 2026, month: 9, day: 13 });
    const sept14 = calculatePrayerDay({ coordinates: newYork, timezone: newYork.timezone, country: "US" }, { year: 2026, month: 9, day: 14 });
    const fajr13 = formatPrayerTime(sept13.times.fajr, newYork.timezone);
    expect(fajr13).not.toBe(formatPrayerTime(sept14.times.fajr, newYork.timezone));

    const { container, unmount } = await mount();
    expect(container.textContent).toContain(fajr13);
    await unmount();
  });
});

describe("PrayerTimesPanel — Step 9: high-latitude locations never render an invalid time", () => {
  it("Reykjavik, Iceland: all six rendered times are valid HH:MM strings, never NaN/invalid", async () => {
    const REYKJAVIK = { latitude: 64.1466, longitude: -21.9426 };
    saveManualLocation({ source: "manual", latitude: REYKJAVIK.latitude, longitude: REYKJAVIK.longitude, timezone: "Atlantic/Reykjavik" });
    const expected = expectedFormattedTimes(REYKJAVIK, undefined, "Atlantic/Reykjavik");

    const { container, unmount } = await mount();
    expect(container.textContent).not.toContain("NaN");
    for (const key of prayerOrder) {
      expect(expected[key]).toMatch(/^\d{2}:\d{2}$/);
      expect(container.textContent).toContain(expected[key]);
    }
    await unmount();
  });
});

// Regression coverage for the displayed "current location" label — it
// must be sourced from the SAME useCoordinates() record the calculation
// above already reads, never a static "Kuwait" placeholder (that was the
// actual bug: the label used to be a hardcoded content.ts string,
// completely independent of the active location, so switching to e.g.
// Makkah via Settings > Location recalculated Prayer Times correctly but
// left the label reading "Kuwait" forever).
describe("PrayerTimesPanel — displayed location label reflects the active location, never a stale 'Kuwait'", () => {
  it("with no manual location and no geolocation (the genuine Kuwait fallback), the label reads Kuwait", async () => {
    const { container, unmount } = await mount();
    expect(container.textContent).toContain("الكويت");
    await unmount();
  });

  it("selecting Makkah (Mecca), Saudi Arabia from the bundled city list updates the label away from Kuwait", async () => {
    const mecca = CITIES.find((c) => c.id === "mecca")!;
    saveManualLocation({
      source: "manual",
      latitude: mecca.latitude,
      longitude: mecca.longitude,
      timezone: mecca.timezone,
      countryCode: mecca.countryCode,
      cityNameAr: mecca.nameAr,
      cityNameEn: mecca.nameEn,
    });

    const { container, unmount } = await mount();
    expect(container.textContent).toContain(mecca.nameAr); // "مكة المكرمة"
    expect(container.textContent).toContain(mecca.countryNameAr); // "السعودية"
    expect(container.textContent).not.toContain("الكويت");
    await unmount();
  });

  it("selecting London, United Kingdom updates the label accordingly (not stuck on the previous Makkah selection either)", async () => {
    const mecca = CITIES.find((c) => c.id === "mecca")!;
    saveManualLocation({
      source: "manual",
      latitude: mecca.latitude,
      longitude: mecca.longitude,
      timezone: mecca.timezone,
      countryCode: mecca.countryCode,
      cityNameAr: mecca.nameAr,
      cityNameEn: mecca.nameEn,
    });
    const meccaRun = await mount();
    expect(meccaRun.container.textContent).toContain(mecca.nameAr);
    await meccaRun.unmount();

    const london = CITIES.find((c) => c.id === "london")!;
    saveManualLocation({
      source: "manual",
      latitude: london.latitude,
      longitude: london.longitude,
      timezone: london.timezone,
      countryCode: london.countryCode,
      cityNameAr: london.nameAr,
      cityNameEn: london.nameEn,
    });

    const londonRun = await mount();
    expect(londonRun.container.textContent).toContain(london.nameAr); // "لندن"
    expect(londonRun.container.textContent).toContain(london.countryNameAr); // "المملكة المتحدة"
    expect(londonRun.container.textContent).not.toContain("الكويت");
    expect(londonRun.container.textContent).not.toContain(mecca.nameAr);
    await londonRun.unmount();
  });

  it.each([
    { id: "mumbai", label: "Mumbai" },
    { id: "delhi", label: "Delhi" },
  ])("selecting $label, India from Settings > Location updates the label and calculation, independently of first-launch permission flow", async ({ id }) => {
    const city = CITIES.find((c) => c.id === id)!;
    saveManualLocation({
      source: "manual",
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      countryCode: city.countryCode,
      cityNameAr: city.nameAr,
      cityNameEn: city.nameEn,
    });

    const { container, unmount } = await mount();
    expect(container.textContent).toContain(city.nameAr);
    expect(container.textContent).toContain(city.countryNameAr); // "الهند"
    expect(container.textContent).not.toContain("الكويت");
    await unmount();
  });

  it("a manual selection made right after resetLocationSettingsForTesting() (the first-launch reset) still activates normally — the two are fully independent", async () => {
    resetLocationSettingsForTesting();
    const mecca = CITIES.find((c) => c.id === "mecca")!;
    saveManualLocation({
      source: "manual",
      latitude: mecca.latitude,
      longitude: mecca.longitude,
      timezone: mecca.timezone,
      countryCode: mecca.countryCode,
      cityNameAr: mecca.nameAr,
      cityNameEn: mecca.nameEn,
    });

    const { container, unmount } = await mount();
    expect(container.textContent).toContain(mecca.nameAr);
    expect(container.textContent).not.toContain("الكويت");
    await unmount();
  });

  it("a device GPS fix with a country-only estimate (Step 7) never falls back to the Kuwait label either", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          // Matches cities.ts's own London entry closely enough for the
          // offline nearest-city country estimate (reverseGeocode.ts) to
          // resolve to the United Kingdom, with no cityName (device fixes
          // never carry one — see useCoordinates.ts).
          success({ coords: { latitude: 51.5072, longitude: -0.1276 } } as GeolocationPosition);
        },
      },
    });

    const { container, unmount } = await mount();
    expect(container.textContent).toContain("المملكة المتحدة"); // country name only
    expect(container.textContent).not.toContain("الكويت");
    await unmount();
  });
});

// Sanity check that this file's own Kuwait fallback path genuinely uses
// KUWAIT_CITY_COORDINATES (the same constant the rest of the codebase
// pins Kuwait's regression values against) — guards against this test
// file silently drifting from what "the Kuwait fallback" actually means
// elsewhere.
describe("PrayerTimesPanel — Step 9: sanity", () => {
  it("KUWAIT_CITY_COORDINATES matches the coordinates the Kuwait fallback test above implicitly relies on", () => {
    expect(KUWAIT_CITY_COORDINATES.latitude).toBeCloseTo(29.3759, 3);
    expect(KUWAIT_CITY_COORDINATES.longitude).toBeCloseTo(47.9774, 3);
  });
});

describe("PrayerTimesPanel — a brand-new user is never shown Kuwait while his location is being detected", () => {
  const original = navigator.geolocation;
  afterEach(() => Object.defineProperty(navigator, "geolocation", { value: original, configurable: true }));

  it("while the first detection is pending: 'detecting…', no Kuwait, no times", async () => {
    resetLocationSettingsForTesting();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: () => {} } }); // the permission prompt is still open
    const { container, unmount } = await mount();
    expect(container.textContent).toContain("جارٍ تحديد موقعك");
    expect(container.textContent).not.toContain("الكويت");
    expect(container.textContent).toContain("--:--");
    await unmount();
  });

  it("once detection fails, Kuwait is used — and labelled as the default location, not as detected", async () => {
    resetLocationSettingsForTesting();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_s: PositionCallback, error: PositionErrorCallback) => error({ code: 1, message: "denied" } as GeolocationPositionError) },
    });
    const { container, unmount } = await mount();
    expect(container.textContent).toContain("الكويت");
    expect(container.textContent).toContain("الموقع الافتراضي");
    expect(container.textContent).not.toContain("--:--");
    await unmount();
  });
});


describe("PrayerTimesPanel — a GPS fix far from every bundled city still gets its country's profile", () => {
  const original = navigator.geolocation;
  afterEach(() => Object.defineProperty(navigator, "geolocation", { value: original, configurable: true }));

  it("a device fix in Luxor (hundreds of km from any bundled city) is calculated with the Egyptian method and labelled Egypt", async () => {
    resetLocationSettingsForTesting();
    const LUXOR = { latitude: 25.6872, longitude: 32.6396 };
    saveLastActiveLocation({ source: "device", ...LUXOR, timezone: "Africa/Cairo" }); // no countryCode stored
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const { container, unmount } = await mount();
    const egyptian = expectedFormattedTimes(LUXOR, "EG", "Africa/Cairo");
    // "ZZ" is no country at all — what the fix would get with no country: the Muslim World League fallback.
    const mwl = expectedFormattedTimes(LUXOR, "ZZ", "Africa/Cairo");
    expect(egyptian.fajr).not.toBe(mwl.fajr); // the method genuinely matters here
    for (const key of prayerOrder) expect(container.textContent, key).toContain(egyptian[key]);
    expect(container.textContent).toContain("مصر"); // the borders identify Egypt
    await unmount();
  });

  it("a device fix in Tabuk on an unusable device timezone (UTC) is calculated with Umm al-Qura, on Riyadh's clock", async () => {
    resetLocationSettingsForTesting();
    const TABUK = { latitude: 28.3835, longitude: 36.5662 };
    saveLastActiveLocation({ source: "device", ...TABUK, timezone: "UTC" });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const { container, unmount } = await mount();
    const expected = expectedFormattedTimes(TABUK, "SA", "Asia/Riyadh");
    for (const key of prayerOrder) expect(container.textContent, key).toContain(expected[key]);
    expect(container.textContent).toContain("السعودية");
    await unmount();
  });
});

describe("Home's prominent panel (variant=\"hero\")", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLocationSettingsForTesting();
  });

  it("keeps every time, the countdown and both switches; the mihrab is decoration only — hidden from screen readers, no direction shown", async () => {
    const { container, unmount } = await mount("hero");
    const panel = container.querySelector("[data-prayer-panel='hero']")!;
    const expected = expectedFormattedTimes(KUWAIT_CITY_COORDINATES, "KW", "Asia/Kuwait");
    expect(prayerOrder.map((k) => panel.querySelector(`[data-prayer='${k}']`)!.textContent)).toEqual(prayerOrder.map((k) => expect.stringContaining(expected[k])));
    expect(panel.querySelectorAll("[data-prayer][data-next]")).toHaveLength(1);
    expect(panel.querySelector("[data-next-prayer-countdown]")).not.toBeNull();
    expect(panel.querySelector("[data-switch='prayer-notifications']")).not.toBeNull();
    expect(panel.querySelector("[data-switch='audio-adhkar']")).not.toBeNull();
    const mihrab = panel.querySelector("[data-mihrab]")!;
    expect(mihrab.getAttribute("aria-hidden")).toBe("true");
    expect(panel.textContent).not.toMatch(/القبلة|Qibla|°/);
    await unmount();
  });
});
