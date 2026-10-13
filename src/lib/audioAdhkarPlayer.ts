// DITHAR — Audio Adhkar player: connects real audio files to the playback
// state in audioAdhkarPlayback.ts (the ONE state — this module only drives
// it, it keeps none of its own besides the in-flight playback token).
//
// Scope: Morning, Evening and Various. A Various dhikr plays its own
// recording (audio-adhkar.ts) once per Listen. A Morning/Evening dhikr is
// playable when it is in an enabled collection AND has audio per the
// existing Morning/Evening audio mapping
// (morningEveningAudio.ts): a non-Quran dhikr its recorded (generated)
// file; a Quranic one (with a `quranRef`) the bundled per-ayah recitation
// of the reciter chosen for its section in Audio Adhkar settings (a
// specific one, or a random one per dhikr) — chosen once as the dhikr
// starts and kept for all its ayahs and repetitions. A dhikr without
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
// On Android every Audio Adhkar playback is played by the native media
// foreground service (android/.../audioadhkar/AudioAdhkarPlaybackService):
// the scheduled sessions, and «استماع» here too (playNow) — so it keeps
// playing with the screen off, with no JS timer, WebView audio or React
// involved once it started. Native counts its completed repetitions
// (drained into the counters by audioAdhkarSchedules.ts), so nothing is
// counted here for it. Its reported state is mirrored into the same
// playback state (applyNativePlaybackState), and while it is active the
// Play/Pause/Resume here control it, so only one session ever plays. The
// web build keeps the in-app player below.
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import type { AudioVariousItem } from "../data/audio-adhkar";
import type { QuranReciter } from "../data/quranReciters";
import { peekQuranReciterForPlayback } from "./quranReciterSelection";
import { resolveMorningEveningAudio } from "./morningEveningAudio";
import { pauseAudio, playSilence, playUrlQueue, resumeAudio, stopAudio } from "./audioEngine";
import { playAudioSequence } from "./webAudioSequence";
import type { QuranRepeatPlayback } from "./quranAudio";
import type { AudioChannel } from "./audioEngine";
import { audioAdhkarPlayback, getNowPlaying, pauseBeforeNextRepetition } from "./audioAdhkarPlayback";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativeAudioAdhkarState, NativePlaylistItem } from "./audioAdhkarNative";
import { nativeVariousItem, nativeWrittenItem } from "./audioAdhkarNativeItems";
import type { AudioAdhkarCollection } from "./audioAdhkarPlayback";
import { getUserRepeatCount } from "./audioUserRepeat";
import { commitInAppCompletion } from "./audioAdhkarCounts";
import { peekSectionReciter, takeSectionReciter } from "./audioAdhkarScheduleSettings";
import { buildAdhanWindows, nextAdhanPauseStart } from "./adhanSuppression";
import { loadLanguagePreference } from "./appearancePreferences";
import { volumeGain } from "./audioVolumeSettings";

/**
 * How many times the audio plays a Morning/Evening dhikr — its existing
 * written repetition count. A dhikr with no fixed count (unboundedCount)
 * plays the count the user chose for it earlier (audioUserRepeat.ts), else
 * once — Audio Adhkar shows no counter and asks for none.
 */
export function audioRepetitionTotal(item: WrittenAdhkarItem): number {
  return item.unboundedCount ? (getUserRepeatCount(item.id) ?? 1) : (item.repeat ?? 1);
}

/** The reciter this section's next Quranic dhikr will use (Audio Adhkar settings); Various has no Quranic dhikr. */
function sectionReciterFor(collection: AudioAdhkarCollection): QuranReciter {
  return collection === "misc" ? peekQuranReciterForPlayback() : peekSectionReciter(collection);
}

/** Morning/Evening: collections whose recordings are connected (Various has its own, below). */
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
  reciter: QuranReciter = sectionReciterFor(collection),
): AudioAdhkarSource | null {
  if (!AUDIO_ENABLED_COLLECTIONS.includes(collection) || collection === "misc") return null;
  const res = resolveMorningEveningAudio(collection, item, reciter);
  if (res.status !== "ready") return null;
  const source: AudioAdhkarSource = { key: res.key, urls: res.urls, channel: res.kind === "quran" ? "quran" : "adhkar" };
  if (res.repeat) source.repeat = res.repeat;
  return source;
}

/** A Various dhikr's recording, or null when it has none. */
export function getAudioVariousSource(item: AudioVariousItem): AudioAdhkarSource | null {
  if (!item.audio) return null;
  return { key: `misc:${item.id}`, urls: [`${import.meta.env.BASE_URL}${encodeURI(item.audio)}`], channel: "adhkar" };
}

interface Current {
  source: AudioAdhkarSource;
  /** Identifies the one playback whose end may advance the repetition. */
  token: number;
}

let current: Current | null = null;
let nextToken = 0;

// In-app playback stops when an adhan pause begins: one timer, armed only
// while something plays, for the next adhan time (no polling).
let adhanStopTimer: ReturnType<typeof setTimeout> | null = null;

function clearAdhanStop() {
  if (adhanStopTimer !== null) clearTimeout(adhanStopTimer);
  adhanStopTimer = null;
}

function armAdhanStop() {
  clearAdhanStop();
  let at: number | null = null;
  try {
    at = nextAdhanPauseStart(Date.now(), buildAdhanWindows(new Date(), undefined, 1));
  } catch {
    return;
  }
  if (at === null) return;
  // setTimeout's limit is ~24.8 days; the next adhan is always far sooner.
  adhanStopTimer = setTimeout(() => {
    adhanStopTimer = null;
    stopAudioAdhkar();
  }, at - Date.now());
}

function playOnce(source: AudioAdhkarSource) {
  const token = ++nextToken;
  current = { source, token };
  const isCurrent = () => current?.token === token;
  const play = source.channel === "quran" ? playAudioSequence : playUrlQueue;
  // The repetition about to play: the first plays `urls` (with a Quranic
  // recitation's basmala); later ones play `repeat` (without it).
  const later = (getNowPlaying()?.repetition ?? 1) > 1 && source.repeat;
  const collection = getNowPlaying()?.collection;
  play(source.channel, source.key, later ? source.repeat!.urls : source.urls, {
    startAt: later ? source.repeat!.startAt : 0,
    // This category's own volume (Settings → إعدادات الصوت).
    ...(collection ? { volume: volumeGain(collection) } : {}),
    onEnded: () => {
      if (!isCurrent()) return;
      // Consume this playback's token first: a duplicate/late "ended" for
      // the same playback now fails isCurrent() and can't advance again.
      current = { source, token: -1 };
      // This repetition was heard to its end — the only moment one counts
      // (an error or interruption takes the branches below instead).
      const heard = getNowPlaying();
      if (heard) commitInAppCompletion(heard.collection, heard.itemId);
      const pauseMs = pauseBeforeNextRepetition(getNowPlaying());
      if (pauseMs > 0) {
        pauseThenPlay(source, pauseMs);
      } else {
        current = null;
        clearAdhanStop();
        audioAdhkarPlayback.repetitionEnded(); // the final one → "finished"
      }
    },
    onError: () => {
      if (!isCurrent()) return;
      current = null;
      clearAdhanStop();
      audioAdhkarPlayback.stop();
    },
    onInterrupted: () => {
      if (!isCurrent()) return;
      current = null;
      clearAdhanStop();
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
      clearAdhanStop();
      audioAdhkarPlayback.stop();
    },
  });
}

/** True while the Android background player owns the playback state. */
let nativeActive = false;
/** …and its session is a «استماع» one (playNow). */
let nativeManual = false;
/** The latest playNow request: a late refusal of an older one changes nothing. */
let nativeRequest = 0;

const ignore = () => {};

/** Android: records a playback decision in the native background-playback trace (Settings → diagnostics). */
function trace(message: string) {
  if (isAudioAdhkarNativeAvailable()) AudioAdhkarNative.log({ message }).catch(ignore);
}

/** Applies a state reported by the Android background player (null = its session ended). */
export function applyNativePlaybackState(state: NativeAudioAdhkarState | null): void {
  if (state?.active) {
    if (current) {
      // In-app playback yields to the scheduled session.
      const { channel } = current.source;
      current = null;
      clearAdhanStop();
      stopAudio(channel);
    }
    nativeActive = true;
    nativeManual = state.manual === true;
    audioAdhkarPlayback.mirror({
      collection: state.collection,
      itemId: state.dhikrId,
      repetition: state.repetition,
      total: state.total,
      status: state.status,
      // Who native is playing now (it changes with each recitation in random rotation).
      ...(state.reciter ? { reciter: state.reciter } : {}),
    });
    return;
  }
  if (!nativeActive) return;
  nativeActive = false;
  nativeManual = false;
  if (state?.status === "finished") {
    audioAdhkarPlayback.mirror({ collection: state.collection, itemId: state.dhikrId, repetition: state.repetition, total: state.total, status: "finished" });
  } else {
    audioAdhkarPlayback.stop();
  }
}

/**
 * Android: hands this dhikr to the native player (see the top comment) and
 * shows it playing at once; the service's own state follows. If Android
 * refuses (the adhan is playing), the state goes back to idle.
 */
function startNative(collection: AudioAdhkarCollection, itemId: string, total: number, item: NativePlaylistItem): boolean {
  if (current) {
    const { channel } = current.source;
    current = null;
    stopAudio(channel);
  }
  clearAdhanStop(); // native stops it at the adhan itself
  nativeActive = true;
  nativeManual = true;
  const request = ++nativeRequest;
  audioAdhkarPlayback.startDhikr({ collection, itemId }, total, item.reciterName || undefined);
  const refused = () => {
    if (request !== nativeRequest || !nativeManual) return;
    nativeActive = false;
    nativeManual = false;
    audioAdhkarPlayback.stop();
  };
  trace(`listen: native playNow ${collection}/${itemId} ×${total} (${item.assetPaths.length} file(s))`);
  AudioAdhkarNative.playNow({ collection, item }).then(
    ({ started }) => {
      if (!started) {
        trace(`listen: native refused ${collection}/${itemId}`);
        refused();
      }
    },
    (error: unknown) => {
      trace(`listen: playNow failed ${collection}/${itemId}: ${String(error)}`);
      refused();
    },
  );
  return true;
}

/**
 * Starts this dhikr from repetition 1. False (nothing plays, state
 * untouched) when it has no recording.
 */
export function startAudioAdhkar(collection: AudioAdhkarCollection, item: WrittenAdhkarItem): boolean {
  if (!getAudioAdhkarSource(collection, item)) return false;
  const total = audioRepetitionTotal(item);
  // Only now, as it really starts, does a Quranic dhikr take its reciter
  // (in random mode, using up the drawn one); that one source then serves
  // every repetition.
  const quranic = item.quranRef && collection !== "misc";
  const reciter = quranic ? takeSectionReciter(collection) : undefined;
  const source = getAudioAdhkarSource(collection, item, reciter);
  if (!source) return false;
  if (isAudioAdhkarNativeAvailable() && collection !== "misc") {
    const native = nativeWrittenItem(collection, item, reciter ?? peekSectionReciter(collection), total);
    if (native) return startNative(collection, item.id, total, native);
    trace(`listen: no bundled audio for ${collection}/${item.id} — playing in the WebView (stops in the background)`);
  }
  if (nativeActive) {
    // Only one session: an in-app start ends the scheduled one.
    nativeActive = false;
    AudioAdhkarNative.stop().catch(ignore);
  }
  audioAdhkarPlayback.startDhikr({ collection, itemId: item.id }, total, reciter ? reciter.name[loadLanguagePreference()] : undefined);
  playOnce(source);
  armAdhanStop();
  return true;
}

/** Plays a Various dhikr's recording once. False (nothing plays) when it has none. */
export function startAudioVarious(item: AudioVariousItem): boolean {
  const source = getAudioVariousSource(item);
  if (!source) return false;
  if (isAudioAdhkarNativeAvailable()) {
    const native = nativeVariousItem(item);
    if (native) return startNative("misc", item.id, 1, native);
    trace(`listen: no bundled audio for misc/${item.id} — playing in the WebView (stops in the background)`);
  }
  if (nativeActive) {
    nativeActive = false;
    AudioAdhkarNative.stop().catch(ignore);
  }
  audioAdhkarPlayback.startDhikr({ collection: "misc", itemId: item.id }, 1);
  playOnce(source);
  armAdhanStop();
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

/**
 * Stops in-app (WebView) playback when leaving the Audio Adhkar list. On
 * Android, whatever the native service plays — «استماع» or a scheduled
 * session — keeps playing: leaving the list is also the only way to reach
 * Exit (Home screen only), so stopping it here would end it on Exit too.
 * It is stopped from its notification, or Pause in the app.
 */
export function stopAudioAdhkar(): void {
  clearAdhanStop();
  if (nativeActive) {
    if (nativeManual) trace("listen: left the Audio Adhkar list — native playback continues");
    return;
  }
  if (current) {
    const { channel } = current.source;
    current = null;
    stopAudio(channel);
  }
  audioAdhkarPlayback.stop();
}
