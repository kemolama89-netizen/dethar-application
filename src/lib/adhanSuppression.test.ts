// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { ADHAN_PAUSE_MINUTES, buildAdhanWindows, currentPrayerLocation, isInAdhanPause, mergeWindows, nextAdhanPauseStart } from "./adhanSuppression";
import { calculatePrayerDay, REMINDER_PRAYER_ORDER } from "./prayerTimes";
import { localDateIn } from "./locationTime";
import { saveManualLocation } from "./locationSettings";

const MIN = 60_000;

beforeEach(() => localStorage.clear());

describe("adhan pause windows (each adhan + 30 minutes)", () => {
  const now = new Date("2026-10-10T00:30:00Z"); // 03:30 in Kuwait

  it("start at each of the five adhan times the app shows and last 30 minutes — Shuruq excluded", () => {
    const location = currentPrayerLocation();
    const { times } = calculatePrayerDay(location, localDateIn(now, location.timezone));
    const windows = buildAdhanWindows(now);
    for (const key of REMINDER_PRAYER_ORDER) {
      const start = times[key].getTime();
      expect(windows, key).toContainEqual([start, start + ADHAN_PAUSE_MINUTES * MIN]);
    }
    expect(windows.some(([s]) => s === times.shuruq.getTime())).toBe(false);
  });

  it("uses the app's own location: the Kuwait fallback until one is known, then the chosen city", () => {
    expect(currentPrayerLocation().timezone).toBe("Asia/Kuwait");
    const kuwait = buildAdhanWindows(now);
    saveManualLocation({ source: "manual", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo", countryCode: "EG", cityNameAr: "القاهرة", cityNameEn: "Cairo" });
    expect(currentPrayerLocation().timezone).toBe("Africa/Cairo");
    expect(buildAdhanWindows(now)).not.toEqual(kuwait);
  });

  it("covers about 30 days ahead and drops windows already over", () => {
    const windows = buildAdhanWindows(now);
    expect(windows.length).toBeGreaterThanOrEqual(30 * 5);
    for (const [, end] of windows) expect(end).toBeGreaterThan(now.getTime());
    expect(windows.at(-1)![0] - now.getTime()).toBeGreaterThan(29 * 24 * 60 * MIN);
  });

  it("merges overlapping windows so they act as one", () => {
    expect(mergeWindows([[100, 200], [150, 300], [400, 500], [500, 600]])).toEqual([[100, 300], [400, 600]]);
  });

  it("pauses from the adhan (inclusive) until 30 minutes after it (exclusive)", () => {
    const w = [[1_000, 1_000 + 30 * MIN]] as const;
    expect(isInAdhanPause(999, w)).toBe(false);
    expect(isInAdhanPause(1_000, w)).toBe(true);
    expect(isInAdhanPause(1_000 + 30 * MIN - 1, w)).toBe(true);
    expect(isInAdhanPause(1_000 + 30 * MIN, w)).toBe(false);
    expect(nextAdhanPauseStart(0, w)).toBe(1_000);
    expect(nextAdhanPauseStart(1_000, w)).toBeNull();
  });
});
