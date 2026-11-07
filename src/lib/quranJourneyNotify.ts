// The Qur'an Journey's daily notification (Android): at the user's time, one notification
// naming the journey's page and inviting to its insight from Tafsir al-Sa'di. A tap opens
// that insight directly (App.tsx JourneyOpenHost).
//
//  - Native (journey/QuranJourneyPlugin.kt) holds one notice: the assignment to invite to and
//    the first day it applies to. It posts at most once a day, and keeps posting the same page
//    on later days until the app replaces the notice: a missed day never skips a page.
//  - While today's page is unexplored the notice is today's; once it is explored, tomorrow's
//    (lib/quranJourney.ts upcomingAssignment), so nothing more comes today.
//  - Scheduling, delivery and a tap never count: only the insight kept on screen does
//    (recordDailyInsightViewed). The notification text names the page and the verse only;
//    it never quotes or paraphrases the Tafsir.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { quranJourneyLabels } from "../data/quranJourneyLabels";
import { loadLanguagePreference } from "./appearancePreferences";
import { isValidStartTime, startTimeToMinutes } from "./eveningAudioSettings";
import { JOURNEY_PAGES, subscribeJourney, upcomingAssignment } from "./quranJourney";
import type { DailyAssignment } from "./quranJourney";
import { arabicDigits, surahMeta } from "./quranMeta";
import { todayLocalDate } from "./stats";
import { QuranJourneyNative, isJourneyNativeAvailable, type JourneyNotice } from "./quranJourneyNative";

const KEY = "dithar:quran-journey:notify:v1";

export interface JourneyNotifySettings {
  enabled: boolean;
  /** "HH:MM", local. */
  time: string;
}

export const DEFAULT_JOURNEY_NOTIFY: JourneyNotifySettings = { enabled: false, time: "08:00" };

const listeners = new Set<() => void>();

export function loadJourneyNotifySettings(): JourneyNotifySettings {
  try {
    const obj = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<JourneyNotifySettings>;
    return {
      enabled: obj.enabled === true,
      time: typeof obj.time === "string" && isValidStartTime(obj.time) ? obj.time : DEFAULT_JOURNEY_NOTIFY.time,
    };
  } catch {
    return { ...DEFAULT_JOURNEY_NOTIFY };
  }
}

export function saveJourneyNotifySettings(settings: JourneyNotifySettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Best effort.
  }
  for (const listener of [...listeners]) listener();
}

export function subscribeJourneyNotifySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The local day after [localDate] ("YYYY-MM-DD"), across month, year and DST changes. */
export function nextLocalDate(localDate: string): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1, 12);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

/** The notification's text for [assignment]: the page, and the verse whose comment is the insight. Interface words only. */
export function journeyNoticeText(assignment: DailyAssignment, language: "ar" | "en"): { title: string; body: string } {
  const t = quranJourneyLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const [surah, ayah] = assignment.insight.split(":").map(Number);
  const meta = surahMeta(surah);
  const name = language === "en" ? (meta?.nameTranslit ?? "") : (meta?.nameAr ?? "");
  return {
    title: t.noticeTitle(digits(assignment.page), digits(JOURNEY_PAGES)),
    body: t.noticeBody(name, digits(ayah)),
  };
}

/** The notice native should hold now (null: nothing to post, e.g. storage unreadable). */
export async function buildJourneyNotice(language: "ar" | "en", today: string = todayLocalDate(), eligibleFor?: Parameters<typeof upcomingAssignment>[2]): Promise<JourneyNotice | null> {
  const assignment = await upcomingAssignment(today, nextLocalDate(today), eligibleFor);
  if (!assignment) return null;
  return { fromDate: assignment.localDate, page: assignment.page, round: assignment.round, insight: assignment.insight, ...journeyNoticeText(assignment, language) };
}

/** Pushes the setting and the current notice to native (Android only). */
export async function syncJourneyNotice(): Promise<void> {
  if (!isJourneyNativeAvailable()) return;
  const settings = loadJourneyNotifySettings();
  const minutes = startTimeToMinutes(settings.time);
  const language = loadLanguagePreference();
  // Off: the alarm and any posted notification go, without assigning anything.
  if (!settings.enabled) {
    await QuranJourneyNative.setJourneyNotice({ enabled: false, minutes, language });
    return;
  }
  const notice = await buildJourneyNotice(language);
  await QuranJourneyNative.setJourneyNotice({ enabled: true, minutes, language, ...(notice ? { notice } : {}) });
}

/** Once per launch (Android): pushes the notice, then keeps it current. */
export function startJourneyNotifySync(): () => void {
  if (!isJourneyNativeAvailable()) return () => {};
  const sync = () => void syncJourneyNotice().catch(() => {});
  const handles: Promise<PluginListenerHandle>[] = [App.addListener("resume", sync)];
  // A page explored (tomorrow's notice, today's taken down), or a new time.
  const unsubscribers = [subscribeJourney(sync), subscribeJourneyNotifySettings(sync)];
  sync();
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
    for (const handle of handles) void handle.then((h) => h.remove());
  };
}
