import { useEffect, useState } from "react";
import type { Language } from "../theme/LanguageContext";
import { loadPrayerReminderSettings, subscribePrayerReminderSettings } from "./prayerReminderSettings";
import { isPrayerNotificationsAvailable, setPrayerNotificationsEnabled } from "./prayerNotifications";
import type { PrayerTimesResult } from "./prayerTimes";

export interface UsePrayerReminderResult {
  /** The master switch of prayer notifications (Settings → Prayer notifications has the per-prayer ones). */
  enabled: boolean;
  /** Whether notifications can actually be scheduled on this platform (the Android app). */
  available: boolean;
  toggle: () => void;
}

// The Prayer Times card's reminder toggle — the master switch of prayer
// notifications and the adhan (prayerNotifications.ts). Scheduling itself lives there:
// it reads the saved choices and the app's own prayer times, and re-syncs
// on launch, on return to the app and on location/language changes — so
// this hook only flips the switch and re-syncs once.
//
// Permission is requested ONLY from the explicit enable tap, never from a
// render — a re-render never re-prompts for a permission already answered.
// The card's own times/timezone/language aren't needed for scheduling any
// more (the schedule covers the next days, not only the shown one); the
// parameters stay so its call site is unchanged.
export function usePrayerReminder(_times: PrayerTimesResult, _timezone: string, language: Language, _paused = false): UsePrayerReminderResult {
  const [enabled, setEnabled] = useState(() => loadPrayerReminderSettings().enabled);
  const [available] = useState(() => isPrayerNotificationsAvailable());
  // Settings → تنبيهات الصلاة flips the same master: follow it.
  useEffect(() => subscribePrayerReminderSettings((settings) => setEnabled(settings.enabled)), []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    void setPrayerNotificationsEnabled(next, language).catch(() => {});
  }

  return { enabled, available, toggle };
}
