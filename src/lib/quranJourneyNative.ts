import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../journey/QuranJourneyPlugin.kt — the Qur'an Journey's daily notification.

/** What a tapped Journey notification carried: the assignment it invited to. */
export interface JourneyOpen {
  /** Null when the app wasn't opened from one. */
  page: number | null;
  round?: number;
  /** "surah:ayah". */
  insight?: string;
  /** The first day the notice applied to, "YYYY-MM-DD". */
  fromDate?: string;
}

export interface JourneyNotice {
  /** The first local day it may be posted on, "YYYY-MM-DD"; posted again each later day until replaced. */
  fromDate: string;
  page: number;
  round: number;
  insight: string;
  /** Already in the interface language. */
  title: string;
  body: string;
}

export interface QuranJourneyPlugin {
  /** Saves the setting and the notice (absent: nothing to post), re-arms the alarm. A notice for a later day takes today's notification down. */
  setJourneyNotice(options: { enabled: boolean; minutes: number; language: "ar" | "en"; notice?: JourneyNotice }): Promise<{ nextAt: number | null }>;
  getStatus(): Promise<{ notifications: boolean; exact: boolean; nextAt: number | null }>;
  openNotificationSettings(): Promise<void>;
  /** The notification the app was launched from (cold start), once. */
  consumeLaunchJourney(): Promise<JourneyOpen>;
  /** The tapped notification's insight has painted: native removes its cover. */
  journeyViewShown(): Promise<void>;
  requestPermissions(options: { permissions: "notifications"[] }): Promise<{ notifications: string }>;
  checkPermissions(): Promise<{ notifications: string }>;
  addListener(eventName: "openJourney", listener: (event: JourneyOpen) => void): Promise<PluginListenerHandle>;
}

export const QuranJourneyNative = registerPlugin<QuranJourneyPlugin>("DitharJourney");

/** The notification exists only in the Android app. */
export function isJourneyNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
