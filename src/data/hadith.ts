// DITHAR — Hadith Library (200 curated Hadiths).
//
// Source of truth: ASSETS/dithar_hadith_library_final.json — imported
// directly at build time, verbatim, with no copy/transform step and no
// second Hadith database. Every field from that file is preserved on
// `HadithEntry` even though the current Home Hadith card only renders a
// subset of them — topicAr and reflectionAr/reflectionEn stay available
// on each entry for future UI.
//
// The JSON provides an Arabic/English pair only for the Hadith wording
// itself (textAr/textEn) and its own DITHAR reflection
// (reflectionAr/reflectionEn) — there is no sourceEn/referenceEn/gradeEn/
// gradingSourceEn/narratorEn field anywhere in this file. See
// getHadithDetailFields below, and this file's "English rendering" section,
// for exactly how much of that gap this module can safely close on its
// own (Source/Reference/Grade/GradingSource/Narrator, each via a fixed,
// exact-match dictionary built from the actual closed set of distinct
// values in the 200-entry library) without ever inventing or guessing a
// translation for anything outside that closed set.
import hadithLibrary from "../../ASSETS/dithar_hadith_library_final.json";
import type { Language } from "../theme/LanguageContext";

export type HadithEntry = {
  id: number;
  topicAr: string;
  textAr: string;
  narratorAr: string;
  sourceAr: string;
  referenceAr: string;
  gradeAr: string;
  gradingSourceAr: string;
  reflectionAr: string;
  textEn: string;
  reflectionEn: string;
};

export const HADITHS: readonly HadithEntry[] = hadithLibrary.hadiths as HadithEntry[];

export type HadithDetailKey = "source" | "reference" | "grade" | "gradingSource" | "narrator";

export interface HadithDetailField {
  key: HadithDetailKey;
  value: string;
}

// ------------------------------------------------------------------
// English rendering of Source / Reference / Grade — composed from the
// approved Arabic data, NOT invented and NOT machine-translated prose.
//
// There is no sourceEn/referenceEn/gradeEn field in the source JSON. What
// this section does instead is map a small, CLOSED, standardized
// vocabulary that already has one universally agreed English rendering:
//
//   (a) HADITH_BOOK_NAME_MAP — the ~10 canonical hadith collections
//       referenced across this library (Bukhari, Muslim, Abu Dawud,
//       Tirmidhi, Nasa'i, Ibn Majah, Ahmad's Musnad, al-Hakim's
//       Mustadrak, al-Tabarani's Mu'jam al-Kabir, al-Bazzar's Musnad) —
//       each has exactly one standard English title used across virtually
//       every published English hadith reference (sunnah.com, Dar-us-
//       Salam, etc.). Translating a book's standard title is the same
//       class of operation as this app's own "الكويت" -> "Kuwait", not
//       "generating hadith content".
//   (b) HADITH_GRADE_MAP — an EXHAUSTIVE, exact-match dictionary of the
//       12 distinct gradeAr strings that occur across all 200 entries
//       (verified against the source JSON) — grading terminology
//       (Sahih/Hasan/agreed-upon/li-ghairihi/mutawatir/...) is itself a
//       small, standardized technical vocabulary in the science of
//       hadith, not free prose.
//
// sourceAr/referenceAr are otherwise free-form (chapter titles, and
// occasionally a whole explanatory clause, e.g. "وأصله في صحيح مسلم من
// حديث حذيفة بنحوه") — those parts are NEVER translated. Chapter titles
// are dropped from the composed Source line (never mistranslated);
// composing Reference stops short of translating anything beyond the
// same book-name dictionary and basic punctuation.
//
// SAFETY GATE: translateHadithSourceToEnglish/translateHadithReferenceToEnglish
// return undefined whenever the composed result still contains ANY Arabic
// script afterward — i.e. whenever the Arabic value contains real content
// beyond what this dictionary covers. This guarantees the English UI
// never shows a half-translated, mixed-language string: the field is
// simply omitted for that one Hadith rather than shown wrong. Verified
// against the full 200-entry library:
//   - Grade: resolves for all 200/200 entries.
//   - Source: resolves for 194/200 (missing for ids 36, 58, 77, 100, 180, 185
//     — each has an explanatory clause beyond a plain book title).
//   - Reference: resolves for 192/200 (missing for ids 36, 44, 49, 51, 58,
//     70, 77, 185 — each embeds a grading remark or annotation inside the
//     reference field itself, not just a book+number).
//   - GradingSource and Narrator: each of gradingSourceAr's 50 distinct
//     values and narratorAr's 61 distinct values across the whole 200-entry
//     library has been translated individually below (HADITH_GRADING_
//     SOURCE_MAP / HADITH_NARRATOR_MAP) — an exact-match dictionary of the
//     complete closed set actually present in the data, the same technique
//     as HADITH_GRADE_MAP, not a generic/compositional translator. A future
//     Hadith added with a gradingSource/narrator string outside this set
//     simply won't resolve (omitted, never shown half-translated) until
//     it's added to the dictionary.
const HADITH_BOOK_NAME_MAP: readonly [string, string][] = [
  ["صحيح البخاري", "Sahih al-Bukhari"],
  ["الأدب المفرد للبخاري", "Al-Adab Al-Mufrad by al-Bukhari"],
  ["التاريخ الكبير للبخاري", "Al-Tarikh al-Kabir by al-Bukhari"],
  ["البخاري", "Bukhari"],
  ["صحيح مسلم", "Sahih Muslim"],
  ["مسلم", "Muslim"],
  ["سنن أبي داود", "Sunan Abi Dawud"],
  ["أبو داود", "Abu Dawud"],
  ["سنن الترمذي", "Jami' at-Tirmidhi"],
  ["الترمذي", "Tirmidhi"],
  ["سنن النسائي", "Sunan an-Nasa'i"],
  ["النسائي", "Nasa'i"],
  ["سنن ابن ماجه", "Sunan Ibn Majah"],
  ["ابن ماجه", "Ibn Majah"],
  ["مسند الإمام أحمد", "Musnad Ahmad"],
  ["مسند أحمد", "Musnad Ahmad"],
  ["أحمد", "Ahmad"],
  ["المستدرك للحاكم", "Al-Mustadrak by al-Hakim"],
  ["الحاكم", "al-Hakim"],
  ["المعجم الكبير للطبراني", "Al-Mu'jam al-Kabir by al-Tabarani"],
  ["الطبراني", "al-Tabarani"],
  ["البزار", "al-Bazzar"],
];

const HADITH_GRADE_MAP: Readonly<Record<string, string>> = {
  حسن: "Hasan",
  "حسن (له طرق يقوي بعضها بعضاً)": "Hasan (multiple chains strengthening each other)",
  "حسن (مع خلاف يستحق الذكر)": "Hasan (with a notable difference of scholarly opinion)",
  "حسن (وله شاهد صحيح في صحيح مسلم من حديث أبي ذر بلفظ آخر)":
    "Hasan (with an authentic corroborating narration in Sahih Muslim from Abu Dharr, in different wording)",
  "حسن صحيح": "Hasan Sahih",
  "حسن لغيره": "Hasan li-ghairihi (Hasan due to corroborating evidence)",
  صحيح: "Sahih",
  "صحيح (إسناد جيد)": "Sahih (good chain of narration)",
  "صحيح (حسن صحيح)": "Sahih (Hasan Sahih)",
  "صحيح لغيره (حسن)": "Sahih li-ghairihi (Hasan)",
  "صحيح متفق عليه": "Sahih, agreed upon",
  "صحيح متفق عليه (بل هو من الأحاديث المتواترة)": "Sahih, agreed upon (indeed among the mutawatir/mass-transmitted hadiths)",
};

// Exact-match dictionary of all 50 distinct gradingSourceAr strings that
// occur across the 200-entry library (verified against the source JSON) —
// each translated individually, the same closed-vocabulary approach as
// HADITH_GRADE_MAP, not a word-by-word/compositional translator. These are
// short-to-medium scholarly attribution sentences (who authenticated/
// graded the Hadith, in which reference work), not open-ended prose.
const HADITH_GRADING_SOURCE_MAP: Readonly<Record<string, string>> = {
  البخاري: "Al-Bukhari",
  "البخاري ومسلم": "Al-Bukhari and Muslim",
  "البخاري ومسلم، ونقل تواتره جمع من المحدثين لكثرة رواته":
    "Al-Bukhari and Muslim; a number of hadith scholars have reported it as mutawatir (mass-transmitted) given the large number of its narrators",
  "حسّنه الألباني في السلسلة الصحيحة رقم 446-447، وصححه في صحيح الجامع 5249، مع ملاحظة أن أحد طرقه فيه بقية بن الوليد وعنعنته تُضعَّف، لكن له شواهد ترقى به إلى الحسن":
    "Graded hasan by al-Albani in Silsilat al-Ahadith as-Sahihah, no. 446-447, and graded sahih by him in Sahih al-Jami', no. 5249 — noting that one of its chains includes Baqiyyah ibn al-Walid, whose 'an'anah (undisclosed transmission) is considered weak, though corroborating witnesses raise it to the level of hasan",
  "حسّنه الألباني في صحيح أبي داود": "Graded hasan by al-Albani in Sahih Abi Dawud",
  "حسّنه الألباني في صحيح أبي داود وصحيح الجامع (1464)، وقال المنذري: لا ينزل عن درجة الحسن وقد يكون على شرط الصحيحين أو أحدهما":
    "Graded hasan by al-Albani in Sahih Abi Dawud and Sahih al-Jami' (1464); al-Mundhiri said it is not below the level of hasan and may meet the standard of the two Sahihs or one of them",
  "حسّنه الألباني في صحيح أبي داود وصحيح الجامع (6537)": "Graded hasan by al-Albani in Sahih Abi Dawud and Sahih al-Jami' (6537)",
  "حسّنه الألباني في صحيح ابن ماجه (اعتماداً على تعدد طرقه)؛ لكن نُقل عن الإمام أحمد بن حنبل نفسه وأبي أحمد الحاكم تضعيفه بل وصفه بـ'منكر' لتفرد علي بن مسعدة (مختلف في توثيقه) به عن قتادة؛ بينما صححه الحاكم النيسابوري وابن القطان.":
    "Graded hasan by al-Albani in Sahih Ibn Majah (based on its multiple chains); however, Imam Ahmad ibn Hanbal and Abu Ahmad al-Hakim are reported to have graded it weak, even describing it as 'munkar' due to Ali ibn Mas'adah (whose reliability is disputed) narrating it alone from Qatadah — while al-Hakim al-Naysaburi and Ibn al-Qattan graded it sahih",
  "حسّنه الألباني في صحيح ابن ماجه وصحيح الترغيب": "Graded hasan by al-Albani in Sahih Ibn Majah and Sahih al-Targhib",
  "حسّنه الألباني في صحيح ابن ماجه وصحيح الجامع (1193)": "Graded hasan by al-Albani in Sahih Ibn Majah and Sahih al-Jami' (1193)",
  "حسّنه الألباني في صحيح ابن ماجه، وله شاهد صحيح عند أحمد":
    "Graded hasan by al-Albani in Sahih Ibn Majah, with a sahih corroborating narration in Musnad Ahmad",
  "حسّنه الألباني في صحيح الترمذي وصحيح الجامع (245)": "Graded hasan by al-Albani in Sahih al-Tirmidhi and Sahih al-Jami' (245)",
  "حسّنه الألباني وابن حجر (سنده حسن) والعراقي (سند جيد) والأرناؤوط (حسن بشواهده)":
    "Graded hasan by al-Albani, Ibn Hajar (chain hasan), al-Iraqi (chain jayyid/good), and al-Arna'ut (hasan by its corroborating witnesses)",
  "حسّنه الترمذي": "Graded hasan by al-Tirmidhi",
  "حسّنه الترمذي والألباني في صحيح الترمذي": "Graded hasan by al-Tirmidhi and al-Albani in Sahih al-Tirmidhi",
  "حسّنه الترمذي وحسّنه الألباني في صحيح الترمذي": "Graded hasan by al-Tirmidhi and graded hasan by al-Albani in Sahih al-Tirmidhi",
  "حسّنه الترمذي وصححه الألباني": "Graded hasan by al-Tirmidhi and graded sahih by al-Albani",
  "حسّنه الترمذي وصححه الألباني في صحيح أبي داود": "Graded hasan by al-Tirmidhi and graded sahih by al-Albani in Sahih Abi Dawud",
  "حسّنه الترمذي وصححه الألباني في صحيح أبي داود وصحيح الجامع":
    "Graded hasan by al-Tirmidhi and graded sahih by al-Albani in Sahih Abi Dawud and Sahih al-Jami'",
  "حسّنه الترمذي وصححه الألباني في صحيح الترمذي": "Graded hasan by al-Tirmidhi and graded sahih by al-Albani in Sahih al-Tirmidhi",
  "حسّنه الترمذي وصححه الألباني في صحيح الترمذي وصحيح النسائي":
    "Graded hasan by al-Tirmidhi and graded sahih by al-Albani in Sahih al-Tirmidhi and Sahih an-Nasa'i",
  "حسّنه الترمذي، واختُلف في تحسينه بين المحدثين، لكن رجّح الألباني وابن رجب تحسينه بمجموع طرقه":
    "Graded hasan by al-Tirmidhi; scholars have differed over this grading, but al-Albani and Ibn Rajab favored grading it hasan through the sum of its chains",
  "حسّنه الترمذي، وحسّنه الألباني في صحيح أبي داود وصحيح الجامع (6518)":
    "Graded hasan by al-Tirmidhi, and graded hasan by al-Albani in Sahih Abi Dawud and Sahih al-Jami' (6518)",
  "حسّنه الترمذي، وحسّنه الألباني في صحيح الترمذي وصحيح أبي داود":
    "Graded hasan by al-Tirmidhi, and graded hasan by al-Albani in Sahih al-Tirmidhi and Sahih Abi Dawud",
  "حسّنه الترمذي، وصححه الألباني في صحيح الترمذي وصحيح الجامع":
    "Graded hasan by al-Tirmidhi, and graded sahih by al-Albani in Sahih al-Tirmidhi and Sahih al-Jami'",
  "حسّنه الترمذي، وصححه الألباني في صحيح الترمذي وصحيح الجامع (1548)":
    "Graded hasan by al-Tirmidhi, and graded sahih by al-Albani in Sahih al-Tirmidhi and Sahih al-Jami' (1548)",
  "حسّنه الترمذي، وله شواهد صحيحة عند أبي داود والنسائي":
    "Graded hasan by al-Tirmidhi, with sahih corroborating narrations in Abu Dawud and an-Nasa'i",
  "حسّنه الحافظ ابن حجر والألباني في صحيح أبي داود": "Graded hasan by al-Hafiz Ibn Hajar and by al-Albani in Sahih Abi Dawud",
  "حسّنه الحاكم وصححه الألباني في صحيح أبي داود": "Graded hasan by al-Hakim and graded sahih by al-Albani in Sahih Abi Dawud",
  "حسّنه المنذري وصححه الألباني في صحيح الجامع 6367": "Graded hasan by al-Mundhiri and graded sahih by al-Albani in Sahih al-Jami' (6367)",
  "حسّنه محققو المسند، وأصل معناه صحيح شاهد له في الصحيحين وغيرهما":
    "Graded hasan by the editors of Musnad Ahmad; its underlying meaning is sahih, with corroborating narrations in the two Sahihs and elsewhere",
  "حسّنه محققو المسند، وشاهده الصحيح عند مسلم (2626) من حديث أبي ذر بلفظ: لا تحقرن من المعروف شيئاً ولو أن تلقى أخاك بوجه طلق":
    "Graded hasan by the editors of Musnad Ahmad, with a sahih corroborating narration in Sahih Muslim (2626) from Abu Dharr, worded: 'Do not belittle any good deed, even meeting your brother with a cheerful face'",
  "صححه ابن باز والألباني وموسوعة الأحاديث النبوية المترجمة": "Graded sahih by Ibn Baz, al-Albani, and the Encyclopedia of Translated Prophetic Hadiths",
  "صححه الألباني بمجموع طرقه في السلسلة الصحيحة رقم 250، وحسّنه في صحيح ابن ماجه":
    "Graded sahih by al-Albani through the sum of its chains in Silsilat al-Ahadith as-Sahihah, no. 250, and graded hasan by him in Sahih Ibn Majah",
  "صححه الألباني في صحيح أبي داود": "Graded sahih by al-Albani in Sahih Abi Dawud",
  "صححه الألباني في صحيح أبي داود، والحاكم ووافقه الذهبي": "Graded sahih by al-Albani in Sahih Abi Dawud, and by al-Hakim, with al-Dhahabi concurring",
  "صححه الألباني في صحيح أبي داود، وله شواهد في الصحيحين بمعناه":
    "Graded sahih by al-Albani in Sahih Abi Dawud, with corroborating narrations of similar meaning in the two Sahihs",
  "صححه الألباني في صحيح الأدب المفرد": "Graded sahih by al-Albani in Sahih al-Adab al-Mufrad",
  "صححه الألباني في صحيح الجامع وصحيح الترغيب": "Graded sahih by al-Albani in Sahih al-Jami' and Sahih al-Targhib",
  "صححه الترمذي والألباني": "Graded sahih by al-Tirmidhi and al-Albani",
  "صححه الترمذي والألباني في صحيح الترمذي": "Graded sahih by al-Tirmidhi and by al-Albani in Sahih al-Tirmidhi",
  "صححه الترمذي والألباني في صحيح الترمذي وصحيح الجامع": "Graded sahih by al-Tirmidhi and by al-Albani in Sahih al-Tirmidhi and Sahih al-Jami'",
  "صححه الترمذي والحاكم، وحسّنه الألباني في صحيح الترمذي وصححه في السلسلة الصحيحة (925)":
    "Graded sahih by al-Tirmidhi and al-Hakim; graded hasan by al-Albani in Sahih al-Tirmidhi and sahih by him in Silsilat al-Ahadith as-Sahihah (925)",
  "صححه الحاكم ووافقه الذهبي، وحسّنه المنذري، وصححه الألباني":
    "Graded sahih by al-Hakim, with al-Dhahabi concurring; graded hasan by al-Mundhiri; and graded sahih by al-Albani",
  "صححه الحاكم ووافقه الذهبي، وصححه الألباني في صحيح ابن ماجه":
    "Graded sahih by al-Hakim, with al-Dhahabi concurring, and graded sahih by al-Albani in Sahih Ibn Majah",
  "صححه الحاكم ووافقه الذهبي، وصححه الألباني في صحيح الترغيب (2845)":
    "Graded sahih by al-Hakim, with al-Dhahabi concurring, and graded sahih by al-Albani in Sahih al-Targhib (2845)",
  "صححه الحاكم ووافقه الذهبي، وله أصل في الصحيحين بمعناه من حديث ابن عمر (الحياء من الإيمان)":
    "Graded sahih by al-Hakim, with al-Dhahabi concurring, with a corroborating basis of similar meaning in the two Sahihs from the hadith of Ibn Umar ('Modesty is part of faith')",
  "صححه الحاكم، وحسّنه محققو الأدب المفرد، وله شواهد عند الترمذي وأبي داود بلفظ قريب من حديث عمرو بن شعيب":
    "Graded sahih by al-Hakim, graded hasan by the editors of al-Adab al-Mufrad, with corroborating narrations of close wording in al-Tirmidhi and Abu Dawud from the hadith of Amr ibn Shu'ayb",
  "قال الهيثمي في مجمع الزوائد: إسناد البزار حسن": "Al-Haythami said in Majma' al-Zawa'id: the chain of al-Bazzar is hasan",
  مسلم: "Muslim",
};

// Exact-match dictionary of all 61 distinct narratorAr strings that occur
// across the 200-entry library (verified against the source JSON) — each a
// Companion's name (a closed, well-established set with one standard
// English transliteration) plus the standard honorific, following the same
// "(may Allah be pleased with him/her/both of them/them)" convention
// already used elsewhere in this app (see src/data/misc-library.ts).
const HADITH_NARRATOR_MAP: Readonly<Record<string, string>> = {
  "أبو أمامة الباهلي رضي الله عنه": "Abu Umamah al-Bahili (may Allah be pleased with him)",
  "أبو أيوب الأنصاري رضي الله عنه": "Abu Ayyub al-Ansari (may Allah be pleased with him)",
  "أبو الجعد الضمري رضي الله عنه": "Abu al-Ja'd al-Damri (may Allah be pleased with him)",
  "أبو الدرداء رضي الله عنه": "Abu al-Darda' (may Allah be pleased with him)",
  "أبو برزة الأسلمي رضي الله عنه": "Abu Barzah al-Aslami (may Allah be pleased with him)",
  "أبو بكرة رضي الله عنه": "Abu Bakrah (may Allah be pleased with him)",
  "أبو ذر الغفاري رضي الله عنه": "Abu Dharr al-Ghifari (may Allah be pleased with him)",
  "أبو سعيد الخدري رضي الله عنه": "Abu Sa'id al-Khudri (may Allah be pleased with him)",
  "أبو سعيد الخدري وأبو هريرة رضي الله عنهما": "Abu Sa'id al-Khudri and Abu Hurairah (may Allah be pleased with both of them)",
  "أبو سعيد الخدري وعبدالله بن عمر رضي الله عنهم": "Abu Sa'id al-Khudri and Abdullah ibn Umar (may Allah be pleased with them)",
  "أبو قتادة الأنصاري رضي الله عنه": "Abu Qatadah al-Ansari (may Allah be pleased with him)",
  "أبو قتادة رضي الله عنه": "Abu Qatadah (may Allah be pleased with him)",
  "أبو مالك الأشعري رضي الله عنه": "Abu Malik al-Ash'ari (may Allah be pleased with him)",
  "أبو مسعود عقبة بن عمرو الأنصاري رضي الله عنه": "Abu Mas'ud Uqbah ibn Amr al-Ansari (may Allah be pleased with him)",
  "أبو موسى الأشعري رضي الله عنه": "Abu Musa al-Ash'ari (may Allah be pleased with him)",
  "أبو هريرة رضي الله عنه": "Abu Hurairah (may Allah be pleased with him)",
  "أبو هريرة رضي الله عنه (في مقدمة صحيح مسلم)": "Abu Hurairah (may Allah be pleased with him) (in the introduction to Sahih Muslim)",
  "أبو هريرة وأبو سعيد الخدري رضي الله عنهما": "Abu Hurairah and Abu Sa'id al-Khudri (may Allah be pleased with both of them)",
  "أسماء بنت يزيد وأبو الدرداء رضي الله عنهما": "Asma' bint Yazid and Abu al-Darda' (may Allah be pleased with both of them)",
  "أنس بن مالك رضي الله عنه": "Anas ibn Malik (may Allah be pleased with him)",
  "البراء بن عازب رضي الله عنه": "Al-Bara' ibn Azib (may Allah be pleased with him)",
  "المقدام بن معدي كرب رضي الله عنه": "Al-Miqdam ibn Ma'dikarib (may Allah be pleased with him)",
  "النعمان بن بشير رضي الله عنهما": "Al-Nu'man ibn Bashir (may Allah be pleased with both of them)",
  "بريدة بن الحصيب رضي الله عنه": "Buraidah ibn al-Hasib (may Allah be pleased with him)",
  "تميم الداري رضي الله عنه": "Tamim al-Dari (may Allah be pleased with him)",
  "ثوبان رضي الله عنه": "Thawban (may Allah be pleased with him)",
  "ثوبان مولى رسول الله صلى الله عليه وسلم رضي الله عنه": "Thawban, freedman of the Messenger of Allah ﷺ (may Allah be pleased with him)",
  "جابر بن عبدالله رضي الله عنهما": "Jabir ibn Abdullah (may Allah be pleased with both of them)",
  "جرير بن عبدالله رضي الله عنه": "Jarir ibn Abdullah (may Allah be pleased with him)",
  "جمع من الصحابة، منهم أنس بن مالك وأبو هريرة": "A group of Companions, including Anas ibn Malik and Abu Hurairah",
  "حذيفة بن اليمان رضي الله عنه": "Hudhaifah ibn al-Yaman (may Allah be pleased with him)",
  "حكيم بن حزام رضي الله عنه": "Hakim ibn Hizam (may Allah be pleased with him)",
  "زيد بن ثابت رضي الله عنه": "Zaid ibn Thabit (may Allah be pleased with him)",
  "سلمان الفارسي رضي الله عنه": "Salman al-Farisi (may Allah be pleased with him)",
  "سهل بن سعد رضي الله عنه": "Sahl ibn Sa'd (may Allah be pleased with him)",
  "شداد بن أوس رضي الله عنه": "Shaddad ibn Aws (may Allah be pleased with him)",
  "صهيب بن سنان رضي الله عنه": "Suhaib ibn Sinan (may Allah be pleased with him)",
  "عائشة رضي الله عنها": "'A'ishah (may Allah be pleased with her)",
  "عائشة رضي الله عنها (وأبو هريرة بلفظ قريب)": "'A'ishah (may Allah be pleased with her) (and Abu Hurairah, in similar wording)",
  "عبدالرحمن بن سمرة رضي الله عنه": "Abdul Rahman ibn Samurah (may Allah be pleased with him)",
  "عبدالله بن عامر رضي الله عنه (عن أسامة بن زيد)": "Abdullah ibn Amir (may Allah be pleased with him) (narrating from Usamah ibn Zaid)",
  "عبدالله بن عباس رضي الله عنهما": "Abdullah ibn Abbas (may Allah be pleased with both of them)",
  "عبدالله بن عمر رضي الله عنهما": "Abdullah ibn Umar (may Allah be pleased with both of them)",
  "عبدالله بن عمر وعائشة رضي الله عنهم": "Abdullah ibn Umar and 'A'ishah (may Allah be pleased with them)",
  "عبدالله بن عمرو بن العاص رضي الله عنهما": "Abdullah ibn Amr ibn al-As (may Allah be pleased with both of them)",
  "عبدالله بن عمرو بن العاص رضي الله عنهما (عن جده)": "Abdullah ibn Amr ibn al-As (may Allah be pleased with both of them) (narrating from his grandfather)",
  "عبدالله بن عمرو رضي الله عنهما": "Abdullah ibn Amr (may Allah be pleased with both of them)",
  "عبدالله بن مسعود رضي الله عنه": "Abdullah ibn Mas'ud (may Allah be pleased with him)",
  "عتبة بن عبد (أبو الوليد) رضي الله عنه": "Utbah ibn Abd (Abu al-Walid) (may Allah be pleased with him)",
  "عثمان بن عفان رضي الله عنه": "Uthman ibn Affan (may Allah be pleased with him)",
  "عدي بن حاتم رضي الله عنه": "Adi ibn Hatim (may Allah be pleased with him)",
  "عمارة بن رويبة رضي الله عنه": "Umarah ibn Ruwaybah (may Allah be pleased with him)",
  "عمر بن الخطاب رضي الله عنه": "Umar ibn al-Khattab (may Allah be pleased with him)",
  "عمران بن حصين رضي الله عنهما": "Imran ibn Husain (may Allah be pleased with both of them)",
  "عوف بن مالك رضي الله عنه": "Awf ibn Malik (may Allah be pleased with him)",
  "عياض بن حمار رضي الله عنه": "Iyad ibn Himar (may Allah be pleased with him)",
  "كعب بن عُجرة رضي الله عنه": "Ka'b ibn Ujrah (may Allah be pleased with him)",
  "معاذ بن أنس رضي الله عنه": "Mu'adh ibn Anas (may Allah be pleased with him)",
  "معاذ بن جبل رضي الله عنه": "Mu'adh ibn Jabal (may Allah be pleased with him)",
  "معاوية بن جاهمة السلمي رضي الله عنه": "Mu'awiyah ibn Jahimah al-Sulami (may Allah be pleased with him)",
  "معاوية بن حيدة القشيري رضي الله عنه": "Mu'awiyah ibn Haidah al-Qushairi (may Allah be pleased with him)",
};

const ARABIC_CHAR_RE = /[؀-ۿ]/;

// Applies the book-name dictionary, then mechanical punctuation-only
// normalization: Arabic "،" -> ",", a fused leading "و" ("and") directly
// in front of an already-translated token -> "and " (e.g. "وابن ماجه" ->
// "وIbn Majah" after the dictionary pass -> "and Ibn Majah" here), "/"
// spacing, and trimming stray leading/trailing punctuation left behind by
// a removed clause. None of this touches word order or invents wording.
function applyBookNameMap(text: string): string {
  let out = text;
  for (const [ar, en] of HADITH_BOOK_NAME_MAP) {
    out = out.split(ar).join(en);
  }
  out = out.replace(/،/g, ",");
  // Arabic "و" ("and") is written fused directly onto the following word,
  // with no space (e.g. "وابن ماجه" = "و" + "ابن ماجه") — after the book-
  // name substitutions above, a fused-on "و" ends up glued to an already-
  // English word (e.g. "وIbn Majah"). This turns it into "and Ibn Majah".
  // Deliberately NOT `\b` before "و" — JS's `\b` is ASCII-only and never
  // matches next to Arabic script, so it silently failed to fire here;
  // this instead requires the character immediately before "و" to not
  // itself be Arabic (so "و" isn't part of a longer untranslated Arabic
  // word) and the character right after it to already be Latin/digit.
  out = out.replace(/(^|[^؀-ۿ])و([A-Za-z0-9])/g, "$1and $2");
  out = out.replace(/\s*\/\s*/g, " / ");
  out = out.replace(/\s+/g, " ").trim();
  out = out.replace(/^[,/\s]+|[,/\s]+$/g, "");
  out = out.replace(/\s*,\s*\//g, " /");
  out = out.replace(/\/\s*,\s*/g, "/ ");
  return out;
}

// Drops a "، كتاب ..." chapter-title clause (up to the next "/" or the end
// of the string) — chapter titles are never translated, only omitted.
function stripChapterClause(sourceAr: string): string {
  return sourceAr.replace(/،?\s*كتاب[^/]*/g, "");
}

export function translateHadithSourceToEnglish(sourceAr: string): string | undefined {
  const candidate = applyBookNameMap(stripChapterClause(sourceAr));
  if (!candidate || ARABIC_CHAR_RE.test(candidate)) return undefined;
  return candidate;
}

export function translateHadithReferenceToEnglish(referenceAr: string): string | undefined {
  const candidate = applyBookNameMap(referenceAr);
  if (!candidate || ARABIC_CHAR_RE.test(candidate)) return undefined;
  return candidate;
}

export function translateHadithGradeToEnglish(gradeAr: string): string | undefined {
  return HADITH_GRADE_MAP[gradeAr];
}

export function translateHadithGradingSourceToEnglish(gradingSourceAr: string): string | undefined {
  return HADITH_GRADING_SOURCE_MAP[gradingSourceAr];
}

export function translateHadithNarratorToEnglish(narratorAr: string): string | undefined {
  return HADITH_NARRATOR_MAP[narratorAr];
}

// The structured takhrij/details fields available for a Hadith IN THE
// GIVEN LANGUAGE — this, not Hadith text length, is what decides whether
// the single "Show More" control appears at all (see InsightCard.tsx /
// App.tsx: the control shows whenever there's more body text to reveal OR
// this array is non-empty).
//
// Arabic always returns all five fields — sourceAr/referenceAr/gradeAr/
// gradingSourceAr/narratorAr are populated for every one of the 200
// entries (verified against the source JSON).
//
// English returns each of Source/Reference/Grade/GradingSource/Narrator
// whenever its dictionary-based translation above resolves cleanly for
// that entry (see the coverage numbers in this file's header comment) —
// GradingSource and Narrator resolve for all 200/200 entries, since their
// dictionaries were built from the complete closed set of distinct values
// actually present in the library. A field is simply omitted, never shown
// half-translated or under an English label with Arabic content, when its
// dictionary doesn't cover a given entry (e.g. a future Hadith added with
// a new gradingSource/narrator string not yet in the dictionary).
export function getHadithDetailFields(entry: HadithEntry, language: Language): HadithDetailField[] {
  if (language === "ar") {
    return [
      { key: "source", value: entry.sourceAr },
      { key: "reference", value: entry.referenceAr },
      { key: "grade", value: entry.gradeAr },
      { key: "gradingSource", value: entry.gradingSourceAr },
      { key: "narrator", value: entry.narratorAr },
    ];
  }

  const fields: HadithDetailField[] = [];
  const sourceEn = translateHadithSourceToEnglish(entry.sourceAr);
  if (sourceEn) fields.push({ key: "source", value: sourceEn });
  const referenceEn = translateHadithReferenceToEnglish(entry.referenceAr);
  if (referenceEn) fields.push({ key: "reference", value: referenceEn });
  const gradeEn = translateHadithGradeToEnglish(entry.gradeAr);
  if (gradeEn) fields.push({ key: "grade", value: gradeEn });
  const gradingSourceEn = translateHadithGradingSourceToEnglish(entry.gradingSourceAr);
  if (gradingSourceEn) fields.push({ key: "gradingSource", value: gradingSourceEn });
  const narratorEn = translateHadithNarratorToEnglish(entry.narratorAr);
  if (narratorEn) fields.push({ key: "narrator", value: narratorEn });
  return fields;
}
