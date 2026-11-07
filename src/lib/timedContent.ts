// Time-based content notifications (Android): an extension of the reminders, not a separate
// feature. At set moments a notification shows a source-checked hadith from the app's own
// library, and a tap opens it in the reminder card (SpiritualReminderView) with its source and
// sharing — through the very same path as a tapped reminder or widget (ReminderOpen).
//
//  - before Asr: [asrLeadMinutes] before that day's Asr time (prayerSchedule.ts, the app's own
//    prayer times — read only, never recalculated), on the two cool prayers (Fajr and Asr);
//  - Friday: two hours before Jumu'ah (that Friday's Dhuhr time), on the day of Friday; and at the
//    same time a plain reminder to read Surah al-Kahf — DITHAR's own words, no hadith, virtue or source;
//  - the White Days: at 20:00 on the evening before the 13th of each Hijri month (the app's Umm
//    al-Qura date with the user's adjustment — islamicOccasions.ts hijriDateOf), on fasting the
//    13th, 14th and 15th.
//
// Only hadiths verified and audited (data/widgetContent.ts, `timedOnly`; religiousAudit.ts) are
// used, and only in a language the audit allows. Nothing here states a virtue of its own: the
// notification's title names the moment ("Asr is near"), its text is the hadith as stored.
//
// Native (reminders/TimedContentScheduler.kt) holds the next 14 days of entries and posts each
// once (its key); a sync replaces them all, so nothing is ever posted twice. Re-synced on launch,
// on return to the app, and when the location, the language or this setting changes.
import { knownPrayerLocation, upcomingPrayerTimes } from "./prayerSchedule";
import type { PrayerLocation } from "./prayerTimes";
import { localDateIn } from "./locationTime";
import { hijriDateOf } from "./islamicOccasions";
import { loadHijriAdjustment } from "./hijriAdjustment";
import { findReminderCandidate } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";
import { reminderAuditApproved } from "./religiousAudit";
import { timedContentLabels } from "../data/reminderLabels";
import type { Language } from "../theme/LanguageContext";
import { RemindersNative, isRemindersNativeAvailable } from "./remindersNative";
import type { NativeReminderItem } from "./remindersNative";

export type TimedKind = "asr" | "friday" | "kahf" | "whiteDays";
export const TIMED_KINDS: readonly TimedKind[] = ["asr", "friday", "kahf", "whiteDays"];

/** The hadiths each moment shows, in turn (reminder ids). */
export const TIMED_CONTENT: Readonly<Record<TimedKind, readonly string[]>> = {
  // Muslim 634 (Fajr and Asr, already in the library) and al-Bukhari 574 / Muslim 635 (the two cool prayers).
  asr: ["hadith:102", "hadith:bukhari-574"],
  // Muslim 854 (the best day the sun rises on) and al-Bukhari 935 / Muslim 852 (the hour on Friday).
  friday: ["hadith:muslim-854", "hadith:bukhari-935"],
  // DITHAR's own plain reminder: no hadith, virtue, reward or source (reminderContent.ts timedReminderItems).
  kahf: ["reminder:kahf-friday"],
  // al-Tirmidhi 761 (the 13th, 14th and 15th) and al-Bukhari 1981 / Muslim 721 (three days of every month).
  whiteDays: ["hadith:tirmidhi-761", "hadith:bukhari-1981"],
};

export const TIMED_CONTENT_DAYS = 14;
export const ASR_LEAD_CHOICES = [15, 30, 45, 60] as const;
const FRIDAY_LEAD_MINUTES = 120;
const WHITE_DAYS_EVENING = { hour: 20, minute: 0 };

export interface TimedContentSettings {
  enabled: boolean;
  kinds: Record<TimedKind, boolean>;
  asrLeadMinutes: (typeof ASR_LEAD_CHOICES)[number];
}

export const DEFAULT_TIMED_CONTENT: TimedContentSettings = { enabled: false, kinds: { asr: true, friday: true, kahf: true, whiteDays: true }, asrLeadMinutes: 30 };

const KEY = "dithar:timed-content:v1";
const listeners = new Set<() => void>();

export function loadTimedContentSettings(): TimedContentSettings {
  try {
    const obj = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<TimedContentSettings>;
    const kinds = (obj.kinds ?? {}) as Partial<Record<TimedKind, unknown>>;
    return {
      enabled: obj.enabled === true,
      kinds: { asr: kinds.asr !== false, friday: kinds.friday !== false, kahf: kinds.kahf !== false, whiteDays: kinds.whiteDays !== false },
      asrLeadMinutes: (ASR_LEAD_CHOICES as readonly number[]).includes(obj.asrLeadMinutes as number) ? (obj.asrLeadMinutes as TimedContentSettings["asrLeadMinutes"]) : DEFAULT_TIMED_CONTENT.asrLeadMinutes,
    };
  } catch {
    return { ...DEFAULT_TIMED_CONTENT, kinds: { ...DEFAULT_TIMED_CONTENT.kinds } };
  }
}

export function saveTimedContentSettings(settings: TimedContentSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Best effort.
  }
  for (const listener of [...listeners]) listener();
}

export function subscribeTimedContentSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface TimedEntry {
  /** "<kind>:<YYYY-MM-DD>" — posted once (native remembers it), whatever syncs follow. */
  key: string;
  kind: TimedKind;
  /** Epoch millis. */
  at: number;
  /** The notification's title: the moment, in the interface language. */
  title: string;
  /** The hadith exactly as the reminder card shows it (and as a tap reopens it). */
  item: NativeReminderItem;
}

/** The item for [kind] on its [n]th occurrence, among those the audit allows in [language]; null when none. */
export function timedItem(kind: TimedKind, n: number, language: Language): ReminderItem | null {
  const items = TIMED_CONTENT[kind].map((id) => findReminderCandidate(id)).filter((i): i is ReminderItem => !!i && reminderAuditApproved(i.id, language));
  return items.length ? items[((n % items.length) + items.length) % items.length] : null;
}

const dayKey = (d: { year: number; month: number; day: number }) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
/** Days since 1970 of a local date: the rotation's counter, the same on every sync. */
const dayNumber = (d: { year: number; month: number; day: number }) => Math.floor(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);

/**
 * The entries for the next [days] days after [now], in time order. Prayer-based ones only when
 * the user's location is known (never the fallback city); the White Days only when the runtime
 * has the Umm al-Qura calendar.
 */
export function buildTimedEntries(
  now: Date,
  toNative: (item: ReminderItem) => NativeReminderItem,
  settings: TimedContentSettings = loadTimedContentSettings(),
  language: Language = "ar",
  location: PrayerLocation | null = knownPrayerLocation(),
  days = TIMED_CONTENT_DAYS,
  hijriAdjustment = loadHijriAdjustment(),
): TimedEntry[] {
  if (!settings.enabled) return [];
  const t = timedContentLabels[language];
  const out: TimedEntry[] = [];
  const add = (kind: TimedKind, at: number, date: { year: number; month: number; day: number }, title: string) => {
    if (at <= now.getTime() || at > now.getTime() + (days + 1) * 86_400_000) return;
    const item = timedItem(kind, dayNumber(date), language);
    if (item) out.push({ key: `${kind}:${dayKey(date)}`, kind, at, title, item: toNative(item) });
  };
  if (location) {
    for (const { prayer, at } of upcomingPrayerTimes(now, location, days)) {
      const date = localDateIn(new Date(at), location.timezone);
      if (prayer === "asr" && settings.kinds.asr) add("asr", at - settings.asrLeadMinutes * 60_000, date, t.asrTitle);
      // Friday where the prayers are: its Dhuhr is Jumu'ah.
      const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
      if (prayer === "dhuhr" && weekday === 5 && settings.kinds.friday) add("friday", at - FRIDAY_LEAD_MINUTES * 60_000, date, t.fridayTitle);
      // The Surah al-Kahf reminder: the same Friday time, its own notification.
      if (prayer === "dhuhr" && weekday === 5 && settings.kinds.kahf) add("kahf", at - FRIDAY_LEAD_MINUTES * 60_000, date, t.kahfTitle);
    }
  }
  if (settings.kinds.whiteDays) {
    for (let offset = 0; offset <= days; offset++) {
      const evening = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, WHITE_DAYS_EVENING.hour, WHITE_DAYS_EVENING.minute);
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + 1, 12);
      const hijri = hijriDateOf(tomorrow, hijriAdjustment);
      if (hijri?.day === 13) add("whiteDays", evening.getTime(), { year: hijri.year, month: hijri.month, day: 13 }, t.whiteDaysTitle);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Pushes the entries for the next days to native (Android only); [toNative] is the reminders' own item conversion. */
export async function syncTimedContent(language: Language, toNative: (item: ReminderItem) => NativeReminderItem, now: Date = new Date()): Promise<void> {
  if (!isRemindersNativeAvailable()) return;
  await RemindersNative.setTimedContent({ language, entries: buildTimedEntries(now, toNative, loadTimedContentSettings(), language) });
}
