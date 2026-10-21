// Widget & reminder content enrichment (2026-10): more verified Hadiths and
// duas, carefully attributed Arabic poetry, and DITHAR's own editorial
// comments — several per item or theme, in varied styles, so the widget,
// notifications and the full-screen experience rarely repeat themselves.
//
// CONTENT RULES (same spirit as data/dhikrReflections.ts)
//  - Nothing religious here is written from memory. Every Hadith's Arabic
//    wording was checked letter-for-letter (diacritics aside) against the
//    Arabic text of its collection, and its grading against the graders
//    listed with it; every Qur'anic dua was copied word-for-word from the
//    Qur'an text; every poem's wording against a published source. Each
//    entry records what it was checked against (`review`).
//  - Only `review.status === "source-checked"` enters the default feed
//    (lib/reminderContent.ts). Anything weak, disputed or not yet reviewed
//    stays out. No candidate with a "da'if" grade from any listed grader
//    was added at all.
//  - Narrator lines and the Prophet's ﷺ words are kept apart: the words
//    are inside «», never paraphrased, never shortened mid-sentence. Where
//    only part of a longer narration is quoted, the reference says so.
//  - Editorial comments are DITHAR's own words. They are always shown under
//    their own label («تأمّل دِثار» / "DITHAR reflection"), never inside
//    quotation marks, never attributed to the Prophet ﷺ, a Companion or a
//    scholar, and they make no new religious claims of their own.
//  - Poetry is poetry: always labelled as such, with the poet — or, where
//    the attribution is uncertain, «يُنسب إلى…» / "attributed to…" — and
//    never presented as a Hadith or a religious text.
import type { Language } from "../theme/LanguageContext";
import type { ReflectionTheme } from "./dhikrReflections";
import type { MiscCategoryKey } from "./misc-library";

export type CommentStyle = "reflection" | "encouragement" | "practice" | "meaning" | "reminder";

/** One short DITHAR comment — short enough for a widget line or a notification. */
export interface EditorialComment {
  /** Stable across releases and languages (repetition tracking and Favorites use it). */
  id: string;
  style: CommentStyle;
  ar: string;
  en: string;
}

export type ReviewStatus = "source-checked" | "pending-review" | "disputed";

export interface SourceReview {
  status: ReviewStatus;
  /** What the wording/attribution was checked against. */
  checkedAgainst: string;
  checkedOn: string;
  /** Anything a human reviewer should still confirm. */
  note?: string;
}

/** Only source-checked content enters the default feed; pending or disputed items never do. */
export function inDefaultFeed(review: SourceReview): boolean {
  return review.status === "source-checked";
}

type CommentSpec = readonly [CommentStyle, string, string];

function comments(prefix: string, specs: readonly CommentSpec[]): EditorialComment[] {
  return specs.map(([style, ar, en], i) => ({ id: `${prefix}:c${i + 1}`, style, ar, en }));
}

const CHECKED_ON = "2026-10-15";
const HADITH_SOURCE_CHECK = "Arabic and English editions of the six books (fawazahmed0/hadith-api, jsDelivr), with their listed gradings";
const QURAN_SOURCE_CHECK = "Qur'an text (Tanzil «quran-simple», via fawazahmed0/quran-api) and Saheeh International translation";

// ---- Hadiths -------------------------------------------------------------

/**
 * sunnah.com in-book references ("book/hadith"), read from the same dataset
 * the wording was checked against — the scheme of https://sunnah.com/tirmidhi/48/8
 * (Jami' at-Tirmidhi 3377). Three Muslim narrations the dataset leaves
 * unnumbered (2700, 2733, 2759) take the slot between their neighbours;
 * those links are flagged for confirmation in the review screen.
 */
export const SUNNAH_IN_BOOK: Readonly<Record<string, string>> = {"muslim-38": "1/66", "muslim-373": "3/147", "muslim-482": "4/245", "muslim-798": "6/290", "muslim-804": "6/302", "muslim-817": "6/325", "muslim-2553": "45/16", "muslim-2564": "45/42", "muslim-2566": "45/46", "muslim-2695": "48/42", "muslim-2700": "48/50", "muslim-2733": "48/121", "muslim-2734": "48/123", "muslim-2749": "50/13", "muslim-2759": "50/36", "muslim-2822": "53/1", "muslim-2963": "55/14", "muslim-2965": "55/16", "bukhari-39": "2/32", "bukhari-69": "3/11", "bukhari-1145": "19/26", "bukhari-1283": "23/43", "bukhari-1469": "24/71", "bukhari-2320": "41/1", "bukhari-2996": "56/205", "bukhari-5269": "68/19", "bukhari-5986": "78/17", "bukhari-5991": "78/22", "bukhari-6116": "78/143", "bukhari-6168": "78/194", "bukhari-6309": "80/6", "bukhari-6340": "80/37", "bukhari-6407": "80/102", "bukhari-6412": "81/1", "bukhari-6416": "81/5", "bukhari-6446": "81/35", "tirmidhi-1162": "12/17", "tirmidhi-1987": "27/93", "tirmidhi-2346": "36/43", "tirmidhi-2399": "36/97", "tirmidhi-2518": "37/104", "tirmidhi-3372": "48/3", "tirmidhi-3375": "48/6", "tirmidhi-3377": "48/8", "tirmidhi-3556": "48/187", "ibnmajah-3818": "33/162", "ibnmajah-4032": "36/107", "muslim-2654": "46/29", "muslim-2722": "48/99", "bukhari-3841": "63/66", "bukhari-6012": "78/43", "bukhari-6064": "78/94", "bukhari-6477": "81/66", "bukhari-6011": "78/42", "bukhari-6035": "78/65", "bukhari-2989": "56/198", "bukhari-6018": "78/49", "bukhari-6464": "81/53", "bukhari-834": "10/227", "muslim-2717": "48/92", "bukhari-6316": "80/13"};
export const DERIVED_IN_BOOK = new Set(["muslim-2700", "muslim-2733", "muslim-2759"]);

const SUNNAH_SLUG: Record<string, string> = { bukhari: "bukhari", muslim: "muslim", tirmidhi: "tirmidhi", ibnmajah: "ibnmajah" };

/** The sunnah.com page of a narration ("muslim-2564" → https://sunnah.com/muslim/45/42), or undefined. */
export function sunnahUrl(id: string): string | undefined {
  const ref = SUNNAH_IN_BOOK[id];
  const book = id.split("-")[0];
  return ref && SUNNAH_SLUG[book] ? `https://sunnah.com/${SUNNAH_SLUG[book]}/${ref}` : undefined;
}

/** Where an English meaning comes from, so unreviewed renderings are never mistaken for a published translation. */
export interface TranslationSource {
  source: string;
  /** Reviewed by a person — false until confirmed in the review screen. */
  reviewed: boolean;
}

export const DITHAR_RENDERING_CHECKED: TranslationSource = {
  source: "DITHAR rendering, compared line by line with the published translation in the checked dataset (not verbatim)",
  reviewed: false,
};

/** Hadiths added 2026-10-16 carry the published translation itself, verbatim, rather than a DITHAR rendering. */
export const PUBLISHED_EN_BUKHARI: TranslationSource = {
  source: "Muhammad Muhsin Khan's published translation of Sahih al-Bukhari, verbatim (the checked dataset's English edition)",
  reviewed: false,
};
export const PUBLISHED_EN_MUSLIM: TranslationSource = {
  source: "Abdul Hamid Siddiqui's published translation of Sahih Muslim, verbatim (the checked dataset's English edition)",
  reviewed: false,
};

type Book = "bukhari" | "muslim" | "tirmidhi" | "ibnmajah";

const BOOKS: Record<Book, { ar: string; arShort: string; en: string }> = {
  bukhari: { ar: "صحيح البخاري", arShort: "البخاري", en: "Sahih al-Bukhari" },
  muslim: { ar: "صحيح مسلم", arShort: "مسلم", en: "Sahih Muslim" },
  tirmidhi: { ar: "سنن الترمذي", arShort: "الترمذي", en: "Jami' at-Tirmidhi" },
  ibnmajah: { ar: "سنن ابن ماجه", arShort: "ابن ماجه", en: "Sunan Ibn Majah" },
};

type Grade = "agreed" | "sahih" | "hasan" | "hasan-sahih";

const GRADE_AR: Record<Grade, string> = { agreed: "صحيح متفق عليه", sahih: "صحيح", hasan: "حسن", "hasan-sahih": "حسن صحيح" };
const GRADE_EN: Record<Grade, string> = { agreed: "Sahih — agreed upon", sahih: "Sahih", hasan: "Hasan", "hasan-sahih": "Hasan sahih" };

export interface EnrichedHadith {
  /** e.g. "muslim-2564" — the reminder id is "hadith:<id>". */
  id: string;
  textAr: string;
  /**
   * An English rendering of the meaning — DITHAR's wording, checked line by line
   * against the published translation in the same dataset (not a verbatim copy).
   */
  meaningEn: string;
  narratorAr: string;
  sourceAr: string;
  sourceEn: string;
  referenceAr: string;
  referenceEn: string;
  gradeAr: string;
  gradeEn: string;
  gradingSourceAr: string;
  gradingSourceEn: string;
  /** Direct sunnah.com link. */
  url?: string;
  translation: TranslationSource;
  review: SourceReview;
  comments: EditorialComment[];
}

interface HadithSpec {
  book: Book;
  number: string;
  chapterAr: string;
  chapterEn: string;
  /** A second collection that has it (for "agreed upon" and supporting references). */
  also?: { book: Book; number: string; similar?: boolean };
  /** Only part of a longer narration is quoted. */
  excerpt?: boolean;
  narratorAr: string;
  textAr: string;
  meaningEn: string;
  grade: Grade;
  gradedByAr?: string;
  gradedByEn?: string;
  reviewNote?: string;
  /** Default: DITHAR's checked rendering. */
  translation?: TranslationSource;
  comments: readonly CommentSpec[];
}

function hadith(spec: HadithSpec): EnrichedHadith {
  const book = BOOKS[spec.book];
  const id = `${spec.book}-${spec.number}`;
  const also = spec.also ? `، و${BOOKS[spec.also.book].arShort} ${spec.also.number}${spec.also.similar ? " بنحوه" : ""}` : "";
  const alsoEn = spec.also ? `; ${BOOKS[spec.also.book].en} ${spec.also.number}${spec.also.similar ? " (similar wording)" : ""}` : "";
  const excerpt = spec.excerpt ? " (طرفٌ من الحديث)" : "";
  const excerptEn = spec.excerpt ? " (part of a longer narration)" : "";
  const gradedByAr = spec.gradedByAr ?? (spec.grade === "agreed" ? "البخاري ومسلم" : book.arShort);
  const gradedByEn = spec.gradedByEn ?? (spec.grade === "agreed" ? "al-Bukhari and Muslim" : book.en);
  return {
    id,
    textAr: spec.textAr,
    meaningEn: spec.meaningEn,
    narratorAr: spec.narratorAr,
    sourceAr: `${book.ar}، ${spec.chapterAr}`,
    sourceEn: `${book.en}, ${spec.chapterEn}`,
    referenceAr: `${book.arShort} ${spec.number}${also}${excerpt}`,
    referenceEn: `${book.en} ${spec.number}${alsoEn}${excerptEn}`,
    gradeAr: GRADE_AR[spec.grade],
    gradeEn: GRADE_EN[spec.grade],
    gradingSourceAr: gradedByAr,
    gradingSourceEn: gradedByEn,
    url: sunnahUrl(id),
    translation: spec.translation ?? DITHAR_RENDERING_CHECKED,
    review: { status: "source-checked", checkedAgainst: HADITH_SOURCE_CHECK, checkedOn: spec.translation ? "2026-10-16" : CHECKED_ON, ...(spec.reviewNote ? { note: spec.reviewNote } : {}) },
    comments: comments(`hadith:${id}`, spec.comments),
  };
}

const PROPHET = "قال رسول الله صلى الله عليه وسلم";

export const ENRICHED_HADITHS: readonly EnrichedHadith[] = [
  hadith({
    book: "muslim", number: "38", chapterAr: "كتاب الإيمان", chapterEn: "The Book of Faith",
    narratorAr: "سفيان بن عبد الله الثقفي رضي الله عنه",
    textAr: "عن سفيان بن عبد الله الثقفي رضي الله عنه قال: قلت: يا رسول الله، قل لي في الإسلام قولًا لا أسأل عنه أحدًا بعدك، قال: «قل: آمنت بالله، فاستقم»",
    meaningEn: "Sufyan ibn 'Abdullah al-Thaqafi said: I said, \"O Messenger of Allah, tell me something about Islam that I will not need to ask anyone about after you.\" He said: \"Say: I believe in Allah — then be steadfast.\"",
    grade: "sahih",
    comments: [
      ["meaning", "وصيةٌ من كلمتين: إيمانٌ في القلب، واستقامةٌ تظهر في خُطاك كل يوم.", "A counsel of two words: faith in the heart, and steadfastness that shows in each day's steps."],
      ["encouragement", "الاستقامة لا تعني الكمال؛ تعني أن تعود إلى الطريق كلما مِلتَ عنه.", "Steadfastness doesn't mean perfection; it means returning to the path whenever you drift."],
    ],
  }),
  hadith({
    book: "muslim", number: "373", chapterAr: "كتاب الحيض", chapterEn: "The Book of Menstruation",
    narratorAr: "عائشة رضي الله عنها",
    textAr: "عن عائشة رضي الله عنها قالت: كان النبي صلى الله عليه وسلم يذكر الله على كل أحيانه.",
    meaningEn: "'A'isha said: The Prophet ﷺ used to remember Allah at all times.",
    grade: "sahih",
    comments: [
      ["practice", "لا يحتاج الذكر إلى مكانٍ خاص؛ ففي الطريق والعمل والانتظار متّسعٌ له.", "Remembrance needs no special place; the road, work and waiting all have room for it."],
      ["reflection", "اقتدِ به ﷺ في أمرٍ يسير: اجعل لسانك يعود إلى ذكر الله بين حينٍ وآخر.", "Follow him ﷺ in something simple: let your tongue return to Allah's remembrance now and then."],
    ],
  }),
  hadith({
    book: "muslim", number: "482", chapterAr: "كتاب الصلاة", chapterEn: "The Book of Prayer",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: «أقرب ما يكون العبد من ربه وهو ساجد، فأكثروا الدعاء»`,
    meaningEn: "The nearest a servant comes to his Lord is when he is prostrating, so make abundant supplication (in it).",
    grade: "sahih",
    comments: [
      ["practice", "أطِل سجودك قليلًا اليوم، وقل فيه ما في قلبك.", "Lengthen your prostration a little today, and say in it what is in your heart."],
      ["meaning", "في أخفض هيئات الجسد يكون العبد أقرب؛ فالتواضع طريق القرب.", "In the body's lowest posture the servant is nearest; humility is the road to nearness."],
    ],
  }),
  hadith({
    book: "muslim", number: "798", chapterAr: "كتاب صلاة المسافرين وقصرها", chapterEn: "The Book of Prayer — Travellers",
    narratorAr: "عائشة رضي الله عنها",
    textAr: `عن عائشة رضي الله عنها قالت: ${PROPHET}: «الماهر بالقرآن مع السفرة الكرام البررة، والذي يقرأ القرآن ويتتعتع فيه وهو عليه شاق له أجران»`,
    meaningEn: "One who is proficient in the Qur'an is with the noble, righteous scribes (the angels); and one who recites it haltingly, finding it difficult, has two rewards.",
    grade: "sahih",
    comments: [
      ["encouragement", "إن كانت القراءة تثقل عليك فلك أجران؛ لا تترك المصحف لأنك تتعثّر.", "If reading is hard for you, you have two rewards; don't leave the Qur'an because you stumble."],
      ["practice", "خصّص دقائق كل يوم لقراءةٍ متأنية؛ فالإتقان يأتي مع المداومة.", "Set aside a few minutes each day for careful reading; mastery comes with consistency."],
    ],
  }),
  hadith({
    book: "muslim", number: "804", chapterAr: "كتاب صلاة المسافرين وقصرها", chapterEn: "The Book of Prayer — Travellers", excerpt: true,
    narratorAr: "أبو أمامة الباهلي رضي الله عنه",
    textAr: "عن أبي أمامة الباهلي رضي الله عنه قال: سمعت رسول الله صلى الله عليه وسلم يقول: «اقرءوا القرآن فإنه يأتي يوم القيامة شفيعًا لأصحابه»",
    meaningEn: "Recite the Qur'an, for on the Day of Resurrection it will come as an intercessor for its companions.",
    grade: "sahih",
    comments: [
      ["reflection", "صحبتك للقرآن اليوم يُرجى أن تجد ثمرتها يوم القيامة.", "Your companionship with the Qur'an today is hoped to bear fruit on the Day of Resurrection."],
      ["practice", "اختر سورةً قصيرة تصحبها هذا الأسبوع: قراءةً وفهمًا.", "Choose a short surah to keep company with this week — reading it and understanding it."],
    ],
  }),
  hadith({
    book: "muslim", number: "817", chapterAr: "كتاب صلاة المسافرين وقصرها", chapterEn: "The Book of Prayer — Travellers",
    narratorAr: "عمر بن الخطاب رضي الله عنه",
    textAr: "عن عمر بن الخطاب رضي الله عنه قال: أما إن نبيكم صلى الله عليه وسلم قد قال: «إن الله يرفع بهذا الكتاب أقوامًا ويضع به آخرين»",
    meaningEn: "'Umar said: Your Prophet ﷺ said: \"By this Book, Allah raises some peoples and lowers others.\"",
    grade: "sahih",
    comments: [
      ["meaning", "قالها عمر رضي الله عنه حين قُدِّم مولًى لأنه قارئٌ لكتاب الله؛ فالقرآن يرفع أهله.", "'Umar said this when a freed slave was put in charge because he knew the Book of Allah well: the Qur'an raises its people."],
      ["reflection", "اسأل نفسك: ماذا غيّرت آيةٌ قرأتها هذا الأسبوع في سلوكي؟", "Ask yourself: what did a verse I read this week change in how I act?"],
    ],
  }),
  hadith({
    book: "muslim", number: "2553", chapterAr: "كتاب البر والصلة والآداب", chapterEn: "The Book of Virtue, Good Manners and Ties of Kinship",
    narratorAr: "النواس بن سمعان الأنصاري رضي الله عنه",
    textAr: "عن النواس بن سمعان الأنصاري رضي الله عنه قال: سألت رسول الله صلى الله عليه وسلم عن البر والإثم، فقال: «البر حسن الخلق، والإثم ما حاك في صدرك وكرهت أن يطلع عليه الناس»",
    meaningEn: "Righteousness is good character, and sin is what wavers in your chest and you would dislike people to see.",
    grade: "sahih",
    comments: [
      ["meaning", "البرّ في أبسط تعريفه: خُلُقٌ حسن مع الناس.", "Righteousness, at its simplest: good character with people."],
      ["reflection", "ضميرك دليلٌ لطيف؛ ما تخجل أن يراه الناس منك، قف عنده وتأمّل.", "Your conscience is a gentle guide: what you'd be ashamed for people to see, pause at it and reflect."],
    ],
  }),
  hadith({
    book: "muslim", number: "2564", chapterAr: "كتاب البر والصلة والآداب", chapterEn: "The Book of Virtue, Good Manners and Ties of Kinship",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «إن الله لا ينظر إلى صوركم وأموالكم، ولكن ينظر إلى قلوبكم وأعمالكم»`,
    meaningEn: "Allah does not look at your appearance or your wealth, but He looks at your hearts and your deeds.",
    grade: "sahih",
    comments: [
      ["meaning", "لا ينظر الله إلى المظهر والمال، بل إلى القلب والعمل؛ فأصلح ما يراه.", "Allah looks not at appearance and wealth but at hearts and deeds — so tend to what He sees."],
      ["practice", "قبل أن تهتم بصورتك أمام الناس اليوم، اهتم بنيّتك وعملك أمام الله.", "Before minding your image before people today, mind your intention and deeds before Allah."],
    ],
  }),
  hadith({
    book: "muslim", number: "2566", chapterAr: "كتاب البر والصلة والآداب", chapterEn: "The Book of Virtue, Good Manners and Ties of Kinship",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «إن الله يقول يوم القيامة: أين المتحابون بجلالي؟ اليوم أظلهم في ظلي يوم لا ظل إلا ظلي»`,
    meaningEn: "Allah will say on the Day of Resurrection: \"Where are those who loved one another for the sake of My majesty? Today I shade them in My shade, on the day when there is no shade but Mine.\"",
    grade: "sahih",
    comments: [
      ["reflection", "الحبّ في الله صحبةٌ على الخير، يُرجى لأهلها ظلٌّ يوم لا ظل.", "Love for Allah's sake is companionship in goodness, whose people hope for shade on the Day without shade."],
      ["practice", "راسِل اليوم صديقًا تحبه في الله، وشاركه هذا الحديث.", "Message a friend you love for Allah's sake today, and share this hadith with them."],
    ],
  }),
  hadith({
    book: "muslim", number: "2695", chapterAr: "كتاب الذكر والدعاء والتوبة والاستغفار", chapterEn: "The Book of Remembrance, Supplication, Repentance and Seeking Forgiveness",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «لأن أقول: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر، أحب إليّ مما طلعت عليه الشمس»`,
    meaningEn: "That I say \"Glory be to Allah, praise be to Allah, there is no god but Allah, and Allah is the Greatest\" is dearer to me than all that the sun rises upon.",
    grade: "sahih",
    comments: [
      ["meaning", "أربع كلماتٍ خفيفة، كانت أحبّ إليه ﷺ من كل ما طلعت عليه الشمس.", "Four light words that were dearer to him ﷺ than everything the sun rises upon."],
      ["practice", "قلها الآن مرةً بتأنٍّ، وتأمّل كل كلمةٍ منها.", "Say them once now, slowly, dwelling on each word."],
    ],
  }),
  hadith({
    book: "muslim", number: "2700", chapterAr: "كتاب الذكر والدعاء والتوبة والاستغفار", chapterEn: "The Book of Remembrance, Supplication, Repentance and Seeking Forgiveness",
    narratorAr: "أبو هريرة وأبو سعيد الخدري رضي الله عنهما",
    textAr: "عن أبي هريرة وأبي سعيد الخدري رضي الله عنهما أنهما شهدا على النبي صلى الله عليه وسلم أنه قال: «لا يقعد قوم يذكرون الله عز وجل إلا حفتهم الملائكة، وغشيتهم الرحمة، ونزلت عليهم السكينة، وذكرهم الله فيمن عنده»",
    meaningEn: "No people sit remembering Allah, the Mighty and Majestic, but the angels surround them, mercy covers them, tranquillity descends upon them, and Allah mentions them among those who are with Him.",
    grade: "sahih",
    reviewNote: "Wording verified. The dataset leaves this narration unnumbered between 2699 and 2701, confirming 2700.",
    comments: [
      ["practice", "اجعل لك مجلس ذكرٍ ولو قصيرًا، مع أهلك أو أصحابك.", "Make a gathering of remembrance, even a short one, with your family or friends."],
      ["reflection", "أن يذكرك الله فيمن عنده: أيّ شرفٍ أعظم من هذا؟", "That Allah mentions you among those with Him — what honour is greater?"],
    ],
  }),
  hadith({
    book: "muslim", number: "2733", chapterAr: "كتاب الذكر والدعاء والتوبة والاستغفار", chapterEn: "The Book of Remembrance, Supplication, Repentance and Seeking Forgiveness",
    narratorAr: "أبو الدرداء رضي الله عنه",
    textAr: "عن أبي الدرداء رضي الله عنه أن النبي صلى الله عليه وسلم كان يقول: «دعوة المرء المسلم لأخيه بظهر الغيب مستجابة، عند رأسه ملك موكل، كلما دعا لأخيه بخير قال الملك الموكل به: آمين، ولك بمثل»",
    meaningEn: "The supplication of a Muslim for his brother in his absence is answered. At his head is an angel appointed; whenever he prays for good for his brother, the appointed angel says: \"Amen, and for you the same.\"",
    grade: "sahih",
    reviewNote: "Wording verified. The dataset skips 2733 and labels this narration 2732.03; 2733 (standard numbering) is very likely — confirm against a printed edition.",
    comments: [
      ["meaning", "ادعُ لغيرك بظهر الغيب؛ فالملك يؤمّن ويقول: ولك بمثل.", "Pray for someone in their absence: the angel says amen, and 'for you the same.'"],
      ["practice", "اختر اليوم ثلاثة أشخاص، وادعُ لكلٍّ منهم باسمه دون أن يعلم.", "Choose three people today and pray for each by name, without them knowing."],
    ],
  }),
  hadith({
    book: "muslim", number: "2734", chapterAr: "كتاب الذكر والدعاء والتوبة والاستغفار", chapterEn: "The Book of Remembrance, Supplication, Repentance and Seeking Forgiveness",
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: `عن أنس بن مالك رضي الله عنه قال: ${PROPHET}: «إن الله ليرضى عن العبد أن يأكل الأكلة فيحمده عليها، أو يشرب الشربة فيحمده عليها»`,
    meaningEn: "Allah is pleased with the servant who eats a meal and praises Him for it, or drinks a drink and praises Him for it.",
    grade: "sahih",
    comments: [
      ["meaning", "حمدٌ بعد لقمةٍ أو شربة يُرضي الله؛ فلا تستصغر نعمة الطعام.", "Praise after a meal or a drink pleases Allah; never think little of the blessing of food."],
      ["practice", "في وجبتك القادمة، اختمها بالحمد وقلبك حاضر.", "At your next meal, close it with praise and a present heart."],
    ],
  }),
  hadith({
    book: "muslim", number: "2749", chapterAr: "كتاب التوبة", chapterEn: "The Book of Repentance",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «والذي نفسي بيده، لو لم تذنبوا لذهب الله بكم، ولجاء بقوم يذنبون، فيستغفرون الله فيغفر لهم»`,
    meaningEn: "By Him in Whose hand is my soul, if you did not sin, Allah would take you away and bring a people who would sin, then seek Allah's forgiveness, and He would forgive them.",
    grade: "sahih",
    comments: [
      ["meaning", "الحديث لا يدعو إلى الذنب، بل يفتح باب الرجاء لمن أذنب ثم استغفر.", "The hadith doesn't invite sin; it opens the door of hope for whoever sins and then seeks forgiveness."],
      ["encouragement", "خطؤك لا يُخرجك من رحمة الله؛ والاستغفار طريق العودة إليها.", "Your mistake doesn't place you outside Allah's mercy; seeking forgiveness is the way back into it."],
    ],
  }),
  hadith({
    book: "muslim", number: "2759", chapterAr: "كتاب التوبة", chapterEn: "The Book of Repentance",
    narratorAr: "أبو موسى الأشعري رضي الله عنه",
    textAr: "عن أبي موسى الأشعري رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن الله عز وجل يبسط يده بالليل ليتوب مسيء النهار، ويبسط يده بالنهار ليتوب مسيء الليل، حتى تطلع الشمس من مغربها»",
    meaningEn: "Allah, the Mighty and Majestic, stretches out His hand at night so that whoever sinned by day may repent, and stretches out His hand by day so that whoever sinned by night may repent — until the sun rises from the west.",
    grade: "sahih",
    reviewNote: "Wording verified. The dataset leaves this narration unnumbered between 2758 and 2760, confirming 2759.",
    comments: [
      ["encouragement", "باب التوبة مفتوحٌ ليلًا ونهارًا؛ لا وقت متأخر على العودة إلى الله.", "The door of repentance is open night and day; it is never too late to return to Allah."],
      ["practice", "إن أخطأت في نهارك، فاجعل مساءك بداية التوبة.", "If you slipped during the day, let your evening begin the repentance."],
    ],
  }),
  hadith({
    book: "muslim", number: "2822", chapterAr: "كتاب الجنة وصفة نعيمها وأهلها", chapterEn: "The Book of Paradise, its Description and its People",
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: `عن أنس بن مالك رضي الله عنه قال: ${PROPHET}: «حفت الجنة بالمكاره، وحفت النار بالشهوات»`,
    meaningEn: "Paradise is surrounded by hardships, and the Fire is surrounded by desires.",
    grade: "sahih",
    comments: [
      ["meaning", "طريق الخير فيه مشقة، وطريق الهوى فيه لذةٌ عاجلة؛ والحديث يكشف ما وراء كلٍّ منهما.", "The way to good has hardship, the way of desire has quick pleasure; the hadith shows what lies behind each."],
      ["encouragement", "إذا وجدت في طاعةٍ صعوبة، فتذكّر أن الطريق الصعب قد يكون هو الطريق الصحيح.", "When a good deed feels hard, remember that the hard road may be the right one."],
    ],
  }),
  hadith({
    book: "muslim", number: "2963", chapterAr: "كتاب الزهد والرقائق", chapterEn: "The Book of Zuhd and Softening of Hearts",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «انظروا إلى من أسفل منكم، ولا تنظروا إلى من هو فوقكم، فهو أجدر أن لا تزدروا نعمة الله»`,
    meaningEn: "Look at those below you and do not look at those above you, for that is more likely to keep you from belittling Allah's favour.",
    grade: "sahih",
    comments: [
      ["meaning", "النظر إلى من هو أقل منك يحفظ قلبك من ازدراء النعم.", "Looking at those with less keeps your heart from belittling blessings."],
      ["practice", "حين تقارن نفسك بغيرك اليوم، اجعل المقارنة طريقًا للشكر لا للحسرة.", "When you compare yourself with others today, let it lead to gratitude, not regret."],
    ],
  }),
  hadith({
    book: "muslim", number: "2965", chapterAr: "كتاب الزهد والرقائق", chapterEn: "The Book of Zuhd and Softening of Hearts",
    narratorAr: "سعد بن أبي وقاص رضي الله عنه",
    textAr: "عن سعد بن أبي وقاص رضي الله عنه قال: سمعت رسول الله صلى الله عليه وسلم يقول: «إن الله يحب العبد التقي الغني الخفي»",
    meaningEn: "Allah loves the servant who is God-conscious, free of want, and hidden (from the limelight).",
    grade: "sahih",
    comments: [
      ["reflection", "القيمة ليست في الظهور؛ فالله يحب التقيّ القنوع البعيد عن الأضواء.", "Worth isn't in being seen; Allah loves the God-conscious, content soul away from the spotlight."],
      ["practice", "اجعل لك عملًا صالحًا لا يعرفه أحدٌ غير الله.", "Keep a good deed that no one knows of but Allah."],
    ],
  }),
  hadith({
    book: "bukhari", number: "39", chapterAr: "كتاب الإيمان", chapterEn: "Book of Belief",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن الدين يسر، ولن يشاد الدين أحد إلا غلبه، فسددوا وقاربوا وأبشروا، واستعينوا بالغدوة والروحة وشيء من الدلجة»",
    meaningEn: "The religion is ease, and no one burdens himself in religion except that it overwhelms him. So aim for what is right, draw near to it, rejoice, and seek help (in worship) in the morning, the evening, and part of the night.",
    grade: "sahih",
    comments: [
      ["encouragement", "الدين يسر؛ فخذ من العبادة ما تداوم عليه، ولا تُرهق نفسك.", "Religion is ease; take on the worship you can sustain, without exhausting yourself."],
      ["reflection", "سدّدوا وقاربوا: إن لم تبلغ الكمال، فاقترب منه بقدر طاقتك.", "Aim and draw near: if you can't reach perfection, come as close as you are able."],
    ],
  }),
  hadith({
    book: "bukhari", number: "69", chapterAr: "كتاب العلم", chapterEn: "Book of Knowledge", also: { book: "muslim", number: "1734" },
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: "عن أنس بن مالك رضي الله عنه عن النبي صلى الله عليه وسلم قال: «يسروا ولا تعسروا، وبشروا ولا تنفروا»",
    meaningEn: "Make things easy and do not make them difficult; give glad tidings and do not drive people away.",
    grade: "agreed",
    comments: [
      ["meaning", "التيسير والتبشير منهجٌ في التعامل؛ ابدأ بالكلمة التي تفتح القلوب.", "Making things easy and bringing good news is a way of dealing with people; begin with the word that opens hearts."],
      ["practice", "في نصيحتك القادمة لأحد، اختر الأسلوب الأيسر والأرفق.", "In your next advice to someone, choose the easiest and gentlest way."],
    ],
  }),
  hadith({
    book: "bukhari", number: "1145", chapterAr: "كتاب التهجد", chapterEn: "Book of Night Prayer (Tahajjud)", also: { book: "muslim", number: "758" },
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: «ينزل ربنا تبارك وتعالى كل ليلة إلى السماء الدنيا حين يبقى ثلث الليل الآخر، يقول: من يدعوني فأستجيب له، من يسألني فأعطيه، من يستغفرني فأغفر له»",
    meaningEn: "Our Lord, Blessed and Exalted, descends every night to the lowest heaven when the last third of the night remains, saying: \"Who will call upon Me, that I may answer him? Who will ask of Me, that I may give him? Who will seek My forgiveness, that I may forgive him?\"",
    grade: "agreed",
    comments: [
      ["meaning", "في الثلث الأخير من الليل نداءٌ كريم بالإجابة والعطاء والمغفرة.", "In the last third of the night comes a generous call: of answering, giving and forgiving."],
      ["practice", "إن استيقظت ليلًا، فاغتنم دقائق لدعاءٍ هادئ قبل أن تعود إلى النوم.", "If you wake at night, take a few minutes for a quiet dua before sleeping again."],
    ],
  }),
  hadith({
    book: "bukhari", number: "1283", chapterAr: "كتاب الجنائز", chapterEn: "Book of Funerals", also: { book: "muslim", number: "926" }, excerpt: true,
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: "عن أنس بن مالك رضي الله عنه أن النبي صلى الله عليه وسلم قال: «إنما الصبر عند الصدمة الأولى»",
    meaningEn: "Patience is (truly) at the first stroke of a calamity.",
    grade: "agreed",
    comments: [
      ["meaning", "الصبر الحقيقي في اللحظة الأولى، حين تكون الصدمة في أشدّها.", "True patience is at the first moment, when the shock is strongest."],
      ["encouragement", "إن شقّ عليك الصبر، فاسأل الله أن يعينك عليه؛ فهو عونٌ يُطلب.", "If patience is hard, ask Allah to help you with it; it is a help that can be asked for."],
    ],
  }),
  hadith({
    book: "bukhari", number: "1469", chapterAr: "كتاب الزكاة", chapterEn: "Book of Zakat", excerpt: true,
    narratorAr: "أبو سعيد الخدري رضي الله عنه",
    textAr: "عن أبي سعيد الخدري رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: «ومن يستعفف يعفه الله، ومن يستغن يغنه الله، ومن يتصبر يصبره الله، وما أعطي أحد عطاء خيرًا وأوسع من الصبر»",
    meaningEn: "Whoever seeks to abstain (from asking), Allah makes him chaste; whoever seeks sufficiency, Allah makes him self-sufficient; whoever strives to be patient, Allah makes him patient. And no one has been given a gift better and more vast than patience.",
    grade: "sahih",
    comments: [
      ["encouragement", "الصبر يُكتسب بالتصبّر؛ كل محاولةٍ صغيرة تقرّبك منه.", "Patience is gained by striving for it; every small attempt brings you closer."],
      ["reflection", "أوسع العطايا ليس المال ولا الجاه، بل صبرٌ يحمل به القلب ما يأتيه.", "The widest gift isn't wealth or status, but patience that lets the heart carry what comes."],
    ],
  }),
  hadith({
    book: "bukhari", number: "2320", chapterAr: "كتاب الحرث والمزارعة", chapterEn: "Book of Agriculture", also: { book: "muslim", number: "1553" },
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: `عن أنس بن مالك رضي الله عنه قال: ${PROPHET}: «ما من مسلم يغرس غرسًا، أو يزرع زرعًا، فيأكل منه طير أو إنسان أو بهيمة، إلا كان له به صدقة»`,
    meaningEn: "No Muslim plants a tree or sows a crop from which a bird, a person or an animal eats, but it is counted for him as charity.",
    grade: "agreed",
    comments: [
      ["reflection", "الخير الذي تزرعه يمتدّ أثره، حتى فيما يأكله الطير والدواب.", "The good you plant keeps giving, even in what birds and animals eat."],
      ["practice", "ازرع شيئًا نافعًا اليوم: نبتةً، أو معروفًا، أو كلمةً طيبة.", "Plant something useful today: a seedling, a kindness, or a good word."],
    ],
  }),
  hadith({
    book: "bukhari", number: "2996", chapterAr: "كتاب الجهاد والسير", chapterEn: "Book of Jihad",
    narratorAr: "أبو موسى الأشعري رضي الله عنه",
    textAr: `عن أبي موسى الأشعري رضي الله عنه قال: ${PROPHET}: «إذا مرض العبد أو سافر، كتب له مثل ما كان يعمل مقيمًا صحيحًا»`,
    meaningEn: "When a servant falls ill or travels, there is written for him the like of what he used to do when resident and healthy.",
    grade: "sahih",
    comments: [
      ["meaning", "من رحمة الله أن ما منعك منه المرض أو السفر يُكتب لك كما كنت تعمله.", "Of Allah's mercy: what illness or travel keeps you from is recorded as you used to do it."],
      ["encouragement", "حافظ على عادات الخير في صحتك؛ فهي رصيدٌ يبقى لك في أيام الضعف.", "Keep good habits while healthy; they remain to your credit in weaker days."],
    ],
  }),
  hadith({
    book: "bukhari", number: "5269", chapterAr: "كتاب الطلاق", chapterEn: "Book of Divorce", also: { book: "muslim", number: "127", similar: true },
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن الله تجاوز عن أمتي ما حدثت به أنفسها، ما لم تعمل أو تتكلم»",
    meaningEn: "Allah has pardoned my community for what their souls whisper to them, as long as they do not act on it or speak of it.",
    grade: "agreed",
    comments: [
      ["meaning", "ما يمرّ بخاطرك من وساوس لا تؤاخَذ به ما لم تعمل به أو تتكلم.", "Passing thoughts aren't held against you as long as you don't act on them or speak them."],
      ["encouragement", "لا تُثقل قلبك بخواطر عابرة؛ ادفعها بالذكر وامضِ في يومك.", "Don't weigh your heart down with passing thoughts; push them away with remembrance and carry on."],
    ],
  }),
  hadith({
    book: "bukhari", number: "5986", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)", also: { book: "muslim", number: "2557" },
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: `عن أنس بن مالك رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: «من أحب أن يبسط له في رزقه، وينسأ له في أثره، فليصل رحمه»`,
    meaningEn: "Whoever would love for his provision to be expanded and his life to be prolonged, let him maintain his ties of kinship.",
    grade: "agreed",
    comments: [
      ["meaning", "صلة الرحم بركةٌ في الرزق والعمر؛ عطاءٌ يعود إليك.", "Keeping family ties brings blessing in provision and life — a giving that returns to you."],
      ["practice", "اتصل اليوم بقريبٍ طال غيابه عنك.", "Call a relative today whom you haven't heard from in a while."],
    ],
  }),
  hadith({
    book: "bukhari", number: "5991", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "عبد الله بن عمرو رضي الله عنهما",
    textAr: "عن عبد الله بن عمرو رضي الله عنهما عن النبي صلى الله عليه وسلم قال: «ليس الواصل بالمكافئ، ولكن الواصل الذي إذا قطعت رحمه وصلها»",
    meaningEn: "The one who maintains ties is not the one who merely reciprocates; rather, the one who maintains ties is the one who, when his kin cut him off, reaches out to them.",
    grade: "sahih",
    comments: [
      ["meaning", "الواصل الحقيقي من يصل من قطعه، لا من يردّ المعروف بمثله فقط.", "The true keeper of ties reaches out to those who cut off, not only returns kindness in kind."],
      ["reflection", "هل في حياتك علاقةٌ تنتظر منك الخطوة الأولى؟", "Is there a relationship in your life waiting for you to take the first step?"],
    ],
  }),
  hadith({
    book: "bukhari", number: "6116", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه أن رجلًا قال للنبي صلى الله عليه وسلم: أوصني، قال: «لا تغضب»، فردد مرارًا، قال: «لا تغضب»",
    meaningEn: "A man said to the Prophet ﷺ: \"Advise me.\" He said: \"Do not become angry.\" The man repeated (his request) several times, and he said: \"Do not become angry.\"",
    grade: "sahih",
    comments: [
      ["reflection", "وصيةٌ قصيرة تكررت مرارًا: لا تغضب؛ لأن الغضب يفتح أبوابًا يصعب إغلاقها.", "A short counsel, repeated again and again: do not be angry — anger opens doors that are hard to close."],
      ["practice", "حين تشعر بالغضب اليوم، أجّل الكلام دقيقةً واحدة.", "When you feel anger today, delay your words by one minute."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6168", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)", also: { book: "muslim", number: "2640" },
    narratorAr: "عبد الله بن مسعود رضي الله عنه",
    textAr: "عن عبد الله بن مسعود رضي الله عنه عن النبي صلى الله عليه وسلم أنه قال: «المرء مع من أحب»",
    meaningEn: "A person will be with those whom he loves.",
    grade: "agreed",
    comments: [
      ["reflection", "محبتك للصالحين ترفعك، وإن لم تبلغ بعدُ أعمالهم.", "Your love for the righteous lifts you, even if you haven't yet reached their deeds."],
      ["practice", "اختر من تحب بعناية، وأحسن صحبة من تحب.", "Choose carefully whom you love, and keep good company with them."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6309", chapterAr: "كتاب الدعوات", chapterEn: "Book of Invocations",
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: `عن أنس بن مالك رضي الله عنه قال: ${PROPHET}: «الله أفرح بتوبة عبده من أحدكم سقط على بعيره، وقد أضله في أرض فلاة»`,
    meaningEn: "Allah is more delighted with the repentance of His servant than any of you would be on finding his camel which he had lost in a barren desert.",
    grade: "sahih",
    comments: [
      ["encouragement", "يفرح الله بتوبة عبده فرحًا عظيمًا؛ فلا تتردد في العودة إليه.", "Allah rejoices greatly at His servant's repentance; don't hesitate to return to Him."],
      ["reflection", "تخيّل فرحة من وجد ما أضاعه في الصحراء؛ وفرح الله بتوبتك أعظم.", "Imagine the joy of one who finds what he lost in the desert; Allah's delight at your repentance is greater."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6340", chapterAr: "كتاب الدعوات", chapterEn: "Book of Invocations", also: { book: "muslim", number: "2735" },
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: «يستجاب لأحدكم ما لم يعجل، يقول: دعوت فلم يستجب لي»",
    meaningEn: "The supplication of any of you is answered as long as he is not hasty, saying: \"I prayed, but I was not answered.\"",
    grade: "agreed",
    comments: [
      ["practice", "ادعُ بثقة، واترك التوقيت لله؛ فالاستعجال يقطع الطريق على الدعاء.", "Ask with trust and leave the timing to Allah; haste cuts dua short."],
      ["encouragement", "لا تقل: دعوتُ فلم يُستجب لي؛ واصِل الدعاء بقلبٍ مطمئن.", "Don't say 'I prayed and wasn't answered'; keep praying with a settled heart."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6407", chapterAr: "كتاب الدعوات", chapterEn: "Book of Invocations",
    narratorAr: "أبو موسى الأشعري رضي الله عنه",
    textAr: "عن أبي موسى الأشعري رضي الله عنه قال: قال النبي صلى الله عليه وسلم: «مثل الذي يذكر ربه والذي لا يذكر، مثل الحي والميت»",
    meaningEn: "The likeness of one who remembers his Lord and one who does not is that of the living and the dead.",
    grade: "sahih",
    comments: [
      ["meaning", "الذكر حياة القلب؛ والقلب الغافل يفقد شيئًا من حياته.", "Remembrance is the heart's life; a heedless heart loses something of its life."],
      ["practice", "أحيِ قلبك اليوم بذكرٍ يسير في أوقاتٍ متفرقة.", "Bring your heart to life today with light remembrance at scattered moments."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6412", chapterAr: "كتاب الرقاق", chapterEn: "Book of Softening of Hearts (Ar-Riqaq)",
    narratorAr: "عبد الله بن عباس رضي الله عنهما",
    textAr: "عن ابن عباس رضي الله عنهما قال: قال النبي صلى الله عليه وسلم: «نعمتان مغبون فيهما كثير من الناس: الصحة والفراغ»",
    meaningEn: "There are two blessings in which many people are at a loss: health and free time.",
    grade: "sahih",
    comments: [
      ["practice", "استثمر ساعة فراغٍ اليوم في شيءٍ يبقى أثره.", "Invest one free hour today in something whose good lasts."],
      ["reflection", "فراغك اليوم فرصةٌ قد لا تعود بالصورة نفسها.", "Your free time today is a chance that may not return in the same form."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6416", chapterAr: "كتاب الرقاق", chapterEn: "Book of Softening of Hearts (Ar-Riqaq)",
    narratorAr: "عبد الله بن عمر رضي الله عنهما",
    textAr: "عن عبد الله بن عمر رضي الله عنهما قال: أخذ رسول الله صلى الله عليه وسلم بمنكبي فقال: «كن في الدنيا كأنك غريب، أو عابر سبيل»",
    meaningEn: "'Abdullah ibn 'Umar said: The Messenger of Allah ﷺ took hold of my shoulder and said: \"Be in this world as though you were a stranger or a traveller.\"",
    grade: "sahih",
    comments: [
      ["meaning", "عِش في الدنيا كالمسافر: يأخذ ما يحتاجه، ولا يُثقل قلبه بما سيتركه.", "Live in this world like a traveller: take what you need, and don't burden your heart with what you'll leave."],
      ["reflection", "الغريب لا يطمئن إلى الطريق، لكنه لا يتوقف عن السير.", "A stranger doesn't settle into the road, but never stops walking."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6446", chapterAr: "كتاب الرقاق", chapterEn: "Book of Softening of Hearts (Ar-Riqaq)", also: { book: "muslim", number: "1051" },
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه عن النبي صلى الله عليه وسلم قال: «ليس الغنى عن كثرة العرض، ولكن الغنى غنى النفس»",
    meaningEn: "Wealth is not in having many possessions; rather, true wealth is the richness of the soul.",
    grade: "agreed",
    comments: [
      ["meaning", "الغنى الحقيقي قناعةٌ في النفس، لا كثرةٌ في اليد.", "True wealth is contentment of the soul, not abundance in the hand."],
      ["practice", "عدّد ما عندك قبل أن تفكر فيما ينقصك.", "Count what you have before thinking about what you lack."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "1162", chapterAr: "أبواب الرضاع", chapterEn: "Chapters on Suckling",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «أكمل المؤمنين إيمانًا أحسنهم خلقًا، وخياركم خياركم لنسائهم خلقًا»`,
    meaningEn: "The most complete of the believers in faith is the one with the best character, and the best of you are those who are best in character to their wives.",
    grade: "hasan-sahih", gradedByAr: "الترمذي، والألباني", gradedByEn: "at-Tirmidhi; al-Albani",
    comments: [
      ["meaning", "كمال الإيمان يظهر في الخُلُق، وأولى الناس بحسن خلقك أهل بيتك.", "Complete faith shows in character, and your household are the first to deserve it."],
      ["practice", "قل اليوم كلمةً طيبةً لزوجك أو لأهل بيتك.", "Say a kind word today to your spouse or your household."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "1987", chapterAr: "أبواب البر والصلة", chapterEn: "Chapters on Righteousness and Ties of Kinship",
    narratorAr: "أبو ذر الغفاري رضي الله عنه",
    textAr: "عن أبي ذر رضي الله عنه قال: قال لي رسول الله صلى الله عليه وسلم: «اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن»",
    meaningEn: "Be mindful of Allah wherever you are, follow a bad deed with a good one and it will erase it, and treat people with good character.",
    grade: "hasan", gradedByAr: "الترمذي (حسن صحيح)، والألباني (حسن)", gradedByEn: "at-Tirmidhi (hasan sahih); al-Albani (hasan)",
    comments: [
      ["meaning", "ثلاث وصايا جامعة: تقوى في كل مكان، وحسنةٌ تمحو السيئة، وخُلُقٌ حسن مع الناس.", "Three comprehensive counsels: mindfulness of Allah everywhere, a good deed that erases a bad one, and good character with people."],
      ["encouragement", "إن أخطأت فلا تقف عند الخطأ؛ أتبعه بحسنة.", "If you err, don't stay with the error; follow it with a good deed."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "2346", chapterAr: "أبواب الزهد", chapterEn: "Chapters on Zuhd", also: { book: "ibnmajah", number: "4141", similar: true },
    narratorAr: "عبيد الله بن محصن الخطمي رضي الله عنه",
    textAr: `عن عبيد الله بن محصن الخطمي رضي الله عنه قال: ${PROPHET}: «من أصبح منكم آمنًا في سربه، معافى في جسده، عنده قوت يومه، فكأنما حيزت له الدنيا»`,
    meaningEn: "Whoever among you wakes up secure in his home, healthy in his body, and having his food for the day, it is as if the whole world has been gathered for him.",
    // at-Tirmidhi's own words after it are «حسن غريب» (checked 2026-10-16); al-Albani: hasan.
    grade: "hasan", gradedByAr: "الترمذي (حسن غريب)، والألباني (حسن)", gradedByEn: "at-Tirmidhi (hasan gharib); al-Albani (hasan)",
    comments: [
      ["reflection", "أمنٌ في البيت، وعافيةٌ في الجسد، وقوت يوم: نعمٌ نعتادها حتى ننسى قدرها.", "Safety at home, health in body and a day's food: blessings we grow so used to that we forget their worth."],
      ["practice", "تأمّل هذه النعم الثلاث في يومك، واحمد الله عليها.", "Notice these three blessings in your day, and thank Allah for them."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "2399", chapterAr: "أبواب الزهد", chapterEn: "Chapters on Zuhd",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: `عن أبي هريرة رضي الله عنه قال: ${PROPHET}: «ما يزال البلاء بالمؤمن والمؤمنة في نفسه وولده وماله حتى يلقى الله وما عليه خطيئة»`,
    meaningEn: "Trials continue to befall the believing man and woman in themselves, their children and their wealth, until they meet Allah with no sin upon them.",
    grade: "hasan-sahih", gradedByAr: "الترمذي، والألباني", gradedByEn: "at-Tirmidhi; al-Albani",
    comments: [
      ["meaning", "البلاء ليس علامة غضبٍ دائمًا؛ فقد يكون تطهيرًا ورفعًا.", "Trial isn't always a sign of displeasure; it may be purification and raising."],
      ["encouragement", "اصبر على ما أصابك، واسأل الله العافية؛ فكلاهما خير.", "Be patient with what befalls you, and ask Allah for well-being; both are good."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "2518", chapterAr: "أبواب صفة القيامة والرقائق والورع", chapterEn: "Chapters on the Day of Judgement, Ar-Riqaq and Al-Wara'",
    narratorAr: "الحسن بن علي رضي الله عنهما",
    textAr: "عن الحسن بن علي رضي الله عنهما قال: حفظت من رسول الله صلى الله عليه وسلم: «دع ما يريبك إلى ما لا يريبك، فإن الصدق طمأنينة، وإن الكذب ريبة»",
    meaningEn: "Leave what makes you doubt for what does not make you doubt; truthfulness brings tranquillity, and falsehood brings doubt.",
    grade: "sahih", gradedByAr: "الترمذي (حسن صحيح)، والألباني (صحيح)", gradedByEn: "at-Tirmidhi (hasan sahih); al-Albani (sahih)",
    comments: [
      ["meaning", "ما يطمئن إليه قلبك من الصدق خيرٌ مما يُبقيك في حيرة.", "The truth your heart settles with is better than what keeps you uneasy."],
      ["practice", "إن ترددت في أمرٍ مشتبه اليوم، فاختر الأوضح والأطمأن.", "If you hesitate over something doubtful today, choose the clearer, more reassuring path."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "3372", chapterAr: "أبواب الدعوات", chapterEn: "Chapters on Supplication", also: { book: "ibnmajah", number: "3828" }, excerpt: true,
    narratorAr: "النعمان بن بشير رضي الله عنهما",
    textAr: "عن النعمان بن بشير رضي الله عنهما عن النبي صلى الله عليه وسلم قال: «الدعاء هو العبادة»",
    meaningEn: "Supplication is worship.",
    grade: "sahih", gradedByAr: "الترمذي (حسن صحيح)، والألباني (صحيح)", gradedByEn: "at-Tirmidhi (hasan sahih); al-Albani (sahih)",
    comments: [
      ["meaning", "الدعاء ليس طريقًا إلى العبادة فحسب، بل هو العبادة نفسها.", "Dua isn't only a path to worship; it is worship itself."],
      ["practice", "اسأل الله اليوم حاجةً صغيرة؛ فالسؤال نفسه عبودية.", "Ask Allah today for something small; the asking itself is devotion."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "3375", chapterAr: "أبواب الدعوات", chapterEn: "Chapters on Supplication", also: { book: "ibnmajah", number: "3793", similar: true },
    narratorAr: "عبد الله بن بسر رضي الله عنه",
    textAr: "عن عبد الله بن بسر رضي الله عنه أن رجلًا قال: يا رسول الله، إن شرائع الإسلام قد كثرت علي، فأخبرني بشيء أتشبث به، قال: «لا يزال لسانك رطبًا من ذكر الله»",
    meaningEn: "A man said: \"O Messenger of Allah, the laws of Islam have become many for me, so tell me of something I can hold on to.\" He said: \"Let your tongue remain moist with the remembrance of Allah.\"",
    grade: "sahih", gradedByAr: "الترمذي (حسن غريب)، والألباني (صحيح)", gradedByEn: "at-Tirmidhi (hasan gharib); al-Albani (sahih)",
    comments: [
      ["encouragement", "حين تكثر عليك الأعمال، فالذكر بابٌ يسير لا يُغلق.", "When duties feel many, remembrance is an easy door that never closes."],
      ["practice", "اختر ذكرًا تحبه، وردّده بين أعمالك اليوم.", "Choose a remembrance you love, and repeat it between your tasks today."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "3377", chapterAr: "أبواب الدعوات", chapterEn: "Chapters on Supplication",
    narratorAr: "أبو الدرداء رضي الله عنه",
    textAr: "عن أبي الدرداء رضي الله عنه قال: قال النبي صلى الله عليه وسلم: «ألا أنبئكم بخير أعمالكم، وأزكاها عند مليككم، وأرفعها في درجاتكم، وخير لكم من إنفاق الذهب والورق، وخير لكم من أن تلقوا عدوكم فتضربوا أعناقهم ويضربوا أعناقكم؟» قالوا: بلى، قال: «ذكر الله تعالى»",
    meaningEn: "\"Shall I not tell you of the best of your deeds, the purest of them with your Master, the highest of them in raising your ranks, better for you than spending gold and silver, and better for you than meeting your enemy and striking their necks while they strike yours?\" They said: \"Certainly.\" He said: \"The remembrance of Allah, Most High.\"",
    grade: "sahih", gradedByAr: "أحمد شاكر، والألباني", gradedByEn: "Ahmad Shakir; al-Albani",
    comments: [
      ["meaning", "خير الأعمال وأزكاها: ذكر الله؛ عملٌ لا يحتاج مالًا ولا جهدًا كبيرًا.", "The best and purest of deeds is remembrance of Allah — needing no wealth and little effort."],
      ["reflection", "ما أيسر الطريق إلى رفعة الدرجات حين يكون ذكرًا صادقًا.", "How easy the road to raised ranks when it is sincere remembrance."],
    ],
  }),
  hadith({
    book: "tirmidhi", number: "3556", chapterAr: "أبواب الدعوات", chapterEn: "Chapters on Supplication", also: { book: "ibnmajah", number: "3865", similar: true },
    narratorAr: "سلمان الفارسي رضي الله عنه",
    textAr: "عن سلمان الفارسي رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن الله حيي كريم، يستحي إذا رفع الرجل إليه يديه أن يردهما صفرًا خائبتين»",
    meaningEn: "Allah is Hayiyy (full of modesty) and Generous: when a man raises his hands to Him, He is too modest to return them empty and disappointed.",
    grade: "sahih", gradedByAr: "الترمذي (حسن غريب)، والألباني (صحيح)", gradedByEn: "at-Tirmidhi (hasan gharib); al-Albani (sahih)",
    comments: [
      ["encouragement", "ارفع يديك بثقة؛ فربك حييٌّ كريم.", "Raise your hands with confidence; your Lord is Hayiyy and Generous."],
      ["reflection", "لا تستصغر حاجتك عن السؤال، ولا تستكثرها على كرم الله.", "Don't think your need too small to ask, nor too great for Allah's generosity."],
    ],
  }),
  hadith({
    book: "ibnmajah", number: "3818", chapterAr: "كتاب الأدب", chapterEn: "Book of Etiquette",
    narratorAr: "عبد الله بن بسر رضي الله عنه",
    textAr: "عن عبد الله بن بسر رضي الله عنه قال: قال النبي صلى الله عليه وسلم: «طوبى لمن وجد في صحيفته استغفارًا كثيرًا»",
    meaningEn: "Glad tidings to whoever finds much seeking of forgiveness in his record (of deeds).",
    grade: "sahih", gradedByAr: "الألباني، وشعيب الأرناؤوط", gradedByEn: "al-Albani; Shu'ayb al-Arna'ut",
    comments: [
      ["encouragement", "الاستغفار رصيدٌ تفرح يوم القيامة أن تجده كثيرًا في صحيفتك.", "Seeking forgiveness is a balance you'll be glad to find abundant in your record."],
      ["practice", "أضف إلى يومك استغفارًا متفرقًا، ولو في طريقك.", "Add scattered moments of istighfar to your day, even on the road."],
    ],
  }),
  hadith({
    book: "ibnmajah", number: "4032", chapterAr: "كتاب الفتن", chapterEn: "Book of Tribulations",
    narratorAr: "عبد الله بن عمر رضي الله عنهما",
    textAr: `عن ابن عمر رضي الله عنهما قال: ${PROPHET}: «المؤمن الذي يخالط الناس ويصبر على أذاهم، أعظم أجرًا من المؤمن الذي لا يخالط الناس ولا يصبر على أذاهم»`,
    meaningEn: "The believer who mixes with people and bears their harm patiently has a greater reward than the believer who does not mix with people and does not bear their harm patiently.",
    grade: "sahih", gradedByAr: "الألباني", gradedByEn: "al-Albani",
    comments: [
      ["meaning", "الصبر على الناس عبادة؛ وهو أعظم أجرًا من اعتزالهم.", "Patience with people is worship, with greater reward than withdrawing from them."],
      ["practice", "حين يزعجك أحدٌ اليوم، تذكّر أن صبرك عليه يُكتب لك.", "When someone bothers you today, remember that your patience with them is written for you."],
    ],
  }),  // Added 2026-10-16 — Pending Review until approved in the review screen.
  hadith({
    book: "bukhari", number: "6018", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: «من كان يؤمن بالله واليوم الآخر فلا يؤذ جاره، ومن كان يؤمن بالله واليوم الآخر فليكرم ضيفه، ومن كان يؤمن بالله واليوم الآخر فليقل خيرا أو ليصمت»",
    meaningEn: "Narrated Abu Huraira: Allah's Messenger (ﷺ) said, \"Anybody who believes in Allah and the Last Day should not harm his neighbor, and anybody who believes in Allah and the Last Day should entertain his guest generously and anybody who believes in Allah and the Last Day should talk what is good or keep quiet. (i.e. abstain from all kinds of evil and dirty talk).\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["meaning", "ثلاث علامات للإيمان في الحياة اليومية: كفُّ الأذى عن الجار، وإكرام الضيف، وحفظ اللسان.", "Three everyday signs of faith: sparing your neighbor harm, honoring your guest, and guarding your tongue."],
      ["practice", "قبل أن تتكلم، اسأل نفسك: هل هذا خير؟ فإن لم يكن، فالصمت أولى.", "Before you speak, ask: is this good? If not, silence is better."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6464", chapterAr: "كتاب الرقاق", chapterEn: "Book of To Make the Heart Tender (Ar-Riqaq)",
    narratorAr: "عائشة رضي الله عنها",
    textAr: "عن عائشة رضي الله عنها أن رسول الله صلى الله عليه وسلم قال: «سددوا وقاربوا، واعلموا أن لن يدخل أحدكم عمله الجنة، وأن أحب الأعمال أدومها إلى الله، وإن قل»",
    meaningEn: "Narrated `Aisha: Allah's Messenger (ﷺ) said, \"Do good deeds properly, sincerely and moderately and know that your deeds will not make you enter Paradise, and that the most beloved deed to Allah is the most regular and constant even if it were little.\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["encouragement", "القليل الدائم أحبّ إلى الله؛ فلا تستصغر وردًا صغيرًا تواظب عليه.", "The little that lasts is most beloved to Allah; never belittle a small, steady habit."],
      ["practice", "اختر عملًا صالحًا يسيرًا تستطيع المداومة عليه كل يوم.", "Choose one easy good deed you can keep up every day."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6011", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "النعمان بن بشير رضي الله عنهما",
    textAr: "عن النعمان بن بشير رضي الله عنهما قال: قال رسول الله صلى الله عليه وسلم: «ترى المؤمنين في تراحمهم وتوادهم وتعاطفهم كمثل الجسد إذا اشتكى عضوا تداعى له سائر جسده بالسهر والحمى»",
    meaningEn: "Narrated An-Nu`man bin Bashir: Allah's Messenger (ﷺ) said, \"You see the believers as regards their being merciful among themselves and showing love among themselves and being kind, resembling one body, so that, if any part of the body is not well then the whole body shares the sleeplessness (insomnia) and fever with it.\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["meaning", "المؤمنون في تراحمهم كالجسد الواحد: يتألم كلُّه لألم بعضه.", "In their mercy to one another, believers are like one body: all of it feels the pain of a part."],
      ["practice", "اسأل اليوم عن أخٍ مريض أو مهموم، ولو برسالة قصيرة.", "Ask after someone ill or troubled today, even with a short message."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6035", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)", excerpt: true,
    narratorAr: "عبد الله بن عمرو رضي الله عنهما",
    textAr: "عن عبد الله بن عمرو رضي الله عنهما قال: كان رسول الله صلى الله عليه وسلم يقول: «إن خياركم أحاسنكم أخلاقا»",
    meaningEn: "The best among you are the best in character (having good manners).",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["reflection", "الخيرية هنا بحسن الخلق؛ وهو ميدانٌ مفتوح لكل أحد.", "Here, being among the best is measured by good character — a field open to everyone."],
      ["practice", "اختر اليوم خُلقًا واحدًا تحسّنه: كلمة لطيفة، أو صبرًا، أو ابتسامة.", "Choose one trait to improve today: a kind word, patience, or a smile."],
    ],
  }),
  hadith({
    book: "bukhari", number: "2989", chapterAr: "كتاب الجهاد والسير", chapterEn: "Book of Fighting for the Cause of Allah (Jihaad)",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: «كل سلامى من الناس عليه صدقة كل يوم تطلع فيه الشمس، يعدل بين الاثنين صدقة، ويعين الرجل على دابته، فيحمل عليها، أو يرفع عليها متاعه صدقة، والكلمة الطيبة صدقة، وكل خطوة يخطوها إلى الصلاة صدقة، ويميط الأذى عن الطريق صدقة»",
    meaningEn: "Narrated Abu Huraira: Allah's Messenger (ﷺ) said, \"There is a (compulsory) Sadaqa (charity) to be given for every joint of the human body (as a sign of gratitude to Allah) everyday the sun rises. To judge justly between two persons is regarded as Sadaqa, and to help a man concerning his riding animal by helping him to ride it or by lifting his luggage on to it, is also regarded as Sadaqa, and (saying) a good word is also Sadaqa, and every step taken on one's way to offer the compulsory prayer (in the mosque) is also Sadaqa and to remove a harmful thing from the way is also Sadaqa.\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["meaning", "الصدقة ليست مالًا فقط: العدل بين اثنين، والكلمة الطيبة، وإماطة الأذى كلها صدقة.", "Charity isn't only money: making peace between two, a good word, and clearing harm from a path are all charity."],
      ["practice", "اختر اليوم صدقةً من هذه: كلمة طيبة، أو عونًا لأحد، أو إزالة أذى من طريق.", "Pick one of these charities today: a good word, a hand for someone, or clearing something harmful from a path."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6012", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "أنس بن مالك رضي الله عنه",
    textAr: "عن أنس بن مالك رضي الله عنه عن النبي صلى الله عليه وسلم قال: «ما من مسلم غرس غرسا فأكل منه إنسان أو دابة إلا كان له صدقة»",
    meaningEn: "Narrated Anas bin Malik: The Prophet (ﷺ) said, \"If any Muslim plants any plant and a human being or an animal eats of it, he will be rewarded as if he had given that much in charity.\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["meaning", "كل ما يُنتفع به مما غرستَه — لإنسان أو حيوان — صدقةٌ لك.", "Whatever benefit comes from what you planted — to a person or an animal — is charity for you."],
      ["practice", "ازرع شيئًا نافعًا ولو صغيرًا، أو اسقِ نبتة.", "Plant something useful, however small, or water a plant."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6064", chapterAr: "كتاب الأدب", chapterEn: "Book of Good Manners (Al-Adab)",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إياكم والظن، فإن الظن أكذب الحديث، ولا تحسسوا، ولا تجسسوا، ولا تحاسدوا، ولا تدابروا، ولا تباغضوا، وكونوا عباد الله إخوانا»",
    meaningEn: "Narrated Abu Huraira: The Prophet (ﷺ) said, \"Beware of suspicion, for suspicion is the worst of false tales; and do not look for the others' faults and do not spy, and do not be jealous of one another, and do not desert (cut your relation with) one another, and do not hate one another; and O Allah's worshipers! Be brothers (as Allah has ordered you).\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["meaning", "أخوّة الإيمان تُحفظ بترك سوء الظن والتجسس والحسد والتقاطع.", "Brotherhood in faith is kept by leaving suspicion, spying, envy and estrangement."],
      ["practice", "إذا خطر لك ظنٌّ سيئ بأحد اليوم، فالتمس له عذرًا.", "If a bad assumption about someone crosses your mind today, look for an excuse for them."],
    ],
  }),
  hadith({
    book: "bukhari", number: "6477", chapterAr: "كتاب الرقاق", chapterEn: "Book of To Make the Heart Tender (Ar-Riqaq)",
    reviewNote: "The checked dataset's Arabic ends «أبعد مما بين المشرق» and its English matches; confirm the ending against a printed edition before approving.",
    narratorAr: "أبو هريرة رضي الله عنه",
    textAr: "عن أبي هريرة رضي الله عنه أنه سمع رسول الله صلى الله عليه وسلم يقول: «إن العبد ليتكلم بالكلمة ما يتبين فيها، يزل بها في النار أبعد مما بين المشرق»",
    meaningEn: "Narrated Abu Huraira: That he heard Allah's Messenger (ﷺ) saying, \"A slave of Allah may utter a word without thinking whether it is right or wrong, he may slip down in the Fire as far away a distance equal to that between the east.\"",
    grade: "sahih", translation: PUBLISHED_EN_BUKHARI,
    comments: [
      ["reflection", "الكلمة لها وزن؛ فتأمّلها قبل أن تقولها.", "A word carries weight; consider it before you say it."],
      ["practice", "قبل أن تتكلم أو تكتب اليوم، توقّف لحظة واسأل: هل هذا خير؟", "Before you speak or post today, pause and ask: is this good?"],
    ],
  }),
];

// ---- Duas ----------------------------------------------------------------

export interface EnrichedDua {
  /** The reminder id is "dua:<id>". */
  id: string;
  kind: "quran" | "sunnah";
  textAr: string;
  meaningEn: string;
  sourceAr: string;
  sourceEn: string;
  url?: string;
  translation: TranslationSource;
  review: SourceReview;
  comments: EditorialComment[];
}

interface QuranDuaSpec {
  surahAr: string;
  surahEn: string;
  surah: number;
  ayah: number;
  textAr: string;
  meaningEn: string;
  comments: readonly CommentSpec[];
  /** When its text was checked against the source (default CHECKED_ON). */
  checkedOn?: string;
}

// `meaningEn` is Saheeh International's wording for the dua's own words,
// unchanged (2026-10-16: four renderings that had drifted from it — 3:147,
// 3:193, 26:83 "wisdom" for Saheeh's "authority", 46:15 — were set back to
// Saheeh's exact words, since that is the translation they are credited to).
function quranDua(spec: QuranDuaSpec): EnrichedDua {
  const id = `q-${spec.surah}-${spec.ayah}`;
  return {
    id,
    kind: "quran",
    textAr: spec.textAr,
    meaningEn: spec.meaningEn,
    sourceAr: `القرآن الكريم — سورة ${spec.surahAr}، الآية ${spec.ayah}`,
    sourceEn: `The Qur'an — Surat ${spec.surahEn} ${spec.surah}:${spec.ayah}`,
    url: `https://quran.com/${spec.surah}/${spec.ayah}`,
    translation: { source: "Saheeh International (trimmed to the dua's words)", reviewed: false },
    review: { status: "source-checked", checkedAgainst: QURAN_SOURCE_CHECK, checkedOn: spec.checkedOn ?? CHECKED_ON },
    comments: comments(`dua:${id}`, spec.comments),
  };
}

export const ENRICHED_DUAS: readonly EnrichedDua[] = [
  {
    id: "muslim-2654",
    kind: "sunnah",
    url: sunnahUrl("muslim-2654"),
    translation: DITHAR_RENDERING_CHECKED,
    textAr: "اللهم مصرف القلوب صرف قلوبنا على طاعتك",
    meaningEn: "O Allah, Turner of hearts, turn our hearts to Your obedience.",
    sourceAr: "صحيح مسلم (2654)، كتاب القدر — من حديث عبد الله بن عمرو رضي الله عنهما",
    sourceEn: "Sahih Muslim 2654, Book of Destiny — narrated by 'Abdullah ibn 'Amr",
    review: {
      status: "source-checked",
      checkedAgainst: HADITH_SOURCE_CHECK,
      checkedOn: CHECKED_ON,
      note: "Wording verified. The dataset is shifted by one here (it numbers «كل شيء بقدر», standard 2655, as 2656), so the standard 2654 is correct.",
    },
    comments: comments("dua:muslim-2654", [
      ["meaning", "القلوب بين يدي الله يصرّفها كيف يشاء؛ فاسأله أن يصرف قلبك إلى طاعته.", "Hearts are in Allah's hands to turn as He wills; ask Him to turn yours toward His obedience."],
      ["practice", "دعاءٌ قصير يصلح لكل حال، خاصةً حين تشعر بفتور.", "A short dua for every state, especially when your resolve feels weak."],
    ]),
  },
  {
    id: "muslim-2722-taqwa",
    kind: "sunnah",
    url: sunnahUrl("muslim-2722"),
    translation: DITHAR_RENDERING_CHECKED,
    textAr: "اللهم آت نفسي تقواها، وزكها أنت خير من زكاها، أنت وليها ومولاها",
    meaningEn: "O Allah, grant my soul its God-consciousness and purify it, for You are the best to purify it; You are its Guardian and its Protector.",
    sourceAr: "صحيح مسلم (2722)، كتاب الذكر والدعاء — طرفٌ من دعاءٍ رواه زيد بن أرقم رضي الله عنه",
    sourceEn: "Sahih Muslim 2722 — part of a supplication narrated by Zayd ibn Arqam",
    review: { status: "source-checked", checkedAgainst: HADITH_SOURCE_CHECK, checkedOn: CHECKED_ON },
    comments: comments("dua:muslim-2722-taqwa", [
      ["meaning", "تزكية النفس عطاءٌ من الله قبل أن تكون جهدًا منك؛ فاطلبها منه.", "Purifying the soul is a gift from Allah before it is your own effort — so ask Him for it."],
      ["practice", "ادعُ به حين تريد أن تتغيّر من الداخل.", "Say it when you want to change from within."],
    ]),
  },
  {
    id: "muslim-2722-ilm",
    kind: "sunnah",
    url: sunnahUrl("muslim-2722"),
    translation: DITHAR_RENDERING_CHECKED,
    textAr: "اللهم إني أعوذ بك من علم لا ينفع، ومن قلب لا يخشع، ومن نفس لا تشبع، ومن دعوة لا يستجاب لها",
    meaningEn: "O Allah, I seek refuge in You from knowledge that does not benefit, from a heart that does not humble itself, from a soul that is never satisfied, and from a supplication that is not answered.",
    sourceAr: "صحيح مسلم (2722)، كتاب الذكر والدعاء — طرفٌ من دعاءٍ رواه زيد بن أرقم رضي الله عنه",
    sourceEn: "Sahih Muslim 2722 — part of a supplication narrated by Zayd ibn Arqam",
    review: { status: "source-checked", checkedAgainst: HADITH_SOURCE_CHECK, checkedOn: CHECKED_ON },
    comments: comments("dua:muslim-2722-ilm", [
      ["meaning", "أربع استعاذات تحفظ عليك قيمة العلم والقلب والنفس والدعاء.", "Four refuges that guard the worth of knowledge, heart, soul and prayer."],
      ["practice", "قبل أن تبدأ تعلّم شيءٍ جديد، اسأل الله أن يجعله نافعًا.", "Before learning something new, ask Allah to make it beneficial."],
    ]),
  },
  {
    id: "bukhari-834",
    kind: "sunnah",
    url: sunnahUrl("bukhari-834"),
    translation: PUBLISHED_EN_BUKHARI,
    textAr: "اللهم إني ظلمت نفسي ظلما كثيرا، ولا يغفر الذنوب إلا أنت، فاغفر لي مغفرة من عندك، وارحمني إنك أنت الغفور الرحيم",
    meaningEn: "O Allah! I have done great injustice to myself and none except You forgives sins, so bestow on me a forgiveness from You, and Have Mercy on me, You are the Forgiver, the Merciful.",
    sourceAr: "صحيح البخاري (834)، كتاب الأذان — من حديث أبي بكر الصديق رضي الله عنه",
    sourceEn: "Sahih al-Bukhari 834, Book of the Call to Prayer — narrated by Abu Bakr as-Siddiq",
    review: {
      status: "source-checked",
      checkedAgainst: HADITH_SOURCE_CHECK,
      checkedOn: "2026-10-19",
      note: "Wording verified letter for letter against Bukhari 834. The dataset garbles one character at «ولا»; the same words in Bukhari 6326 and the English edition's transliteration («Wala yaghfiru») confirm it.",
    },
    comments: comments("dua:bukhari-834", [
      ["meaning", "اعترافٌ صادقٌ بالتقصير، ثم رجاءٌ في مغفرةٍ لا يملكها إلا الله.", "An honest admission of shortcoming, then hope in a forgiveness only Allah can give."],
      ["practice", "قبل أن تُسلّم من صلاتك، ادعُ به بتأنٍّ.", "Before you end your prayer, say it slowly."],
    ]),
  },
  quranDua({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 147,
    textAr: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    meaningEn: "Our Lord, forgive us our sins and the excess [committed] in our affairs and plant firmly our feet and give us victory over the disbelieving people.",
    comments: [
      ["meaning", "دعاءٌ يجمع الاعتراف بالتقصير وطلب الثبات: صدقٌ مع النفس، وثقةٌ بالله.", "A dua that joins admitting shortcoming with asking for steadfastness — honesty with oneself and trust in Allah."],
      ["practice", "حين تشعر أنك أسرفت على نفسك، فابدأ بهذا الدعاء.", "When you feel you've been too hard on yourself through your own excess, begin with this dua."],
    ],
  }),
  quranDua({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 16,
    textAr: "رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ",
    meaningEn: "Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.",
    comments: [
      ["meaning", "إيمانٌ يُقدَّم بين يدي الدعاء، ثم سؤالٌ للمغفرة والنجاة.", "Faith offered before the request, then a plea for forgiveness and safety."],
      ["practice", "ادعُ به في وقتٍ هادئ قبل الفجر، حين يصفو القلب.", "Say it in a quiet hour before dawn, when the heart is clear."],
    ],
  }),
  quranDua({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 193,
    textAr: "رَبَّنَا فَاغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّئَاتِنَا وَتَوَفَّنَا مَعَ الْأَبْرَارِ",
    meaningEn: "Our Lord, so forgive us our sins and remove from us our misdeeds and cause us to die among the righteous.",
    comments: [
      ["reflection", "دعاءُ من سمع نداء الإيمان فاستجاب، ثم سأل حسن الختام.", "The dua of those who heard the call to faith, answered it, then asked for a good ending."],
      ["encouragement", "أن تتوفّى مع الأبرار: أمنيةٌ تستحق أن تعمل لها كل يوم.", "To pass away among the righteous: a hope worth working toward every day."],
    ],
  }),
  quranDua({
    surahAr: "المؤمنون", surahEn: "Al-Mu'minun", surah: 23, ayah: 118,
    textAr: "رَبِّ اغْفِرْ وَارْحَمْ وَأَنْتَ خَيْرُ الرَّاحِمِينَ",
    meaningEn: "My Lord, forgive and have mercy, and You are the best of the merciful.",
    comments: [
      ["meaning", "كلماتٌ قليلة تجمع المغفرة والرحمة، وتُختم بأجمل الثناء.", "A few words that join forgiveness and mercy, closing with the finest praise."],
      ["practice", "اجعله دعاءك حين لا تجد كلمات.", "Make it your dua when you can't find words."],
    ],
  }),
  quranDua({
    surahAr: "الأنبياء", surahEn: "Al-Anbiya'", surah: 21, ayah: 89,
    textAr: "رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنْتَ خَيْرُ الْوَارِثِينَ",
    meaningEn: "My Lord, do not leave me alone (with no heir), while You are the best of inheritors.",
    comments: [
      ["meaning", "دعاء زكريا عليه السلام: يشكو وحدته إلى ربه، ويثني عليه بأنه خير الوارثين.", "Zechariah's dua (peace be upon him): he brings his loneliness to his Lord and praises Him as the best of inheritors."],
      ["encouragement", "إن شعرت بالوحدة، فإن قلبك يجد في الدعاء أُنسًا لا يجده في غيره.", "If you feel alone, your heart finds in dua a closeness it finds nowhere else."],
    ],
  }),
  quranDua({
    surahAr: "الشعراء", surahEn: "Ash-Shu'ara'", surah: 26, ayah: 83,
    textAr: "رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ",
    meaningEn: "My Lord, grant me authority and join me with the righteous.",
    comments: [
      ["meaning", "دعاء إبراهيم عليه السلام: حكمةٌ وعلم، ثم صحبة الصالحين.", "Abraham's dua (peace be upon him): wisdom and knowledge, then the company of the righteous."],
      ["practice", "اسأل الله الحكمة في قراراتك، والصلاح في صحبتك.", "Ask Allah for wisdom in your choices and righteousness in your company."],
    ],
  }),
  quranDua({
    surahAr: "النمل", surahEn: "An-Naml", surah: 27, ayah: 19,
    textAr: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَدْخِلْنِي بِرَحْمَتِكَ فِي عِبَادِكَ الصَّالِحِينَ",
    meaningEn: "My Lord, enable me to be grateful for Your favour which You have bestowed upon me and upon my parents, and to do righteousness of which You approve; and admit me by Your mercy into the ranks of Your righteous servants.",
    comments: [
      ["meaning", "الشكر نفسه توفيق؛ ولذلك سأل سليمان عليه السلام ربه أن يُلهمه إياه.", "Gratitude is itself a gift; that is why Solomon (peace be upon him) asked his Lord to inspire it in him."],
      ["reflection", "تذكّر نِعَم الله على والديك أيضًا؛ فقد جمعها الدعاء مع نعمتك.", "Remember Allah's favours on your parents too; the dua joins them with your own."],
    ],
  }),
  quranDua({
    surahAr: "الأحقاف", surahEn: "Al-Ahqaf", surah: 46, ayah: 15,
    textAr: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَصْلِحْ لِي فِي ذُرِّيَّتِي إِنِّي تُبْتُ إِلَيْكَ وَإِنِّي مِنَ الْمُسْلِمِينَ",
    meaningEn: "My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents and to work righteousness of which You will approve and make righteous for me my offspring. Indeed, I have repented to You, and indeed, I am of the Muslims.",
    comments: [
      ["meaning", "دعاءٌ للعمر الناضج: شكرٌ، وعملٌ صالح، وصلاحٌ في الذرية، وتوبة.", "A dua of maturity: gratitude, righteous work, goodness in one's children, and repentance."],
      ["encouragement", "كل عمرٍ يحتاج الشكر والتوبة؛ فابدأ بهذا الدعاء اليوم.", "Every age needs gratitude and repentance; begin with this dua today."],
    ],
  }),
  quranDua({
    surahAr: "الإسراء", surahEn: "Al-Isra'", surah: 17, ayah: 24,
    textAr: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    meaningEn: "My Lord, have mercy upon them as they brought me up when I was small.",
    comments: [
      ["reflection", "دعاءٌ يردّ شيئًا من الجميل: رحمةٌ تطلبها لمن رحماك صغيرًا.", "A dua that returns some kindness: mercy you ask for those who showed you mercy when you were small."],
      ["practice", "ادعُ لوالديك اليوم بأسمائهما.", "Pray for your parents by name today."],
    ],
  }),
  quranDua({
    surahAr: "نوح", surahEn: "Nuh", surah: 71, ayah: 28,
    textAr: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَنْ دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ",
    meaningEn: "My Lord, forgive me and my parents and whoever enters my house a believer, and the believing men and believing women.",
    comments: [
      ["meaning", "دعاءٌ يتّسع من نفسك إلى والديك وبيتك والمؤمنين جميعًا.", "A dua that widens from yourself to your parents, your home, and all believers."],
      ["reflection", "حين تدعو للمؤمنين جميعًا، يتّسع قلبك معهم.", "When you pray for all believers, your heart widens with them."],
    ],
  }),
  // ---- Added 2026-10-20: each cut on whole words from its source by script — the Qur'an from Tanzil's
  // «quran-simple» (verse lines in lib/__fixtures__/tanzil-simple-cited.txt) with Saheeh International's
  // words for it; the Prophetic duas from the Arabic edition of the checked dataset, its own diacritics
  // kept (the narrations in lib/__fixtures__/hadith-api-widget-duas.json). New content: pending review.
  quranDua({
    surahAr: "آل عمران", surahEn: "Al 'Imran", surah: 3, ayah: 191, checkedOn: "2026-10-20",
    textAr: "رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ",
    meaningEn: "Our Lord, You did not create this aimlessly; exalted are You [above such a thing]; then protect us from the punishment of the Fire.",
    comments: [
      ["meaning", "دعاءُ أولي الألباب: يذكرون الله ويتفكّرون في خلق السماوات والأرض، ثم يسألونه النجاة من النار.", "People of understanding remember Allah and reflect on the creation of the heavens and the earth, then ask Him for safety from the Fire."],
      ["practice", "حين ترى السماء أو منظرًا بديعًا اليوم، تفكّر قليلًا ثم ادعُ بهذا الدعاء.", "When you see the sky or a beautiful sight today, reflect a little, then say this dua."],
    ],
  }),
  quranDua({
    surahAr: "يونس", surahEn: "Yunus", surah: 10, ayah: 85, checkedOn: "2026-10-20",
    textAr: "عَلَى اللَّهِ تَوَكَّلْنَا رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ",
    meaningEn: "Upon Allah do we rely. Our Lord, make us not [objects of] trial for the wrongdoing people.",
    comments: [
      ["meaning", "قاله قوم موسى عليه السلام: توكّلٌ على الله أولًا، ثم سؤالُه السلامة من الظالمين.", "Said by the people of Moses (peace be upon him): reliance on Allah first, then asking Him for safety from the wrongdoers."],
      ["reflection", "التوكّل يسبق الطلب في هذا الدعاء؛ فابدأ بقلبٍ مطمئن إلى الله.", "In this dua reliance comes before the request; begin with a heart at rest in Allah."],
    ],
  }),
  quranDua({
    surahAr: "يوسف", surahEn: "Yusuf", surah: 12, ayah: 101, checkedOn: "2026-10-20",
    textAr: "فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ أَنتَ وَلِيِّي فِي الدُّنْيَا وَالْآخِرَةِ تَوَفَّنِي مُسْلِمًا وَأَلْحِقْنِي بِالصَّالِحِينَ",
    meaningEn: "Creator of the heavens and earth, You are my protector in this world and in the Hereafter. Cause me to die a Muslim and join me with the righteous.",
    comments: [
      ["meaning", "دعاء يوسف عليه السلام بعد أن تمّت عليه النعمة: أن يثبّته الله على الإسلام حتى يلقاه.", "The dua of Joseph (peace be upon him) once his blessings were complete: that Allah keep him a Muslim until he meets Him."],
      ["reflection", "حتى في أتمّ النعم، بقي همُّه حسنَ الخاتمة.", "Even at the height of his blessings, his concern remained a good ending."],
    ],
  }),
  quranDua({
    surahAr: "الإسراء", surahEn: "Al-Isra'", surah: 17, ayah: 80, checkedOn: "2026-10-20",
    textAr: "رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَل لِّي مِن لَّدُنكَ سُلْطَانًا نَّصِيرًا",
    meaningEn: "My Lord, cause me to enter a sound entrance and to exit a sound exit and grant me from Yourself a supporting authority.",
    comments: [
      ["meaning", "دعاءٌ عُلِّمه النبي ﷺ: أن يكون كلُّ دخولٍ وخروجٍ له على صدق، وأن يجعل الله له من لدنه سلطانًا نصيرًا.", "A dua the Prophet ﷺ was taught: that every entering and leaving be in truth, and that Allah grant him supporting authority from Himself."],
      ["practice", "ادعُ به قبل أن تبدأ عملًا جديدًا أو تنتقل إلى مكانٍ جديد.", "Say it before you start new work or move to a new place."],
    ],
  }),
  quranDua({
    surahAr: "المؤمنون", surahEn: "Al-Mu'minun", surah: 23, ayah: 29, checkedOn: "2026-10-20",
    textAr: "رَبِّ أَنزِلْنِي مُنزَلًا مُّبَارَكًا وَأَنتَ خَيْرُ الْمُنزِلِينَ",
    meaningEn: "My Lord, let me land at a blessed landing place, and You are the best to accommodate [us].",
    comments: [
      ["meaning", "عُلِّمه نوحٌ عليه السلام بعد أن استوى في الفلك: أن ينزله الله منزلًا مباركًا.", "Noah (peace be upon him) was taught it once aboard the ark: that Allah settle him in a blessed place."],
      ["practice", "ادعُ به حين تصل إلى بيتٍ أو مدينةٍ أو مرحلةٍ جديدة في حياتك.", "Say it when you arrive at a new home, city or stage of life."],
    ],
  }),
  quranDua({
    surahAr: "الفرقان", surahEn: "Al-Furqan", surah: 25, ayah: 65, checkedOn: "2026-10-20",
    textAr: "رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا",
    meaningEn: "Our Lord, avert from us the punishment of Hell. Indeed, its punishment is ever adhering.",
    comments: [
      ["meaning", "من صفات عباد الرحمن: يدعون ربهم أن يصرف عنهم عذاب جهنم.", "Among the qualities of the servants of the Most Merciful: they ask their Lord to turn the punishment of Hell away from them."],
      ["reflection", "الخوف من العذاب يدفع إلى الدعاء، والدعاء يورث الطمأنينة.", "Fear of punishment moves one to pray, and prayer brings peace of heart."],
    ],
  }),
  quranDua({
    surahAr: "القصص", surahEn: "Al-Qasas", surah: 28, ayah: 16, checkedOn: "2026-10-20",
    textAr: "رَبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي",
    meaningEn: "My Lord, indeed I have wronged myself, so forgive me.",
    comments: [
      ["meaning", "دعاء موسى عليه السلام حين أخطأ: اعترافٌ صريح، ثم طلبُ المغفرة — فغفر الله له.", "The dua of Moses (peace be upon him) when he erred: a plain admission, then a plea for forgiveness — and Allah forgave him."],
      ["practice", "إذا أخطأت اليوم، فلا تؤخّر هذه الكلمات القليلة.", "If you err today, don't delay these few words."],
    ],
  }),
  quranDua({
    surahAr: "الممتحنة", surahEn: "Al-Mumtahanah", surah: 60, ayah: 5, checkedOn: "2026-10-20",
    textAr: "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ",
    meaningEn: "Our Lord, make us not [objects of] torment for the disbelievers and forgive us, our Lord. Indeed, it is You who is the Exalted in Might, the Wise.",
    comments: [
      ["meaning", "من دعاء إبراهيم عليه السلام والذين معه: ألّا يجعلهم الله فتنةً لغيرهم، وأن يغفر لهم.", "From the dua of Abraham (peace be upon him) and those with him: that Allah not make them a trial for others, and that He forgive them."],
      ["reflection", "أن تكون قدوةً حسنة نعمةٌ تُطلب من الله.", "Being a good example is a blessing to ask Allah for."],
    ],
  }),
  quranDua({
    surahAr: "التحريم", surahEn: "At-Tahrim", surah: 66, ayah: 11, checkedOn: "2026-10-20",
    textAr: "رَبِّ ابْنِ لِي عِندَكَ بَيْتًا فِي الْجَنَّةِ",
    meaningEn: "My Lord, build for me near You a house in Paradise.",
    comments: [
      ["meaning", "دعاء امرأة فرعون: طلبت جوار الله قبل الدار، فقدّمت قربه على البيت في الجنة.", "The dua of Pharaoh's wife: she asked for nearness to Allah before the house, putting His nearness before a home in Paradise."],
      ["encouragement", "مهما اشتدّ ما حولك، فقلبك يستطيع أن يتعلّق بما عند الله.", "However hard your surroundings, your heart can hold on to what is with Allah."],
    ],
  }),
  {
    id: "muslim-2717",
    kind: "sunnah",
    url: sunnahUrl("muslim-2717"),
    translation: PUBLISHED_EN_MUSLIM,
    textAr: "اللَّهُمَّ لَكَ أَسْلَمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَإِلَيْكَ أَنَبْتُ وَبِكَ خَاصَمْتُ اللَّهُمَّ إِنِّي أَعُوذُ بِعِزَّتِكَ لاَ إِلَهَ إِلاَّ أَنْتَ أَنْ تُضِلَّنِي أَنْتَ الْحَىُّ الَّذِي لاَ يَمُوتُ وَالْجِنُّ وَالإِنْسُ يَمُوتُونَ",
    meaningEn: "O Allah, it is unto Thee that I surrender myself. I affirm my faith in Thee and repose my trust in Thee and turn to Thee in repentance and with Thy help fought my adversaries. O Allah, I seek refuge in Thee with Thine Power; there is no god but Thou, lest Thou leadest me astray. Thou art ever-living that dieth not, while the Jinn and mankind die.",
    sourceAr: "صحيح مسلم (2717)، كتاب الذكر والدعاء — من حديث ابن عباس رضي الله عنهما",
    sourceEn: "Sahih Muslim 2717, Book of Remembrance and Supplication — narrated by Ibn 'Abbas",
    review: { status: "source-checked", checkedAgainst: HADITH_SOURCE_CHECK, checkedOn: "2026-10-20" },
    comments: comments("dua:muslim-2717", [
      ["meaning", "إسلامٌ وإيمانٌ وتوكّلٌ وإنابة، ثم استعاذةٌ بعزّة الله من الضلال.", "Submission, faith, reliance and turning back to Allah — then seeking refuge in His might from going astray."],
      ["reflection", "كل ما سوى الله يزول، والحيّ الذي لا يموت هو الملجأ.", "All besides Allah passes away; the Ever-Living who never dies is the refuge."],
    ]),
  },
  {
    id: "bukhari-6316",
    kind: "sunnah",
    url: sunnahUrl("bukhari-6316"),
    translation: DITHAR_RENDERING_CHECKED,
    textAr: "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي بَصَرِي نُورًا، وَفِي سَمْعِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ يَسَارِي نُورًا، وَفَوْقِي نُورًا، وَتَحْتِي نُورًا، وَأَمَامِي نُورًا، وَخَلْفِي نُورًا، وَاجْعَلْ لِي نُورًا",
    meaningEn: "O Allah, place light in my heart, light in my sight and light in my hearing; light on my right and light on my left; light above me and light below me; light before me and light behind me; and grant me light.",
    sourceAr: "صحيح البخاري (6316)، كتاب الدعوات — من حديث ابن عباس رضي الله عنهما",
    sourceEn: "Sahih al-Bukhari 6316, Book of Invocations — narrated by Ibn 'Abbas",
    review: {
      status: "source-checked",
      checkedAgainst: HADITH_SOURCE_CHECK,
      checkedOn: "2026-10-20",
      note: "Arabic verbatim from the edition. Its English edition gives only a transliteration of these words, so the meaning is DITHAR's rendering.",
    },
    comments: comments("dua:bukhari-6316", [
      ["meaning", "نورٌ في القلب والجوارح ومن كل جهة: هدايةٌ تحيط بالعبد في كل أحواله.", "Light in the heart, the senses and on every side: guidance surrounding a person in every state."],
      ["practice", "من دعاء النبي ﷺ؛ فاجعل له نصيبًا من دعائك.", "It is among the Prophet's ﷺ supplications; give it a place in your own."],
    ]),
  },
];

/**
 * Existing written-library duas added to the reminder pool (and so the
 * widget) beside the Daily Picks ones: general-purpose duas whose words suit
 * any moment, each with the library's own source line, unchanged. Two of
 * them are also said in prayer (Muslim 486 in prostration, Tirmidhi 3233),
 * and «إنا لله…» at a calamity; their wording is still a dua for any day.
 * Added 2026-10-19 after their wording was checked word for word against
 * the cited narrations (fawazahmed0/hadith-api's Arabic editions): Muslim
 * 486, Tirmidhi 3233, Muslim (the four refuges before the salam), Muslim
 * (Umm Salamah's «إنا لله…»), Abu Dawud 5094. Left out: the library's
 * «اللهم رب الناس… اشف أنت الشافي…», which combines two narrations'
 * wordings (Bukhari 5742/5743) — kept off the widget until reviewed.
 */
export const EXTRA_POOL_DUA_IDS: readonly string[] = [
  "allahumma-aini-ala-dhikrik",
  "allahumma-hasibni-hisaban-yasiran",
  "allahumma-audhu-biridaka-min-sakhatik",
  "allahumma-inni-asaluka-fil-al-khayrat",
  "before-salam-audhu",
  "inna-lillahi-wa-inna-ilayhi-rajiun",
  "allahumma-inni-audhu-bika-an-adilla-aw-udall",
];

// ---- Poetry --------------------------------------------------------------

export type PoemAttribution = "established" | "attributed" | "disputed";

export interface Poem {
  /** The reminder id is "poetry:<id>". */
  id: string;
  /** Verses, each "first hemistich … second hemistich". */
  verses: string[];
  /** A DITHAR rendering of the meaning — poetry has no "official" translation. */
  meaningEn: string;
  attribution: PoemAttribution;
  /** What is shown as the source line: the poet, or «يُنسب إلى…». */
  attributionAr: string;
  attributionEn: string;
  /** A verified text that bears on the verse (only where one exists), shown under its own label. */
  evidence?: { kind: "hadith"; ar: string; en: string; sourceAr: string; sourceEn: string };
  /** The page the wording was checked on (or, where only quoting works had it, a search for the verse). */
  url: string;
  translation: TranslationSource;
  review: SourceReview;
  comments: EditorialComment[];
}

/** Arabic Wikisource pages the wording was checked on; other poems were found in quoting works (search link). */
const POEM_PAGES: Readonly<Record<string, string>> = {
  "shawqi-huda": "ولد الهدى",
  "shawqi-rahma": "ولد الهدى",
  "busiri-nafs": "أمن تذكر جيران بذي سلم",
  "shafii-ayyam": "دع الأيام تفعل ما تشاء",
  "atahiya-raqib": "إذا ما خلوت الدهر يوما فلا تقل",
  "nazila-faraj": "ولرب نازلة يضيق لها الفتى",
  "mutanabbi-azm": "على قدر أهل العزم تأتي العزائم",
  "busti-ihsan": "عنوان الحكم",
  "busti-nafs": "عنوان الحكم",
  "tarafa-ayyam": "معلقة طرفة بن العبد",
  "zuhayr-maruf": "معلقة زهير بن أبي سلمى",
  "mutanabbi-nujum": "إذا غامرت في شرف مروم",
  "shafii-afw": "شعر الشافعي قبل موته",
};

function poemUrl(id: string, firstVerse: string): string {
  const page = POEM_PAGES[id];
  if (page) return `https://ar.wikisource.org/wiki/${encodeURIComponent(page.replace(/ /g, "_"))}`;
  const firstHemistich = firstVerse.split("…")[0].trim();
  return `https://ar.wikisource.org/w/index.php?search=${encodeURIComponent(`"${firstHemistich}"`)}`;
}

const WIKISOURCE = "Arabic Wikisource (ar.wikisource.org) — the poem's page and quoting works";

function poem(p: Omit<Poem, "review" | "comments" | "url" | "translation"> & { checkedAgainst?: string; comments: readonly CommentSpec[] }): Poem {
  const { checkedAgainst, comments: specs, ...rest } = p;
  return {
    ...rest,
    url: poemUrl(p.id, p.verses[0]),
    translation: { source: "DITHAR rendering of the meaning (poetry has no official translation)", reviewed: false },
    review: { status: "source-checked", checkedAgainst: checkedAgainst ?? WIKISOURCE, checkedOn: CHECKED_ON },
    comments: comments(`poetry:${p.id}`, specs),
  };
}

export const POEMS: readonly Poem[] = [
  poem({
    id: "labid-batil",
    verses: ["ألا كل شيء ما خلا الله باطل"],
    meaningEn: "Truly, everything besides Allah is passing away.",
    attribution: "established",
    attributionAr: "لبيد بن ربيعة رضي الله عنه",
    attributionEn: "Labid ibn Rabi'a (may Allah be pleased with him)",
    evidence: {
      kind: "hadith",
      ar: "عن أبي هريرة رضي الله عنه قال: قال النبي صلى الله عليه وسلم: «أصدق كلمة قالها الشاعر كلمة لبيد: ألا كل شيء ما خلا الله باطل»",
      en: "The Prophet ﷺ said: \"The truest word spoken by a poet is the word of Labid: 'Truly, everything besides Allah is passing away.'\"",
      sourceAr: "صحيح البخاري 3841",
      sourceEn: "Sahih al-Bukhari 3841",
    },
    checkedAgainst: `${HADITH_SOURCE_CHECK}; ${WIKISOURCE}`,
    comments: [
      ["meaning", "شطرٌ واحد يذكّرك بأن كل ما سوى الله يزول.", "A single half-verse reminding you that all besides Allah passes away."],
      ["reflection", "أثنى النبي ﷺ على صدق هذه الكلمة؛ فالشعر حين يقول الحق يبقى.", "The Prophet ﷺ praised the truth of these words; poetry that speaks truth endures."],
    ],
  }),
  poem({
    id: "zuhayr-khaliqa",
    verses: ["ومهما تكن عند امرئ من خليقة … وإن خالها تخفى على الناس تُعلم"],
    meaningEn: "Whatever trait a person has, though he imagines it hidden from people, it will become known.",
    attribution: "established",
    attributionAr: "زهير بن أبي سلمى — من معلّقته",
    attributionEn: "Zuhayr ibn Abi Sulma — from his Mu'allaqa",
    comments: [
      ["reflection", "الخُلُق يظهر مهما حاول صاحبه إخفاءه؛ فأصلح الباطن يصلح الظاهر.", "Character shows however one tries to hide it; mend the inside and the outside follows."],
      ["practice", "ما تكرّره في الخفاء يصير طبعًا يراه الناس؛ فاختر ما تكرّره.", "What you repeat in private becomes a nature people see — so choose what you repeat."],
    ],
  }),
  poem({
    id: "mutanabbi-azm",
    verses: ["على قدر أهل العزم تأتي العزائم … وتأتي على قدر الكرام المكارم"],
    meaningEn: "Resolve comes in the measure of the resolute, and noble deeds come in the measure of the noble.",
    attribution: "established",
    attributionAr: "أبو الطيب المتنبي",
    attributionEn: "Abu al-Tayyib al-Mutanabbi",
    comments: [
      ["encouragement", "العزائم على قدر الهمم؛ فارفع همّتك في الخير.", "Resolve rises to the measure of one's aspirations; raise yours in goodness."],
      ["practice", "ابدأ يومك بعملٍ يليق بهمّتك، لا بتعبك.", "Begin your day with a deed worthy of your aspiration, not your fatigue."],
    ],
  }),
  poem({
    id: "mutanabbi-karim",
    verses: ["إذا أنت أكرمت الكريم ملكته … وإن أنت أكرمت اللئيم تمرّدا"],
    meaningEn: "If you honour the noble, you win his heart; if you honour the base, he grows insolent.",
    attribution: "established",
    attributionAr: "أبو الطيب المتنبي",
    attributionEn: "Abu al-Tayyib al-Mutanabbi",
    comments: [
      ["reflection", "كن أنت الكريم الذي يحفظ المعروف ولا ينساه.", "Be the noble one who remembers a kindness and never forgets it."],
      ["meaning", "المعروف عند الكريم دَينٌ يحفظه؛ فاعرف أين تضع إحسانك.", "With the noble, a kindness is a debt they keep; know where to place your good."],
    ],
  }),
  poem({
    id: "busti-ihsan",
    verses: ["أحسن إلى الناس تستعبد قلوبهم … فطالما استعبد الإنسانَ إحسانُ"],
    meaningEn: "Do good to people and you will win their hearts; how often has kindness made a person devoted.",
    attribution: "established",
    attributionAr: "أبو الفتح البستي — من نونيّته «عنوان الحكم»",
    attributionEn: "Abu al-Fath al-Busti — from his Nuniyya",
    comments: [
      ["reflection", "الإحسان يأسر القلوب أكثر من أي قوة.", "Kindness captures hearts more than any force."],
      ["practice", "أحسِن اليوم إلى من لا ينتظر منك شيئًا.", "Do good today to someone who expects nothing from you."],
    ],
  }),
  poem({
    id: "busti-nafs",
    verses: ["يا خادم الجسم كم تشقى بخدمته … أتطلب الربح فيما فيه خسران", "أقبل على النفس واستكمل فضائلها … فأنت بالنفس لا بالجسم إنسان"],
    meaningEn: "O servant of the body, how you toil in its service — do you seek profit in what brings loss? Turn to the soul and perfect its virtues; you are human by the soul, not by the body.",
    attribution: "established",
    attributionAr: "أبو الفتح البستي — من نونيّته «عنوان الحكم»",
    attributionEn: "Abu al-Fath al-Busti — from his Nuniyya",
    comments: [
      ["reflection", "الإنسان بروحه وأخلاقه، لا بجسده وحده؛ فأعطِ روحك نصيبها.", "A person is their soul and character, not their body alone; give your soul its share."],
      ["practice", "اجعل لروحك وقتًا اليوم كما تجعل لجسدك.", "Give your soul time today, as you do your body."],
    ],
  }),
  poem({
    id: "busiri-nafs",
    verses: ["والنفس كالطفل إن تهمله شبّ على … حبّ الرضاع وإن تفطمه ينفطم"],
    meaningEn: "The soul is like an infant: neglect it and it grows up loving to nurse; wean it, and it will be weaned.",
    attribution: "established",
    attributionAr: "البوصيري — من «البردة»",
    attributionEn: "Al-Busiri — from al-Burda",
    comments: [
      ["meaning", "النفس تعتاد ما تُعوَّد عليه؛ والفطام عن العادة صعبٌ في البداية فقط.", "The soul grows used to what it is given; weaning it from a habit is hard only at first."],
      ["practice", "اختر عادةً واحدة تريد تركها، وابدأ بفطامٍ لطيف.", "Choose one habit you want to leave, and begin a gentle weaning."],
    ],
  }),
  poem({
    id: "shawqi-huda",
    verses: ["وُلد الهدى فالكائنات ضياء … وفم الزمان تبسّم وثناء"],
    meaningEn: "Guidance was born, and all creation is radiance; the lips of time are a smile and praise.",
    attribution: "established",
    attributionAr: "أحمد شوقي — من الهمزية النبوية",
    attributionEn: "Ahmad Shawqi — from his Hamziyya on the Prophet ﷺ",
    comments: [
      ["reflection", "بيتٌ يحتفي بمجيء الهدى إلى العالم؛ وأصدق الحب للنبي ﷺ اتباع هديه.", "A verse celebrating guidance coming to the world; the truest love for the Prophet ﷺ is following his guidance."],
      ["practice", "اقرأ اليوم صفحةً من سيرته ﷺ.", "Read a page of his ﷺ biography today."],
    ],
  }),
  poem({
    id: "shawqi-rahma",
    verses: ["وإذا رحمت فأنت أمّ أو أب … هذان في الدنيا هما الرحماء"],
    meaningEn: "When you showed mercy, you were as a mother or a father — these two are the merciful ones of this world.",
    attribution: "established",
    attributionAr: "أحمد شوقي — من الهمزية النبوية",
    attributionEn: "Ahmad Shawqi — from his Hamziyya on the Prophet ﷺ",
    comments: [
      ["meaning", "يصف الشاعر رحمة النبي ﷺ بأقرب صور الرحمة إلينا: الأم والأب.", "The poet likens the Prophet's ﷺ mercy to the closest images of mercy we know: mother and father."],
      ["practice", "كن رحيمًا بمن حولك اليوم؛ فالرحمة من أجمل أخلاقه ﷺ.", "Be merciful with those around you today; mercy is among his ﷺ most beautiful traits."],
    ],
  }),
  poem({
    id: "shawqi-akhlaq",
    verses: ["وإنما الأمم الأخلاق ما بقيت … فإن همو ذهبت أخلاقهم ذهبوا"],
    meaningEn: "Nations are their character, as long as it remains; if their character departs, they depart.",
    attribution: "established",
    attributionAr: "أحمد شوقي",
    attributionEn: "Ahmad Shawqi",
    comments: [
      ["reflection", "الأمم تبقى ببقاء أخلاقها؛ والإصلاح يبدأ من خُلُق الفرد.", "Nations endure as long as their character does; reform begins with the individual."],
      ["practice", "اختر خُلُقًا واحدًا تحسّنه هذا الأسبوع.", "Choose one trait of character to improve this week."],
    ],
  }),
  poem({
    id: "shawqi-salah",
    verses: ["صلاح أمرك للأخلاق مرجعه … فقوّم النفس بالأخلاق تستقم"],
    meaningEn: "The soundness of your affairs rests on character; so set the soul straight with character, and you will be upright.",
    attribution: "established",
    attributionAr: "أحمد شوقي — من «نهج البردة»",
    attributionEn: "Ahmad Shawqi — from Nahj al-Burda",
    comments: [
      ["meaning", "صلاح الأمر مرجعه الأخلاق؛ فقوّم نفسك بها.", "The soundness of affairs returns to character; straighten yourself by it."],
      ["practice", "ابدأ بإصلاح ما بينك وبين نفسك، يصلح ما بينك وبين الناس.", "Begin by mending yourself, and your dealings with people will mend."],
    ],
  }),
  poem({
    id: "hafiz-umm",
    verses: ["الأم مدرسة إذا أعددتها … أعددت شعبًا طيّب الأعراق"],
    meaningEn: "A mother is a school: prepare her well, and you prepare a people of fine roots.",
    attribution: "established",
    attributionAr: "حافظ إبراهيم",
    attributionEn: "Hafiz Ibrahim",
    comments: [
      ["reflection", "الأم مدرسةٌ يتخرّج منها جيل؛ وتكريمها تكريمٌ للمستقبل.", "A mother is a school from which a generation graduates; honouring her honours the future."],
      ["practice", "اشكر أمك اليوم بكلمة، أو ادعُ لها إن كانت قد رحلت.", "Thank your mother today with a word, or pray for her if she has passed."],
    ],
  }),
  poem({
    id: "ibnwardi-asl",
    verses: ["لا تقل أصلي وفصلي أبدًا … إنما أصل الفتى ما قد حصل"],
    meaningEn: "Never say \"my lineage and my descent\"; a person's true origin is what he has achieved.",
    attribution: "established",
    attributionAr: "ابن الوردي — من لاميّته",
    attributionEn: "Ibn al-Wardi — from his Lamiyya",
    comments: [
      ["meaning", "قيمة الإنسان بما يحصّله من علمٍ وخُلُق، لا بنسبه.", "A person's worth is in what they attain of knowledge and character, not their lineage."],
      ["practice", "ابنِ اليوم شيئًا يُحسب لك أنت، لا لأسلافك.", "Build something today that counts for you, not for your ancestors."],
    ],
  }),
  poem({
    id: "shafii-afw",
    verses: ["ولما قسا قلبي وضاقت مذاهبي … جعلت الرجا مني لعفوك سُلّما", "تعاظمني ذنبي فلما قرنته … بعفوك ربي كان عفوك أعظما"],
    meaningEn: "When my heart hardened and my ways grew narrow, I made my hope a ladder to Your pardon. My sin seemed immense to me — but when I set it beside Your pardon, my Lord, Your pardon was greater.",
    attribution: "attributed",
    attributionAr: "يُنسب إلى الإمام الشافعي",
    attributionEn: "Attributed to Imam al-Shafi'i",
    comments: [
      ["encouragement", "حين يعظم الذنب في عينك، فعفو الله أعظم.", "When a sin looms large in your eyes, Allah's pardon is greater."],
      ["reflection", "الرجاء سُلَّمٌ إلى العفو؛ فلا تتركه مهما قسا قلبك.", "Hope is a ladder to pardon; never let go of it, however hard your heart feels."],
    ],
  }),
  poem({
    id: "nazila-faraj",
    verses: ["ولرب نازلة يضيق لها الفتى … ذرعًا وعند الله منها المخرج", "ضاقت فلما استحكمت حلقاتها … فُرجت وكنت أظنها لا تُفرج"],
    meaningEn: "Many a calamity leaves a person at his wits' end, yet with Allah lies the way out. It tightened, and when its rings were fastened shut, it opened — when I had thought it never would.",
    attribution: "disputed",
    attributionAr: "يُنسب إلى الإمام الشافعي، ونسبه ابن كثير إلى إبراهيم بن العباس الصولي",
    attributionEn: "Attributed to Imam al-Shafi'i; Ibn Kathir attributes it to Ibrahim ibn al-'Abbas al-Suli",
    comments: [
      ["encouragement", "كم من ضيقٍ اشتدّ ثم انفرج؛ والمخرج عند الله.", "How many straits tightened and then opened; the way out is with Allah."],
      ["practice", "إن ضاقت بك اليوم، فتذكّر ضيقًا سابقًا فرّجه الله عنك.", "If things feel tight today, remember an earlier hardship that Allah relieved for you."],
    ],
  }),
  poem({
    id: "atahiya-raqib",
    verses: ["إذا ما خلوت الدهر يومًا فلا تقل … خلوت ولكن قل عليّ رقيب", "ولا تحسبنّ الله يغفل ساعة … ولا أنّ ما يخفى عليه يغيب"],
    meaningEn: "If one day you find yourself alone, do not say \"I am alone,\" but say \"there is a Watcher over me.\" Never think Allah is heedless for an hour, nor that what is hidden escapes Him.",
    attribution: "attributed",
    attributionAr: "يُنسب إلى أبي العتاهية، وكان الإمام أحمد يُنشده",
    attributionEn: "Attributed to Abu al-'Atahiya; Imam Ahmad used to recite it",
    comments: [
      ["reflection", "لست وحدك حين تخلو؛ فالله مطّلعٌ عليك.", "You are never truly alone when alone; Allah sees you."],
      ["practice", "اجعل خلوتك موضع طاعةٍ صغيرة لا يراها أحد.", "Make your private moments a place for a small act of obedience no one sees."],
    ],
  }),
  poem({
    id: "shafii-ayyam",
    verses: ["دع الأيام تفعل ما تشاء … وطب نفسًا إذا حكم القضاء"],
    meaningEn: "Let the days do as they will, and be at ease when the decree is passed.",
    attribution: "attributed",
    attributionAr: "يُنسب إلى الإمام الشافعي",
    attributionEn: "Attributed to Imam al-Shafi'i",
    comments: [
      ["encouragement", "طِب نفسًا بما قضى الله؛ فالقلق لا يغيّر القدر.", "Be at ease with what Allah decrees; worry does not change destiny."],
      ["reflection", "دَع الأيام تمضي بما فيها، وتمسّك أنت بالرضا.", "Let the days pass with what they hold, and hold on to contentment."],
    ],
  }),
  // Added 2026-10-16 — Pending Review.
  poem({
    id: "tarafa-ayyam",
    verses: ["ستبدي لك الأيام ما كنت جاهلا … ويأتيك بالأخبار من لم تزود"],
    meaningEn: "Days will reveal to you what you did not know, and news will come to you from one you never sent to bring it.",
    attribution: "established",
    attributionAr: "طرفة بن العبد — من معلّقته",
    attributionEn: "Tarafa ibn al-'Abd — from his Mu'allaqa",
    checkedAgainst: "Arabic Wikisource — the poem's own page («معلقة طرفة بن العبد»), which names طرفة بن العبد as its poet (checked 2026-10-16)",
    comments: [
      ["reflection", "الأيام معلّمة؛ وما يخفى اليوم قد يتّضح غدًا.", "Days are teachers; what is hidden today may be clear tomorrow."],
      ["practice", "تمهّل في الحكم على أمرٍ لم تتّضح لك كل جوانبه.", "Hold off judging a matter until you can see all of it."],
    ],
  }),
  poem({
    id: "zuhayr-maruf",
    verses: ["ومن يجعل المعروف من دون عرضه … يفره ومن لا يتق الشتم يشتم"],
    meaningEn: "Whoever makes kindness a shield for his honour keeps it whole; whoever does not guard against insult is insulted.",
    attribution: "established",
    attributionAr: "زهير بن أبي سلمى — من معلّقته",
    attributionEn: "Zuhayr ibn Abi Sulma — from his Mu'allaqa",
    checkedAgainst: "Arabic Wikisource — the poem's own page («معلقة زهير بن أبي سلمى»), which names زهير بن أبي سلمى as its poet (checked 2026-10-16)",
    comments: [
      ["meaning", "المعروف يصون صاحبه؛ والكرم وقايةٌ للعِرض.", "Kindness protects the one who does it; generosity guards one's honour."],
      ["practice", "قدّم اليوم معروفًا دون أن تنتظر مقابلًا.", "Do someone a kindness today without expecting anything back."],
    ],
  }),
  poem({
    id: "mutanabbi-nujum",
    verses: ["إذا غامرت في شرف مروم … فلا تقنع بما دون النجوم"],
    meaningEn: "If you venture after a hard-won honour, do not settle for anything below the stars.",
    attribution: "established",
    attributionAr: "أبو الطيب المتنبي",
    attributionEn: "Abu al-Tayyib al-Mutanabbi",
    checkedAgainst: "Arabic Wikisource — the poem's own page («إذا غامرت في شرف مروم»), which names المتنبي as its poet (checked 2026-10-16)",
    comments: [
      ["encouragement", "إذا سعيت إلى خير، فاجعل همّتك عالية.", "When you strive for good, aim high."],
      ["reflection", "علوّ الهمّة في الخير لا يتعارض مع التواضع.", "High aspiration in goodness sits well with humility."],
    ],
  }),
];

// ---- Comments for existing content ----------------------------------------
// The written library's duas and the dhikr virtues used to share ONE comment
// per kind (every dua followed by the same line). Now each dua category and
// each dhikr theme has several, in different styles.

export type DuaCommentGroup = Extract<MiscCategoryKey, "comprehensive" | "istighfar" | "protection" | "distress" | "family" | "quran" | "guidance" | "debtRizq" | "prayer"> | "general";

export const DUA_CATEGORY_COMMENTS: Readonly<Record<DuaCommentGroup, EditorialComment[]>> = {
  comprehensive: comments("dua-cat:comprehensive", [
    ["meaning", "الأدعية الجامعة تختصر حاجاتك الكثيرة في كلماتٍ قليلة؛ ادعُ بها وأنت تستحضر ما يهمّك.", "Comprehensive duas gather your many needs into few words; say them while bringing to mind what matters to you."],
    ["practice", "لا تستعجل الكلمات؛ قف عند كل جملةٍ كأنها طلبٌ مستقل.", "Don't rush the words; pause at each phrase as if it were its own request."],
    ["reminder", "دعاءٌ يصلح لكل يوم؛ اجعله من كلماتك الثابتة.", "A dua that suits any day; make it one of your steady words."],
    ["reflection", "اجمع في دعائك بين حاجات يومك وما ترجوه لآخرتك؛ فكلاهما يُسأل من الله.", "Bring together in your dua the needs of your day and your hopes for the Hereafter; both are asked of Allah."],
  ]),
  istighfar: comments("dua-cat:istighfar", [
    ["reflection", "طلب المغفرة ليس لحظة ندمٍ فقط، بل عهدٌ هادئ بأن تكون غدًا أفضل.", "Asking forgiveness isn't only a moment of regret, but a quiet promise to be better tomorrow."],
    ["practice", "اقرأه ببطء، واستحضر بين كلماته أمرًا تحب أن يغفره الله لك.", "Read it slowly, and between its words recall something you hope Allah will forgive."],
    ["encouragement", "مهما تكرّر التقصير، يبقى طلب المغفرة بابًا مفتوحًا.", "However often we fall short, asking forgiveness remains an open door."],
    ["meaning", "الاستغفار يخفّف عن القلب ما لا يراه الناس.", "Seeking forgiveness lightens what people cannot see in the heart."],
  ]),
  protection: comments("dua-cat:protection", [
    ["meaning", "أدعية التحصين تذكّرك بأن الحفظ بيد الله، فتمضي في يومك بقلبٍ مطمئن.", "Duas of protection remind you that safekeeping is in Allah's hands, so you go through your day with a settled heart."],
    ["practice", "قلها وأنت موقنٌ بمعناها؛ فاليقين روح الدعاء.", "Say it with certainty in its meaning; certainty is the soul of dua."],
    ["reminder", "اجعل لهذا الدعاء موعدًا ثابتًا من يومك، حتى يصبح جزءًا منه.", "Give this dua a fixed time in your day, until it becomes part of it."],
    ["reflection", "الاستعاذة بالله ليست خوفًا، بل لجوءٌ إلى القوي حين تشعر بضعفك.", "Seeking refuge in Allah isn't fear; it is turning to the Strong when you feel weak."],
  ]),
  distress: comments("dua-cat:distress", [
    ["encouragement", "حين يثقل الهم، فالدعاء أول ما يُقال، لا آخر ما يُحاوَل.", "When worry weighs heavy, dua is the first thing said, not the last thing tried."],
    ["practice", "ردّد هذا الدعاء بهدوء، ودَع أنفاسك تتباطأ مع كلماته.", "Repeat this dua calmly, and let your breathing slow with its words."],
    ["reflection", "ليس مطلوبًا أن تكون قويًّا طوال الوقت؛ يكفي أن تعرف إلى من تلجأ.", "You don't have to be strong all the time; it's enough to know whom to turn to."],
    ["reminder", "الضيق لا يدوم، والدعاء يصحبك حتى ينفرج.", "Hardship doesn't last, and dua keeps you company until it lifts."],
  ]),
  family: comments("dua-cat:family", [
    ["practice", "الدعاء للأهل برٌّ لا يراه أحد؛ اذكرهم بأسمائهم في دعائك.", "Praying for family is kindness no one sees; mention them by name in your dua."],
    ["reflection", "ما تتمناه لبيتك من سكينة، اطلبه من الله أولًا.", "Whatever calm you wish for your home, ask Allah for it first."],
    ["encouragement", "ادعُ لأهلك اليوم، ثم كن جزءًا من استجابة دعائك بلطفك معهم.", "Pray for your family today, then be part of its answer through your gentleness with them."],
    ["meaning", "البيوت تُبنى بالمودّة، وتُحفظ بالدعاء.", "Homes are built with affection and kept with prayer."],
  ]),
  quran: comments("dua-cat:quran", [
    ["meaning", "هذا دعاءٌ علّمنا إياه القرآن؛ فادعُ به بلسانك وقلبك معًا.", "This dua is taught by the Qur'an; say it with your tongue and heart together."],
    ["reflection", "تأمّل كلمات أدعية القرآن: قصيرة، لكنها تحمل حاجات العمر.", "Notice the words of Qur'anic duas: short, yet holding a lifetime of needs."],
    ["practice", "اقرأ الآية التي ورد فيها هذا الدعاء؛ فسياقها يعمّق معناه في قلبك.", "Read the verse this dua comes from; its context deepens its meaning in your heart."],
    ["reminder", "ادعُ به بعد صلاتك، بخشوعٍ وطمأنينة.", "Say it after your prayer, with humility and calm."],
  ]),
  guidance: comments("dua-cat:guidance", [
    ["meaning", "الهداية ليست مرةً واحدة؛ نحتاجها كل يوم، ولذلك نسألها دائمًا.", "Guidance isn't a single moment; we need it every day, so we keep asking."],
    ["practice", "اسأل الله الثبات وأنت في حال القوة، كما تسأله في حال الضعف.", "Ask Allah for steadfastness when you feel strong, as you do when you feel weak."],
    ["reflection", "القلوب تتقلّب، والدعاء يمسكها على الطريق.", "Hearts turn, and dua holds them to the path."],
    ["encouragement", "إن ترددت في قرار، فابدأ بدعاء الهداية، ثم اختر بقلبٍ مطمئن.", "If you hesitate over a decision, begin with a dua for guidance, then choose with a settled heart."],
  ]),
  debtRizq: comments("dua-cat:debtRizq", [
    ["meaning", "الرزق مقسوم، والسعي مطلوب، والدعاء يجمع بينهما في قلبٍ مطمئن.", "Provision is apportioned, effort is asked of you, and dua joins the two in a settled heart."],
    ["practice", "ادعُ بهذا الدعاء ثم خذ بالأسباب؛ فالتوكل عملٌ لا انتظار.", "Say this dua, then take the means; reliance is action, not waiting."],
    ["encouragement", "ضيق المال يُتعب، لكنه لا يُغلق أبواب السماء.", "Financial strain is tiring, but it doesn't close the doors of the heavens."],
    ["reflection", "اطلب من الله الكفاية والبركة؛ فالقليل المبارك يكفي.", "Ask Allah for sufficiency and blessing; a little that is blessed is enough."],
  ]),
  prayer: comments("dua-cat:prayer", [
    ["meaning", "دعاءٌ يطلب العون على العبادة نفسها؛ فحتى الطاعة تحتاج توفيقًا من الله.", "A dua asking help for worship itself; even obedience needs Allah's enabling."],
    ["practice", "اجعل هذا الدعاء خاتمةً هادئة لصلاتك.", "Make this dua a calm close to your prayer."],
    ["reflection", "ادعُ به وأنت تستحضر صلاتك القادمة: كيف تحب أن تكون؟", "Say it while picturing your next prayer: how would you like it to be?"],
  ]),
  general: comments("dua-cat:general", [
    ["reflection", "ادعُ بقلبٍ حاضر؛ فالكلمات القليلة مع الحضور أصدق.", "Pray with a present heart; few words with presence are truer."],
    ["practice", "كرّر هذا الدعاء اليوم في لحظة هدوء.", "Repeat this dua today in a quiet moment."],
    ["encouragement", "لا يتعب من يسأل الله؛ فهو يحب أن يُسأل.", "Whoever asks of Allah never tires Him; He loves to be asked."],
  ]),
};

/** Several short comments per dhikr theme — chosen in turn, not the same one every time. */
export const DHIKR_THEME_COMMENTS: Readonly<Record<ReflectionTheme, EditorialComment[]>> = {
  hamd: comments("theme:hamd", [
    ["reflection", "الحمد ليس للنعمة الكبيرة وحدها؛ هو انتباهٌ لتفاصيل صغيرة تمرّ بها كل يوم.", "Praise isn't only for the big blessings; it's noticing the small ones you pass every day."],
    ["practice", "سمِّ الآن ثلاث نِعَمٍ في يومك، وقل بعد كلٍّ منها: الحمد لله.", "Name three blessings in your day right now, and say Alhamdulillah after each."],
    ["meaning", "الحمد ثناءٌ مع محبة؛ تحمد ربك لأنه أهلٌ للحمد، لا لأنك أخذت فقط.", "Hamd is praise joined with love: you praise your Lord because He is worthy of it, not only because you received."],
    ["encouragement", "حتى في يومٍ متعب، يبقى في القلب مكانٌ لكلمةٍ تطمئنه: الحمد لله.", "Even on a tiring day, the heart keeps room for a word that settles it: Alhamdulillah."],
    ["reminder", "قبل أن تنام الليلة، اجعل آخر ما تقوله حمدًا على يومٍ مضى بما فيه.", "Before you sleep tonight, let your last words be praise for the day that passed, with all it held."],
  ]),
  tasbih: comments("theme:tasbih", [
    ["meaning", "سبحان الله: تنزيهٌ لله عمّا لا يليق به، وراحةٌ لقلبٍ يعلم أن ربه لا يظلم ولا ينسى.", "SubhanAllah declares Allah above all that does not befit Him — rest for a heart that knows its Lord neither wrongs nor forgets."],
    ["practice", "في طريقك اليوم، اجعل كل منظرٍ جميل سببًا لتسبيحةٍ هادئة.", "On your way today, let every beautiful sight become a reason for a quiet SubhanAllah."],
    ["reflection", "التسبيح لا يحتاج وقتًا خاصًّا؛ لحظة انتظار تكفي لتملأها بذكرٍ خفيف.", "Tasbih needs no special time; a moment of waiting is enough to fill with light remembrance."],
    ["encouragement", "كلماتٌ يسيرة على اللسان، تفتح في القلب نافذةً على عظمة الخالق.", "Easy words on the tongue that open a window in the heart onto the Creator's greatness."],
    ["reminder", "اجعل لتسبيحك نصيبًا من صباحك ومسائك؛ فالقليل الدائم أثبت في القلب.", "Give your tasbih a share of your morning and evening; a little, kept up, settles deeper in the heart."],
  ]),
  istighfar: comments("theme:istighfar", [
    ["meaning", "الاستغفار طلبُ الستر والتجاوز؛ تعترف فيه بضعفك، وتثق بسعة رحمة ربك.", "Istighfar is asking to be covered and pardoned: admitting your weakness and trusting your Lord's vast mercy."],
    ["encouragement", "باب الاستغفار لا يُغلق في وجه أحد؛ عُد إليه كلما شعرت بثقل.", "The door of istighfar is closed to no one; return to it whenever you feel weighed down."],
    ["practice", "اجعل لك استغفارًا ثابتًا بعد كل صلاة، ولو مراتٍ قليلة بحضور قلب.", "Keep a steady istighfar after each prayer, even a few times with a present heart."],
    ["reflection", "الاستغفار لا يعني أنك سيئ، بل أنك ما زلت تريد أن تكون أقرب.", "Seeking forgiveness doesn't mean you are bad; it means you still want to be closer."],
    ["reminder", "إن ضاق صدرك اليوم، فابدأ بالاستغفار قبل أي شيءٍ آخر.", "If your chest feels tight today, begin with istighfar before anything else."],
  ]),
  takbir: comments("theme:takbir", [
    ["practice", "إذا عظُم أمرٌ في عينك، فكبّر؛ تعود الأشياء إلى حجمها الحقيقي.", "When something looms large, say Allahu Akbar; things return to their true size."],
    ["meaning", "التكبير ليس صوتًا مرتفعًا فقط، بل يقينٌ هادئ بأن الله أكبر من كل شيء.", "Takbir isn't only a raised voice; it is a quiet certainty that Allah is greater than everything."],
    ["reflection", "كل تكبيرةٍ في الصلاة دعوةٌ لأن تترك ما في يدك وتُقبل بقلبك.", "Every takbir in prayer invites you to set down what's in your hands and turn with your heart."],
    ["encouragement", "ابدأ عملك الصعب بتكبيرةٍ واثقة، ثم امضِ مطمئنًّا.", "Begin a hard task with a confident takbir, then go on with a settled heart."],
    ["reminder", "كلما رأيت عظمةً في الخلق، تذكّر أن خالقها أكبر.", "Whenever you see greatness in creation, remember its Creator is greater."],
  ]),
  salawat: comments("theme:salawat", [
    ["meaning", "صلاتك على النبي ﷺ وفاءٌ لمن بلّغك الهدى.", "Sending blessings on the Prophet ﷺ is loyalty to the one who brought you guidance."],
    ["practice", "اجعل للصلاة على النبي ﷺ نصيبًا من يومك، خاصةً حين يُذكر اسمه.", "Give salawat a share of your day, especially whenever his name ﷺ is mentioned."],
    ["reflection", "من أحبّ أحدًا أكثر من ذكره؛ والصلاة على النبي ﷺ لغة هذه المحبة.", "Whoever loves someone mentions them often; salawat is the language of that love."],
    ["encouragement", "تعرّف اليوم على خُلُقٍ من أخلاقه ﷺ، وحاول أن تعيشه.", "Learn one of his ﷺ traits today, and try to live it."],
    ["reminder", "صلِّ عليه ﷺ وأنت تستحضر رحمته بأمته؛ فالذكر يحيا بالمعنى.", "Send blessings on him ﷺ while recalling his mercy to his community; remembrance comes alive through meaning."],
  ]),
  tahlil: comments("theme:tahlil", [
    ["meaning", "لا إله إلا الله: أن يكون الله وحده المقصود، فيخفّ عن قلبك ثقل إرضاء الجميع.", "La ilaha illa Allah: Allah alone is the One you seek — lifting from your heart the weight of pleasing everyone."],
    ["reflection", "كلمة التوحيد تبدأ بنفيٍ وتنتهي بإثبات؛ تُخلي القلب ثم تملؤه بالله.", "The word of Tawhid begins with a negation and ends with an affirmation: it empties the heart, then fills it with Allah."],
    ["practice", "جدّد بها إيمانك في لحظة هدوء، كأنك تقولها أول مرة.", "Renew your faith with it in a quiet moment, as if saying it for the first time."],
    ["encouragement", "حين يتعلّق قلبك بشيءٍ أكثر مما ينبغي، ردّدها ودَع قلبك يعود إلى مركزه.", "When your heart clings to something more than it should, repeat it and let your heart return to its center."],
    ["reminder", "هي الكلمة التي تجمع شتات اليوم: وجهةٌ واحدة، وربٌّ واحد.", "It is the word that gathers a scattered day: one direction, one Lord."],
  ]),
  hawqala: comments("theme:hawqala", [
    ["meaning", "لا حول ولا قوة إلا بالله: اعترافٌ بأن قوتك عطاء، فتعمل وأنت مطمئن.", "La hawla wa la quwwata illa billah: an admission that your strength is a gift, so you work at peace."],
    ["practice", "قلها قبل مهمةٍ تبدو أكبر منك، ثم ابدأ بالخطوة الأولى.", "Say it before a task that seems bigger than you, then take the first step."],
    ["encouragement", "حين تتعب من المحاولة، تذكّر أن التوفيق ليس من جهدك وحده.", "When trying wears you out, remember that success isn't from your effort alone."],
    ["reflection", "كلمةٌ تنقلك من الاعتماد على نفسك إلى الاعتماد على ربك، دون أن تترك السعي.", "A phrase that moves you from relying on yourself to relying on your Lord — without leaving the effort."],
    ["reminder", "في لحظة عجز، لا تيأس؛ قلها، ودَع الأمر يتّسع.", "In a moment of helplessness, don't despair; say it, and let the matter widen."],
  ]),
  dua: comments("theme:dua", [
    ["meaning", "الدعاء حديثٌ صادقٌ بينك وبين ربك بلا واسطة.", "Dua is a sincere conversation between you and your Lord, with no intermediary."],
    ["practice", "اطلب من الله ما يهمّك اليوم، صغيرًا كان أو كبيرًا.", "Ask Allah today for what matters to you, small or great."],
    ["encouragement", "هو القريب الذي يسمع؛ فلا تتردد في السؤال.", "He is near and He hears; don't hesitate to ask."],
  ]),
};

/** The labelled DITHAR reflection a library Hadith already has, as a comment (its «ومضة دِثار:» label is shown separately). */
export function stripReflectionLabel(text: string, language: Language): string {
  const label = language === "ar" ? /^\s*ومضة دِثار\s*[:：]\s*/ : /^\s*DITHAR reflection\s*:\s*/i;
  return text.replace(label, "").trim();
}
