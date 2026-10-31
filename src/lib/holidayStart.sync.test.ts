// @vitest-environment jsdom
// The weekly holiday start reaches every native scheduler: Misc audio and
// reminders/widget get it as their per-day floor, Morning/Evening slots are
// planned no earlier (and marked for native's heads-up), prayer
// notifications before it are left out — and changing it re-syncs at once.
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  setSchedules: vi.fn<(options: unknown) => Promise<unknown>>(async () => ({ morning: { scheduledAt: null, warningAt: null }, evening: { scheduledAt: null, warningAt: null }, misc: { scheduledAt: null, warningAt: null }, exact: true })),
  setReminders: vi.fn<(options: unknown) => Promise<void>>(async () => {}),
  setSchedule: vi.fn<(options: unknown) => Promise<unknown>>(async () => ({ nextAt: null, exact: true, notifications: true })),
}));
vi.mock("./audioAdhkarNative", () => ({
  AudioAdhkarNative: {
    setSchedules: native.setSchedules,
    getPlaybackState: vi.fn(async () => ({ state: null })),
    getCompletions: vi.fn(async () => ({ completions: [] })),
    acknowledgeCompletions: vi.fn(async () => {}),
    setVolumes: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
  isAudioAdhkarNativeAvailable: () => true,
}));
vi.mock("./remindersNative", () => ({
  RemindersNative: { setReminders: native.setReminders },
  isRemindersNativeAvailable: () => true,
}));
vi.mock("@capacitor/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...real,
    Capacitor: { ...real.Capacitor, isNativePlatform: () => true, getPlatform: () => "android" },
    registerPlugin: (name: string) =>
      name === "PrayerNotifications"
        ? { setSchedule: native.setSchedule, getStatus: vi.fn(async () => ({ nextAt: null, exact: true, notifications: true })) }
        : real.registerPlugin(name),
  };
});
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(async () => ({ remove: async () => {} })) } }));

import { startAudioAdhkarNativeSync, syncAudioAdhkarSchedules } from "./audioAdhkarSchedules";
import { startPrayerNotificationSync, syncPrayerNotifications } from "./prayerNotifications";
import { syncReminders } from "./remindersSync";
import { saveHolidayStart, saveWeeklySchedule } from "./weeklySchedule";
import { saveDailySchedule, saveMiscSchedule } from "./audioAdhkarScheduleSettings";
import { saveManualLocation } from "./locationSettings";
import { savePrayerReminderSettings } from "./prayerReminderSettings";

const TZ = "Asia/Kuwait";
const NOW = new Date("2026-10-10T00:00:00Z");
const NONE = [-1, -1, -1, -1, -1, -1, -1];
const FRI_SAT = (minutes: number) => [-1, -1, -1, -1, -1, minutes, minutes];
const weekday = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(ms);
const hhmm = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(ms);
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

type Pushed = { misc: { dayStartMinutes: number[]; endMinutes: number }; morning: { slots: number[][] } };
const audio = () => native.setSchedules.mock.calls.at(-1)![0] as unknown as Pushed;
const prayers = () => (native.setSchedule.mock.calls.at(-1)![0] as { entries: { prayer: string; at: number }[] }).entries;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  saveManualLocation({ source: "manual", latitude: 29.3759, longitude: 47.9774, timezone: TZ, countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" });
  saveDailySchedule("morning", { enabled: true, startTime: "06:00" });
  saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 });
  savePrayerReminderSettings({ enabled: true, prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } });
});

describe("what native receives", () => {
  it("off: exactly what it received before the feature (no floor, plain slots)", async () => {
    await syncAudioAdhkarSchedules(NOW);
    expect(audio().misc.dayStartMinutes).toEqual(NONE);
    for (const slot of audio().morning.slots) expect(slot[3]).toBe(0);
  });

  it("Misc audio: the holiday start is its floor on those days only; its end time stays", async () => {
    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    await syncAudioAdhkarSchedules(NOW);
    expect(audio().misc.dayStartMinutes).toEqual(FRI_SAT(720));
    expect(audio().misc.endMinutes).toBe(21 * 60);
  });

  it("Morning: holiday sessions start no earlier and carry the holiday start for native's heads-up", async () => {
    saveHolidayStart({ enabled: true, days: [5, 6], time: "09:00" });
    await syncAudioAdhkarSchedules(NOW);
    const slots = audio().morning.slots;
    expect(slots.length).toBeGreaterThan(20);
    for (const [, at, , notBefore] of slots) {
      const holiday = ["Fri", "Sat"].includes(weekday(at));
      if (holiday) {
        expect(notBefore).toBeGreaterThan(0);
        expect(at).toBeGreaterThanOrEqual(notBefore);
        expect(hhmm(notBefore)).toBe("09:00");
      } else {
        expect(notBefore).toBe(0);
      }
    }
  });

  it("reminders/widget: the holiday start on holidays only", async () => {
    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    await syncReminders();
    expect((native.setReminders.mock.calls.at(-1)![0] as { dayStartMinutes: number[] }).dayStartMinutes).toEqual(FRI_SAT(720));
  });

  it("a weekly schedule saved before its page was removed restricts no ordinary day", async () => {
    saveWeeklySchedule({ enabled: true, days: ["07:00", "07:00", "07:00", "07:00", "07:00", "13:00", "07:00"] });
    await syncReminders();
    await syncAudioAdhkarSchedules(NOW);
    expect((native.setReminders.mock.calls.at(-1)![0] as { dayStartMinutes: number[] }).dayStartMinutes).toEqual(NONE);
    expect(audio().misc.dayStartMinutes).toEqual(NONE);
  });

  it("prayer notifications: none before the holiday start on holidays", async () => {
    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    await syncPrayerNotifications(NOW);
    const entries = prayers();
    expect(entries.length).toBeGreaterThan(100);
    for (const e of entries) if (["Fri", "Sat"].includes(weekday(e.at))) expect(hhmm(e.at) >= "12:00").toBe(true);
    expect(entries.some((e) => weekday(e.at) === "Thu" && e.prayer === "fajr")).toBe(true);
  });
});

describe("changing the setting", () => {
  it("re-syncs audio adhkar and prayer notifications at once, replacing what was pushed", async () => {
    const stopAudio = startAudioAdhkarNativeSync();
    const stopPrayers = startPrayerNotificationSync();
    await settle();
    const audioCalls = native.setSchedules.mock.calls.length;
    const prayerCalls = native.setSchedule.mock.calls.length;

    saveHolidayStart({ enabled: true, days: [5, 6], time: "12:00" });
    await settle();
    expect(native.setSchedules.mock.calls.length).toBe(audioCalls + 1);
    expect(native.setSchedule.mock.calls.length).toBe(prayerCalls + 1);
    expect(audio().misc.dayStartMinutes).toEqual(FRI_SAT(720));

    saveHolidayStart({ enabled: true, days: [5, 6], time: "11:00" });
    await settle();
    expect(audio().misc.dayStartMinutes).toEqual(FRI_SAT(660));
    // Dhuhr (≈ 11:35) is back on holidays once the start moves to 11:00.
    expect(prayers().some((e) => weekday(e.at) === "Fri" && e.prayer === "dhuhr")).toBe(true);

    stopAudio();
    stopPrayers();
  });
});
