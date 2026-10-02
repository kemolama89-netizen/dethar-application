// DITHAR — Audio Adhkar player: connects real audio files to the playback
// state in audioAdhkarPlayback.ts (the ONE state — this module only drives
// it, it keeps none of its own besides the in-flight playback token).
//
// Scope: Morning and Evening. A dhikr is playable when it is in an enabled
// collection AND has audio per the existing Morning/Evening audio mapping
// (morningEveningAudio.ts): a non-Quran dhikr its recorded (generated)
// file; a Quranic one (with a `quranRef`) the bundled per-ayah recitation
// of the reciter picked by quranReciterSelection.ts — chosen once as the
// dhikr starts and kept for all its ayahs and repetitions. A dhikr without
// audio is simply unavailable — never substituted.
//
// Repetition: each repetition plays the dhikr's audio once — for a
// Quranic dhikr, all its ayah files as ONE continuous Web Audio stream
// (webAudioSequence.ts: decoded up front, scheduled back to back — no
// pause and no load wait between ayahs). The state
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
import type { QuranReciter } from "../data/quranReciters";
import { peekQuranReciterForPlayback, takeQuranReciterForPlayback } from "./quranReciterSelection";
import { resolveMorningEveningAudio } from "./morningEveningAudio";
import { pauseAudio, playSilence, playUrlQueue, resumeAudio, stopAudio } from "./audioEngine";
import { playAudioSequence } from "./webAudioSequence";
import type { QuranRepeatPlayback } from "./quranAudio";
import type { AudioChannel } from "./audioEngine";
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
  /** The first repetition's files. */
  urls: string[];
  /** Repetitions after the first, when they differ (a Quranic recitation's basmala plays only once). */
  repeat?: QuranRepeatPlayback;
  /** "quran" for a Quranic recitation (a reciter change stops it), else "adhkar". */
  channel: AudioChannel;
}

/**
 * The audio for this dhikr in this collection, or null when it has none
 * (yet). A Quranic dhikr resolves for `reciter` — by default the one its
 * next recitation would use, without advancing a rotation.
 */
export function getAudioAdhkarSource(
  collection: AudioAdhkarCollection,
  item: WrittenAdhkarItem,
  reciter: QuranReciter = peekQuranReciterForPlayback(),
): AudioAdhkarSource | null {
  if (!AUDIO_ENABLED_COLLECTIONS.includes(collection) || collection === "misc") return null;
  const res = resolveMorningEveningAudio(collection, item, reciter);
  if (res.status !== "ready") return null;
  const source: AudioAdhkarSource = { key: res.key, urls: res.urls, channel: res.kind === "quran" ? "quran" : "adhkar" };
  if (res.repeat) source.repeat = res.repeat;
  return source;
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
  const play = source.channel === "quran" ? playAudioSequence : playUrlQueue;
  // The repetition about to play: the first plays `urls` (with a Quranic
  // recitation's basmala); later ones play `repeat` (without it).
  const later = (getNowPlaying()?.repetition ?? 1) > 1 && source.repeat;
  play(source.channel, source.key, later ? source.repeat!.urls : source.urls, {
    startAt: later ? source.repeat!.startAt : 0,
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
  playSilence(source.channel, source.key, pauseMs, {
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
      const { channel } = current.source;
      current = null;
      stopAudio(channel);
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
  if (!getAudioAdhkarSource(collection, item)) return false;
  const total = audioRepetitionTotal(item);
  if (total === null) return false;
  // Only now, as it really starts, does a Quranic dhikr take its reciter
  // (advancing a rotation); that one source then serves every repetition.
  const source = getAudioAdhkarSource(collection, item, item.quranRef ? takeQuranReciterForPlayback() : undefined);
  if (!source) return false;
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
    const { channel } = current.source;
    current = null;
    stopAudio(channel);
  }
  audioAdhkarPlayback.stop();
}
