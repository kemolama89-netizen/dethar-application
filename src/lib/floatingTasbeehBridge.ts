import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../floatingtasbeeh/FloatingTasbeehPlugin.kt's return
// shapes exactly — see that file for what each native method actually
// does. This is the ONLY seam between the web app and the native Floating
// Tasbeeh layer; nothing else in src/ talks to Capacitor plugin internals
// for this feature.
export interface FloatingTasbeehPendingEvent {
  dhikrId: number;
  times: number;
  ts: number;
  localDate: string;
  localTime: string;
  timeZone: string;
}

export interface FloatingTasbeehPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  isOverlayPermissionGranted(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<{ granted: boolean }>;
  isEnabled(): Promise<{ enabled: boolean }>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  // Pushes an updated live count for ONE dhikr (a manual tap or a
  // single-dhikr Reset — see tasbeehCommit.ts and TasbeehScreen.tsx's
  // handleReset) into the SAME mirror a floating tap itself writes, and
  // refreshes the bubble immediately if it's currently showing that dhikr.
  syncLiveCount(options: { dhikrId: number; count: number }): Promise<void>;
  // Zeroes the live-count mirror for EVERY dhikr — called only from
  // TasbeehScreen's "Reset All" (see handleResetAll), which zeroes every
  // counter at once rather than one at a time.
  resetAllLiveCounts(): Promise<void>;
  getSelectedDhikr(): Promise<{ dhikrId: number }>;
  setSelectedDhikr(options: { dhikrId: number }): Promise<void>;
  // `readyDurationMs` is the SAME per-dhikr calm-counting pacing duration
  // computeTasbeehReadyDurationMs (tasbeehTiming.ts) computes for the main
  // Tasbeeh screen — pushed here so the floating bubble's own pacing gate
  // uses the identical duration, never a native re-derivation of it.
  setDhikrList(options: { items: { id: number; label: string; readyDurationMs: number }[] }): Promise<void>;
  getPendingEvents(): Promise<{ events: FloatingTasbeehPendingEvent[] }>;
  confirmPendingEventsDrained(options: { count: number }): Promise<void>;
  // Fired from native the instant a floating tap is accepted (see
  // FloatingTasbeehService#notifyPendingEventsChanged), so
  // reconcileFloatingTasbeeh can run immediately — event-driven, never
  // polled — instead of waiting for the next app-foreground reconciliation.
  addListener(eventName: "pendingEventsChanged", listenerFunc: () => void): Promise<PluginListenerHandle>;
}

export const FloatingTasbeeh = registerPlugin<FloatingTasbeehPlugin>("FloatingTasbeeh");

// Only Android has a native Floating Tasbeeh implementation so far (Phase
// 2). iOS and the plain web/browser build (including this app's own dev
// server and its GitHub Pages deployment) have no such bridge — every
// caller should guard on this before calling into FloatingTasbeeh, rather
// than letting an unimplemented-plugin-method call reject. Lives here
// (not floatingTasbeehSync.ts, which used to own it) so tasbeehCommit.ts
// can also import it without a circular dependency — floatingTasbeehSync.ts
// itself already imports FROM tasbeehCommit.ts. Re-exported from
// floatingTasbeehSync.ts for every existing caller of that path.
export function isFloatingTasbeehAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
