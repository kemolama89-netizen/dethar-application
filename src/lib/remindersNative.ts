import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../reminders/RemindersPlugin.kt — reminders, the
// home-screen widget and the end-of-day summary.

/**
 * Exactly what a tapped notification or widget showed (native ReminderOpen):
 * the strings as drawn — already localized, the text as sent by
 * nativeReminderItem. Older builds send none.
 */
export interface ShownReminder {
  category: string;
  title: string;
  text: string;
  meaning: string;
  detail: string;
  source: string;
  commentText: string | null;
}

export interface NativeReminderItem {
  id: string;
  category: string;
  /** The category's title in the interface language. */
  title: string;
  /** The Arabic text — never altered. */
  text: string;
  /** Its English meaning in English mode, else "". */
  meaning: string;
  /** Source (and grade, for a Hadith; the poet for poetry) in the interface language. */
  source: string;
  theme: string;
  /** DITHAR's short comments in the interface language; native shows one at a time, in turn. */
  comments: { id: string; text: string; widget?: boolean }[];
  /** Whether the home-screen widget may show it (lib/widgetFeed.ts); absent = yes. */
  widget?: boolean;
  /** A dhikr's virtue in the interface language, shown labelled under it on the widget; "" when none (widgetFeed.widgetDetail). */
  detail?: string;
  /** The text as the widget draws it, when that differs: a Qur'anic verse in its brackets ﴿ … ﴾ (widgetFeed.widgetQuranText); "" = `text`. */
  widgetText?: string;
}

/** A heart tapped on the widget, queued natively until the app merges it (FavoritesStore.kt). */
export interface NativeFavoriteOp {
  seq: number;
  key: string;
  add: boolean;
  at: number;
  category: string;
  title: string;
  text: string;
  meaning: string;
  source: string;
  commentId: string | null;
  commentText: string | null;
}

/** One encouragement as native shows it: the message, and its credit line when grounded in a source. */
export interface NativeEncouragement {
  id: string;
  situations: string[];
  text: string;
  credit?: string;
}

export interface RemindersPlugin {
  setReminders(options: {
    enabled: boolean;
    notifications: boolean;
    categories: string[];
    intervalMinutes: number;
    startMinutes: number;
    endMinutes: number;
    fullScreen: boolean;
    language: "ar" | "en";
    dayStartMinutes: number[];
    backgroundMode: string;
    fixedBackground: string;
    /** Only when the location is reliable (not the Kuwait fallback) — for the season. */
    latitude?: number;
    /** The palette's accent on dark imagery and its primary ("#rrggbb") — the widget's title/heart and its tint. */
    widgetAccent?: string;
    widgetTint?: string;
    pool?: NativeReminderItem[];
  }): Promise<{ widgets: number }>;
  setSummary(options: {
    enabled: boolean;
    minutes: number;
    mode: string;
    snapshot?: unknown;
    /** The encouragement library in the interface language (lib/dailySummary.ts nativeEncouragements); native picks one per summary. */
    encouragements?: NativeEncouragement[];
  }): Promise<void>;
  setCustomBackground(options: { jpegBase64?: string; clear?: boolean }): Promise<void>;
  /** The time-based content notifications (lib/timedContent.ts): replaces every stored entry; keys already posted stay posted. */
  setTimedContent(options: { language: "ar" | "en"; entries: { key: string; kind: string; at: number; title: string; item: NativeReminderItem }[] }): Promise<{ nextAt: number | null }>;
  getWidgetStatus(): Promise<{ count: number; pinSupported: boolean }>;
  requestPinWidget(): Promise<{ requested: boolean }>;
  /** The reminder the app was launched from (a notification or the widget), and the comment shown with it, once. */
  consumeLaunchReminder(): Promise<{ id: string | null; commentId?: string | null; shown?: ShownReminder }>;
  /** A tapped reminder's view has painted: native removes the cover it put over the WebView (ReminderOpenCover.kt). */
  reminderViewShown(): Promise<void>;
  /** The chosen appearance theme, for what native draws without the WebView: the floating Tasbeeh and that cover (AppLook.kt). */
  setAppLook(options: { look: string; autoDark: string }): Promise<void>;
  /** Widget hearts not merged yet, oldest first. */
  getFavoriteOps(): Promise<{ ops: NativeFavoriteOp[] }>;
  /** The app's full list of favorite ids, after merging every op up to `ackThrough`. */
  setFavoriteKeys(options: { keys: string[]; ackThrough: number }): Promise<void>;
  /**
   * Home's «مختارات اليوم» preview (native WidgetPreview): exactly what the widget drew for the slot it shows, or —
   * with no widget on the home screen — the item its rotation is due to show. `open` is what a tap on the widget
   * opens; `nextChangeAt`, when the clock moves the widget on (reminders off; while on, each delivered reminder
   * redraws it and sends "widgetChanged"). Missing in builds before it (the call rejects).
   */
  getWidgetPreview(): Promise<{ open: { id: string | null; commentId?: string | null; shown?: ShownReminder } | null; from: "widget" | "rotation" | null; nextChangeAt: number | null }>;
  addListener(eventName: "openReminder", listener: (event: { id: string; commentId?: string | null; shown?: ShownReminder }) => void): Promise<PluginListenerHandle>;
  /** The widget redrew, or was asked to (settings, content, a delivered reminder, the clock, a widget added or removed). */
  addListener(eventName: "widgetChanged", listener: () => void): Promise<PluginListenerHandle>;
}

export const RemindersNative = registerPlugin<RemindersPlugin>("DitharReminders");

/** Reminder notifications, the widget and the summary exist only in the Android app. */
export function isRemindersNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
