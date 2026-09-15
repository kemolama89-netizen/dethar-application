// Regression coverage for the pure next-prayer/countdown logic — no
// timers, no React, just Date arithmetic, so every case (before Fajr,
// between two prayers, after Isha -> tomorrow's Fajr, and minute-boundary
// rounding) can be pinned down exactly.
import { describe, expect, it } from "vitest";
import { getNextPrayer, getRemainingTime } from "./nextPrayer";
import type { PrayerTimesResult } from "./prayerTimes";

// A fixed, made-up set of "today" times — deliberately simple round
// numbers so test expectations are easy to verify by eye, not tied to any
// real calculation output (see prayerTimes.test.ts for that).
const TODAY: PrayerTimesResult = {
  fajr: new Date("2026-09-14T04:12:00Z"),
  shuruq: new Date("2026-09-14T05:32:00Z"),
  dhuhr: new Date("2026-09-14T11:44:00Z"),
  asr: new Date("2026-09-14T15:13:00Z"),
  maghrib: new Date("2026-09-14T17:55:00Z"),
  isha: new Date("2026-09-14T19:12:00Z"),
};
const TOMORROW_FAJR = new Date("2026-09-15T04:13:00Z");

describe("getNextPrayer", () => {
  it("before Fajr -> next is today's Fajr", () => {
    const now = new Date("2026-09-14T02:00:00Z");
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "fajr", time: TODAY.fajr });
  });

  it("between Fajr and Dhuhr -> next is Dhuhr (Sunrise is never returned as 'next prayer')", () => {
    const now = new Date("2026-09-14T06:00:00Z"); // after Sunrise, before Dhuhr
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "dhuhr", time: TODAY.dhuhr });
  });

  it("between Dhuhr and Asr -> next is Asr", () => {
    const now = new Date("2026-09-14T13:00:00Z");
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "asr", time: TODAY.asr });
  });

  it("between Asr and Maghrib -> next is Maghrib", () => {
    const now = new Date("2026-09-14T16:00:00Z");
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "maghrib", time: TODAY.maghrib });
  });

  it("between Maghrib and Isha -> next is Isha", () => {
    const now = new Date("2026-09-14T18:00:00Z");
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "isha", time: TODAY.isha });
  });

  it("after Isha -> next is TOMORROW's Fajr, not today's (the wraparound case)", () => {
    const now = new Date("2026-09-14T22:00:00Z");
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, now)).toEqual({ key: "fajr", time: TOMORROW_FAJR });
  });

  it("exactly AT a prayer's instant -> that prayer no longer counts as 'next' (strictly greater-than)", () => {
    // At the exact Dhuhr instant, Dhuhr itself has arrived — the next
    // countdown target should already be Asr, not a 00:00 Dhuhr countdown.
    expect(getNextPrayer(TODAY, TOMORROW_FAJR, TODAY.dhuhr)).toEqual({ key: "asr", time: TODAY.asr });
  });

  it("never returns 'shuruq' as the next prayer under any input", () => {
    for (const isoHour of [0, 4, 5, 6, 11, 12, 15, 16, 17, 18, 19, 20, 23]) {
      const now = new Date(Date.UTC(2026, 8, 14, isoHour));
      expect(getNextPrayer(TODAY, TOMORROW_FAJR, now).key).not.toBe("shuruq");
    }
  });
});

describe("getRemainingTime", () => {
  it("splits into whole hours and minutes", () => {
    const target = new Date("2026-09-14T15:13:00Z");
    const now = new Date("2026-09-14T13:00:00Z"); // 2h13m before
    expect(getRemainingTime(target, now)).toEqual({ hours: 2, minutes: 13 });
  });

  it("floors rather than rounds — 59.9 minutes still reads as 59, not 60", () => {
    const target = new Date("2026-09-14T13:00:00.000Z");
    const now = new Date("2026-09-14T12:00:00.900Z"); // 59 min 59.1 sec before
    expect(getRemainingTime(target, now)).toEqual({ hours: 0, minutes: 59 });
  });

  it("shows 00 hours (not omitted) when under one hour remains", () => {
    const target = new Date("2026-09-14T13:30:00Z");
    const now = new Date("2026-09-14T13:00:00Z");
    expect(getRemainingTime(target, now)).toEqual({ hours: 0, minutes: 30 });
  });

  it("crosses an hour boundary correctly (59 -> 00 minutes, hour increments)", () => {
    const target = new Date("2026-09-14T14:00:00Z");
    const now = new Date("2026-09-14T13:00:01Z"); // 59m59s before
    expect(getRemainingTime(target, now)).toEqual({ hours: 0, minutes: 59 });
  });

  it("crosses midnight correctly (large hour count, still accurate)", () => {
    const target = new Date("2026-09-15T04:13:00Z");
    const now = new Date("2026-09-14T22:00:00Z");
    expect(getRemainingTime(target, now)).toEqual({ hours: 6, minutes: 13 });
  });

  it("never returns negative values, even for a target already in the past", () => {
    const target = new Date("2026-09-14T10:00:00Z");
    const now = new Date("2026-09-14T11:00:00Z");
    expect(getRemainingTime(target, now)).toEqual({ hours: 0, minutes: 0 });
  });
});
