import { Capacitor, registerPlugin } from "@capacitor/core";

// The Qur'an reader's orientation button. It turns the SCREEN — never the
// page: in the Android app through orientation/OrientationPlugin.kt; in a
// browser through the Screen Orientation API (which browsers allow only in
// fullscreen, and not everywhere — e.g. desktop and iOS refuse). Where the
// screen can't be turned, nothing is rotated: the caller is told, and the
// reader still follows the phone if it is turned by hand.

export type ReaderOrientation = "landscape" | "portrait" | "unlocked";

interface OrientationPlugin {
  lock(options: { orientation: ReaderOrientation }): Promise<{ orientation: ReaderOrientation }>;
}

export const OrientationNative = registerPlugin<OrientationPlugin>("DitharOrientation");

export function isOrientationNativeAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

type LockableOrientation = ScreenOrientation & { lock?: (o: "landscape" | "portrait") => Promise<void> };

/** Whether this reader put the browser in fullscreen (to turn the screen), so it leaves it again. */
let enteredFullscreen = false;

async function lockInBrowser(orientation: ReaderOrientation): Promise<boolean> {
  const screenOrientation = (typeof screen !== "undefined" ? screen.orientation : undefined) as LockableOrientation | undefined;
  if (orientation === "landscape") {
    if (!screenOrientation?.lock) return false;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        enteredFullscreen = true;
      }
      await screenOrientation.lock("landscape");
      return true;
    } catch {
      await leaveFullscreen();
      return false;
    }
  }
  // Back to portrait, or handed back: release the lock and the fullscreen this reader asked for.
  try {
    screenOrientation?.unlock();
  } catch {
    // Nothing was locked.
  }
  await leaveFullscreen();
  return true;
}

async function leaveFullscreen(): Promise<void> {
  if (!enteredFullscreen) return;
  enteredFullscreen = false;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // Already left (e.g. the user pressed Back).
  }
}

/**
 * Turns the screen to `orientation` (or hands it back: "unlocked"). Resolves
 * true when the screen was turned (or released), false when this platform
 * can't turn it — nothing is rotated then.
 */
export async function lockReaderOrientation(orientation: ReaderOrientation): Promise<boolean> {
  if (isOrientationNativeAvailable()) {
    await OrientationNative.lock({ orientation });
    return true;
  }
  return lockInBrowser(orientation);
}
