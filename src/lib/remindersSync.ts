// Keeps native reminders, the home-screen widget and the end-of-day summary
// in step with the app (Android only): pushes the settings, the verified
// content pool (in the interface language) and today's activity snapshot
// at launch, on every return to the app, whenever a relevant setting
// changes, when the user leaves the app, and shortly after a repetition is
// recorded. Every push REPLACES what native had, so nothing is ever armed
// twice.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { RemindersNative, isRemindersNativeAvailable } from "./remindersNative";
import type { NativeReminderItem } from "./remindersNative";
import { loadCustomBackground, loadReminderSettings, subscribeReminderSettings } from "./reminderSettings";
import { reminderPool } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";
import { REMINDER_CATEGORIES } from "./reminderContent";
import { reminderLabels } from "../data/reminderLabels";
import { holidayDayStarts, subscribeWeeklySchedule } from "./weeklySchedule";
import { buildSummarySnapshot, loadSummarySettings, subscribeSummarySettings, unavailableSummarySnapshot } from "./dailySummary";
import { subscribeStatsChanges } from "./stats";
import { startTimeToMinutes } from "./eveningAudioSettings";
import { loadLanguagePreference, loadThemePreference } from "./appearancePreferences";
import { ACTIVE_PALETTE, subscribePaletteChanges } from "../theme/paletteStore";
import { widgetColors } from "../theme/palettes";
import { startFavoritesSync } from "./favoritesSync";
import { subscribeContentReview } from "./contentReview";
import { resolveKnownLocationRecord, subscribeLocationChanges } from "./locationSettings";
import { trackNativeSync } from "./appExit";
import type { Language } from "../theme/LanguageContext";
import { isWidgetComment, isWidgetItem, widgetDetail, widgetQuranText } from "./widgetFeed";
import { bindDetachedMarks, tidyArabicSpacing } from "./arabicTypography";

export function nativeReminderItem(item: ReminderItem, language: Language): NativeReminderItem {
  const t = reminderLabels[language];
  const text = forWidget(item.textAr);
  const widgetText = widgetQuranText(item, text);
  return {
    id: item.id,
    category: item.category,
    title: t.kindTitle[item.kind],
    // Spacing around punctuation is fixed for the widget and notifications (lib/arabicTypography.ts):
    // whitespace only — the wording itself, kept unchanged in the app, is the same letter for letter.
    text,
    // On the widget only, a Qur'anic verse in its brackets ﴿ … ﴾; notifications and the
    // opened reminder keep `text` (lib/widgetFeed.ts widgetQuranText).
    widgetText: widgetText === text ? "" : widgetText,
    meaning: language === "en" ? bindDetachedMarks(item.meaningEn ?? "") : "",
    source: language === "en" ? bindDetachedMarks(item.sourceEn ?? "") : forWidget(item.sourceAr),
    theme: item.theme,
    comments: item.comments.map((c) => ({ id: c.id, text: language === "en" ? bindDetachedMarks(c.en) : forWidget(c.ar), widget: isWidgetComment(c, language) })),
    widget: isWidgetItem(item, language),
    detail: forWidget(widgetDetail(item, language)),
  };
}

/** Arabic for the widget and notifications: spacing slips fixed, and no mark left alone at a line's start or end. */
function forWidget(text: string): string {
  return bindDetachedMarks(tidyArabicSpacing(text));
}

/** The current identity's colors for the widget (manual colour selection is gone: always the identity's own). */
function currentWidgetColors(): { accent: string; tint: string } {
  return widgetColors(loadThemePreference(), ACTIVE_PALETTE);
}

/** The latitude, only when it describes where the user really is (for the season). */
function reliableLatitude(): number | undefined {
  const known = resolveKnownLocationRecord();
  return known && known.source !== "fallback" && Number.isFinite(known.latitude) ? known.latitude : undefined;
}

let lastPushedLanguage: Language | null = null;

export async function syncReminders({ withPool = false }: { withPool?: boolean } = {}): Promise<void> {
  if (!isRemindersNativeAvailable()) return;
  const s = loadReminderSettings();
  const language = loadLanguagePreference();
  // The pool is large: sent at launch, on a language change, and when asked — native keeps it otherwise.
  const sendPool = withPool || lastPushedLanguage !== language;
  lastPushedLanguage = language;
  await trackNativeSync(
    RemindersNative.setReminders({
      enabled: s.enabled,
      notifications: s.notifications,
      categories: REMINDER_CATEGORIES.filter((c) => s.categories[c]),
      intervalMinutes: s.intervalMinutes,
      startMinutes: startTimeToMinutes(s.startTime),
      endMinutes: startTimeToMinutes(s.endTime),
      fullScreen: s.fullScreen,
      language,
      // The weekly holiday start on holidays; other days keep the reminders' own period.
      dayStartMinutes: holidayDayStarts(),
      backgroundMode: s.backgroundMode,
      fixedBackground: s.fixedBackground,
      latitude: reliableLatitude(),
      widgetAccent: currentWidgetColors().accent,
      widgetTint: currentWidgetColors().tint,
      ...(sendPool ? { pool: reminderPool().map((item) => nativeReminderItem(item, language)) } : {}),
    }),
  );
}

const PUSHED_BACKGROUND_KEY = "dithar:reminders:custom-background-pushed:v1";

/** Writes the user's photo to native storage for the widget — only when it changed. */
export async function syncCustomBackground(): Promise<void> {
  if (!isRemindersNativeAvailable()) return;
  const custom = loadCustomBackground();
  let pushed: string | null = null;
  try {
    pushed = localStorage.getItem(PUSHED_BACKGROUND_KEY);
  } catch {
    // Unknown: push again.
  }
  const stamp = custom ? String(custom.updatedAt) : "none";
  if (pushed === stamp) return;
  if (custom) {
    await RemindersNative.setCustomBackground({ jpegBase64: custom.dataUrl.slice(custom.dataUrl.indexOf(",") + 1) });
  } else {
    await RemindersNative.setCustomBackground({ clear: true });
  }
  try {
    localStorage.setItem(PUSHED_BACKGROUND_KEY, stamp);
  } catch {
    // Pushed again next time — harmless.
  }
}

export async function syncSummary(): Promise<void> {
  if (!isRemindersNativeAvailable()) return;
  const s = loadSummarySettings();
  let snapshot;
  try {
    snapshot = buildSummarySnapshot();
  } catch {
    // Pushed as unknown rather than not at all: a stale snapshot would read as "nothing recorded today".
    snapshot = unavailableSummarySnapshot();
  }
  await trackNativeSync(RemindersNative.setSummary({ enabled: s.enabled, minutes: startTimeToMinutes(s.time), mode: s.content, snapshot }));
}

/** Once per launch (Android): pushes everything, then keeps it current. */
export function startRemindersSync(): () => void {
  if (!isRemindersNativeAvailable()) return () => {};
  const reminders = (withPool = false) => void syncReminders({ withPool }).catch(() => {});
  const background = () => void syncCustomBackground().catch(() => {});
  const summary = () => void syncSummary().catch(() => {});
  let statsTimer: number | undefined;
  const summarySoon = () => {
    window.clearTimeout(statsTimer);
    statsTimer = window.setTimeout(summary, 2_000);
  };
  const onHidden = () => {
    if (document.visibilityState === "hidden") summary();
  };
  const handles: Promise<PluginListenerHandle>[] = [
    App.addListener("resume", () => {
      reminders();
      summary();
    }),
    App.addListener("pause", summary),
  ];
  const unsubscribers = [
    subscribeReminderSettings(() => {
      reminders();
      background();
    }),
    subscribeWeeklySchedule(() => reminders()),
    subscribeLocationChanges(() => reminders()),
    subscribeSummarySettings(summary),
    subscribeStatsChanges(summarySoon),
    // The widget follows the app's palette (and identity, which picks the palette variant).
    subscribePaletteChanges(() => reminders()),
    // A review decision changes what is published: push the new pool.
    subscribeContentReview(() => reminders(true)),
    startFavoritesSync(),
  ];
  document.addEventListener("visibilitychange", onHidden);
  reminders(true);
  background();
  summary();
  return () => {
    window.clearTimeout(statsTimer);
    document.removeEventListener("visibilitychange", onHidden);
    for (const unsubscribe of unsubscribers) unsubscribe();
    for (const handle of handles) void handle.then((h) => h.remove());
  };
}
