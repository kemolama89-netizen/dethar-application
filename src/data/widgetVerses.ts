// Short, self-contained Qur'anic verses for the home-screen widget (and
// reminders) — hope, mercy, patience, gratitude, repentance, remembrance and
// everyday good — each readable at a glance and complete as a whole verse.
//
// SOURCE: every `sourceTextAr` and `meaningEn` was fetched from the quran.com
// API v4 on 2026-10-16 (`/verses/by_key/<key>?fields=text_imlaei&translations=20`)
// and generated into this file by a script, not typed by hand:
//   - Arabic: quran.com «text_imlaei» (standard script with full diacritics).
//   - English: Saheeh International (quran.com translation 20). Footnote
//     markers were removed; a quotation mark left open or closed by a
//     neighbouring verse was dropped; a trailing comma (the sentence
//     continues in the next verse) is shown as "…".
// `textAr` is `sourceTextAr` with ONLY the waqf (pause) marks ۖ ۗ ۚ (U+06D6–
// U+06DC) and the space before them removed: on their own after a space
// Android draws them on a dotted circle in the widget. Letters and
// diacritics are unchanged (widgetVerses.test.ts checks this against
// `sourceTextAr`).
//
// The `comments` are DITHAR's own editorial reminders — never Qur'an,
// never Hadith — and are always shown under their own label.
//
// Everything here is NEW content: it stays "pending" (unpublished) until a
// reviewer approves it in the Religious Content Review screen
// (lib/contentReview.ts newContentIds).
import type { EditorialComment } from "./widgetContent";

export type WidgetVerseTopic = "mercy" | "hope" | "remembrance" | "gratitude" | "patience" | "repentance" | "trust" | "everyday";

export interface WidgetVerse {
  id: string;
  /** "<surah>:<ayah>". */
  verseKey: string;
  textAr: string;
  sourceTextAr: string;
  meaningEn: string;
  sourceAr: string;
  sourceEn: string;
  topic: WidgetVerseTopic;
  url: string;
  comments: EditorialComment[];
}

export const WIDGET_VERSE_SOURCE_CHECK = "quran.com API v4 — text_imlaei (Arabic) and Saheeh International (translation 20), fetched 2026-10-16";

export const WIDGET_VERSES: readonly WidgetVerse[] = [
  {
    id: "hope-mercy-39-53",
    verseKey: "39:53",
    textAr: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ",
    meaningEn: "Say, \"O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allāh. Indeed, Allāh forgives all sins. Indeed, it is He who is the Forgiving, the Merciful.\"",
    sourceAr: "القرآن الكريم — سورة الزمر، الآية 53",
    sourceEn: "The Qur'an — Surah az-Zumar, 39:53",
    topic: "mercy",
    url: "https://quran.com/39:53",
    comments: [{ id: "widget-verse:hope-mercy-39-53:c1", style: "reflection", ar: "مهما ثقلت ذنوبك، فباب الرحمة أوسع منها.", en: "However heavy your sins feel, the door of mercy is wider." }],
  },
  {
    id: "ease-94-6",
    verseKey: "94:6",
    textAr: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    meaningEn: "Indeed, with hardship [will be] ease.",
    sourceAr: "القرآن الكريم — سورة الشرح، الآية 6",
    sourceEn: "The Qur'an — Surah ash-Sharh, 94:6",
    topic: "hope",
    url: "https://quran.com/94:6",
    comments: [{ id: "widget-verse:ease-94-6:c1", style: "reflection", ar: "الضيق الذي تمرّ به ليس النهاية؛ اليسر معه.", en: "The hardship you are in is not the end — ease comes with it." }],
  },
  {
    id: "remember-2-152",
    verseKey: "2:152",
    textAr: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    meaningEn: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.",
    sourceAr: "القرآن الكريم — سورة البقرة، الآية 152",
    sourceEn: "The Qur'an — Surah al-Baqarah, 2:152",
    topic: "remembrance",
    url: "https://quran.com/2:152",
    comments: [{ id: "widget-verse:remember-2-152:c1", style: "reflection", ar: "ذِكرٌ قليل منك الآن يقابله ذِكرُ الله لك.", en: "A moment of remembrance from you is met by Allah's remembrance of you." }],
  },
  {
    id: "hearts-13-28",
    verseKey: "13:28",
    textAr: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    meaningEn: "Those who have believed and whose hearts are assured by the remembrance of Allāh. Unquestionably, by the remembrance of Allāh hearts are assured.",
    sourceAr: "القرآن الكريم — سورة الرعد، الآية 28",
    sourceEn: "The Qur'an — Surah ar-Ra'd, 13:28",
    topic: "remembrance",
    url: "https://quran.com/13:28",
    comments: [{ id: "widget-verse:hearts-13-28:c1", style: "reflection", ar: "إن أتعبك القلق، فجرّب الذكر قبل أي شيء.", en: "When worry tires you, try remembrance first." }],
  },
  {
    id: "gratitude-14-7",
    verseKey: "14:7",
    textAr: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ",
    meaningEn: "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.'",
    sourceAr: "القرآن الكريم — سورة إبراهيم، الآية 7",
    sourceEn: "The Qur'an — Surah Ibrahim, 14:7",
    topic: "gratitude",
    url: "https://quran.com/14:7",
    comments: [{ id: "widget-verse:gratitude-14-7:c1", style: "reflection", ar: "عُدّ نعمةً واحدة الآن، واشكر الله عليها.", en: "Name one blessing right now, and thank Allah for it." }],
  },
  {
    id: "patience-2-153",
    verseKey: "2:153",
    textAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    meaningEn: "O you who have believed, seek help through patience and prayer. Indeed, Allāh is with the patient.",
    sourceAr: "القرآن الكريم — سورة البقرة، الآية 153",
    sourceEn: "The Qur'an — Surah al-Baqarah, 2:153",
    topic: "patience",
    url: "https://quran.com/2:153",
    comments: [{ id: "widget-verse:patience-2-153:c1", style: "reflection", ar: "الصبر والصلاة: عونان قريبان في كل ضيق.", en: "Patience and prayer: two close helps in every difficulty." }],
  },
  {
    id: "hope-3-139",
    verseKey: "3:139",
    textAr: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    meaningEn: "So do not weaken and do not grieve, and you will be superior if you are [true] believers.",
    sourceAr: "القرآن الكريم — سورة آل عمران، الآية 139",
    sourceEn: "The Qur'an — Surah Al 'Imran, 3:139",
    topic: "hope",
    url: "https://quran.com/3:139",
    comments: [{ id: "widget-verse:hope-3-139:c1", style: "reflection", ar: "لا تدع الحزن يُطفئ يقينك.", en: "Do not let sadness put out your certainty." }],
  },
  {
    id: "patience-11-115",
    verseKey: "11:115",
    textAr: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    meaningEn: "And be patient, for indeed, Allāh does not allow to be lost the reward of those who do good.",
    sourceAr: "القرآن الكريم — سورة هود، الآية 115",
    sourceEn: "The Qur'an — Surah Hud, 11:115",
    topic: "patience",
    url: "https://quran.com/11:115",
    comments: [{ id: "widget-verse:patience-11-115:c1", style: "reflection", ar: "لا يضيع عند الله صبرٌ ولا إحسان، وإن لم يره أحد.", en: "No patience or good deed is lost with Allah, even if no one sees it." }],
  },
  {
    id: "repentance-4-110",
    verseKey: "4:110",
    textAr: "وَمَن يَعْمَلْ سُوءًا أَوْ يَظْلِمْ نَفْسَهُ ثُمَّ يَسْتَغْفِرِ اللَّهَ يَجِدِ اللَّهَ غَفُورًا رَّحِيمًا",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَمَن يَعْمَلْ سُوءًا أَوْ يَظْلِمْ نَفْسَهُ ثُمَّ يَسْتَغْفِرِ اللَّهَ يَجِدِ اللَّهَ غَفُورًا رَّحِيمًا",
    meaningEn: "And whoever does a wrong or wrongs himself but then seeks forgiveness of Allāh will find Allāh Forgiving and Merciful.",
    sourceAr: "القرآن الكريم — سورة النساء، الآية 110",
    sourceEn: "The Qur'an — Surah an-Nisa', 4:110",
    topic: "repentance",
    url: "https://quran.com/4:110",
    comments: [{ id: "widget-verse:repentance-4-110:c1", style: "reflection", ar: "الاستغفار طريق مفتوح في كل وقت.", en: "Seeking forgiveness is a road open at every hour." }],
  },
  {
    id: "dhikr-33-41",
    verseKey: "33:41",
    textAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا",
    meaningEn: "O you who have believed, remember Allāh with much remembrance",
    sourceAr: "القرآن الكريم — سورة الأحزاب، الآية 41",
    sourceEn: "The Qur'an — Surah al-Ahzab, 33:41",
    topic: "remembrance",
    url: "https://quran.com/33:41",
    comments: [{ id: "widget-verse:dhikr-33-41:c1", style: "reflection", ar: "خصّص لحظة من يومك الآن لذكر الله.", en: "Set aside one moment of your day, now, to remember Allah." }],
  },
  {
    id: "blessings-16-18",
    verseKey: "16:18",
    textAr: "وَإِن تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا إِنَّ اللَّهَ لَغَفُورٌ رَّحِيمٌ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَإِن تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا ۗ إِنَّ اللَّهَ لَغَفُورٌ رَّحِيمٌ",
    meaningEn: "And if you should count the favors of Allāh, you could not enumerate them. Indeed, Allāh is Forgiving and Merciful.",
    sourceAr: "القرآن الكريم — سورة النحل، الآية 18",
    sourceEn: "The Qur'an — Surah an-Nahl, 16:18",
    topic: "gratitude",
    url: "https://quran.com/16:18",
    comments: [{ id: "widget-verse:blessings-16-18:c1", style: "reflection", ar: "نِعم الله أكثر من أن تُعدّ، فابدأ بشكر واحدة.", en: "Allah's blessings are beyond counting — begin by thanking Him for one." }],
  },
  {
    id: "repentance-42-25",
    verseKey: "42:25",
    textAr: "وَهُوَ الَّذِي يَقْبَلُ التَّوْبَةَ عَنْ عِبَادِهِ وَيَعْفُو عَنِ السَّيِّئَاتِ وَيَعْلَمُ مَا تَفْعَلُونَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَهُوَ الَّذِي يَقْبَلُ التَّوْبَةَ عَنْ عِبَادِهِ وَيَعْفُو عَنِ السَّيِّئَاتِ وَيَعْلَمُ مَا تَفْعَلُونَ",
    meaningEn: "And it is He who accepts repentance from His servants and pardons misdeeds, and He knows what you do.",
    sourceAr: "القرآن الكريم — سورة الشورى، الآية 25",
    sourceEn: "The Qur'an — Surah ash-Shura, 42:25",
    topic: "repentance",
    url: "https://quran.com/42:25",
    comments: [{ id: "widget-verse:repentance-42-25:c1", style: "reflection", ar: "التوبة لا تحتاج موعدًا؛ ابدأها الآن.", en: "Repentance needs no appointment — begin it now." }],
  },
  {
    id: "striving-29-69",
    verseKey: "29:69",
    textAr: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ",
    meaningEn: "And those who strive for Us - We will surely guide them to Our ways. And indeed, Allāh is with the doers of good.",
    sourceAr: "القرآن الكريم — سورة العنكبوت، الآية 69",
    sourceEn: "The Qur'an — Surah al-'Ankabut, 29:69",
    topic: "hope",
    url: "https://quran.com/29:69",
    comments: [{ id: "widget-verse:striving-29-69:c1", style: "reflection", ar: "كل خطوة صادقة نحو الله يقابلها هداية.", en: "Every sincere step toward Allah is met with guidance." }],
  },
  {
    id: "trust-64-11",
    verseKey: "64:11",
    textAr: "مَا أَصَابَ مِن مُّصِيبَةٍ إِلَّا بِإِذْنِ اللَّهِ وَمَن يُؤْمِن بِاللَّهِ يَهْدِ قَلْبَهُ وَاللَّهُ بِكُلِّ شَيْءٍ عَلِيمٌ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "مَا أَصَابَ مِن مُّصِيبَةٍ إِلَّا بِإِذْنِ اللَّهِ ۗ وَمَن يُؤْمِن بِاللَّهِ يَهْدِ قَلْبَهُ ۚ وَاللَّهُ بِكُلِّ شَيْءٍ عَلِيمٌ",
    meaningEn: "No disaster strikes except by permission of Allāh. And whoever believes in Allāh - He will guide his heart. And Allāh is Knowing of all things.",
    sourceAr: "القرآن الكريم — سورة التغابن، الآية 11",
    sourceEn: "The Qur'an — Surah at-Taghabun, 64:11",
    topic: "patience",
    url: "https://quran.com/64:11",
    comments: [{ id: "widget-verse:trust-64-11:c1", style: "reflection", ar: "ما أصابك لم يكن خارج علم الله ورحمته.", en: "What befell you was never outside Allah's knowledge and mercy." }],
  },
  {
    id: "good-deeds-99-7",
    verseKey: "99:7",
    textAr: "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ",
    meaningEn: "So whoever does an atom's weight of good will see it…",
    sourceAr: "القرآن الكريم — سورة الزلزلة، الآية 7",
    sourceEn: "The Qur'an — Surah az-Zalzalah, 99:7",
    topic: "everyday",
    url: "https://quran.com/99:7",
    comments: [{ id: "widget-verse:good-deeds-99-7:c1", style: "reflection", ar: "العمل الصغير الصادق لا يضيع؛ فهو محفوظ لك.", en: "A small, sincere deed is never lost — it is kept for you." }],
  },
  {
    id: "ihsan-55-60",
    verseKey: "55:60",
    textAr: "هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ",
    meaningEn: "Is the reward for good [anything] but good?",
    sourceAr: "القرآن الكريم — سورة الرحمن، الآية 60",
    sourceEn: "The Qur'an — Surah ar-Rahman, 55:60",
    topic: "everyday",
    url: "https://quran.com/55:60",
    comments: [{ id: "widget-verse:ihsan-55-60:c1", style: "reflection", ar: "أحسِن اليوم إلى أحد، والجزاء عند الله أحسن.", en: "Do good to someone today; Allah's reward is better still." }],
  },
  {
    id: "forgiving-15-49",
    verseKey: "15:49",
    textAr: "نَبِّئْ عِبَادِي أَنِّي أَنَا الْغَفُورُ الرَّحِيمُ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "نَبِّئْ عِبَادِي أَنِّي أَنَا الْغَفُورُ الرَّحِيمُ",
    meaningEn: "[O Muḥammad], inform My servants that it is I who am the Forgiving, the Merciful…",
    sourceAr: "القرآن الكريم — سورة الحجر، الآية 49",
    sourceEn: "The Qur'an — Surah al-Hijr, 15:49",
    topic: "mercy",
    url: "https://quran.com/15:49",
    comments: [{ id: "widget-verse:forgiving-15-49:c1", style: "reflection", ar: "من أسماء ربك: الغفور الرحيم، فأقبِل عليه.", en: "Among your Lord's names are the Forgiving, the Merciful — so turn to Him." }],
  },
  {
    id: "reliance-9-51",
    verseKey: "9:51",
    textAr: "قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا هُوَ مَوْلَانَا وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا هُوَ مَوْلَانَا ۚ وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ",
    meaningEn: "Say, \"Never will we be struck except by what Allāh has decreed for us; He is our protector.\" And upon Allāh let the believers rely.",
    sourceAr: "القرآن الكريم — سورة التوبة، الآية 51",
    sourceEn: "The Qur'an — Surah at-Tawbah, 9:51",
    topic: "trust",
    url: "https://quran.com/9:51",
    comments: [{ id: "widget-verse:reliance-9-51:c1", style: "reflection", ar: "توكّل على الله، ثم اطمئن.", en: "Rely on Allah, then be at peace." }],
  },
  {
    id: "perseverance-3-200",
    verseKey: "3:200",
    textAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا وَرَابِطُوا وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُفْلِحُونَ",
    /** quran.com text_imlaei, as fetched (pause marks included). */
    sourceTextAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا وَرَابِطُوا وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُفْلِحُونَ",
    meaningEn: "O you who have believed, persevere and endure and remain stationed and fear Allāh that you may be successful.",
    sourceAr: "القرآن الكريم — سورة آل عمران، الآية 200",
    sourceEn: "The Qur'an — Surah Al 'Imran, 3:200",
    topic: "patience",
    url: "https://quran.com/3:200",
    comments: [{ id: "widget-verse:perseverance-3-200:c1", style: "reflection", ar: "الثبات اليومي الصغير هو طريق الفلاح.", en: "Small, steady perseverance each day is the road to success." }],
  },
];
