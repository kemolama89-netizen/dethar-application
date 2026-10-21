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
//
// Play All («تشغيل الكل», startAudioAdhkarPlayAll): a section's recorded
// adhkar one after another from one tap, each its repetitions, with the
// same silence between two adhkar as between repetitions. On Android it is
// ONE manual native session over the whole list (the service walks it, also
// with the screen off); the service reports its place (index/count), so the
// list shows it again after leaving and re-entering, or reopening the app.
// In the web build the in-app player plays the list in turn (and, like any
// in-app playback, stops when the list is left). It is manual playback: it
// plays whenever started, before or after the section's scheduled time.
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import type { AudioVariousItem } from "../data/audio-adhkar";
import type { QuranReciter } from "../data/quranReciters";
import { peekQuranReciterForPlayback } from "./quranReciterSelection";
import { resolveMorningEveningAudio } from "./morningEveningAudio";
import { getPlaybackProgress, pauseAudio, playSilence, playUrlQueue, resumeAudio, setAudioVolume, stopAudio, takeStoppedProgress } from "./audioEngine";
import { playAudioSequence } from "./webAudioSequence";
import type { QuranRepeatPlayback } from "./quranAudio";
import type { AudioChannel } from "./audioEngine";
import { audioAdhkarPlayback, getNowPlaying, pauseBeforeNextRepetition, REPETITION_PAUSE_MS } from "./audioAdhkarPlayback";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativeAudioAdhkarState, NativePlaylistItem } from "./audioAdhkarNative";
import { nativeVariousItem, nativeWrittenItem } from "./audioAdhkarNativeItems";
import { getSpokenText } from "./morningEveningAudio";
import type { AudioAdhkarCollection } from "./audioAdhkarPlayback";
import { getUserRepeatCount } from "./audioUserRepeat";
import { commitInAppCompletion, commitInAppListening } from "./audioAdhkarCounts";
import { peekSectionReciter, takeSectionReciter } from "./audioAdhkarScheduleSettings";
import { buildAdhanWindows, nextAdhanPauseStart } from "./adhanSuppression";
import { loadLanguagePreference } from "./appearancePreferences";
import { subscribeAudioVolumes, volumeGain } from "./audioVolumeSettings";
import { rememberLastPlayed } from "./lastPlayedDhikr";
import { playableAudioPath } from "./audioAssets";

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
  return { key: `misc:${item.id}`, urls: [`${import.meta.env.BASE_URL}${encodeURI(playableAudioPath(item.audio))}`], channel: "adhkar" };
}

interface Current {
  source: AudioAdhkarSource;
  /** Identifies the one playback whose end may advance the repetition. */
  token: number;
  /**
   * A repetition's audio playing (not the silence between repetitions) that
   * hasn't ended or been accounted for yet: if it is abandoned, how far it
   * got is recorded as listening (settleStoppedEarly).
   */
  playing?: { collection: AudioAdhkarCollection; itemId: string; sessionId?: string; title?: string };
}

let current: Current | null = null;

// A category's slider moved while one of its dhikr plays in the app: the new level applies at once.
subscribeAudioVolumes((volumes) => {
  const collection = current?.playing?.collection;
  if (current && collection) setAudioVolume(current.source.key, volumeGain(collection, volumes));
});
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

/**
 * The in-app listening run in progress: one session per «استماع» (all its
 * repetitions), with the dhikr's title as native names it — so each
 * completed repetition is recorded with its session, title and real length.
 */
// The last start that failed (the recording couldn't play, or Android
// refused/failed to start it) — shown under that dhikr's player until any
// dhikr is started again. Never set by a pause, a stop or an interruption.
export interface AudioAdhkarPlaybackFailure {
  collection: AudioAdhkarCollection;
  itemId: string;
}
let lastFailure: AudioAdhkarPlaybackFailure | null = null;
const failureListeners = new Set<() => void>();

function setFailure(value: AudioAdhkarPlaybackFailure | null) {
  if (lastFailure === value) return;
  lastFailure = value;
  for (const listener of [...failureListeners]) listener();
}

export function getAudioAdhkarPlaybackFailure(): AudioAdhkarPlaybackFailure | null {
  return lastFailure;
}

export function subscribeAudioAdhkarPlaybackFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

let inAppSession: { id: string; title: string } | null = null;
let sessionCounter = 0;

function beginInAppSession(title: string) {
  sessionCounter += 1;
  inAppSession = { id: `app-session:${Date.now()}:${sessionCounter}`, title };
}

/**
 * The in-app repetition playing now is being abandoned before its end
 * (stopped, failed, interrupted, replaced, the adhan): record how long it
 * really played — the player's own position, read live or as the engine
 * kept it when another source took over — as listening, never as a
 * repetition. At most once per playback; nothing is recorded when the
 * position can't be read.
 */
function settleStoppedEarly() {
  const playing = current?.playing;
  if (!current || !playing) return;
  current.playing = undefined;
  const live = getPlaybackProgress();
  const progress = live && live.key === current.source.key ? live : takeStoppedProgress(current.source.key);
  if (!progress || progress.loading || !(progress.positionMs > 0)) return;
  const listenedMs = progress.durationMs !== null ? Math.min(progress.positionMs, progress.durationMs) : progress.positionMs;
  commitInAppListening(playing.collection, playing.itemId, listenedMs, { sessionId: playing.sessionId, title: playing.title });
}

function playOnce(source: AudioAdhkarSource) {
  settleStoppedEarly(); // a different dhikr replacing one still playing
  const token = ++nextToken;
  const now = getNowPlaying();
  // Its session and title as they are now (a new «استماع» starts a new session before its first playOnce).
  current = { source, token, ...(now ? { playing: { collection: now.collection, itemId: now.itemId, sessionId: inAppSession?.id, title: inAppSession?.title } } : {}) };
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
    onEnded: (info) => {
      if (!isCurrent()) return;
      // Consume this playback's token first: a duplicate/late "ended" for
      // the same playback now fails isCurrent() and can't advance again.
      // Heard to the end: it counts as a completion below, not as listening.
      current = { source, token: -1 };
      // This repetition was heard to its end — the only moment one counts
      // (an error or interruption takes the branches below instead).
      const heard = getNowPlaying();
      if (heard) commitInAppCompletion(heard.collection, heard.itemId, { sessionId: inAppSession?.id, title: inAppSession?.title, durationMs: info?.durationMs ?? null });
      const pauseMs = pauseBeforeNextRepetition(getNowPlaying());
      if (pauseMs > 0) {
        pauseThenPlay(source, pauseMs);
      } else if (webPlayAllHasNext()) {
        pauseThenNextDhikr(source);
      } else {
        current = null;
        clearAdhanStop();
        if (webPlayAll) endPlayAll(); // Play All's last dhikr: the run is complete
        audioAdhkarPlayback.repetitionEnded(); // the final one → "finished"
      }
    },
    onError: () => {
      if (!isCurrent()) return;
      settleStoppedEarly();
      current = null;
      clearAdhanStop();
      const failed = getNowPlaying();
      endPlayAll(); // a recording that can't play ends Play All there, its failure shown on that dhikr
      audioAdhkarPlayback.stop();
      if (failed) setFailure({ collection: failed.collection, itemId: failed.itemId });
    },
    onInterrupted: () => {
      if (!isCurrent()) return;
      settleStoppedEarly();
      current = null;
      clearAdhanStop();
      endPlayAll();
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
      endPlayAll();
      audioAdhkarPlayback.stop();
    },
  });
}

/**
 * Play All (in-app): the silence after a dhikr's final repetition, then the
 * section's next dhikr. Pausable like the silence between repetitions —
 * the finished dhikr stays shown as playing until the next one starts.
 */
function pauseThenNextDhikr(source: AudioAdhkarSource) {
  const token = ++nextToken;
  current = { source, token };
  const isCurrent = () => current?.token === token;
  playSilence(source.channel, source.key, REPETITION_PAUSE_MS, {
    onEnded: () => {
      if (!isCurrent()) return;
      current = null;
      audioAdhkarPlayback.repetitionEnded(); // the final one → "finished"
      playWebStepFrom((playAll?.index ?? 0) + 1);
    },
    onInterrupted: () => {
      if (!isCurrent()) return;
      current = null;
      clearAdhanStop();
      endPlayAll();
      audioAdhkarPlayback.stop();
    },
  });
}

// ---- Play All («تشغيل الكل») state ------------------------------------------

/** Where a Play All run is: its section, the dhikr playing (0-based, among the playable ones) and how many. */
export interface AudioAdhkarPlayAll {
  collection: AudioAdhkarCollection;
  index: number;
  count: number;
}

/** One dhikr of a Play All run. */
export type AudioAdhkarPlayAllEntry = { kind: "written"; item: WrittenAdhkarItem } | { kind: "various"; item: AudioVariousItem };

let playAll: AudioAdhkarPlayAll | null = null;
/** The in-app (web) run's adhkar; null when native plays the run, or none runs. */
let webPlayAll: { collection: AudioAdhkarCollection; entries: AudioAdhkarPlayAllEntry[] } | null = null;
const playAllListeners = new Set<() => void>();

function setPlayAll(next: AudioAdhkarPlayAll | null) {
  const same = next === playAll || (next !== null && playAll !== null && next.collection === playAll.collection && next.index === playAll.index && next.count === playAll.count);
  if (same) return;
  playAll = next;
  for (const listener of [...playAllListeners]) listener();
}

export function getAudioAdhkarPlayAll(): AudioAdhkarPlayAll | null {
  return playAll;
}

export function subscribeAudioAdhkarPlayAll(listener: () => void): () => void {
  playAllListeners.add(listener);
  return () => playAllListeners.delete(listener);
}

function endPlayAll() {
  webPlayAll = null;
  setPlayAll(null);
}

function webPlayAllHasNext(): boolean {
  return webPlayAll !== null && playAll !== null && playAll.index + 1 < webPlayAll.entries.length;
}

/** Plays the web run's dhikr at [from] — or the first after it that can play; ends the run when none is left. */
function playWebStepFrom(from: number): boolean {
  const run = webPlayAll;
  for (let i = from; run && webPlayAll === run && i < run.entries.length; i++) {
    setPlayAll({ collection: run.collection, index: i, count: run.entries.length });
    const entry = run.entries[i];
    if (entry.kind === "written" ? beginWritten(run.collection, entry.item) : beginVarious(entry.item)) return true;
  }
  endPlayAll();
  return false;
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
  if (state?.active && state.status !== "error") {
    if (current) {
      // In-app playback yields to the scheduled session.
      settleStoppedEarly();
      const { channel } = current.source;
      current = null;
      clearAdhanStop();
      stopAudio(channel);
    }
    nativeActive = true;
    nativeManual = state.manual === true;
    // A manual session of several adhkar is a Play All run (also one started before the app was reopened).
    webPlayAll = null;
    setPlayAll(nativeManual && state.count > 1 ? { collection: state.collection, index: state.index, count: state.count } : null);
    setFailure(null); // something plays again: an earlier failure is no longer news
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
  endPlayAll();
  if (state?.status === "finished") {
    audioAdhkarPlayback.mirror({ collection: state.collection, itemId: state.dhikrId, repetition: state.repetition, total: state.total, status: "finished" });
  } else {
    audioAdhkarPlayback.stop();
    if (state?.status === "error") setFailure({ collection: state.collection, itemId: state.dhikrId });
  }
}

/**
 * Android: hands this dhikr to the native player (see the top comment) and
 * shows it playing at once; the service's own state follows. If Android
 * refuses (the adhan is playing), the state goes back to idle.
 */
function startNative(collection: AudioAdhkarCollection, itemId: string, total: number, item: NativePlaylistItem, items?: NativePlaylistItem[]): boolean {
  if (current) {
    settleStoppedEarly();
    const { channel } = current.source;
    current = null;
    stopAudio(channel);
  }
  clearAdhanStop(); // native stops it at the adhan itself
  setFailure(null);
  nativeActive = true;
  nativeManual = true;
  const request = ++nativeRequest;
  audioAdhkarPlayback.startDhikr({ collection, itemId }, total, item.reciterName || undefined);
  const refused = () => {
    if (request !== nativeRequest || !nativeManual) return;
    nativeActive = false;
    nativeManual = false;
    endPlayAll();
    audioAdhkarPlayback.stop();
    setFailure({ collection, itemId });
  };
  trace(
    items
      ? `play all: native playNow ${collection} ×${items.length} (${items.map((i) => i.dhikrId).join(",")})`
      : `listen: native playNow ${collection}/${itemId} ×${total} (${item.assetPaths.length} file(s))`,
  );
  AudioAdhkarNative.playNow(items ? { collection, item, items } : { collection, item }).then(
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
 * untouched) when it has no recording. A Play All run gives way to it.
 */
export function startAudioAdhkar(collection: AudioAdhkarCollection, item: WrittenAdhkarItem): boolean {
  if (!getAudioAdhkarSource(collection, item)) return false;
  endPlayAll();
  return beginWritten(collection, item);
}

function beginWritten(collection: AudioAdhkarCollection, item: WrittenAdhkarItem): boolean {
  if (!getAudioAdhkarSource(collection, item)) return false;
  rememberLastPlayed({ collection, itemId: item.id, titleAr: item.title_ar ?? getSpokenText(item.text_ar), titleEn: item.title_en ?? item.title_ar ?? getSpokenText(item.text_ar) });
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
  setFailure(null);
  audioAdhkarPlayback.startDhikr({ collection, itemId: item.id }, total, reciter ? reciter.name[loadLanguagePreference()] : undefined);
  beginInAppSession(item.title_ar ?? getSpokenText(item.text_ar));
  playOnce(source);
  armAdhanStop();
  return true;
}

/** Plays a Various dhikr's recording once. False (nothing plays) when it has none. A Play All run gives way to it. */
export function startAudioVarious(item: AudioVariousItem): boolean {
  if (!getAudioVariousSource(item)) return false;
  endPlayAll();
  return beginVarious(item);
}

function beginVarious(item: AudioVariousItem): boolean {
  const source = getAudioVariousSource(item);
  if (!source) return false;
  rememberLastPlayed({ collection: "misc", itemId: item.id, titleAr: item.text_ar, titleEn: item.text_en || item.text_ar });
  if (isAudioAdhkarNativeAvailable()) {
    const native = nativeVariousItem(item);
    if (native) return startNative("misc", item.id, 1, native);
    trace(`listen: no bundled audio for misc/${item.id} — playing in the WebView (stops in the background)`);
  }
  if (nativeActive) {
    nativeActive = false;
    AudioAdhkarNative.stop().catch(ignore);
  }
  setFailure(null);
  audioAdhkarPlayback.startDhikr({ collection: "misc", itemId: item.id }, 1);
  beginInAppSession(item.text_ar);
  playOnce(source);
  armAdhanStop();
  return true;
}

/** The adhkar of [entries] that have a recording — what Play All plays, in list order. */
export function playableAudioAdhkar(collection: AudioAdhkarCollection, entries: readonly AudioAdhkarPlayAllEntry[]): AudioAdhkarPlayAllEntry[] {
  return entries.filter((e) => (e.kind === "written" ? getAudioAdhkarSource(collection, e.item) !== null : getAudioVariousSource(e.item) !== null));
}

/**
 * «تشغيل الكل»: plays every recorded dhikr of [entries] (the section's
 * list, in order) one after another, from the first, replacing whatever
 * Audio Adhkar plays. False (nothing plays) when none has a recording.
 */
export function startAudioAdhkarPlayAll(collection: AudioAdhkarCollection, entries: readonly AudioAdhkarPlayAllEntry[]): boolean {
  const playable = playableAudioAdhkar(collection, entries);
  if (playable.length === 0) return false;
  endPlayAll();
  const first = playable[0];
  rememberLastPlayed(
    first.kind === "written"
      ? { collection, itemId: first.item.id, titleAr: first.item.title_ar ?? getSpokenText(first.item.text_ar), titleEn: first.item.title_en ?? first.item.title_ar ?? getSpokenText(first.item.text_ar) }
      : { collection, itemId: first.item.id, titleAr: first.item.text_ar, titleEn: first.item.text_en || first.item.text_ar },
  );
  if (isAudioAdhkarNativeAvailable()) {
    // One native session over the whole list, each Quranic dhikr with its own reciter (as «استماع» takes it).
    const native = playable.map((e) => {
      if (e.kind === "various") return nativeVariousItem(e.item);
      if (collection === "misc") return null;
      const reciter = e.item.quranRef ? takeSectionReciter(collection) : peekSectionReciter(collection);
      return nativeWrittenItem(collection, e.item, reciter, audioRepetitionTotal(e.item));
    });
    const items = native.filter((i): i is NativePlaylistItem => i !== null);
    if (items.length < playable.length) trace(`play all: ${playable.length - items.length} dhikr without bundled audio in ${collection} — left out`);
    if (items.length > 0) {
      startNative(collection, items[0].dhikrId, items[0].repetitions, items[0], items);
      setPlayAll({ collection, index: 0, count: items.length });
      return true;
    }
  }
  webPlayAll = { collection, entries: playable };
  return playWebStepFrom(0);
}

/** Where the current repetition is, from whichever player plays it. */
export interface AudioAdhkarProgress {
  positionMs: number;
  /** null until the real total length is known — the bar then shows elapsed time only. */
  durationMs: number | null;
  loading: boolean;
}

/**
 * Reads the playing repetition's position: the Android background player's
 * MediaPlayer when it plays, else the in-app engine's media element / Web
 * Audio clock. Null when nothing measurable plays (e.g. the silence between
 * repetitions in the app). Never estimated.
 */
export async function readAudioAdhkarProgress(): Promise<AudioAdhkarProgress | null> {
  if (nativeActive && isAudioAdhkarNativeAvailable()) {
    try {
      const p = await AudioAdhkarNative.getPlaybackProgress();
      return p.active ? { positionMs: p.positionMs, durationMs: p.durationMs ?? null, loading: p.loading } : null;
    } catch {
      return null;
    }
  }
  if (!current) return null;
  const p = getPlaybackProgress();
  return p && p.key === current.source.key ? { positionMs: p.positionMs, durationMs: p.durationMs, loading: p.loading } : null;
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
/**
 * Stops the dhikr playing now, wherever it plays (the Home screen player's
 * stop button): a «استماع» or scheduled session in the Android background
 * player as well as in-app playback. (stopAudioAdhkar, by contrast, runs
 * when the user leaves the Audio Adhkar list and lets native playback go on.)
 */
export function stopAudioAdhkarPlayback(): void {
  if (nativeActive && isAudioAdhkarNativeAvailable()) {
    (nativeManual ? AudioAdhkarNative.stopManual() : AudioAdhkarNative.stop()).catch(ignore);
    nativeActive = false;
    nativeManual = false;
    endPlayAll();
    audioAdhkarPlayback.stop();
    return;
  }
  stopAudioAdhkar();
}

export function stopAudioAdhkar(): void {
  clearAdhanStop();
  if (nativeActive) {
    if (nativeManual) trace("listen: left the Audio Adhkar list — native playback continues");
    return;
  }
  endPlayAll(); // in-app Play All stops with the rest of in-app playback
  if (current) {
    settleStoppedEarly();
    const { channel } = current.source;
    current = null;
    stopAudio(channel);
  }
  audioAdhkarPlayback.stop();
}
