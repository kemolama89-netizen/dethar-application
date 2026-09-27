// DITHAR — Audio Adhkar player: connects real audio files to the playback
// state in audioAdhkarPlayback.ts (the ONE state — this module only drives
// it, it keeps none of its own besides the in-flight playback token).
//
// Scope: Morning and Evening. A dhikr is playable when it is in an enabled
// collection AND has a recorded (generated) file per the existing
// Morning/Evening audio mapping (morningEveningAudio.ts). Quranic items
// are never played here (the Quran reciter path comes later), and a dhikr
// without its own recording is simply unavailable — never substituted.
//
// Repetition: each repetition plays the dhikr's file once. The state
// advances ONLY from the audio engine's `onEnded` for that exact playback,
// and each playback's `onEnded` can count at most once (see `playOnce`).
// Renders, navigation, loading/progress events and pause/resume never
// advance it. Between two repetitions of the same dhikr — any dhikr — the
// player waits REPETITION_PAUSE_MS (see pauseBeforeNextRepetition); after
// the final repetition it doesn't wait.
//
// Scheduled (background) Evening playback is played by the Android
// service instead (android/.../audioadhkar/); its reported state is
// mirrored into the same playback state (applyNativePlaybackState), and
// while it is active the Play/Pause/Resume here control it, so only one
// Evening session ever plays.
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { getDefaultQuranReciter } from "../data/quranReciters";
import { resolveMorningEveningAudio } from "./morningEveningAudio";
import { pauseAudio, playSilence, playUrlQueue, resumeAudio, stopAudio } from "./audioEngine";
import { audioAdhkarPlayback, getNowPlaying, pauseBeforeNextRepetition } from "./audioAdhkarPlayback";
import { AudioAdhkarNative } from "./audioAdhkarNative";
import type { NativeAudioAdhkarState } from "./audioAdhkarNative";
import type { AudioAdhkarCollection } from "./audioAdhkarPlayback";
import { getUserRepeatCount } from "./audioUserRepeat";

/**
 * How many times the audio plays a Morning/Evening dhikr — its existing
 * written repetition count. A dhikr with no fixed count (unboundedCount)
 * plays the count the user chose for it (audioUserRepeat.ts); null until
 * they choose, and then it does not play.
 */
export function audioRepetitionTotal(item: WrittenAdhkarItem): number | null {
  return item.unboundedCount ? getUserRepeatCount(item.id) : (item.repeat ?? 1);
}

/** Collections whose recordings are connected. Various comes later. */
export const AUDIO_ENABLED_COLLECTIONS: readonly AudioAdhkarCollection[] = ["morning", "evening"];

export interface AudioAdhkarSource {
  key: string;
  urls: string[];
}

/** The recording for this dhikr in this collection, or null when it has none (yet). */
export function getAudioAdhkarSource(collection: AudioAdhkarCollection, item: WrittenAdhkarItem): AudioAdhkarSource | null {
  if (!AUDIO_ENABLED_COLLECTIONS.includes(collection) || collection === "misc") return null;
  if (item.quranRef) return null;
  const res = resolveMorningEveningAudio(collection, item, getDefaultQuranReciter());
  return res.status === "ready" && res.kind === "generated" ? { key: res.key, urls: res.urls } : null;
}

interface Current {
  source: AudioAdhkarSource;
  /** Identifies the one playback whose end may advance the repetition. */
  token: number;
}

let current: Current | null = null;
let nextToken = 0;

function playOnce(source: AudioAdhkarSource) {
  const token = ++nextToken;
  current = { source, token };
  const isCurrent = () => current?.token === token;
  playUrlQueue("adhkar", source.key, source.urls, {
    onEnded: () => {
      if (!isCurrent()) return;
      // Consume this playback's token first: a duplicate/late "ended" for
      // the same playback now fails isCurrent() and can't advance again.
      current = { source, token: -1 };
      const pauseMs = pauseBeforeNextRepetition(getNowPlaying());
      if (pauseMs > 0) {
        pauseThenPlay(source, pauseMs);
      } else {
        current = null;
        audioAdhkarPlayback.repetitionEnded(); // the final one → "finished"
      }
    },
    onError: () => {
      if (!isCurrent()) return;
      current = null;
      audioAdhkarPlayback.stop();
    },
    onInterrupted: () => {
      if (!isCurrent()) return;
      current = null;
      audioAdhkarPlayback.stop();
    },
  });
}

/**
 * The silence between repetitions: holds the audio (pausable,
 * interruptible), then advances to the next repetition as it starts.
 */
function pauseThenPlay(source: AudioAdhkarSource, pauseMs: number) {
  const token = ++nextToken;
  current = { source, token };
  const isCurrent = () => current?.token === token;
  playSilence("adhkar", source.key, pauseMs, {
    onEnded: () => {
      if (!isCurrent()) return;
      audioAdhkarPlayback.repetitionEnded();
      playOnce(source);
    },
    onInterrupted: () => {
      if (!isCurrent()) return;
      current = null;
      audioAdhkarPlayback.stop();
    },
  });
}

/** True while the Android background player owns the playback state. */
let nativeActive = false;

const ignore = () => {};

/** Applies a state reported by the Android background player (null = its session ended). */
export function applyNativePlaybackState(state: NativeAudioAdhkarState | null): void {
  if (state?.active) {
    if (current) {
      // In-app playback yields to the scheduled session.
      current = null;
      stopAudio("adhkar");
    }
    nativeActive = true;
    audioAdhkarPlayback.mirror({
      collection: state.collection,
      itemId: state.dhikrId,
      repetition: state.repetition,
      total: state.total,
      status: state.status,
    });
    return;
  }
  if (!nativeActive) return;
  nativeActive = false;
  if (state?.status === "finished") {
    audioAdhkarPlayback.mirror({ collection: state.collection, itemId: state.dhikrId, repetition: state.repetition, total: state.total, status: "finished" });
  } else {
    audioAdhkarPlayback.stop();
  }
}

/**
 * Starts this dhikr from repetition 1. False (nothing plays, state
 * untouched) when it has no recording, or no count has been chosen for a
 * dhikr without a fixed one.
 */
export function startAudioAdhkar(collection: AudioAdhkarCollection, item: WrittenAdhkarItem): boolean {
  const source = getAudioAdhkarSource(collection, item);
  if (!source) return false;
  const total = audioRepetitionTotal(item);
  if (total === null) return false;
  if (nativeActive) {
    // Only one session: an in-app start ends the scheduled one.
    nativeActive = false;
    AudioAdhkarNative.stop().catch(ignore);
  }
  audioAdhkarPlayback.startDhikr({ collection, itemId: item.id }, total);
  playOnce(source);
  return true;
}

export function pauseAudioAdhkar(): void {
  if (getNowPlaying()?.status !== "playing") return;
  if (nativeActive) {
    audioAdhkarPlayback.pause();
    AudioAdhkarNative.pause().catch(ignore);
    return;
  }
  if (!current) return;
  pauseAudio(current.source.key);
  audioAdhkarPlayback.pause();
}

/** Continues the same repetition. If the audio was lost meanwhile, that repetition replays from its start. */
export function resumeAudioAdhkar(): void {
  if (getNowPlaying()?.status !== "paused") return;
  if (nativeActive) {
    audioAdhkarPlayback.resume();
    AudioAdhkarNative.resume().catch(ignore);
    return;
  }
  if (!current) return;
  audioAdhkarPlayback.resume();
  if (!resumeAudio(current.source.key)) playOnce(current.source);
}

/** Stops IN-APP playback (e.g. leaving the list). A scheduled background session keeps playing. */
export function stopAudioAdhkar(): void {
  if (nativeActive) return;
  if (current) {
    current = null;
    stopAudio("adhkar");
  }
  audioAdhkarPlayback.stop();
}
