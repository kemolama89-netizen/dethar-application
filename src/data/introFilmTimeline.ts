// The introduction's scenes and how long each one shows (components/IntroFilm.tsx).
import type { IntroSceneId } from "./introFilmLabels";
import type { ClipSpec, TouchKind } from "../lib/introFilmSound";
import { adhanRecordings } from "./adhanRecordings";
import { playableAudioPath } from "../lib/audioAssets";
import { adhanAudioUrl } from "../lib/adhanAudio";

export type IntroScene = { id: IntroSceneId; ms: number };

// About 70 seconds: the three original scenes, then the app's features, then the closing.
export const SCENES: IntroScene[] = [
  { id: "opening", ms: 4800 },
  { id: "prayer", ms: 5000 },
  { id: "quran", ms: 5600 },
  { id: "tafsir", ms: 3900 },
  { id: "journey", ms: 3700 },
  { id: "adhan", ms: 4100 },
  { id: "audio", ms: 7800 },
  { id: "written", ms: 3800 },
  { id: "tasbeeh", ms: 3900 },
  { id: "floating", ms: 4400 },
  { id: "widget", ms: 3900 },
  { id: "notify", ms: 3700 },
  { id: "daysoff", ms: 3800 },
  { id: "stats", ms: 3600 },
  { id: "looks", ms: 3900 },
  { id: "closing", ms: 4000 },
];

/** When the Mushaf's page turns (ms from the scene's start) — the animation and its paper sound. */
export const PAGE_TURN_AT = 3300;

/**
 * What sounds, and when (ms from the scene's start), once the viewer turns the sound on. The app's own
 * recordings only — the built-in adhan voice, the reciter's Basmala, the recorded adhkar — each kept to
 * its own scene, never two at once; and soft touches timed to the taps, switches and counts on screen.
 */
export type IntroCue = { at: number } & ({ clip: ClipSpec } | { touch: TouchKind } | { pageTurn: true });

// Sheikh Saad Al-Ghamdi's adhan — one of the app's own voices (adhanRecordings.ts), played from where the
// app plays it: a downloaded copy, the APK's file, or else the hosted file (lib/adhanAudio.ts).
const ADHAN = adhanRecordings.find((r) => r.id === "saad-ghamdi")!;
// Sheikh Mahmoud Khalil Al-Husary's Basmala — bundled with the app's Qur'an recitations.
const BASMALA = "audio/quran/husary-murattal/basmala.mp3";
// «سبحان الله وبحمده» (shared/morning_017, Morning Adhkar — a hundred times): short enough to be heard whole.
const MORNING_DHIKR = "audio/adhkar/shared/سبحان الله وبحمده.mp3";
const SUBHANALLAH = "audio/audio-azkar/tasbeeh_01.mp3"; // سبحان الله — a Miscellaneous dhikr
const counts = (from: number, n: number, every: number): IntroCue[] => Array.from({ length: n }, (_, i) => ({ at: from + i * every, touch: "count" as const }));

export const SCENE_SOUNDS: Partial<Record<IntroSceneId, IntroCue[]>> = {
  // The adhan's opening takbeer, from its own start, fading out gently as the Mushaf scene arrives — done
  // well before the Basmala (1.4 s into that scene), even if the file is slow to start.
  prayer: [{ at: 400, clip: { path: playableAudioPath(ADHAN.path), url: () => adhanAudioUrl(ADHAN), from: ADHAN.segments.takbeer!.start, to: ADHAN.segments.takbeer!.start + 5.2, fadeIn: 0.4, fadeOut: 1.2, volume: 0.35, religious: true } }],
  // The Basmala, complete, as the page appears; then the page turns.
  quran: [
    { at: 1400, clip: { path: playableAudioPath(BASMALA), from: 0, volume: 0.4, religious: true } },
    { at: PAGE_TURN_AT, pageTurn: true },
  ],
  tafsir: [{ at: 1500, touch: "tap" }],
  journey: [{ at: 1300, touch: "tap" }],
  adhan: [
    { at: 850, touch: "switch" },
    { at: 1900, touch: "tap" },
  ],
  // The Morning dhikr is heard whole; pause comes in the quiet between two repetitions, «متابعة» after it.
  // Later the Miscellaneous adhkar, back after the adhan pause, are heard again: «سبحان الله».
  audio: [
    { at: 100, clip: { path: playableAudioPath(MORNING_DHIKR), from: 0, volume: 0.4, religious: true } },
    { at: 2300, touch: "tap" },
    { at: 3000, touch: "tap" },
    { at: 5950, clip: { path: playableAudioPath(SUBHANALLAH), from: 0, volume: 0.4, religious: true } },
  ],
  written: [{ at: 700, touch: "tap" }, { at: 1500, touch: "count" }, { at: 2100, touch: "count" }],
  // One count each time the number changes (0→9 from 0.6 s, a step every 0.2 s), then the microphone.
  tasbeeh: [...counts(700, 9, 200), { at: 2400, touch: "switch" }],
  floating: [{ at: 700, touch: "tap" }, { at: 2000, touch: "tap" }, { at: 3300, touch: "tap" }],
  widget: [{ at: 1400, touch: "count" }, { at: 2800, touch: "tap" }],
  notify: [{ at: 1850, touch: "switch" }],
  daysoff: [{ at: 850, touch: "tap" }, { at: 1150, touch: "tap" }],
  looks: [{ at: 400, touch: "count" }, { at: 1000, touch: "count" }, { at: 1600, touch: "count" }, { at: 2200, touch: "count" }],
};
