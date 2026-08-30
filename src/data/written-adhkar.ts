// Written Adhkar ("الأذكار المكتوبة") data.
//
// Morning / Evening / Prayer are sourced from src/data/dithar-adhkar-cards.json
// (NOT the ASSETS staging file directly — that file is only a reference used
// when preparing this JSON, and is never imported by the app). This JSON has
// been hadith-reviewed and corrected against ASSETS/dithar_adhkar_cards_v1_staging.json
// and verified sourcing: it deliberately differs from that staging file in a
// few reviewed places (e.g. the Ayat al-Kursi card holds only the ayah itself,
// with no isti'adhah prefix; the three Quls are three independent cards, not
// one combined "المعوذات" card; several source_reference/hadith_grade values
// were corrected). Nothing here invents, rewrites, shortens, or completes
// missing Arabic text — see the per-field notes below for the few places that
// needed light, mechanical handling (stripping a bracketed editorial note, or
// reusing a card's own literal bracketed alternate wording).
//
// Misc ("أذكار وأدعية متفرقة") is UNCHANGED from the original curated set
// below — the integration spec explicitly defers Miscellaneous Adhkar to a
// later phase, so it still follows the original methodology: a curated
// starter set of widely-established Adhkar, Arabic transcribed carefully
// from memory of extremely well-known, ubiquitously published texts, and
// `text_en` a faithful, plain-meaning translation.

import stagingAdhkarData from "./dithar-adhkar-cards.json";

export type WrittenAdhkarCategoryKey = "morning" | "evening" | "prayer" | "misc";

// The five daily prayers — used ONLY to select which of a Dhikr's
// prayer-specific repetition counts applies (see `repeatByPrayer` below,
// and the prayer picker in WrittenAdhkarReader.tsx). Not a general
// "current prayer" concept used anywhere else in the app.
export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

// Which prayer(s) a post-prayer Dhikr actually applies to, per its own
// verified source — "all" (the default when omitted) for common Adhkar
// said after every obligatory prayer; a single PrayerName or a list of them
// for Adhkar the source specifically ties to one or more particular
// prayers (e.g. the Fajr-only knowledge/provision dua, or the "يحيي
// ويميت" formula said only after Fajr and Maghrib). This is the ONLY
// mechanism that decides whether a Dhikr is shown for a given prayer — see
// isInPrayerScope in WrittenAdhkarReader.tsx — never a UI-level filter
// bolted on separately from the data.
export type PrayerScope = "all" | PrayerName | PrayerName[];

export interface WrittenAdhkarItem {
  id: string;
  /** Short occasion/context label (e.g. "عند الخروج من المنزل") — not a virtue claim. */
  title_ar?: string;
  title_en?: string;
  text_ar: string;
  text_en: string;
  /** Set ONLY when the exact repetition count is itself part of the established narration. */
  repeat?: number;
  /**
   * For the small number of post-prayer Adhkar whose established repetition
   * count genuinely differs by which prayer was just performed (the three
   * Quls: 3 times after Fajr/Maghrib, once after Dhuhr/Asr/Isha) — when
   * present, this OVERRIDES `repeat` for whichever PrayerName the user has
   * selected (see the prayer picker in WrittenAdhkarReader.tsx). Absent for
   * every other item, which just uses the plain `repeat` above regardless
   * of prayer.
   */
  repeatByPrayer?: Record<PrayerName, number>;
  /**
   * Which prayer(s) this Dhikr is shown for — see the `PrayerScope` doc
   * comment above. Only meaningful for `category === "prayer"`; absent (or
   * "all") for every item in every other category, which are always shown
   * regardless of any prayer context.
   */
  prayerScope?: PrayerScope;
  source_ar: string;
  source_en: string;
  /**
   * Latin transliteration of `text_ar`, shown under the Arabic dhikr in
   * English mode (see WrittenAdhkarReader's DhikrCard) — same role as
   * `englishTransliteration` in misc-library.ts. Deliberately absent for
   * every item below: no reliable, already-verified transliteration source
   * exists for this dataset (unlike the Misc library, whose transliteration
   * came verbatim from the Master Content Library's own English
   * Integration Layer), and one is never auto-generated/invented here —
   * see this task's final report. The rendering already handles this being
   * undefined by simply omitting the section, exactly like Misc does for
   * its own few uncovered records.
   */
  transliteration_en?: string;
  /**
   * Set ONLY for the Salat al-Ibrahimiyyah card in Morning/Evening
   * (id "morning_023"): this dhikr has no religiously-prescribed fixed
   * count, so its ring counts upward with no target/maximum and a
   * separate external "Finish" button (outside the ring) is what actually
   * marks it done — see RepetitionRing/DhikrCard in WrittenAdhkarReader.tsx.
   * Absent (falsy) for every other item, which keep the normal
   * fixed-target ring behavior unchanged.
   */
  unboundedCount?: boolean;
}

export const writtenAdhkarCategoryLabels: Record<WrittenAdhkarCategoryKey, { ar: string; en: string }> = {
  morning: { ar: "أذكار الصباح", en: "Morning Adhkar" },
  evening: { ar: "أذكار المساء", en: "Evening Adhkar" },
  prayer: { ar: "أذكار الصلاة", en: "Prayer Adhkar" },
  misc: { ar: "أذكار وأدعية متفرقة", en: "Various Adhkar & Duas" },
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
    itemsCount: (n: number) => `${n} أذكار`,
    // Header subtitle above the journey progress line.
    dailyWird: "وردك اليومي",
    // Zero-padded ("٠٣ من ٠٨") — which dhikr the user is currently on.
    journeyProgress: (current: number, total: number) => `${String(current).padStart(2, "0")} من ${String(total).padStart(2, "0")}`,
    // Plain sentence for aria-live/screen readers.
    progressAria: (current: number, total: number) => `الذكر ${current} من ${total}`,
    repeatTimes: (n: number) => (n === 1 ? "مرة واحدة" : `${n} مرات`),
    // Small "of N" caption inside the repetition ring (e.g. "٢" over "من ٣").
    ofTarget: (n: number) => `من ${n}`,
    tapToIncrement: "اضغط لزيادة العدد",
    tapToConfirm: "اضغط للتأكيد",
    // Shown ONLY once every repetition is read and the ✓ is available —
    // replaces tapToIncrement/tapToConfirm for that state (never both at
    // once), so the user knows this tap moves them forward, not that it
    // starts anything or counts another repetition.
    tapToAdvance: "اضغط للانتقال",
    dhikrDone: "تم",
    journeyCompleteTitle: "أتممت وردك",
    // A short, standalone dua shown beneath the completion title — exact
    // wording as specified, not a virtue/merit claim.
    journeyCompleteDua: "تقبّل الله ذكرك",
    journeyCompleteSubtitle: (categoryAr: string) => `أتممت ${categoryAr} بحمد الله`,
    restartCategory: "إعادة الأذكار",
    backToWrittenAdhkar: "العودة إلى المجموعات",
    // Prayer picker — shown ONLY for the Prayer Adhkar category, since a
    // few of its Adhkar (the three Quls) have a repetition count that
    // genuinely differs by which prayer was just performed. Ordinary
    // interface terminology, not religious content.
    choosePrayer: "بعد أي صلاة؟",
    prayerFajr: "الفجر",
    prayerDhuhr: "الظهر",
    prayerAsr: "العصر",
    prayerMaghrib: "المغرب",
    prayerIsha: "العشاء",
    // Shown ONLY on the Salat al-Ibrahimiyyah card (id "morning_023") in
    // Morning/Evening — see `unboundedCount` in the WrittenAdhkarItem type.
    unboundedNote: "ليس لهذا الذكر عدد محدد، يمكنك تكراره ما شئت.",
    finishDhikr: "إنهاء",
    // Global search — across every Written Adhkar category (Morning,
    // Evening, Prayer) and the whole Miscellaneous/Various Adhkar library
    // together, see WrittenAdhkarSearchScreen.tsx.
    searchTitle: "البحث في الأذكار",
    searchAria: "البحث في جميع الأذكار المكتوبة",
    searchPlaceholder: "ابحث عن ذكر...",
    searchHint: "اكتب كلمة للبحث في جميع الأذكار المكتوبة",
    noResults: "لا توجد نتائج مطابقة",
  },
  en: {
    back: "Back",
    chooseCategory: "Choose your wird",
    source: "Source",
    itemsCount: (n: number) => `${n} adhkar`,
    dailyWird: "Your daily wird",
    journeyProgress: (current: number, total: number) => `${String(current).padStart(2, "0")} of ${String(total).padStart(2, "0")}`,
    progressAria: (current: number, total: number) => `Dhikr ${current} of ${total}`,
    repeatTimes: (n: number) => `${n} time${n === 1 ? "" : "s"}`,
    ofTarget: (n: number) => `of ${n}`,
    tapToIncrement: "Tap to count",
    tapToConfirm: "Tap to confirm",
    tapToAdvance: "Tap to continue",
    dhikrDone: "Done",
    journeyCompleteTitle: "You have completed your wird",
    journeyCompleteDua: "May Allah accept your remembrance",
    journeyCompleteSubtitle: (categoryEn: string) => `You have completed ${categoryEn}, alhamdulillah`,
    restartCategory: "Repeat these Adhkar",
    backToWrittenAdhkar: "Back to Categories",
    // Interface labels for the prayer picker (see the `ar` block above) —
    // added alongside it purely so the control itself isn't left blank in
    // English mode; no Written Adhkar CONTENT (title_en/text_en/source_en)
    // was touched for this task.
    choosePrayer: "Which prayer?",
    prayerFajr: "Fajr",
    prayerDhuhr: "Dhuhr",
    prayerAsr: "Asr",
    prayerMaghrib: "Maghrib",
    prayerIsha: "Isha",
    unboundedNote: "There is no fixed count for this dhikr — repeat it as many times as you wish.",
    finishDhikr: "Finish",
    searchTitle: "Search Adhkar",
    searchAria: "Search all Written Adhkar",
    searchPlaceholder: "Search for a dhikr...",
    searchHint: "Type a word to search across every Written Adhkar category",
    noResults: "No matching results",
  },
};

// ---------------------------------------------------------------------
// Morning / Evening / Prayer — built from dithar-adhkar-cards.json
// ---------------------------------------------------------------------

interface StagingCard {
  id: string;
  category: "morning" | "morning_evening" | "evening" | "prayer" | "daily";
  display_title_ar: string;
  arabic_source_text: string;
  count: number | null;
  source_reference: string;
  hadith_grade: string;
}

const stagingCards = stagingAdhkarData.cards as StagingCard[];

// The staging file documents an alternate morning/evening wording as a
// bracketed editorial note directly inside `arabic_source_text` (e.g.
// "[وإذا أمسى قال: ...]") rather than as its own field. Spec requires the
// app to show the correct wording per collection and NEVER show that
// literal bracketed instruction to the user, so it is always stripped
// before display — for every card, regardless of category.
function stripEveningNote(text: string): string {
  return text.replace(/\s*\[[^\]]*\]/g, "").trim();
}

// Of the staging ids tagged "morning_evening", most have IDENTICAL
// morning/evening wording (the text never references "morning" or
// "evening" at all — e.g. Ayat al-Kursi, Sayyid al-Istighfar) and need no
// override at all. morning_004 is the one id whose bracketed note already
// contains the FULL, untruncated alternate wording — reproduced here
// verbatim from that same bracket (never rewritten/re-voweled from
// memory). Its title is likewise taken verbatim from the opening of that
// same bracketed sentence.
const EVENING_TEXT_OVERRIDE: Record<string, string> = {
  morning_004: "اللَّهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.",
  // morning_003's own bracketed note gives two literal evening replacement
  // clauses (the opening "أمسينا وأمسى..." and the "رب أسألك خير ما في هذه
  // الليلة..." clause) — reproduced here verbatim from that same bracket;
  // the clauses the bracket does NOT replace (الكسل وسوء الكبر / عذاب النار
  // والقبر) carry no day/night reference at all, so they stay unchanged.
  morning_003:
    "((أمسينا وأمسى الملك للَّه، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رب أسألك خير ما في هذه الليلة، وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة، وشر ما بعدها، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ)).",
  // morning_006: the hadith's own wording covers both occasions in one
  // sentence ("من قال حين يصبح أو يمسي...") — only "أصبحتُ" becomes
  // "أمسيت" (per the card's own bracket), everything else in the body is
  // identical for both occasions.
  morning_006:
    "((اللَّهُمَّ إِنِّي أمسيت أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلاَئِكَتِكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلاَّ أَنْتَ وَحْدَكَ لاَ شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ)) (أربعَ مَرَّاتٍ).",
  // morning_015's bracket already contains the FULL, untruncated evening
  // sentence — reproduced verbatim from that same bracket.
  morning_015:
    "((أمسينا وأمسى الملك للَّه ربّ العالمين اللَّهم إني أسألك خير هذه الليلة: فتحها، ونصرها، ونورها، وبركتها، وهداها، وأعوذ بك من شر ما فيها، وشر ما بعدها.)).",
  // morning_007: same single-word substitution pattern as morning_006 —
  // "أَصْبَحَ" becomes "أمسى" (per the card's own bracket), rest identical.
  morning_007:
    "((اللَّهُمَّ مَا أمسى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ)).",
  // morning_016: only the opening "أَصْبَحْنا" becomes "أمسينا" — the rest of
  // the body (فطرة الإسلام / كلمة الإخلاص / دين نبينا محمد / ملة إبراهيم)
  // carries no day/night reference at all.
  morning_016:
    "((أمسينا عَلَى فِطْرَةِ الْإِسْلاَمِ، وَعَلَى كَلِمَةِ الْإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صلى الله عليه وسلم، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشرِكِينَ)).",
};
// 2026-08 correction pass: morning_018's Evening copy previously carried
// its own distinct (Abu Ayyash al-Zuraqi) narration here — that has been
// removed per the app owner's approved decision: Morning ×10 and Evening
// ×10 both use the SAME verified Abu Ayyub al-Ansari narration (Musnad
// Ahmad / Sunan an-Nasa'i al-Kubra / Sahih Ibn Hibban — see
// SHORT_SOURCE.morning_018 below), not two different narrators. With no
// entry here, Evening now falls through to the same title/text/repeat/
// source as Morning automatically (see toWrittenItem/eveningItems below).
const EVENING_TITLE_OVERRIDE: Record<string, string> = {
  morning_004: "اللَّهم بك أمسينا",
  morning_003: "أمسينا وأمسى الملك لله",
  morning_006: "اللهم إني أمسيت أشهدك",
  morning_015: "أمسينا وأمسى الملك لله رب العالمين",
  morning_007: "اللهم ما أمسى بي من نعمة",
  morning_016: "أمسينا على فطرة الإسلام",
};
// No ids currently need a different repeat count between Morning and
// Evening (see the morning_018 note above for why it was removed from
// here) — kept declared, empty, for the rare case a genuine one arises.
const EVENING_REPEAT_OVERRIDE: Record<string, number> = {};
// No ids currently need a different source between Morning and Evening
// (see the morning_018 note above) — kept declared, empty, for the rare
// case a genuine one arises.
const EVENING_SOURCE_OVERRIDE: Record<string, { ar: string; en: string }> = {};

// Every "morning_evening" id now has a confirmed evening wording — nothing
// left pending.
const EVENING_PENDING_IDS = new Set<string>([]);

// Additive English layer — kept here, never in the staging JSON, the same
// pattern already used for `sourceAr` in tasbeeh.ts. The staging dataset
// has no English fields yet; every string below is a faithful,
// plain-meaning translation of that same id's `arabic_source_text` (the
// "_evening" suffix keys translate the EVENING_TEXT_OVERRIDE variant
// above instead) — the Arabic itself is never altered by this layer, and
// no transliteration is included anywhere here (spec: never auto-generate
// transliteration from memory).
interface EnglishContent {
  title_en: string;
  text_en: string;
  /** See `WrittenAdhkarItem.transliteration_en` — optional, and not populated for any entry below yet. */
  transliteration_en?: string;
}

const ENGLISH_CONTENT: Record<string, EnglishContent> = {
  morning_001: {
    title_en: "Ayat al-Kursi",
    text_en:
      "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His seat extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    transliteration_en:
      "Allahu la ilaha illa huwal-Hayyul-Qayyoom. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa‘u ‘indahu illa bi'idhnih. Ya‘lamu ma bayna aydeehim wa ma khalfahum, wa la yuheetoona bishay'im-min ‘ilmihi illa bima sha'. Wasi‘a kursiyyuhus-samawati wal-ard, wa la ya'ooduhu hifdhuhuma, wa huwal-‘Aliyyul-‘Adheem.",
  },
  morning_002: {
    title_en: "Surah Al-Ikhlas",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "He is Allah, One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent." (three times)',
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul huwallahu Ahad. Allahus-Samad. Lam yalid wa lam yoolad. Wa lam yakul-lahu kufuwan ahad.",
  },
  morning_002b: {
    title_en: "Surah Al-Falaq",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "I seek refuge in the Lord of daybreak, from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies." (three times)',
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul a‘oodhu bi-Rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghaasiqin idha waqab. Wa min sharrin-naffaathaati fil-‘uqad. Wa min sharri haasidin idha hasad.",
  },
  morning_002c: {
    title_en: "Surah An-Nas",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer who whispers in the breasts of mankind, from among the jinn and mankind." (three times)',
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul a‘oodhu bi-Rabbin-naas. Malikin-naas. Ilaahin-naas. Min sharril-waswaasil-khannaas. Alladhi yuwaswisu fee sudoorin-naas. Minal-jinnati wan-naas.",
  },
  morning_003: {
    title_en: "We have reached the morning, and with it all dominion belongs to Allah (extended version)",
    text_en:
      "We have reached the morning, and with it all dominion belongs to Allah, and praise is for Allah. There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
    transliteration_en:
      "Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ‘ala kulli shay'in qadeer. Rabbi as'aluka khayra ma fee hadhal-yawmi wa khayra ma ba‘dah, wa a‘oodhu bika min sharri ma fee hadhal-yawmi wa sharri ma ba‘dah. Rabbi a‘oodhu bika minal-kasali wa soo'il-kibar. Rabbi a‘oodhu bika min ‘adhaabin fin-naari wa ‘adhaabin fil-qabr.",
  },
  morning_004: {
    title_en: "O Allah, by You we have reached the morning",
    text_en:
      "O Allah, by You we have reached the morning, and by You we reach the evening; by You we live, and by You we die, and to You is the resurrection.",
    transliteration_en: "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namootu wa ilaykan-nushoor.",
  },
  morning_004_evening: {
    title_en: "O Allah, by You we have reached the evening",
    text_en:
      "O Allah, by You we have reached the evening, and by You we reach the morning; by You we live, and by You we die, and to You is the return.",
    transliteration_en: "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namootu, wa ilaykal-maseer.",
  },
  morning_005: {
    title_en: "The Master Supplication for Forgiveness (Sayyid al-Istighfar)",
    text_en:
      "O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me — for none forgives sins except You.",
    // Identical wording to Misc library's own "sayyid-al-istighfar" (same
    // hadith, same text) — reusing that already-verified transliteration
    // verbatim rather than re-deriving a second one for the same Arabic.
    transliteration_en:
      "Allahumma anta rabbi la ilaha illa anta, khalaqtani wa ana ‘abduka, wa ana ‘ala ‘ahdika wa wa‘dika mastata‘t, a‘oothu bika min sharri ma sana‘t, aboo'u laka bini‘matika ‘alayya, wa aboo'u bidhanbi, faghfir li fa'innahu la yaghfirudh-dhunooba illa anta.",
  },
  morning_006: {
    title_en: "O Allah, I have reached the morning and call You to witness (four times)",
    text_en:
      "O Allah, I have reached the morning and I call You to witness, and I call to witness the bearers of Your Throne, Your angels, and all of Your creation, that You are Allah, there is no deity except You, alone, without partner, and that Muhammad is Your servant and Your Messenger. (four times)",
    transliteration_en:
      "Allahumma inni asbahtu ushhiduka, wa ushhidu hamalata ‘arshik, wa malaa'ikatak, wa jamee‘a khalqik, annaka antallahu la ilaha illa anta wahdaka la shareeka lak, wa anna Muhammadan ‘abduka wa rasooluk.",
  },
  morning_007: {
    title_en: "O Allah, whatever blessing I have risen upon this morning",
    text_en:
      "O Allah, whatever blessing I or any of Your creation have risen upon this morning is from You alone, without partner; to You belongs all praise and all thanks.",
    transliteration_en: "Allahumma ma asbaha bee min ni‘matin aw bi'ahadin min khalqika faminka wahdaka la shareeka lak, falakal-hamdu wa lakash-shukr.",
  },
  morning_008: {
    title_en: "O Allah, grant me well-being (three times)",
    text_en:
      "O Allah, grant me well-being in my body. O Allah, grant me well-being in my hearing. O Allah, grant me well-being in my sight. There is no deity except You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. There is no deity except You. (three times)",
    transliteration_en:
      "Allahumma ‘aafinee fee badanee, Allahumma ‘aafinee fee sam‘ee, Allahumma ‘aafinee fee basaree, la ilaha illa anta. Allahumma inni a‘oodhu bika minal-kufri wal-faqri, wa a‘oodhu bika min ‘adhaabil-qabri, la ilaha illa anta.",
  },
  morning_009: {
    title_en: "Allah is sufficient for me (seven times)",
    text_en: "Allah is sufficient for me; there is no deity except Him. Upon Him I have relied, and He is the Lord of the Mighty Throne. (seven times)",
    transliteration_en: "Hasbiyallahu la ilaha illa huwa ‘alayhi tawakkaltu wa huwa Rabbul-‘Arshil-‘Adheem.",
  },
  morning_010: {
    title_en: "O Allah, I ask You for pardon and well-being",
    text_en:
      "O Allah, I ask You for pardon and well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, and my family and my wealth. O Allah, conceal my faults and set at ease my times of fear. O Allah, guard me from before me and from behind me, and from my right and from my left, and from above me, and I seek refuge in Your greatness from being taken unaware from beneath me.",
    // NOTE (content-review flag, not touched here): this record's stored
    // Arabic repeats "العفو والعافية" in BOTH opening clauses. Misc
    // library's own equivalent record carries an explicit note that this
    // exact merged phrasing is a common but non-literal conflation of two
    // separate clauses from the hadith, and uses the fuller, unmerged
    // wording instead. This transliteration faithfully renders THIS
    // record's actual stored Arabic (per this task's instruction to never
    // silently alter or normalize it) — see this task's final report.
    transliteration_en:
      "Allahumma inni as'alukal-‘afwa wal-‘aafiyata fid-dunya wal-aakhirah, Allahumma inni as'alukal-‘afwa wal-‘aafiyata fee deenee wa dunyaaya wa ahlee, wa maalee, Allahummastur ‘awraatee, wa aamin raw‘aatee, Allahummahfadhnee min bayni yadayya, wa min khalfee, wa ‘an yameenee, wa ‘an shimaalee, wa min fawqee, wa a‘oodhu bi‘adhamatika an ughtaala min tahtee.",
  },
  morning_011: {
    title_en: "O Allah, Knower of the unseen and the witnessed",
    text_en:
      "O Allah, Knower of the unseen and the witnessed, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that there is no deity except You. I seek refuge in You from the evil of my soul, and from the evil of Satan and his associating others with Allah, and from bringing about evil upon myself or drawing it toward another Muslim.",
    transliteration_en:
      "Allahumma ‘aalimal-ghaybi wash-shahaadah, faatiras-samawaati wal-ard, Rabba kulli shay'in wa maleekah, ash-hadu al-la ilaha illa anta, a‘oodhu bika min sharri nafsee, wa min sharrish-shaytaani wa shirkih, wa an aqtarifa ‘ala nafsee soo'an, aw ajurrahu ila muslim.",
  },
  morning_012: {
    title_en: "In the name of Allah, with whose name nothing can cause harm (three times)",
    text_en:
      "In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing. (three times)",
    transliteration_en: "Bismillahil-ladhi la yadhurru ma‘asmihi shay'un fil-ardi wa la fis-samaa'i wa huwas-Samee‘ul-‘Aleem.",
  },
  morning_013: {
    title_en: "I am pleased with Allah as my Lord (three times)",
    text_en: "I am pleased with Allah as my Lord, Islam as my religion, and Muhammad ﷺ as my Prophet. (three times)",
    transliteration_en: "Radeetu billahi Rabban, wa bil-Islaami deenan, wa bi-Muhammadin nabiyyan.",
  },
  morning_014: {
    title_en: "O Ever-Living, O Sustainer, by Your mercy I seek help",
    text_en:
      "O Ever-Living, O Sustainer, by Your mercy I seek help; set right all of my affairs, and do not leave me to myself even for the blink of an eye.",
    transliteration_en: "Ya Hayyu ya Qayyoomu birahmatika astagheeth, aslih lee sha'nee kullahu wa la takilnee ila nafsee tarfata ‘ayn.",
  },
  morning_015: {
    title_en: "We have reached the morning, and with it all dominion belongs to Allah, Lord of the worlds",
    text_en:
      "We have reached the morning, and with it all dominion belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this day: its triumph, its help, its light, its blessing, and its guidance, and I seek refuge in You from the evil that is in it and the evil that follows it.",
    transliteration_en:
      "Asbahna wa asbahal-mulku lillahi Rabbil-‘aalameen, Allahumma inni as'aluka khayra hadhal-yawm: fathahu, wa nasrahu, wa noorahu, wa barakatahu, wa hudaah, wa a‘oodhu bika min sharri ma feehi wa sharri ma ba‘dah.",
  },
  morning_016: {
    title_en: "We have risen upon the natural disposition of Islam",
    text_en:
      "We have risen upon the natural disposition of Islam, upon the word of pure faith, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Abraham, who was upright in submission and was not among those who associate others with Allah.",
    transliteration_en:
      "Asbahna ‘ala fitratil-Islaam, wa ‘ala kalimatil-ikhlaas, wa ‘ala deeni Nabiyyina Muhammadin, wa ‘ala millati abeena Ibraaheema, haneefan musliman wa ma kaana minal-mushrikeen.",
  },
  morning_017: {
    title_en: "Glory be to Allah and praise Him (a hundred times)",
    text_en: "Glory be to Allah and praise Him. (a hundred times)",
    transliteration_en: "Subhaanallahi wa bihamdih.",
  },
  morning_018: {
    title_en: "There is no deity except Allah, alone, without partner (ten times)",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. (ten times)",
    transliteration_en: "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamd, wa huwa ‘ala kulli shay'in qadeer.",
  },
  // morning_019/morning_022 below are pre-existing, orphaned entries: their
  // staging cards (dithar-adhkar-cards.json) are tagged category "daily",
  // not "morning"/"morning_evening"/"evening"/"prayer" — so
  // morningCards/eveningCards/prayerCards never include them and
  // toWrittenItem() never reads these two keys here. (morning_019's own
  // verified text/count/source now DOES render live, as a separate
  // hand-written literal — id "misc-9" — in the `misc` array below; this
  // lookup entry itself stays unused, since that literal inlines its own
  // English text rather than calling englishFor("morning_019").)
  morning_019: {
    title_en: "There is no deity except Allah, alone, without partner (a hundred times daily)",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. (a hundred times when morning comes)",
  },
  morning_020: {
    title_en: "Glory be to Allah and praise Him, by the number of His creation (three times)",
    text_en:
      "Glory be to Allah and praise Him: by the number of His creation, by His own good pleasure, by the weight of His Throne, and by the extent of His words. (three times, when morning comes)",
    transliteration_en: "Subhaanallahi wa bihamdih, ‘adada khalqih, wa rida nafsih, wa zinata ‘arshih, wa midaada kalimaatih.",
  },
  morning_022: {
    title_en: "I seek Allah's forgiveness and repent to Him (a hundred times)",
    text_en: "I seek the forgiveness of Allah and repent to Him. (a hundred times in a day)",
  },
  // prayer_001/001b: split from one combined staging card into two
  // independent cards (see the same id split in dithar-adhkar-cards.json),
  // matching the established pattern already used for the Quls and for
  // prayer_004's own split earlier. Both English strings below are the
  // SAME wording the single combined card already used — re-partitioned to
  // match the new card boundary, never rewritten/retranslated — since this
  // task's "do not modify the English version" applies to the CONTENT's
  // wording/meaning, not to the structural necessity of giving each newly
  // independent Arabic card a non-blank English counterpart.
  prayer_001: {
    title_en: "Seeking Allah's forgiveness (three times)",
    text_en: "I seek the forgiveness of Allah. (three times)",
    transliteration_en: "Astaghfirullah.",
  },
  prayer_001b: {
    title_en: "O Allah, You are Peace",
    text_en: "O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honor.",
    transliteration_en: "Allahumma antas-Salaam, wa minkas-salaam, tabaarakta ya dhal-Jalaali wal-Ikraam.",
  },
  prayer_002: {
    title_en: "There is no deity except Allah — after-prayer form",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable (three times). O Allah, none can withhold what You give, and none can give what You withhold, and the might of the mighty does not benefit them against You.",
    transliteration_en:
      "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ‘ala kulli shay'in qadeer. Allahumma la maani‘a lima a‘tayt, wa la mu‘tiya lima mana‘t, wa la yanfa‘u dhal-jaddi minkal-jadd.",
  },
  prayer_003: {
    title_en: "The comprehensive formula of remembrance",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, and to Him belongs all praise, and He is over all things capable. There is no might nor power except with Allah. There is no deity except Allah, and we worship none but Him. To Him belongs all favor, and to Him belongs all grace, and to Him belongs beautiful praise. There is no deity except Allah, sincere in devotion to Him, even though the disbelievers dislike it.",
    transliteration_en:
      "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ‘ala kulli shay'in qadeer. La hawla wa la quwwata illa billah, la ilaha illallah, wa la na‘budu illa iyyaah, lahun-ni‘matu wa lahul-fadlu wa lahuth-thanaa'ul-hasan, la ilaha illallahu mukhliseena lahud-deena wa law karihal-kaafiroon.",
  },
  // prayer_004/004b/004c/004d were split from a single combined staging card
  // ("سبحان الله والحمد لله والله أكبر — 33") into four independent cards —
  // same pattern already used for the three Quls (see morning_002/002b/002c,
  // prayer_005/005b/005c) — so each phrase gets its own card, counter, and
  // Statistics tracking instead of being read together as one card. No
  // wording invented: each text_en below is the same faithful translation
  // already used elsewhere in this file for the identical Arabic phrase
  // (compare prayer_004d's to prayer_002/003's "There is no deity except
  // Allah..." clause).
  prayer_004: {
    title_en: "Glory be to Allah (33 times)",
    text_en: "Glory be to Allah. (thirty-three times)",
    transliteration_en: "Subhaanallah.",
  },
  prayer_004b: {
    title_en: "Praise be to Allah (33 times)",
    text_en: "Praise be to Allah. (thirty-three times)",
    // Identical single phrase to Misc library's own "sneezing-alhamdulillah"
    // — reusing that already-verified transliteration verbatim.
    transliteration_en: "Alhamdulillah.",
  },
  prayer_004c: {
    title_en: "Allah is the Greatest (33 times)",
    text_en: "Allah is the Greatest. (thirty-three times)",
    transliteration_en: "Allahu Akbar.",
  },
  prayer_004d: {
    title_en: "There is no deity except Allah — completing the hundred",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable.",
    // This record's Arabic is exactly the opening clause of Misc library's
    // "dhikr-al-safa-wal-marwah" (same wording, up through "qadeer") —
    // reusing that already-verified transliteration's matching prefix
    // rather than re-deriving one for the identical Arabic.
    transliteration_en: "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamd, wa huwa ‘ala kulli shay'in qadeer.",
  },
  prayer_005: {
    title_en: "Surah Al-Ikhlas after prayer",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "He is Allah, One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent." (after every prayer)',
    // Same surah as morning_002, plus the "بعد كل صلاة" ("after every
    // prayer") phrase that is literally part of this record's own stored
    // Arabic text (not a note/annotation) — transliterated in full below.
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul huwallahu Ahad. Allahus-Samad. Lam yalid wa lam yoolad. Wa lam yakul-lahu kufuwan ahad, ba‘da kulli salaah.",
  },
  prayer_005b: {
    title_en: "Surah Al-Falaq after prayer",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "I seek refuge in the Lord of daybreak, from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies." (after every prayer)',
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul a‘oodhu bi-Rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghaasiqin idha waqab. Wa min sharrin-naffaathaati fil-‘uqad. Wa min sharri haasidin idha hasad, ba‘da kulli salaah.",
  },
  prayer_005c: {
    title_en: "Surah An-Nas after prayer",
    text_en:
      'In the name of Allah, the Most Gracious, the Most Merciful. Say, "I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer who whispers in the breasts of mankind, from among the jinn and mankind." (after every prayer)',
    transliteration_en:
      "Bismillahir-Rahmanir-Raheem. Qul a‘oodhu bi-Rabbin-naas. Malikin-naas. Ilaahin-naas. Min sharril-waswaasil-khannaas. Alladhi yuwaswisu fee sudoorin-naas. Minal-jinnati wan-naas, ba‘da kulli salaah.",
  },
  prayer_006: {
    title_en: "Ayat al-Kursi after prayer",
    text_en:
      "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His seat extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (after every prayer)",
    // Same verse as morning_001, plus "عقب كل صلاة" ("after every prayer"),
    // which is literally part of this record's own stored Arabic text.
    transliteration_en:
      "Allahu la ilaha illa huwal-Hayyul-Qayyoom. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhal-ladhi yashfa‘u ‘indahu illa bi'idhnih. Ya‘lamu ma bayna aydeehim wa ma khalfahum, wa la yuheetoona bishay'im-min ‘ilmihi illa bima sha'. Wasi‘a kursiyyuhus-samawati wal-ard, wa la ya'ooduhu hifdhuhuma, wa huwal-‘Aliyyul-‘Adheem, ‘aqiba kulli salaah.",
  },
  prayer_007: {
    title_en: "There is no deity except Allah — after Fajr and Maghrib",
    text_en:
      "There is no deity except Allah, alone, without partner. To Him belongs the dominion, and to Him belongs all praise. He gives life and causes death, and He is over all things capable. (ten times after the Maghrib and Fajr prayers)",
    transliteration_en: "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu yuhyee wa yumeetu wa huwa ‘ala kulli shay'in qadeer.",
  },
  prayer_008: {
    title_en: "O Allah, I ask You for beneficial knowledge — after Fajr",
    text_en:
      "O Allah, I ask You for beneficial knowledge, good provision, and acceptable deeds. (after the closing salam of the Fajr prayer)",
    transliteration_en: "Allahumma inni as'aluka ‘ilman naafi‘an, wa rizqan tayyiban, wa ‘amalan mutaqabbalan.",
  },
  morning_003_evening: {
    title_en: "We have reached the evening, and with it all dominion belongs to Allah (extended version)",
    text_en:
      "We have reached the evening, and with it all dominion belongs to Allah, and praise is for Allah. There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.",
    transliteration_en:
      "Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa ‘ala kulli shay'in qadeer. Rabbi as'aluka khayra ma fee hadhihil-laylati wa khayra ma ba‘daha, wa a‘oodhu bika min sharri ma fee hadhihil-laylati wa sharri ma ba‘daha. Rabbi a‘oodhu bika minal-kasali wa soo'il-kibar. Rabbi a‘oodhu bika min ‘adhaabin fin-naari wa ‘adhaabin fil-qabr.",
  },
  morning_006_evening: {
    title_en: "O Allah, I have reached the evening and call You to witness (four times)",
    text_en:
      "O Allah, I have reached the evening and I call You to witness, and I call to witness the bearers of Your Throne, Your angels, and all of Your creation, that You are Allah, there is no deity except You, alone, without partner, and that Muhammad is Your servant and Your Messenger. (four times)",
    transliteration_en:
      "Allahumma inni amsaytu ushhiduka, wa ushhidu hamalata ‘arshik, wa malaa'ikatak, wa jamee‘a khalqik, annaka antallahu la ilaha illa anta wahdaka la shareeka lak, wa anna Muhammadan ‘abduka wa rasooluk.",
  },
  morning_015_evening: {
    title_en: "We have reached the evening, and with it all dominion belongs to Allah, Lord of the worlds",
    text_en:
      "We have reached the evening, and with it all dominion belongs to Allah, Lord of the worlds. O Allah, I ask You for the good of this night: its triumph, its help, its light, its blessing, and its guidance, and I seek refuge in You from the evil that is in it and the evil that follows it.",
    transliteration_en:
      "Amsayna wa amsal-mulku lillahi Rabbil-‘aalameen, Allahumma inni as'aluka khayra hadhihil-laylah: fathaha, wa nasraha, wa nooraha, wa barakataha, wa hudaaha, wa a‘oodhu bika min sharri ma feeha wa sharri ma ba‘daha.",
  },
  morning_023: {
    title_en: "Sending blessings upon the Prophet ﷺ",
    text_en:
      "O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You sent blessings upon Ibrahim and upon the family of Ibrahim; indeed You are Praiseworthy and Glorious. O Allah, send grace upon Muhammad and upon the family of Muhammad, as You sent grace upon Ibrahim and upon the family of Ibrahim; indeed You are Praiseworthy and Glorious.",
    transliteration_en:
      "Allahumma salli ‘ala Muhammadin wa ‘ala aali Muhammad, kama sallayta ‘ala Ibraaheema wa ‘ala aali Ibraaheem, innaka Hameedum-Majeed. Allahumma baarik ‘ala Muhammadin wa ‘ala aali Muhammad, kama baarakta ‘ala Ibraaheema wa ‘ala aali Ibraaheem, innaka Hameedum-Majeed.",
  },
  evening_001: {
    title_en: "I seek refuge in Allah's perfect words from the evil of what He created",
    text_en:
      "I seek refuge in Allah's perfect words from the evil of what He created. (three times)",
    // Identical wording to Misc library's own "audhu-bikalimatillah-al-tammat"
    // — reusing that already-verified transliteration verbatim.
    transliteration_en: "A‘oothu bikalimaatillahit-taammaati min sharri ma khalaq.",
  },
  morning_007_evening: {
    title_en: "O Allah, whatever blessing I have gained this evening",
    text_en:
      "O Allah, whatever blessing I or any of Your creation have gained this evening is from You alone, without partner; to You belongs all praise and all thanks.",
    transliteration_en: "Allahumma ma amsa bee min ni‘matin aw bi'ahadin min khalqika faminka wahdaka la shareeka lak, falakal-hamdu wa lakash-shukr.",
  },
  morning_016_evening: {
    title_en: "We have reached the evening upon the natural disposition of Islam",
    text_en:
      "We have reached the evening upon the natural disposition of Islam, upon the word of pure faith, upon the religion of our Prophet Muhammad ﷺ, and upon the way of our father Abraham, who was upright in submission and was not among those who associate others with Allah.",
    transliteration_en:
      "Amsayna ‘ala fitratil-Islaam, wa ‘ala kalimatil-ikhlaas, wa ‘ala deeni Nabiyyina Muhammadin, wa ‘ala millati abeena Ibraaheema, haneefan musliman wa ma kaana minal-mushrikeen.",
  },
};

function englishFor(key: string): EnglishContent {
  return ENGLISH_CONTENT[key] ?? { title_en: "", text_en: "" };
}


// Short, card-friendly source line for every card — collection name (no
// hadith number/cross-references) plus, for anything outside the Sahihayn,
// the shortest accurate ruling ("Hasan (al-Albani)" / "حسّنه الألباني" style).
// This is a DISPLAY simplification only: the full citation and grade stay
// in dithar-adhkar-cards.json's source_reference/hadith_grade untouched;
// this table never invents a source or grade not already documented there.
const SHORT_SOURCE: Record<string, { ar: string; en: string }> = {
  morning_001: { ar: "القرآن الكريم", en: "Qur'an 2:255" },
  morning_002: { ar: "سنن أبي داود — صححه الألباني", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  morning_002b: { ar: "سنن أبي داود — صححه الألباني", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  morning_002c: { ar: "سنن أبي داود — صححه الألباني", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  morning_003: { ar: "صحيح مسلم", en: "Sahih Muslim" },
  morning_004: { ar: "سنن أبي داود — صححه الألباني", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  morning_005: { ar: "صحيح البخاري", en: "Sahih al-Bukhari" },
  morning_006: { ar: "سنن أبي داود — حسّنه ابن باز", en: "Sunan Abi Dawud — Hasan (Ibn Baz)" },
  morning_007: { ar: "سنن أبي داود — حسنه بعض أهل العلم، وفيه خلاف", en: "Sunan Abi Dawud — Hasan (some scholars), disputed" },
  morning_008: { ar: "سنن أبي داود — حسّنه الألباني", en: "Sunan Abi Dawud — Hasan (al-Albani)" },
  morning_009: {
    ar: "سنن أبي داود — موقوف على أبي الدرداء بإسناد جيد، وفي حكم المرفوع عند ابن باز",
    en: "Sunan Abi Dawud — Mawquf on Abu al-Darda' with a good chain; regarded as marfu' in ruling by Ibn Baz",
  },
  morning_010: { ar: "سنن ابن ماجه — صححه الألباني", en: "Sunan Ibn Majah — Sahih (al-Albani)" },
  morning_011: { ar: "جامع الترمذي — صححه الألباني", en: "Jami` at-Tirmidhi — Sahih (al-Albani)" },
  morning_012: { ar: "سنن أبي داود — حسّنه ابن باز", en: "Sunan Abi Dawud — Hasan (Ibn Baz)" },
  morning_013: { ar: "جامع الترمذي — إسناده حسن (ابن باز)", en: "Jami` at-Tirmidhi — Isnad Hasan (Ibn Baz)" },
  morning_014: { ar: "سنن النسائي الكبرى — حسّنه الألباني", en: "Sunan an-Nasa'i al-Kubra — Hasan (al-Albani)" },
  morning_015: { ar: "سنن أبي داود — حسّنه الألباني، وفيه خلاف", en: "Sunan Abi Dawud — Hasan (al-Albani), differed upon" },
  morning_016: { ar: "مسند أحمد — إسناده صحيح (ابن باز)", en: "Musnad Ahmad — Isnad Sahih (Ibn Baz)" },
  // morning_017: corrected to the specific hadith whose own wording names
  // BOTH morning and evening ("حين يصبح وحين يمسي") — Sahih Muslim 2692,
  // Abu Hurayrah. The earlier "Bukhari 6405, Muslim 2691" citation
  // belongs to a DIFFERENT, general hadith ("في يوم مائة مرة" — "a hundred
  // times IN A DAY", no morning/evening wording) and has been removed;
  // see this task's report.
  morning_017: { ar: "صحيح مسلم (2692) — عن أبي هريرة رضي الله عنه", en: "Sahih Muslim 2692 — narrated by Abu Hurayrah" },
  // morning_018 (Morning only — Evening has its own distinct narration,
  // see EVENING_SOURCE_OVERRIDE above): the ten-times count and this
  // exact wording (without "يحيي ويميت") trace to Abu Ayyub al-Ansari's
  // narration (Musnad Ahmad, Sunan an-Nasa'i al-Kubra, Sahih Ibn Hibban),
  // NOT to Bukhari/Muslim — that citation belonged to a different hadith
  // (the 100-times-in-a-day version, Bukhari 3293 / Muslim 2691, Abu
  // Hurayrah) and has been removed; see this task's report.
  morning_018: {
    ar: "مسند أحمد، السنن الكبرى للنسائي، صحيح ابن حبان — عن أبي أيوب الأنصاري رضي الله عنه — صحيح (ابن حجر، الألباني)",
    en: "Musnad Ahmad; Sunan an-Nasa'i al-Kubra; Sahih Ibn Hibban — narrated by Abu Ayyub al-Ansari — Sahih (Ibn Hajar, al-Albani)",
  },
  morning_019: { ar: "صحيح البخاري، صحيح مسلم", en: "Sahih al-Bukhari, Sahih Muslim" },
  morning_020: { ar: "صحيح مسلم", en: "Sahih Muslim" },
  morning_022: { ar: "صحيح البخاري، صحيح مسلم", en: "Sahih al-Bukhari, Sahih Muslim" },
  // Arabic values below updated to the short takhrij format (collection +
  // hadith number + companion) supplied as this task's authoritative data.
  // English (`en`) values deliberately left exactly as they were — this
  // task is Arabic-only.
  prayer_001: { ar: "صحيح مسلم (591) — عن ثوبان رضي الله عنه", en: "Sahih Muslim" },
  prayer_001b: { ar: "صحيح مسلم (591) — عن ثوبان رضي الله عنه", en: "Sahih Muslim" },
  prayer_002: { ar: "البخاري (844)، مسلم (593) — عن المغيرة بن شعبة رضي الله عنه", en: "Sahih al-Bukhari, Sahih Muslim" },
  prayer_003: { ar: "صحيح مسلم (594) — عن عبد الله بن الزبير رضي الله عنه", en: "Sahih Muslim" },
  prayer_004: { ar: "صحيح مسلم (597) — عن أبي هريرة رضي الله عنه", en: "Sahih Muslim" },
  prayer_004b: { ar: "صحيح مسلم (597) — عن أبي هريرة رضي الله عنه", en: "Sahih Muslim" },
  prayer_004c: { ar: "صحيح مسلم (597) — عن أبي هريرة رضي الله عنه", en: "Sahih Muslim" },
  prayer_004d: { ar: "صحيح مسلم (597) — عن أبي هريرة رضي الله عنه", en: "Sahih Muslim" },
  // 2026-08 correction pass: aligned to the same Abu Dawud 1523 citation
  // already used by its 005b/005c siblings (all three Quls are recited
  // together per that one hadith) — was previously a vaguer, un-numbered
  // citation not tied to 1523 at all.
  prayer_005: { ar: "أبو داود (1523) — عن عقبة بن عامر رضي الله عنه — صحيح", en: "Sunan Abi Dawud 1523 — narrated by 'Uqbah ibn 'Amir — Sahih (al-Albani)" },
  prayer_005b: { ar: "أبو داود (1523) — عن عقبة بن عامر رضي الله عنه — صحيح", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  prayer_005c: { ar: "أبو داود (1523) — عن عقبة بن عامر رضي الله عنه — صحيح", en: "Sunan Abi Dawud — Sahih (al-Albani)" },
  prayer_006: { ar: "رواه النسائي في السنن الكبرى (9928) — عن أبي أمامة رضي الله عنه", en: "Sunan an-Nasa'i — Hasan (al-Albani)" },
  // 2026-08 correction pass: hadith number and narrator added (Tirmidhi
  // 3534, 'Umarah ibn Shabib al-Saba'i) — this is a DISTINCT, separately
  // verified narration from the Morning/Evening ×10 record (morning_018,
  // Abu Ayyub al-Ansari) — do not merge their sourcing.
  prayer_007: { ar: "جامع الترمذي (3534) — عن عمارة بن شبيب السبائي رضي الله عنه — حسن غريب (الترمذي)", en: "Jami` at-Tirmidhi 3534 — narrated by 'Umarah ibn Shabib al-Saba'i — Hasan Gharib (al-Tirmidhi)" },
  prayer_008: { ar: "سنن ابن ماجه — حسّنه الألباني", en: "Sunan Ibn Majah — Hasan (al-Albani)" },
  morning_023: { ar: "صحيح البخاري، صحيح مسلم", en: "Sahih al-Bukhari, Sahih Muslim" },
  evening_001: { ar: "جامع الترمذي — حسّنه الترمذي وصححه الألباني", en: "Jami` at-Tirmidhi — Hasan (al-Tirmidhi); Sahih (al-Albani)" },
};

function formatSource(card: StagingCard): { source_ar: string; source_en: string } {
  const short = SHORT_SOURCE[card.id];
  if (short) return { source_ar: short.ar, source_en: short.en };
  return { source_ar: card.source_reference, source_en: card.source_reference };
}

// The three Quls after prayer (Sunan Abi Dawud 1523) are said three times
// after Fajr and Maghrib, once after Dhuhr/Asr/Isha — a genuine per-prayer
// difference, unlike every other card's fixed `repeat`. Scoped to exactly
// these three ids; every other card is untouched by this map.
//
// Internal note (2026-08 correction pass, not user-facing): this 3×/1×
// split is NOT itself stated by Abu Dawud 1523 — that hadith only
// instructs reciting the Mu'awwidhat once after every prayer. The 3× figure
// is this app's own combination of that instruction with the separate,
// well-known narration of reciting the three Quls three times in the
// morning and evening. Do not present the 3×/1× split as if Abu Dawud
// 1523 alone establishes it.
const PRAYER_SPECIFIC_REPEAT: Record<string, Record<PrayerName, number>> = {
  prayer_005: { fajr: 3, dhuhr: 1, asr: 1, maghrib: 3, isha: 1 },
  prayer_005b: { fajr: 3, dhuhr: 1, asr: 1, maghrib: 3, isha: 1 },
  prayer_005c: { fajr: 3, dhuhr: 1, asr: 1, maghrib: 3, isha: 1 },
};

// Prayer-specific post-prayer Adhkar — every id NOT listed here defaults to
// "all" (said after every obligatory prayer). Scoped narrowly per each
// item's own verified source, never guessed from where it happens to sit
// in the data:
//   - prayer_007 ("...يحيي ويميت...", x10): reported specifically for
//     after Fajr and Maghrib only.
//   - prayer_008 ("اللهم إني أسألك علماً نافعاً..."): reported specifically
//     for after Fajr only (Sunan Ibn Majah 925; also Musnad Ahmad 26602,
//     Sunan al-Kubra of an-Nasa'i 9930 — Umm Salamah). This is the exact
//     item that was previously (incorrectly) appearing under every prayer,
//     including Maghrib.
const PRAYER_SCOPE: Record<string, PrayerScope> = {
  prayer_007: ["fajr", "maghrib"],
  prayer_008: "fajr",
};

// Salat al-Ibrahimiyyah (Morning/Evening, id "morning_023") has no
// religiously-prescribed fixed count — see `unboundedCount` on
// WrittenAdhkarItem. Applies to both its Morning and Evening rendering
// automatically, since both come from this same staging id.
const UNBOUNDED_COUNT_IDS = new Set<string>(["morning_023"]);

function toWrittenItem(
  card: StagingCard,
  opts?: {
    titleOverride?: string;
    textOverride?: string;
    englishKey?: string;
    repeatOverride?: number;
    sourceOverride?: { ar: string; en: string };
  },
): WrittenAdhkarItem {
  const english = englishFor(opts?.englishKey ?? card.id);
  const { source_ar, source_en } = opts?.sourceOverride
    ? { source_ar: opts.sourceOverride.ar, source_en: opts.sourceOverride.en }
    : formatSource(card);
  return {
    id: card.id,
    title_ar: opts?.titleOverride ?? card.display_title_ar,
    title_en: english.title_en,
    text_ar: opts?.textOverride ?? stripEveningNote(card.arabic_source_text),
    text_en: english.text_en,
    repeat: opts?.repeatOverride ?? card.count ?? undefined,
    repeatByPrayer: PRAYER_SPECIFIC_REPEAT[card.id],
    prayerScope: PRAYER_SCOPE[card.id],
    source_ar,
    source_en,
    transliteration_en: english.transliteration_en,
    unboundedCount: UNBOUNDED_COUNT_IDS.has(card.id) || undefined,
  };
}

const morningCards = stagingCards.filter((c) => c.category === "morning" || c.category === "morning_evening");
const eveningCards = stagingCards.filter(
  (c) => (c.category === "morning_evening" && !EVENING_PENDING_IDS.has(c.id)) || c.category === "evening",
);
const prayerCards = stagingCards.filter((c) => c.category === "prayer");

const morningItems: WrittenAdhkarItem[] = morningCards.map((c) => toWrittenItem(c));

const eveningItems: WrittenAdhkarItem[] = eveningCards.map((c) => {
  const textOverride = EVENING_TEXT_OVERRIDE[c.id];
  return toWrittenItem(c, {
    titleOverride: EVENING_TITLE_OVERRIDE[c.id],
    textOverride,
    englishKey: textOverride ? `${c.id}_evening` : c.id,
    repeatOverride: EVENING_REPEAT_OVERRIDE[c.id],
    sourceOverride: EVENING_SOURCE_OVERRIDE[c.id],
  });
});

const prayerItems: WrittenAdhkarItem[] = prayerCards.map((c) => toWrittenItem(c));

export const writtenAdhkarItems: Record<WrittenAdhkarCategoryKey, WrittenAdhkarItem[]> = {
  morning: morningItems,
  evening: eveningItems,
  prayer: prayerItems,
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
    // 2026-08 correction pass: the "Daily ×100" record (approved
    // correction item 1C) — same verified text/count/source already
    // present (but orphaned/unrendered) as "morning_019" in
    // dithar-adhkar-cards.json; no "Day & Night" category exists
    // anywhere in the app, so per the app owner's decision this goes into
    // the existing general-purpose "Various Adhkar & Duas" tab rather
    // than a new category. A distinct id ("misc-9") is used to avoid any
    // collision with the still-present, still-unrendered "morning_019"
    // staging entry.
    {
      id: "misc-9",
      title_ar: "لا إله إلا الله وحده لا شريك له — مائة يوميًا",
      title_en: "There is no deity except Allah, alone, without partner (a hundred times daily)",
      text_ar:
        "((لاَ إِلَهَ إِلاَّ اللَّهُ، وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ)) (مائةَ مرَّةٍ فِي الْيَوْمِ).",
      text_en:
        "There is no deity except Allah, alone, without partner. To Him belongs the dominion, to Him belongs all praise, and He is over all things capable. (a hundred times in a day)",
      repeat: 100,
      source_ar: "صحيح البخاري (3293)، صحيح مسلم (2691) — عن أبي هريرة رضي الله عنه",
      source_en: "Sahih al-Bukhari 3293; Sahih Muslim 2691 — narrated by Abu Hurayrah",
    },
  ],
};
