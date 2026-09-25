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
import type { QuranReciter } from "../data/quranReciters";
import type { QuranRef } from "./quranRef";
import { formatQuranRefKey, isValidQuranRef } from "./quranRef";
import { playUrlQueue } from "./audioEngine";
import type { PlayUrlQueueOptions } from "./audioEngine";

export type QuranAudioResolution =
  | { status: "ready"; reciterId: string; ref: QuranRef; urls: string[] }
  | { status: "unavailable"; reciterId: string; ref: QuranRef; reason: "reciter-unavailable" | "audio-source-not-configured" }
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
  }
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
