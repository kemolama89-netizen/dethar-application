// Placeholder / sample content for Phase 1 layout purposes.
// Prayer times, city, and citation text are static sample values only —
// to be replaced by a real data source in a later phase.
//
// Every user-facing string is bilingual: { ar, en }. Ordinary UI
// terminology (nav labels, section titles, prayer names) is translated
// with confidence. Religious content (the featured hadith, the hadith
// card, the Quranic insight) is handled more cautiously — see the
// per-field notes below. Where an English rendering is marked as not
// sourced from an approved in-project citation, treat it as a DRAFT
// pending your explicit sign-off, not as verified.

export type Language = "ar" | "en";

export const labels = {
  ar: {
    // The app name shown as text directly under the logo — MAIN 1/male
    // identity only (see LogoHeader.tsx): that logo artwork bakes in ONLY
    // the Arabic wordmark, unlike MAIN 2/female's artwork, which already
    // bakes in both "دثار" and "DITHAR" together. This label is what
    // supplies the missing English name in English UI without touching
    // the (untouchable) logo artwork itself.
    appName: "دِثار",
    insightTitle: "لطيفة قرآنية",
    hadithTitle: "حديث نبوي",
    hadithAttribution: "قال رسول الله ﷺ",
    prayerPanelTitle: "مواقيت الصلاة",
    city: "الكويت",
    hijriCalendar: "التقويم الهجري",
    prayerReminder: "تذكير الصلاة",
    shareInsight: "شارك اللطيفة",
    shareHadith: "شارك الحديث",
    readMore: "اقرأ المزيد",
    close: "إغلاق",
  },
  en: {
    appName: "Dithar",
    insightTitle: "Quranic Insight",
    hadithTitle: "Prophetic Hadith",
    hadithAttribution: "The Messenger of Allah ﷺ said:",
    prayerPanelTitle: "Prayer Times",
    city: "Kuwait",
    hijriCalendar: "Hijri Calendar",
    prayerReminder: "Prayer Reminder",
    shareInsight: "Share Insight",
    shareHadith: "Share Hadith",
    readMore: "Read more",
    close: "Close",
  },
};

export const navLabels = {
  ar: {
    settings: "الإعدادات",
    audioAdhkar: "الأذكار المسموعة",
    home: "الرئيسية",
    writtenAdhkar: "الأذكار المكتوبة",
    tasbih: "السبحة",
  },
  en: {
    settings: "Settings",
    audioAdhkar: "Audio Adhkar",
    home: "Home",
    writtenAdhkar: "Written Adhkar",
    tasbih: "Tasbeeh",
  },
};

// Featured quote directly under the logo — Sahih al-Bukhari 6407.
// Arabic wording is the verified, approved text and must not change.
// The English rendering is the standard, widely-published translation of
// this very well-known hadith (the wording is highly consistent across
// published English Sahih al-Bukhari translations) — provided as a DRAFT
// from general knowledge, not pulled from an in-project citation. Please
// verify it against your preferred authoritative source before treating
// it as final.
export const featuredQuote = {
  ar: {
    text: "مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لا يَذْكُرُ رَبَّهُ مَثَلُ الحَيِّ وَالمَيِّتِ",
    citation: "رواه البخاري (6407)",
  },
  en: {
    text: "The example of the one who remembers his Lord in comparison to the one who does not remember his Lord is that of the living compared to the dead.",
    citation: "Sahih al-Bukhari (6407)",
  },
};

// Quranic insight card — Quran 13:28. The Arabic is the approved text,
// unchanged. English translation is the approved Sahih International
// rendering (verbatim, as supplied) — attribution included in the
// citation since there's no separate attribution field in this data shape.
export const insightCardContent = {
  ar: {
    body: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    citation: "(الرعد: 28)",
  },
  en: {
    body: "Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.",
    citation: "(Quran 13:28 — Sahih International)",
  },
};

// Hadith card — same hadith as the featured quote (Sahih al-Bukhari 6407),
// also narrated in Sahih Muslim. Same draft-translation caveat as above.
export const hadithCardContent = {
  ar: {
    body: "«مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لَا يَذْكُرُ رَبَّهُ، مَثَلُ الْحَيِّ وَالْمَيِّتِ»",
    citation: "(رواه البخاري 6407، ومسلم 779)",
  },
  en: {
    body: "“The example of the one who remembers his Lord in comparison to the one who does not remember his Lord is that of the living compared to the dead.”",
    citation: "(Sahih al-Bukhari 6407, Sahih Muslim 779)",
  },
};

export type PrayerKey = "fajr" | "shuruq" | "dhuhr" | "asr" | "maghrib" | "isha";

export const prayerNames: Record<Language, Record<PrayerKey, string>> = {
  ar: {
    fajr: "الفجر",
    shuruq: "الشروق",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
  },
  en: {
    fajr: "Fajr",
    shuruq: "Sunrise",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
  },
};

// Times/order are language-independent data — only the displayed name
// (via prayerNames[language][key]) changes with language.
export const prayerTimes: { key: PrayerKey; value: string }[] = [
  { key: "isha", value: "19:22" },
  { key: "maghrib", value: "17:56" },
  { key: "asr", value: "15:30" },
  { key: "dhuhr", value: "11:54" },
  { key: "shuruq", value: "05:25" },
  { key: "fajr", value: "04:03" },
];
