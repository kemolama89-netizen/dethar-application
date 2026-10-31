// @vitest-environment jsdom
//
// Regression coverage for prayerReminderSettings.ts — persistence only
// (scheduling lives in prayerNotifications.test.ts). Also verifies isolation
// from the pre-existing, differently-keyed Dhikr reminder settings.
import { describe, expect, it, beforeEach } from "vitest";
import { NOTIFIED_PRAYERS, loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import { loadNotificationSettings, saveNotificationSettings } from "./notificationSettings";

const ALL_ON = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

beforeEach(() => {
  localStorage.clear();
});

describe("loadPrayerReminderSettings", () => {
  it("defaults to off, with every prayer's own switch on", () => {
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false, prayers: ALL_ON });
    expect(NOTIFIED_PRAYERS).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]); // never Shuruq
  });

  it("returns exactly what was saved — the master switch and each prayer's own", () => {
    const settings = { enabled: true, prayers: { ...ALL_ON, asr: false, isha: false } };
    savePrayerReminderSettings(settings);
    expect(loadPrayerReminderSettings()).toEqual(settings);
  });

  it("persists across a simulated app restart (a fresh load call)", () => {
    savePrayerReminderSettings({ enabled: true, prayers: { ...ALL_ON, fajr: false } });
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true, prayers: { ...ALL_ON, fajr: false } });
  });

  it("a choice saved before per-prayer switches existed carries over with every prayer on", () => {
    localStorage.setItem("dithar:prayer-reminder:settings:v1", JSON.stringify({ enabled: true }));
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true, prayers: ALL_ON });
  });

  it("starts clean rather than throwing on corrupt storage or a malformed shape", () => {
    localStorage.setItem("dithar:prayer-reminder:settings:v1", "{not json");
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false, prayers: ALL_ON });
    localStorage.setItem("dithar:prayer-reminder:settings:v1", JSON.stringify({ enabled: "yes", prayers: "no" }));
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false, prayers: ALL_ON });
  });
});

describe("isolation from the Dhikr reminder (Settings > Reminders)", () => {
  it("saving prayer notification settings never touches the Dhikr reminder's settings, and vice versa", () => {
    saveNotificationSettings({ enabled: true, times: ["20:00"] });
    savePrayerReminderSettings({ enabled: true, prayers: ALL_ON });
    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["20:00"] });
    savePrayerReminderSettings({ enabled: false, prayers: ALL_ON });
    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["20:00"] });
  });
});
