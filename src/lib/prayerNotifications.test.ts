// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake native plugin on a fake Android platform — records every call.
const native = vi.hoisted(() => ({
  android: true,
  adhanLast: { regular: null, fajr: null } as Record<"regular" | "fajr", { voiceId: string; at: number } | null>,
  setSchedule: vi.fn(async (o: { entries: { at: number }[] }) => ({ nextAt: o.entries[0]?.at ?? null, exact: true, notifications: true })),
  requestPermissions: vi.fn(async () => ({})),
  stopAdhan: vi.fn(async () => {}),
}));
vi.mock("@capacitor/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...real,
    Capacitor: { ...real.Capacitor, isNativePlatform: () => native.android, getPlatform: () => (native.android ? "android" : "web") },
    registerPlugin: (name: string) =>
      name === "PrayerNotifications"
        ? {
            setSchedule: native.setSchedule,
            getStatus: vi.fn(async () => ({ nextAt: null, exact: true, notifications: true, adhanLast: native.adhanLast })),
            requestPermissions: native.requestPermissions,
            openNotificationSettings: vi.fn(),
            openExactAlarmSettings: vi.fn(),
            stopAdhan: native.stopAdhan,
          }
        : real.registerPlugin(name),
  };
});
const app = vi.hoisted(() => ({ listeners: new Map<string, () => void>() }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (name: string, fn: () => void) => {
      app.listeners.set(name, fn);
      return { remove: async () => {} };
    }),
  },
}));

import { buildPrayerNotifications, setPrayerNotificationsEnabled, startPrayerNotificationSync, syncPrayerNotifications } from "./prayerNotifications";
import type { PrayerReminderSettings } from "./prayerReminderSettings";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import { loadAdhanAutoPlay } from "./adhanAudioSettings";
import { loadAudioAdhkarMasterEnabled, saveAudioAdhkarMasterEnabled } from "./audioAdhkarScheduleSettings";
import { knownPrayerLocation, upcomingPrayerTimes } from "./prayerSchedule";
import { buildAdhanWindows } from "./adhanSuppression";
import { calculatePrayerDay, formatPrayerTime } from "./prayerTimes";
import { localDateIn } from "./locationTime";
import { saveManualLocation } from "./locationSettings";
import { buildAdhanConfig } from "./prayerNotifications";
import { resetAdhanAudioSettingsMemoryForTesting, saveAdhanAutoPlay, saveRegularAdhanChoice } from "./adhanAudioSettings";
import { peekNextAdhanVoice, resetAdhanRotationMemoryForTesting, rotationVoices, setAdhanRotationEnabled } from "./adhanVoiceRotation";
import { getAdhanRecordingById } from "../data/adhanRecordings";

const NOW = new Date("2026-10-10T00:30:00Z");
const ON: PrayerReminderSettings = { enabled: true, prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } };
const KUWAIT = { source: "manual" as const, latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" };
const CAIRO = { source: "manual" as const, latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo", countryCode: "EG", cityNameAr: "القاهرة", cityNameEn: "Cairo" };
const sent = () => native.setSchedule.mock.calls.at(-1)![0].entries as { prayer: string; at: number; title: string; body: string; notify: boolean }[];
const sentAdhan = () => (native.setSchedule.mock.calls.at(-1)![0] as unknown as { adhan: Record<"regular" | "fajr", ReturnType<typeof buildAdhanConfig>> }).adhan;
/** Lets the sync's own awaits (status, then schedule) settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
  resetAdhanRotationMemoryForTesting();
  native.adhanLast = { regular: null, fajr: null };
  native.android = true;
  native.setSchedule.mockClear();
  native.requestPermissions.mockClear();
  native.stopAdhan.mockClear();
  app.listeners.clear();
  saveManualLocation(KUWAIT);
});

describe("which notifications are built", () => {
  it("one per prayer — Fajr, Dhuhr, Asr, Maghrib, Isha, never Shuruq — at the times the Prayer Times card shows", () => {
    const location = knownPrayerLocation()!;
    const entries = buildPrayerNotifications(NOW, ON, "ar");
    const { times } = calculatePrayerDay(location, localDateIn(NOW, location.timezone));
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
      expect(entries.some((e) => e.prayer === prayer && e.at === times[prayer].getTime()), prayer).toBe(true);
    }
    expect(entries.some((e) => e.at === times.shuruq.getTime())).toBe(false);
  });

  it("shows the prayer's name and its local time, exactly as the card formats it", () => {
    const [first] = buildPrayerNotifications(NOW, ON, "ar");
    const time = formatPrayerTime(new Date(first.at), "Asia/Kuwait");
    expect(first.title).toBe(`صلاة الفجر — ${time}`);
    expect(first.body).toBe("حان الآن وقت صلاة الفجر");
    const [en] = buildPrayerNotifications(NOW, ON, "en");
    expect(en.title).toBe(`Fajr prayer — ${time}`);
    expect(en.body).toBe("It's now time for Fajr prayer");
  });

  it("covers the next 30 days, future times only, in order", () => {
    const entries = buildPrayerNotifications(NOW, ON, "ar");
    expect(entries.length).toBeGreaterThanOrEqual(150);
    for (const e of entries) expect(e.at).toBeGreaterThan(NOW.getTime());
    for (let i = 1; i < entries.length; i++) expect(entries[i].at).toBeGreaterThan(entries[i - 1].at);
  });

  it("leaves out a disabled prayer; nothing at all when the master switch is off or every prayer is off", () => {
    const noAsr = buildPrayerNotifications(NOW, { ...ON, prayers: { ...ON.prayers, asr: false } }, "ar");
    expect(noAsr.some((e) => e.prayer === "asr")).toBe(false);
    expect(noAsr.filter((e) => e.prayer === "dhuhr").length).toBeGreaterThan(25);
    expect(buildPrayerNotifications(NOW, { ...ON, enabled: false }, "ar")).toEqual([]);
    expect(buildPrayerNotifications(NOW, { enabled: true, prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false } }, "ar")).toEqual([]);
  });

  it("schedules nothing while the user's location isn't known (never the Kuwait placeholder)", () => {
    saveManualLocation(null);
    expect(knownPrayerLocation()).toBeNull();
    expect(buildPrayerNotifications(NOW, ON, "ar")).toEqual([]);
  });

  it("follows a location / time-zone change: Cairo's own times, shown in Cairo time", () => {
    const kuwait = buildPrayerNotifications(NOW, ON, "en");
    saveManualLocation(CAIRO);
    const cairo = buildPrayerNotifications(NOW, ON, "en");
    expect(cairo.map((e) => e.at)).not.toEqual(kuwait.map((e) => e.at));
    expect(cairo[0].title).toBe(`Fajr prayer — ${formatPrayerTime(new Date(cairo[0].at), "Africa/Cairo")}`);
  });

  it("uses the same prayer times as the Audio Adhkar adhan pause — one source, no drift", () => {
    const location = knownPrayerLocation()!;
    const windowStarts = new Set(upcomingPrayerTimes(NOW, location, 30).map((p) => p.at));
    for (const e of buildPrayerNotifications(NOW, ON, "ar")) expect(windowStarts.has(e.at)).toBe(true);
    // …and every notification falls at the start of an adhan pause.
    const windows = buildAdhanWindows(NOW, location);
    for (const e of buildPrayerNotifications(NOW, ON, "ar").slice(0, 20)) {
      expect(windows.some(([s, end]) => e.at >= s && e.at < end)).toBe(true);
    }
  });
});

describe("handing them to Android", () => {
  it("sends the saved choices' notifications; re-syncing sends the same list again — it replaces, never adds", async () => {
    savePrayerReminderSettings(ON);
    await syncPrayerNotifications(NOW, "ar");
    await syncPrayerNotifications(NOW, "ar");
    expect(native.setSchedule).toHaveBeenCalledTimes(2);
    expect(native.setSchedule.mock.calls[0][0]).toEqual(native.setSchedule.mock.calls[1][0]);
    expect(sent()).toEqual(buildPrayerNotifications(NOW, ON, "ar"));
    expect(sentAdhan()).toEqual({ regular: null, fajr: null }); // auto-adhan is off by default
  });

  it("switching off (or a prayer off) sends the reduced list, so native cancels what's gone", async () => {
    savePrayerReminderSettings({ ...ON, prayers: { ...ON.prayers, isha: false } });
    await syncPrayerNotifications(NOW, "ar");
    expect(sent().some((e) => e.prayer === "isha")).toBe(false);
    savePrayerReminderSettings({ ...ON, enabled: false });
    await syncPrayerNotifications(NOW, "ar");
    expect(sent()).toEqual([]);
  });

  it("does nothing off Android (no web timers)", async () => {
    native.android = false;
    savePrayerReminderSettings(ON);
    expect(await syncPrayerNotifications(NOW, "ar")).toBeNull();
    expect(native.setSchedule).not.toHaveBeenCalled();
  });

  it("app launch schedules, then every return to the app and every location change re-schedules", async () => {
    savePrayerReminderSettings(ON);
    const stop = startPrayerNotificationSync();
    await settle();
    expect(native.setSchedule).toHaveBeenCalledTimes(1);
    app.listeners.get("resume")!();
    await settle();
    expect(native.setSchedule).toHaveBeenCalledTimes(2);
    const before = sent();
    saveManualLocation(CAIRO);
    await settle();
    expect(native.setSchedule).toHaveBeenCalledTimes(3);
    expect(sent()).not.toEqual(before);
    stop();
    saveManualLocation(KUWAIT);
    await settle();
    expect(native.setSchedule).toHaveBeenCalledTimes(3);
  });
});

describe("playing the adhan at prayer time (auto-adhan)", () => {
  const OFF: PrayerReminderSettings = { ...ON, enabled: false };

  it("with every prayer's own notification off (master on), an auto-adhan section still gets its prayer times — marked silent", () => {
    const silent: PrayerReminderSettings = { enabled: true, prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false } };
    const entries = buildPrayerNotifications(NOW, silent, "ar", undefined, 30, { regular: true, fajr: false });
    expect(new Set(entries.map((e) => e.prayer))).toEqual(new Set(["dhuhr", "asr", "maghrib", "isha"]));
    expect(entries.every((e) => e.notify === false)).toBe(true);
  });

  it("with the master switch off, nothing — not even an auto-adhan section's prayer times", () => {
    expect(buildPrayerNotifications(NOW, OFF, "ar", undefined, 30, { regular: true, fajr: true })).toEqual([]);
  });

  it("a prayer with both keeps its notification; one with neither is left out", () => {
    const entries = buildPrayerNotifications(NOW, { ...ON, prayers: { ...ON.prayers, asr: false } }, "ar", undefined, 30, { regular: false, fajr: true });
    expect(entries.filter((e) => e.prayer === "asr")).toEqual([]);
    expect(entries.find((e) => e.prayer === "fajr")!.notify).toBe(true);
  });

  it("sends the chosen voice and exactly its chosen segment, from the APK, when not rotating", () => {
    saveAdhanAutoPlay("regular", true);
    saveRegularAdhanChoice({ recordingId: "refaat", mode: "takbeer" });
    const config = buildAdhanConfig("regular", "ar")!;
    const refaat = getAdhanRecordingById("refaat")!;
    expect(config).toEqual({
      rotate: false,
      voices: [
        {
          id: "refaat",
          name: refaat.name.ar,
          assetPath: `public/${refaat.path}`,
          startMillis: Math.round(refaat.segments.takbeer!.start * 1000),
          endMillis: Math.round(refaat.segments.takbeer!.end * 1000),
          muezzin: "محمد رفعت",
        },
      ],
      nextVoiceId: "refaat",
      nextToken: "",
    });
    expect(buildAdhanConfig("fajr", "ar")).toBeNull(); // Fajr's auto-adhan is separate, and off
  });

  it("names the muezzin heard (the player shows it), and none for a recording that doesn't say who calls it", () => {
    saveAdhanAutoPlay("regular", true);
    saveRegularAdhanChoice({ recordingId: "alafasy-kuwait", mode: "full" });
    expect(buildAdhanConfig("regular", "en")!.voices[0].muezzin).toBe("Mishary Rashid Alafasy");
    saveRegularAdhanChoice({ recordingId: "masjid-an-nabawi-2", mode: "full" });
    expect(buildAdhanConfig("regular", "ar")!.voices[0].muezzin).toBe("");
  });

  it("rotating: every enabled voice, and the voice Settings shows as next is what native plays first", () => {
    saveAdhanAutoPlay("fajr", true);
    setAdhanRotationEnabled("fajr", true);
    const config = buildAdhanConfig("fajr", "en")!;
    expect(config.rotate).toBe(true);
    expect(config.voices.map((v) => v.id)).toEqual(rotationVoices("fajr").map((r) => r.id));
    expect(config.nextVoiceId).toBe(peekNextAdhanVoice("fajr").recording.id);
    expect(config.nextToken).toBe(`>${config.nextVoiceId}`);
  });

  it("takes in what the alarm played while the app was closed: never repeated, and a new 'next' is announced", async () => {
    savePrayerReminderSettings(ON);
    saveAdhanAutoPlay("regular", true);
    setAdhanRotationEnabled("regular", true);
    const announced = peekNextAdhanVoice("regular").recording.id;
    native.adhanLast = { regular: { voiceId: announced, at: NOW.getTime() - 60_000 }, fajr: null };
    await syncPrayerNotifications(NOW, "ar");
    const config = sentAdhan().regular!;
    expect(config.nextVoiceId).not.toBe(announced);
    expect(config.nextToken).toBe(`${announced}>${config.nextVoiceId}`);
    // The same report again changes nothing.
    await syncPrayerNotifications(NOW, "ar");
    expect(sentAdhan().regular!.nextVoiceId).toBe(config.nextVoiceId);
  });
});

describe("the prayer notifications master switch (card toggle and Settings)", () => {
  const MIXED: PrayerReminderSettings = { enabled: true, prayers: { fajr: true, dhuhr: false, asr: true, maghrib: true, isha: false } };

  it("off: cancels every notification and the adhan for all five prayers, and stops an adhan playing now", async () => {
    savePrayerReminderSettings(MIXED);
    saveAdhanAutoPlay("regular", true);
    saveAdhanAutoPlay("fajr", true);
    await setPrayerNotificationsEnabled(false, "ar", NOW);
    expect(sent()).toEqual([]);
    expect(sentAdhan()).toEqual({ regular: null, fajr: null });
    expect(native.stopAdhan).toHaveBeenCalledTimes(1);
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });

  it("off keeps every preference: each prayer's switch and the auto-adhan choices", async () => {
    savePrayerReminderSettings(MIXED);
    saveAdhanAutoPlay("fajr", true);
    await setPrayerNotificationsEnabled(false, "ar", NOW);
    expect(loadPrayerReminderSettings()).toEqual({ ...MIXED, enabled: false });
    expect(loadAdhanAutoPlay()).toEqual({ regular: false, fajr: true });
  });

  it("on: asks for permission, then restores exactly the saved choices — and never stops the adhan", async () => {
    savePrayerReminderSettings({ ...MIXED, enabled: false });
    saveAdhanAutoPlay("fajr", true);
    await setPrayerNotificationsEnabled(true, "ar", NOW);
    expect(native.requestPermissions).toHaveBeenCalledTimes(1);
    expect(loadPrayerReminderSettings()).toEqual(MIXED);
    expect(sent()).toEqual(buildPrayerNotifications(NOW, MIXED, "ar", undefined, 30, { regular: false, fajr: true }));
    expect(sent().some((e) => e.prayer === "dhuhr")).toBe(false);
    expect(sentAdhan().fajr).not.toBeNull();
    expect(sentAdhan().regular).toBeNull();
    expect(native.stopAdhan).not.toHaveBeenCalled();
  });

  it("off → on → on never duplicates: each switch sends one full replacement, the same each time", async () => {
    savePrayerReminderSettings(ON);
    await setPrayerNotificationsEnabled(false, "ar", NOW);
    await setPrayerNotificationsEnabled(true, "ar", NOW);
    const first = sent();
    await setPrayerNotificationsEnabled(true, "ar", NOW);
    expect(native.setSchedule).toHaveBeenCalledTimes(3);
    expect(sent()).toEqual(first);
    const keys = sent().map((e) => `${e.prayer}@${e.at}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("persists across a restart: the next launch's sync keeps it off", async () => {
    savePrayerReminderSettings(ON);
    saveAdhanAutoPlay("regular", true);
    await setPrayerNotificationsEnabled(false, "ar", NOW);
    native.setSchedule.mockClear();
    const stop = startPrayerNotificationSync();
    await settle();
    expect(sent()).toEqual([]);
    expect(sentAdhan()).toEqual({ regular: null, fajr: null });
    stop();
  });

  it("is independent of Audio Adhkar: their switch and their 30-minute adhan pause are untouched", async () => {
    saveAudioAdhkarMasterEnabled(true);
    const windows = buildAdhanWindows(NOW);
    await setPrayerNotificationsEnabled(false, "ar", NOW);
    expect(loadAudioAdhkarMasterEnabled()).toBe(true);
    expect(buildAdhanWindows(NOW)).toEqual(windows);
    saveAudioAdhkarMasterEnabled(false);
    await setPrayerNotificationsEnabled(true, "ar", NOW);
    expect(loadAudioAdhkarMasterEnabled()).toBe(false);
  });

  it("does nothing natively off Android, but still saves the switch", async () => {
    native.android = false;
    await setPrayerNotificationsEnabled(true, "ar", NOW);
    expect(loadPrayerReminderSettings().enabled).toBe(true);
    expect(native.setSchedule).not.toHaveBeenCalled();
    expect(native.stopAdhan).not.toHaveBeenCalled();
  });
});
