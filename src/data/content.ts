// Placeholder / sample content for Phase 1 layout purposes.
// Prayer times, city, and citation text are static sample values only —
// to be replaced by a real data source in a later phase.

export const labels = {
  language: "العربية",
  insightTitle: "لطيفة قرآنية",
  hadithTitle: "حديث نبوي",
  hadithAttribution: "قال رسول الله ﷺ",
  prayerPanelTitle: "مواقيت الصلاة",
  city: "الكويت",
  hijriCalendar: "التقويم الهجري",
  prayerReminder: "تذكير الصلاة",
  shareInsight: "شارك اللطيفة",
  shareHadith: "شارك الحديث",
};

export const navLabels = {
  settings: "الإعدادات",
  audioAdhkar: "الأذكار الصوتية",
  home: "الرئيسية",
  writtenAdhkar: "الأذكار المكتوبة",
  tasbih: "السبحة",
};

export const featuredQuote = {
  // Verified wording of Sahih al-Bukhari 6407 — must not be paraphrased,
  // reworded, or merged with the Muslim narration.
  text: "مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لَا يَذْكُرُ، مَثَلُ الْحَيِّ وَالْمَيِّتِ",
  citation: "رواه البخاري (6407)",
};

export const insightCardContent = {
  body: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
  citation: "(الرعد: 28)",
};

export const hadithCardContent = {
  body: "«مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لَا يَذْكُرُ رَبَّهُ، مَثَلُ الْحَيِّ وَالْمَيِّتِ»",
  citation: "(رواه البخاري 6407، ومسلم 779)",
};

export type PrayerKey =
  | "fajr"
  | "shuruq"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha";

export const prayerTimes: { key: PrayerKey; label: string; value: string }[] =
  [
    { key: "isha", label: "العشاء", value: "19:22" },
    { key: "maghrib", label: "المغرب", value: "17:56" },
    { key: "asr", label: "العصر", value: "15:30" },
    { key: "dhuhr", label: "الظهر", value: "11:54" },
    { key: "shuruq", label: "الشروق", value: "05:25" },
    { key: "fajr", label: "الفجر", value: "04:03" },
  ];
