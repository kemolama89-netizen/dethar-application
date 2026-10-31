// Plays one exact segment of an Adhan recording — the whole adhan, the
// opening takbirs only, or «الصلاة خير من النوم» only — from the untouched
// original file: seek to the segment's start, stop at its end.
//
// Deliberately NOT built on audioEngine's playUrlQueue (the shared element
// Quran and Audio Adhkar use): adhan playback has its own <audio> element
// and only joins the app-wide "one audio at a time" rule through
// claimAudio/releaseAudio on its own "adhan" channel. Starting an adhan
// stops any Quran/adhkar audio, and starting those stops the adhan, exactly
// as those features already behave towards each other — nothing in their
// own code paths changes.
//
// The end is enforced two ways: a timer armed for the remaining time while
// playing (precise), and every timeupdate as a backstop. The segment ends
// already sit inside a pause in the recitation (see adhanRecordings.ts), so
// a few tens of milliseconds of timer jitter can never reach the next
// phrase.
import { claimAudio, releaseAudio, setAudioVolume } from "./audioEngine";
import type { AdhanRecording, AdhanSegment } from "../data/adhanRecordings";
import type { AdhanMode } from "./adhanAudioSettings";
import { subscribeAudioVolumes, volumeGain } from "./audioVolumeSettings";
import { playableAudioPath } from "./audioAssets";

export interface AdhanAudioElement {
  src: string;
  preload?: string;
  currentTime: number;
  volume?: number;
  play(): Promise<void> | void;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  onloadedmetadata: (() => void) | null;
  ontimeupdate: (() => void) | null;
  onplaying: (() => void) | null;
  onpause: (() => void) | null;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  /** HTMLMediaElement state (absent on minimal test fakes). */
  readyState?: number;
  networkState?: number;
  error?: unknown;
}

/** HTMLMediaElement.HAVE_METADATA */
const HAVE_METADATA = 1;
/** HTMLMediaElement.NETWORK_NO_SOURCE */
const NETWORK_NO_SOURCE = 3;

let createElement: () => AdhanAudioElement = () => new Audio() as unknown as AdhanAudioElement;

// ONE element for all adhan playback, created on first use. It holds at most
// one recording at a time (never all of them), and remembers which one, so
// replaying it is instant.
let sharedElement: AdhanAudioElement | null = null;
let loadedUrl: string | null = null;
let metadataReady = false;

function getElement(): AdhanAudioElement {
  if (!sharedElement) sharedElement = createElement();
  return sharedElement;
}

/** Test seam — jsdom has no media playback. Also forgets the shared element. */
export function setAdhanAudioElementFactory(factory: () => AdhanAudioElement): void {
  createElement = factory;
  sharedElement = null;
  loadedUrl = null;
  metadataReady = false;
}

export function adhanSegment(recording: AdhanRecording, mode: AdhanMode): AdhanSegment | null {
  return recording.segments[mode];
}

export function adhanAudioUrl(recording: AdhanRecording): string {
  return `${import.meta.env.BASE_URL}${encodeURI(playableAudioPath(recording.path))}`;
}

export function adhanAudioKey(recording: AdhanRecording, mode: AdhanMode): string {
  return `adhan:${recording.id}:${mode}`;
}

export interface PlayAdhanOptions {
  onEnded?: () => void;
  onError?: () => void;
  /** Another source took over, or stopAudio() was called. */
  onInterrupted?: () => void;
  /** Gain 0–1; by default the adhan's own volume (Settings → إعدادات الصوت). */
  volume?: number;
}

/**
 * Plays exactly `segment` of `recording` for `mode`. Returns false (and
 * plays nothing) if the recording has no segment for that mode.
 */
export function playAdhanSegment(recording: AdhanRecording, mode: AdhanMode, options: PlayAdhanOptions = {}): boolean {
  const segment = adhanSegment(recording, mode);
  if (!segment) return false;
  const key = adhanAudioKey(recording, mode);
  const url = adhanAudioUrl(recording);
  const el = getElement();
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Without a level of its own, it follows the adhan slider — also while it plays.
  let unsubscribeVolume: (() => void) | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const teardown = () => {
    active = false;
    clearTimer();
    unsubscribeVolume?.();
    unsubscribeVolume = null;
    el.onloadedmetadata = null;
    el.ontimeupdate = null;
    el.onplaying = null;
    el.onpause = null;
    el.onended = null;
    el.onerror = null;
    // Pause only — the file stays loaded on the shared element, so previewing
    // the same recording again starts at once instead of re-downloading it.
    el.pause();
  };

  const finish = () => {
    if (!active) return;
    teardown();
    releaseAudio(key);
    options.onEnded?.();
  };

  const fail = () => {
    if (!active) return;
    // A failed load must not be reused: force a fresh load next time.
    loadedUrl = null;
    metadataReady = false;
    teardown();
    releaseAudio(key);
    options.onError?.();
  };

  const armTimer = () => {
    clearTimer();
    if (!active) return;
    const remaining = segment.end - el.currentTime;
    if (remaining <= 0) {
      finish();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (active && el.currentTime >= segment.end - 0.05) finish();
      else armTimer();
    }, remaining * 1000);
  };

  const start = () => {
    try {
      const result = el.play();
      if (result && typeof result.catch === "function") result.catch(() => fail());
    } catch {
      fail();
    }
  };

  // Claim FIRST: this stops any previous preview, which detaches its own
  // handlers from the shared element before this playback attaches its own.
  claimAudio(
    "adhan",
    key,
    () => {
      if (!active) return;
      teardown();
      options.onInterrupted?.();
    },
    {
      pause: () => {
        if (active) el.pause();
      },
      resume: () => {
        if (active) start();
      },
      setVolume: (gain) => {
        if (active) el.volume = gain;
      },
    },
  );
  if (options.volume === undefined) {
    unsubscribeVolume = subscribeAudioVolumes((volumes) => setAudioVolume(key, volumeGain("adhan", volumes)));
  }

  const seekAndPlay = () => {
    if (!active) return;
    el.currentTime = segment.start;
    start();
  };

  el.volume = Math.min(1, Math.max(0, options.volume ?? volumeGain("adhan")));
  el.onplaying = armTimer;
  el.onpause = clearTimer;
  el.ontimeupdate = () => {
    if (active && el.currentTime >= segment.end) finish();
  };
  el.onended = finish;
  el.onerror = fail;

  // The element itself is the source of truth for whether the file is ready:
  // its metadata may have arrived while no playback was listening (e.g.
  // Preview then Stop before it loaded), and a load may have failed then too.
  const sameFile = loadedUrl === url;
  const ready = sameFile && (metadataReady || (el.readyState ?? 0) >= HAVE_METADATA);
  const broken = !!el.error || el.networkState === NETWORK_NO_SOURCE;

  if (ready && !broken) {
    // Already loaded (e.g. previewing the same voice again, or switching
    // between its Full / Takbeer modes): no network, no reload — just seek.
    metadataReady = true;
    seekAndPlay();
  } else {
    el.onloadedmetadata = () => {
      el.onloadedmetadata = null;
      metadataReady = true;
      seekAndPlay();
    };
    if (!sameFile || broken) {
      // A different file (replacing src also aborts the previous download),
      // or a failed one: load it.
      loadedUrl = url;
      metadataReady = false;
      el.preload = "auto";
      el.src = url;
      el.load();
    }
    // Same file still loading: just wait for its metadata — don't restart the download.
  }
  return true;
}
