import { REMINDER_PRAYER_ORDER } from "./prayerTimes";
import type { ReminderPrayerKey } from "./prayerTimes";

// Persisted user preference for Prayer Times' own reminder toggle —
// completely separate storage from notificationSettings.ts (the existing
// Settings > Reminders / Dhikr feature): different key, different shape,
// same isolation rule as that file's own header comment (a change here
// must never affect Dhikr reminders, Tasbeeh counting, or Statistics, and
// vice versa).
//
// Unlike Dhikr's reminder (one arbitrary, user-picked "HH:mm" that stays
// the same every day), Prayer Reminder has no time to persist at all —
// its five times are Fajr/Dhuhr/Asr/Maghrib/Isha, recalculated fresh from
// the real prayer-time engine every time they're needed (see
// usePrayerReminder.ts). Only the user's ON/OFF preference is state worth
// keeping across app restarts — the master switch and each prayer's own.
const STORAGE_KEY = "dithar:prayer-reminder:settings:v1";

/** The five prayers that get a notification (never Shuruq). */
export const NOTIFIED_PRAYERS: readonly ReminderPrayerKey[] = REMINDER_PRAYER_ORDER;

export interface PrayerReminderSettings {
  /**
   * The master switch (the Prayer Times card's toggle and Settings' main
   * switch): off, no prayer notification and no adhan is scheduled at all.
   */
  enabled: boolean;
  /** Each prayer's own switch — on by default; only matters while `enabled`. */
  prayers: Record<ReminderPrayerKey, boolean>;
}

const allPrayers = (on: boolean) => Object.fromEntries(NOTIFIED_PRAYERS.map((p) => [p, on])) as Record<ReminderPrayerKey, boolean>;

const DEFAULT_SETTINGS: PrayerReminderSettings = { enabled: false, prayers: allPrayers(true) };

export function loadPrayerReminderSettings(): PrayerReminderSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { enabled: false, prayers: allPrayers(true) };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { enabled: false, prayers: allPrayers(true) };
    const obj = parsed as Partial<PrayerReminderSettings>;
    const stored = (obj.prayers && typeof obj.prayers === "object" ? obj.prayers : {}) as Partial<Record<ReminderPrayerKey, unknown>>;
    // Saved before per-prayer switches existed: every prayer on.
    const prayers = Object.fromEntries(NOTIFIED_PRAYERS.map((p) => [p, stored[p] !== false])) as Record<ReminderPrayerKey, boolean>;
    return { enabled: obj.enabled === true, prayers };
  } catch {
    // Corrupt data or storage unavailable — start clean rather than
    // throwing; a reminder preference is a convenience, never load-bearing
    // for the app to function.
    return { ...DEFAULT_SETTINGS, prayers: allPrayers(true) };
  }
}

const listeners = new Set<(settings: PrayerReminderSettings) => void>();

export function savePrayerReminderSettings(settings: PrayerReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only.
  }
  for (const listener of [...listeners]) listener(settings);
}

/** Told on every save — keeps the Prayer Times card's switch and Settings' master in step. */
export function subscribePrayerReminderSettings(listener: (settings: PrayerReminderSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
