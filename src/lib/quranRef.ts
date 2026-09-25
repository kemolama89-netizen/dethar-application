// DITHAR — the one machine-readable Quran reference shape.
//
// Every piece of Quranic content that may ever play Quran audio (a Wamda
// verse, the Quranic Written Adhkar cards, the Quranic duas in the Misc
// library) points at the Quran through this type — never through a display
// string like "سورة البقرة، الآية 201". The Quran audio resolver
// (quranAudio.ts) accepts ONLY this shape, so content that has no QuranRef
// can never be mapped to an arbitrary ayah.
import { getSurahAyahCount } from "../data/quranSurahs";

export interface QuranRef {
  /** 1–114. */
  surah: number;
  /** 1-based, Hafs (Kufan) numbering — see quranSurahs.ts. */
  fromAyah: number;
  /** Inclusive; equal to `fromAyah` for a single ayah. */
  toAyah: number;
  /**
   * True when the displayed Arabic text is only PART of the referenced
   * ayah(s) (e.g. a Quranic dua quoted without the narrative that opens
   * its ayah). Per-ayah recitation audio always covers whole ayahs, so the
   * future player/UI needs this to decide how to present such an item —
   * it is never used to change which ayah is referenced.
   */
  excerpt?: boolean;
}

export function isValidQuranRef(ref: unknown): ref is QuranRef {
  if (!ref || typeof ref !== "object") return false;
  const { surah, fromAyah, toAyah, excerpt } = ref as Partial<QuranRef>;
  if (!Number.isInteger(surah) || !Number.isInteger(fromAyah) || !Number.isInteger(toAyah)) return false;
  const ayahCount = getSurahAyahCount(surah as number);
  if (ayahCount === undefined) return false;
  if ((fromAyah as number) < 1 || (toAyah as number) < (fromAyah as number) || (toAyah as number) > ayahCount) return false;
  if (excerpt !== undefined && typeof excerpt !== "boolean") return false;
  return true;
}

/** Stable string form, e.g. "2:255" or "20:25-26" — for keys/logging, never displayed. */
export function formatQuranRefKey(ref: QuranRef): string {
  return ref.fromAyah === ref.toAyah ? `${ref.surah}:${ref.fromAyah}` : `${ref.surah}:${ref.fromAyah}-${ref.toAyah}`;
}
