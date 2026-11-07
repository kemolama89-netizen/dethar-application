// The introduction's sound (components/IntroFilm.tsx): the app's own recordings, each in its own scene,
// and nothing else — no music, no instruments, no ambience.
//
//  - Recordings (HTMLAudioElement, played from the app's bundled files): the opening takbeer of the
//    built-in adhan in the prayer scene; the reciter's Basmala in the Mushaf scene (both pages it shows
//    begin with it, and it plays complete); a Morning dhikr and «سبحان الله» in the Audio Adhkar scene.
//    Each clip is a span of its file in media time, faded in and out by its own playback position, so a
//    paused film pauses the clip and its fade together. Only one religious recording sounds at a time:
//    starting one fades out any other at once.
//  - Interface touches (Web Audio): a very short click of filtered noise for a tap, a switch or a count —
//    no pitch, no tone — and the reader's own paper sound for the page turn (lib/pageTurnSound.ts).
//
// Silent until the viewer turns the sound on (the film starts muted); nothing is fetched before that.

export type ClipSpec = {
  /** Path under public/, as the app plays it (lib/audioAssets.ts playableAudioPath). */
  path: string;
  /** Where to play it from, when the app decides that itself (an adhan voice: downloaded, or streamed). */
  url?: () => string;
  /** Where to start and stop in the file (s). `to` omitted: to its end. */
  from: number;
  to?: number;
  fadeIn?: number;
  fadeOut?: number;
  volume: number;
  /** Qur'an, adhan or dhikr: never two at once. */
  religious: boolean;
};

export type TouchKind = "tap" | "switch" | "count";

/** `cap`: the level a forced fade-out starts from (the clip's volume when it was asked), so it only ever gets quieter. */
type ActiveClip = { el: HTMLAudioElement; spec: ClipSpec; frame: number; ended: boolean; cap: number };

const TOUCH: Record<TouchKind, { hz: number; q: number; gain: number; ms: number }> = {
  tap: { hz: 2600, q: 1.2, gain: 0.1, ms: 28 },
  switch: { hz: 1700, q: 1.4, gain: 0.09, ms: 34 },
  count: { hz: 3300, q: 1.6, gain: 0.07, ms: 22 },
};

type AudioContextCtor = new () => AudioContext;
const contextCtor = (): AudioContextCtor | null =>
  typeof window === "undefined" ? null : ((window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) ?? null);

export class IntroFilmSound {
  private clips: ActiveClip[] = [];
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private paused = false;
  private readonly base: string;

  constructor(base: string) {
    this.base = base;
  }

  /** Plays a span of a recording (see ClipSpec). A religious clip first fades out any other. */
  play(spec: ClipSpec): void {
    if (typeof Audio === "undefined") return;
    if (spec.religious) for (const c of this.clips) if (c.spec.religious) this.fadeAway(c, 0.3);
    const el = new Audio(spec.url ? spec.url() : `${this.base}${encodeURI(spec.path)}`);
    el.preload = "auto";
    el.volume = spec.fadeIn ? 0 : spec.volume;
    const clip: ActiveClip = { el, spec, frame: 0, ended: false, cap: 1 };
    this.clips.push(clip);
    const start = () => {
      try {
        el.currentTime = spec.from;
      } catch {
        // Not seekable yet: plays from the start of the file's span it has.
      }
      if (!this.paused) void el.play().catch(() => this.drop(clip));
      this.follow(clip);
    };
    if (el.readyState >= 1) start();
    else el.addEventListener("loadedmetadata", start, { once: true });
    el.addEventListener("ended", () => this.drop(clip), { once: true });
  }

  /** A very short click of filtered noise — a tap, a switch turning, a count. */
  touch(kind: TouchKind): void {
    const ctx = this.ensureContext();
    if (!ctx || this.paused) return;
    const t = TOUCH[kind];
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = t.hz;
    band.Q.value = t.q;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(t.gain, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t.ms / 1000);
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + t.ms / 1000 + 0.02);
  }

  /** The film paused (or hidden): every clip holds where it is. */
  pause(): void {
    this.paused = true;
    for (const c of this.clips) c.el.pause();
    void this.context?.suspend().catch(() => {});
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const c of this.clips) if (!c.ended) void c.el.play().catch(() => this.drop(c));
    void this.context?.resume().catch(() => {});
  }

  /** Sound off, Skip, the end: everything fades out quickly and stops. */
  stopAll(fade = 0.25): void {
    for (const c of [...this.clips]) this.fadeAway(c, fade);
  }

  dispose(): void {
    for (const c of [...this.clips]) this.drop(c);
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const Ctor = contextCtor();
    if (!Ctor) return null;
    try {
      this.context = new Ctor();
      const length = Math.ceil(this.context.sampleRate * 0.05);
      this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.context = null;
    }
    return this.context;
  }

  /** Volume follows the clip's own position: fade in after `from`, fade out before `to`, stop at `to`. */
  private follow(clip: ActiveClip): void {
    if (typeof window.requestAnimationFrame !== "function") return;
    const { el } = clip;
    const step = () => {
      if (clip.ended) return;
      const spec = clip.spec; // read each frame: a fade-out can be asked for while it plays
      const t = el.currentTime;
      const end = spec.to ?? (Number.isFinite(el.duration) ? el.duration : Infinity);
      if (t >= end) return this.drop(clip);
      let v = spec.volume;
      if (spec.fadeIn) v *= Math.min(1, Math.max(0, (t - spec.from) / spec.fadeIn));
      if (spec.fadeOut && end !== Infinity) v *= Math.min(1, Math.max(0, (end - t) / spec.fadeOut));
      v *= clip.cap;
      el.volume = Math.max(0, Math.min(1, v));
      clip.frame = window.requestAnimationFrame(step);
    };
    clip.frame = window.requestAnimationFrame(step);
  }

  private fadeAway(clip: ActiveClip, seconds: number): void {
    if (clip.ended) return;
    const t = clip.el.currentTime;
    // Already ending sooner than that: it simply finishes its own fade.
    if (clip.spec.to !== undefined && clip.spec.to - t <= seconds) return;
    // Ends `seconds` from where it is now, fading all the way down from its present level — never louder.
    clip.cap = clip.spec.volume > 0 ? Math.min(1, clip.el.volume / clip.spec.volume) : 0;
    clip.spec = { ...clip.spec, fadeIn: undefined, to: t + seconds, fadeOut: seconds };
    if (this.paused || seconds <= 0) this.drop(clip);
  }

  private drop(clip: ActiveClip): void {
    clip.ended = true;
    if (typeof window !== "undefined" && clip.frame) window.cancelAnimationFrame(clip.frame);
    try {
      clip.el.pause();
    } catch {
      // Already stopped.
    }
    this.clips = this.clips.filter((c) => c !== clip);
  }
}
