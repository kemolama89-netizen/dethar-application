// @vitest-environment jsdom
//
// Regression coverage for usePrayerReminder: ON/OFF persistence across a
// simulated restart, permission requested exactly once per explicit
// enable (never on a reactive reschedule), disabling cancels the "prayer"
// channel specifically (never touching "dhikr"), and changing
// times/timezone/language while enabled reschedules WITHOUT creating
// duplicates — scheduleReminders is called again with the fresh entries,
// never accumulating extra calls beyond what each change warrants.
// notificationService.ts itself is mocked so call counts/args can be
// asserted precisely (its own real no-op behavior is covered by
// notificationService.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { usePrayerReminder } from "./usePrayerReminder";
import type { PrayerTimesResult } from "./prayerTimes";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";

const scheduleReminders = vi.fn().mockResolvedValue(undefined);
const cancelReminders = vi.fn().mockResolvedValue(undefined);
const requestNotificationPermission = vi.fn().mockResolvedValue(false);
let notificationsAvailable = false;

vi.mock("./notificationService", () => ({
  isNotificationsAvailable: () => notificationsAvailable,
  requestNotificationPermission: (...args: unknown[]) => requestNotificationPermission(...args),
  scheduleReminders: (...args: unknown[]) => scheduleReminders(...args),
  cancelReminders: (...args: unknown[]) => cancelReminders(...args),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: ReturnType<typeof usePrayerReminder> | undefined;
function Probe({ times, timezone, language }: { times: PrayerTimesResult; timezone: string; language: "ar" | "en" }) {
  latest = usePrayerReminder(times, timezone, language);
  return null;
}

async function mount(times: PrayerTimesResult, timezone: string, language: "ar" | "en") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Probe times={times} timezone={timezone} language={language} />);
  });
  return {
    rerender: async (nextTimes: PrayerTimesResult, nextTimezone: string, nextLanguage: "ar" | "en") => {
      await act(async () => {
        root.render(<Probe times={nextTimes} timezone={nextTimezone} language={nextLanguage} />);
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
      latest = undefined;
    },
  };
}

async function toggle() {
  await act(async () => {
    latest?.toggle();
  });
}

// Values are ISO UTC; Asia/Kuwait is a fixed UTC+3 (no DST), so e.g.
// "01:12:00Z" formats as "04:12" there — see the assertions below, which
// expect the Kuwait-local reading.
const TODAY: PrayerTimesResult = {
  fajr: new Date("2026-09-14T01:12:00Z"),
  shuruq: new Date("2026-09-14T02:32:00Z"),
  dhuhr: new Date("2026-09-14T08:44:00Z"),
  asr: new Date("2026-09-14T12:13:00Z"),
  maghrib: new Date("2026-09-14T14:55:00Z"),
  isha: new Date("2026-09-14T16:12:00Z"),
};
const TOMORROW: PrayerTimesResult = {
  fajr: new Date("2026-09-15T01:13:00Z"),
  shuruq: new Date("2026-09-15T02:33:00Z"),
  dhuhr: new Date("2026-09-15T08:44:00Z"),
  asr: new Date("2026-09-15T12:12:00Z"),
  maghrib: new Date("2026-09-15T14:53:00Z"),
  isha: new Date("2026-09-15T16:10:00Z"),
};

beforeEach(() => {
  localStorage.clear();
  scheduleReminders.mockClear();
  cancelReminders.mockClear();
  requestNotificationPermission.mockClear();
  notificationsAvailable = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePrayerReminder", () => {
  it("starts disabled by default and does not schedule anything", async () => {
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    expect(latest?.enabled).toBe(false);
    expect(scheduleReminders).not.toHaveBeenCalled();
    await unmount();
  });

  it("toggling ON requests permission exactly once, persists the preference, and schedules the 5 real prayers (never Sunrise) under the 'prayer' channel", async () => {
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();

    expect(latest?.enabled).toBe(true);
    expect(loadPrayerReminderSettings()).toEqual({ enabled: true });
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(scheduleReminders).toHaveBeenCalledTimes(1);

    const [channel, entries] = scheduleReminders.mock.calls[0];
    expect(channel).toBe("prayer");
    expect(entries).toHaveLength(5);
    expect(entries.map((e: { time: string }) => e.time)).toEqual(["04:12", "11:44", "15:13", "17:55", "19:12"]);
    expect(entries.every((e: { content: { body: string } }) => !e.content.body.includes("undefined"))).toBe(true);
    await unmount();
  });

  it("toggling OFF cancels the 'prayer' channel specifically and persists the preference", async () => {
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle(); // on
    await toggle(); // off

    expect(latest?.enabled).toBe(false);
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false });
    expect(cancelReminders).toHaveBeenCalledWith("prayer");
    expect(cancelReminders).not.toHaveBeenCalledWith("dhikr");
    await unmount();
  });

  it("persists ON across a simulated app restart (fresh mount reads storage) and reschedules once, without re-prompting for permission", async () => {
    savePrayerReminderSettings({ enabled: true });
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");

    expect(latest?.enabled).toBe(true);
    expect(requestNotificationPermission).not.toHaveBeenCalled(); // never re-prompted
    expect(scheduleReminders).toHaveBeenCalledTimes(1); // still (re)scheduled with today's real times
    await unmount();
  });

  it("changing times (new day/location) while enabled reschedules — no duplicate calls beyond the one change", async () => {
    const { rerender, unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();
    expect(scheduleReminders).toHaveBeenCalledTimes(1);

    await rerender(TOMORROW, "Asia/Kuwait", "en");
    expect(scheduleReminders).toHaveBeenCalledTimes(2);
    const [, entries] = scheduleReminders.mock.calls[1];
    expect(entries.map((e: { time: string }) => e.time)).toEqual(["04:13", "11:44", "15:12", "17:53", "19:10"]);
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1); // still only the original toggle
    await unmount();
  });

  it("changing location (timezone) while enabled reschedules with correctly-reformatted times", async () => {
    const { rerender, unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();
    expect(scheduleReminders).toHaveBeenCalledTimes(1);

    await rerender(TODAY, "UTC", "en");
    expect(scheduleReminders).toHaveBeenCalledTimes(2);
    const [, entries] = scheduleReminders.mock.calls[1];
    // Same instants, reformatted in UTC instead of Asia/Kuwait (-3h).
    expect(entries.map((e: { time: string }) => e.time)).toEqual(["01:12", "08:44", "12:13", "14:55", "16:12"]);
    await unmount();
  });

  it("switching language while enabled reschedules with the new language's notification text — Arabic and English never mix", async () => {
    const { rerender, unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();
    const [, enEntries] = scheduleReminders.mock.calls[0];
    expect(enEntries[0].content.title).toMatch(/^[\x00-\x7F]*$/); // ASCII-only (English)

    await rerender(TODAY, "Asia/Kuwait", "ar");
    expect(scheduleReminders).toHaveBeenCalledTimes(2);
    const [, arEntries] = scheduleReminders.mock.calls[1];
    expect(arEntries[0].content.title).not.toMatch(/^[\x00-\x7F]*$/); // contains Arabic script
    expect(arEntries[0].content.body).not.toMatch(/[A-Za-z]/); // no stray English letters mixed in
    await unmount();
  });

  it("does not create duplicate reminders when unmounted and remounted (e.g. navigating away and back) while enabled", async () => {
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();
    expect(scheduleReminders).toHaveBeenCalledTimes(1);
    await unmount();

    const { unmount: unmount2 } = await mount(TODAY, "Asia/Kuwait", "en");
    // A second mount reschedules (replaces, per scheduleReminders' own
    // documented contract) — it does not ADD to a running total; there is
    // still exactly one net "current" schedule for the channel.
    expect(scheduleReminders).toHaveBeenCalledTimes(2);
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1); // only ever the original toggle
    await unmount2();
  });

  it("reports available: false on this build (no native plugin installed) even while enabled", async () => {
    const { unmount } = await mount(TODAY, "Asia/Kuwait", "en");
    await toggle();
    expect(latest?.available).toBe(false);
    await unmount();
  });
});
