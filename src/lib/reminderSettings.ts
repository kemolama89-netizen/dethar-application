// Settings → التذكيرات والودجت: dua / hadith / dhikr-virtue / poetry reminders, the
// home-screen widget's content and background, and the full-screen
// reflection. One store, independent of every Audio Adhkar setting.
//
//  - `enabled` turns the whole reminder rotation on (off by default — a
//    reminder is never sent without the user asking for it).
//  - `notifications` decides whether each reminder is ALSO posted as a
//    notification; off, the widget still changes content.
//  - Content categories, a permitted daily period and an interval of at
//    least an hour keep reminders few: at most one per interval, only
//    inside the period (and never before the weekly schedule's start for
//    that day), none during an adhan pause.
//  - `fullScreen`: the reflection a tapped reminder (notification or
//    widget) opens — always on exactly the item it showed — closes itself
//    after 30 seconds; off, it stays until the user closes it.
//  - The background: automatic (time of day + season), one fixed image, or
//    the user's own photo (stored separately — see customBackground below).
import { isBackgroundId } from "./reminderBackgrounds";
import { isValidStartTime } from "./eveningAudioSettings";
import type { ReminderCategory } from "./reminderContent";

export const REMINDER_INTERVALS = [60, 90, 120, 180, 240, 360] as const;

export type BackgroundMode = "auto" | "fixed" | "custom";

export interface ReminderSettings {
  enabled: boolean;
  notifications: boolean;
  categories: Record<ReminderCategory, boolean>;
  intervalMinutes: number;
  startTime: string;
  endTime: string;
  fullScreen: boolean;
  backgroundMode: BackgroundMode;
  fixedBackground: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  notifications: true,
  categories: { dua: true, hadith: true, virtue: true, poetry: true, lataif: true },
  intervalMinutes: 180,
  startTime: "09:00",
  endTime: "21:00",
  fullScreen: true,
  backgroundMode: "auto",
  fixedBackground: "mosque-night",
};

const KEY = "dithar:reminders:v1";
const CUSTOM_BACKGROUND_KEY = "dithar:reminders:custom-background:v1";

const listeners = new Set<() => void>();

/** Told on every change (the native reminder schedule and widget re-sync). */
export function subscribeReminderSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of [...listeners]) listener();
}

export function loadReminderSettings(): ReminderSettings {
  let obj: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
  } catch {
    // Unreadable: the defaults.
  }
  const d = DEFAULT_REMINDER_SETTINGS;
  const cats = (obj.categories && typeof obj.categories === "object" ? obj.categories : {}) as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const time = (v: unknown, fallback: string) => (typeof v === "string" && isValidStartTime(v) ? v : fallback);
  return {
    enabled: bool(obj.enabled, d.enabled),
    notifications: bool(obj.notifications, d.notifications),
    // Categories added later (poetry, lataif) are on for settings saved before they existed; they can be turned off like the others.
    categories: { dua: bool(cats.dua, true), hadith: bool(cats.hadith, true), virtue: bool(cats.virtue, true), poetry: bool(cats.poetry, true), lataif: bool(cats.lataif, true) },
    intervalMinutes: (REMINDER_INTERVALS as readonly number[]).includes(obj.intervalMinutes as number) ? (obj.intervalMinutes as number) : d.intervalMinutes,
    startTime: time(obj.startTime, d.startTime),
    endTime: time(obj.endTime, d.endTime),
    fullScreen: bool(obj.fullScreen, d.fullScreen),
    backgroundMode: obj.backgroundMode === "fixed" || obj.backgroundMode === "custom" ? obj.backgroundMode : "auto",
    fixedBackground: isBackgroundId(obj.fixedBackground) ? obj.fixedBackground : d.fixedBackground,
  };
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Best effort.
  }
  notify();
}

/** At least one category must stay on while reminders are on. */
export function hasAnyCategory(settings: ReminderSettings): boolean {
  return Object.values(settings.categories).some(Boolean);
}

// ---- the user's own background photo -------------------------------------
// Kept as a small, already cropped and re-encoded JPEG data URL (see
// BackgroundCropper — ~720 px wide, so typically 60–150 KB), apart from the
// settings so ordinary setting changes never rewrite the image. On Android
// the same JPEG is also written to the app's private files for the widget.

export interface CustomBackground {
  dataUrl: string;
  updatedAt: number;
}

export function loadCustomBackground(): CustomBackground | null {
  try {
    const raw = localStorage.getItem(CUSTOM_BACKGROUND_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && typeof (parsed as CustomBackground).dataUrl === "string" && (parsed as CustomBackground).dataUrl.startsWith("data:image/")) {
      return parsed as CustomBackground;
    }
  } catch {
    // Missing or unreadable.
  }
  return null;
}

/** False when it couldn't be stored (e.g. storage full) — the caller keeps the previous mode. */
export function saveCustomBackground(dataUrl: string): boolean {
  try {
    localStorage.setItem(CUSTOM_BACKGROUND_KEY, JSON.stringify({ dataUrl, updatedAt: Date.now() }));
    notify();
    return true;
  } catch {
    return false;
  }
}

export function clearCustomBackground(): void {
  try {
    localStorage.removeItem(CUSTOM_BACKGROUND_KEY);
  } catch {
    // Nothing to clear.
  }
  notify();
}
