// DITHAR — Quran audio resolution.
//
//   QuranRef + selected reciter  →  actual audio source(s)
//
// The one place that knows how a reciter's audio is laid out. Callers never
// build Quran audio URLs themselves and never cache them: a URL list is
// resolved fresh, from the reciter passed in at that moment, every time
// playback starts — so a reciter change can't leave a stale source from
// the previous reciter behind (and QuranReciterProvider additionally stops
// any in-flight Quran playback when the reciter changes).
//
// Only a structurally valid QuranRef resolves. Content without a verified
// QuranRef (see quranRef.ts) gets "invalid-ref" — it is never mapped to an
// arbitrary ayah.
//
// A "bundled" reciter plays the app's own offline copies of the EveryAyah
// files (quranAudioBundle.ts); a ref reaching outside the bundle is
// "ayah-not-bundled" — never a guessed path or a network fallback.
//
// Basmala: every recitation starts with the reciter's OWN basmala, and
// every repetition plays the same files, so each repetition starts with it
// (QuranBasmala in quranReciters.ts) — never between ayahs.
import type { QuranReciter } from "../data/quranReciters";
import { isQuranAyahBundled, quranAyahAudioPath, quranBasmalaAudioPath, recitationHasBasmala } from "../data/quranAudioBundle";
import type { QuranRef } from "./quranRef";
import { formatQuranRefKey, isValidQuranRef } from "./quranRef";
import { playUrlQueue } from "./audioEngine";
import type { PlayUrlQueueOptions } from "./audioEngine";
import { playableAudioPath } from "./audioAssets";

/** How repetitions after the first play: these files, the first one from `startAt` seconds. */
export interface QuranRepeatPlayback {
  urls: string[];
  startAt: number;
}

export type QuranAudioResolution =
  | { status: "ready"; reciterId: string; ref: QuranRef; urls: string[]; repeat?: QuranRepeatPlayback }
  | { status: "unavailable"; reciterId: string; ref: QuranRef; reason: "reciter-unavailable" | "audio-source-not-configured" | "ayah-not-bundled" }
  | { status: "invalid-ref"; reciterId: string };

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function joinUrl(base: string, file: string): string {
  return base.endsWith("/") ? `${base}${file}` : `${base}/${file}`;
}

export function resolveQuranAudio(ref: QuranRef | null | undefined, reciter: QuranReciter): QuranAudioResolution {
  if (!isValidQuranRef(ref)) return { status: "invalid-ref", reciterId: reciter.id };
  if (!reciter.available) return { status: "unavailable", reciterId: reciter.id, ref, reason: "reciter-unavailable" };

  const source = reciter.audio;
  switch (source.kind) {
    case "unconfigured":
      return { status: "unavailable", reciterId: reciter.id, ref, reason: "audio-source-not-configured" };
    case "per-ayah": {
      const urls: string[] = [];
      for (let ayah = ref.fromAyah; ayah <= ref.toAyah; ayah += 1) {
        urls.push(joinUrl(source.baseUrl, `${pad3(ref.surah)}${pad3(ayah)}.${source.extension}`));
      }
      return { status: "ready", reciterId: reciter.id, ref, urls };
    }
    case "bundled": {
      const audio = bundledQuranAudio(ref, reciter);
      if (!audio) return { status: "unavailable", reciterId: reciter.id, ref, reason: "ayah-not-bundled" };
      const url = (p: string) => `${import.meta.env.BASE_URL}${encodeURI(playableAudioPath(p))}`;
      const urls = audio.paths.map(url);
      if (!audio.repeat) return { status: "ready", reciterId: reciter.id, ref, urls };
      return { status: "ready", reciterId: reciter.id, ref, urls, repeat: { urls: audio.repeat.paths.map(url), startAt: audio.repeat.startAt } };
    }
  }
}

/** A bundled recitation: the first repetition's files, and — when it differs — how later repetitions play. */
export interface BundledQuranAudio {
  paths: string[];
  repeat?: { paths: string[]; startAt: number };
}

/**
 * The bundled files for `ref` with a "bundled" reciter (relative to the
 * app's base URL = under "public/" in the APK) — the reciter's own basmala
 * first, then the ayahs; played the same on every repetition — or null when
 * the reciter isn't bundled or an ayah of the ref isn't in the bundle.
 */
export function bundledQuranAudio(ref: QuranRef | null | undefined, reciter: QuranReciter): BundledQuranAudio | null {
  const ayahs = bundledQuranAudioPaths(ref, reciter);
  if (!ayahs || !ref || reciter.audio.kind !== "bundled") return null;
  if (!recitationHasBasmala(ref.surah, ref.fromAyah)) return { paths: ayahs };
  const basmala = reciter.audio.basmala;
  switch (basmala.kind) {
    case "none":
      return { paths: ayahs };
    case "in-first-ayah":
      // His first-ayah file already opens with his own basmala: nothing to add.
      if (ref.fromAyah === 1 && basmala.ayahStartsAt[ref.surah] !== undefined) return { paths: ayahs };
      return { paths: [quranBasmalaAudioPath(reciter.id), ...ayahs] };
    case "separate":
      return { paths: [quranBasmalaAudioPath(reciter.id), ...ayahs] };
  }
}

/**
 * The bundled AYAH files for `ref` with a "bundled" reciter, one per ayah
 * in order (no basmala — see bundledQuranAudio), relative to the app's base
 * URL — or null when the reciter isn't bundled or any ayah of the ref
 * isn't in the bundle.
 */
export function bundledQuranAudioPaths(ref: QuranRef | null | undefined, reciter: QuranReciter): string[] | null {
  if (!isValidQuranRef(ref) || reciter.audio.kind !== "bundled") return null;
  const paths: string[] = [];
  for (let ayah = ref.fromAyah; ayah <= ref.toAyah; ayah += 1) {
    if (!isQuranAyahBundled(ref.surah, ayah)) return null;
    paths.push(quranAyahAudioPath(reciter.id, ref.surah, ayah));
  }
  return paths;
}

/** Engine key for a Quran playback — reciter-specific, so two reciters' sessions never look alike. */
export function quranAudioKey(reciterId: string, ref: QuranRef): string {
  return `quran:${reciterId}:${formatQuranRefKey(ref)}`;
}

/**
 * Resolves `ref` for `reciter` and, only when it resolves to real audio,
 * starts it on the shared engine's "quran" channel (stopping any other
 * audio first). Always returns the resolution so the caller can show an
 * "unavailable" state instead of silently doing nothing.
 */
export function playQuranRef(
  ref: QuranRef | null | undefined,
  reciter: QuranReciter,
  options?: PlayUrlQueueOptions,
): QuranAudioResolution {
  const resolution = resolveQuranAudio(ref, reciter);
  if (resolution.status === "ready") {
    playUrlQueue("quran", quranAudioKey(resolution.reciterId, resolution.ref), resolution.urls, options);
  }
  return resolution;
}
