import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../audioadhkar/AudioAdhkarPlugin.kt — the only seam
// between the web app and native scheduled Audio Adhkar playback.

/** Playback state published by the native service (see AudioAdhkarPlaybackService#stateJson). */
export interface NativeAudioAdhkarState {
  active: boolean;
  collection: "evening";
  dhikrId: string;
  title: string;
  repetition: number;
  total: number;
  status: "playing" | "paused" | "finished";
  index: number;
  count: number;
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

export interface AudioAdhkarDiagnostics {
  events: string[];
  exactAlarms: boolean;
  notifications: boolean;
  ignoringBatteryOptimizations: boolean;
  /** UsageStatsManager standby bucket (10 active … 45 restricted), -1 when unknown. */
  standbyBucket: number;
  scheduledAt: number;
}

export interface AudioAdhkarPlugin {
  setEveningSchedule(options: {
    enabled: boolean;
    startMinutes: number;
    playlist: NativePlaylistItem[];
  }): Promise<{ scheduledAt: number | null; warningAt: number | null; exact: boolean }>;
  getPlaybackState(): Promise<{ state: NativeAudioAdhkarState | null }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  canScheduleExactAlarms(): Promise<{ granted: boolean }>;
  /** Recent native scheduler/receiver/service events ("<epochMs>|<message>") and the states that gate them. */
  getDiagnostics(): Promise<AudioAdhkarDiagnostics>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  requestPermissions(options: { permissions: "notifications"[] }): Promise<{ notifications: string }>;
  addListener(
    eventName: "playbackState",
    listenerFunc: (event: { state: NativeAudioAdhkarState | null }) => void,
  ): Promise<PluginListenerHandle>;
}

export const AudioAdhkarNative = registerPlugin<AudioAdhkarPlugin>("AudioAdhkar");

/** Scheduled/background Audio Adhkar exists only in the Android app. */
export function isAudioAdhkarNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
