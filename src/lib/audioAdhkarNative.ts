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
  /** "error": the session ended because a recording couldn't play (never sent while active). */
  status: "playing" | "paused" | "finished" | "error";
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
  /** The session it belongs to (absent from completions recorded before this field existed). */
  sessionId?: string;
  /** The measured length of the files that played, ms (absent when unknown). */
  durationMs?: number;
  title?: string;
  /**
   * "listening": NOT a completion — the repetition stopped before its end
   * (stopped, interrupted, failed, the adhan) after playing `listenedMs`.
   * "session": a whole Morning/Evening session heard to its end (no dhikr id).
   * Absent for a repetition heard to the end.
   */
  kind?: "listening" | "session";
  listenedMs?: number;
  /** "session": the scheduled occurrence (epoch millis) of the Morning/Evening session heard to its end. */
  occurrence?: number;
}

/** Where the native player is within the current repetition — read from MediaPlayer, never estimated. */
export interface NativePlaybackProgress {
  active: boolean;
  positionMs: number;
  /** null until every file of the repetition has a known length. */
  durationMs: number | null;
  /** Still preparing the first file. */
  loading: boolean;
}

interface NativeSectionSchedule {
  enabled: boolean;
  /** Minutes after local midnight, -1 when unset. */
  startMinutes: number;
  playlist: NativePlaylistItem[];
}

export interface NativeDailySchedule extends NativeSectionSchedule {
  /** The one-minute reminder's sound (lib/adhkarReminderSounds.ts) — a sound id or "off". */
  reminderSound?: string;
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
  /**
   * The weekly schedule (lib/weeklySchedule.ts): per weekday, Sunday first,
   * the earliest minute a dhikr may start that day (-1 = no restriction).
   */
  dayStartMinutes?: number[];
  /** Adapt to Fridays and Islamic occasions (lib/islamicOccasions.ts). */
  occasionsEnabled?: boolean;
  /** Hijri occasion days: [local day start, next local midnight, key]; Friday is decided natively. */
  occasions?: (readonly [number, number, string])[];
  /** What each occasion plays instead of the normal rotation (one per tick, cycling). */
  occasionPlaylists?: Record<string, NativePlaylistItem[]>;
}

export interface NativeScheduleResult {
  /** When the section next plays (epoch millis), null when it isn't scheduled. */
  scheduledAt: number | null;
  warningAt: number | null;
}

/** A Morning/Evening session the adhan interrupted, waiting for the user's "Resume Adhkar" (never resumed automatically). */
export interface NativePendingResume {
  section: "morning" | "evening";
  /** 0-based playlist index of the dhikr it continues from, and that dhikr's repetition. */
  index: number;
  repetition: number;
  /** How many adhkar the session has. */
  count: number;
  /** After this (epoch millis — its prayer-time window's end) it can no longer be resumed. */
  expiresAt: number;
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

/**
 * The adhan as the background player reports it (AudioAdhkarPlaybackService
 * adhanStateJson). "waiting": another app or a call took the audio — it is
 * paused and continues by itself once the audio is free (AdhanFocusPolicy).
 */
export interface NativeAdhanState {
  active: boolean;
  status: "playing" | "paused" | "waiting";
  /** The notification title (e.g. the prayer's name). */
  title: string;
  /** The recording's display name. */
  voice: string;
  /** The muezzin heard, "" when the recording doesn't reliably say. */
  muezzin: string;
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
    /** The interface language, for every Audio Adhkar notification. */
    language?: "ar" | "en";
  }): Promise<Record<NativeSection, NativeScheduleResult> & { exact: boolean }>;
  /** Plays a reminder sound once on the notification stream (Settings preview). */
  previewReminderSound(options: { sound: string }): Promise<{ played: boolean }>;
  stopReminderSoundPreview(): Promise<void>;
  /** The adhan-interrupted session the user can still resume, or null. */
  getPendingResume(): Promise<{ pending: NativePendingResume | null }>;
  /** "Resume Adhkar" in the app: continues that saved session from where it stopped. */
  resumeSaved(options: { section: "morning" | "evening" }): Promise<{ started: boolean }>;
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
  /** The current repetition's position and length (read-only; for the player's progress bar). */
  getPlaybackProgress(): Promise<NativePlaybackProgress>;
  /** The app took these in (by id): native forgets them. Safe to repeat. */
  acknowledgeCompletions(options: { ids: string[] }): Promise<void>;
  /**
   * «استماع» on Android: plays one dhikr now in the native media foreground
   * service, so it keeps playing with the screen off. Replaces any adhkar
   * session playing; refused ({ started: false }) while the adhan plays.
   * With `items` («تشغيل الكل» / Play All): those dhikr one after another,
   * as one manual session (`item` is then the first, for older builds).
   */
  playNow(options: { collection: NativeSection; item: NativePlaylistItem; items?: NativePlaylistItem[] }): Promise<{ started: boolean }>;
  /** Stops a playNow session only — never a scheduled one or the adhan. */
  stopManual(): Promise<void>;
  /** Stops a scheduled session that is playing (never «استماع» or the adhan) and clears pending Audio Adhkar notices — the master switch turned off. */
  stopScheduled(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  /** The adhan playing now (null when none) — lib/adhanPlayback.ts. */
  getAdhanState(): Promise<{ state: NativeAdhanState | null }>;
  /** Where the adhan is within its segment of the recording (read-only). */
  getAdhanProgress(): Promise<NativePlaybackProgress>;
  /** Pause / resume / stop the adhan only — never an adhkar session. */
  pauseAdhan(): Promise<void>;
  resumeAdhan(): Promise<void>;
  stopAdhan(): Promise<void>;
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
  /** The adhan started, paused, is waiting for the audio, resumed or ended (null). */
  addListener(eventName: "adhanState", listenerFunc: (event: { state: NativeAdhanState | null }) => void): Promise<PluginListenerHandle>;
  /** A native session (adhkar, «استماع» or the adhan) began playing. */
  addListener(eventName: "sessionStarted", listenerFunc: () => void): Promise<PluginListenerHandle>;
}

export const AudioAdhkarNative = registerPlugin<AudioAdhkarPlugin>("AudioAdhkar");

/** Scheduled/background Audio Adhkar exists only in the Android app. */
export function isAudioAdhkarNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
