// DITHAR — which Quran ayahs ship as bundled (offline) recitation audio.
//
// Derived, never hand-listed: exactly the ayahs referenced by the Quranic
// Morning/Evening adhkar (their verified `quranRef`s in written-adhkar.ts),
// so the bundle can't drift from the content. Every reciter with a
// "bundled" audio source has one file per ayah here, at
// public/audio/quran/{reciterId}/{SSS}{AAA}.mp3 (quranAyahAudioPath) —
// quranAudioBundle.test.ts checks every file exists and nothing else is
// bundled.
import { writtenAdhkarItems } from "./written-adhkar";

export interface QuranAyah {
  surah: number;
  ayah: number;
}

/** "SSSAAA", the EveryAyah file stem (e.g. "002255" for 2:255). */
export function quranAyahFileStem(surah: number, ayah: number): string {
  return `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}`;
}

/** Path of one bundled ayah file, relative to the app's base URL (and, under "public/", the APK assets). */
export function quranAyahAudioPath(reciterId: string, surah: number, ayah: number): string {
  return `audio/quran/${reciterId}/${quranAyahFileStem(surah, ayah)}.mp3`;
}

/**
 * The reciter's own basmala, for a reciter whose basmala is "separate"
 * (quranReciters.ts says which of his own recordings it comes from).
 */
export function quranBasmalaAudioPath(reciterId: string): string {
  return `audio/quran/${reciterId}/basmala.mp3`;
}

/**
 * Whether the recitation of `surah:fromAyah…` is preceded by the basmala:
 * every one is (Ayat al-Kursi as well as the surahs), except al-Fatiha from
 * its first ayah (the basmala IS 1:1) and at-Tawbah from its start (it has
 * none).
 */
export function recitationHasBasmala(surah: number, fromAyah: number): boolean {
  return !(fromAyah === 1 && (surah === 1 || surah === 9));
}

function collectBundledAyahs(): QuranAyah[] {
  const seen = new Map<string, QuranAyah>();
  for (const item of [...writtenAdhkarItems.morning, ...writtenAdhkarItems.evening]) {
    const ref = item.quranRef;
    if (!ref) continue;
    for (let ayah = ref.fromAyah; ayah <= ref.toAyah; ayah += 1) seen.set(quranAyahFileStem(ref.surah, ayah), { surah: ref.surah, ayah });
  }
  return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

/** Every bundled ayah, in mushaf order. */
export const BUNDLED_QURAN_AYAHS: readonly QuranAyah[] = collectBundledAyahs();

const BUNDLED_STEMS = new Set(BUNDLED_QURAN_AYAHS.map((a) => quranAyahFileStem(a.surah, a.ayah)));

export function isQuranAyahBundled(surah: number, ayah: number): boolean {
  return BUNDLED_STEMS.has(quranAyahFileStem(surah, ayah));
}
