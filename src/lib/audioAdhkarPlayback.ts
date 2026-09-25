// DITHAR — Audio Adhkar playback STATE (no audio here).
//
// The one source of truth for "what is playing, and which repetition of
// it". The Audio Adhkar screen only READS it (the repetition circle is a
// status indicator — never a counter the user taps). Only the player
// (lib/audioAdhkarPlayer.ts) WRITES it, through the actions below:
//
//   startDhikr(ref, total)  a dhikr's first repetition begins
//   repetitionEnded()       one full playback finished → next repetition,
//                           or "finished" after the last one (the engine
//                           then moves on and calls startDhikr again)
//   pause() / resume()      from in-app or system media controls
//   stop()                  back to idle
//   mirror(state)           where the Android background player is
//
// Scheduled Evening playback runs natively (android/.../audioadhkar/: an
// exact alarm, a media-playback foreground service, a MediaSession for the
// phone's system media controls). That native player counts repetitions by
// the same rules and reports its state, which lib/audioAdhkarPlayer.ts
// mirrors here — so the Audio Adhkar screen shows scheduled playback
// exactly like in-app playback, from this one state.
import { useSyncExternalStore } from "react";

/** Which Audio Adhkar list a dhikr is being played from — ids repeat across Morning/Evening. */
export type AudioAdhkarCollection = "morning" | "evening" | "misc";

export interface AudioAdhkarRef {
  collection: AudioAdhkarCollection;
  itemId: string;
}

export interface AudioAdhkarNowPlaying extends AudioAdhkarRef {
  /** 1-based: the repetition currently being played. */
  repetition: number;
  /** Total repetitions, or null when the dhikr has no fixed count. */
  total: number | null;
  status: "playing" | "paused" | "finished";
}

export type AudioAdhkarPlaybackState = AudioAdhkarNowPlaying | null;

// ---------------------------------------------------------------------
// Pure transitions
// ---------------------------------------------------------------------

export function startedState(ref: AudioAdhkarRef, total: number | null): AudioAdhkarNowPlaying {
  return { collection: ref.collection, itemId: ref.itemId, repetition: 1, total, status: "playing" };
}

export function afterRepetitionEnded(state: AudioAdhkarPlaybackState): AudioAdhkarPlaybackState {
  if (!state || state.status === "finished") return state;
  if (state.total !== null && state.repetition >= state.total) return { ...state, status: "finished" };
  return { ...state, repetition: state.repetition + 1 };
}

function withStatus(state: AudioAdhkarPlaybackState, from: "playing" | "paused", to: "playing" | "paused"): AudioAdhkarPlaybackState {
  return state && state.status === from ? { ...state, status: to } : state;
}

// ---------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------

let state: AudioAdhkarPlaybackState = null;
const listeners = new Set<() => void>();

function set(next: AudioAdhkarPlaybackState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getNowPlaying(): AudioAdhkarPlaybackState {
  return state;
}

export function subscribeAudioAdhkarPlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const audioAdhkarPlayback = {
  startDhikr: (ref: AudioAdhkarRef, total: number | null) => set(startedState(ref, total)),
  repetitionEnded: () => set(afterRepetitionEnded(state)),
  pause: () => set(withStatus(state, "playing", "paused")),
  resume: () => set(withStatus(state, "paused", "playing")),
  stop: () => set(null),
  mirror: (next: AudioAdhkarPlaybackState) => set(next),
};

export function useAudioAdhkarPlayback(): AudioAdhkarPlaybackState {
  return useSyncExternalStore(subscribeAudioAdhkarPlayback, getNowPlaying, getNowPlaying);
}

/** This dhikr's live playback state, or null when something else (or nothing) is playing. */
export function playbackFor(playback: AudioAdhkarPlaybackState, ref: AudioAdhkarRef): AudioAdhkarNowPlaying | null {
  return playback && playback.collection === ref.collection && playback.itemId === ref.itemId ? playback : null;
}
