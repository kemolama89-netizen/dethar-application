import { useEffect, useState } from "react";
import type { Language } from "../theme/LanguageContext";
import { labels, prayerNames } from "../data/content";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import { isNotificationsAvailable, requestNotificationPermission, scheduleReminders, cancelReminders } from "./notificationService";
import type { NotificationContent } from "./notificationService";
import { formatPrayerTime, REMINDER_PRAYER_ORDER } from "./prayerTimes";
import type { PrayerTimesResult, ReminderPrayerKey } from "./prayerTimes";

export interface UsePrayerReminderResult {
  enabled: boolean;
  /** Whether OS-level scheduling can actually happen on this build/platform
   *  right now (see notificationService.ts's PLATFORM STATUS note).
   *  `enabled` is the user's persisted preference regardless of this — the
   *  same contract the existing Settings > Reminders (Dhikr) toggle
   *  already follows. */
  available: boolean;
  toggle: () => void;
}

function buildContent(key: ReminderPrayerKey, language: Language): NotificationContent {
  const t = labels[language];
  return {
    title: t.prayerReminderNotificationTitle,
    body: t.prayerReminderNotificationBody.replace("{prayer}", prayerNames[language][key]),
  };
}

// Fajr/Dhuhr/Asr/Maghrib/Isha only — never Sunrise (see
// REMINDER_PRAYER_ORDER's own doc comment) — built straight from the SAME
// `times` the Prayer Times card displays, never a second independently
// computed set, and formatted in the SAME `timezone` used for display
// (see prayerTimes.ts's formatPrayerTime).
function buildEntries(times: PrayerTimesResult, timezone: string, language: Language) {
  return REMINDER_PRAYER_ORDER.map((key) => ({
    time: formatPrayerTime(times[key], timezone),
    content: buildContent(key, language),
  }));
}

// Prayer Times' own reminder toggle, built on the existing
// notificationService.ts/notificationSettings-style infrastructure — under
// its own "prayer" channel (see ReminderChannel) so it can never collide
// with the unrelated Dhikr reminder already in Settings.
//
// ONE effect is the single place that (re)schedules: it runs whenever
// `enabled` is true and `times`/`timezone`/`language` are whatever they
// currently are — covering "just enabled", "a new day's/location's times
// arrived", and "the interface language changed" (a notification's text
// must match it) as the exact same case: "the entries this channel should
// show have changed, call scheduleReminders again". scheduleReminders's
// own documented contract is to fully REPLACE this channel's previous
// schedule, so this can never create duplicates, no matter how often the
// effect re-runs (app reload included, since `enabled` is loaded fresh
// from storage on mount). Permission is requested ONLY from the explicit
// `toggle()` action below, never from this effect — so a re-render (or a
// times/language change) never re-prompts for a permission the user
// already answered.
export function usePrayerReminder(times: PrayerTimesResult, timezone: string, language: Language): UsePrayerReminderResult {
  const [enabled, setEnabled] = useState(() => loadPrayerReminderSettings().enabled);
  const [available] = useState(() => isNotificationsAvailable());

  useEffect(() => {
    if (!enabled) return;
    void scheduleReminders("prayer", buildEntries(times, timezone, language));
  }, [enabled, times, timezone, language]);

  // Called once per explicit tap — never automatically, never in a loop.
  // The ON branch only requests permission and flips `enabled`; the
  // effect above (which also depends on `enabled`) is what actually
  // schedules once that state change lands, so scheduling logic lives in
  // exactly one place. The OFF branch cancels directly here — there's
  // nothing left to schedule once disabled, so the effect intentionally
  // does nothing on that transition (its `if (!enabled) return` guard).
  function toggle() {
    const next = !enabled;
    setEnabled(next);
    savePrayerReminderSettings({ enabled: next });
    if (next) {
      void requestNotificationPermission();
    } else {
      void cancelReminders("prayer");
    }
  }

  return { enabled, available, toggle };
}
