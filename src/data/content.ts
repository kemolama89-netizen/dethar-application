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
import type { QuranRef } from "../lib/quranRef";

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
    prayerReminder: "تذكير الصلاة",
    // Prayer Reminder toggle + notification text (see usePrayerReminder.ts)
    // — deliberately separate from Settings > Reminders' own
    // notifications*/settings.ts strings: that feature is an unrelated
    // single daily Dhikr reminder, this one is Fajr/Dhuhr/Asr/Maghrib/Isha
    // reminders tied to the real calculated prayer times.
    prayerReminderUnavailableNote: "سيتم تفعيل الإشعارات الفعلية عند توفرها في هذا الإصدار.",
    prayerReminderNotificationTitle: "حان وقت الصلاة",
    // "{prayer}" is replaced with the localized prayer name (see
    // prayerNames below) — never concatenated by hand, so word order stays
    // grammatically correct in both languages.
    prayerReminderNotificationBody: "حان الآن وقت صلاة {prayer}",
    // Next Prayer + live countdown (see useNextPrayerCountdown.ts). "{h}"/
    // "{m}"/"{s}" are replaced with zero-padded numbers, "{s}" ticking live
    // every second.
    nextPrayerHeading: "الصلاة القادمة",
    nextPrayerCountdown: "متبقي {h} ساعة و {m} دقيقة و {s} ثانية",
    // Location-change confirmation prompt (see useLocationChangeDetector.ts
    // / LocationChangePrompt.tsx) — shown only when the device's own
    // timezone genuinely diverges from the active (non-manual) location,
    // never for ordinary GPS drift or a plain re-render. Confirming
    // updates the active location and recalculates Prayer Times;
    // declining changes nothing.
    locationChangeTitle: "يبدو أنك غيّرت موقعك",
    locationChangeBody: "يرجى تحديث موقعك لضبط مواقيت الصلاة.",
    locationChangeConfirm: "تحديث الموقع",
    locationChangeDecline: "ليس الآن",
    shareInsight: "شارك اللطيفة",
    shareHadith: "شارك الحديث",
    readMore: "اقرأ المزيد",
    close: "إغلاق",
    // Hadith card's SINGLE expand control (see App.tsx/InsightCard.tsx) —
    // pressing it opens the same full-content overlay (ContentModal) used
    // by the Quranic Insight card's `readMore` above, revealing the
    // complete Hadith text plus its takhrij/details together. Its
    // existence is governed by whether there's more text to reveal OR
    // details DATA exists for the current language (see
    // getHadithDetailFields in src/data/hadith.ts), never by how long the
    // Hadith text visually is. Closing happens via the overlay's own X
    // button, not by pressing this again — there's no separate "collapse"
    // label.
    showDetails: "إظهار المزيد",
    detailSource: "المصدر",
    detailReference: "رقم الحديث",
    detailGrade: "الدرجة",
    detailGradingSource: "مصدر التخريج",
    detailNarrator: "الراوي",
  },
  en: {
    appName: "Dithar",
    insightTitle: "Quranic Insight",
    hadithTitle: "Prophetic Hadith",
    hadithAttribution: "The Messenger of Allah ﷺ said:",
    prayerPanelTitle: "Prayer Times",
    prayerReminder: "Prayer Reminder",
    prayerReminderUnavailableNote: "Actual notifications will activate once available in this build.",
    prayerReminderNotificationTitle: "It's time to pray",
    prayerReminderNotificationBody: "It's now time for {prayer} prayer",
    nextPrayerHeading: "Next Prayer",
    nextPrayerCountdown: "{h} hours, {m} minutes and {s} seconds remaining",
    locationChangeTitle: "Your location appears to have changed.",
    locationChangeBody: "Please update your location to keep prayer times accurate.",
    locationChangeConfirm: "Update location",
    locationChangeDecline: "Not now",
    shareInsight: "Share Insight",
    shareHadith: "Share Hadith",
    readMore: "Read more",
    close: "Close",
    showDetails: "Show More",
    detailSource: "Source",
    detailReference: "Hadith No.",
    detailGrade: "Grade",
    detailGradingSource: "Grading Source",
    detailNarrator: "Narrator",
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
  // Established by the citation above ("الرعد: 28"). The Arabic body is
  // only the closing clause of 13:28, hence `excerpt`.
  quranRef: { surah: 13, fromAyah: 28, toAyah: 28, excerpt: true } satisfies QuranRef,
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

// The chronological COLUMN ORDER only — language-independent, and holds
// no time values (those are now calculated for real, see
// src/lib/prayerTimes.ts, rather than stored here as static placeholder
// strings). Fajr first, Isha last: PrayerTimesPanel's grid has no explicit
// direction override, so it inherits `dir` from <html> (see
// LanguageContext) and mirrors automatically the same way TopBar/BottomNav
// already do — the first array entry lands at the reading "start" edge,
// right in RTL (Arabic) and left in LTR (English). That's what puts Fajr
// on the right in Arabic and on the left in English, matching real-world
// prayer-time displays; storing this array in a different order would
// fight that automatic mirroring rather than use it.
export const prayerOrder: PrayerKey[] = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"];
