// A clean, platform-agnostic notification layer — entirely separate from
// Tasbeeh counting (tasbeehCounters.ts/tasbeehCommit.ts), Floating Tasbeeh
// (floatingTasbeehBridge.ts/floatingTasbeehSync.ts), and Statistics
// (stats.ts). Nothing in this file imports any of those, and nothing in
// them imports this — deliberate isolation, not an oversight, so a
// notification-settings change can never affect a dhikr count, the
// floating bubble, or a Statistics record, and vice versa.
//
// PLATFORM STATUS (as of writing): no native notification plugin is
// installed in this project yet — no @capacitor/local-notifications,
// @capacitor/push-notifications, Firebase, or OneSignal (verified against
// package.json before writing this file). This module therefore only
// defines the INTERFACE the rest of the app (and a future native
// implementation) uses; every function below safely no-ops today rather
// than throwing.
//
// isNotificationsAvailable() checks Capacitor.isPluginAvailable(...)
// rather than hardcoding `false` — the SAME pattern
// floatingTasbeehBridge.ts's own isFloatingTasbeehAvailable() would use if
// Floating Tasbeeh's plugin were ever conditionally absent. This means
// this entire file starts actually working the moment a real
// "LocalNotifications"-registered plugin (e.g. @capacitor/local-notifications)
// is added and synced into the native project — no code change required
// here when that happens; only the TODOs below need filling in.
import { Capacitor } from "@capacitor/core";

export interface NotificationContent {
  title: string;
  body: string;
}

// Which feature a scheduling/cancel call belongs to — "dhikr" (the
// existing Settings > Reminders single daily time, see SettingsScreen.tsx)
// and "prayer" (Prayer Times' own Fajr/Dhuhr/Asr/Maghrib/Isha reminders,
// see usePrayerReminder.ts) are independent features with independent
// on/off state and independent times, and must never cancel or overwrite
// each other's scheduled notifications once a real native plugin lands —
// hence every scheduling call is scoped to its own channel rather than
// this module offering one global "all reminders" bucket.
export type ReminderChannel = "dhikr" | "prayer";

// The plugin name a future @capacitor/local-notifications integration
// registers under. Not a value this project's own code registers —
// purely the identifier isNotificationsAvailable checks for.
const LOCAL_NOTIFICATIONS_PLUGIN_NAME = "LocalNotifications";

export function isNotificationsAvailable(): boolean {
  return Capacitor.isPluginAvailable(LOCAL_NOTIFICATIONS_PLUGIN_NAME);
}

// Every function below is a safe no-op while isNotificationsAvailable() is
// false, rather than throwing — the same graceful-degradation contract
// floatingTasbeehBridge.ts's own functions already follow for a plugin
// that may not exist on the current platform. None of them is ever called
// in a loop or on a timer (no polling) — only from an explicit user action
// in Settings (see SettingsScreen.tsx's NotificationsView).

/**
 * Requests OS notification permission. Returns whether it was granted —
 * `false` both when the user actually declines AND when no notification
 * plugin is installed yet, so a caller can never mistake "not available on
 * this build" for "the user granted it". Deliberately meant to be called
 * ONCE per explicit enable action (see SettingsScreen.tsx), never
 * repeatedly/automatically — this project's own instruction is not to
 * re-prompt for a permission the user has already answered.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationsAvailable()) return false;
  // TODO(mobile): once @capacitor/local-notifications is added, call its
  // own requestPermissions() here and return whether it resolved granted.
  return false;
}

export interface ScheduledReminderEntry {
  /** "HH:mm", 24-hour, local device time. */
  time: string;
  /** Already language-appropriate (see settings.ts's/content.ts's
   *  notification* strings) — each entry carries its OWN title/body, since
   *  e.g. Prayer Reminder's five entries each need distinct text ("It's
   *  time for Fajr prayer" vs "...Dhuhr prayer", not one generic body
   *  reused for all five). Dhikr's existing single-reminder usage is just
   *  the one-entry case of this same shape. */
  content: NotificationContent;
}

/**
 * Schedules one repeating local reminder per entry in `entries`, replacing
 * any reminders previously scheduled under this SAME `channel` only — a
 * call for one channel must never touch another channel's schedule. A
 * no-op today.
 *
 * Callers whose entries genuinely change from one call to the next (e.g.
 * Prayer Reminder recalculating for a new day/location — prayer clock
 * times drift a few minutes daily, unlike Dhikr's fixed user-picked time)
 * should simply call this again with the new entries; "replace this
 * channel's previous schedule" is this function's documented contract, so
 * a caller never needs to cancel first itself, and never ends up with
 * duplicate/stale notifications from a previous call's entries.
 */
export async function scheduleReminders(_channel: ReminderChannel, _entries: ScheduledReminderEntry[]): Promise<void> {
  if (!isNotificationsAvailable()) return;
  // TODO(mobile): once @capacitor/local-notifications is added, cancel any
  // previously-scheduled reminders for this channel and schedule one
  // repeating (daily) local notification per entry in `_entries`, each
  // with its own title/body.
}

/** Cancels every previously-scheduled reminder for ONE channel only — the
 *  other channel's schedule is left untouched. A no-op today. */
export async function cancelReminders(_channel: ReminderChannel): Promise<void> {
  if (!isNotificationsAvailable()) return;
  // TODO(mobile): once @capacitor/local-notifications is added, cancel
  // every notification this app has scheduled under this channel.
}
