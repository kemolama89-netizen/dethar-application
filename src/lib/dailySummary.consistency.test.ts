// @vitest-environment jsdom
// The end-of-day summary counts exactly what the Statistics screen shows —
// its "daily" period for the day, and «منذ البداية» for all time — because
// both come from the same functions (stats.ts getWirdDayStats,
// getPrayerStats, getTasbeehStats).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSummarySnapshot, statisticsCounts, summaryDayActivity } from "./dailySummary";
import {
  addDays,
  clearAllStats,
  getPrayerStats,
  getTasbeehStats,
  getWirdDayStats,
  recordAudioRepetitions,
  recordFloatingTasbeehRepetitions,
  recordTasbeehRepetitions,
  recordWirdComplete,
  recordWrittenRepetition,
  todayLocalDate,
} from "./stats";
import type { StatSelection } from "./stats";

const sumPerDhikr = (s: { perDhikr: { total: number }[] }) => s.perDhikr.reduce((n, e) => n + e.total, 0);

/** What the Statistics screen itself shows for a period. */
function screen(selection: StatSelection) {
  const morning = getWirdDayStats("morning", selection);
  const evening = getWirdDayStats("evening", selection);
  const prayer = getPrayerStats(selection);
  return {
    morningDays: morning.daysCompleted,
    eveningDays: evening.daysCompleted,
    prayerSessions: prayer.sessionsCompleted,
    tasbeeh: getTasbeehStats(selection).total,
    written: sumPerDhikr(morning) + sumPerDhikr(evening) + sumPerDhikr(prayer),
  };
}

const at = (localDate: string, ts: number) => ({ ts, localDate, localTime: "12:00:00", timeZone: "Asia/Kuwait" });

/** A day of everything the app records. */
function recordActivity() {
  recordTasbeehRepetitions(1, 7);
  recordWrittenRepetition("morning", "morning_001");
  recordWrittenRepetition("morning", "morning_002");
  recordWrittenRepetition("prayer", "prayer_001");
  recordWirdComplete("morning");
  recordWirdComplete("prayer");
  recordWirdComplete("prayer");
}

beforeEach(() => {
  localStorage.clear();
  clearAllStats();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-21T15:00:00"));
});
afterEach(() => vi.useRealTimers());

describe("activity today", () => {
  it("the day's counts are exactly the Statistics screen's daily numbers", () => {
    recordActivity();
    const today = todayLocalDate();
    const snap = buildSummarySnapshot();
    const daily = screen({ kind: "daily", date: today });
    expect(daily).toEqual({ morningDays: 1, eveningDays: 0, prayerSessions: 2, tasbeeh: 7, written: 3 });
    expect(snap.today).toMatchObject({ tasbeehRepetitions: daily.tasbeeh, writtenRepetitions: daily.written, prayerSessions: daily.prayerSessions, wirds: ["morning"], total: 10 });
    expect(statisticsCounts({ kind: "daily", date: today })).toEqual(daily);
  });

  it("all-time counts are exactly the Statistics screen's «منذ البداية» numbers, and never smaller than today's", () => {
    vi.setSystemTime(new Date("2026-10-19T09:00:00"));
    recordActivity();
    vi.setSystemTime(new Date("2026-10-21T15:00:00"));
    recordActivity();
    const snap = buildSummarySnapshot();
    expect(snap.allTime).toEqual(screen({ kind: "all" }));
    expect(snap.allTime).toEqual({ morningDays: 2, eveningDays: 0, prayerSessions: 4, tasbeeh: 14, written: 6 });
    expect(snap.allTime.tasbeeh).toBeGreaterThanOrEqual(snap.today.tasbeehRepetitions);
  });

  it("Audio \"Various\" recordings heard to the end count as Tasbeeh — as on the Statistics screen; other listening doesn't", () => {
    const today = todayLocalDate();
    recordAudioRepetitions([
      { category: "misc", dhikrId: "3", eventId: "v1", occurredAt: at(today, Date.now()) },
      { category: "morning", dhikrId: "morning_001", eventId: "m1", occurredAt: at(today, Date.now()) },
    ]);
    const snap = buildSummarySnapshot();
    expect(snap.today.tasbeehRepetitions).toBe(getTasbeehStats({ kind: "daily", date: today }).total);
    expect(snap.today.tasbeehRepetitions).toBe(1);
    // The Morning recording is listening only: not a written repetition, not a completed wird.
    expect(snap.today.writtenRepetitions).toBe(0);
    expect(snap.today.wirds).toEqual([]);
    expect(snap.audio.completedPlays).toBe(2);
  });
});

describe("no activity today", () => {
  it("but earlier activity: today is empty, all-time keeps what was recorded", () => {
    vi.setSystemTime(new Date("2026-10-18T20:00:00"));
    recordActivity();
    vi.setSystemTime(new Date("2026-10-21T15:00:00"));
    const snap = buildSummarySnapshot();
    expect(snap.today.total).toBe(0);
    expect(snap.today.wirds).toEqual([]);
    expect(snap.today.prayerSessions).toBe(0);
    expect(snap.allTime).toEqual({ morningDays: 1, eveningDays: 0, prayerSessions: 2, tasbeeh: 7, written: 3 });
    expect(snap.trackedSince).toBe("2026-10-18");
  });

  it("and nothing ever recorded: all zero, no tracking date", () => {
    const snap = buildSummarySnapshot();
    expect(snap.today.total).toBe(0);
    expect(snap.allTime).toEqual({ morningDays: 0, eveningDays: 0, prayerSessions: 0, tasbeeh: 0, written: 0 });
    expect(snap.trackedSince).toBeNull();
    expect(snap.history.every((h) => h.total === 0)).toBe(true);
  });
});

describe("date boundaries", () => {
  it("an activity belongs to the local day it was recorded on — the same day the Statistics screen files it under", () => {
    // 23:30 on the 20th in Kuwait is 20:30 UTC: the 20th, never the 21st.
    recordFloatingTasbeehRepetitions([{ dhikrId: 1, times: 4, occurredAt: at("2026-10-20", Date.UTC(2026, 9, 20, 20, 30)) }]);
    expect(summaryDayActivity("2026-10-20").tasbeehRepetitions).toBe(4);
    expect(summaryDayActivity("2026-10-21").tasbeehRepetitions).toBe(0);
    expect(summaryDayActivity("2026-10-20").tasbeehRepetitions).toBe(getTasbeehStats({ kind: "daily", date: "2026-10-20" }).total);
  });

  it("the comparison history uses the same daily counts", () => {
    recordFloatingTasbeehRepetitions([{ dhikrId: 1, times: 6, occurredAt: at("2026-10-20", Date.UTC(2026, 9, 20, 9)) }]);
    const snap = buildSummarySnapshot("2026-10-21");
    expect(snap.history.at(-1)).toEqual({ date: "2026-10-20", total: 6 });
    for (const h of snap.history) expect(h.total).toBe(statisticsCounts({ kind: "daily", date: h.date }).tasbeeh + statisticsCounts({ kind: "daily", date: h.date }).written);
  });

  it("over many days, every day's summary matches the screen and the days add up to all-time", () => {
    const start = "2026-10-01";
    for (let i = 0; i < 15; i++) {
      const day = addDays(start, i);
      if (i % 3 !== 0) recordFloatingTasbeehRepetitions([{ dhikrId: 2, times: i, occurredAt: at(day, Date.UTC(2026, 9, 1 + i, 8)) }]);
    }
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const day = addDays(start, i);
      const mine = summaryDayActivity(day).tasbeehRepetitions;
      expect(mine).toBe(getTasbeehStats({ kind: "daily", date: day }).total);
      sum += mine;
    }
    expect(sum).toBe(statisticsCounts({ kind: "all" }).tasbeeh);
  });
});
