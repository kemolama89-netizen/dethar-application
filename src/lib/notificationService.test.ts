// @vitest-environment jsdom
//
// Regression coverage for notificationService.ts. What this file protects:
//   - isNotificationsAvailable() reflects Capacitor.isPluginAvailable(...)
//     exactly, so this module starts working automatically the moment a
//     real notification plugin is registered — no code change needed here.
//   - every scheduling function is a safe no-op (never throws) while
//     unavailable, which is the case on every platform today.
//   - permission is never silently reported as "granted" just because the
//     plugin happens to be unavailable.
//   - scheduleReminders/cancelReminders take an explicit channel (see the
//     type's own doc comment) — "dhikr" (Settings > Reminders) and
//     "prayer" (Prayer Times' own reminders) must stay independent.
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isPluginAvailable: vi.fn(() => false) },
}));

import { Capacitor } from "@capacitor/core";
import {
  isNotificationsAvailable,
  requestNotificationPermission,
  scheduleReminders,
  cancelReminders,
} from "./notificationService";

beforeEach(() => {
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(false);
});

describe("isNotificationsAvailable", () => {
  it("is false when no LocalNotifications-registered plugin exists (every platform today)", () => {
    expect(isNotificationsAvailable()).toBe(false);
    expect(Capacitor.isPluginAvailable).toHaveBeenCalledWith("LocalNotifications");
  });

  it("becomes true automatically once such a plugin is registered — no code change needed in this module", () => {
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    expect(isNotificationsAvailable()).toBe(true);
  });
});

describe("requestNotificationPermission", () => {
  it("resolves false (never a fake 'granted') when unavailable", async () => {
    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});

describe("scheduleReminders / cancelReminders", () => {
  it("are safe no-ops (never throw) while unavailable, for either channel", async () => {
    await expect(scheduleReminders("dhikr", [{ time: "07:00", content: { title: "t", body: "b" } }])).resolves.toBeUndefined();
    await expect(cancelReminders("dhikr")).resolves.toBeUndefined();
    await expect(
      scheduleReminders("prayer", [
        { time: "04:12", content: { title: "t", body: "Fajr" } },
        { time: "11:44", content: { title: "t", body: "Dhuhr" } },
        { time: "15:13", content: { title: "t", body: "Asr" } },
        { time: "17:55", content: { title: "t", body: "Maghrib" } },
        { time: "19:12", content: { title: "t", body: "Isha" } },
      ]),
    ).resolves.toBeUndefined();
    await expect(cancelReminders("prayer")).resolves.toBeUndefined();
  });
});
