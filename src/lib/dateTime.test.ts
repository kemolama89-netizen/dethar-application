// Regression coverage for the pure, deterministic parts of the Date &
// Time foundation — the local-day key and its integer conversion, which
// Lataif/Hadith's daily rotation (App.tsx) depends on directly. The
// locale-formatted strings (Gregorian/Hijri/time) are intentionally not
// asserted here — their exact rendering depends on the runtime's own ICU
// data, which is not this module's concern to pin down.
import { describe, expect, it } from "vitest";
import { getLocalDateKey, dateKeyToDayNumber } from "./dateTime";

describe("getLocalDateKey", () => {
  it("uses local getters, not UTC — a local date near a UTC day boundary keeps its own local day", () => {
    // 2026-09-13 23:30 in whatever local timezone this test runs in —
    // getFullYear/getMonth/getDate always agree with the constructor's
    // own local arguments, unlike toISOString (which would report the
    // 14th in any timezone ahead of UTC).
    const localLateNight = new Date(2026, 8, 13, 23, 30);
    expect(getLocalDateKey(localLateNight)).toBe("2026-09-13");
  });

  it("zero-pads single-digit month/day", () => {
    expect(getLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("dateKeyToDayNumber", () => {
  it("increases by exactly 1 for each consecutive calendar day", () => {
    const day1 = dateKeyToDayNumber("2026-09-13");
    const day2 = dateKeyToDayNumber("2026-09-14");
    expect(day2 - day1).toBe(1);
  });

  it("is stable for the same dateKey across repeated calls", () => {
    expect(dateKeyToDayNumber("2026-09-13")).toBe(dateKeyToDayNumber("2026-09-13"));
  });

  it("rolls over correctly across a month/year boundary", () => {
    const dec31 = dateKeyToDayNumber("2025-12-31");
    const jan1 = dateKeyToDayNumber("2026-01-01");
    expect(jan1 - dec31).toBe(1);
  });
});
