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
// A recording that keeps its original (Arabic) file name lists that name in
// MORNING_EVENING_AUDIO_FILE_NAMES; it still lives in the audioId's folder
// (shared/, morning/ or evening/), and a shared one is still ONE file.
//
// Quranic items (those with a `quranRef`) never appear here: they play
// through the selected Quran reciter.
//
export type MorningEveningCategory = "morning" | "evening";

export const GENERATED_MORNING_EVENING_AUDIO_IDS: readonly string[] = [
  "morning/morning_003", // أصبحنا وأصبح الملك لله
  "evening/morning_003", // أمسينا وأمسى الملك لله
  "morning/morning_004", // اللهم بك أصبحنا
  "shared/morning_005",// اللهم أنت ربي لا إله إلا أنت (سيد الاستغفار)
  "morning/morning_006", // اللهم إني أصبحت أشهدك
  "morning/morning_007", // اللهم ما أصبح بي من نعمة
  "shared/morning_008", // اللهم عافني في بدني
  "shared/morning_009", // حسبي الله لا إله إلا هو
  "shared/morning_010", // اللهم إني أسألك العفو والعافية
  "shared/morning_011", // اللهم عالم الغيب والشهادة
  "shared/morning_012", // بسم الله الذي لا يضر مع اسمه شيء
  "shared/morning_013", // رضيت بالله ربا
  "morning/morning_015", // أصبحنا وأصبح الملك لله رب العالمين
  "morning/morning_016", // أصبحنا على فطرة الإسلام
  "evening/morning_016", // أمسينا على فطرة الإسلام
  "shared/morning_017", // سبحان الله وبحمده
  "shared/morning_018", // لا إله إلا الله وحده لا شريك له
  "morning/morning_020", // سبحان الله وبحمده عدد خلقه
  "shared/morning_023", // اللهم صل على محمد (الصلاة الإبراهيمية)
  "evening/evening_001", // أعوذ بكلمات الله التامات
];

/** audioId → file name, for recordings kept under their original name (default: `{dhikrId}.mp3`). */
export const MORNING_EVENING_AUDIO_FILE_NAMES: Readonly<Record<string, string>> = {
  "shared/morning_008": "اللهم عافني في بدني.mp3",
  "shared/morning_009": "حسبي الله.mp3",
  "shared/morning_010": "اللهم اني اسالك العفو و العافية.mp3",
  "shared/morning_011": "اللهم عالم الغيب والشهادة.mp3",
  "shared/morning_012": "بسم الله الذي لا يضر.mp3",
  "shared/morning_013": "رضيت بالله ربا.mp3",
  "shared/morning_017": "سبحان الله وبحمده.mp3",
  "shared/morning_018": "لا اله الا الله وحده لا شريك له.mp3",
  "shared/morning_023": "اللهم صل على محمد.mp3",
  "evening/evening_001": "اعوذ بكلمات التامات.mp3",
};
