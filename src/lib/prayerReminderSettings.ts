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
// keeping across app restarts.
const STORAGE_KEY = "dithar:prayer-reminder:settings:v1";

export interface PrayerReminderSettings {
  enabled: boolean;
}

const DEFAULT_SETTINGS: PrayerReminderSettings = { enabled: false };

export function loadPrayerReminderSettings(): PrayerReminderSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const obj = parsed as Partial<PrayerReminderSettings>;
    return { enabled: obj.enabled === true };
  } catch {
    // Corrupt data or storage unavailable — start clean rather than
    // throwing; a reminder preference is a convenience, never load-bearing
    // for the app to function.
    return { ...DEFAULT_SETTINGS };
  }
}

export function savePrayerReminderSettings(settings: PrayerReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only.
  }
}
