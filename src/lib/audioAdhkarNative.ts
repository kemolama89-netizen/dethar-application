import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../audioadhkar/AudioAdhkarPlugin.kt — the only seam
// between the web app and native scheduled Audio Adhkar playback
// (Morning, Evening, Misc).

/** A scheduled section, as native names it. */
export type NativeSection = "morning" | "evening" | "misc";

/** Playback state published by the native service (see AudioAdhkarPlaybackService#stateJson). */
export interface NativeAudioAdhkarState {
  active: boolean;
  collection: NativeSection;
  dhikrId: string;
  title: string;
  repetition: number;
  total: number;
  status: "playing" | "paused" | "finished";
  index: number;
  count: number;
  /** A «استماع» session started from the app (playNow), not a scheduled one. */
  manual?: boolean;
  /** The reciter of the recitation playing now (after random rotation); "" when not reliably known. */
  reciter?: string;
}

/** What one dhikr plays, as paths inside the APK assets. Always bundled files: no network. */
export interface NativeRecitation {
  /**
   * The files the FIRST repetition plays, back to back — e.g.
   * ["public/audio/adhkar/evening/morning_003.mp3"], or a Quranic
   * recitation: the reciter's own basmala (when it opens a surah) then its
   * ayah files ["public/audio/quran/husary-murattal/basmala.mp3", ".../112001.mp3", …].
   */
  assetPaths: string[];
  /** The files later repetitions play (no basmala again); usually = assetPaths. */
  repeatAssetPaths: string[];
  /** Later repetitions start this far into their first file (past an in-file basmala); usually 0. */
  repeatStartMillis: number;
  /** The Quran reciter heard (a Quranic recitation); absent/"" when not reliably known — no name is shown. */
  reciterName?: string;
}

export interface NativePlaylistItem extends NativeRecitation {
  dhikrId: string;
  title: string;
  text: string;
  /**
   * Quranic dhikr in Automatic Rotation mode: every rotation reciter's
   * recitation (his own basmala and ayahs), in rotation order. The service
   * gives each Quranic recitation of a session the next one in turn
   * (AudioAdhkarRotation). Empty otherwise — the fields above play.
   */
  rotation: NativeRecitation[];
  repetitions: number;
}

/** One repetition the background player heard to the end (AudioAdhkarStore.appendCompletion). */
export interface NativeCompletion {
  id: string;
  collection: NativeSection;
  dhikrId: string;
  /** Epoch millis, and the device's time zone then. */
  at: number;
  timeZone: string;
}

interface NativeSectionSchedule {
  enabled: boolean;
  /** Minutes after local midnight, -1 when unset. */
  startMinutes: number;
  playlist: NativePlaylistItem[];
}

export interface NativeDailySchedule extends NativeSectionSchedule {
  /**
   * The planned sessions, one per day (lib/dailyAzkarWindows.ts):
   * [window start, session start, window end], epoch millis. Native plays
   * each at most once and never continues one past its window's end.
   */
  slots: (readonly [number, number, number])[];
}

export interface NativeMiscSchedule extends NativeSectionSchedule {
  /** The window's end, minutes after local midnight (before startMinutes = past midnight). */
  endMinutes: number;
  intervalMinutes: number;
  /** Language of the "paused for prayer / resumed" notifications. */
  language: "ar" | "en";
}

export interface NativeScheduleResult {
  /** When the section next plays (epoch millis), null when it isn't scheduled. */
  scheduledAt: number | null;
  warningAt: number | null;
}

export interface AudioAdhkarDiagnostics {
  events: string[];
  exactAlarms: boolean;
  notifications: boolean;
  ignoringBatteryOptimizations: boolean;
  /** UsageStatsManager standby bucket (10 active … 45 restricted), -1 when unknown. */
  standbyBucket: number;
  scheduledAt: number;
  /** HONOR/Huawei: the phone's own "App launch" manager may hold alarms after a swipe from Recents. */
  backgroundLaunchManaged?: boolean;
}

export interface AudioAdhkarPlugin {
  /**
   * Saves every section's settings and playlist plus the adhan windows
   * ([start, end) epoch millis — nothing plays inside one), then re-arms
   * every section's alarms (replacing, never adding).
   */
  setSchedules(options: {
    morning: NativeDailySchedule;
    evening: NativeDailySchedule;
    misc: NativeMiscSchedule;
    adhanWindows: (readonly [number, number])[];
  }): Promise<Record<NativeSection, NativeScheduleResult> & { exact: boolean }>;
  /** `busy`: anything plays natively now — an adhkar session or the adhan (which has no adhkar state). */
  getPlaybackState(): Promise<{ state: NativeAudioAdhkarState | null; busy?: boolean }>;
  /**
   * The app's own volume per kind of audio (gain 0–1; Settings → إعدادات
   * الصوت): stored natively and applied at once to what is playing and to
   * every later session — the phone's media volume is never changed.
   */
  setVolumes(options: { adhan: number; morning: number; evening: number; misc: number }): Promise<void>;
  /** Repetitions the background player heard to the end that the app hasn't taken in yet. */
  getCompletions(): Promise<{ completions: NativeCompletion[] }>;
  /** The app took these in (by id): native forgets them. Safe to repeat. */
  acknowledgeCompletions(options: { ids: string[] }): Promise<void>;
  /**
   * «استماع» on Android: plays one dhikr now in the native media foreground
   * service, so it keeps playing with the screen off. Replaces any adhkar
   * session playing; refused ({ started: false }) while the adhan plays.
   */
  playNow(options: { collection: NativeSection; item: NativePlaylistItem }): Promise<{ started: boolean }>;
  /** Stops a playNow session only — never a scheduled one or the adhan. */
  stopManual(): Promise<void>;
  /** Stops a scheduled session that is playing (never «استماع» or the adhan) and clears pending Audio Adhkar notices — the master switch turned off. */
  stopScheduled(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  canScheduleExactAlarms(): Promise<{ granted: boolean }>;
  /** Adds the app's side of a playback decision to the native background-playback trace. */
  log(options: { message: string }): Promise<void>;
  /** The full diagnostics report: device, permissions, battery, Android's process-exit reasons, the trace. */
  getDiagnosticsReport(): Promise<{ report: string }>;
  /** Opens Android's share sheet with the report as a .txt file. */
  shareDiagnostics(): Promise<void>;
  clearDiagnostics(): Promise<void>;
  /** Recent native scheduler/receiver/service events ("<epochMs>|<message>") and the states that gate them. */
  getDiagnostics(): Promise<AudioAdhkarDiagnostics>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  /** HONOR/Huawei "App launch" page (falls back to DITHAR's app-info page). */
  openBackgroundLaunchSettings(): Promise<void>;
  requestPermissions(options: { permissions: "notifications"[] }): Promise<{ notifications: string }>;
  addListener(
    eventName: "playbackState",
    listenerFunc: (event: { state: NativeAudioAdhkarState | null }) => void,
  ): Promise<PluginListenerHandle>;
  /** A repetition completed in the background player (fetch them with getCompletions). */
  addListener(eventName: "completions", listenerFunc: () => void): Promise<PluginListenerHandle>;
  /** A native session (adhkar, «استماع» or the adhan) began playing. */
  addListener(eventName: "sessionStarted", listenerFunc: () => void): Promise<PluginListenerHandle>;
}

export const AudioAdhkarNative = registerPlugin<AudioAdhkarPlugin>("AudioAdhkar");

/** Scheduled/background Audio Adhkar exists only in the Android app. */
export function isAudioAdhkarNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
