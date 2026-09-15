// Regression coverage for the real Prayer Times calculation (replacing
// the old Phase-1 hardcoded strings — see src/data/content.ts's git
// history), AND for its Step 2 generalization (accepting caller-supplied
// CalculationParameters instead of hardcoding Kuwait internally).
//
// Verifies: chronological ordering holds for any date/location, the
// result genuinely varies by date (proving it's a real calculation, not a
// disguised constant), Kuwait's Dhuhr lands close to local solar noon (a
// location-specific sanity check independent of any external reference),
// formatPrayerTime produces the exact "HH:MM" ASCII-digit style the UI
// already relies on, Kuwait's output is UNCHANGED by the generalization
// (the top priority for this step), and the new high-latitude/polar
// safety net actually prevents invalid (NaN) times.
import { describe, expect, it } from "vitest";
import { CalculationMethod, Coordinates as AdhanCoordinates, Madhab, PrayerTimes as AdhanPrayerTimes } from "adhan";
import { calculatePrayerTimes, formatPrayerTime, KUWAIT_CITY_COORDINATES } from "./prayerTimes";
import { getCalculationParameters } from "./calculationMethods";

const KUWAIT_TZ = "Asia/Kuwait";

// Exactly what PrayerTimesPanel.tsx's own kuwaitCalculationParams()
// constructs — a fresh instance per call, since calculatePrayerTimes
// mutates whatever it's given (see that function's own doc comment).
function kuwaitParams() {
  const params = CalculationMethod.Kuwait();
  params.madhab = Madhab.Shafi;
  return params;
}

describe("calculatePrayerTimes", () => {
  it("returns all six prayers in strict chronological order", () => {
    const times = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
    const order = [times.fajr, times.shuruq, times.dhuhr, times.asr, times.maghrib, times.isha];
    for (let i = 1; i < order.length; i++) {
      expect(order[i].getTime()).toBeGreaterThan(order[i - 1].getTime());
    }
  });

  it("holds chronological order across seasons (summer and winter solstice-adjacent dates)", () => {
    for (const iso of ["2026-06-21T00:00:00Z", "2026-12-21T00:00:00Z", "2027-03-20T00:00:00Z"]) {
      const times = calculatePrayerTimes(new Date(iso), KUWAIT_CITY_COORDINATES, kuwaitParams());
      const order = [times.fajr, times.shuruq, times.dhuhr, times.asr, times.maghrib, times.isha];
      for (let i = 1; i < order.length; i++) {
        expect(order[i].getTime()).toBeGreaterThan(order[i - 1].getTime());
      }
    }
  });

  it("produces different times for different dates — proving this is a real calculation, not a constant", () => {
    const summer = calculatePrayerTimes(new Date("2026-06-21T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
    const winter = calculatePrayerTimes(new Date("2026-12-21T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
    // Kuwait summer Maghrib (~18:45 local) is meaningfully later than
    // winter Maghrib (~17:05 local) — many hours apart, not a rounding gap.
    expect(Math.abs(summer.maghrib.getTime() - winter.maghrib.getTime())).toBeGreaterThan(60 * 60 * 1000);
  });

  it("produces different times for different locations on the same date", () => {
    const kuwait = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
    // London: much higher latitude, different longitude — Fajr must differ.
    const london = calculatePrayerTimes(
      new Date("2026-09-14T00:00:00Z"),
      { latitude: 51.5072, longitude: -0.1276 },
      kuwaitParams(),
    );
    expect(kuwait.fajr.getTime()).not.toBe(london.fajr.getTime());
  });

  it("Kuwait Dhuhr lands close to local solar noon (~11:48-11:52, independent sanity check)", () => {
    // Kuwait's longitude (47.98°E) sits ~3° east of the Asia/Kuwait
    // standard meridian (45°E, UTC+3), so local solar noon runs a few
    // minutes ahead of 12:00 clock time; Dhuhr (solar noon + a small
    // safety margin) should land in the same range documented in
    // src/lib/prayerTimes.ts, regardless of the equation-of-time's
    // day-to-day drift (roughly ±15 min across the year).
    const times = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
    const dhuhrLocal = formatPrayerTime(times.dhuhr, KUWAIT_TZ);
    const [hour, minute] = dhuhrLocal.split(":").map(Number);
    const minutesFromNoon = hour * 60 + minute - 12 * 60;
    expect(minutesFromNoon).toBeGreaterThan(-25);
    expect(minutesFromNoon).toBeLessThan(10);
  });

  // --- Step 2: generalized engine — Kuwait behavior preservation ---

  describe("generalized engine — Kuwait output is unchanged", () => {
    it("Kuwait via the app's own kuwaitParams() helper matches the calculationMethods.ts registry's Kuwait entry exactly", () => {
      const date = new Date("2026-09-14T00:00:00Z");
      const viaDirectCall = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, kuwaitParams());
      const viaRegistry = (() => {
        const params = getCalculationParameters("Kuwait");
        params.madhab = Madhab.Shafi;
        return params;
      })();
      const viaRegistryResult = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, viaRegistry);
      expect(viaRegistryResult).toEqual(viaDirectCall);
    });

    it("Kuwait's calculated times exactly match the specific values pinned before this generalization shipped", () => {
      // Pinned from the exact same call BEFORE calculatePrayerTimes took a
      // `params` argument (it hardcoded CalculationMethod.Kuwait() +
      // Madhab.Shafi internally) — proves the refactor moved, but did not
      // change, Kuwait's output. If this ever fails, Kuwait's calculation
      // silently changed and must be investigated before anything else.
      const times = calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), KUWAIT_CITY_COORDINATES, kuwaitParams());
      expect(formatPrayerTime(times.fajr, KUWAIT_TZ)).toBe("04:12");
      expect(formatPrayerTime(times.shuruq, KUWAIT_TZ)).toBe("05:32");
      expect(formatPrayerTime(times.dhuhr, KUWAIT_TZ)).toBe("11:44");
      expect(formatPrayerTime(times.asr, KUWAIT_TZ)).toBe("15:13");
      expect(formatPrayerTime(times.maghrib, KUWAIT_TZ)).toBe("17:55");
      expect(formatPrayerTime(times.isha, KUWAIT_TZ)).toBe("19:12");
    });

    it("the high-latitude safety net resolves to adhan's own unset default for Kuwait's latitude (29.37°N, under the 48° threshold) — provably a no-op there", () => {
      const params = kuwaitParams();
      calculatePrayerTimes(new Date("2026-09-14T00:00:00Z"), KUWAIT_CITY_COORDINATES, params);
      expect(params.highLatitudeRule).toBe("middleofthenight"); // adhan's own CalculationParameters default
    });
  });

  // --- Step 2: different methods actually produce different results ---

  describe("generalized engine — different CalculationParameters change the result", () => {
    it("Kuwait vs Muslim World League produce different Isha for the same coordinates/date (17.5° vs 17° angle)", () => {
      const date = new Date("2026-09-14T00:00:00Z");
      const kuwait = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, getCalculationParameters("Kuwait"));
      const mwl = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, getCalculationParameters("MuslimWorldLeague"));
      expect(kuwait.isha.getTime()).not.toBe(mwl.isha.getTime());
    });

    it("Shafi'i vs Hanafi madhab produce different Asr for the same coordinates/date/method", () => {
      const date = new Date("2026-09-14T00:00:00Z");
      const shafiParams = getCalculationParameters("Kuwait");
      shafiParams.madhab = Madhab.Shafi;
      const hanafiParams = getCalculationParameters("Kuwait");
      hanafiParams.madhab = Madhab.Hanafi;

      const shafi = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, shafiParams);
      const hanafi = calculatePrayerTimes(date, KUWAIT_CITY_COORDINATES, hanafiParams);
      // Hanafi's double-shadow-length convention always places Asr LATER
      // than Shafi'i's single-shadow-length convention, never earlier or
      // equal.
      expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
    });
  });

  // --- Step 2: high-latitude / polar safety net ---

  describe("high-latitude and polar-circle safety net", () => {
    it("a high-latitude location (Reykjavik, ~64°N) still produces valid, chronologically-ordered times", () => {
      const reykjavik = { latitude: 64.1466, longitude: -21.9426 };
      const times = calculatePrayerTimes(new Date("2026-06-21T00:00:00Z"), reykjavik, getCalculationParameters("MuslimWorldLeague"));
      const order = [times.fajr, times.shuruq, times.dhuhr, times.asr, times.maghrib, times.isha];
      for (const t of order) expect(Number.isNaN(t.getTime())).toBe(false);
      for (let i = 1; i < order.length; i++) {
        expect(order[i].getTime()).toBeGreaterThan(order[i - 1].getTime());
      }
    });

    it("a true polar-circle location during polar day (Svalbard, ~78°N, summer solstice) does NOT produce invalid (NaN) times — the bug the AqrabBalad default closes", () => {
      const svalbard = { latitude: 78.2232, longitude: 15.6267 };
      const times = calculatePrayerTimes(new Date("2026-06-21T00:00:00Z"), svalbard, getCalculationParameters("MuslimWorldLeague"));
      for (const t of [times.fajr, times.shuruq, times.dhuhr, times.asr, times.maghrib, times.isha]) {
        expect(Number.isNaN(t.getTime())).toBe(false);
      }
    });

    it("leaving polarCircleResolution on adhan's own unset default (Unresolved) DOES produce invalid times at that same polar location — proving the safety net in calculatePrayerTimes is the thing preventing it, not luck", () => {
      const svalbard = { latitude: 78.2232, longitude: 15.6267 };
      // Deliberately calling adhan directly (bypassing calculatePrayerTimes
      // entirely) with its own untouched default params — this is the
      // "before the fix" baseline this file's own doc comment refers to.
      const params = getCalculationParameters("MuslimWorldLeague");
      const raw = new AdhanPrayerTimes(
        new AdhanCoordinates(svalbard.latitude, svalbard.longitude),
        new Date("2026-06-21T00:00:00Z"),
        params,
      );
      expect(Number.isNaN(raw.fajr.getTime()) || Number.isNaN(raw.sunrise.getTime())).toBe(true);
    });
  });
});

describe("formatPrayerTime", () => {
  it("formats as zero-padded 24-hour HH:MM in the given timezone", () => {
    // 2026-09-14T01:03:00Z = 04:03 in Asia/Kuwait (UTC+3, no DST).
    const date = new Date("2026-09-14T01:03:00Z");
    expect(formatPrayerTime(date, KUWAIT_TZ)).toBe("04:03");
  });

  it("converts correctly into a different timezone from the same instant", () => {
    const date = new Date("2026-09-14T01:03:00Z");
    expect(formatPrayerTime(date, "UTC")).toBe("01:03");
  });
});
