// DITHAR — one Quranic recitation as ONE continuous Web Audio stream.
//
// A Quranic dhikr is several per-ayah files (EveryAyah). Played as
// separate media elements, each ayah switch waits for the next file to be
// fetched/started at the moment the previous one ends — on a phone that
// is an audible gap between ayahs (see the audit: ~0.4 s at 250 ms
// latency). Here instead, when the recitation starts, every ayah file is
// fetched and decoded up front, then all of them are scheduled back to
// back, sample-accurately, on one AudioContext: ayah N+1 starts exactly
// where ayah N's decoded audio ends. Nothing is added or trimmed — the
// only transition is whatever silence the source files themselves carry.
//
// Same ownership model as audioEngine.ts's playUrlQueue (claimAudio, the
// same callbacks, pause/resume controls), so callers can use either. Pause
// suspends the AudioContext (the schedule freezes and continues on
// resume). Without Web Audio (no AudioContext — old browsers, tests), it
// falls back to playUrlQueue.
import type { AudioChannel, PlayUrlQueueOptions } from "./audioEngine";
import { claimAudio, playUrlQueue, releaseAudio } from "./audioEngine";

/** The parts of the Web Audio API used here (a test seam — jsdom has none). */
export interface AudioBufferLike {
  readonly duration: number;
}
export interface BufferSourceLike {
  buffer: AudioBufferLike | null;
  onended: (() => void) | null;
  connect(destination: unknown): unknown;
  disconnect(): void;
  start(when: number, offset?: number): void;
  stop(): void;
}
export interface GainNodeLike {
  gain: { value: number };
  connect(destination: unknown): unknown;
  disconnect(): void;
}
export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  createBufferSource(): BufferSourceLike;
  /** Absent on minimal test fakes: then the sequence plays at full gain. */
  createGain?(): GainNodeLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
}

type Fetcher = (url: string) => Promise<ArrayBuffer>;

const defaultContextFactory = (): AudioContextLike | null =>
  typeof AudioContext === "undefined" ? null : (new AudioContext() as unknown as AudioContextLike);
const defaultFetcher: Fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.arrayBuffer();
};

let createContext: () => AudioContextLike | null = defaultContextFactory;
let fetchAudio: Fetcher = defaultFetcher;
let sharedContext: AudioContextLike | null | undefined;

/** Test seam. Pass nothing to restore the browser defaults. */
export function setWebAudioForTesting(options: { createContext?: () => AudioContextLike | null; fetch?: Fetcher } = {}): void {
  createContext = options.createContext ?? defaultContextFactory;
  fetchAudio = options.fetch ?? defaultFetcher;
  sharedContext = undefined;
  decoded = new Map();
  previousUrls = [];
  liveSequences = 0;
}

/** One AudioContext for the whole app (browsers limit how many may exist). */
function getContext(): AudioContextLike | null {
  if (sharedContext === undefined) {
    try {
      sharedContext = createContext();
    } catch {
      sharedContext = null;
    }
  }
  return sharedContext;
}

// Decoded files by url, so the next repetition doesn't fetch/decode again
// (a recitation's first repetition adds its basmala; later ones reuse the
// same ayahs). Only the files of this playback and the one before it are
// kept (Ayat al-Kursi decoded is ~20 MB of PCM).
let decoded = new Map<string, Promise<AudioBufferLike>>();
let previousUrls: readonly string[] = [];

function decodeAll(context: AudioContextLike, urls: readonly string[]): Promise<AudioBufferLike[]> {
  const keep = new Map<string, Promise<AudioBufferLike>>();
  for (const url of [...previousUrls, ...urls]) {
    const cached = decoded.get(url);
    if (cached) keep.set(url, cached);
  }
  for (const url of urls) {
    if (keep.has(url)) continue;
    const loading = (async () => context.decodeAudioData(await fetchAudio(url)))();
    // A failed load must not stay cached.
    loading.catch(() => {
      if (decoded.get(url) === loading) decoded.delete(url);
    });
    keep.set(url, loading);
  }
  decoded = keep;
  previousUrls = urls;
  return Promise.all(urls.map((url) => keep.get(url)!));
}

// Sequences currently holding the context. When the last one ends the
// context is suspended: a running AudioContext keeps the audio output
// (and its rendering thread) alive, playing silence — a battery drain for
// nothing. The next sequence resumes it.
let liveSequences = 0;

/** How far ahead of "now" the first ayah is scheduled, so it never starts late. */
const START_LEAD_SECONDS = 0.05;

/**
 * Plays `urls` as one continuous stream — each file starting exactly where
 * the previous one ends — under `channel`/`key`, stopping any other audio
 * first (`options.startAt`: begin that many seconds into the first file).
 * Returns false (and plays nothing) for an empty list.
 */
export function playAudioSequence(channel: AudioChannel, key: string, urls: readonly string[], options: PlayUrlQueueOptions = {}): boolean {
  if (urls.length === 0) return false;
  const context = getContext();
  if (!context) return playUrlQueue(channel, key, urls, options);

  let active = true;
  let live = true;
  liveSequences += 1;
  const sources: BufferSourceLike[] = [];
  // The app's own volume (audioVolumeSettings.ts), through one gain node when the context has them.
  const gain = options.volume !== undefined && options.volume !== 1 && context.createGain ? context.createGain() : null;
  if (gain) {
    gain.gain.value = Math.min(1, Math.max(0, options.volume!));
    gain.connect(context.destination);
  }
  const output = gain ?? context.destination;

  const halt = () => {
    active = false;
    if (live) {
      live = false;
      liveSequences -= 1;
      if (liveSequences === 0) void context.suspend().catch(() => {});
    }
    gain?.disconnect();
    for (const source of sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Not started yet / already ended.
      }
      source.disconnect();
    }
    sources.length = 0;
  };

  const fail = () => {
    if (!active) return;
    halt();
    releaseAudio(key);
    options.onError?.();
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
        if (active) void context.suspend().catch(() => {});
      },
      resume: () => {
        if (active) void context.resume().catch(fail);
      },
    },
  );

  // Resume now — still inside the user's tap — so the browser allows the
  // audio that starts once decoding is done.
  if (context.state !== "running") void context.resume().catch(() => {});

  decodeAll(context, urls).then(
    (buffers) => {
      if (!active) return;
      let at = context.currentTime + START_LEAD_SECONDS;
      buffers.forEach((buffer, i) => {
        const offset = i === 0 ? Math.min(options.startAt ?? 0, buffer.duration) : 0;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(output);
        if (i === buffers.length - 1) {
          source.onended = () => {
            if (!active) return;
            halt();
            releaseAudio(key);
            options.onEnded?.();
          };
        }
        if (offset > 0) source.start(at, offset);
        else source.start(at);
        at += buffer.duration - offset;
        sources.push(source);
      });
    },
    fail,
  );
  return true;
}
