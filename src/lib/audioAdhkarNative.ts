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

export interface NativePlaylistItem {
  dhikrId: string;
  title: string;
  text: string;
  /** Path inside the APK assets, e.g. "public/audio/adhkar/evening/morning_003.mp3". */
  assetPath: string;
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
