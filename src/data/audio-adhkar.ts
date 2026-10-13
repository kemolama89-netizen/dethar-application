// Audio Adhkar ("الأذكار المسموعة") content.
//
// Holds NO dhikr content of its own — every item comes from an existing
// library (Morning/Evening are the very same objects Written Adhkar shows),
// so the sections can never drift apart:
//
//   Morning  → writtenAdhkarItems.morning   (Written's Morning reader)
//   Evening  → writtenAdhkarItems.evening   (Written's Evening reader)
//   Various  → the Tasbeeh library's dhikr (dhikrItems), with their own
//              recordings (AUDIO_VARIOUS_RECORDINGS). Written's "Various"
//              Misc Library is unaffected.
//
// Prayer Adhkar are deliberately not part of Audio Adhkar.
import { writtenAdhkarItems } from "./written-adhkar";
import type { WrittenAdhkarItem } from "./written-adhkar";
import { dhikrItems, sourceAr } from "./tasbeeh";

export type AudioAdhkarCategoryKey = "morning" | "evening" | "misc";

export const AUDIO_ADHKAR_CATEGORY_ORDER: readonly AudioAdhkarCategoryKey[] = ["morning", "evening", "misc"];

export const audioAdhkarItems: Readonly<Record<"morning" | "evening", readonly WrittenAdhkarItem[]>> = {
  morning: writtenAdhkarItems.morning,
  evening: writtenAdhkarItems.evening,
};

// Audio "Various": the dhikr the Tasbeeh screen offers (minus the ids
// below), in the same order, read from its library so the wording can
// never drift.
export interface AudioVariousItem {
  /** "tasbeeh-<Tasbeeh id>" — stable, and distinct from every Written/Misc id. */
  id: string;
  text_ar: string;
  /** English meaning (Tasbeeh's `dhikr_en`). */
  text_en: string;
  transliteration_en: string;
  virtue_ar: string;
  virtue_en: string;
  source_ar: string;
  source_en: string;
  /** Path under public/ of its recording; absent while it has none. */
  audio?: string;
}

// Various recordings (ElevenLabs), keyed by Tasbeeh id. Each file was
// matched to its dhikr by its original filename — identical to the dhikr
// text once diacritics and punctuation are ignored — and its speech
// checked against that text; then renamed to an ASCII id, content
// unchanged (original names below). 14 was added later under its id name,
// its speech checked against the text. None exists for 13 (not listed).
// public/audio/audio-azkar/ياحي ياقيوم.mp3 matches no dhikr here and is
// not used.
export const AUDIO_VARIOUS_RECORDINGS: Readonly<Record<number, string>> = {
  1: "audio/audio-azkar/tasbeeh_01.mp3", // سبحان الله.mp3
  2: "audio/audio-azkar/tasbeeh_02.mp3", // سبحان الله وبحمده.mp3
  3: "audio/audio-azkar/tasbeeh_03.mp3", // سبحان الله والحمد لله.mp3
  4: "audio/audio-azkar/tasbeeh_04.mp3", // سبحان الله العظيم وبحمده.mp3
  5: "audio/audio-azkar/tasbeeh_05.mp3", // سبحان الله وبحمده سبحان الله العظيم.mp3
  6: "audio/audio-azkar/tasbeeh_06.mp3", // لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، … قَدِيرِ..mp3
  7: "audio/audio-azkar/tasbeeh_07.mp3", // لا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ.mp3
  8: "audio/audio-azkar/tasbeeh_08.mp3", // الْحَمْدُ لِلَّهِ.mp3
  9: "audio/audio-azkar/tasbeeh_09.mp3", // الْلَّهُم صَلِّي وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد.mp3
  10: "audio/audio-azkar/tasbeeh_10.mp3", // أستغفر الله.mp3
  11: "audio/audio-azkar/tasbeeh_11.mp3", // سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ.mp3
  12: "audio/audio-azkar/tasbeeh_12.mp3", // لَا إِلَهَ إِلَّا اللَّهُ.mp3
  14: "audio/audio-azkar/tasbeeh_14.mp3", // سُبْحَانَ اللَّهِ، … وَاللَّهُ أَكْبَرُ، اللَّهُمَّ اغْفِرْ لِي، اللَّهُمَّ ارْحَمْنِي، اللَّهُمَّ ارْزُقْنِي
  15: "audio/audio-azkar/tasbeeh_15.mp3", // الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ..mp3
  16: "audio/audio-azkar/tasbeeh_16.mp3", // اللَّهُ أَكْبَرُ كَبِيرًا ، … وَأَصِيلاً..mp3
};

// Tasbeeh dhikr left out of Audio "Various" only (Tasbeeh keeps them):
// 13 = the standalone «الله أكبر».
export const AUDIO_VARIOUS_EXCLUDED_TASBEEH_IDS: ReadonlySet<number> = new Set([13]);

export const AUDIO_VARIOUS_ITEMS: readonly AudioVariousItem[] = dhikrItems.filter((item) => !AUDIO_VARIOUS_EXCLUDED_TASBEEH_IDS.has(item.id)).map((item) => ({
  id: `tasbeeh-${item.id}`,
  text_ar: item.dhikr_ar,
  text_en: item.dhikr_en,
  transliteration_en: item.transliteration_en,
  virtue_ar: item.virtue_ar,
  virtue_en: item.virtue_en,
  source_ar: sourceAr[item.id] ?? "",
  source_en: item.source,
  ...(AUDIO_VARIOUS_RECORDINGS[item.id] ? { audio: AUDIO_VARIOUS_RECORDINGS[item.id] } : {}),
}));

// Lives with the player (which needs it) so the player and the scheduler
// don't pull this module — and the Misc Library dataset — into their chunks.
export { audioRepetitionTotal } from "../lib/audioAdhkarPlayer";
