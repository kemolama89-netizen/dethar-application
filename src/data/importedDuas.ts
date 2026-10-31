// Duas imported 2026-10-23 to widen the widget's dua rotation (everyday
// themes: distress, provision, family, guidance, protection, health,
// character, forgiveness, trust). Masnun Dua (github.com/islamicapi/masnun-dua)
// was used ONLY as a list of candidates — none of its text, translations or
// titles is copied here. Each candidate was kept only when, automatically:
//   - its Arabic is found word for word in the passage it cites — the ayah
//     in Tanzil «quran-simple», or the Prophet's quoted words in the cited
//     narration of fawazahmed0/hadith-api (the datasets this app already
//     checks against); the Arabic below is taken from those datasets;
//   - it isn't already in the app (written library, enriched duas, widget
//     verses, Hadith library), nor another wording of a dua already here;
//   - for the Sunan, al-Albani graded it sahih/hasan (any differing grader
//     listed in the dataset is named in the source line);
//   - it fits the widget (≤ WIDGET_MAX_TEXT_CHARS, no fragile marks).
// Then a suitability pass left out situational duas (prayer positions,
// food, travel…), duas made for a named person, and context-bound verses.
// English is the published translation of that same text from the same
// datasets (Saheeh International for the Qur'an, trimmed to the dua's
// words; the hadith editions' English), never Masnun's. src/lib/__fixtures__/
// masnun-import-2026-10-23.json holds the source texts; importedDuas.test.ts
// checks every entry against them.
//
// These carry no item comments of their own: like the written library's
// duas, they rotate through their kind's category comments and DITHAR's dua
// reflections. They enter the review queue as new content (pending until a
// reviewer approves them), and every translation is unreviewed.
import type { EnrichedDua, SourceReview, TranslationSource } from "./widgetContent";

const CHECKED_ON = "2026-10-23";
const QURAN_CHECK = "Qur'an text (Tanzil «quran-simple», via fawazahmed0/quran-api) and Saheeh International translation";
const HADITH_CHECK = "Arabic and English editions of the cited collection (fawazahmed0/hadith-api, jsDelivr), with their listed gradings";
const CANDIDATE_NOTE = "Imported 2026-10-23 from a Masnun Dua candidate; the sunnah.com link is built from the hadith number and was not opened.";

const SAHEEH_TRIMMED: TranslationSource = { source: "Saheeh International (trimmed to the dua's words)", reviewed: false };
const PUBLISHED_EN_MUSLIM_SIDDIQUI: TranslationSource = {
  source: "Abdul Hamid Siddiqui's published translation of Sahih Muslim, the dua's words verbatim (the checked dataset's English edition)",
  reviewed: false,
};
const datasetEnglish = (book: string): TranslationSource => ({
  source: `The published English translation of ${book} in the checked dataset's English edition, the dua's words verbatim (the dataset names no translator)`,
  reviewed: false,
});

interface QuranSpec {
  surahAr: string;
  surahEn: string;
  surah: number;
  ayah: number;
  textAr: string;
  meaningEn: string;
}

function quran(spec: QuranSpec): EnrichedDua {
  const review: SourceReview = { status: "source-checked", checkedAgainst: QURAN_CHECK, checkedOn: CHECKED_ON };
  return {
    id: `q-${spec.surah}-${spec.ayah}`,
    kind: "quran",
    textAr: spec.textAr,
    meaningEn: spec.meaningEn,
    sourceAr: `القرآن الكريم — سورة ${spec.surahAr}، الآية ${spec.ayah}`,
    sourceEn: `The Qur'an — Surat ${spec.surahEn} ${spec.surah}:${spec.ayah}`,
    url: `https://quran.com/${spec.surah}/${spec.ayah}`,
    translation: SAHEEH_TRIMMED,
    review,
    comments: [],
  };
}

interface SunnahSpec {
  id: string;
  textAr: string;
  meaningEn: string;
  sourceAr: string;
  sourceEn: string;
  url: string;
  translation: TranslationSource;
}

function sunnah(spec: SunnahSpec): EnrichedDua {
  const { id, textAr, meaningEn, sourceAr, sourceEn, url, translation } = spec;
  return {
    id,
    kind: "sunnah",
    textAr,
    meaningEn,
    sourceAr,
    sourceEn,
    url,
    translation,
    review: { status: "source-checked", checkedAgainst: HADITH_CHECK, checkedOn: CHECKED_ON, note: CANDIDATE_NOTE },
    comments: [],
  };
}

export const IMPORTED_DUAS: readonly EnrichedDua[] = [
  quran({
    surahAr: "الصافات", surahEn: "As-Saffat", surah: 37, ayah: 100,
    textAr: "رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ",
    meaningEn: "My Lord, grant me [a child] from among the righteous.",
  }),
  quran({
    surahAr: "الأعراف", surahEn: "Al-A'raf", surah: 7, ayah: 47,
    textAr: "رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ",
    meaningEn: "Our Lord, do not place us with the wrongdoing people.",
  }),
  quran({
    surahAr: "العنكبوت", surahEn: "Al-'Ankabut", surah: 29, ayah: 30,
    textAr: "رَبِّ انْصُرْنِي عَلَى الْقَوْمِ الْمُفْسِدِينَ",
    meaningEn: "My Lord, support me against the corrupting people.",
  }),
  quran({
    surahAr: "القصص", surahEn: "Al-Qasas", surah: 28, ayah: 21,
    textAr: "رَبِّ نَجِّنِي مِنَ الْقَوْمِ الظَّالِمِينَ",
    meaningEn: "My Lord, save me from the wrongdoing people.",
  }),
  quran({
    surahAr: "الشعراء", surahEn: "Ash-Shu'ara'", surah: 26, ayah: 169,
    textAr: "رَبِّ نَجِّنِي وَأَهْلِي مِمَّا يَعْمَلُونَ",
    meaningEn: "My Lord, save me and my family from [the consequence of] what they do.",
  }),
  quran({
    surahAr: "البقرة", surahEn: "Al-Baqarah", surah: 2, ayah: 128,
    textAr: "رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِنْ ذُرِّيَّتِنَا أُمَّةً مُسْلِمَةً لَكَ وَأَرِنَا مَنَاسِكَنَا وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    meaningEn: "Our Lord, and make us Muslims [in submission] to You and from our descendants a Muslim nation [in submission] to You. And show us our rites and accept our repentance. Indeed, You are the Accepting of repentance, the Merciful.",
  }),
  quran({
    surahAr: "هود", surahEn: "Hud", surah: 11, ayah: 47,
    textAr: "رَبِّ إِنِّي أَعُوذُ بِكَ أَنْ أَسْأَلَكَ مَا لَيْسَ لِي بِهِ عِلْمٌ وَإِلَّا تَغْفِرْ لِي وَتَرْحَمْنِي أَكُنْ مِنَ الْخَاسِرِينَ",
    meaningEn: "My Lord, I seek refuge in You from asking that of which I have no knowledge. And unless You forgive me and have mercy upon me, I will be among the losers.",
  }),
  quran({
    surahAr: "المائدة", surahEn: "Al-Ma'idah", surah: 5, ayah: 83,
    textAr: "رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    meaningEn: "Our Lord, we have believed, so register us among the witnesses.",
  }),
  quran({
    surahAr: "المؤمنون", surahEn: "Al-Mu'minun", surah: 23, ayah: 94,
    textAr: "رَبِّ فَلَا تَجْعَلْنِي فِي الْقَوْمِ الظَّالِمِينَ",
    meaningEn: "My Lord, then do not place me among the wrongdoing people.",
  }),
  quran({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 194,
    textAr: "رَبَّنَا وَآتِنَا مَا وَعَدْتَنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ",
    meaningEn: "Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection. Indeed, You do not fail in [Your] promise.",
  }),
  quran({
    surahAr: "إبراهيم", surahEn: "Ibrahim", surah: 14, ayah: 38,
    textAr: "رَبَّنَا إِنَّكَ تَعْلَمُ مَا نُخْفِي وَمَا نُعْلِنُ وَمَا يَخْفَىٰ عَلَى اللَّهِ مِنْ شَيْءٍ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    meaningEn: "Our Lord, indeed You know what we conceal and what we declare, and nothing is hidden from Allah on the earth or in the heaven.",
  }),
  quran({
    surahAr: "القصص", surahEn: "Al-Qasas", surah: 28, ayah: 22,
    textAr: "عَسَىٰ رَبِّي أَنْ يَهْدِيَنِي سَوَاءَ السَّبِيلِ",
    meaningEn: "Perhaps my Lord will guide me to the sound way.",
  }),
  quran({
    surahAr: "غافر", surahEn: "Ghafir", surah: 40, ayah: 7,
    textAr: "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ وَقِهِمْ عَذَابَ الْجَحِيمِ",
    meaningEn: "Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way and protect them from the punishment of Hellfire.",
  }),
  quran({
    surahAr: "القصص", surahEn: "Al-Qasas", surah: 28, ayah: 17,
    textAr: "رَبِّ بِمَا أَنْعَمْتَ عَلَيَّ فَلَنْ أَكُونَ ظَهِيرًا لِلْمُجْرِمِينَ",
    meaningEn: "My Lord, for the favor You bestowed upon me, I will never be an assistant to the criminals.",
  }),
  quran({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 9,
    textAr: "رَبَّنَا إِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَا رَيْبَ فِيهِ إِنَّ اللَّهَ لَا يُخْلِفُ الْمِيعَادَ",
    meaningEn: "Our Lord, surely You will gather the people for a Day about which there is no doubt. Indeed, Allah does not fail in His promise.",
  }),
  quran({
    surahAr: "البقرة", surahEn: "Al-Baqarah", surah: 2, ayah: 285,
    textAr: "سَمِعْنَا وَأَطَعْنَا غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ",
    meaningEn: "We hear and we obey. [We seek] Your forgiveness, our Lord, and to You is the [final] destination.",
  }),
  quran({
    surahAr: "المائدة", surahEn: "Al-Ma'idah", surah: 5, ayah: 114,
    textAr: "وَارْزُقْنَا وَأَنْتَ خَيْرُ الرَّازِقِينَ",
    meaningEn: "And provide for us, and You are the best of providers.",
  }),
  quran({
    surahAr: "غافر", surahEn: "Ghafir", surah: 40, ayah: 44,
    textAr: "وَأُفَوِّضُ أَمْرِي إِلَى اللَّهِ إِنَّ اللَّهَ بَصِيرٌ بِالْعِبَادِ",
    meaningEn: "I entrust my affair to Allah. Indeed, Allah is Seeing of [His] servants.",
  }),
  quran({
    surahAr: "يوسف", surahEn: "Yusuf", surah: 12, ayah: 64,
    textAr: "فَاللَّهُ خَيْرٌ حَافِظًا وَهُوَ أَرْحَمُ الرَّاحِمِينَ",
    meaningEn: "Allah is the best guardian, and He is the most merciful of the merciful.",
  }),
  sunnah({
    id: "nasai-5475",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَغَلَبَةِ الْعَدُوِّ وَشَمَاتَةِ الأَعْدَاءِ",
    meaningEn: "O Allah, I seek refuge with You from being overwhelmed with debt, from being overpowered by the enemy and from the enemy rejoicing over my misfortunes.",
    sourceAr: "سنن النسائي (5475) — عن عبد الله بن عمرو بن العاص رضي الله عنهما، صححه الألباني، وحسّن إسناده زبير علي زئي",
    sourceEn: "Sunan an-Nasa'i 5475 — narrated by 'Abdullah ibn 'Amr ibn al-'As; graded sahih by al-Albani; Zubair Ali Za'i graded its chain hasan",
    url: "https://sunnah.com/nasai:5475",
    translation: datasetEnglish("Sunan an-Nasa'i"),
  }),
  sunnah({
    id: "nasai-1617",
    textAr: "اللَّهُمَّ اغْفِرْ لِي وَاهْدِنِي وَارْزُقْنِي وَعَافِنِي أَعُوذُ بِاللَّهِ مِنْ ضِيقِ الْمَقَامِ يَوْمَ الْقِيَامَةِ",
    meaningEn: "O Allah, forgive me, guide me, grant me provision and good health. I seek refuge with Allah from the difficulty of standing on the Day of Resurrection.",
    sourceAr: "سنن النسائي (1617) — عن عائشة رضي الله عنها، قال الألباني: حسن صحيح، وحسّن إسناده زبير علي زئي",
    sourceEn: "Sunan an-Nasa'i 1617 — narrated by 'A'ishah; graded hasan sahih by al-Albani; Zubair Ali Za'i graded its chain hasan",
    url: "https://sunnah.com/nasai:1617",
    translation: datasetEnglish("Sunan an-Nasa'i"),
  }),
  sunnah({
    id: "nasai-5465",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَعَذَابِ الْقَبْرِ",
    meaningEn: "O Allah, I seek refuge with You from Kufr, poverty and the torment of the grave.",
    sourceAr: "سنن النسائي (5465) — عن أبي بكرة رضي الله عنه، قال الألباني: صحيح الإسناد، وحسّنه زبير علي زئي",
    sourceEn: "Sunan an-Nasa'i 5465 — narrated by Abu Bakrah; al-Albani: its chain is sahih; graded hasan by Zubair Ali Za'i",
    url: "https://sunnah.com/nasai:5465",
    translation: datasetEnglish("Sunan an-Nasa'i"),
  }),
  sunnah({
    id: "muslim-483",
    textAr: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ دِقَّهُ وَجِلَّهُ وَأَوَّلَهُ وَآخِرَهُ وَعَلاَنِيَتَهُ وَسِرَّهُ",
    meaningEn: "O Lord, forgive me all my sins, small and great, first and last, open and secret.",
    sourceAr: "صحيح مسلم (483) — عن أبي هريرة رضي الله عنه",
    sourceEn: "Sahih Muslim 483 — narrated by Abu Hurairah",
    url: "https://sunnah.com/muslim:483",
    translation: PUBLISHED_EN_MUSLIM_SIDDIQUI,
  }),
  sunnah({
    id: "tirmidhi-3524",
    textAr: "يَا حَىُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ",
    meaningEn: "O Living, O Self-Sustaining Sustainer! In Your Mercy do I seek relief.",
    sourceAr: "جامع الترمذي (3524) — عن أنس بن مالك رضي الله عنه، قال الترمذي: غريب، وحسّنه الألباني وزبير علي زئي",
    sourceEn: "Jami` at-Tirmidhi 3524 — narrated by Anas ibn Malik; al-Tirmidhi said: gharib; graded hasan by al-Albani and by Zubair Ali Za'i",
    url: "https://sunnah.com/tirmidhi:3524",
    translation: datasetEnglish("Jami` at-Tirmidhi"),
  }),
  sunnah({
    id: "nasai-5519",
    textAr: "اللَّهُمَّ رَبَّ جِبْرَائِيلَ وَمِيكَائِيلَ وَرَبَّ إِسْرَافِيلَ أَعُوذُ بِكَ مِنْ حَرِّ النَّارِ وَمِنْ عَذَابِ الْقَبْرِ",
    meaningEn: "O Allah, Lord of Jibra'il and Mika'il and Lord of Israfil, I seek refuge in You from the heat of the Fire and (from) the torment of the grave.",
    sourceAr: "سنن النسائي (5519) — عن عائشة رضي الله عنها، حسّنه الألباني وزبير علي زئي",
    sourceEn: "Sunan an-Nasa'i 5519 — narrated by 'A'ishah; graded hasan by al-Albani and by Zubair Ali Za'i",
    url: "https://sunnah.com/nasai:5519",
    translation: datasetEnglish("Sunan an-Nasa'i"),
  }),
  sunnah({
    id: "tirmidhi-3591",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ مُنْكَرَاتِ الأَخْلاَقِ وَالأَعْمَالِ وَالأَهْوَاءِ",
    meaningEn: "O Allah, I seek refuge in You from evil character, evil actions, and evil desires.",
    sourceAr: "جامع الترمذي (3591) — عن قطبة بن مالك رضي الله عنه، قال الترمذي: حسن غريب، وصححه الألباني وزبير علي زئي",
    sourceEn: "Jami` at-Tirmidhi 3591 — narrated by Qutbah ibn Malik; al-Tirmidhi said: hasan gharib; graded sahih by al-Albani and by Zubair Ali Za'i",
    url: "https://sunnah.com/tirmidhi:3591",
    translation: datasetEnglish("Jami` at-Tirmidhi"),
  }),
  sunnah({
    id: "ibnmajah-925",
    textAr: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلاً مُتَقَبَّلاً",
    meaningEn: "O Allah, I ask You for beneficial knowledge, goodly provision and acceptable deeds.",
    sourceAr: "سنن ابن ماجه (925) — عن أم سلمة رضي الله عنها، صححه الألباني، وضعّفه زبير علي زئي",
    sourceEn: "Sunan Ibn Majah 925 — narrated by Umm Salamah; graded sahih by al-Albani and da'if by Zubair Ali Za'i",
    url: "https://sunnah.com/ibnmajah:925",
    translation: datasetEnglish("Sunan Ibn Majah"),
  }),
  sunnah({
    id: "abudawud-1537",
    textAr: "اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ",
    meaningEn: "O Allah, we make Thee our shield against them, and take refuge in Thee from their evils.",
    sourceAr: "سنن أبي داود (1537) — عن أبي موسى الأشعري رضي الله عنه، صححه الألباني، وضعّفه زبير علي زئي",
    sourceEn: "Sunan Abi Dawud 1537 — narrated by Abu Musa al-Ash'ari; graded sahih by al-Albani and da'if by Zubair Ali Za'i",
    url: "https://sunnah.com/abudawud:1537",
    translation: datasetEnglish("Sunan Abi Dawud"),
  }),
  sunnah({
    id: "abudawud-1554",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبَرَصِ وَالْجُنُونِ وَالْجُذَامِ وَمِنْ سَيِّئِ الأَسْقَامِ",
    meaningEn: "O Allah, I seek refuge in Thee from leprosy, madness, elephantiasis, and evil diseases.",
    sourceAr: "سنن أبي داود (1554) — عن أنس بن مالك رضي الله عنه، صححه الألباني، وضعّفه زبير علي زئي",
    sourceEn: "Sunan Abi Dawud 1554 — narrated by Anas ibn Malik; graded sahih by al-Albani and da'if by Zubair Ali Za'i",
    url: "https://sunnah.com/abudawud:1554",
    translation: datasetEnglish("Sunan Abi Dawud"),
  }),
  sunnah({
    id: "abudawud-1547",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْجُوعِ فَإِنَّهُ بِئْسَ الضَّجِيعُ وَأَعُوذُ بِكَ مِنَ الْخِيَانَةِ فَإِنَّهَا بِئْسَتِ الْبِطَانَةُ",
    meaningEn: "O Allah, I seek refuge in Thee from hunger, for it is an evil bed-fellow; and I seek refuge in Thee from treachery, for it is an evil hidden trait.",
    sourceAr: "سنن أبي داود (1547) — عن أبي هريرة رضي الله عنه، حسّنه الألباني، وضعّفه زبير علي زئي",
    sourceEn: "Sunan Abi Dawud 1547 — narrated by Abu Hurairah; graded hasan by al-Albani and da'if by Zubair Ali Za'i",
    url: "https://sunnah.com/abudawud:1547",
    translation: datasetEnglish("Sunan Abi Dawud"),
  }),
];
