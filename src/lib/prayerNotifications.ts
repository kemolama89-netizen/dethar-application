// Prayer times on Android — the JS half. Builds one entry per prayer
// (Fajr, Dhuhr, Asr, Maghrib, Isha) for the next days from the app's own
// prayer times (prayerSchedule.ts — the same source as the Prayer Times
// card and the Audio Adhkar adhan pause): a notification showing the
// prayer's name and its local time when that prayer's notification is on,
// and the adhan when auto-adhan is on for its section (Settings → صوت
// الأذان: voice, rotation and mode). Hands them to the native Android
// scheduler (PrayerNotificationsPlugin), which owns the alarms from there —
// while the app is closed, and across reboots — and plays the adhan in the
// Audio Adhkar media service, so it never overlaps adhkar.
//
// Re-synced on every launch and return to the app (so the stored days
// never run out while the app is in use), and whenever the location, the
// language or the user's choices change. Each sync REPLACES the stored
// notifications, so it can never duplicate one.
//
// Web/iOS: no native scheduler — nothing is scheduled.
import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { Language } from "../theme/LanguageContext";
import { labels, prayerNames } from "../data/content";
import { formatPrayerTime } from "./prayerTimes";
import { knownPrayerLocation, upcomingPrayerTimes } from "./prayerSchedule";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";
import type { PrayerReminderSettings } from "./prayerReminderSettings";
import { subscribeLocationChanges } from "./locationSettings";
import { loadLanguagePreference } from "./appearancePreferences";
import { trackNativeSync } from "./appExit";
import { loadAdhanAudioSettings, loadAdhanAutoPlay } from "./adhanAudioSettings";
import type { AdhanAutoPlay } from "./adhanAudioSettings";
import { adhanNextToken, loadAdhanRotationSettings, peekNextAdhanVoice, recordNativeAdhanPlay, rotationVoices } from "./adhanVoiceRotation";
import type { AdhanSection } from "./adhanVoiceRotation";
import { adhanMuezzinName, getAdhanRecordingById } from "../data/adhanRecordings";
import type { AdhanRecording } from "../data/adhanRecordings";
import { playableAudioPath } from "./audioAssets";

/** How far ahead notifications are handed to native. */
export const PRAYER_NOTIFICATION_DAYS = 30;

export interface PrayerNotificationEntry {
  prayer: string;
  /** The prayer time, epoch millis. */
  at: number;
  title: string;
  body: string;
  /** Show the notification (false: the entry is only there for its adhan). */
  notify: boolean;
}

/** One adhan voice for native: its recording inside the APK and the segment to play. */
export interface NativeAdhanVoice {
  id: string;
  name: string;
  assetPath: string;
  startMillis: number;
  endMillis: number;
  /** Who calls this adhan (data/adhanRecordings.ts ADHAN_MUEZZINS); "" when not reliably known. */
  muezzin: string;
}

/** A section's adhan for native; null when auto-adhan is off for it. */
export interface NativeAdhanConfig {
  rotate: boolean;
  voices: NativeAdhanVoice[];
  /** The voice Settings shows as next, played by the next adhan (once — see nextToken). */
  nextVoiceId: string;
  nextToken: string;
}

export interface PrayerNotificationStatus {
  /** The latest adhan the Android alarm played, per section. */
  adhanLast?: Record<AdhanSection, { voiceId: string; at: number } | null>;
  /** When the next notification is due (epoch millis), null when none is scheduled. */
  nextAt: number | null;
  /** "Alarms & reminders" allowed — notifications arrive on time. */
  exact: boolean;
  /** Notifications allowed for DITHAR. */
  notifications: boolean;
  /** Diagnostics for a real-device test: battery "Unrestricted", the standby bucket (10 active … 45 restricted, -1 unknown), recent native events ("<epochMs>|<message>"). */
  ignoringBatteryOptimizations?: boolean;
  standbyBucket?: number;
  events?: string[];
}

interface PrayerNotificationsPlugin {
  setSchedule(options: { entries: PrayerNotificationEntry[]; adhan: Record<AdhanSection, NativeAdhanConfig | null> }): Promise<PrayerNotificationStatus>;
  getStatus(): Promise<PrayerNotificationStatus>;
  requestPermissions(options: { permissions: "notifications"[] }): Promise<{ notifications: string }>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  /** Stops the adhan if it is playing now (the master switch turned off); adhkar are never touched. */
  stopAdhan(): Promise<void>;
}

export const PrayerNotificationsNative = registerPlugin<PrayerNotificationsPlugin>("PrayerNotifications");

export function isPrayerNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

const sectionOf = (prayer: string): AdhanSection => (prayer === "fajr" ? "fajr" : "regular");

/**
 * The prayer times to schedule, in time order: with the master switch on,
 * each one whose own notification is on, or whose section has auto-adhan
 * on (then silent if its notification is off). Nothing with the master
 * switch off — no notification and no adhan — and nothing while the
 * user's location isn't known yet (the app would only be showing the
 * Kuwait fallback — never for a place that isn't theirs).
 */
export function buildPrayerNotifications(
  now: Date,
  settings: PrayerReminderSettings = loadPrayerReminderSettings(),
  language: Language = loadLanguagePreference(),
  location = knownPrayerLocation(),
  days = PRAYER_NOTIFICATION_DAYS,
  autoPlay: AdhanAutoPlay = loadAdhanAutoPlay(),
): PrayerNotificationEntry[] {
  if (!location || !settings.enabled) return [];
  const t = labels[language];
  const notifies = (prayer: keyof PrayerReminderSettings["prayers"]) => settings.prayers[prayer];
  return upcomingPrayerTimes(now, location, days)
    .filter(({ prayer, at }) => (notifies(prayer) || autoPlay[sectionOf(prayer)]) && at > now.getTime())
    .map(({ prayer, at }) => {
      const name = prayerNames[language][prayer];
      const time = formatPrayerTime(new Date(at), location.timezone);
      return {
        prayer,
        at,
        title: t.prayerNotificationTitle.replace("{prayer}", name).replace("{time}", time),
        body: t.prayerReminderNotificationBody.replace("{prayer}", name),
        notify: notifies(prayer),
      };
    });
}

function nativeVoice(recording: AdhanRecording, mode: "full" | "takbeer" | "fajrPhrase", language: Language): NativeAdhanVoice | null {
  const segment = recording.segments[mode];
  if (!segment) return null;
  return {
    id: recording.id,
    name: recording.name[language],
    assetPath: `public/${playableAudioPath(recording.path)}`,
    startMillis: Math.round(segment.start * 1000),
    endMillis: Math.round(segment.end * 1000),
    muezzin: adhanMuezzinName(recording, language) ?? "",
  };
}

/**
 * A section's adhan as Settings → صوت الأذان has it: the chosen voice, or —
 * rotating — every enabled voice that can play the chosen mode, with the
 * voice announced as next. Null when auto-adhan is off for the section.
 */
export function buildAdhanConfig(which: AdhanSection, language: Language = loadLanguagePreference(), autoPlay: AdhanAutoPlay = loadAdhanAutoPlay()): NativeAdhanConfig | null {
  if (!autoPlay[which]) return null;
  const { recordingId, mode } = loadAdhanAudioSettings()[which];
  const rotate = loadAdhanRotationSettings()[which].enabled;
  const pool = rotate ? rotationVoices(which) : [getAdhanRecordingById(recordingId)!];
  const voices = pool.flatMap((r) => nativeVoice(r, mode, language) ?? []);
  if (voices.length === 0) return null;
  const next = peekNextAdhanVoice(which).recording.id;
  return { rotate: rotate && voices.length > 1, voices, nextVoiceId: next, nextToken: rotate ? adhanNextToken(which) : "" };
}

/**
 * Replaces every scheduled prayer time and adhan setting with the current
 * ones. First takes in which adhan voices the alarm played meanwhile, so
 * the rotation never repeats one and "next" stays what Settings shows.
 * Idempotent.
 */
export function syncPrayerNotifications(now: Date = new Date(), language?: Language): Promise<PrayerNotificationStatus | null> {
  // Tracked so exiting the app waits for it to reach native (lib/appExit.ts).
  return trackNativeSync(syncNow(now, language));
}

async function syncNow(now: Date, language?: Language): Promise<PrayerNotificationStatus | null> {
  if (!isPrayerNotificationsAvailable()) return null;
  const status = await PrayerNotificationsNative.getStatus().catch(() => null);
  for (const which of ["regular", "fajr"] as const) {
    const last = status?.adhanLast?.[which];
    if (last) recordNativeAdhanPlay(which, last.voiceId, last.at);
  }
  // The master switch off: nothing — no prayer time, no adhan — so native cancels its alarm.
  const master = loadPrayerReminderSettings().enabled;
  return PrayerNotificationsNative.setSchedule({
    entries: buildPrayerNotifications(now, undefined, language),
    adhan: master ? { regular: buildAdhanConfig("regular", language), fajr: buildAdhanConfig("fajr", language) } : { regular: null, fajr: null },
  });
}

/**
 * The prayer notifications master switch (the Prayer Times card's toggle,
 * Settings → تنبيهات الصلاة): saves it — each prayer's own switch and the
 * adhan settings stay as they are — and re-syncs. Turning on asks for the
 * notification permission first and restores every prayer from the saved
 * choices; turning off cancels every prayer notification and adhan, and
 * stops an adhan that is playing. Audio Adhkar are never touched (their
 * adhan pause comes from the prayer times, not from this switch).
 */
export async function setPrayerNotificationsEnabled(enabled: boolean, language?: Language, now: Date = new Date()): Promise<PrayerNotificationStatus | null> {
  if (enabled) await requestPrayerNotificationPermission();
  savePrayerReminderSettings({ ...loadPrayerReminderSettings(), enabled });
  const status = await syncPrayerNotifications(now, language);
  if (!enabled && isPrayerNotificationsAvailable()) await trackNativeSync(PrayerNotificationsNative.stopAdhan()).catch(() => {});
  return status;
}

/** Asked only from an explicit enable tap (Android 13+ shows the system prompt once). */
export async function requestPrayerNotificationPermission(): Promise<void> {
  if (!isPrayerNotificationsAvailable()) return;
  await PrayerNotificationsNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
}

/**
 * Once per app launch: schedules from the saved choices, then keeps them
 * current — on every return to the app and on every location change. No-op
 * off Android. (Language changes re-sync from the app shell.)
 */
export function startPrayerNotificationSync(): () => void {
  if (!isPrayerNotificationsAvailable()) return () => {};
  const resync = () => void syncPrayerNotifications().catch(() => {});
  const handles: Promise<PluginListenerHandle>[] = [App.addListener("resume", resync)];
  const unsubscribeLocation = subscribeLocationChanges(resync);
  resync();
  return () => {
    unsubscribeLocation();
    for (const handle of handles) void handle.then((h) => h.remove());
  };
}
