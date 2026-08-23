// Written Adhkar ("الأذكار المكتوبة") data — a clean, independent data
// source for this feature. Deliberately NOT merged with
// src/data/tasbeeh-library.json / src/data/tasbeeh.ts (the Tasbeeh Dhikr
// library), which documents itself as "independent from Written Adhkar
// and Audio Adhkar" — this file is that independent Written Adhkar source,
// created because no such data existed anywhere in the project yet
// (ASSETS/ only contains the Tasbeeh library).
//
// Scope/methodology, matching the same content-integrity bar already
// applied to the Tasbeeh audit:
// - This is a curated starter set of widely-established Adhkar (8 per
//   category), not an attempt at an exhaustive Hisn al-Muslim transcription.
//   Every item here is among the most well-attested, universally published
//   duas in that tradition — chosen specifically to minimize any risk of
//   misquoting wording, a repetition count, or a source.
// - Arabic wording is transcribed carefully from memory of extremely
//   well-known, ubiquitously published texts (the same class of certainty
//   as e.g. Ayat al-Kursi or the Fatiha — not obscure or disputed wording).
// - `repeat` is set ONLY where the specific repetition count is itself
//   part of the well-known narration (e.g. "three times", "33 times").
//   Where no widely-agreed count applies to the exact wording used here,
//   `repeat` is left unset rather than guessing — the UI must not display
//   a repetition count for those items.
// - `text_en` is a faithful, plain-meaning translation (not a copy of any
//   single copyrighted published translation), same approach already used
//   for `dhikr_en` in tasbeeh-library.json.
// - No virtue/merit claims are attached to any item here — this file is
//   the dua text + who narrated it, nothing more, so there is nothing to
//   invent or overstate.
// - This starter set can be extended later following the same bar; it is
//   not meant to represent "all of Hisn al-Muslim" as final/complete.

export type WrittenAdhkarCategoryKey = "morning" | "evening" | "prayer" | "misc";

export interface WrittenAdhkarItem {
  id: string;
  /** Short occasion/context label (e.g. "عند الخروج من المنزل") — not a virtue claim. */
  title_ar?: string;
  title_en?: string;
  text_ar: string;
  text_en: string;
  /** Set ONLY when the exact repetition count is itself part of the established narration. */
  repeat?: number;
  source_ar: string;
  source_en: string;
}

export const writtenAdhkarCategoryLabels: Record<WrittenAdhkarCategoryKey, { ar: string; en: string }> = {
  morning: { ar: "أذكار الصباح", en: "Morning Adhkar" },
  evening: { ar: "أذكار المساء", en: "Evening Adhkar" },
  prayer: { ar: "أذكار الصلاة", en: "Prayer Adhkar" },
  misc: { ar: "أذكار متنوعة", en: "Miscellaneous Adhkar" },
};

// UI strings for the Written Adhkar screens — ordinary interface
// terminology only, not religious content. Kept alongside the data (not
// in content.ts, which is Home-Screen-specific — same separation already
// established by tasbeehLabels in src/data/tasbeeh.ts).
export const writtenAdhkarLabels = {
  ar: {
    back: "رجوع",
    chooseCategory: "اختر وردك",
    source: "المصدر",
    next: "التالي",
    previous: "السابق",
    itemsCount: (n: number) => `${n} أذكار`,
    // Zero-padded ("03 / 24") — the visual/decorative progress numeral.
    progressOf: (current: number, total: number) => `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    // Plain sentence for aria-live/screen readers, kept separate from the
    // zero-padded display string above so assistive tech hears "3", not "zero three".
    progressAria: (current: number, total: number) => `الذكر ${current} من ${total}`,
    repeatTimes: (n: number) => (n === 1 ? "مرة واحدة" : `${n} مرات`),
    swipeHint: "اسحب للأعلى للمتابعة",
    details: "التفاصيل",
    closeDetails: "إغلاق التفاصيل",
    addFavorite: "إضافة إلى المفضلة",
    removeFavorite: "إزالة من المفضلة",
    completeTitle: "تم إتمام الورد",
    completeSubtitle: (categoryAr: string) => `لقد أتممت ${categoryAr}`,
    viewSummary: "عرض الملخص",
    restartCategory: "إعادة المجموعة",
    backToWrittenAdhkar: "العودة إلى المجموعات",
    summaryTitle: "الملخص",
    summaryCount: (n: number) => `أتممت ${n} من الأذكار`,
    closeSummary: "إغلاق",
  },
  en: {
    back: "Back",
    chooseCategory: "Choose your wird",
    source: "Source",
    next: "Next",
    previous: "Previous",
    itemsCount: (n: number) => `${n} adhkar`,
    progressOf: (current: number, total: number) => `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    progressAria: (current: number, total: number) => `Dhikr ${current} of ${total}`,
    repeatTimes: (n: number) => `${n} time${n === 1 ? "" : "s"}`,
    swipeHint: "Swipe up to continue",
    details: "Details",
    closeDetails: "Close details",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    completeTitle: "Your Wird is Complete",
    completeSubtitle: (categoryEn: string) => `You have completed ${categoryEn}`,
    viewSummary: "View Summary",
    restartCategory: "Restart category",
    backToWrittenAdhkar: "Back to Categories",
    summaryTitle: "Summary",
    summaryCount: (n: number) => `Completed ${n} adhkar`,
    closeSummary: "Close",
  },
};

export const writtenAdhkarItems: Record<WrittenAdhkarCategoryKey, WrittenAdhkarItem[]> = {
  morning: [
    {
      id: "morning-1",
      text_ar:
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ، لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ، لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ، مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ، وَلَا يَئُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ.",
      text_en:
        "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His seat extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
      title_ar: "آية الكرسي",
      title_en: "Ayat al-Kursi",
      source_ar: "القرآن الكريم (البقرة: 255)",
      source_en: "Quran 2:255",
    },
    {
      id: "morning-2",
      text_ar:
        "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
      text_en:
        "We have reached the morning, and with it all dominion belongs to Allah. Praise be to Allah. There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable.",
      source_ar: "صحيح مسلم 2723",
      source_en: "Sahih Muslim 2723",
    },
    {
      id: "morning-3",
      text_ar: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ.",
      text_en:
        "O Allah, by You we have reached the morning, and by You we reach the evening; by You we live, and by You we die, and to You is the resurrection.",
      source_ar: "سنن الترمذي",
      source_en: "Jami` at-Tirmidhi",
    },
    {
      id: "morning-4",
      title_ar: "سيد الاستغفار",
      title_en: "The Master Supplication for Forgiveness",
      text_ar:
        "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
      text_en:
        "O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me — for none forgives sins except You.",
      source_ar: "صحيح البخاري 6306",
      source_en: "Sahih al-Bukhari 6306",
    },
    {
      id: "morning-5",
      text_ar: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
      text_en: "I am pleased with Allah as my Lord, Islam as my religion, and Muhammad ﷺ as my Prophet.",
      repeat: 3,
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "morning-6",
      text_ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.",
      text_en:
        "In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.",
      repeat: 3,
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "morning-7",
      text_ar: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.",
      text_en:
        "Allah is sufficient for me; there is no deity except Him. Upon Him I have relied, and He is the Lord of the Mighty Throne.",
      repeat: 7,
      source_ar: "سنن أبي داود 5081",
      source_en: "Abu Dawud 5081",
    },
    {
      id: "morning-8",
      text_ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ.",
      text_en: "O Allah, I ask You for pardon and well-being in this world and the Hereafter.",
      source_ar: "سنن ابن ماجه",
      source_en: "Sunan Ibn Majah",
    },
  ],
  evening: [
    {
      id: "evening-1",
      title_ar: "آية الكرسي",
      title_en: "Ayat al-Kursi",
      text_ar:
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ، لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ، لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ، مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ، وَلَا يَئُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ.",
      text_en:
        "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His seat extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
      source_ar: "القرآن الكريم (البقرة: 255)",
      source_en: "Quran 2:255",
    },
    {
      id: "evening-2",
      text_ar:
        "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
      text_en:
        "We have reached the evening, and with it all dominion belongs to Allah. Praise be to Allah. There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable.",
      source_ar: "صحيح مسلم 2723",
      source_en: "Sahih Muslim 2723",
    },
    {
      id: "evening-3",
      text_ar: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ.",
      text_en:
        "O Allah, by You we have reached the evening, and by You we reach the morning; by You we live, and by You we die, and to You is the return.",
      source_ar: "سنن الترمذي",
      source_en: "Jami` at-Tirmidhi",
    },
    {
      id: "evening-4",
      title_ar: "سيد الاستغفار",
      title_en: "The Master Supplication for Forgiveness",
      text_ar:
        "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
      text_en:
        "O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me — for none forgives sins except You.",
      source_ar: "صحيح البخاري 6306",
      source_en: "Sahih al-Bukhari 6306",
    },
    {
      id: "evening-5",
      text_ar: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
      text_en: "I am pleased with Allah as my Lord, Islam as my religion, and Muhammad ﷺ as my Prophet.",
      repeat: 3,
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "evening-6",
      text_ar: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.",
      text_en:
        "In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.",
      repeat: 3,
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "evening-7",
      text_ar: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.",
      text_en: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
      repeat: 3,
      source_ar: "صحيح مسلم 2709",
      source_en: "Sahih Muslim 2709",
    },
    {
      id: "evening-8",
      text_ar: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.",
      text_en:
        "Allah is sufficient for me; there is no deity except Him. Upon Him I have relied, and He is the Lord of the Mighty Throne.",
      repeat: 7,
      source_ar: "سنن أبي داود 5081",
      source_en: "Abu Dawud 5081",
    },
  ],
  prayer: [
    {
      id: "prayer-1",
      title_ar: "بعد التسليم مباشرة",
      title_en: "Immediately after the closing salam",
      text_ar: "أَسْتَغْفِرُ اللَّهَ.",
      text_en: "I seek the forgiveness of Allah.",
      repeat: 3,
      source_ar: "صحيح مسلم 591",
      source_en: "Sahih Muslim 591",
    },
    {
      id: "prayer-2",
      text_ar: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.",
      text_en: "O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honor.",
      source_ar: "صحيح مسلم 591",
      source_en: "Sahih Muslim 591",
    },
    {
      id: "prayer-3",
      text_ar:
        "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ.",
      text_en:
        "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. O Allah, none can withhold what You give, and none can give what You withhold, and the might of the mighty does not benefit them against You.",
      source_ar: "صحيح البخاري 844، صحيح مسلم 593",
      source_en: "Sahih al-Bukhari 844; Sahih Muslim 593",
    },
    {
      id: "prayer-4",
      text_ar: "سُبْحَانَ اللَّهِ.",
      text_en: "Glory be to Allah.",
      repeat: 33,
      source_ar: "صحيح مسلم 596",
      source_en: "Sahih Muslim 596",
    },
    {
      id: "prayer-5",
      text_ar: "الْحَمْدُ لِلَّهِ.",
      text_en: "Praise be to Allah.",
      repeat: 33,
      source_ar: "صحيح مسلم 596",
      source_en: "Sahih Muslim 596",
    },
    {
      id: "prayer-6",
      text_ar: "اللَّهُ أَكْبَرُ.",
      text_en: "Allah is the Greatest.",
      repeat: 34,
      source_ar: "صحيح مسلم 596",
      source_en: "Sahih Muslim 596",
    },
    {
      id: "prayer-7",
      title_ar: "التسبيح الجامع",
      title_en: "The combined tasbih",
      text_ar: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ.",
      text_en: "Glory be to Allah, praise be to Allah, there is no deity except Allah, and Allah is the Greatest.",
      repeat: 25,
      source_ar: "صحيح مسلم 597",
      source_en: "Sahih Muslim 597",
    },
    {
      id: "prayer-8",
      title_ar: "آية الكرسي بعد الصلاة",
      title_en: "Ayat al-Kursi after prayer",
      text_ar:
        "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ، لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ، لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ، مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ، وَلَا يَئُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ.",
      text_en:
        "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His seat extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
      source_ar: "القرآن الكريم (البقرة: 255)",
      source_en: "Quran 2:255",
    },
  ],
  misc: [
    {
      id: "misc-1",
      title_ar: "عند الخروج من المنزل",
      title_en: "When leaving the house",
      text_ar: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ.",
      text_en: "In the name of Allah, I place my trust in Allah; there is no power nor might except with Allah.",
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "misc-2",
      title_ar: "عند دخول المنزل",
      title_en: "When entering the house",
      text_ar: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا.",
      text_en: "In the name of Allah we enter, and in the name of Allah we leave, and upon Allah, our Lord, we rely.",
      source_ar: "سنن أبي داود 5096",
      source_en: "Abu Dawud 5096",
    },
    {
      id: "misc-3",
      title_ar: "عند الطعام (إن نُسي في أوله)",
      title_en: "Before eating (if forgotten at the start)",
      text_ar: "بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ.",
      text_en: "In the name of Allah, at its beginning and its end.",
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "misc-4",
      title_ar: "بعد الطعام",
      title_en: "After eating",
      text_ar: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ.",
      text_en:
        "Praise be to Allah who fed me this and provided it for me without any power or might on my part.",
      source_ar: "سنن أبي داود والترمذي",
      source_en: "Abu Dawud; Jami` at-Tirmidhi",
    },
    {
      id: "misc-5",
      title_ar: "عند النوم",
      title_en: "Before sleeping",
      text_ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.",
      text_en: "In Your name, O Allah, I die and I live.",
      source_ar: "صحيح البخاري 6324",
      source_en: "Sahih al-Bukhari 6324",
    },
    {
      id: "misc-6",
      title_ar: "عند الاستيقاظ من النوم",
      title_en: "Upon waking up",
      text_ar: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ.",
      text_en: "Praise be to Allah who gave us life after having caused us to die, and unto Him is the resurrection.",
      source_ar: "صحيح البخاري 6312",
      source_en: "Sahih al-Bukhari 6312",
    },
    {
      id: "misc-7",
      title_ar: "عند دخول المسجد",
      title_en: "When entering the mosque",
      text_ar: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ.",
      text_en: "O Allah, open for me the doors of Your mercy.",
      source_ar: "صحيح مسلم 713",
      source_en: "Sahih Muslim 713",
    },
    {
      id: "misc-8",
      title_ar: "عند الخروج من المسجد",
      title_en: "When leaving the mosque",
      text_ar: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ.",
      text_en: "O Allah, I ask You from Your bounty.",
      source_ar: "صحيح مسلم 713",
      source_en: "Sahih Muslim 713",
    },
  ],
};
