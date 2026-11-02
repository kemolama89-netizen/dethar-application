// The text a shared Ayah carries: Tanzil's Uthmani text WITH its pause marks,
// sajdah and rub-el-hizb signs, stored verbatim in
// src/data/quran/tanzil-quran-uthmani-marked.txt (see the README there).
//
// The Mushaf's pages are artwork, and the reader's own text file
// (lib/quranText.ts) was downloaded without those signs, so sharing from it
// lost them. This module is imported on demand: the ~1.4 MB text is its own
// chunk, loaded only when a verse is selected for sharing. Nothing here
// changes a character: each verse is exactly what follows "surah|ayah|" on its
// line, and the only thing left out is the basmala heading a surah, which is
// not part of its verse 1 (as in verseForSharing).
import markedRaw from "../data/quran/tanzil-quran-uthmani-marked.txt?raw";
import { parseQuranText, splitBasmala } from "./quranText";

let verses: readonly (readonly string[])[] | null = null;

/** VERSES[surah - 1][ayah - 1], parsed on first use. */
export function markedQuranVerses(): readonly (readonly string[])[] {
  return (verses ??= parseQuranText(markedRaw).verses);
}

/** A verse's complete marked text for sharing. Null for a verse that doesn't exist. */
export function markedVerseForSharing(surah: number, ayah: number): string | null {
  const text = markedQuranVerses()[surah - 1]?.[ayah - 1];
  if (!text) return null;
  return splitBasmala(surah, ayah, text)?.rest ?? text;
}
