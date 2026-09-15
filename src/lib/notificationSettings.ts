// Persisted user preferences for Dhikr/reminder notifications — completely
// separate from Tasbeeh counting state (tasbeehCounters.ts) and Statistics
// (stats.ts). Deliberately isolated: this file imports neither, and
// nothing in either of those files imports this one, so a notification
// preference change can never affect a dhikr count or a Statistics
// record, and vice versa (see notificationService.ts's own doc comment
// for the same isolation rule on the scheduling side).
const STORAGE_KEY = "dithar:notifications:settings:v1";

export interface NotificationSettings {
  enabled: boolean;
  // "HH:mm", 24-hour, local device time. A single reminder time for now —
  // stored as a list so a future multi-reminder UI is a pure additive
  // change, not a schema migration.
  times: string[];
}

const DEFAULT_SETTINGS: NotificationSettings = { enabled: false, times: [] };

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const obj = parsed as Partial<NotificationSettings>;
    return {
      enabled: obj.enabled === true,
      times: Array.isArray(obj.times) ? obj.times.filter((time): time is string => typeof time === "string") : [],
    };
  } catch {
    // Corrupt data or storage unavailable — start clean rather than
    // throwing; a reminder preference is a convenience, never load-bearing
    // for the app to function.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only.
  }
}
