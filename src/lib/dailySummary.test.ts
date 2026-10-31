// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSummarySnapshot, dayRecordStatus, loadSummarySettings, readDayRecords, saveSummarySettings, unavailableSummarySnapshot } from "./dailySummary";
import { clearAllStats, getDailyActivity, recordAudioListening, recordAudioRepetitions, recordFloatingTasbeehRepetitions, recordListenedSessions, recordTasbeehRepetitions, recordWirdComplete, recordWrittenRepetition, subscribeStatsChanges, todayLocalDate } from "./stats";

describe("end-of-day summary data", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllStats();
  });

  it("counts only what the user did — never audio playback", () => {
    recordWrittenRepetition("morning", "morning_001");
    recordWrittenRepetition("morning", "morning_002");
    recordWirdComplete("morning");
    recordTasbeehRepetitions(1, 33);
    recordAudioRepetitions([{ category: "misc", dhikrId: "tasbeeh-1", eventId: "native:a" }, { category: "evening", dhikrId: "morning_003", eventId: "native:b" }]);
    const today = getDailyActivity(todayLocalDate());
    expect(today).toEqual({ date: todayLocalDate(), writtenRepetitions: 2, tasbeehRepetitions: 33, wirds: ["morning"], wirdsHow: { morning: ["read"], evening: [] }, prayerSessions: 0, total: 35 });
  });

  it("reports an empty day as zero, never as missing data", () => {
    expect(getDailyActivity(todayLocalDate())).toMatchObject({ total: 0, wirds: [], prayerSessions: 0 });
  });

  it("the snapshot carries today, the 7 previous days oldest first, and when tracking began", () => {
    recordTasbeehRepetitions(2, 5);
    const snap = buildSummarySnapshot();
    expect(snap.date).toBe(todayLocalDate());
    expect(snap.today.total).toBe(5);
    expect(snap.history).toHaveLength(7);
    expect(snap.history[6].date < snap.date).toBe(true);
    expect(snap.history[0].date < snap.history[6].date).toBe(true);
    expect(snap.trackedSince).toBe(todayLocalDate());
  });

  it("says what of native's queues it already holds, so native counts each tap and recording once", () => {
    const day = todayLocalDate();
    const at = (ts: number) => ({ ts, localDate: day, localTime: "10:00:00", timeZone: "UTC" });
    expect(buildSummarySnapshot().taken).toEqual({ floatingThrough: null, audioIds: [] });
    recordFloatingTasbeehRepetitions([
      { dhikrId: 1, times: 3, occurredAt: at(1_000) },
      { dhikrId: 1, times: 2, occurredAt: at(5_000) },
    ]);
    recordAudioRepetitions([{ category: "misc", dhikrId: "tasbeeh-1", eventId: "c1", occurredAt: at(2_000) }]);
    recordAudioListening([{ category: "morning", dhikrId: "m1", eventId: "l1", part: 0, occurredAt: at(3_000), listenedMs: 9_000 }]);
    recordListenedSessions([{ category: "evening", eventId: "s1", occurredAt: at(4_000) }]);
    // Written and manual Tasbeeh never come from a native queue.
    recordWrittenRepetition("morning", "morning_001");
    recordTasbeehRepetitions(2, 4);
    const snap = buildSummarySnapshot();
    expect(snap.taken.floatingThrough).toBe(5_000);
    expect([...snap.taken.audioIds].sort()).toEqual(["c1", "l1", "s1"]);
    // 5 Floating + 4 manual + the Audio "Various" recording heard to the end — the Statistics screen's Tasbeeh count.
    expect(snap.today).toMatchObject({ writtenRepetitions: 1, tasbeehRepetitions: 10, wirds: ["evening"] });
    // Another day's snapshot holds none of today's.
    expect(buildSummarySnapshot("2000-01-01").taken).toEqual({ floatingThrough: null, audioIds: [] });
  });

  it("tells listeners when the log changes (the native snapshot then refreshes)", () => {
    const listener = vi.fn();
    const stop = subscribeStatsChanges(listener);
    recordTasbeehRepetitions(1, 1);
    clearAllStats();
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it("settings: off by default, time and content persist, invalid values fall back", () => {
    expect(loadSummarySettings()).toEqual({ enabled: false, time: "21:30", content: "combined" });
    saveSummarySettings({ enabled: true, time: "22:15", content: "stats" });
    expect(loadSummarySettings()).toEqual({ enabled: true, time: "22:15", content: "stats" });
    localStorage.setItem("dithar:daily-summary:v1", JSON.stringify({ enabled: true, time: "99:99", content: "loud" }));
    expect(loadSummarySettings()).toEqual({ enabled: true, time: "21:30", content: "combined" });
  });
});

describe("one verified status for the day's records", () => {
  const STATS_KEY = "dithar:stats:events:v1";
  const reload = () => window.dispatchEvent(new StorageEvent("storage", { key: null }));
  const noAudio = { completedPlays: 0, listenedMs: 0 };

  beforeEach(() => {
    localStorage.clear();
    clearAllStats();
  });

  it("recorded: the status and the counts come from the same read", () => {
    recordWrittenRepetition("evening", "evening_001");
    recordWirdComplete("prayer");
    const day = readDayRecords(todayLocalDate());
    expect(day.status).toBe("recorded");
    expect(day.today).toMatchObject({ writtenRepetitions: 1, prayerSessions: 1 });
    const snap = buildSummarySnapshot();
    expect(snap.status).toBe("ok");
    expect(snap.today).toEqual(day.today);
  });

  it("empty: a readable log with nothing today is verifiably empty", () => {
    expect(readDayRecords(todayLocalDate()).status).toBe("empty");
    expect(buildSummarySnapshot().status).toBe("ok");
  });

  it("a completed wird or prayer session alone is a record, even with no repetitions", () => {
    const zero = { date: "2026-10-23", writtenRepetitions: 0, tasbeehRepetitions: 0, wirds: [], wirdsHow: { morning: [], evening: [] }, prayerSessions: 0, total: 0 };
    expect(dayRecordStatus({ ...zero, wirds: ["evening"] }, noAudio, true)).toBe("recorded");
    expect(dayRecordStatus({ ...zero, prayerSessions: 1 }, noAudio, true)).toBe("recorded");
    expect(dayRecordStatus(zero, { completedPlays: 0, listenedMs: 30_000 }, true)).toBe("listening");
    expect(dayRecordStatus(zero, noAudio, true)).toBe("empty");
    // Inconsistent: counts that can't be trusted are never reported as either "recorded" or "empty".
    expect(dayRecordStatus({ ...zero, total: 5, tasbeehRepetitions: 5 }, noAudio, false)).toBe("unavailable");
    expect(dayRecordStatus(zero, noAudio, false)).toBe("unavailable");
  });

  it("an unreadable log is unavailable — never 'nothing recorded' — and the snapshot says so", () => {
    localStorage.setItem(STATS_KEY, "{not json");
    reload();
    expect(readDayRecords(todayLocalDate()).status).toBe("unavailable");
    const snap = buildSummarySnapshot();
    expect(snap.status).toBe("unavailable");
    expect(snap.date).toBe(todayLocalDate());
  });

  it("storage that can't be reached is unavailable too", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      reload();
      expect(readDayRecords(todayLocalDate()).status).toBe("unavailable");
    } finally {
      spy.mockRestore();
      reload();
    }
    expect(readDayRecords(todayLocalDate()).status).toBe("empty");
  });

  it("the fallback snapshot is dated and marked unavailable", () => {
    expect(unavailableSummarySnapshot("2026-10-23")).toMatchObject({ date: "2026-10-23", status: "unavailable", today: { total: 0 } });
  });
});
