import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Keeps the screen from turning off while the Qur'an reader is open, and
// gives the phone its normal screen timeout back when the reader closes.
//  - Android app: the window's FLAG_KEEP_SCREEN_ON (screen/ScreenAwakePlugin.kt)
//    — it only holds while DITHAR is on screen and needs no permission.
//  - Browser: the Screen Wake Lock API, where it exists. The browser drops
//    that lock whenever the page is hidden, so it is asked for again when the
//    page is shown while the reader is still open.
// Several holders may overlap (e.g. a remount): the screen stays awake while
// any of them is active. Nothing is ever thrown: where neither is available
// the screen simply follows the phone's own timeout.

interface ScreenAwakePlugin {
  setKeepAwake(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
}

const ScreenAwakeNative = registerPlugin<ScreenAwakePlugin>("DitharScreenAwake");

function nativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
}
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> } };

let holders = 0;
let sentinel: WakeLockSentinelLike | null = null;
let requesting = false;

async function requestWebLock(): Promise<void> {
  const wakeLock = typeof navigator !== "undefined" ? (navigator as WakeLockNavigator).wakeLock : undefined;
  if (!wakeLock || requesting || (sentinel && !sentinel.released)) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  requesting = true;
  try {
    const lock = await wakeLock.request("screen");
    // Released while the request was on its way: let it go at once.
    if (holders === 0) void lock.release().catch(() => {});
    else sentinel = lock;
  } catch {
    // Refused (e.g. battery saver) — the screen follows its normal timeout.
  } finally {
    requesting = false;
  }
}

function onVisibility(): void {
  if (holders > 0 && document.visibilityState === "visible") void requestWebLock();
}

function apply(enabled: boolean): void {
  if (nativeAvailable()) {
    void ScreenAwakeNative.setKeepAwake({ enabled }).catch(() => {});
    return;
  }
  if (enabled) {
    void requestWebLock();
    document.addEventListener("visibilitychange", onVisibility);
  } else {
    document.removeEventListener("visibilitychange", onVisibility);
    const lock = sentinel;
    sentinel = null;
    if (lock && !lock.released) void lock.release().catch(() => {});
  }
}

/** Starts keeping the screen awake; the returned function stops (once). */
export function holdScreenAwake(): () => void {
  holders += 1;
  if (holders === 1) apply(true);
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders = Math.max(0, holders - 1);
    if (holders === 0) apply(false);
  };
}

/** Keeps the screen awake while the calling component is mounted and `active`. */
export function useKeepScreenAwake(active = true): void {
  useEffect(() => (active ? holdScreenAwake() : undefined), [active]);
}

/** Tests only. */
export function screenAwakeHoldersForTesting(): number {
  return holders;
}
