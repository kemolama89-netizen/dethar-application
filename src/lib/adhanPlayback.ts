// The adhan playing now, as the Android background player reports it
// (AudioAdhkarPlaybackService "adhanState") — shown by the Home screen
// player (components/HomeAudioPlayer.tsx) in the same now-playing panel as
// a dhikr: «الأذان», the muezzin when known, real progress and time.
//
// Kept apart from the Audio Adhkar playback state (lib/audioAdhkarPlayback.ts)
// on purpose: the adhan isn't a dhikr, and nothing that reads adhkar state
// (counts, the lists' players, "last played") may ever see it. The two are
// never both active — the native player plays one session at a time.
//
// The controls act on the adhan only (pauseAdhan/resumeAdhan/stopAdhan
// natively), so a tap can never stop or restart an adhkar session, and
// nothing here ever STARTS an adhan: it only follows the scheduled one.
import { useSyncExternalStore } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativeAdhanState } from "./audioAdhkarNative";

export type AdhanNowPlaying = Pick<NativeAdhanState, "status" | "title" | "voice" | "muezzin">;

let state: AdhanNowPlaying | null = null;
const listeners = new Set<() => void>();

function set(next: AdhanNowPlaying | null) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getAdhanNowPlaying(): AdhanNowPlaying | null {
  return state;
}

export function subscribeAdhanPlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdhanPlayback(): AdhanNowPlaying | null {
  return useSyncExternalStore(subscribeAdhanPlayback, getAdhanNowPlaying, getAdhanNowPlaying);
}

const STATUSES = new Set(["playing", "paused", "waiting"]);

/** Applies a state the native player reported (null, inactive or malformed = no adhan). */
export function applyNativeAdhanState(next: NativeAdhanState | null | undefined): void {
  if (!next || !next.active || !STATUSES.has(next.status)) return set(null);
  set({ status: next.status, title: next.title ?? "", voice: next.voice ?? "", muezzin: next.muezzin ?? "" });
}

async function refresh() {
  const { state: native } = await AudioAdhkarNative.getAdhanState();
  applyNativeAdhanState(native);
}

/** Follows the native adhan: live events, plus a catch-up now and on every return to the app. No-op off Android. */
export function startAdhanPlaybackSync(): { refresh: () => void; stop: () => void } {
  if (!isAudioAdhkarNativeAvailable()) return { refresh: () => {}, stop: () => {} };
  const handle: Promise<PluginListenerHandle> = AudioAdhkarNative.addListener("adhanState", ({ state: native }) => applyNativeAdhanState(native));
  const catchUp = () => void refresh().catch(() => {});
  catchUp();
  return { refresh: catchUp, stop: () => void handle.then((h) => h.remove()) };
}

const ignore = () => {};

export function pauseAdhan(): void {
  if (state?.status !== "playing") return;
  set({ ...state, status: "paused" });
  AudioAdhkarNative.pauseAdhan().catch(ignore);
}

/** Resumes a paused adhan, or one waiting for the audio (the user's tap takes the audio back for it). */
export function resumeAdhan(): void {
  if (state?.status !== "paused" && state?.status !== "waiting") return;
  set({ ...state, status: "playing" });
  AudioAdhkarNative.resumeAdhan().catch(ignore);
}

export function stopAdhan(): void {
  if (!state) return;
  set(null);
  AudioAdhkarNative.stopAdhan().catch(ignore);
}

/** Tests only. */
export function resetAdhanPlaybackForTesting(): void {
  state = null;
  listeners.clear();
}
