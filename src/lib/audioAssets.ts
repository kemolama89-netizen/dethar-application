// Which file plays for a bundled recording: the original, or — only in a build
// made with VITE_AUDIO_VARIANT=optimized (npm run build:android:optimized) —
// its smaller verified copy.
//
// The originals under public/audio are never changed and stay the default:
// every normal build (the web app, `npm run build`) plays them exactly as
// before. The copies (audio-optimized/, Ogg Opus) were made and checked by
// scripts/audio/optimize-audio.py — sample-aligned with the original, the same
// length, objective quality checks passed — and src/data/audioOptimized.json
// lists only the copies that passed. The optimized build puts each listed copy
// in the bundle in place of its original (scripts/audio/apply-optimized-audio.mjs).
//
// Everything else keeps the ORIGINAL path: the catalogues, the measured
// durations (src/data/audioDurations.json), favourites and history. Only the
// last step — the URL the WebView loads, or the APK asset native plays — goes
// through playableAudioPath, so rolling back is a normal build.
import optimized from "../data/audioOptimized.json";

const COPIES: Readonly<Record<string, string>> = optimized;

/** Whether this build plays the optimized copies. */
export const AUDIO_VARIANT: "original" | "optimized" = import.meta.env.VITE_AUDIO_VARIANT === "optimized" ? "optimized" : "original";

/**
 * The file to play for a recording at `path` (relative to the app's base URL,
 * e.g. "audio/adhan/….mp3"): its copy in an optimized build, else itself.
 */
export function playableAudioPath(path: string, variant: "original" | "optimized" = AUDIO_VARIANT): string {
  return variant === "optimized" ? (COPIES[path] ?? path) : path;
}

const ORIGINALS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(COPIES).map(([o, c]) => [c, o]));

/** The original recording a played path stands for (itself when it isn't a copy) — for lookups keyed by the original. */
export function originalAudioPath(path: string): string {
  return ORIGINALS[path] ?? path;
}
