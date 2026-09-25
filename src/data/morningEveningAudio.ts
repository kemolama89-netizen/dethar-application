// DITHAR — generated-audio manifest for Morning & Evening Adhkar.
//
// Lists the generated (non-Quran) audio files that actually exist, by
// audioId. The audio generation workflow adds an audioId here when it adds
// that file; the resolver (src/lib/morningEveningAudio.ts) reports every
// audioId not listed as "asset-not-generated" instead of requesting a file
// that isn't there.
//
// audioIds and files are derived, never hand-assigned (see
// getMorningEveningAudioAssets):
//   shared/{dhikrId}   → public/audio/adhkar/shared/{dhikrId}.mp3
//       the Morning and Evening item with this id speak exactly the same
//       text — one file serves both
//   morning/{dhikrId}  → public/audio/adhkar/morning/{dhikrId}.mp3
//   evening/{dhikrId}  → public/audio/adhkar/evening/{dhikrId}.mp3
//       the item exists in only one list, or its spoken text differs
//       between the two (e.g. أصبحنا / أمسينا)
//
// Quranic items (those with a `quranRef`) never appear here: they play
// through the selected Quran reciter.
//
export type MorningEveningCategory = "morning" | "evening";

export const GENERATED_MORNING_EVENING_AUDIO_IDS: readonly string[] = [
  "evening/morning_003", // أمسينا وأمسى الملك لله
  "shared/morning_005", // اللهم أنت ربي لا إله إلا أنت (سيد الاستغفار)
  "evening/morning_016", // أمسينا على فطرة الإسلام
];
