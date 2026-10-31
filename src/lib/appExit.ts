// Leaving the app (the Exit button, or Back on the home screen) without
// losing a schedule change on the way out.
//
// Exit is Capacitor's App.exitApp() → Activity.finish(): it closes the UI
// only — prayer notifications, the adhan and scheduled Audio Adhkar are
// AlarmManager alarms owned by the native side (prayernotifications/,
// audioadhkar/), which keep firing with the app closed and are re-armed
// after a reboot. What finish() DOES end is the WebView, and with it any
// JS→native call still in flight: a setting changed a moment before Exit
// could otherwise never reach the native scheduler. So every schedule sync
// registers here, and exiting waits for them (briefly) first.
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const pending = new Set<Promise<unknown>>();

/** Registers a JS→native schedule sync so exiting waits for it. Returns it unchanged. */
export function trackNativeSync<T>(sync: Promise<T>): Promise<T> {
  const tracked: Promise<unknown> = sync.then(
    () => undefined,
    () => undefined,
  );
  pending.add(tracked);
  void tracked.then(() => pending.delete(tracked));
  return sync;
}

/** Resolves once every sync in flight has finished — or after `timeoutMs`, so Exit never hangs. */
export async function whenNativeSyncsSettle(timeoutMs = 2000): Promise<void> {
  if (pending.size === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([Promise.all([...pending]), new Promise<void>((resolve) => (timer = setTimeout(resolve, timeoutMs)))]);
  if (timer !== undefined) clearTimeout(timer);
}

/**
 * Closes the app UI (Android) once pending schedule syncs have reached
 * native. Schedules stay armed, and whatever Audio Adhkar is playing — a
 * scheduled session or «استماع» — keeps playing in its native service
 * (stoppable from its notification).
 */
export async function exitAppSafely(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await whenNativeSyncsSettle();
  await CapacitorApp.exitApp();
}
