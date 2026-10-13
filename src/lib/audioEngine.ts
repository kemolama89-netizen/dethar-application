// DITHAR — the single app-wide audio engine.
//
// RULE: only ONE audio source plays at a time, across every kind of audio
// the app has or will have — Quran recitation, generated adhkar audio, and
// speech synthesis. Every source goes through `claimAudio`, which stops
// whatever currently holds the audio before the new source starts. Nothing
// should ever call `.play()` / `speechSynthesis.speak()` without claiming
// first.
//
// Two layers:
//   - claimAudio / releaseAudio / stopAudio: ownership only. Any source
//     (including ones this module can't play itself, like speechSynthesis)
//     registers a stop callback.
//   - playUrlQueue: plays an ordered list of audio files (e.g. one file per
//     ayah) on one shared <audio> element, claiming ownership first.
//
// The Audio Adhkar Evening player (audioAdhkarPlayer.ts) is the first UI
// caller. The existing Misc "Listen"
// (useMiscSpeech.ts, speechSynthesis) is intentionally not wired in yet —
// it should claim the "tts" channel when real audio playback ships.

/** "preview": the short volume sample of Settings → إعدادات الصوت (lib/volumePreview.ts). */
export type AudioChannel = "quran" | "adhkar" | "tts" | "adhan" | "preview";

export interface ActiveAudio {
  channel: AudioChannel;
  /** Identifies what is playing, e.g. "quran:abdulbasit-murattal:2:255". */
  key: string;
}

interface Owner extends ActiveAudio {
  stop: () => void;
  controls?: PauseControls;
}

/** Optional pause/resume a source can offer (file playback does; speech may not). */
export interface PauseControls {
  pause: () => void;
  resume: () => void;
}

let owner: Owner | null = null;
const listeners = new Set<(active: ActiveAudio | null) => void>();

function emit() {
  const snapshot = getActiveAudio();
  listeners.forEach((listener) => listener(snapshot));
}

export function getActiveAudio(): ActiveAudio | null {
  return owner ? { channel: owner.channel, key: owner.key } : null;
}

export function subscribeAudio(listener: (active: ActiveAudio | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stops the current owner (if any) and makes the caller the owner. */
export function claimAudio(channel: AudioChannel, key: string, stop: () => void, controls?: PauseControls): void {
  const previous = owner;
  owner = { channel, key, stop, controls };
  if (previous) safeStop(previous);
  emit();
}

/** Called by a source that finished on its own — only clears ownership if it still owns the audio. */
export function releaseAudio(key: string): void {
  if (owner?.key !== key) return;
  owner = null;
  emit();
}

/** Stops whatever is playing; pass a channel to stop only that kind of audio. */
export function stopAudio(channel?: AudioChannel): void {
  if (!owner || (channel && owner.channel !== channel)) return;
  const previous = owner;
  owner = null;
  safeStop(previous);
  emit();
}

/** Pauses the source playing `key`, keeping ownership. False if `key` isn't playing or can't pause. */
export function pauseAudio(key: string): boolean {
  if (owner?.key !== key || !owner.controls) return false;
  owner.controls.pause();
  return true;
}

/** Resumes the paused source `key`. False if `key` no longer owns the audio (e.g. something else played). */
export function resumeAudio(key: string): boolean {
  if (owner?.key !== key || !owner.controls) return false;
  owner.controls.resume();
  return true;
}

/**
 * A timed silence that holds the audio like a file would: it can be paused
 * and resumed (the remaining time freezes), and anything else claiming the
 * audio interrupts it. Used for the pause between Audio Adhkar repetitions,
 * so nothing else slips in and Pause/Resume/Stop work the same during it.
 */
export function playSilence(
  channel: AudioChannel,
  key: string,
  durationMs: number,
  options: Pick<PlayUrlQueueOptions, "onEnded" | "onInterrupted"> = {},
): void {
  let active = true;
  let remaining = durationMs;
  let startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (!active) return;
    active = false;
    timer = null;
    releaseAudio(key);
    options.onEnded?.();
  };
  const run = () => {
    startedAt = Date.now();
    timer = setTimeout(finish, remaining);
  };
  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  claimAudio(
    channel,
    key,
    () => {
      if (!active) return;
      active = false;
      clear();
      options.onInterrupted?.();
    },
    {
      pause: () => {
        if (!active || timer === null) return;
        clear();
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
      },
      resume: () => {
        if (active && timer === null) run();
      },
    },
  );
  run();
}

function safeStop(target: Owner) {
  try {
    target.stop();
  } catch {
    // A failing stop must never block the next source from starting.
  }
}

// ---------------------------------------------------------------------
// File playback — one shared <audio> element for the whole app, plus one
// standby element that preloads the NEXT file of a multi-file queue (e.g.
// the ayahs of one Quranic recitation), so consecutive files play back to
// back instead of waiting for each to load after the previous one ends.
// ---------------------------------------------------------------------

export interface AudioElementLike {
  src: string;
  play(): Promise<void> | void;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  preload?: string;
  currentTime?: number;
  volume?: number;
}

let createElement: () => AudioElementLike = () => new Audio() as unknown as AudioElementLike;
let sharedElement: AudioElementLike | null = null;
let standbyElement: AudioElementLike | null = null;

/** Test seam — jsdom has no media playback. */
export function setAudioElementFactory(factory: () => AudioElementLike): void {
  createElement = factory;
  sharedElement = null;
  standbyElement = null;
}

function getElement(): AudioElementLike {
  if (!sharedElement) sharedElement = createElement();
  return sharedElement;
}

/** The second element for preloading — null when the factory hands out a single element. */
function getStandbyElement(): AudioElementLike | null {
  if (!standbyElement) standbyElement = createElement();
  return standbyElement === getElement() ? null : standbyElement;
}

export interface PlayUrlQueueOptions {
  /** Start the FIRST file this many seconds in (e.g. past a basmala heard on an earlier repetition). */
  startAt?: number;
  /** The app's own gain for this audio, 0–1 (audioVolumeSettings.ts); default 1. */
  volume?: number;
  onEnded?: () => void;
  onError?: () => void;
  /** Another source took over, or stopAudio() was called — not called when the queue ends or fails by itself. */
  onInterrupted?: () => void;
}

/**
 * Plays `urls` in order, back to back with no added delay, under
 * `channel`/`key`, stopping any other audio first. Returns false (and
 * plays nothing) for an empty list.
 *
 * While one file plays, the next is preloaded on the standby element; when
 * the file ends the two elements swap roles and the next file starts at
 * once. If the standby element can't start (e.g. a browser refusing play()
 * on it), that file falls back to loading on the playing element.
 */
export function playUrlQueue(channel: AudioChannel, key: string, urls: readonly string[], options: PlayUrlQueueOptions = {}): boolean {
  if (urls.length === 0) return false;
  let element = getElement();
  let standby = urls.length > 1 ? getStandbyElement() : null;
  /** Which url `standby` holds, or -1. */
  let standbyIndex = -1;
  let index = 0;
  let active = true;

  const clear = (el: AudioElementLike) => {
    el.onended = null;
    el.onerror = null;
    el.pause();
    el.removeAttribute("src");
    el.load();
  };

  const halt = () => {
    active = false;
    clear(element);
    if (standby && standbyIndex >= 0) clear(standby);
    standbyIndex = -1;
  };

  const fail = () => {
    if (!active) return;
    halt();
    releaseAudio(key);
    options.onError?.();
  };

  const start = (el: AudioElementLike, onRefused: () => void) => {
    try {
      const result = el.play();
      if (result && typeof result.catch === "function") result.catch(() => active && el === element && onRefused());
    } catch {
      onRefused();
    }
  };

  const preloadNext = () => {
    standbyIndex = -1;
    if (!standby) return;
    if (index + 1 >= urls.length) {
      clear(standby);
      return;
    }
    standby.onended = null;
    standby.onerror = null;
    standby.preload = "auto";
    standby.src = urls[index + 1];
    standby.load();
    standbyIndex = index + 1;
  };

  const volume = Math.min(1, Math.max(0, options.volume ?? 1));
  const playCurrent = () => {
    element.onended = onEnded;
    element.onerror = fail;
    element.volume = volume;
    element.src = urls[index];
    if (index === 0 && options.startAt) element.currentTime = options.startAt;
    start(element, fail);
    preloadNext();
  };

  const onEnded = () => {
    if (!active) return;
    index += 1;
    if (index >= urls.length) {
      halt();
      releaseAudio(key);
      options.onEnded?.();
      return;
    }
    if (standby && standbyIndex === index) {
      // The next file is already loaded: swap and start it right away.
      const finished = element;
      finished.onended = null;
      finished.onerror = null;
      element = standby;
      standby = finished;
      element.volume = volume;
      element.onended = onEnded;
      element.onerror = fail;
      start(element, () => {
        // Refused: play this file on the other element instead, and stop
        // preloading for the rest of the queue.
        clear(element);
        element = finished;
        standby = null;
        standbyIndex = -1;
        playCurrent();
      });
      preloadNext();
      return;
    }
    playCurrent();
  };

  claimAudio(
    channel,
    key,
    () => {
      if (!active) return;
      halt();
      options.onInterrupted?.();
    },
    {
      pause: () => {
        if (active) element.pause();
      },
      resume: () => {
        if (!active) return;
        try {
          const result = element.play();
          if (result && typeof result.catch === "function") result.catch(fail);
        } catch {
          fail();
        }
      },
    },
  );

  playCurrent();
  return true;
}
