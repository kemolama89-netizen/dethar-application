import tasbeehLibraryJson from "./tasbeeh-library.json";

// The Tasbeeh Dhikr library — originally copied from
// ASSETS/dithar_tasbeeh_adhkar_bilingual_final.json into
// src/data/tasbeeh-library.json so it can be bundled (same pattern used for
// every other asset in this project). The ASSETS file itself is never
// touched. src/data/tasbeeh-library.json has since had a religious-content
// audit applied to its virtue/source fields only — dhikr wording is
// unchanged. Independent from any future Written Adhkar / Audio Adhkar data
// source — do not merge.
export interface DhikrItem {
  id: number;
  dhikr_ar: string;
  dhikr_en: string;
  transliteration_en: string;
  virtue_ar: string;
  virtue_en: string;
  source: string;
}

export const dhikrItems: DhikrItem[] = tasbeehLibraryJson.items;

// Arabic rendering of each item's `source` field, keyed by id. The JSON
// itself only carries one (English) `source` string — this is an additive
// translation layer, kept here rather than in the JSON, and must be kept in
// sync whenever a `source` value in the JSON changes. It translates ONLY
// bibliographic/citation metadata (collection titles such as Sahih
// al-Bukhari/Sahih Muslim and book/hadith numbers) — never Dhikr/Quran/
// Hadith wording itself. An empty string mirrors an item whose JSON
// `source`/virtue were cleared for lack of a confidently supported
// citation.
export const sourceAr: Record<number, string> = {
  1: "صحيح مسلم؛ رياض الصالحين 1431",
  2: "صحيح البخاري 6405؛ وردت صيغة مشابهة في روايات أخرى",
  3: "صحيح مسلم؛ رياض الصالحين 1413",
  4: "جامع الترمذي 3464",
  5: "صحيح البخاري وصحيح مسلم",
  6: "صحيح البخاري وصحيح مسلم؛ رياض الصالحين 1410",
  7: "صحيح البخاري وصحيح مسلم؛ رياض الصالحين 1443",
  8: "صحيح مسلم",
  9: "صحيح مسلم 408",
  10: "صحيح البخاري 6307؛ صحيح مسلم 2702",
  11: "صحيح مسلم 2137",
  12: "جامع الترمذي 3383 (حسّنه الألباني)",
  13: "",
  14: "",
  15: "صحيح البخاري 799",
  16: "صحيح مسلم 601",
};

// Tasbeeh screen UI strings — ordinary interface terminology only, not
// religious content. Kept in this separate file (not content.ts) since
// content.ts is Home-Screen-specific and untouched by this task.
export const tasbeehLabels = {
  ar: {
    reminder: "تمهّل في ذكرك، ودع قلبك وعقلك يسبق لسانك",
    target: "العدد المستهدف",
    targetPlaceholder: "اختياري",
    reset: "إعادة",
    incrementAria: "زيادة التسبيح",
    resetAria: "إعادة تعيين العداد",
    resetAll: "إعادة الكل",
    resetAllAria: "إعادة تعيين جميع عدادات الأذكار",
    resetAllConfirmTitle: "هل تريد إعادة تعيين جميع الأذكار؟",
    resetAllConfirmBody: "سيتم إعادة تعيين عداد كل ذكر إلى صفر، بما في ذلك الذكر الحالي. لن يتأثر أي إعداد آخر.",
    resetAllConfirmCancel: "إلغاء",
    resetAllConfirmConfirm: "إعادة تعيين الكل",
    targetReached: "تم الوصول للهدف",
    meaning: "المعنى",
    pronunciation: "النطق",
    virtueLabel: "الفضل",
    sourceLabel: "المصدر",
    voiceTasbeeh: "التسبيح الصوتي",
    voiceTasbeehAria: "تفعيل التسبيح الصوتي",
    voiceRequesting: "بانتظار إذن الميكروفون…",
    voiceListening: "جارٍ الاستماع…",
    voiceListeningFor: "استمع لِـ",
    voiceDenied: "تم رفض إذن الميكروفون. فعّله من إعدادات المتصفح للمتابعة.",
    voiceNoMic: "لم يتم العثور على ميكروفون.",
    voiceUnsupported: "التسبيح الصوتي غير مدعوم في هذا المتصفح.",
    voiceError: "تعذّر بدء التسبيح الصوتي.",
    audioSourceLabel: "مصدر الصوت",
    audioSourceAutomatic: "تلقائي",
    audioSourcePhone: "ميكروفون الهاتف",
    audioSourceHeadset: "سماعة الرأس / ميكروفون خارجي",
    audioSourceCaption:
      "يستخدم التسبيح الصوتي دائمًا الميكروفون الافتراضي الحالي لجهازك. لاستخدام سماعة متصلة، اجعلها الميكروفون الافتراضي من إعدادات البلوتوث/الصوت في جهازك.",
    audioSourceUnsupportedNote: "يستخدم التسبيح الصوتي دائمًا الميكروفون الافتراضي الحالي لجهازك.",
    audioSourceProbeChecking: "جارٍ التحقق…",
    audioSourceProbeFound: "تم الكشف عنه",
    audioSourceProbeNotFound: "غير متاح حاليًا",
  },
  en: {
    reminder: "Take your time in remembrance, and let your heart and mind lead your tongue.",
    target: "Target count",
    targetPlaceholder: "optional",
    reset: "Reset",
    incrementAria: "Increment count",
    resetAria: "Reset counter",
    resetAll: "Reset All",
    resetAllAria: "Reset all dhikr counters",
    resetAllConfirmTitle: "Reset all dhikr counters?",
    resetAllConfirmBody: "Every dhikr counter will be reset to zero, including the one you're currently reciting. No other settings will be affected.",
    resetAllConfirmCancel: "Cancel",
    resetAllConfirmConfirm: "Reset All",
    targetReached: "Target reached",
    meaning: "Meaning",
    pronunciation: "Pronunciation",
    virtueLabel: "Virtue",
    sourceLabel: "Source",
    voiceTasbeeh: "Voice Tasbeeh",
    voiceTasbeehAria: "Enable Voice Tasbeeh",
    voiceRequesting: "Waiting for microphone permission…",
    voiceListening: "Listening…",
    voiceListeningFor: "Listening for",
    voiceDenied: "Microphone permission was denied. Enable it in your browser settings to continue.",
    voiceNoMic: "No microphone was found.",
    voiceUnsupported: "Voice Tasbeeh isn't supported in this browser.",
    voiceError: "Couldn't start Voice Tasbeeh.",
    audioSourceLabel: "Audio source",
    audioSourceAutomatic: "Automatic",
    audioSourcePhone: "Phone microphone",
    audioSourceHeadset: "Headset / external microphone",
    audioSourceCaption:
      "Voice Tasbeeh always listens through your device's current default microphone. To use a connected headset, set it as your device's default mic in your Bluetooth/audio settings.",
    audioSourceUnsupportedNote: "Voice Tasbeeh always uses your device's current default microphone.",
    audioSourceProbeChecking: "Checking…",
    audioSourceProbeFound: "Detected",
    audioSourceProbeNotFound: "Not currently available",
  },
};
