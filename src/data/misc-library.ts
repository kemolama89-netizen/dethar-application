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
// The Master file was later updated to add sections 17-20 (الاستخارة،
// قضاء الدين والرزق، الهداية والثبات، العبادة الموسمية) — integrated below
// using the same completeness rule as everything else in this file.
//
// 2026-08 sync: the Master file's "تحديث مراجعة الأدعية — 2026-08" pass
// completed several previously-pending entries (1.6, 1.7, 2.2, 3.2, 3.4,
// 3.5) and added 12 new fully-documented entries. All of those are
// integrated below, EXCEPT Master 3.10 ("اللهم احفظني بالإسلام قائمًا"),
// which stays excluded per this file's own completeness rule: its grade is
// disputed even by the single scholar who assessed it (Albani first graded
// it sahih in Silsilah Sahihah 1540, then later reclassified it da'if in
// Silsilah Da'ifah 6003) — not a settled grade, so it does not enter here.
//
import miscGeneralDuas from "../assets/illustrations/dithar-misc-general-duas.webp";
import miscIstighfarTaubah from "../assets/illustrations/dithar-misc-istighfar-taubah.webp";
import miscProtection from "../assets/illustrations/dithar-misc-protection.webp";
import miscDistress from "../assets/illustrations/dithar-misc-distress.webp";
import miscHealing from "../assets/illustrations/dithar-misc-healing.webp";
import miscFunerals from "../assets/illustrations/dithar-misc-funerals.webp";
import miscTravel from "../assets/illustrations/dithar-misc-travel.webp";
import miscHomeDailyLife from "../assets/illustrations/dithar-misc-home-daily-life.webp";
import miscRainCosmicPhenomena from "../assets/illustrations/dithar-misc-rain-cosmic-phenomena.webp";
import miscQuranicDuas from "../assets/illustrations/dithar-misc-quranic-duas.webp";
import miscSalahDuas from "../assets/illustrations/dithar-misc-salah-duas.webp";
import miscAuthenticHidden from "../assets/illustrations/dithar-misc-authentic-hidden.webp";
import miscFamilyProgeny from "../assets/illustrations/dithar-misc-family-progeny.webp";
import miscFoodDrink from "../assets/illustrations/dithar-misc-food-drink.webp";
import miscMosqueAdhan from "../assets/illustrations/dithar-misc-mosque-adhan.webp";
import miscPeaceGatherings from "../assets/illustrations/dithar-misc-peace-gatherings.webp";
import miscIstikhara from "../assets/illustrations/dithar-misc-istikhara.webp";
import miscDebtRizq from "../assets/illustrations/dithar-misc-debt-rizq.webp";
import miscGuidanceStability from "../assets/illustrations/dithar-misc-guidance-stability.webp";
import miscSeasonalWorship from "../assets/illustrations/dithar-misc-seasonal-worship.webp";

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
  | "authenticRare"
  | "istikharah"
  | "debtRizq"
  | "guidance"
  | "seasonal";

export interface MiscCategoryMeta {
  key: MiscCategoryKey;
  title_ar: string;
  subtitle_ar: string;
  /**
   * Category-card artwork (src/assets/illustrations/dithar-misc-*.webp —
   * re-encoded from the uploaded ASSETS/*.png source for file size; see
   * that directory's README for the full derivation chain). Optional so a
   * category can still fall back to its existing icon if a future
   * category ships with no matching asset yet.
   */
  image?: string;
}

// Display order — follows the Master Content Library's own section order
// (1 through 20), which is itself a deliberate curatorial sequence
// (comprehensive duas first, the editorial "صحيح مهجور" section marked as
// the deliberate visual close of the grid — see MiscLibraryScreen, which
// always renders it last regardless of its position in this array — with
// the four newly added sections 17-20 following it here in Master File
// numbering order).
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
  "istikharah",
  "debtRizq",
  "guidance",
  "seasonal",
];

export const MISC_CATEGORIES: Record<MiscCategoryKey, MiscCategoryMeta> = {
  comprehensive: {
    key: "comprehensive",
    title_ar: "أدعية جامعة",
    subtitle_ar: "أدعية ثابتة واسعة المعنى",
    image: miscGeneralDuas,
  },
  istighfar: {
    key: "istighfar",
    title_ar: "الاستغفار والتوبة",
    subtitle_ar: "أدعية طلب المغفرة والرجوع إلى الله",
    image: miscIstighfarTaubah,
  },
  protection: {
    key: "protection",
    title_ar: "الحفظ والاستعاذة",
    subtitle_ar: "أدعية الحماية واللجوء إلى الله",
    image: miscProtection,
  },
  distress: {
    key: "distress",
    title_ar: "الكرب والهم",
    subtitle_ar: "أدعية عند الضيق والشدة والحزن",
    image: miscDistress,
  },
  healing: {
    key: "healing",
    title_ar: "المرض والشفاء",
    subtitle_ar: "أدعية الرقية وعيادة المريض",
    image: miscHealing,
  },
  deceased: {
    key: "deceased",
    title_ar: "الميت والجنائز",
    subtitle_ar: "أدعية ثابتة للميت وعند المصيبة",
    image: miscFunerals,
  },
  family: {
    key: "family",
    title_ar: "الأسرة والذرية",
    subtitle_ar: "أدعية الزواج والأبناء",
    image: miscFamilyProgeny,
  },
  travel: {
    key: "travel",
    title_ar: "السفر والركوب",
    subtitle_ar: "أدعية الركوب والسفر والعودة",
    image: miscTravel,
  },
  home: {
    key: "home",
    title_ar: "المنزل والحياة اليومية",
    subtitle_ar: "أدعية الخروج والدخول والنوم",
    image: miscHomeDailyLife,
  },
  mosque: {
    key: "mosque",
    title_ar: "المسجد والأذان",
    subtitle_ar: "أدعية الوضوء ودخول المسجد والأذان",
    image: miscMosqueAdhan,
  },
  food: {
    key: "food",
    title_ar: "الطعام والشراب",
    subtitle_ar: "أدعية قبل الطعام وبعده",
    image: miscFoodDrink,
  },
  gatherings: {
    key: "gatherings",
    title_ar: "السلام والمجالس",
    subtitle_ar: "أدعية المجالس والعطاس",
    image: miscPeaceGatherings,
  },
  weather: {
    key: "weather",
    title_ar: "المطر والظواهر الكونية",
    subtitle_ar: "أدعية الريح والمطر",
    image: miscRainCosmicPhenomena,
  },
  quran: {
    key: "quran",
    title_ar: "أدعية القرآن",
    subtitle_ar: "أدعية ثابتة من كتاب الله",
    image: miscQuranicDuas,
  },
  prayer: {
    key: "prayer",
    title_ar: "أدعية الصلاة",
    subtitle_ar: "أذكار داخل الصلاة نفسها",
    image: miscSalahDuas,
  },
  authenticRare: {
    key: "authenticRare",
    title_ar: "صحيح مهجور",
    subtitle_ar: "أذكار صحيحة قلّ انتشارها",
    image: miscAuthenticHidden,
  },
  // Sections 17-20 — newly added to the Master Content Library.
  istikharah: {
    key: "istikharah",
    title_ar: "الاستخارة",
    subtitle_ar: "دعاء طلب الخِيَرة من الله عند التردد",
    image: miscIstikhara,
  },
  debtRizq: {
    key: "debtRizq",
    title_ar: "قضاء الدين والرزق",
    subtitle_ar: "أدعية تفريج الدين وسعة الرزق",
    image: miscDebtRizq,
  },
  guidance: {
    key: "guidance",
    title_ar: "الهداية والثبات",
    subtitle_ar: "أدعية الثبات على الحق وسلامة القلب",
    image: miscGuidanceStability,
  },
  seasonal: {
    key: "seasonal",
    title_ar: "العبادة الموسمية",
    subtitle_ar: "أذكار المواسم الثابتة كالصيام والحج",
    image: miscSeasonalWorship,
  },
};

// Proactively fetch every category-card image the instant this module
// loads — deliberately not gated by which tile is actually visible/near
// the viewport, so scrolling the category grid never hits a loading gap.
// This runs at module-evaluation time (before MiscLibraryScreen or
// MiscCategoryScreen even render), which is the earliest point in this
// module's own lifecycle — no separate startup hook needed. All 20 WebP
// files combined are already small after the earlier size optimization
// (tens of KB each, well under 1MB total), so requesting all of them at
// once costs far less than the visible per-card delay it removes; a
// throttled/batched fetch would only add complexity for no real benefit
// at this payload size. ES modules evaluate exactly once no matter how
// many places import this file, so this never re-runs on repeat
// navigation into the Misc screens — and the existing-link check makes it
// a no-op if the module is ever re-evaluated anyway (dev HMR).
if (typeof document !== "undefined") {
  Object.values(MISC_CATEGORIES)
    .map((meta) => meta.image)
    .filter((src): src is string => Boolean(src))
    .forEach((href) => {
      if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      document.head.appendChild(link);
    });
}

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
  /**
   * The Master file's "المناسبة" line, shown only when present — introduced
   * for the "العبادة الموسمية" (seasonal) category, section 20, where
   * several distinct occasions (fitr, laylat al-qadr, hajj) sit inside one
   * category card and the occasion is no longer implied by the category
   * itself the way it is everywhere else.
   */
  occasion_ar?: string;
  /**
   * A Master-file "ملاحظات" line surfaced verbatim only where it carries
   * information the user needs to perform the dua correctly (e.g. praying
   * two rakahs before istikharah) — not added retroactively to existing
   * entries whose notes are documentation-only.
   */
  note_ar?: string;
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
    // Also listed at Master file 20.3.3 — ثبت وروده بين الركن اليماني
    // والحجر الأسود في الطواف (أحمد والنسائي وابن خزيمة، عن عبد الله بن
    // السائب) — linked to "العبادة الموسمية" by category rather than
    // duplicated (20.3.3: "النص موجود أصلًا في 1.1").
    categories: ["comprehensive", "quran", "seasonal"],
  },
  {
    id: "allahumma-inni-asaluka-alhuda",
    text_ar: "اللهم إني أسألك الهدى والتقى والعفاف والغنى.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (2721)",
    // Also listed at Master file 19.2 under "الهداية والثبات" — same
    // record, linked by category rather than duplicated (per 19.2's own
    // note: "النص موجود أصلًا في 1.2؛ لا يُكرر في قاعدة البيانات").
    categories: ["comprehensive", "guidance"],
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
    // Also listed at Master file 19.4 under "الهداية والثبات" — linked by
    // category, not duplicated (19.4: "النص موجود أصلًا في 1.4").
    categories: ["comprehensive", "guidance"],
  },
  {
    id: "allahumma-aslih-li-dini",
    text_ar:
      "اللهم أصلح لي ديني الذي هو عصمة أمري، وأصلح لي دنياي التي فيها معاشي، وأصلح لي آخرتي التي فيها معادي، واجعل الحياة زيادة لي في كل خير، واجعل الموت راحة لي من كل شر.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-inni-asaluka-min-al-khayr-kullih",
    text_ar:
      "اللهم إني أسألك من الخير كله، عاجله وآجله، ما علمت منه وما لم أعلم، وأعوذ بك من الشر كله، عاجله وآجله، ما علمت منه وما لم أعلم، اللهم إني أسألك من خير ما سألك عبدك ونبيك، وأعوذ بك من شر ما عاذ به عبدك ونبيك، اللهم إني أسألك الجنة وما قرب إليها من قول أو عمل، وأعوذ بك من النار وما قرب إليها من قول أو عمل، وأسألك أن تجعل كل قضاء قضيته لي خيرًا.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عائشة رضي الله عنها",
    source_ar: "سنن ابن ماجه (3846) — عن عائشة رضي الله عنها، صححه الألباني في صحيح ابن ماجه",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah",
    text_ar:
      "اللهم إني أسألك العافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي، وآمن روعاتي، اللهم احفظني من بين يدي، ومن خلفي، وعن يميني، وعن شمالي، ومن فوقي، وأعوذ بعظمتك أن أُغتال من تحتي.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عبد الله بن عمر رضي الله عنهما",
    source_ar:
      "سنن أبي داود (5074)، وسنن ابن ماجه (3871)، ومسند أحمد (4785) — عن عبد الله بن عمر رضي الله عنهما، إسناده صحيح",
    note_ar:
      "الصيغة الشائعة «اللهم إني أسألك العفو والعافية في الدنيا والآخرة» دمج تقريبي غير حرفي لجملتين من هذا الحديث؛ اعتُمد هنا اللفظ الكامل كما ثبت.",
    categories: ["comprehensive"],
  },
  {
    id: "allahumma-iqsim-lana-min-khashyatik",
    text_ar:
      "اللهم اقسم لنا من خشيتك ما يحول بيننا وبين معاصيك، ومن طاعتك ما تبلغنا به جنتك، ومن اليقين ما تهون به علينا مصيبات الدنيا، ومتعنا بأسماعنا، وأبصارنا، وقوتنا ما أحييتنا، واجعله الوارث منا، واجعل ثأرنا على من ظلمنا، وانصرنا على من عادانا، ولا تجعل مصيبتنا في ديننا، ولا تجعل الدنيا أكبر همنا، ولا مبلغ علمنا، ولا تسلط علينا من لا يرحمنا.",
    count_ar: "بدون عدد محدد",
    source_ar: "جامع الترمذي (3502)، حسن عند الترمذي",
    categories: ["comprehensive", "distress"],
  },
  {
    id: "allahumma-bi-ilmika-al-ghayb",
    text_ar:
      "اللهم بعلمك الغيب، وقدرتك على الخلق، أحيني ما علمت الحياة خيرًا لي، وتوفني إذا علمت الوفاة خيرًا لي، اللهم إني أسألك خشيتك في الغيب والشهادة، وأسألك كلمة الحق في الرضا والغضب، وأسألك القصد في الفقر والغنى، وأسألك نعيمًا لا ينفد، وأسألك قرة عين لا تنقطع، وأسألك الرضا بعد القضاء، وأسألك برد العيش بعد الموت، وأسألك لذة النظر إلى وجهك، والشوق إلى لقائك، في غير ضراء مضرة ولا فتنة مضلة، اللهم زينا بزينة الإيمان واجعلنا هداة مهتدين.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عمار بن ياسر رضي الله عنه",
    source_ar: "سنن النسائي (1305)، ومسند أحمد (18351) — عن عمار بن ياسر رضي الله عنه، صححه الألباني",
    categories: ["comprehensive", "guidance"],
  },
  {
    id: "allahumma-inni-asaluka-al-thabat-fi-al-amr",
    text_ar:
      "اللهم إني أسألك الثبات في الأمر، والعزيمة على الرشد، وأسألك موجبات رحمتك، وعزائم مغفرتك، وأسألك شكر نعمتك، وحسن عبادتك، وأسألك قلبًا سليمًا، ولسانًا صادقًا، وأسألك من خير ما تعلم، وأعوذ بك من شر ما تعلم، وأستغفرك لما تعلم، إنك أنت علام الغيوب.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "شداد بن أوس رضي الله عنه",
    source_ar:
      "المعجم الكبير للطبراني، ومسند أحمد، وصحيح ابن حبان — عن شداد بن أوس رضي الله عنه، صححه الألباني في السلسلة الصحيحة (3228)",
    categories: ["comprehensive", "guidance"],
  },
  {
    id: "rabbi-aini-wala-tuin-alayya",
    text_ar:
      "رب أعني ولا تعن علي، وانصرني ولا تنصر علي، وامكر لي ولا تمكر علي، واهدني ويسر الهدى لي، وانصرني على من بغى علي، رب اجعلني لك شكّارًا، لك ذكّارًا، لك رهّابًا، لك مطواعًا، لك مخبتًا، إليك أواهًا منيبًا، رب تقبل توبتي، واغسل حوبتي، وأجب دعوتي، وثبت حجتي، وسدد لساني، واهد قلبي، واسلل سخيمة صدري.",
    count_ar: "بدون عدد محدد",
    source_ar: "جامع الترمذي (3551)، حسن صحيح عند الترمذي",
    categories: ["comprehensive", "istighfar", "guidance"],
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
  {
    id: "allahumma-ighfir-li-khatiati-wajahli",
    text_ar:
      "اللهم اغفر لي خطيئتي وجهلي، وإسرافي في أمري، وما أنت أعلم به مني، اللهم اغفر لي جدي وهزلي، وخطئي وعمدي، وكل ذلك عندي، اللهم اغفر لي ما قدمت وما أخرت، وما أسررت وما أعلنت، أنت المقدم وأنت المؤخر، وأنت على كل شيء قدير.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "أبو موسى الأشعري رضي الله عنه",
    source_ar: "صحيح البخاري (6398) وصحيح مسلم — عن أبي موسى الأشعري رضي الله عنه",
    categories: ["istighfar", "comprehensive"],
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
    text_ar:
      "اللهم إني أعوذ بك من العجز والكسل، والجبن والهرم، والبخل، وأعوذ بك من عذاب القبر، ومن فتنة المحيا والممات.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "أنس بن مالك رضي الله عنه",
    source_ar: "صحيح مسلم (2706) — عن أنس بن مالك رضي الله عنه",
    // Master 3.2 (2026-08 update): unified onto Sahih Muslim's fuller
    // wording (adds "والبخل") rather than Sahih al-Bukhari's shorter
    // parallel narration, per the Master file's own note there.
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
    narrator_ar: "أبو هريرة رضي الله عنه",
    source_ar:
      "سنن أبي داود (1544)، وسنن النسائي (5460، 5462) — عن أبي هريرة رضي الله عنه، صححه الألباني وابن حبان والحاكم",
    categories: ["protection"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-sharri-samee",
    text_ar: "اللهم إني أعوذ بك من شر سمعي، ومن شر بصري، ومن شر لساني، ومن شر قلبي، ومن شر منيي.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "شكل بن حميد رضي الله عنه",
    source_ar:
      "سنن أبي داود (1551)، وجامع الترمذي (3492)، وسنن النسائي (5444) — عن شكل بن حميد رضي الله عنه، صححه الألباني",
    categories: ["protection"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-sharri-ma-amiltu",
    text_ar: "اللهم إني أعوذ بك من شر ما عملت، ومن شر ما لم أعمل.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (2716)",
    categories: ["protection", "istighfar", "comprehensive"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-zawal-nimatik",
    text_ar: "اللهم إني أعوذ بك من زوال نعمتك، وتحول عافيتك، وفجاءة نقمتك، وجميع سخطك.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (2739)",
    categories: ["protection", "comprehensive"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-al-bukhl-wal-jubn",
    text_ar:
      "اللهم إني أعوذ بك من البخل، وأعوذ بك من الجبن، وأعوذ بك من أن نرد إلى أرذل العمر، وأعوذ بك من فتنة الدنيا، وعذاب القبر.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح البخاري",
    categories: ["protection"],
  },
  // Master 3.10 ("اللهم احفظني بالإسلام قائمًا") deliberately NOT included
  // here — see the file-header note: its grade is disputed even within
  // al-Albani's own assessments (sahih, later reclassified da'if).

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
    // Also listed at Master file 18.2 under "قضاء الدين والرزق" — linked
    // by category, not duplicated (18.2: "النص موجود أصلًا في 4.3").
    categories: ["distress", "debtRizq"],
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
    // Corrected to the complete ayah per the updated Master file's section
    // 19.3, which gives the full verse including "إنك أنت الوهاب" — the
    // previous text here (from section 14.17) stopped short of it. Per the
    // rule that a dua must be displayed once in full — never a partial
    // version in one place and the complete one elsewhere — this single
    // canonical record now carries the complete text and both categories.
    text_ar: "ربنا لا تزغ قلوبنا بعد إذ هديتنا وهب لنا من لدنك رحمة إنك أنت الوهاب.",
    source_ar: "القرآن الكريم — سورة آل عمران، الآية 8",
    isQuranic: true,
    categories: ["quran", "guidance"],
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
  {
    id: "allahumma-audhu-biridaka-min-sakhatik",
    text_ar:
      "اللهم أعوذ برضاك من سخطك، وبمعافاتك من عقوبتك، وأعوذ بك منك، لا أحصي ثناء عليك، أنت كما أثنيت على نفسك.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (486)",
    occasion_ar: "في السجود (ضمن سياق قيام الليل)",
    categories: ["prayer", "protection", "comprehensive"],
  },
  {
    id: "allahumma-inni-asaluka-fil-al-khayrat",
    text_ar:
      "اللهم إني أسألك فعل الخيرات، وترك المنكرات، وحب المساكين، وإذا أردت بعبادك فتنة فاقبضني إليك غير مفتون.",
    count_ar: "بدون عدد محدد",
    source_ar: "جامع الترمذي (3233)، وصححه الألباني لغيره في صحيح الترغيب (3192)",
    occasion_ar: "دعاء ورد في سياق الصلاة",
    categories: ["prayer", "comprehensive"],
  },
  {
    id: "allahumma-hasibni-hisaban-yasiran",
    text_ar: "اللهم حاسبني حسابًا يسيرًا.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عائشة رضي الله عنها",
    source_ar: "صحيح البخاري (6536) وصحيح مسلم (2876) — عن عائشة رضي الله عنها",
    note_ar:
      "مطلع الحديث الذي سألت فيه عائشة رضي الله عنها عن معنى «الحساب اليسير»، فأجابها النبي ﷺ: «أن يُنظر في كتابه فيُتجاوز عنه»؛ وردت الجملة ضمن سياق صلاته ﷺ.",
    categories: ["prayer"],
  },

  // ---- 17. الاستخارة (newly added to the Master Content Library) ----
  {
    id: "dua-al-istikharah",
    text_ar:
      "اللهم إني أستخيرك بعلمك، وأستقدرك بقدرتك، وأسألك من فضلك العظيم، فإنك تقدر ولا أقدر، وتعلم ولا أعلم، وأنت علام الغيوب، اللهم إن كنت تعلم أن هذا الأمر خير لي في ديني ومعاشي وعاقبة أمري - أو قال: في عاجل أمري وآجله - فاقدره لي ويسره لي، ثم بارك لي فيه، وإن كنت تعلم أن هذا الأمر شر لي في ديني ومعاشي وعاقبة أمري - أو قال: في عاجل أمري وآجله - فاصرفه عني واصرفني عنه، واقدر لي الخير حيث كان، ثم أرضني به.",
    count_ar: "مرة واحدة للدعاء بعد صلاة الاستخارة، دون تكرار عددي مخصوص ثابت للدعاء نفسه",
    narrator_ar: "جابر بن عبد الله رضي الله عنهما",
    source_ar: "صحيح البخاري (6382) — عن جابر بن عبد الله رضي الله عنهما",
    note_ar:
      "يسبق الدعاء صلاة ركعتين من غير الفريضة، كما في الحديث، ويستبدل المستخدم «هذا الأمر» بحاجته عند الدعاء، دون تغيير أصل النص.",
    categories: ["istikharah"],
  },

  // ---- 18. قضاء الدين والرزق (newly added) ----
  {
    id: "allahumma-inni-audhu-bika-min-al-matham-wal-maghram",
    text_ar: "اللهم إني أعوذ بك من المأثم والمغرم.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عائشة رضي الله عنها",
    source_ar: "صحيح البخاري (2397) وصحيح مسلم (589) — عن عائشة رضي الله عنها",
    categories: ["debtRizq", "protection", "comprehensive"],
  },
  {
    id: "allahumma-ikfini-bihalalika-an-haramik",
    text_ar: "اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "علي بن أبي طالب رضي الله عنه",
    // Master file explicitly instructs: "لا يُوصف في البطاقة بأنه حديث
    // صحيح؛ ويُذكر الحكم كما هو" — grade is "حسن", stated as such.
    source_ar: "جامع الترمذي (3563) — عن علي بن أبي طالب رضي الله عنه، حسنه الألباني",
    categories: ["debtRizq"],
  },
  {
    id: "allahumma-inni-asaluka-min-fadlika-warahmatik",
    text_ar: "اللهم إني أسألك من فضلك ورحمتك، فإنه لا يملكها إلا أنت.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عبد الله بن مسعود رضي الله عنه",
    source_ar:
      "المعجم الكبير للطبراني (10379)، وحلية الأولياء لأبي نعيم — عن عبد الله بن مسعود رضي الله عنه، صححه الألباني في السلسلة الصحيحة (1543)",
    categories: ["debtRizq", "comprehensive"],
  },

  // ---- 19. الهداية والثبات (newly added) ----
  {
    id: "ya-muqallib-al-qulub-thabbit-qalbi",
    text_ar: "يا مقلب القلوب، ثبت قلبي على دينك.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "أم سلمة رضي الله عنها",
    // Hadith number corrected 2026-08: 2140 is the number carried in the
    // Tirmidhi print editions in common circulation today (Kitab
    // al-Da'awat) and in Albani's Sahih al-Tirmidhi grading — the prior
    // "3522" here was a documentation error, fixed at the Master file.
    source_ar: "جامع الترمذي (2140) — عن أم سلمة رضي الله عنها، حسنه الترمذي وصححه الألباني",
    categories: ["guidance"],
  },

  // ---- 20. العبادة الموسمية (newly added) — content restricted to what
  // the Master file itself explicitly establishes (section 20.4: no
  // occasion is added merely because it is well-known; Ashura, Arafah,
  // Eid, and Dhul-Hijjah appear nowhere in the Master file's section 20
  // and are deliberately NOT added here) ----
  {
    id: "dhahaba-al-zama-wabtallat-al-uruq",
    text_ar: "ذهب الظمأ، وابتلت العروق، وثبت الأجر إن شاء الله.",
    occasion_ar: "عند الإفطار",
    count_ar: "مرة عند الإفطار، ولا يثبت تكرار عددي آخر",
    narrator_ar: "عبد الله بن عمر رضي الله عنهما",
    source_ar: "سنن أبي داود (2357) — عن عبد الله بن عمر رضي الله عنهما، حسنه الألباني في صحيح أبي داود",
    categories: ["seasonal"],
  },
  {
    id: "allahumma-innaka-afuwwun-tuhibb-al-afw",
    text_ar: "اللهم إنك عفو تحب العفو فاعف عني.",
    occasion_ar: "ليلة القدر — سؤال النبي ﷺ عن الدعاء فيها",
    count_ar: "بدون عدد محدد",
    narrator_ar: "عائشة رضي الله عنها",
    source_ar: "جامع الترمذي (3513) وابن ماجه (3850) — عن عائشة رضي الله عنها، حسن صحيح عند الترمذي وصححه الألباني",
    categories: ["seasonal"],
  },
  {
    id: "talbiyah",
    text_ar: "لبيك اللهم لبيك، لبيك لا شريك لك لبيك، إن الحمد والنعمة لك والملك، لا شريك لك.",
    occasion_ar: "عند الإهلال بالحج أو العمرة",
    count_ar: "بحسب التلبية أثناء النسك، ولا عدد ثابت مخصوص",
    narrator_ar: "عبد الله بن عمر رضي الله عنهما",
    source_ar: "صحيح البخاري (1549) وصحيح مسلم (1184) — عن عبد الله بن عمر رضي الله عنهما",
    categories: ["seasonal"],
  },
  {
    id: "dhikr-al-safa-wal-marwah",
    text_ar:
      "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير، لا إله إلا الله وحده، أنجز وعده، ونصر عبده، وهزم الأحزاب وحده.",
    occasion_ar: "على الصفا والمروة أثناء السعي",
    count_ar: "ثلاث مرات، ويتخلل ذلك الدعاء",
    narrator_ar: "جابر رضي الله عنه",
    source_ar: "حديث جابر رضي الله عنه في صفة حج النبي ﷺ، رواه مسلم",
    note_ar: "يثبت الذكر في الموضع المذكور، ولا يُحوَّل إلى دعاء عام خاص بالسعي خارج هذا السياق.",
    categories: ["seasonal"],
  },
];

// Per-category item counts, computed ONCE here (module load) rather than by
// filtering the full MISC_DUAS array from inside every category tile's
// render — MISC_DUAS never changes at runtime, so re-deriving this on every
// re-render of the category grid (e.g. on each favorite toggle) was pure
// wasted work for a result that's always identical.
export const MISC_CATEGORY_COUNTS: Record<MiscCategoryKey, number> = MISC_CATEGORY_ORDER.reduce(
  (acc, key) => {
    acc[key] = MISC_DUAS.filter((item) => item.categories.includes(key)).length;
    return acc;
  },
  {} as Record<MiscCategoryKey, number>,
);

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
  occasionLabel: "المناسبة",
  noteLabel: "ملاحظة",
  favoriteAria: "إضافة إلى المفضلة",
  unfavoriteAria: "إزالة من المفضلة",
  copyAria: "نسخ النص",
  copiedToast: "تم النسخ",
  comingSoon: "قريبًا",
  back: "رجوع",
};
