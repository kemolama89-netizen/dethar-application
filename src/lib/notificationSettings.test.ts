// @vitest-environment jsdom
//
// Regression coverage for notificationSettings.ts — the persisted
// preference store for Dhikr/reminder notifications. Deliberately tests
// ONLY persistence semantics; scheduling behavior lives in
// notificationService.test.ts.
import { describe, expect, it, beforeEach } from "vitest";
import { loadNotificationSettings, saveNotificationSettings } from "./notificationSettings";
import { loadTasbeehCounters } from "./tasbeehCounters";
import { commitManualTasbeehRepetition } from "./tasbeehCommit";
import { getTasbeehStats, clearAllStats } from "./stats";

const ALL = { kind: "all" } as const;

beforeEach(() => {
  localStorage.clear();
  clearAllStats();
});

describe("loadNotificationSettings", () => {
  it("defaults to disabled with no reminder times when nothing is persisted", () => {
    expect(loadNotificationSettings()).toEqual({ enabled: false, times: [] });
  });

  it("returns exactly what was previously saved", () => {
    saveNotificationSettings({ enabled: true, times: ["07:30"] });
    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["07:30"] });
  });

  it("starts clean rather than throwing on corrupt storage", () => {
    localStorage.setItem("dithar:notifications:settings:v1", "{not json");
    expect(loadNotificationSettings()).toEqual({ enabled: false, times: [] });
  });

  it("tolerates a malformed shape (non-array times, non-boolean enabled) rather than throwing", () => {
    localStorage.setItem("dithar:notifications:settings:v1", JSON.stringify({ enabled: "yes", times: "07:30" }));
    expect(loadNotificationSettings()).toEqual({ enabled: false, times: [] });
  });
});

describe("saveNotificationSettings", () => {
  it("persists independently across calls — the store is a plain overwrite, not an append", () => {
    saveNotificationSettings({ enabled: true, times: ["06:00"] });
    saveNotificationSettings({ enabled: false, times: [] });
    expect(loadNotificationSettings()).toEqual({ enabled: false, times: [] });
  });
});

describe("isolation from Tasbeeh counting/statistics", () => {
  it("saving notification settings never touches Tasbeeh counters or Statistics", () => {
    commitManualTasbeehRepetition({}, 1);
    saveNotificationSettings({ enabled: true, times: ["05:00"] });

    expect(loadTasbeehCounters()[1]).toBe(1);
    expect(getTasbeehStats(ALL).total).toBe(1);
  });

  it("a Tasbeeh repetition never touches saved notification settings", () => {
    saveNotificationSettings({ enabled: true, times: ["05:00"] });
    commitManualTasbeehRepetition({}, 1);

    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["05:00"] });
  });
});
