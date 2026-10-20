// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSummarySnapshot, loadSummarySettings, saveSummarySettings } from "./dailySummary";
import { clearAllStats, getDailyActivity, recordAudioRepetitions, recordTasbeehRepetitions, recordWirdComplete, recordWrittenRepetition, subscribeStatsChanges, todayLocalDate } from "./stats";

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
