// "الأذكار والأدعية المنوعة" — Dithar Library.
//
// SOURCE OF TRUTH: ASSETS/dithar_master_content_library.md (the "Master
// Content Library"). That file is itself an editorial DRAFT explicitly
// marked "النسخة المرجعية الأولية المعتمدة للمراجعة النهائية" (initial
// reference version, pending final review) — its own closing section
// ("قرار المحتوى") states no item may enter production until its full
// text + occasion + count (if established) + narrator + source +
// hadith/verse number + grade are ALL complete. Per that same file's rule
// and this feature's explicit content-safety requirement, this file
// includes ONLY entries that are already fully specified there — every
// entry marked with a pending/incomplete status line (e.g. "الحالة: قيد
// المراجعة النهائية", "يُستكمل توثيق اللفظ..."، "تثبيت... قبل الإنتاج"),
// or that has no actual dua text at all, is deliberately OMITTED here
// rather than completed from memory or upgraded to a stronger grade than
// stated. See the end-of-task report for the exact list of what was
// excluded and why.
//
// No wording, count, narrator, source, or grade below was invented —
// every field is copied verbatim from the Master Content Library (or, for
// the two Home-category duas noted below, from this app's own existing,
// already-verified `misc-*` entries in written-adhkar.ts, which predate
// this file and are not duplicated here).
//
// Multi-category content (per the Master file's own explicit rule: "لا
// نكرر النص نفسه داخل قاعدة البيانات لمجرد أنه يظهر في أكثر من باب") is
// represented as ONE record with a `categories` array — never a duplicated
// text record per category.

export type MiscCategoryKey =
  | "comprehensive"
  | "istighfar"
  | "protection"
  | "distress"
  | "healing"
  | "deceased"
  | "family"
  | "travel"
  | "home"
  | "mosque"
  | "food"
  | "gatherings"
  | "weather"
  | "quran"
  | "prayer"
  | "authenticRare";

export interface MiscCategoryMeta {
  key: MiscCategoryKey;
  title_ar: string;
  subtitle_ar: string;
}

// Display order — follows the Master Content Library's own section order
// (1 through 16), which is itself a deliberate curatorial sequence
// (comprehensive duas first, the editorial "صحيح مهجور" section last).
export const MISC_CATEGORY_ORDER: MiscCategoryKey[] = [
  "comprehensive",
  "istighfar",
  "protection",
  "distress",
  "healing",
  "deceased",
  "family",
  "travel",
  "home",
  "mosque",
  "food",
  "gatherings",
  "weather",
  "quran",
  "prayer",
  "authenticRare",
];

export const MISC_CATEGORIES: Record<MiscCategoryKey, MiscCategoryMeta> = {
  comprehensive: { key: "comprehensive", title_ar: "أدعية جامعة", subtitle_ar: "أدعية ثابتة واسعة المعنى" },
  istighfar: { key: "istighfar", title_ar: "الاستغفار والتوبة", subtitle_ar: "أدعية طلب المغفرة والرجوع إلى الله" },
  protection: { key: "protection", title_ar: "الحفظ والاستعاذة", subtitle_ar: "أدعية الحماية واللجوء إلى الله" },
  distress: { key: "distress", title_ar: "الكرب والهم", subtitle_ar: "أدعية عند الضيق والشدة والحزن" },
  healing: { key: "healing", title_ar: "المرض والشفاء", subtitle_ar: "أدعية الرقية وعيادة المريض" },
  deceased: { key: "deceased", title_ar: "الميت والجنائز", subtitle_ar: "أدعية ثابتة للميت وعند المصيبة" },
  family: { key: "family", title_ar: "الأسرة والذرية", subtitle_ar: "أدعية الزواج والأبناء" },
  travel: { key: "travel", title_ar: "السفر والركوب", subtitle_ar: "أدعية الركوب والسفر والعودة" },
  home: { key: "home", title_ar: "المنزل والحياة اليومية", subtitle_ar: "أدعية الخروج والدخول والنوم" },
  mosque: { key: "mosque", title_ar: "المسجد والأذان", subtitle_ar: "أدعية الوضوء ودخول المسجد والأذان" },
  food: { key: "food", title_ar: "الطعام والشراب", subtitle_ar: "أدعية قبل الطعام وبعده" },
  gatherings: { key: "gatherings", title_ar: "السلام والمجالس", subtitle_ar: "أدعية المجالس والعطاس" },
  weather: { key: "weather", title_ar: "المطر والظواهر الكونية", subtitle_ar: "أدعية الريح والمطر" },
  quran: { key: "quran", title_ar: "أدعية القرآن", subtitle_ar: "أدعية ثابتة من كتاب الله" },
  prayer: { key: "prayer", title_ar: "أدعية الصلاة", subtitle_ar: "أذكار داخل الصلاة نفسها" },
  authenticRare: { key: "authenticRare", title_ar: "صحيح مهجور", subtitle_ar: "أذكار صحيحة قلّ انتشارها" },
};

export interface MiscDuaItem {
  id: string;
  text_ar: string;
  /** Display string exactly as the Master file states it — a count, or "بدون عدد محدد" when none is established. Omitted only for the handful of prayer-position phrases with no separate count field at all. */
  count_ar?: string;
  narrator_ar?: string;
  /**
   * Short takhrij/source line, ready to display as-is. Optional ONLY for
   * "ruku"/"sujud"/"between-sajdatayn" — the Master file gives no separate
   * citation for these three basic in-prayer phrases at all; rather than
   * invent one, the card simply omits the source line for them.
   */
  source_ar?: string;
  isQuranic?: boolean;
  categories: MiscCategoryKey[];
}

export const MISC_DUAS: MiscDuaItem[] = [
  // ---- 1. أدعية جامعة ----
  {
    id: "rabbana-atina",
    text_ar: "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.",
    count_ar: "بدون عدد محدد",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 201",
    isQuranic: true,
    categories: ["comprehensive", "quran"],
  },
  {
    id: "allahumma-inni-asaluka-alhuda",
    text_ar: "اللهم إني أسألك الهدى والتقى والعفاف والغنى.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (2721)",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-ighfir-li-warhamni",
    text_ar: "اللهم اغفر لي وارحمني واهدني وعافني وارزقني.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-ihdini-wasaddidni",
    text_ar: "اللهم اهدني وسددني.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-aslih-li-dini",
    text_ar:
      "اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادة لي في كل خير، واجعل الموت راحة لي من كل شر.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم",
    categories: ["comprehensive"],
  },

  // ---- 2. الاستغفار والتوبة ----
  {
    id: "sayyid-al-istighfar",
    text_ar:
      "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.",
    count_ar: "حسب سياق الحديث، وليس عددًا يوميًا عامًا",
    narrator_ar: "شداد بن أوس رضي الله عنه",
    source_ar: "صحيح البخاري (6306) — عن شداد بن أوس رضي الله عنه",
    categories: ["istighfar", "comprehensive"],
  },
  {
    id: "rabbi-ighfir-li-watub-alayya",
    text_ar: "رب اغفر لي وتب علي إنك أنت التواب الرحيم.",
    count_ar: "ورد في سياق الإكثار في المجلس، وليس عددًا يوميًا مطلقًا",
    narrator_ar: "عبد الله بن عمر رضي الله عنهما",
    source_ar: "أبو داود (1516)، والترمذي (3434)، وابن ماجه (3814) — عن عبد الله بن عمر رضي الله عنهما",
    categories: ["istighfar"],
  },

  // ---- 3. الحفظ والاستعاذة ----
  // "أعوذ بكلمات الله التامات من شر ما خلق" appears in the Master file
  // under both this category (3.1) and "السفر والركوب" (8.5, "عند النزول
  // في مكان") with identical wording/source — one record, two categories.
  {
    id: "audhu-bikalimatillah-al-tammat",
    text_ar: "أعوذ بكلمات الله التامات من شر ما خلق.",
    count_ar: "بحسب المناسبة؛ لا يوضع له عدد عام",
    source_ar: "صحيح مسلم",
    categories: ["protection", "travel"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-al-ajz",
    text_ar: "اللهم إني أعوذ بك من العجز والكسل والجبن والهرم، وأعوذ بك من فتنة المحيا والممات، وأعوذ بك من عذاب القبر.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح البخاري وصحيح مسلم",
    categories: ["protection"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-jahd-al-bala",
    text_ar: "اللهم إني أعوذ بك من جهد البلاء، ودرك الشقاء، وسوء القضاء، وشماتة الأعداء.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح البخاري وصحيح مسلم",
    categories: ["protection"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-al-faqr",
    text_ar: "اللهم إني أعوذ بك من الفقر والقلة والذلة، وأعوذ بك من أن أَظلم أو أُظلم.",
    count_ar: "بدون عدد محدد",
    source_ar: "أبو داود والنسائي، وصححه جمع من أهل العلم",
    categories: ["protection"],
  },

  // ---- 4. الكرب والهم والحزن والغضب والوسوسة ----
  {
    id: "dua-al-karb",
    text_ar:
      "لا إله إلا الله العظيم الحليم، لا إله إلا الله رب العرش العظيم، لا إله إلا الله رب السماوات ورب الأرض ورب العرش الكريم.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عبد الله بن عباس رضي الله عنهما",
    source_ar: "صحيح البخاري وصحيح مسلم — عن عبد الله بن عباس رضي الله عنهما",
    categories: ["distress"],
  },
  // "لا إله إلا أنت سبحانك إني كنت من الظالمين" appears under both
  // "الكرب والهم" (4.2) and "أدعية القرآن" (14.9) — one record, two
  // categories.
  {
    id: "la-ilaha-illa-anta-subhanaka",
    text_ar: "لا إله إلا أنت سبحانك إني كنت من الظالمين.",
    count_ar: "بدون عدد محدد",
    source_ar: "القرآن الكريم — سورة الأنبياء، الآية 87",
    isQuranic: true,
    categories: ["distress", "quran"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-al-hamm",
    text_ar: "اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل، والجبن والبخل، وضلع الدين وغلبة الرجال.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح البخاري وصحيح مسلم",
    categories: ["distress"],
  },
  {
    id: "audhu-billahi-min-al-shaytan-al-rajim",
    text_ar: "أعوذ بالله من الشيطان الرجيم.",
    count_ar: "بحسب الحال، وليس عددًا عامًا",
    source_ar: "ثابت في السنة",
    categories: ["distress"],
  },

  // ---- 5. المرض والشفاء والرقية ----
  {
    id: "allahumma-rabb-al-nas-adhhib-al-bas",
    text_ar: "اللهم رب الناس، أذهب الباس، اشف أنت الشافي، لا شفاء إلا شفاؤك، شفاء لا يغادر سقمًا.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح البخاري وصحيح مسلم",
    categories: ["healing"],
  },
  {
    id: "bismillahi-arqik",
    text_ar: "باسم الله أرقيك، من كل شيء يؤذيك، من شر كل نفس أو عين حاسد، الله يشفيك، باسم الله أرقيك.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "أبو سعيد الخدري رضي الله عنه",
    source_ar: "صحيح مسلم (2186) — عن أبي سعيد الخدري رضي الله عنه",
    categories: ["healing"],
  },
  {
    id: "asalu-allah-al-adhim-an-yashfiyak",
    text_ar: "أسأل الله العظيم رب العرش العظيم أن يشفيك.",
    count_ar: "7 مرات عند عيادة المريض",
    source_ar: "أبو داود (3106)",
    categories: ["healing"],
  },
  {
    id: "la-bas-tahurun-inshallah",
    text_ar: "لا بأس، طهور إن شاء الله.",
    count_ar: "بلا عدد",
    source_ar: "صحيح البخاري",
    categories: ["healing"],
  },

  // ---- 6. الموت والميت والجنائز والعزاء والقبور ----
  {
    id: "dua-al-janaza",
    text_ar:
      "اللهم اغفر له وارحمه، وعافه واعف عنه، وأكرم نزله، ووسع مدخله، واغسله بالماء والثلج والبرد، ونقه من الخطايا كما نقيت الثوب الأبيض من الدنس، وأبدله دارًا خيرًا من داره، وأهلًا خيرًا من أهله، وزوجًا خيرًا من زوجه، وأدخله الجنة، وأعذه من عذاب القبر ومن عذاب النار.",
    count_ar: "بحسب الدعاء في صلاة الجنازة",
    narrator_ar: "عوف بن مالك رضي الله عنه",
    source_ar: "صحيح مسلم (963) — عن عوف بن مالك رضي الله عنه",
    categories: ["deceased"],
  },
  {
    id: "allahumma-ighfir-li-abi-salama",
    text_ar:
      "اللهم اغفر لأبي سلمة، وارفع درجته في المهديين، واخلفه في عقبه في الغابرين، واغفر لنا وله يا رب العالمين، وأفسح له في قبره، ونور له فيه.",
    source_ar: "صحيح مسلم",
    categories: ["deceased"],
  },
  {
    id: "inna-lillahi-wa-inna-ilayhi-rajiun",
    text_ar: "إنا لله وإنا إليه راجعون، اللهم أجرني في مصيبتي واخلف لي خيرًا منها.",
    source_ar: "صحيح مسلم",
    categories: ["deceased"],
  },

  // ---- 7. الأسرة والزواج والمولود والذرية ----
  {
    id: "bismillahi-allahumma-jannibna-al-shaytan",
    text_ar: "بسم الله، اللهم جنبنا الشيطان وجنب الشيطان ما رزقتنا.",
    count_ar: "مرة عند المناسبة",
    source_ar: "صحيح البخاري وصحيح مسلم",
    categories: ["family"],
  },
  // The following three appear identically in "أدعية القرآن" (14.10,
  // 14.11, 14.14) — one record each, tagged into both categories.
  {
    id: "rabbi-hab-li-min-ladunka-dhurriyyatan",
    text_ar: "رب هب لي من لدنك ذرية طيبة إنك سميع الدعاء.",
    source_ar: "القرآن الكريم — سورة آل عمران، الآية 38",
    isQuranic: true,
    categories: ["family", "quran"],
  },
  {
    id: "rabbi-ijalni-muqim-al-salah",
    text_ar: "رب اجعلني مقيم الصلاة ومن ذريتي ربنا وتقبل دعاء.",
    source_ar: "القرآن الكريم — سورة إبراهيم، الآية 40",
    isQuranic: true,
    categories: ["family", "quran"],
  },
  {
    id: "rabbana-hab-lana-min-azwajina",
    text_ar: "ربنا هب لنا من أزواجنا وذرياتنا قرة أعين واجعلنا للمتقين إمامًا.",
    source_ar: "القرآن الكريم — سورة الفرقان، الآية 74",
    isQuranic: true,
    categories: ["family", "quran"],
  },

  // ---- 8. السفر والركوب ----
  {
    id: "dua-al-rukub",
    text_ar: "سبحان الذي سخر لنا هذا وما كنا له مقرنين، وإنا إلى ربنا لمنقلبون.",
    source_ar: "ثابت في السنة، ضمن دعاء الركوب والسفر",
    categories: ["travel"],
  },
  {
    id: "ayibun-taibun-abidun",
    text_ar: "آيبون تائبون عابدون لربنا حامدون.",
    source_ar: "صحيح مسلم",
    categories: ["travel"],
  },

  // ---- 9. المنزل والحياة اليومية ----
  {
    id: "khuruj-min-al-manzil",
    text_ar: "بسم الله، توكلت على الله، ولا حول ولا قوة إلا بالله.",
    count_ar: "مرة عند الخروج",
    source_ar: "أبو داود (5095)، والترمذي (3426)، والنسائي؛ صححه الألباني",
    categories: ["home"],
  },
  // The following two have no equivalent in the Master Content Library —
  // they are this app's own PRE-EXISTING, already-verified entries (see
  // the `misc` array in written-adhkar.ts, ids "misc-5"/"misc-6"),
  // reused here verbatim rather than duplicated or invented, since the
  // Master file does not yet cover sleep-related Adhkar.
  {
    id: "before-sleeping",
    text_ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.",
    source_ar: "صحيح البخاري 6324",
    categories: ["home"],
  },
  {
    id: "upon-waking",
    text_ar: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ.",
    source_ar: "صحيح البخاري 6312",
    categories: ["home"],
  },
  // Reused from this app's existing verified "misc-4" entry (same dhikr
  // the Master file's own 11.3 marks as still pending final wording) —
  // preferring the already-sourced existing content over an unresolved
  // draft entry for the identical dua.
  {
    id: "after-eating",
    text_ar: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا، وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ.",
    source_ar: "سنن أبي داود والترمذي",
    categories: ["food"],
  },

  // ---- 10. الوضوء والمسجد والأذان والإقامة ----
  {
    id: "after-wudu",
    text_ar: "أشهد أن لا إله إلا الله وحده لا شريك له، وأشهد أن محمدًا عبده ورسوله.",
    count_ar: "مرة بعد الوضوء",
    source_ar: "صحيح مسلم",
    categories: ["mosque"],
  },
  {
    id: "entering-mosque",
    text_ar: "اللهم افتح لي أبواب رحمتك.",
    count_ar: "عند الدخول",
    source_ar: "صحيح مسلم",
    categories: ["mosque"],
  },
  {
    id: "leaving-mosque",
    text_ar: "اللهم إني أسألك من فضلك.",
    count_ar: "عند الخروج",
    source_ar: "صحيح مسلم",
    categories: ["mosque"],
  },
  {
    id: "after-adhan",
    text_ar:
      "اللهم رب هذه الدعوة التامة، والصلاة القائمة، آت محمدًا الوسيلة والفضيلة، وابعثه مقامًا محمودًا الذي وعدته.",
    source_ar: "صحيح البخاري",
    categories: ["mosque"],
  },

  // ---- 11. الطعام والشراب ----
  {
    id: "before-food",
    text_ar: "بسم الله.",
    count_ar: "مرة",
    source_ar: "ثابت في السنة",
    categories: ["food"],
  },
  {
    id: "forgot-tasmiyah",
    text_ar: "بسم الله أوله وآخره.",
    count_ar: "عند النسيان",
    source_ar: "الترمذي، وحسنه عدد من أهل العلم",
    categories: ["food"],
  },

  // ---- 12. السلام والمجالس والعطاس ----
  {
    id: "kaffarat-al-majlis",
    text_ar: "سبحانك اللهم وبحمدك، لا إله إلا أنت، أستغفرك وأتوب إليك.",
    source_ar: "السنن، وله طرق حكم عليها أهل العلم بالصحة/الحسن",
    categories: ["gatherings"],
  },
  {
    id: "sneezing-alhamdulillah",
    text_ar: "الحمد لله.",
    source_ar: "صحيح البخاري",
    categories: ["gatherings"],
  },
  {
    id: "yarhamuk-allah",
    text_ar: "يرحمك الله.",
    source_ar: "صحيح البخاري",
    categories: ["gatherings"],
  },
  {
    id: "yahdikum-allah",
    text_ar: "يهديكم الله ويصلح بالكم.",
    source_ar: "صحيح البخاري",
    categories: ["gatherings"],
  },

  // ---- 13. المطر والريح والرعد والظواهر الكونية ----
  {
    id: "when-wind-blows",
    text_ar:
      "اللهم إني أسألك خيرها، وخير ما فيها، وخير ما أرسلت به، وأعوذ بك من شرها، وشر ما فيها، وشر ما أرسلت به.",
    narrator_ar: "عائشة رضي الله عنها",
    source_ar: "صحيح البخاري ومسلم — عن عائشة رضي الله عنها",
    categories: ["weather"],
  },

  // ---- 14. أدعية القرآن (unique verses only — the ones shared with other
  // categories are listed once, above, already tagged "quran") ----
  {
    id: "rabbana-la-tuakhidhna",
    text_ar: "ربنا لا تؤاخذنا إن نسينا أو أخطأنا.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-wala-tahmil-alayna-isran",
    text_ar: "ربنا ولا تحمل علينا إصرًا كما حملته على الذين من قبلنا.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-wala-tuhammilna",
    text_ar: "ربنا ولا تحملنا ما لا طاقة لنا به.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-dhalamna-anfusana",
    text_ar: "ربنا ظلمنا أنفسنا وإن لم تغفر لنا وترحمنا لنكونن من الخاسرين.",
    source_ar: "القرآن الكريم — سورة الأعراف، الآية 23",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-hab-lana-min-ladunka-rahmatan",
    text_ar: "ربنا هب لنا من لدنك رحمة وهيئ لنا من أمرنا رشدًا.",
    source_ar: "القرآن الكريم — سورة الكهف، الآية 10",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-ishrah-li-sadri",
    text_ar: "رب اشرح لي صدري ويسر لي أمري.",
    source_ar: "القرآن الكريم — سورة طه، الآيتان 25–26",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-zidni-ilman",
    text_ar: "رب زدني علمًا.",
    source_ar: "القرآن الكريم — سورة طه، الآية 114",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-ighfir-li-waliwalidayya",
    text_ar: "رب اغفر لي ولوالدي وللمؤمنين يوم يقوم الحساب.",
    source_ar: "القرآن الكريم — سورة إبراهيم، الآية 41",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-inni-lima-anzalta",
    text_ar: "رب إني لما أنزلت إلي من خير فقير.",
    source_ar: "القرآن الكريم — سورة القصص، الآية 24",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-afrigh-alayna-sabran-tawaffana",
    text_ar: "ربنا أفرغ علينا صبرًا وتوفنا مسلمين.",
    source_ar: "القرآن الكريم — سورة الأعراف، الآية 126",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-afrigh-alayna-sabran-thabbit",
    text_ar: "ربنا أفرغ علينا صبرًا وثبت أقدامنا وانصرنا على القوم الكافرين.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 250",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-la-tuzigh-qulubana",
    text_ar: "ربنا لا تزغ قلوبنا بعد إذ هديتنا وهب لنا من لدنك رحمة.",
    source_ar: "القرآن الكريم — سورة آل عمران، الآية 8",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-taqabbal-minna",
    text_ar: "ربنا تقبل منا إنك أنت السميع العليم.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 127",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-ighfir-lana-waliikhwanina",
    text_ar: "ربنا اغفر لنا ولإخواننا الذين سبقونا بالإيمان.",
    source_ar: "القرآن الكريم — سورة الحشر، الآية 10",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-alayka-tawakkalna",
    text_ar: "ربنا عليك توكلنا وإليك أنبنا وإليك المصير.",
    source_ar: "القرآن الكريم — سورة الممتحنة، الآية 4",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-atmim-lana-nurana",
    text_ar: "ربنا أتمم لنا نورنا واغفر لنا إنك على كل شيء قدير.",
    source_ar: "القرآن الكريم — سورة التحريم، الآية 8",
    isQuranic: true,
    categories: ["quran"],
  },

  // ---- 15. أدعية الصلاة (a separate chapter from post-prayer Adhkar,
  // per the Master file's own note: "هذا باب مستقل عما بعد الصلاة") ----
  {
    id: "istiftah",
    text_ar: "سبحانك اللهم وبحمدك، وتبارك اسمك، وتعالى جدك، ولا إله غيرك.",
    source_ar: "الأحاديث الصحيحة في الاستفتاح",
    categories: ["prayer"],
  },
  {
    id: "ruku",
    text_ar: "سبحان ربي العظيم.",
    categories: ["prayer"],
  },
  {
    id: "sujud",
    text_ar: "سبحان ربي الأعلى.",
    categories: ["prayer"],
  },
  {
    id: "between-sajdatayn",
    text_ar: "رب اغفر لي.",
    categories: ["prayer"],
  },
  {
    id: "before-salam-audhu",
    text_ar: "اللهم إني أعوذ بك من عذاب جهنم، ومن عذاب القبر، ومن فتنة المحيا والممات، ومن شر فتنة المسيح الدجال.",
    source_ar: "صحيح مسلم",
    categories: ["prayer"],
  },
  {
    id: "allahumma-aini-ala-dhikrik",
    text_ar: "اللهم أعني على ذكرك وشكرك وحسن عبادتك.",
    narrator_ar: "معاذ بن جبل رضي الله عنه",
    source_ar: "أبو داود (1522)، والنسائي، وابن خزيمة — عن معاذ بن جبل رضي الله عنه، صححه الألباني",
    categories: ["prayer"],
  },
];

// A small, FIXED editorial selection for the landing screen's "مختارات
// اليوم" strip — never randomly generated, always a hand-picked subset of
// the verified items above (per spec: "must select from verified Master
// Content items... No invented explanation"). Deliberately a short,
// unchanging list rather than a rotating/randomized one, since there is no
// existing mechanism in this app for a genuine "daily" rotation and
// inventing one was out of scope for this task.
export const MISC_FEATURED_IDS: string[] = ["sayyid-al-istighfar", "rabbana-atina", "dua-al-karb"];

// Interface strings for the new library screens — Arabic-only for this
// initial implementation (the Master Content Library itself, and every
// example label/subtitle in this feature's own spec, is Arabic-only; no
// English translation of this new content exists yet). Rendered regardless
// of the app's global language toggle — see MiscLibraryScreen's own note.
export const miscLibraryLabels = {
  screenTitle: "الأذكار والأدعية",
  screenSubtitle: "أدعية وأذكار ثابتة من القرآن والسنة",
  searchPlaceholder: "ابحث في المكتبة...",
  searchAria: "بحث في الأذكار والأدعية",
  noResults: "لا توجد نتائج مطابقة",
  featuredTitle: "مختارات اليوم",
  itemsCount: (n: number) => `${n} ${n === 1 ? "دعاء" : "أدعية"}`,
  countLabel: "العدد",
  noSpecificCount: "بدون عدد محدد",
  // The Master Content Library's own footer rules use two DIFFERENT labels
  // depending on the kind of source — "التخريج" for hadith takhrij,
  // "المصدر" for a Quranic citation (see MiscDuaItem.isQuranic) — never the
  // hadith-style label for a Quranic verse, per spec section 11.
  sourceLabelHadith: "التخريج",
  sourceLabelQuran: "المصدر",
  favoriteAria: "إضافة إلى المفضلة",
  unfavoriteAria: "إزالة من المفضلة",
  copyAria: "نسخ النص",
  copiedToast: "تم النسخ",
  comingSoon: "قريبًا",
  back: "رجوع",
};
