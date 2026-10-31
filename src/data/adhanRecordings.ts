// DITHAR — the reviewed Adhan recordings and their playable segments.
//
// Every recording is an untouched original file under public/audio/adhan/.
// Two kinds of playback copy exist, and `path` points at the copy when one
// is used — the originals are never edited:
//   converted/  — the two WMA originals as sample-aligned MP3 (Android
//                 WebView/Chrome cannot decode WMA).
//   optimized/  — 19 recordings whose embedded cover art / tags (MP3) or
//                 trailing index (M4A) made the browser wait 0.4–1.5 s before
//                 the first sound. Copied losslessly: same audio frames, tags
//                 removed (MP3) or index moved to the front (M4A); verified to
//                 decode to identical audio, so every timestamp below applies.
// Nothing here edits or trims audio: playback seeks to a segment's `start`
// and stops at its `end` (see src/lib/adhanAudio.ts).
//
// Segments were measured from the audio itself, not from filenames or
// durations: phrase boundaries from the muadhin's pauses (20 ms loudness
// analysis), phrase identity from Arabic speech recognition, checked
// against the adhan's fixed structure (10 phrases after the opening takbir
// for a regular adhan, 12 for Fajr). A recording is "fajr" only if
// «الصلاة خير من النوم» is actually heard in it. Segments end up to 0.6 s
// after their last phrase, never reaching into the following phrase.
//
// Opening start (full and takbeer, always equal): measured per recording at
// 10 ms resolution as the first sustained VOICED sound (periodic, 80–400 Hz,
// above the file's own noise floor) — so leading silence, hum, tape hiss and
// crowd ambience are excluded — then extended back through the attack of
// «الله» (the rise within 25 dB of the voice's peak, at most 0.3 s) and
// 20 ms of margin. Never earlier than the reviewed start, so intros excluded
// at review (e.g. noise before Ali Mulla's Isha adhan) stay excluded.
// Four starts were set by hand from the level/periodicity trace where steady
// hiss or ambience sat within 25 dB of the voice: refaat, masjid-an-nabawi-3,
// tobar, tobar-fajr. taha-fashni (a noisy 32 kbps copy) should be checked by
// ear. Per-recording measurements: docs/adhan-segments-onsets.json. Analysis data and the reviewed
// proposal: docs/adhan-segments-proposal.csv.
//
//   full       — the whole adhan, excluding leading noise and anything after
//                the closing «لا إله إلا الله» (e.g. a dua).
//   takbeer    — the opening takbirs only (ends before the first «أشهد»).
//   fajrPhrase — both «الصلاة خير من النوم» phrases only (Fajr recordings).
//
// Kinds:
//   "regular"      — no «الصلاة خير من النوم»; offered for the regular adhan.
//   "fajr"         — contains it; offered for Fajr.
//   "fajr-excerpt" — a short clip holding one «الصلاة خير من النوم» phrase;
//                    offered for Fajr's phrase-only mode and nothing else.
//
// Review status (2026-10-09): the takbeer and Fajr-phrase segments were
// approved after listening. Ali Mahmoud ("ali-mahmoud") is a very degraded
// early recording whose regular classification could not be confirmed by
// speech recognition; it is kept as regular pending review.

export type AdhanRecordingKind = "regular" | "fajr" | "fajr-excerpt";

/** Seconds into the file. */
export interface AdhanSegment {
  start: number;
  end: number;
}

export interface AdhanRecording {
  id: string;
  name: { en: string; ar: string };
  kind: AdhanRecordingKind;
  /** Path under public/, without a leading slash (joined to BASE_URL at play time). */
  path: string;
  /** Measured file duration, seconds. */
  duration: number;
  segments: {
    full: AdhanSegment | null;
    takbeer: AdhanSegment | null;
    fajrPhrase: AdhanSegment | null;
  };
}

export const adhanRecordings: readonly AdhanRecording[] = [
  {
    id: "abdulbasit-fajr",
    name: { en: "Abdul Basit Abdul Samad — Fajr", ar: "عبد الباسط عبد الصمد — الفجر" },
    kind: "fajr",
    path: "audio/adhan/optimized/Abdul Basit Abdul Samad - Fajr - Abdulbasit_Abdusamad_6_-_Fajr_Egypt_(عبد_الباسط_عبد_الصمد_-_فجر_مصر) [gh].mp3",
    duration: 293.45,
    segments: { full: { start: 1.20, end: 292.28 }, takbeer: { start: 1.20, end: 38.62 }, fajrPhrase: { start: 242.71, end: 266.70 } },
  },
  {
    id: "alafasy-fajr-hijaz",
    name: { en: "Mishary Alafasy — Fajr (Hijaz)", ar: "مشاري العفاسي — الفجر (حجاز)" },
    kind: "fajr",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - Fajr - azan-hejaz-2014-al-fajer [ia].mp3",
    duration: 215.64,
    segments: { full: { start: 0.32, end: 214.50 }, takbeer: { start: 0.32, end: 24.44 }, fajrPhrase: { start: 156.27, end: 182.62 } },
  },
  {
    id: "alafasy-fajr-kurd",
    name: { en: "Mishary Alafasy — Fajr (Kurd)", ar: "مشاري العفاسي — الفجر (كرد)" },
    kind: "fajr",
    path: "audio/adhan/Mishary Rashid Alafasy - Fajr - azan-kurd-low-2010-alfajr [gh].mp3",
    duration: 162.12,
    segments: { full: { start: 0.62, end: 161.58 }, takbeer: { start: 0.62, end: 19.32 }, fajrPhrase: { start: 116.35, end: 141.42 } },
  },
  {
    id: "alafasy-fajr-nahawand",
    name: { en: "Mishary Alafasy — Fajr (Nahawand)", ar: "مشاري العفاسي — الفجر (نهاوند)" },
    kind: "fajr",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - Fajr - azan-nahawand-2014-alfajr [ia].mp3",
    duration: 292.34,
    segments: { full: { start: 0.41, end: 291.44 }, takbeer: { start: 0.41, end: 36.16 }, fajrPhrase: { start: 224.01, end: 255.10 } },
  },
  {
    id: "alafasy-fajr-nawa-athar",
    name: { en: "Mishary Alafasy — Fajr (Nawa Athar)", ar: "مشاري العفاسي — الفجر (نوى أثر)" },
    kind: "fajr",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - Fajr - azan-nawa-athar-2014-al-fajr [ia].mp3",
    duration: 240.33,
    segments: { full: { start: 0.40, end: 239.06 }, takbeer: { start: 0.40, end: 34.94 }, fajrPhrase: { start: 182.17, end: 210.08 } },
  },
  {
    id: "alafasy-fajr-rast",
    name: { en: "Mishary Alafasy — Fajr (Rast)", ar: "مشاري العفاسي — الفجر (راست)" },
    kind: "fajr",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - Fajr - azan-rast-2014-al-fajr [ia].mp3",
    duration: 209.87,
    segments: { full: { start: 0.49, end: 208.76 }, takbeer: { start: 0.49, end: 24.76 }, fajrPhrase: { start: 150.97, end: 180.84 } },
  },
  {
    id: "alafasy-fajr-saba",
    name: { en: "Mishary Alafasy — Fajr (Saba)", ar: "مشاري العفاسي — الفجر (صبا)" },
    kind: "fajr",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - Fajr - azan-saba-2014-al-fajr [ia].mp3",
    duration: 207.44,
    segments: { full: { start: 0.33, end: 206.26 }, takbeer: { start: 0.33, end: 26.76 }, fajrPhrase: { start: 154.35, end: 178.08 } },
  },
  {
    id: "alafasy-fajr-phrase-excerpt",
    name: { en: "Mishary Alafasy — “As-salatu khayrun min an-nawm” excerpt", ar: "مشاري العفاسي — مقطع «الصلاة خير من النوم»" },
    kind: "fajr-excerpt",
    path: "audio/adhan/Mishary Rashid Alafasy - Fajr - alafasy_fajr_alsalato khair min alnawm.mp3",
    duration: 29.01,
    segments: { full: null, takbeer: null, fajrPhrase: { start: 6.71, end: 22.66 } },
  },
  {
    id: "omran-fajr",
    name: { en: "Mohamed Omran — Fajr", ar: "محمد عمران — الفجر" },
    kind: "fajr",
    path: "audio/adhan/Mohamed Omran - Fajr - mohamed_omran_fajr [gh].mp3",
    duration: 177.74,
    segments: { full: { start: 0.15, end: 177.74 }, takbeer: { start: 0.15, end: 27.52 }, fajrPhrase: { start: 134.49, end: 155.71 } },
  },
  {
    id: "tobar-fajr",
    name: { en: "Nasr El-Din Tobar — Fajr", ar: "نصر الدين طوبار — الفجر" },
    kind: "fajr",
    path: "audio/adhan/optimized/Nasr El-Din Tobar - Fajr - Fajr_Adhan_by_Nasreddine_Toubar_(اذان_الفجر_بصوت_نصر_الدين_طوبار) [gh].mp3",
    duration: 288.37,
    segments: { full: { start: 0.22, end: 288.37 }, takbeer: { start: 0.22, end: 26.50 }, fajrPhrase: { start: 232.39, end: 258.88 } },
  },
  {
    id: "masjid-al-haram-fajr",
    name: { en: "Masjid al-Haram, Makkah — Fajr", ar: "المسجد الحرام بمكة — الفجر" },
    kind: "fajr",
    path: "audio/adhan/optimized/المسجد الحرام 1.m4a",
    duration: 213.60,
    segments: { full: { start: 3.72, end: 212.54 }, takbeer: { start: 3.72, end: 29.22 }, fajrPhrase: { start: 160.09, end: 186.60 } },
  },
  {
    id: "masjid-an-nabawi-fajr",
    name: { en: "Al-Masjid an-Nabawi, Madinah — Fajr", ar: "المسجد النبوي بالمدينة — الفجر" },
    kind: "fajr",
    path: "audio/adhan/optimized/المسجد النبوي.m4a",
    duration: 307.39,
    segments: { full: { start: 1.37, end: 307.39 }, takbeer: { start: 1.37, end: 36.18 }, fajrPhrase: { start: 236.65, end: 270.56 } },
  },
  {
    id: "abdulbasit",
    name: { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" },
    kind: "regular",
    path: "audio/adhan/optimized/Abdul Basit Abdul Samad - Abdulbasit_Abdusamad_1_-_Egypt_(عبد_الباسط_عبد_الصمد_-_مصر) [ia].mp3",
    duration: 248.53,
    segments: { full: { start: 1.90, end: 242.12 }, takbeer: { start: 1.90, end: 31.38 }, fajrPhrase: null },
  },
  {
    id: "shuaisha",
    name: { en: "Abu Al-Enein Shuaisha", ar: "أبو العينين شعيشع" },
    kind: "regular",
  // original: Abu Al-Enein Shuaisha - Abul_Ainain_Shuaisha_-_Cairo_(أبو_العينين_شعيشع_-_القاهرة) [ia].wma
    path: "audio/adhan/converted/Abu Al-Enein Shuaisha - Abul_Ainain_Shuaisha_-_Cairo_(أبو_العينين_شعيشع_-_القاهرة) [ia].mp3",
    duration: 234.10,
    segments: { full: { start: 0.65, end: 233.78 }, takbeer: { start: 0.65, end: 20.96 }, fajrPhrase: null },
  },
  {
    id: "nafees",
    name: { en: "Ahmed Al-Nafees", ar: "أحمد النفيس" },
    kind: "regular",
    path: "audio/adhan/Ahmed Al-Nafees - Ahmad_Al_Nafees_(أحمد_النفيس) [gh].mp3",
    duration: 212.82,
    segments: { full: { start: 0.47, end: 204.76 }, takbeer: { start: 0.47, end: 35.68 }, fajrPhrase: null },
  },
  {
    id: "nuaina",
    name: { en: "Ahmed Nuaina", ar: "أحمد نعينع" },
    kind: "regular",
    path: "audio/adhan/Ahmed Nuaina - Ahmed_Nuinaa_2_-_Cairo_(أحمد_نعينع_-_القاهرة) [gh].mp3",
    duration: 210.06,
    segments: { full: { start: 0.62, end: 209.12 }, takbeer: { start: 0.62, end: 24.36 }, fajrPhrase: null },
  },
  {
    id: "ali-mahmoud",
    name: { en: "Ali Mahmoud", ar: "علي محمود" },
    kind: "regular",
    path: "audio/adhan/Ali Mahmoud - adhan [ia].mp3",
    duration: 149.32,
    segments: { full: { start: 0.31, end: 148.92 }, takbeer: { start: 0.31, end: 20.37 }, fajrPhrase: null },
  },
  {
    id: "mulla-haram",
    name: { en: "Ali bin Ahmed Mulla — Masjid al-Haram", ar: "علي بن أحمد ملا — المسجد الحرام" },
    kind: "regular",
    path: "audio/adhan/Ali bin Ahmed Mulla - AzanAlHaram [ia].mp3",
    duration: 217.52,
    segments: { full: { start: 0.17, end: 216.60 }, takbeer: { start: 0.17, end: 33.44 }, fajrPhrase: null },
  },
  {
    id: "mulla-isha-1445",
    name: { en: "Ali bin Ahmed Mulla — Isha (1445 AH)", ar: "علي بن أحمد ملا — العشاء (١٤٤٥هـ)" },
    kind: "regular",
    path: "audio/adhan/Ali bin Ahmed Mulla - yt5s_io_أذان_العشاء_للمؤذن_علي_ملا_الأحد_8_شعبان_1445هـ_1080p [ia].mp3",
    duration: 222.03,
    segments: { full: { start: 4.22, end: 220.84 }, takbeer: { start: 4.22, end: 22.52 }, fajrPhrase: null },
  },
  {
    id: "banna",
    name: { en: "Mahmoud Ali Al-Banna", ar: "محمود علي البنا" },
    kind: "regular",
  // Same "Cairo" performance as the former Internet Archive copy, which was
  // missing the first «الله أكبر الله أكبر» pair. Source: GitHub
  // bilalelsayed97/adhan_sounds (tags: islamweb.net, 2006).
    path: "audio/adhan/Mahmoud Ali Al-Banna - mahmoud_ali_albanna [gh].mp3",
    duration: 164.63,
    segments: { full: { start: 0.2, end: 164.6 }, takbeer: { start: 0.2, end: 23.4 }, fajrPhrase: null },
  },
  {
    id: "husary",
    name: { en: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" },
    kind: "regular",
    path: "audio/adhan/optimized/Mahmoud Khalil Al-Husary - Mahmoud_Khalil_Al_Hussary_-_Cairo_(محمود_خليل_الحصري_-_القاهرة) [ia].mp3",
    duration: 128.14,
    segments: { full: { start: 1.26, end: 127.88 }, takbeer: { start: 1.26, end: 13.36 }, fajrPhrase: null },
  },
  {
    id: "mahmoud-ramadan",
    name: { en: "Mahmoud Mohamed Ramadan", ar: "محمود محمد رمضان" },
    kind: "regular",
    path: "audio/adhan/optimized/Mahmoud Mohamed Ramadan - adhan 1397 AH [gh].mp3",
    duration: 234.32,
    segments: { full: { start: 0.43, end: 232.44 }, takbeer: { start: 0.43, end: 36.02 }, fajrPhrase: null },
  },
  {
    id: "alafasy-saba-2",
    name: { en: "Mishary Alafasy (Saba)", ar: "مشاري العفاسي (صبا)" },
    kind: "regular",
    path: "audio/adhan/Mishary Rashid Alafasy -  azan-saba-2-2014-al-fajr [gh].mp3",
    duration: 246.39,
    segments: { full: { start: 0.51, end: 245.84 }, takbeer: { start: 0.51, end: 33.90 }, fajrPhrase: null },
  },
  {
    id: "alafasy-classic",
    name: { en: "Mishary Alafasy", ar: "مشاري العفاسي" },
    kind: "regular",
    path: "audio/adhan/optimized/Mishary Rashid Alafasy - 009-mshare-rashed__up_by_muslem [ia].mp3",
    duration: 231.97,
    segments: { full: { start: 0.26, end: 230.84 }, takbeer: { start: 0.26, end: 35.32 }, fajrPhrase: null },
  },
  {
    id: "alafasy-kuwait",
    name: { en: "Mishary Alafasy — Kuwait", ar: "مشاري العفاسي — الكويت" },
    kind: "regular",
    path: "audio/adhan/Mishary Rashid Alafasy - Mishary_Rashid_Alafasy_2_-_Kuwait_(مشاري_راشد_العفاسي_-_الكويت) [ia].mp3",
    duration: 231.63,
    segments: { full: { start: 0.35, end: 229.56 }, takbeer: { start: 0.35, end: 37.72 }, fajrPhrase: null },
  },
  {
    id: "tablawi",
    name: { en: "Mohamed Mahmoud Al-Tablawi", ar: "محمد محمود الطبلاوي" },
    kind: "regular",
    path: "audio/adhan/Mohamed Mahmoud Al-Tablawi - muhammed_altablawy [gh].mp3",
    duration: 188.79,
    segments: { full: { start: 0.93, end: 188.79 }, takbeer: { start: 0.93, end: 18.88 }, fajrPhrase: null },
  },
  {
    id: "omran",
    name: { en: "Mohamed Omran", ar: "محمد عمران" },
    kind: "regular",
    path: "audio/adhan/optimized/Mohamed Omran - Azan Mohamed Imran 256kbps [ia].mp3",
    duration: 185.41,
    segments: { full: { start: 1.41, end: 182.82 }, takbeer: { start: 1.41, end: 24.36 }, fajrPhrase: null },
  },
  {
    id: "refaat",
    name: { en: "Mohamed Refaat", ar: "محمد رفعت" },
    kind: "regular",
    path: "audio/adhan/optimized/Mohamed Refaat - اذان المغرب لفضيلة الشيخ محمد رفعت رحمة الله [ia].mp3",
    duration: 233.77,
    segments: { full: { start: 1.19, end: 233.38 }, takbeer: { start: 1.19, end: 28.08 }, fajrPhrase: null },
  },
  {
    id: "minshawi",
    name: { en: "Mohamed Siddiq El-Minshawi", ar: "محمد صديق المنشاوي" },
    kind: "regular",
    path: "audio/adhan/Mohamed Siddiq El-Minshawi - menshawi_rast [gh].mp3",
    duration: 188.97,
    segments: { full: { start: 0.59, end: 188.66 }, takbeer: { start: 0.59, end: 29.52 }, fajrPhrase: null },
  },
  {
    id: "mustafa-ismail",
    name: { en: "Mustafa Ismail", ar: "مصطفى إسماعيل" },
    kind: "regular",
    path: "audio/adhan/Mustafa Ismail - Mustafa_Ismail_-_Egypt_(مصطفى_إسماعيل_-_مصر) [ia].mp3",
    duration: 183.14,
    segments: { full: { start: 0.02, end: 183.14 }, takbeer: { start: 0.02, end: 27.20 }, fajrPhrase: null },
  },
  {
    id: "tobar",
    name: { en: "Nasr El-Din Tobar", ar: "نصر الدين طوبار" },
    kind: "regular",
    path: "audio/adhan/Nasr El-Din Tobar - nasr_eldeen_toubar [gh].mp3",
    duration: 220.85,
    segments: { full: { start: 0.25, end: 220.85 }, takbeer: { start: 0.25, end: 26.08 }, fajrPhrase: null },
  },
  {
    id: "qatami",
    name: { en: "Nasser Al-Qatami", ar: "ناصر القطامي" },
    kind: "regular",
    path: "audio/adhan/Nasser Al-Qatami - Nasser_Al_Qatami_-_HQ_(ناصر_القطامي) [aladha].mp3",
    duration: 131.52,
    segments: { full: { start: 0.00, end: 128.64 }, takbeer: { start: 0.00, end: 26.00 }, fajrPhrase: null },
  },
  {
    id: "saad-ghamdi",
    name: { en: "Saad Al-Ghamdi", ar: "سعد الغامدي" },
    kind: "regular",
    path: "audio/adhan/optimized/Saad Al-Ghamdi - SaadAlGhamidiAthan [ia].m4a",
    duration: 138.46,
    segments: { full: { start: 1.35, end: 117.28 }, takbeer: { start: 1.35, end: 19.20 }, fajrPhrase: null },
  },
  {
    id: "naqshbandi",
    name: { en: "Sayed Al-Naqshbandi", ar: "سيد النقشبندي" },
    kind: "regular",
    path: "audio/adhan/optimized/Sayed Al-Naqshbandi - Sheikh_Al_Naqshbandi_(الشيخ_النقشبندى) [gh].mp3",
    duration: 136.70,
    segments: { full: { start: 0.07, end: 136.00 }, takbeer: { start: 0.07, end: 16.98 }, fajrPhrase: null },
  },
  {
    id: "taha-fashni",
    name: { en: "Taha Al-Fashni", ar: "طه الفشني" },
    kind: "regular",
    path: "audio/adhan/optimized/taha alfashni.mp3",
    duration: 222.37,
    segments: { full: { start: 0.60, end: 222.37 }, takbeer: { start: 0.60, end: 31.28 }, fajrPhrase: null },
  },
  {
    id: "masjid-an-nabawi-2",
    name: { en: "Al-Masjid an-Nabawi, Madinah (2)", ar: "المسجد النبوي بالمدينة (٢)" },
    kind: "regular",
    path: "audio/adhan/optimized/المسجد النبوي 2.m4a",
    duration: 235.17,
    segments: { full: { start: 0.23, end: 235.17 }, takbeer: { start: 0.23, end: 30.96 }, fajrPhrase: null },
  },
  {
    id: "masjid-an-nabawi-3",
    name: { en: "Al-Masjid an-Nabawi, Madinah (3)", ar: "المسجد النبوي بالمدينة (٣)" },
    kind: "regular",
    path: "audio/adhan/المسجد النبوي 3.mp3",
    duration: 221.98,
    segments: { full: { start: 1.30, end: 220.52 }, takbeer: { start: 1.30, end: 32.18 }, fajrPhrase: null },
  },
];

export function getAdhanRecordingById(id: string): AdhanRecording | undefined {
  return adhanRecordings.find((r) => r.id === id);
}

/**
 * The muezzin heard in each recording, as attributed by the recording's
 * own source (see its name) — null when the source names a mosque but not
 * who calls the adhan: then no muezzin is shown, never a guess. Shown on
 * the adhan's playback notification / system media controls.
 */
export const ADHAN_MUEZZINS: Readonly<Record<string, { en: string; ar: string } | null>> = {
  "abdulbasit-fajr": { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" },
  "alafasy-fajr-hijaz": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-kurd": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-nahawand": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-nawa-athar": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-rast": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-saba": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-fajr-phrase-excerpt": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "omran-fajr": { en: "Mohamed Omran", ar: "محمد عمران" },
  "tobar-fajr": { en: "Nasr El-Din Tobar", ar: "نصر الدين طوبار" },
  "masjid-al-haram-fajr": null,
  "masjid-an-nabawi-fajr": null,
  "abdulbasit": { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" },
  "shuaisha": { en: "Abu Al-Enein Shuaisha", ar: "أبو العينين شعيشع" },
  "nafees": { en: "Ahmed Al-Nafees", ar: "أحمد النفيس" },
  "nuaina": { en: "Ahmed Nuaina", ar: "أحمد نعينع" },
  "ali-mahmoud": { en: "Ali Mahmoud", ar: "علي محمود" },
  "mulla-haram": { en: "Ali bin Ahmed Mulla", ar: "علي بن أحمد ملا" },
  "mulla-isha-1445": { en: "Ali bin Ahmed Mulla", ar: "علي بن أحمد ملا" },
  "banna": { en: "Mahmoud Ali Al-Banna", ar: "محمود علي البنا" },
  "husary": { en: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" },
  "mahmoud-ramadan": { en: "Mahmoud Mohamed Ramadan", ar: "محمود محمد رمضان" },
  "alafasy-saba-2": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-classic": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "alafasy-kuwait": { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" },
  "tablawi": { en: "Mohamed Mahmoud Al-Tablawi", ar: "محمد محمود الطبلاوي" },
  "omran": { en: "Mohamed Omran", ar: "محمد عمران" },
  "refaat": { en: "Mohamed Refaat", ar: "محمد رفعت" },
  "minshawi": { en: "Mohamed Siddiq El-Minshawi", ar: "محمد صديق المنشاوي" },
  "mustafa-ismail": { en: "Mustafa Ismail", ar: "مصطفى إسماعيل" },
  "tobar": { en: "Nasr El-Din Tobar", ar: "نصر الدين طوبار" },
  "qatami": { en: "Nasser Al-Qatami", ar: "ناصر القطامي" },
  "saad-ghamdi": { en: "Saad Al-Ghamdi", ar: "سعد الغامدي" },
  "naqshbandi": { en: "Sayed Al-Naqshbandi", ar: "سيد النقشبندي" },
  "taha-fashni": { en: "Taha Al-Fashni", ar: "طه الفشني" },
  "masjid-an-nabawi-2": null,
  "masjid-an-nabawi-3": null,
};

/** The recording's muezzin in `language`, or null when it isn't reliably known. */
export function adhanMuezzinName(recording: AdhanRecording, language: "ar" | "en"): string | null {
  return ADHAN_MUEZZINS[recording.id]?.[language] ?? null;
}
