// @vitest-environment jsdom
//
// Regression coverage for prayerReminderSettings.ts — persistence only
// (mirrors notificationSettings.test.ts's own scope split: scheduling
// behavior lives in usePrayerReminder.test.tsx). Also verifies isolation
// from the pre-existing, differently-keyed Dhikr reminder settings.
import { describe, expect, it, beforeEach } from "vitest";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import { loadNotificationSettings, saveNotificationSettings } from "./notificationSettings";

beforeEach(() => {
  localStorage.clear();
});

describe("loadPrayerReminderSettings", () => {
  it("defaults to disabled when nothing is persisted", () => {
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false });
  });

  it("returns exactly what was previously saved", () => {
    savePrayerReminderSettings({ enabled: true });
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true });
  });

  it("persists across a simulated app restart (a fresh load call)", () => {
    savePrayerReminderSettings({ enabled: true });
    // Simulate restart: nothing but storage carries over.
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true });
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true });
  });

  it("starts clean rather than throwing on corrupt storage", () => {
    localStorage.setItem("dithar:prayer-reminder:settings:v1", "{not json");
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false });
  });

  it("tolerates a malformed shape rather than throwing", () => {
    localStorage.setItem("dithar:prayer-reminder:settings:v1", JSON.stringify({ enabled: "yes" }));
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false });
  });
});

describe("isolation from the Dhikr reminder (Settings > Reminders)", () => {
  it("saving Prayer Reminder settings never touches the Dhikr reminder's settings, and vice versa", () => {
    saveNotificationSettings({ enabled: true, times: ["20:00"] });
    savePrayerReminderSettings({ enabled: true });

    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["20:00"] });
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true });

    savePrayerReminderSettings({ enabled: false });
    expect(loadNotificationSettings()).toEqual({ enabled: true, times: ["20:00"] });
  });
});
