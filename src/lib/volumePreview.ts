// The volume preview of Settings → إعدادات الصوت: while a slider is being
// moved, a short sample of that kind of audio plays at the level chosen —
// the selected adhan's opening takbir for the adhan, a recorded dhikr of
// the section for each Audio Adhkar category. Each slider's «تجربة الصوت»
// button plays the same sample to its natural end (testVolumePreview) —
// moving the slider meanwhile only changes its volume; tapping the button
// again stops it.
//
//  - One sample at a time. Moving the same slider only changes the
//    sample's volume (it never restarts); another slider switches sample.
//  - The slider's preview ends PREVIEW_TAIL_MS after the adjustment ends
//    (so a single tap is heard too); every preview ends with its sample
//    (the adhan's: at the end of its takbir segment), at once when the user leaves the screen or the app goes
//    to the background, and whenever real playback starts: any in-app
//    audio (it claims the shared audio engine), a native session
//    (adhkar, «استماع», the adhan — the "sessionStarted" event), or the
//    playback state becoming active.
//  - Never interrupts real playback: while something plays — in the app,
//    or natively (the adhan included) — or the phone is ringing or in a
//    call, no sample starts (blockedCategory); the level then applies to
//    what is playing (on Android at once, via setVolumes).
//  - Only plays a bundled sample: no counter, statistic, schedule,
//    notification, reciter or adhan-rotation state is read for writing or
//    changed.
//  - The level is the app's own gain on this one element; the phone's
//    media volume is never touched.
import type { PluginListenerHandle } from "@capacitor/core";
import { claimAudio, getActiveAudio, releaseAudio } from "./audioEngine";
import { getNowPlaying, subscribeAudioAdhkarPlayback } from "./audioAdhkarPlayback";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import { subscribePageVisibility, isPageVisible } from "./pageVisibility";
import { adhanAudioUrl } from "./adhanAudio";
import { loadAdhanAudioSettings } from "./adhanAudioSettings";
import { generatedAdhkarAudioPath } from "./morningEveningAudio";
import { getAdhanRecordingById } from "../data/adhanRecordings";
import { GENERATED_MORNING_EVENING_AUDIO_IDS } from "../data/morningEveningAudio";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import type { VolumeCategory } from "./audioVolumeSettings";
import { VOLUME_MAX } from "./audioVolumeSettings";
import { playableAudioPath } from "./audioAssets";

/** How long the sample keeps playing after the slider is let go. */
export const PREVIEW_TAIL_MS = 1_200;
/** …and, should no "adjustment ended" event arrive, after the slider last moved. */
export const PREVIEW_IDLE_MS = 2_500;

export interface PreviewSample {
  url: string;
  /** Seconds into the file. */
  startAt: number;
  /** Where the sample ends, seconds into the file; none = the file's end. */
  endAt?: number;
}

export interface PreviewElement {
  src: string;
  volume: number;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  onloadedmetadata: (() => void) | null;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  ontimeupdate: (() => void) | null;
}

const url = (path: string) => `${import.meta.env.BASE_URL}${encodeURI(playableAudioPath(path))}`;

/** What each slider previews; null when there's no sample. */
export function previewSampleFor(category: VolumeCategory): PreviewSample | null {
  if (category === "adhan") {
    const recording = getAdhanRecordingById(loadAdhanAudioSettings().regular.recordingId);
    const segment = recording?.segments.takbeer ?? recording?.segments.full;
    return recording && segment ? { url: adhanAudioUrl(recording), startAt: segment.start, endAt: segment.end } : null;
  }
  if (category === "misc") {
    const item = AUDIO_VARIOUS_ITEMS.find((i) => i.audio);
    return item?.audio ? { url: url(item.audio), startAt: 0 } : null;
  }
  const audioId = GENERATED_MORNING_EVENING_AUDIO_IDS.find((id) => id.startsWith(`${category}/`));
  return audioId ? { url: url(generatedAdhkarAudioPath(audioId)), startAt: 0 } : null;
}

let createElement: () => PreviewElement = () => new Audio() as unknown as PreviewElement;

/** Test seam (jsdom has no media playback). */
export function setPreviewElementFactory(factory: () => PreviewElement): void {
  stopVolumePreview();
  createElement = factory;
}

interface Preview {
  category: VolumeCategory;
  gain: number;
  /** Null while it is still checking that nothing plays natively. */
  element: PreviewElement | null;
  key: string;
  /** «تجربة الصوت»: plays to the sample's end — no slider timer stops it. */
  test: boolean;
}

let current: Preview | null = null;
/** The category whose sample was just refused (something playing, or a call) — until the next try. */
let blocked: VolumeCategory | null = null;
const changeListeners = new Set<() => void>();

/** Told whenever a sample starts, stops or is refused (the Settings buttons follow it). */
export function subscribeVolumePreview(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function changed() {
  for (const listener of [...changeListeners]) listener();
}
let tailTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let watching = false;
let nativeHandle: Promise<PluginListenerHandle> | null = null;

const gainOf = (percent: number) => Math.min(1, Math.max(0, percent / VOLUME_MAX));

/** Real playback starting, the playback state going active, or the app hiding: the sample stops. */
function watch() {
  if (!watching) {
    watching = true;
    subscribeAudioAdhkarPlayback(() => {
      if (current && getNowPlaying()) stopVolumePreview();
    });
    subscribePageVisibility(() => {
      if (current && !isPageVisible()) stopVolumePreview();
    });
  }
  if (!nativeHandle && isAudioAdhkarNativeAvailable()) {
    nativeHandle = AudioAdhkarNative.addListener("sessionStarted", () => stopVolumePreview());
    nativeHandle.catch(() => {});
  }
}

/** Whether anything plays natively now (an adhkar session or the adhan), or the phone is in a call. */
async function nativeBusy(): Promise<boolean> {
  if (!isAudioAdhkarNativeAvailable()) return false;
  try {
    const { state, busy, inCall } = await AudioAdhkarNative.getPlaybackState();
    return busy === true || inCall === true || state?.active === true;
  } catch {
    return true; // unknown: never risk cutting into real playback
  }
}

function clearTail() {
  if (tailTimer !== null) clearTimeout(tailTimer);
  tailTimer = null;
}

/**
 * The slider of `category` moved to `percent`: plays (or keeps playing)
 * its sample at that level. Returns whether a sample is (being) played —
 * false when real playback is going on or there's no sample.
 */
export function previewVolume(category: VolumeCategory, percent: number): boolean {
  const gain = gainOf(percent);
  if (current?.category === category) {
    current.gain = gain;
    if (current.element) current.element.volume = gain;
    if (!current.test) stopAfter(PREVIEW_IDLE_MS);
    return true;
  }
  stopVolumePreview();
  blocked = null;
  if (getActiveAudio() || getNowPlaying()) return refuse(category);
  const sample = previewSampleFor(category);
  if (!sample) return false;
  watch();
  const mine = ++generation;
  const preview: Preview = { category, gain, element: null, key: `preview:${category}`, test: false };
  current = preview;
  stopAfter(PREVIEW_IDLE_MS);
  changed();
  void nativeBusy().then((busy) => {
    if (mine !== generation || current !== preview) return;
    if (busy || getActiveAudio() || getNowPlaying()) {
      clearTail();
      current = null;
      refuse(category);
      return;
    }
    start(preview, sample);
  });
  return true;
}

function refuse(category: VolumeCategory): false {
  blocked = category;
  changed();
  return false;
}

/**
 * «تجربة الصوت»: plays `category`'s sample from its start at `percent` to
 * its natural end — restarting it if it was playing. Only Stop, leaving the
 * screen, the app hiding or real playback end it sooner. Same rules as the
 * slider's preview otherwise; false when refused.
 */
export function testVolumePreview(category: VolumeCategory, percent: number): boolean {
  stopVolumePreview();
  const started = previewVolume(category, percent);
  if (started && current) {
    current.test = true;
    clearTail();
  }
  return started;
}

/** Which category was just refused (real playback or a call), for the Settings notice. */
export function blockedPreviewCategory(): VolumeCategory | null {
  return blocked;
}

function start(preview: Preview, sample: PreviewSample) {
  const el = createElement();
  preview.element = el;
  el.volume = preview.gain;
  el.onended = () => stopVolumePreview();
  el.onerror = () => stopVolumePreview();
  const endAt = sample.endAt;
  // A sample inside a longer file (the adhan's takbir) ends at its own end.
  el.ontimeupdate = endAt === undefined ? null : () => {
    if (el.currentTime >= endAt) stopVolumePreview();
  };
  el.onloadedmetadata = () => {
    el.onloadedmetadata = null;
    if (sample.startAt > 0) el.currentTime = sample.startAt;
  };
  // Claimed like any audio: real in-app playback claiming it stops the sample.
  claimAudio("preview", preview.key, () => teardown(preview));
  el.src = sample.url;
  el.load();
  try {
    const result = el.play();
    if (result && typeof result.catch === "function") result.catch(() => stopVolumePreview());
  } catch {
    stopVolumePreview();
  }
}

function teardown(preview: Preview) {
  const el = preview.element;
  preview.element = null;
  if (current === preview) {
    // Real in-app playback claimed the audio: the sample is over.
    current = null;
    changed();
  }
  if (!el) return;
  el.onended = null;
  el.onerror = null;
  el.onloadedmetadata = null;
  el.ontimeupdate = null;
  el.pause();
  el.removeAttribute("src");
  el.load();
}

function stopAfter(ms: number) {
  clearTail();
  tailTimer = setTimeout(() => {
    tailTimer = null;
    stopVolumePreview();
  }, ms);
}

/** The adjustment ended: the sample stops a moment later (so a tap is heard). */
export function endVolumePreview(): void {
  if (current && !current.test) stopAfter(PREVIEW_TAIL_MS);
}

/** Stops the sample now (leaving the screen, real playback starting). */
export function stopVolumePreview(): void {
  clearTail();
  generation += 1;
  const preview = current;
  current = null;
  if (!preview) return;
  teardown(preview);
  releaseAudio(preview.key);
  changed();
}

/** Which slider's sample is playing (or about to), for tests and diagnostics. */
export function previewingCategory(): VolumeCategory | null {
  return current?.category ?? null;
}
