// The Qur'an reader's page-turn sound: a real recording of a paper page being
// turned (public/audio/ui/page-turn.m4a — public domain; source, licence and
// edits in public/audio/ui/README.md), cut to the leaf's flip and landing so
// the landing falls where the page-turn animation ends (~0.4 s in). It plays
// when a page turns (a swipe, the buttons or the arrow keys), never on a jump
// to another surah, page or search result, and only while the reader's
// "page-turn sound" setting is on (lib/quranReading.ts loadQuranTurnSound —
// on by default). Quiet by design: it sits under any recitation, not over it.
//
// Played through the Web Audio API: the clip is fetched and decoded once
// (preparePageTurnSound, when the reader opens — it is bundled, so offline
// too) and each turn starts it at once. Turning again while it still sounds
// fades the previous one out over a few milliseconds instead of stacking two
// rustles. Between turns the audio context is suspended, so DITHAR holds no
// audio output while reading. Without Web Audio an <audio> element plays it
// instead. Anything missing or refused simply means no sound — a page turn
// never depends on it.

export const PAGE_TURN_SOUND_URL = `${import.meta.env.BASE_URL}audio/ui/page-turn.m4a`;
/** The clip's level (its peak is −3 dBFS): a soft rustle. */
const VOLUME = 0.5;
/** Where, in the clip, the leaf lands (s) — its loudest moment (public/audio/ui/README.md). */
export const PAGE_TURN_LANDING_S = 0.4;
/** How fast a still-sounding turn fades when the next begins (s). */
const OVERLAP_FADE_S = 0.025;
/** A turn whose sound isn't decoded yet still plays if it is ready this soon (ms); later it would lag the page. */
const LATE_START_MS = 150;
/** The context is suspended this long after the last turn's sound (ms). */
const IDLE_SUSPEND_MS = 1500;

type AudioContextCtor = new () => AudioContext;

let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;
let current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let fallback: HTMLAudioElement | null = null;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
    return context;
  } catch {
    return null;
  }
}

/** Fetches and decodes the clip once (the reader calls it on opening, so the first turn sounds at once). */
export function preparePageTurnSound(): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer);
  if (loading) return loading;
  const ctx = getContext();
  if (!ctx || typeof fetch !== "function") return Promise.resolve(null);
  loading = fetch(PAGE_TURN_SOUND_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((decoded) => (buffer = decoded))
    .catch(() => {
      loading = null; // tried again on the next turn
      return null;
    });
  return loading;
}

function scheduleSuspend(ctx: AudioContext, afterS: number): void {
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (!current && ctx.state === "running") void ctx.suspend().catch(() => {});
  }, afterS * 1000 + IDLE_SUSPEND_MS);
}

function start(ctx: AudioContext, clip: AudioBuffer, offset: number): void {
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  // A turn still sounding: faded out quickly, never two rustles on top of each other.
  if (current) {
    const previous = current;
    previous.gain.gain.cancelScheduledValues(now);
    previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
    previous.gain.gain.linearRampToValueAtTime(0, now + OVERLAP_FADE_S);
    try {
      previous.source.stop(now + OVERLAP_FADE_S + 0.01);
    } catch {
      // Already stopped.
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = clip;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(VOLUME, now);
  source.connect(gain);
  gain.connect(ctx.destination);
  const playing = { source, gain };
  current = playing;
  source.onended = () => {
    if (current === playing) current = null;
  };
  source.start(now, offset);
  scheduleSuspend(ctx, clip.duration - offset);
}

function playWithAudioElement(): boolean {
  if (typeof Audio === "undefined") return false;
  try {
    fallback ??= Object.assign(new Audio(PAGE_TURN_SOUND_URL), { preload: "auto", volume: VOLUME });
    fallback.currentTime = 0;
    void fallback.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays one page-turn sound, timed so the leaf's landing in the recording
 * falls when the page lands on screen: `landsInMs` from now (the whole turn
 * animation by default; less when a page let go part-way finishes its turn;
 * 0 when the page simply changes). The clip is entered later for a shorter
 * turn — never sped up. Returns whether a sound was (or is about to be) started.
 */
export function playPageTurnSound(landsInMs: number = PAGE_TURN_LANDING_S * 1000): boolean {
  const ctx = getContext();
  if (!ctx) return playWithAudioElement();
  const offsetFor = (lateMs: number) => Math.min(PAGE_TURN_LANDING_S, Math.max(0, PAGE_TURN_LANDING_S - (landsInMs - lateMs) / 1000));
  try {
    if (buffer) {
      start(ctx, buffer, offsetFor(0));
      return true;
    }
    // Not decoded yet (the very first turn, on a slow device): sound it only if it is ready almost at once.
    const asked = Date.now();
    void preparePageTurnSound().then((clip) => {
      const late = Date.now() - asked;
      if (clip && late <= LATE_START_MS) start(ctx, clip, offsetFor(late));
    });
    return true;
  } catch {
    return false;
  }
}

/** Tests only: forget everything (as after a restart). */
export function resetPageTurnSoundForTesting(): void {
  if (idleTimer !== null) clearTimeout(idleTimer);
  context = null;
  buffer = null;
  loading = null;
  current = null;
  idleTimer = null;
  fallback = null;
}
