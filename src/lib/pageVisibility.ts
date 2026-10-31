// Whether the app's page is in front of the user. Capacitor keeps the
// WebView's JavaScript running while DITHAR is in the background (its
// "KeepRunning" default) — and the process often stays alive then (the
// Audio Adhkar / adhan media service, Floating Tasbeeh) — so a UI clock
// ticking every second would keep re-rendering a screen nobody sees. UI
// timers pause while hidden and catch up the moment the page is shown.
//
// Hidden = document.visibilityState "hidden", or between Capacitor's
// document "pause" and "resume" events (the Activity went to the
// background / came back).
import { useSyncExternalStore } from "react";

let paused = false;
const listeners = new Set<() => void>();
let attached = false;

function notify() {
  for (const listener of [...listeners]) listener();
}

function attach() {
  if (attached || typeof document === "undefined") return;
  attached = true;
  document.addEventListener("visibilitychange", notify);
  document.addEventListener("pause", () => {
    paused = true;
    notify();
  });
  document.addEventListener("resume", () => {
    paused = false;
    notify();
  });
}

export function isPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !paused && document.visibilityState !== "hidden";
}

export function subscribePageVisibility(listener: () => void): () => void {
  attach();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribePageVisibility, isPageVisible, () => true);
}
