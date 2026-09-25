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

export type AudioChannel = "quran" | "adhkar" | "tts";

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

function safeStop(target: Owner) {
  try {
    target.stop();
  } catch {
    // A failing stop must never block the next source from starting.
  }
}

// ---------------------------------------------------------------------
// File playback — one shared <audio> element for the whole app.
// ---------------------------------------------------------------------

export interface AudioElementLike {
  src: string;
  play(): Promise<void> | void;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}

let createElement: () => AudioElementLike = () => new Audio() as unknown as AudioElementLike;
let sharedElement: AudioElementLike | null = null;

/** Test seam — jsdom has no media playback. */
export function setAudioElementFactory(factory: () => AudioElementLike): void {
  createElement = factory;
  sharedElement = null;
}

function getElement(): AudioElementLike {
  if (!sharedElement) sharedElement = createElement();
  return sharedElement;
}

export interface PlayUrlQueueOptions {
  onEnded?: () => void;
  onError?: () => void;
  /** Another source took over, or stopAudio() was called — not called when the queue ends or fails by itself. */
  onInterrupted?: () => void;
}

/**
 * Plays `urls` in order on the shared element under `channel`/`key`,
 * stopping any other audio first. Returns false (and plays nothing) for an
 * empty list.
 */
export function playUrlQueue(channel: AudioChannel, key: string, urls: readonly string[], options: PlayUrlQueueOptions = {}): boolean {
  if (urls.length === 0) return false;
  const element = getElement();
  let index = 0;
  let active = true;

  const halt = () => {
    active = false;
    element.onended = null;
    element.onerror = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
  };

  const fail = () => {
    if (!active) return;
    halt();
    releaseAudio(key);
    options.onError?.();
  };

  const playCurrent = () => {
    element.src = urls[index];
    try {
      const result = element.play();
      if (result && typeof result.catch === "function") result.catch(fail);
    } catch {
      fail();
    }
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

  element.onended = () => {
    if (!active) return;
    index += 1;
    if (index < urls.length) {
      playCurrent();
      return;
    }
    halt();
    releaseAudio(key);
    options.onEnded?.();
  };
  element.onerror = fail;

  playCurrent();
  return true;
}
