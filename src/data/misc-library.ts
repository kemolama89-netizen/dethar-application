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
import { dhikrLanguageLabels } from "./dhikr-language-labels";
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
   * English title/subtitle — plain, established English terminology (never
   * a new translation of religious content itself, just the category
   * label), following the same naming conventions already used elsewhere
   * in this app (writtenAdhkarCategoryLabels, tasbeehLabels): short noun
   * phrases, transliterated Islamic terms kept as-is (Istikharah, Duas)
   * rather than invented English equivalents. Shown only when the app
   * language is English — see MiscLibraryScreen/MiscCategoryScreen.
   */
  title_en: string;
  subtitle_en: string;
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
    title_en: "Comprehensive Duas",
    subtitle_en: "Established duas broad in meaning",
    image: miscGeneralDuas,
  },
  istighfar: {
    key: "istighfar",
    title_ar: "الاستغفار والتوبة",
    subtitle_ar: "أدعية طلب المغفرة والرجوع إلى الله",
    title_en: "Seeking Forgiveness & Repentance",
    subtitle_en: "Duas for seeking forgiveness and returning to Allah",
    image: miscIstighfarTaubah,
  },
  protection: {
    key: "protection",
    title_ar: "الحفظ والاستعاذة",
    subtitle_ar: "أدعية الحماية واللجوء إلى الله",
    title_en: "Protection & Refuge",
    subtitle_en: "Duas for protection and seeking refuge in Allah",
    image: miscProtection,
  },
  distress: {
    key: "distress",
    title_ar: "الكرب والهم",
    subtitle_ar: "أدعية عند الضيق والشدة والحزن",
    title_en: "Distress & Anxiety",
    subtitle_en: "Duas for hardship, distress, and grief",
    image: miscDistress,
  },
  healing: {
    key: "healing",
    title_ar: "المرض والشفاء",
    subtitle_ar: "أدعية الرقية وعيادة المريض",
    title_en: "Illness & Healing",
    subtitle_en: "Duas for ruqyah and visiting the sick",
    image: miscHealing,
  },
  deceased: {
    key: "deceased",
    title_ar: "الميت والجنائز",
    subtitle_ar: "أدعية ثابتة للميت وعند المصيبة",
    title_en: "The Deceased & Funerals",
    subtitle_en: "Established duas for the deceased and times of calamity",
    image: miscFunerals,
  },
  family: {
    key: "family",
    title_ar: "الأسرة والذرية",
    subtitle_ar: "أدعية الزواج والأبناء",
    title_en: "Family & Offspring",
    subtitle_en: "Duas for marriage and children",
    image: miscFamilyProgeny,
  },
  travel: {
    key: "travel",
    title_ar: "السفر والركوب",
    subtitle_ar: "أدعية الركوب والسفر والعودة",
    title_en: "Travel & Riding",
    subtitle_en: "Duas for riding, travel, and returning",
    image: miscTravel,
  },
  home: {
    key: "home",
    title_ar: "المنزل والحياة اليومية",
    subtitle_ar: "أدعية الخروج والدخول والنوم",
    title_en: "Home & Daily Life",
    subtitle_en: "Duas for leaving, entering, and sleeping",
    image: miscHomeDailyLife,
  },
  mosque: {
    key: "mosque",
    title_ar: "المسجد والأذان",
    subtitle_ar: "أدعية الوضوء ودخول المسجد والأذان",
    title_en: "The Mosque & Adhan",
    subtitle_en: "Duas for wudu, entering the mosque, and the call to prayer",
    image: miscMosqueAdhan,
  },
  food: {
    key: "food",
    title_ar: "الطعام والشراب",
    subtitle_ar: "أدعية قبل الطعام وبعده",
    title_en: "Food & Drink",
    subtitle_en: "Duas before and after eating",
    image: miscFoodDrink,
  },
  gatherings: {
    key: "gatherings",
    title_ar: "السلام والمجالس",
    subtitle_ar: "أدعية المجالس والعطاس",
    title_en: "Greetings & Gatherings",
    subtitle_en: "Duas for gatherings and sneezing",
    image: miscPeaceGatherings,
  },
  weather: {
    key: "weather",
    title_ar: "المطر والظواهر الكونية",
    subtitle_ar: "أدعية الريح والمطر",
    title_en: "Rain & Cosmic Phenomena",
    subtitle_en: "Duas for wind and rain",
    image: miscRainCosmicPhenomena,
  },
  quran: {
    key: "quran",
    title_ar: "أدعية القرآن",
    subtitle_ar: "أدعية ثابتة من كتاب الله",
    title_en: "Duas from the Qur'an",
    subtitle_en: "Established duas from the Book of Allah",
    image: miscQuranicDuas,
  },
  prayer: {
    key: "prayer",
    title_ar: "أدعية الصلاة",
    subtitle_ar: "أذكار داخل الصلاة نفسها",
    title_en: "Prayer Duas",
    subtitle_en: "Adhkar said within the prayer itself",
    image: miscSalahDuas,
  },
  authenticRare: {
    key: "authenticRare",
    title_ar: "صحيح مهجور",
    subtitle_ar: "أذكار صحيحة قلّ انتشارها",
    title_en: "Authentic Yet Overlooked",
    subtitle_en: "Authentic adhkar that are less widely known",
    image: miscAuthenticHidden,
  },
  // Sections 17-20 — newly added to the Master Content Library.
  istikharah: {
    key: "istikharah",
    title_ar: "الاستخارة",
    subtitle_ar: "دعاء طلب الخِيَرة من الله عند التردد",
    title_en: "Istikharah",
    subtitle_en: "The supplication for seeking Allah's guidance when in doubt",
    image: miscIstikhara,
  },
  debtRizq: {
    key: "debtRizq",
    title_ar: "قضاء الدين والرزق",
    subtitle_ar: "أدعية تفريج الدين وسعة الرزق",
    title_en: "Debt & Provision",
    subtitle_en: "Duas for relief from debt and abundant provision",
    image: miscDebtRizq,
  },
  guidance: {
    key: "guidance",
    title_ar: "الهداية والثبات",
    subtitle_ar: "أدعية الثبات على الحق وسلامة القلب",
    title_en: "Guidance & Steadfastness",
    subtitle_en: "Duas for steadfastness upon truth and a sound heart",
    image: miscGuidanceStability,
  },
  seasonal: {
    key: "seasonal",
    title_ar: "العبادة الموسمية",
    subtitle_ar: "أذكار المواسم الثابتة كالصيام والحج",
    title_en: "Seasonal Worship",
    subtitle_en: "Established adhkar for seasons of worship such as fasting and Hajj",
    image: miscSeasonalWorship,
  },
};

// Proactively fetch every category-card image shortly after this module
// loads — deliberately not gated by which tile is actually visible/near
// the viewport, so scrolling the category grid never hits a loading gap.
// All 20 WebP files combined are already small after the earlier size
// optimization (tens of KB each, well under 1MB total), so requesting all
// of them costs far less than the visible per-card delay it removes; a
// throttled/batched fetch would only add complexity for no real benefit at
// this payload size. ES modules evaluate exactly once no matter how many
// places import this file, so this never re-runs on repeat navigation into
// the Misc screens — and the existing-link check makes it a no-op if the
// module is ever re-evaluated anyway (dev HMR).
//
// Deferred to idle time (same requestIdleCallback-with-timeout-fallback
// pattern App.tsx already uses for its own screen-chunk prefetching)
// rather than running synchronously at module-evaluation time: this module
// is bundled together with useMiscSpeech (their only two importers,
// MiscLibraryScreen/MiscCategoryScreen, are both lazy-loaded together), so
// evaluating it happens either during App.tsx's post-mount idle-prefetch of
// every screen, or right when the user first navigates into a Misc screen
// on a cold cache — 20 synchronous DOM head mutations at exactly that
// moment is avoidable, non-critical work that was competing with the
// actually-critical first render.
function schedulePreload(run: () => void) {
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run);
  } else {
    window.setTimeout(run, 200);
  }
}

if (typeof document !== "undefined") {
  schedulePreload(() => {
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
  /**
   * English meaning of the COMPLETE Arabic text — sourced verbatim from
   * ASSETS/dithar_master_content_library.md's "ENGLISH INTEGRATION LAYER"
   * (added there per the same content-safety rule as the rest of this
   * file: never invented, never upgrading a pending record). Applied below
   * via `MISC_ENGLISH_CONTENT`, matched by id — never inlined per-item, so
   * this stays a pure additive layer with no risk to the Arabic literals
   * above. Absent for the small number of items with no Master coverage at
   * all (see that map's own comment) — no meaning is invented for those.
   */
  englishMeaning?: string;
  /** Latin transliteration of the same complete Arabic text — same source and rule as `englishMeaning`. */
  englishTransliteration?: string;
  /**
   * English rendering of `count_ar`/`source_ar`/`occasion_ar`/`note_ar` —
   * NOT part of the Master Content Library's own English Integration Layer
   * (that layer only covers englishMeaning/englishTransliteration; see the
   * comment on `MISC_ENGLISH_METADATA` below for why and how these were
   * produced). Applied via that same lookup, matched by id, so the Arabic
   * fields above are never touched. Present only where the matching
   * `_ar` field is present — never invented for a field the Arabic side
   * doesn't have.
   */
  count_en?: string;
  source_en?: string;
  occasion_en?: string;
  note_en?: string;
}

const MISC_DUAS_BASE: MiscDuaItem[] = [
  // ---- 1. أدعية جامعة ----
  {
    id: "rabbana-atina",
    text_ar: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.",
    count_ar: "بدون عدد محدد",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 201",
    isQuranic: true,
    // 2026-08 classification audit: Master 20.3.3 documents a real,
    // hadith-sourced occasion (recited during tawaf, between the Yemeni
    // Corner and the Black Stone — Ahmad/Nasa'i/Ibn Khuzaimah, Abdullah
    // ibn al-Sa'ib), but this verse's identity and overwhelming everyday
    // use is as a general Quranic dua, not a seasonal/Hajj one — a single
    // documented ritual mention doesn't make it primarily occasion-bound.
    // "seasonal" removed accordingly; see the Master's audit log.
    categories: ["comprehensive", "quran"],
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
    // 2026-08 classification audit: single-theme guidance dua (no other
    // dimension); Master's own 1.4 tags never included "أدعية جامعة"
    // either — "comprehensive" dropped.
    categories: ["guidance"],
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
    // 2026-08 classification audit: the dua's second half is a full
    // directional refuge/protection formula ("احفظني من بين يدي... وأعوذ
    // بعظمتك أن أُغتال من تحتي"), matching the shape of other
    // "protection" entries — tagged accordingly in addition to comprehensive.
    categories: ["comprehensive", "protection"],
  },
  {
    id: "allahumma-iqsim-lana-min-khashyatik",
    text_ar:
      "اللهم اقسم لنا من خشيتك ما يحول بيننا وبين معاصيك، ومن طاعتك ما تبلغنا به جنتك، ومن اليقين ما تهون به علينا مصيبات الدنيا، ومتعنا بأسماعنا، وأبصارنا، وقوتنا ما أحييتنا، واجعله الوارث منا، واجعل ثأرنا على من ظلمنا، وانصرنا على من عادانا، ولا تجعل مصيبتنا في ديننا، ولا تجعل الدنيا أكبر همنا، ولا مبلغ علمنا، ولا تسلط علينا من لا يرحمنا.",
    count_ar: "بدون عدد محدد",
    source_ar: "جامع الترمذي (3502)، حسن عند الترمذي",
    // 2026-08 classification audit: "مصيبات الدنيا" is one clause among
    // many (خشية/طاعة/يقين/رزق/نصر...) in a genuinely multi-theme
    // comprehensive dua — not a distress-specific supplication.
    // "distress" dropped.
    categories: ["comprehensive"],
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
    // 2026-08 classification audit: single-theme refuge phrase (evil of
    // deeds), matching the pattern of its section-3 neighbors — "istighfar"
    // and "comprehensive" dropped as overreach for a 2-clause isti'adhah.
    categories: ["protection"],
  },
  {
    id: "allahumma-inni-audhu-bika-min-zawal-nimatik",
    text_ar: "اللهم إني أعوذ بك من زوال نعمتك، وتحول عافيتك، وفجاءة نقمتك، وجميع سخطك.",
    count_ar: "بدون عدد محدد",
    source_ar: "صحيح مسلم (2739)",
    // 2026-08 classification audit: single-theme refuge phrase (loss of
    // blessing/wrath) — "comprehensive" dropped, same reasoning as above.
    categories: ["protection"],
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
    text_ar: "لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ.",
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
    occasion_ar: "عند الغضب ووسوسة الشيطان",
    // 2026-08 classification audit: a general isti'adhah from Shaytan, not
    // a distress/hardship-specific dua — moved from "distress" to
    // "protection", the seeking-refuge category it actually belongs to.
    categories: ["protection"],
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
    text_ar: "رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً طَيِّبَةً إِنَّكَ سَمِيعُ الدُّعَاءِ.",
    source_ar: "القرآن الكريم — سورة آل عمران، الآية 38",
    isQuranic: true,
    categories: ["family", "quran"],
  },
  {
    id: "rabbi-ijalni-muqim-al-salah",
    text_ar: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ.",
    source_ar: "القرآن الكريم — سورة إبراهيم، الآية 40",
    isQuranic: true,
    categories: ["family", "quran"],
  },
  {
    id: "rabbana-hab-lana-min-azwajina",
    text_ar: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا.",
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
    narrator_ar: "أنس بن مالك رضي الله عنه",
    source_ar: "أبو داود (5095)، والترمذي (3426)، والنسائي؛ صححه الألباني",
    categories: ["home"],
  },
  {
    id: "allahumma-inni-audhu-bika-an-adilla-aw-udall",
    text_ar: "اللهم إني أعوذ بك أن أضل أو أُضل، أو أزل أو أُزل، أو أظلم أو أُظلم، أو أجهل أو يُجهل علي.",
    count_ar: "بدون عدد محدد (مرة عند الخروج)",
    narrator_ar: "أم سلمة رضي الله عنها",
    source_ar:
      "سنن أبي داود (5094)، وجامع الترمذي (3427)، وسنن النسائي، وسنن ابن ماجه، ومسند أحمد — عن أم سلمة رضي الله عنها، حسن صحيح عند الترمذي، وصححه الألباني",
    note_ar: "دعاء ثانٍ ومستقل عن دعاء «بسم الله، توكلت على الله...» (رواية مختلفة عن أم سلمة)، يُقال أيضًا عند الخروج من المنزل.",
    categories: ["home", "protection"],
  },
  // The following two have no equivalent in the Master Content Library —
  // they are this app's own PRE-EXISTING, already-verified entries (see
  // the `misc` array in written-adhkar.ts, ids "misc-5"/"misc-6"),
  // reused here verbatim rather than duplicated or invented, since the
  // Master file does not yet cover sleep-related Adhkar.
  {
    id: "before-sleeping",
    text_ar: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.",
    narrator_ar: "حذيفة بن اليمان رضي الله عنه",
    source_ar: "صحيح البخاري 6324 — عن حذيفة بن اليمان رضي الله عنه",
    categories: ["home"],
  },
  {
    id: "upon-waking",
    text_ar: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ.",
    // NEEDS REVIEW (2026-08 audit): "صحيح البخاري 6312" could not be
    // independently re-confirmed this pass — only 6324 (the same combined
    // sleep/wake hadith used for "before-sleeping") was located for this
    // exact wording. Left as-is rather than silently changed or removed;
    // flagged for a follow-up primary-source check.
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
    narrator_ar: "معاذ بن أنس رضي الله عنه",
    source_ar: "سنن أبي داود (4023)، جامع الترمذي (3458) — حسن غريب عند الترمذي، وسنن ابن ماجه (3285) — عن معاذ بن أنس رضي الله عنه",
    categories: ["food"],
  },

  // ---- 10. الوضوء والمسجد والأذان والإقامة ----
  {
    id: "after-wudu",
    text_ar: "أشهد أن لا إله إلا الله وحده لا شريك له، وأشهد أن محمدًا عبده ورسوله.",
    count_ar: "مرة بعد الوضوء",
    narrator_ar: "عقبة بن عامر رضي الله عنه",
    source_ar: "صحيح مسلم (234) — عن عقبة بن عامر رضي الله عنه",
    categories: ["mosque"],
  },
  {
    id: "entering-mosque",
    text_ar: "اللهم افتح لي أبواب رحمتك.",
    count_ar: "عند الدخول",
    source_ar: "صحيح مسلم (713) — عن أبي حميد و/أو أبي أسيد رضي الله عنهما",
    categories: ["mosque"],
  },
  {
    id: "leaving-mosque",
    text_ar: "اللهم إني أسألك من فضلك.",
    count_ar: "عند الخروج",
    source_ar: "صحيح مسلم (713) — عن أبي حميد و/أو أبي أسيد رضي الله عنهما",
    categories: ["mosque"],
  },
  {
    id: "after-adhan",
    text_ar:
      "اللهم رب هذه الدعوة التامة، والصلاة القائمة، آت محمدًا الوسيلة والفضيلة، وابعثه مقامًا محمودًا الذي وعدته.",
    narrator_ar: "جابر بن عبد الله رضي الله عنه",
    source_ar: "صحيح البخاري (614) — عن جابر بن عبد الله رضي الله عنه",
    categories: ["mosque"],
  },

  // ---- 11. الطعام والشراب ----
  {
    id: "before-food",
    text_ar: "بسم الله.",
    count_ar: "مرة",
    source_ar: "صحيح البخاري (5376)، صحيح مسلم (2022) — عن عمر بن أبي سلمة رضي الله عنه",
    narrator_ar: "عمر بن أبي سلمة رضي الله عنه",
    categories: ["food"],
  },
  {
    id: "forgot-tasmiyah",
    text_ar: "بسم الله أوله وآخره.",
    count_ar: "عند النسيان",
    narrator_ar: "عائشة رضي الله عنها",
    // NEEDS REVIEW (2026-08 audit): exact hadith number not independently
    // confirmed this pass — left out rather than invented; source line
    // kept as the prior, vaguer citation pending a follow-up check.
    source_ar: "الترمذي، وحسنه عدد من أهل العلم",
    categories: ["food"],
  },

  // ---- 12. السلام والمجالس والعطاس ----
  {
    id: "kaffarat-al-majlis",
    text_ar: "سبحانك اللهم وبحمدك، لا إله إلا أنت، أستغفرك وأتوب إليك.",
    narrator_ar: "أبو هريرة رضي الله عنه",
    source_ar: "جامع الترمذي (3433) — عن أبي هريرة رضي الله عنه",
    categories: ["gatherings"],
  },
  {
    id: "sneezing-alhamdulillah",
    text_ar: "الحمد لله.",
    narrator_ar: "أبو هريرة رضي الله عنه",
    source_ar: "صحيح البخاري (6224) — عن أبي هريرة رضي الله عنه",
    categories: ["gatherings"],
  },
  {
    id: "yarhamuk-allah",
    text_ar: "يرحمك الله.",
    source_ar: "صحيح البخاري (6224) — عن أبي هريرة رضي الله عنه",
    categories: ["gatherings"],
  },
  {
    id: "yahdikum-allah",
    // Internal note (2026-08 audit, not user-facing): this reply is
    // specifically the Prophet's ﷺ own reply to a sneezer when no one
    // present said "يرحمك الله" (or the sneezer isn't a believer) — not a
    // generic interchangeable gathering phrase.
    text_ar: "يهديكم الله ويصلح بالكم.",
    source_ar: "صحيح البخاري (6224) — عن أبي هريرة رضي الله عنه",
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
    text_ar: "رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-wala-tahmil-alayna-isran",
    text_ar: "رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-wala-tuhammilna",
    text_ar: "رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 286",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-dhalamna-anfusana",
    text_ar: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ.",
    source_ar: "القرآن الكريم — سورة الأعراف، الآية 23",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-hab-lana-min-ladunka-rahmatan",
    text_ar: "﴿ رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا ﴾",
    source_ar: "القرآن الكريم — سورة الكهف، الآية 10",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-ishrah-li-sadri",
    text_ar: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي.",
    source_ar: "القرآن الكريم — سورة طه، الآيتان 25–26",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-zidni-ilman",
    text_ar: "رَبِّ زِدْنِي عِلْمًا.",
    source_ar: "القرآن الكريم — سورة طه، الآية 114",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-ighfir-li-waliwalidayya",
    text_ar: "﴿ رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ ﴾",
    source_ar: "القرآن الكريم — سورة إبراهيم، الآية 41",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbi-inni-lima-anzalta",
    text_ar: "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ.",
    source_ar: "القرآن الكريم — سورة القصص، الآية 24",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-afrigh-alayna-sabran-tawaffana",
    text_ar: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ.",
    source_ar: "القرآن الكريم — سورة الأعراف، الآية 126",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-afrigh-alayna-sabran-thabbit",
    text_ar: "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ.",
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
    text_ar: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ.",
    source_ar: "القرآن الكريم — سورة آل عمران، الآية 8",
    isQuranic: true,
    categories: ["quran", "guidance"],
  },
  {
    id: "rabbana-taqabbal-minna",
    text_ar: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ.",
    source_ar: "القرآن الكريم — سورة البقرة، الآية 127",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-ighfir-lana-waliikhwanina",
    text_ar: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ.",
    source_ar: "القرآن الكريم — سورة الحشر، الآية 10",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-alayka-tawakkalna",
    text_ar: "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ.",
    source_ar: "القرآن الكريم — سورة الممتحنة، الآية 4",
    isQuranic: true,
    categories: ["quran"],
  },
  {
    id: "rabbana-atmim-lana-nurana",
    text_ar: "رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ.",
    source_ar: "القرآن الكريم — سورة التحريم، الآية 8",
    isQuranic: true,
    categories: ["quran"],
  },

  // ---- 15. أدعية الصلاة (a separate chapter from post-prayer Adhkar,
  // per the Master file's own note: "هذا باب مستقل عما بعد الصلاة") ----
  {
    id: "istiftah",
    // NEEDS REVIEW (2026-08 audit): well-documented as Abu Dawud
    // 775/Tirmidhi 243/Ibn Majah 806/Nasa'i 899, narrated by 'A'ishah —
    // but not independently re-searched to primary sources this pass, so
    // the vaguer existing source line is left as-is rather than upgraded
    // on an unconfirmed basis.
    text_ar: "سبحانك اللهم وبحمدك، وتبارك اسمك، وتعالى جدك، ولا إله غيرك.",
    source_ar: "الأحاديث الصحيحة في الاستفتاح",
    categories: ["prayer"],
  },
  {
    id: "ruku",
    text_ar: "سبحان ربي العظيم.",
    source_ar: "صحيح مسلم (772) — عن حذيفة بن اليمان رضي الله عنه",
    narrator_ar: "حذيفة بن اليمان رضي الله عنه",
    categories: ["prayer"],
  },
  {
    id: "sujud",
    text_ar: "سبحان ربي الأعلى.",
    source_ar: "صحيح مسلم (772) — عن حذيفة بن اليمان رضي الله عنه",
    narrator_ar: "حذيفة بن اليمان رضي الله عنه",
    categories: ["prayer"],
  },
  {
    id: "between-sajdatayn",
    // 2026-08 correction pass: kept as the short form per the app owner's
    // decision — this is Muslim 772's own wording said once, doubled
    // ("رب اغفر لي، رب اغفر لي"); Muslim 772 itself gives the longer
    // "رب اغفر لي، وارحمني، واجبرني، وارزقني، وارفعني" for this position.
    // The short form here instead matches a separate Nasa'i/Ibn Majah
    // (897) narration. Text is not proven textually incorrect, so it is
    // left unchanged; only the (distinct) source is now cited correctly.
    // Grade not independently confirmed this pass — left unresolved,
    // flagged for review before being asserted.
    text_ar: "رب اغفر لي.",
    source_ar: "سنن ابن ماجه (897)، والسنن الكبرى للنسائي — عن حذيفة بن اليمان رضي الله عنه",
    narrator_ar: "حذيفة بن اليمان رضي الله عنه",
    categories: ["prayer"],
  },
  {
    id: "before-salam-audhu",
    // NEEDS REVIEW (2026-08 audit): commonly cited as Sahih Muslim 588,
    // not independently re-confirmed this pass — left unresolved rather
    // than adding an unverified number.
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
    narrator_ar: "عائشة رضي الله عنها",
    occasion_ar: "في السجود (ضمن سياق قيام الليل)",
    // 2026-08 classification audit: single-theme dua (Allah's pleasure vs.
    // wrath) despite its several clauses — "comprehensive" dropped.
    categories: ["prayer", "protection"],
  },
  {
    id: "allahumma-inni-asaluka-fil-al-khayrat",
    text_ar:
      "اللهم إني أسألك فعل الخيرات، وترك المنكرات، وحب المساكين، وإذا أردت بعبادك فتنة فاقبضني إليك غير مفتون.",
    count_ar: "بدون عدد محدد",
    narrator_ar: "ابن عباس رضي الله عنهما",
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
    // 2026-08 classification audit: a short, single-purpose refuge phrase
    // (sin and debt only) — "comprehensive" dropped as overreach.
    categories: ["debtRizq", "protection"],
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
    // 2026-08 classification audit: single-theme provision/bounty request
    // (occasion: no food for a guest) — "comprehensive" dropped.
    categories: ["debtRizq"],
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
    // NEEDS REVIEW (2026-08 audit): text/narrator/collection are
    // well-known and low-risk, but not freshly re-confirmed to primary
    // sources this pass — left unchanged.
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
    // 2026-08 correction pass: "يحيي ويميت" restored — Sahih Muslim 1218
    // (Jabir's hajj-description hadith) includes this clause at this exact
    // position; the app's text previously omitted it.
    text_ar:
      "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، يحيي ويميت، وهو على كل شيء قدير، لا إله إلا الله وحده، أنجز وعده، ونصر عبده، وهزم الأحزاب وحده.",
    occasion_ar: "على الصفا والمروة أثناء السعي",
    count_ar: "ثلاث مرات، ويتخلل ذلك الدعاء",
    narrator_ar: "جابر رضي الله عنه",
    source_ar: "حديث جابر رضي الله عنه في صفة حج النبي ﷺ، رواه مسلم",
    note_ar: "يثبت الذكر في الموضع المذكور، ولا يُحوَّل إلى دعاء عام خاص بالسعي خارج هذا السياق.",
    categories: ["seasonal"],
  },
];

// Additive English layer — same pattern as ENGLISH_CONTENT in
// written-adhkar.ts: kept as a separate lookup keyed by id, never inlined
// into the Arabic literals above, so it can never touch text_ar/id/source/
// categories/grade/count. Every value below is copied verbatim from
// ASSETS/dithar_master_content_library.md's English Integration Layer for
// the matching Master entry (matched by comparing this file's text_ar
// against the Master's Arabic text, not by number alone, since ids here
// are slugs rather than Master section numbers). Three ids have no Master
// counterpart at all (before-sleeping/upon-waking/after-eating — see their
// own comments above): their englishMeaning reuses this app's own
// pre-existing, already-verified text_en from written-adhkar.ts's "misc-5"/
// "misc-6"/"misc-4" entries (never invented), with a plain transliteration
// of that same short, extremely well-known text added alongside it.
const MISC_ENGLISH_CONTENT: Record<string, { englishMeaning: string; englishTransliteration: string }> = {
  "rabbana-atina": {
    englishMeaning: "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
    englishTransliteration: "Rabbana aatina fid-dunya hasanatan wa fil-aakhirati hasanatan wa qina ‘adhaaban-naar.",
  },
  "allahumma-inni-asaluka-alhuda": {
    englishMeaning: "O Allah, I ask You for guidance, piety, chastity, and self-sufficiency (contentment of the heart).",
    englishTransliteration: "Allahumma inni as'aluka al-huda wat-tuqa wal-‘afaafa wal-ghina.",
  },
  "allahumma-ighfir-li-warhamni": {
    englishMeaning: "O Allah, forgive me, have mercy on me, guide me, grant me well-being, and provide for me.",
    englishTransliteration: "Allahummaghfir li, warhamni, wahdini, wa ‘aafini, warzuqni.",
  },
  "allahumma-ihdini-wasaddidni": {
    englishMeaning: "O Allah, guide me and make me steadfast/upright.",
    englishTransliteration: "Allahummahdini wa saddidni.",
  },
  "allahumma-aslih-li-dini": {
    englishMeaning:
      "O Allah, set right for me my religion, which is the safeguard of my affairs; set right for me my worldly life, in which is my livelihood; and set right for me my Hereafter, to which is my return. Make life a means of increase for me in every good, and make death a relief for me from every evil.",
    englishTransliteration:
      "Allahumma aslih li deeni alladhi huwa ‘ismatu amri, wa aslih li dunyaaya allati feeha ma‘aashi, wa aslih li aakhirati allati feeha ma‘aadi, waj‘alil-hayaata ziyaadatan li fi kulli khayr, waj‘alil-mawta raahatan li min kulli sharr.",
  },
  "allahumma-inni-asaluka-min-al-khayr-kullih": {
    englishMeaning:
      "O Allah, I ask You for all good, its immediate and its delayed, what I know of it and what I do not know; and I seek refuge in You from all evil, its immediate and its delayed, what I know of it and what I do not know. O Allah, I ask You for the good that Your servant and Prophet asked You for, and I seek refuge in You from the evil that Your servant and Prophet sought refuge from. O Allah, I ask You for Paradise and whatever word or deed brings [one] closer to it, and I seek refuge in You from the Fire and whatever word or deed brings [one] closer to it, and I ask You to make every decree You ordain for me good.",
    englishTransliteration:
      "Allahumma inni as'aluka minal-khayri kullihi, ‘aajilihi wa aajilihi, ma ‘alimtu minhu wa ma lam a‘lam, wa a‘oothu bika minash-sharri kullihi, ‘aajilihi wa aajilihi, ma ‘alimtu minhu wa ma lam a‘lam. Allahumma inni as'aluka min khayri ma sa'alaka ‘abduka wa nabiyyuk, wa a‘oothu bika min sharri ma ‘aadha bihi ‘abduka wa nabiyyuk. Allahumma inni as'alukal-jannata wa ma qarraba ilayha min qawlin aw ‘amal, wa a‘oothu bika minan-naari wa ma qarraba ilayha min qawlin aw ‘amal, wa as'aluka an taj‘ala kulla qadaa'in qadaytahu li khayra.",
  },
  "allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah": {
    englishMeaning:
      "O Allah, I ask You for well-being in this world and the Hereafter. O Allah, I ask You for pardon and well-being in my religion, my worldly life, my family, and my wealth. O Allah, conceal my faults and calm my fears. O Allah, guard me from before me, from behind me, from my right, from my left, and from above me, and I seek refuge in Your greatness from being taken unaware from beneath me.",
    englishTransliteration:
      "Allahumma inni as'alukal-‘aafiyata fid-dunya wal-aakhirah, Allahumma inni as'alukal-‘afwa wal-‘aafiyata fi deeni wa dunyaaya wa ahli wa maali, Allahummastur ‘awraati wa aamin raw‘aati, Allahummahfadhni min bayni yadayya wa min khalfi wa ‘an yameeni wa ‘an shimaali wa min fawqi, wa a‘oothu bi‘adhamatika an ughtaala min tahti.",
  },
  "allahumma-iqsim-lana-min-khashyatik": {
    englishMeaning:
      "O Allah, apportion for us such fear of You as will come between us and disobedience to You, and such obedience to You as will bring us to Your Paradise, and such certainty as will make the calamities of this world easy for us to bear. Let us enjoy our hearing, our sight, and our strength for as long as You keep us alive, and make that a lasting legacy for us. Make our vengeance fall upon those who wrong us, and grant us victory over those who show enmity to us. Do not let our affliction be in our religion, do not make this world our greatest concern or the sum of our knowledge, and do not let anyone who has no mercy for us be given power over us.",
    englishTransliteration:
      "Allahummaqsim lana min khashyatika ma yahoolu baynana wa bayna ma‘aasik, wa min taa‘atika ma tuballighuna bihi jannatak, wa minal-yaqeeni ma tuhawwinu bihi ‘alayna musibaatid-dunya, wa matti‘na bi-asma‘ina wa absaarina wa quwwatina ma ahyaytana, waj‘alhul-waaritha minna, waj‘al tha'rana ‘ala man dhalamana, wansurna ‘ala man ‘aadaana, wa la taj‘al musibatana fi deenina, wa la taj‘alid-dunya akbara hammina wa la mablagha ‘ilmina, wa la tusallit ‘alayna man la yarhamuna.",
  },
  "allahumma-bi-ilmika-al-ghayb": {
    englishMeaning:
      "O Allah, by Your knowledge of the unseen and Your power over creation, keep me alive as long as You know life is good for me, and take me in death when You know death is good for me. O Allah, I ask You for the fear of You in secret and in public, and I ask You for the word of truth in contentment and in anger, and I ask You for moderation in poverty and in wealth. I ask You for a bliss that never ends, and for a joy of the eye that never ceases. I ask You for contentment after the decree, and for a pleasant life after death, and I ask You for the sweetness of looking upon Your Face, and the longing to meet You, without harmful adversity or misguiding trial. O Allah, adorn us with the adornment of faith and make us guides who are rightly guided.",
    englishTransliteration:
      "Allahumma bi‘ilmikal-ghayba wa qudratika ‘alal-khalq, ahyini ma ‘alimtal-hayaata khayran li, wa tawaffani idha ‘alimtal-wafaata khayran li. Allahumma inni as'aluka khashyataka fil-ghaybi wash-shahaadah, wa as'aluka kalimatal-haqqi fir-rida wal-ghadab, wa as'alukal-qasda fil-faqri wal-ghina, wa as'aluka na‘eeman la yanfad, wa as'aluka qurrata ‘aynin la tanqati‘, wa as'alukar-rida ba‘dal-qadaa', wa as'aluka barda-l‘aysh ba‘dal-mawt, wa as'aluka ladhdhatan-nadhari ila wajhika wash-shawqa ila liqaa'ika, fi ghayri darraa'a mudirratin wa la fitnatin mudillah. Allahumma zayyinna bizeenatil-eemaan waj‘alna hudaatan muhtadeen.",
  },
  "allahumma-inni-asaluka-al-thabat-fi-al-amr": {
    englishMeaning:
      "O Allah, I ask You for steadfastness in my affairs, and resolve upon right guidance. I ask You for what brings about Your mercy, and the resolve of Your forgiveness. I ask You for thankfulness for Your blessing, and for excellence in worshipping You. I ask You for a sound heart, and a truthful tongue. I ask You for the good that You know, and I seek refuge in You from the evil that You know, and I ask Your forgiveness for what You know, for indeed You are the Knower of unseen things.",
    englishTransliteration:
      "Allahumma inni as'alukath-thabaata fil-amr, wal-‘azeemata ‘alar-rushd, wa as'aluka moojibaati rahmatik, wa ‘azaa'ima maghfiratik, wa as'aluka shukra ni‘matik, wa husna ‘ibaadatik, wa as'aluka qalban saleema, wa lisaanan saadiqa, wa as'aluka min khayri ma ta‘lam, wa a‘oothu bika min sharri ma ta‘lam, wa astaghfiruka lima ta‘lam, innaka anta ‘allaamul-ghuyoob.",
  },
  "rabbi-aini-wala-tuin-alayya": {
    englishMeaning:
      "My Lord, help me and do not help [others] against me; grant me victory and do not let [others] triumph over me; plan for me and do not let anyone plan against me; guide me and make guidance easy for me; and grant me victory over whoever wrongs me. My Lord, make me one who thanks You greatly, remembers You greatly, fears You greatly, is greatly obedient to You, humbles himself before You, and turns to You in devotion and repentance. My Lord, accept my repentance, wash away my sin, answer my call, make firm my proof, guide my tongue rightly, guide my heart, and draw out the rancour of my chest.",
    englishTransliteration:
      "Rabbi a‘inni wa la tu‘in ‘alayya, wansurni wa la tansur ‘alayya, wamkur li wa la tamkur ‘alayya, wahdini wa yassiril-hudaa li, wansurni ‘ala man baghaa ‘alayya. Rabbij‘alni laka shakkaara, laka dhakkaara, laka rahhaaba, laka mutawaa‘a, laka mukhbita, ilayka awwaahan muneeba. Rabbi taqabbal tawbati, waghsil hawbati, wa ajib da‘wati, wa thabbit hujjati, wa saddid lisaani, wahdi qalbi, waslul sakheemata sadri.",
  },
  "sayyid-al-istighfar": {
    englishMeaning:
      "O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You.",
    englishTransliteration:
      "Allahumma anta rabbi la ilaha illa anta, khalaqtani wa ana ‘abduka, wa ana ‘ala ‘ahdika wa wa‘dika mastata‘t, a‘oothu bika min sharri ma sana‘t, aboo'u laka bini‘matika ‘alayya, wa aboo'u bidhanbi, faghfir li fa'innahu la yaghfirudh-dhunooba illa anta.",
  },
  "rabbi-ighfir-li-watub-alayya": {
    englishMeaning: "My Lord, forgive me and accept my repentance; indeed, You are the Ever-Accepting of repentance, the Most Merciful.",
    englishTransliteration: "Rabbighfir li wa tub ‘alayya innaka antat-tawwaabur-raheem.",
  },
  "allahumma-ighfir-li-khatiati-wajahli": {
    englishMeaning:
      "O Allah, forgive me my error, my ignorance, and my excess in my affairs, and what You know better than I do. O Allah, forgive me what I have done in seriousness and in jest, my mistakes and my intentional acts — all of that is within me. O Allah, forgive me what I have put forward and what I have left behind, what I have concealed and what I have made known. You are the One who brings forward and the One who puts back, and You are able to do all things.",
    englishTransliteration:
      "Allahummaghfir li khati'ati wa jahli, wa israafi fi amri, wa ma anta a‘lamu bihi minni, Allahummaghfir li jiddi wa hazli, wa khata'i wa ‘amdi, wa kullu dhaalika ‘indi, Allahummaghfir li ma qaddamtu wa ma akhkhartu, wa ma asrartu wa ma a‘lantu, antal-muqaddimu wa antal-mu'akhkhiru, wa anta ‘ala kulli shay'in qadeer.",
  },
  "audhu-bikalimatillah-al-tammat": {
    englishMeaning: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    englishTransliteration: "A‘oothu bikalimaatillahit-taammaati min sharri ma khalaq.",
  },
  "allahumma-inni-audhu-bika-min-al-ajz": {
    englishMeaning:
      "O Allah, I seek refuge in You from helplessness and laziness, from cowardice and old age, and from miserliness, and I seek refuge in You from the punishment of the grave and from the trial of life and death.",
    englishTransliteration:
      "Allahumma inni a‘oothu bika minal-‘ajzi wal-kasal, wal-jubni wal-haram, wal-bukhl, wa a‘oothu bika min ‘adhaabil-qabr, wa min fitnatil-mahya wal-mamaat.",
  },
  "allahumma-inni-audhu-bika-min-jahd-al-bala": {
    englishMeaning: "O Allah, I seek refuge in You from the hardship of trial, the depths of misery, the evil of the decree, and the gloating of enemies.",
    englishTransliteration: "Allahumma inni a‘oothu bika min jahdil-balaa', wa darkish-shaqaa', wa soo'il-qadaa', wa shamaatatil-a‘daa'.",
  },
  "allahumma-inni-audhu-bika-min-al-faqr": {
    englishMeaning: "O Allah, I seek refuge in You from poverty, scarcity, and humiliation, and I seek refuge in You from wronging others or being wronged.",
    englishTransliteration: "Allahumma inni a‘oothu bika minal-faqri wal-qillati wadh-dhillah, wa a‘oothu bika min an adhlima aw udhlam.",
  },
  "allahumma-inni-audhu-bika-min-sharri-samee": {
    englishMeaning:
      "O Allah, I seek refuge in You from the evil of my hearing, from the evil of my sight, from the evil of my tongue, from the evil of my heart, and from the evil of my private desire.",
    englishTransliteration: "Allahumma inni a‘oothu bika min sharri sam‘i, wa min sharri basari, wa min sharri lisaani, wa min sharri qalbi, wa min sharri manii.",
  },
  "allahumma-inni-audhu-bika-min-sharri-ma-amiltu": {
    englishMeaning: "O Allah, I seek refuge in You from the evil of what I have done, and from the evil of what I have not done.",
    englishTransliteration: "Allahumma inni a‘oothu bika min sharri ma ‘amiltu, wa min sharri ma lam a‘mal.",
  },
  "allahumma-inni-audhu-bika-min-zawal-nimatik": {
    englishMeaning: "O Allah, I seek refuge in You from the decline of Your blessing, the turning away of Your protection, the suddenness of Your punishment, and all that displeases You.",
    englishTransliteration: "Allahumma inni a‘oothu bika min zawaali ni‘matik, wa tahawwuli ‘aafiyatik, wa fajaa'ati niqmatik, wa jami‘i sakhatik.",
  },
  "allahumma-inni-audhu-bika-min-al-bukhl-wal-jubn": {
    englishMeaning:
      "O Allah, I seek refuge in You from miserliness, and I seek refuge in You from cowardice, and I seek refuge in You from being returned to the most decrepit old age, and I seek refuge in You from the trial of this world and the punishment of the grave.",
    englishTransliteration:
      "Allahumma inni a‘oothu bika minal-bukhl, wa a‘oothu bika minal-jubn, wa a‘oothu bika min an nuradda ila ardhalil-‘umur, wa a‘oothu bika min fitnatid-dunya wa ‘adhaabil-qabr.",
  },
  "dua-al-karb": {
    englishMeaning:
      "There is no god but Allah, the Mighty, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.",
    englishTransliteration:
      "La ilaha illallahul-‘Adheemul-Haleem, la ilaha illallahu Rabbul-‘Arshil-‘Adheem, la ilaha illallahu Rabbus-samaawaati wa Rabbul-ardi wa Rabbul-‘Arshil-Kareem.",
  },
  "la-ilaha-illa-anta-subhanaka": {
    englishMeaning: "There is no god but You, glory be to You; indeed, I was among the wrongdoers.",
    englishTransliteration: "La ilaha illa anta subhanaka inni kuntu minadh-dhalimeen.",
  },
  "allahumma-inni-audhu-bika-min-al-hamm": {
    englishMeaning:
      "O Allah, I seek refuge in You from anxiety and grief, from helplessness and laziness, from cowardice and miserliness, from being overwhelmed by debt, and from being overpowered by [other] men.",
    englishTransliteration: "Allahumma inni a‘oothu bika minal-hammi wal-hazan, wal-‘ajzi wal-kasal, wal-jubni wal-bukhl, wa dala‘id-dayni wa ghalabatir-rijaal.",
  },
  "audhu-billahi-min-al-shaytan-al-rajim": {
    englishMeaning: "I seek refuge in Allah from Satan, the accursed.",
    englishTransliteration: "A‘oothu billahi minash-shaytaanir-rajeem.",
  },
  "allahumma-rabb-al-nas-adhhib-al-bas": {
    englishMeaning: "O Allah, Lord of mankind, remove the affliction, and heal — You are the Healer; there is no healing but Your healing, a healing that leaves no illness behind.",
    englishTransliteration: "Allahumma Rabban-naas, adhhibil-ba's, ishfi antash-Shaafi, la shifaa'a illa shifaa'uk, shifaa'an la yughaadiru saqama.",
  },
  "bismillahi-arqik": {
    englishMeaning:
      "In the name of Allah I recite a protective prayer over you, from everything that harms you, from the evil of every soul or envious eye — Allah heals you. In the name of Allah I recite a protective prayer over you.",
    englishTransliteration: "Bismillahi arqeek, min kulli shay'in yu'dheek, min sharri kulli nafsin aw ‘aynin haasid, Allahu yashfeek, bismillahi arqeek.",
  },
  "asalu-allah-al-adhim-an-yashfiyak": {
    englishMeaning: "I ask Allah, the Mighty, Lord of the Mighty Throne, to heal you.",
    englishTransliteration: "As'alullahal-‘Adheem, Rabbal-‘Arshil-‘Adheem, an yashfiyak.",
  },
  "la-bas-tahurun-inshallah": {
    englishMeaning: "No harm [will come to you]; it is a purification, if Allah wills.",
    englishTransliteration: "La ba'sa, tahoorun in shaa' Allah.",
  },
  "dua-al-janaza": {
    englishMeaning:
      "O Allah, forgive him and have mercy on him, grant him well-being and pardon him, make honourable his reception, and widen his entrance. Wash him with water, snow, and hail, and cleanse him of sins as a white garment is cleansed of dirt. Give him in exchange a home better than his home, a family better than his family, and a spouse better than his spouse. Admit him into Paradise, and protect him from the punishment of the grave and the punishment of the Fire.",
    englishTransliteration:
      "Allahummaghfir lahu warhamh, wa ‘aafihi wa‘fu ‘anh, wa akrim nuzulah, wa wassi‘ madkhalah, waghsilhu bil-maa'i wath-thalji wal-barad, wa naqqihi minal-khataaya kama naqqaytath-thawbal-abyada minad-danas, wa abdilhu daaran khayran min daarih, wa ahlan khayran min ahlih, wa zawjan khayran min zawjih, wa adkhilhul-jannah, wa a‘idh-hu min ‘adhaabil-qabri wa min ‘adhaabin-naar.",
  },
  "allahumma-ighfir-li-abi-salama": {
    englishMeaning:
      "O Allah, forgive Abu Salamah, raise his rank among those who are rightly guided, take his place among his descendants who remain, and forgive us and him, O Lord of the worlds. Make spacious for him his grave, and grant him light within it.",
    englishTransliteration:
      "Allahummaghfir li-Abi Salamah, warfa‘ darajatahu fil-mahdiyyeen, wakhlufhu fi ‘aqibihi fil-ghaabireen, waghfir lana wa lahu ya Rabbal-‘aalameen, wafsah lahu fi qabrih, wa nawwir lahu feeh.",
  },
  "inna-lillahi-wa-inna-ilayhi-rajiun": {
    englishMeaning: "Indeed, to Allah we belong and to Him we shall return. O Allah, reward me for my affliction and replace it for me with something better.",
    englishTransliteration: "Inna lillahi wa inna ilayhi raaji‘oon, Allahumma'jurni fi museebati wakhluf li khayran minha.",
  },
  "bismillahi-allahumma-jannibna-al-shaytan": {
    englishMeaning: "In the name of Allah. O Allah, keep Satan away from us, and keep Satan away from what You provide us [with offspring].",
    englishTransliteration: "Bismillah, Allahumma jannibnash-shaytaana wa jannibish-shaytaana ma razaqtana.",
  },
  "rabbi-hab-li-min-ladunka-dhurriyyatan": {
    englishMeaning: "My Lord, grant me from Yourself good offspring; indeed, You are the Hearer of supplication.",
    englishTransliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibah, innaka Samee‘ud-du‘aa'.",
  },
  "rabbi-ijalni-muqim-al-salah": {
    englishMeaning: "My Lord, make me an establisher of prayer, and [also] from my offspring. Our Lord, and accept my supplication.",
    englishTransliteration: "Rabbij‘alni muqeemas-salaati wa min dhurriyyati, Rabbana wa taqabbal du‘aa'.",
  },
  "rabbana-hab-lana-min-azwajina": {
    englishMeaning: "Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous.",
    englishTransliteration: "Rabbana hab lana min azwaajina wa dhurriyyaatina qurrata a‘yunin waj‘alna lil-muttaqeena imaama.",
  },
  "dua-al-rukub": {
    englishMeaning: "Glory be to the One who has subjected this to us, and we could not have done it [by] ourselves. And indeed, to our Lord we will return.",
    englishTransliteration: "Subhaanal-ladhi sakhkhara lana haadha wa ma kunna lahu muqrineen, wa inna ila Rabbina lamunqaliboon.",
  },
  "ayibun-taibun-abidun": {
    englishMeaning: "Returning, repenting, worshipping, to our Lord we give praise.",
    englishTransliteration: "Aayiboona taa'iboona ‘aabidoona li-Rabbina haamidoon.",
  },
  "khuruj-min-al-manzil": {
    englishMeaning: "In the name of Allah, I place my trust in Allah, and there is no power and no strength except with Allah.",
    englishTransliteration: "Bismillah, tawakkaltu ‘alallah, wa la hawla wa la quwwata illa billah.",
  },
  "allahumma-inni-audhu-bika-an-adilla-aw-udall": {
    englishMeaning:
      "O Allah, I seek refuge in You from misguiding or being misguided, from slipping [into error] or being made to slip, from wronging or being wronged, and from behaving ignorantly or being treated ignorantly.",
    englishTransliteration: "Allahumma inni a‘oothu bika an adilla aw udall, aw azilla aw uzall, aw adhlima aw udhlam, aw ajhala aw yujhala ‘alayya.",
  },
  // No Master counterpart — englishMeaning reused verbatim from this app's
  // existing written-adhkar.ts "misc-5" entry (never invented); only the
  // transliteration is newly added here.
  "before-sleeping": {
    englishMeaning: "In Your name, O Allah, I die and I live.",
    englishTransliteration: "Bismika Allahumma amootu wa ahya.",
  },
  // No Master counterpart — englishMeaning reused verbatim from "misc-6".
  "upon-waking": {
    englishMeaning: "Praise be to Allah who gave us life after having caused us to die, and unto Him is the resurrection.",
    englishTransliteration: "Alhamdu lillahil-ladhi ahyaana ba‘da ma amaatana wa ilayhin-nushoor.",
  },
  // Master 11.3 marks this dua's SOURCE as still pending final confirmation
  // (not its wording, which is complete) — per this app's own existing
  // preference (see the Arabic-side comment on this id above), englishMeaning
  // reuses the already-verified written-adhkar.ts "misc-4" translation
  // rather than a fresh Master-side rendering of the same sentence.
  "after-eating": {
    englishMeaning: "Praise be to Allah who fed me this and provided it for me without any power or might on my part.",
    englishTransliteration: "Alhamdu lillahil-ladhi at‘amani haadha wa razaqaneehi min ghayri hawlin minni wa la quwwah.",
  },
  "after-wudu": {
    englishMeaning: "I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and Messenger.",
    englishTransliteration: "Ash-hadu an la ilaha illallahu wahdahu la shareeka lah, wa ash-hadu anna Muhammadan ‘abduhu wa rasooluh.",
  },
  "entering-mosque": {
    englishMeaning: "O Allah, open for me the doors of Your mercy.",
    englishTransliteration: "Allahummaftah li abwaaba rahmatik.",
  },
  "leaving-mosque": {
    englishMeaning: "O Allah, I ask You from Your bounty.",
    englishTransliteration: "Allahumma inni as'aluka min fadlik.",
  },
  "after-adhan": {
    englishMeaning:
      "O Allah, Lord of this perfect call and of the established prayer, grant Muhammad the intercession (al-waseelah) and the excellence (al-fadeelah), and raise him to the praiseworthy station that You have promised him.",
    englishTransliteration:
      "Allahumma Rabba haadhihid-da‘watit-taammah, was-salaatil-qaa'imah, aati Muhammadanil-waseelata wal-fadeelah, wab‘athhu maqaaman mahmoodanil-ladhi wa‘adtah.",
  },
  "before-food": {
    englishMeaning: "In the name of Allah.",
    englishTransliteration: "Bismillah.",
  },
  "forgot-tasmiyah": {
    englishMeaning: "In the name of Allah, at its beginning and its end.",
    englishTransliteration: "Bismillahi awwalahu wa aakhirah.",
  },
  "kaffarat-al-majlis": {
    englishMeaning: "Glory be to You, O Allah, and praise be to You; I bear witness that there is no god but You; I seek Your forgiveness and I turn to You in repentance.",
    englishTransliteration: "Subhaanakallahumma wa bihamdik, la ilaha illa ant, astaghfiruka wa atoobu ilayk.",
  },
  "sneezing-alhamdulillah": {
    englishMeaning: "All praise is due to Allah.",
    englishTransliteration: "Alhamdulillah.",
  },
  "yarhamuk-allah": {
    englishMeaning: "May Allah have mercy on you.",
    englishTransliteration: "Yarhamukallah.",
  },
  "yahdikum-allah": {
    englishMeaning: "May Allah guide you and set right your affairs.",
    englishTransliteration: "Yahdeekumullahu wa yuslihu baalakum.",
  },
  "when-wind-blows": {
    englishMeaning: "O Allah, I ask You for its good, the good within it, and the good it was sent with, and I seek refuge in You from its evil, the evil within it, and the evil it was sent with.",
    englishTransliteration: "Allahumma inni as'aluka khayraha, wa khayra ma feeha, wa khayra ma ursilat bih, wa a‘oothu bika min sharriha, wa sharri ma feeha, wa sharri ma ursilat bih.",
  },
  "rabbana-la-tuakhidhna": {
    englishMeaning: "Our Lord, do not hold us accountable if we forget or make a mistake.",
    englishTransliteration: "Rabbana la tu'aakhidhna in naseena aw akhta'na.",
  },
  "rabbana-wala-tahmil-alayna-isran": {
    englishMeaning: "Our Lord, and lay not upon us a burden like that which You laid upon those before us.",
    englishTransliteration: "Rabbana wa la tahmil ‘alayna isran kama hamaltahu ‘alal-ladheena min qablina.",
  },
  "rabbana-wala-tuhammilna": {
    englishMeaning: "Our Lord, and burden us not with that which we have no ability to bear.",
    englishTransliteration: "Rabbana wa la tuhammilna ma la taaqata lana bih.",
  },
  "rabbana-dhalamna-anfusana": {
    englishMeaning: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.",
    englishTransliteration: "Rabbana dhalamna anfusana wa in lam taghfir lana wa tarhamna lanakoonanna minal-khaasireen.",
  },
  "rabbana-hab-lana-min-ladunka-rahmatan": {
    englishMeaning: "Our Lord, grant us mercy from Yourself, and prepare for us right guidance in our affair.",
    englishTransliteration: "Rabbana hab lana min ladunka rahmatan wa hayyi' lana min amrina rashada.",
  },
  "rabbi-ishrah-li-sadri": {
    englishMeaning: "My Lord, expand for me my breast, and ease for me my task.",
    englishTransliteration: "Rabbishrah li sadri wa yassir li amri.",
  },
  "rabbi-zidni-ilman": {
    englishMeaning: "My Lord, increase me in knowledge.",
    englishTransliteration: "Rabbi zidni ‘ilma.",
  },
  "rabbi-ighfir-li-waliwalidayya": {
    englishMeaning: "My Lord, forgive me and my parents and the believers on the Day the reckoning is established.",
    englishTransliteration: "Rabbighfir li wa liwaalidayya wa lil-mu'mineena yawma yaqoomul-hisaab.",
  },
  "rabbi-inni-lima-anzalta": {
    englishMeaning: "My Lord, indeed I am, for whatever good You would send down to me, in need.",
    englishTransliteration: "Rabbi inni lima anzalta ilayya min khayrin faqeer.",
  },
  "rabbana-afrigh-alayna-sabran-tawaffana": {
    englishMeaning: "Our Lord, pour upon us patience and let us die as Muslims [in submission to You].",
    englishTransliteration: "Rabbana afrigh ‘alayna sabran wa tawaffana muslimeen.",
  },
  "rabbana-afrigh-alayna-sabran-thabbit": {
    englishMeaning: "Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.",
    englishTransliteration: "Rabbana afrigh ‘alayna sabran wa thabbit aqdaamana wansurna ‘alal-qawmil-kaafireen.",
  },
  "rabbana-la-tuzigh-qulubana": {
    englishMeaning: "Our Lord, let not our hearts deviate after You have guided us, and grant us mercy from Yourself; indeed, You are the Bestower.",
    englishTransliteration: "Rabbana la tuzigh quloobana ba‘da idh hadaytana wa hab lana min ladunka rahmah, innaka Antal-Wahhaab.",
  },
  "rabbana-taqabbal-minna": {
    englishMeaning: "Our Lord, accept [this] from us. Indeed, You are the Hearing, the Knowing.",
    englishTransliteration: "Rabbana taqabbal minna innaka Antas-Samee‘ul-‘Aleem.",
  },
  "rabbana-ighfir-lana-waliikhwanina": {
    englishMeaning: "Our Lord, forgive us and our brothers who preceded us in faith.",
    englishTransliteration: "Rabbanaghfir lana wa li-ikhwaaninal-ladheena sabaqoona bil-eemaan.",
  },
  "rabbana-alayka-tawakkalna": {
    englishMeaning: "Our Lord, upon You we have relied, and to You we have returned, and to You is the final destination.",
    englishTransliteration: "Rabbana ‘alayka tawakkalna wa ilayka anabna wa ilaykal-maseer.",
  },
  "rabbana-atmim-lana-nurana": {
    englishMeaning: "Our Lord, perfect for us our light and forgive us; indeed, You are over all things competent.",
    englishTransliteration: "Rabbana atmim lana noorana waghfir lana innaka ‘ala kulli shay'in Qadeer.",
  },
  "istiftah": {
    englishMeaning: "Glory be to You, O Allah, and praise be to You; blessed is Your name, and exalted is Your majesty; there is no god besides You.",
    englishTransliteration: "Subhaanakallahumma wa bihamdik, wa tabaarakasmuk, wa ta‘aala jadduk, wa la ilaha ghayruk.",
  },
  "ruku": {
    englishMeaning: "Glory be to my Lord, the Most Great.",
    englishTransliteration: "Subhaana Rabbiyal-‘Adheem.",
  },
  "sujud": {
    englishMeaning: "Glory be to my Lord, the Most High.",
    englishTransliteration: "Subhaana Rabbiyal-A‘la.",
  },
  "between-sajdatayn": {
    englishMeaning: "My Lord, forgive me.",
    englishTransliteration: "Rabbighfir li.",
  },
  "before-salam-audhu": {
    englishMeaning:
      "O Allah, I seek refuge in You from the punishment of Hell, from the punishment of the grave, from the trial of life and death, and from the evil of the trial of the False Messiah (al-Masih ad-Dajjal).",
    englishTransliteration: "Allahumma inni a‘oothu bika min ‘adhaabi jahannam, wa min ‘adhaabil-qabr, wa min fitnatil-mahya wal-mamaat, wa min sharri fitnatil-Maseehid-Dajjaal.",
  },
  "allahumma-aini-ala-dhikrik": {
    englishMeaning: "O Allah, help me to remember You, to thank You, and to worship You in the best manner.",
    englishTransliteration: "Allahumma a‘inni ‘ala dhikrika wa shukrika wa husni ‘ibaadatik.",
  },
  "allahumma-audhu-biridaka-min-sakhatik": {
    englishMeaning: "O Allah, I seek refuge in Your pleasure from Your displeasure, and in Your pardon from Your punishment, and I seek refuge in You from You. I cannot enumerate praise of You; You are as You have praised Yourself.",
    englishTransliteration: "Allahumma a‘oothu biridaaka min sakhatik, wa bimu‘aafaatika min ‘uqoobatik, wa a‘oothu bika mink, la uhsi thanaa'an ‘alayk, anta kama athnayta ‘ala nafsik.",
  },
  "allahumma-inni-asaluka-fil-al-khayrat": {
    englishMeaning: "O Allah, I ask You for the doing of good deeds, the abandoning of evil deeds, and the love of the poor, and that if You intend trial for Your servants, You take me to Yourself without being tried.",
    englishTransliteration: "Allahumma inni as'aluka fi‘lal-khayraat, wa tarkal-munkaraat, wa hubbal-masaakeen, wa idha aradta bi‘ibaadika fitnatan faqbidni ilayka ghayra maftoon.",
  },
  "allahumma-hasibni-hisaban-yasiran": {
    englishMeaning: "O Allah, call me to account with an easy reckoning.",
    englishTransliteration: "Allahumma haasibni hisaaban yaseera.",
  },
  "dua-al-istikharah": {
    englishMeaning:
      "O Allah, I seek Your guidance [in making a choice] by virtue of Your knowledge, and I seek ability by virtue of Your power, and I ask You of Your great bounty. For You are able and I am not, and You know and I do not, and You are the Knower of unseen things. O Allah, if You know that this matter is good for me in my religion, my livelihood, and the outcome of my affairs — or he said: in my present and future affairs — then decree it for me, make it easy for me, and then bless it for me. And if You know that this matter is bad for me in my religion, my livelihood, and the outcome of my affairs — or he said: in my present and future affairs — then turn it away from me, and turn me away from it, and decree for me what is good wherever it may be, and make me content with it.",
    englishTransliteration:
      "Allahumma inni astakheeruka bi‘ilmik, wa astaqdiruka biqudratik, wa as'aluka min fadlikal-‘adheem, fa'innaka taqdiru wa la aqdir, wa ta‘lamu wa la a‘lam, wa anta ‘allaamul-ghuyoob. Allahumma in kunta ta‘lamu anna haadhal-amra khayrun li fi deeni wa ma‘aashi wa ‘aaqibati amri - aw qaala: fi ‘aajili amri wa aajilih - faqdurhu li wa yassirhu li, thumma baarik li feeh, wa in kunta ta‘lamu anna haadhal-amra sharrun li fi deeni wa ma‘aashi wa ‘aaqibati amri - aw qaala: fi ‘aajili amri wa aajilih - fasrifhu ‘anni wasrifni ‘anh, waqdur liyal-khayra haythu kaan, thumma ardini bih.",
  },
  "allahumma-inni-audhu-bika-min-al-matham-wal-maghram": {
    englishMeaning: "O Allah, I seek refuge in You from sin and from debt.",
    englishTransliteration: "Allahumma inni a‘oothu bika minal-ma'thami wal-maghram.",
  },
  "allahumma-ikfini-bihalalika-an-haramik": {
    englishMeaning: "O Allah, suffice me with what You have made lawful, [keeping me] away from what You have made unlawful, and enrich me by Your bounty, so that I need no one other than You.",
    englishTransliteration: "Allahummakfini bihalaalika ‘an haraamik, wa aghnini bifadlika ‘amman siwaak.",
  },
  "allahumma-inni-asaluka-min-fadlika-warahmatik": {
    englishMeaning: "O Allah, I ask You from Your bounty and Your mercy, for none possesses them but You.",
    englishTransliteration: "Allahumma inni as'aluka min fadlika wa rahmatik, fa'innahu la yamlikuha illa ant.",
  },
  "ya-muqallib-al-qulub-thabbit-qalbi": {
    englishMeaning: "O Turner of hearts, make my heart firm upon Your religion.",
    englishTransliteration: "Ya Muqallibal-quloob, thabbit qalbi ‘ala deenik.",
  },
  "dhahaba-al-zama-wabtallat-al-uruq": {
    englishMeaning: "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.",
    englishTransliteration: "Dhahabaz-zama'u wabtallatil-‘urooqu wa thabatal-ajru in shaa' Allah.",
  },
  "allahumma-innaka-afuwwun-tuhibb-al-afw": {
    englishMeaning: "O Allah, You are Most Forgiving, and You love forgiveness, so forgive me.",
    englishTransliteration: "Allahumma innaka ‘afuwwun tuhibbul-‘afwa fa‘fu ‘anni.",
  },
  "talbiyah": {
    englishMeaning: "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Indeed, all praise, blessing, and sovereignty belong to You. You have no partner.",
    englishTransliteration: "Labbaykallahumma labbayk, labbayka la shareeka laka labbayk, innal-hamda wan-ni‘mata laka wal-mulk, la shareeka lak.",
  },
  "dhikr-al-safa-wal-marwah": {
    englishMeaning:
      "There is no god but Allah alone, with no partner. His is the dominion and His is all praise, and He is able to do all things. There is no god but Allah alone; He fulfilled His promise, gave victory to His servant, and defeated the confederate armies alone.",
    englishTransliteration:
      "La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamd, wa huwa ‘ala kulli shay'in qadeer, la ilaha illallahu wahdah, anjaza wa‘dah, wa nasara ‘abdah, wa hazamal-ahzaaba wahdah.",
  },
};

// English rendering of the count/source/occasion/note metadata — kept
// separate from MISC_ENGLISH_CONTENT above because it has a different
// provenance: the Master Content Library's own English Integration Layer
// covers ONLY englishMeaning/englishTransliteration (see its header at
// ASSETS/dithar_master_content_library.md — it never adds English count/
// source/takhrij fields), so there was no existing English value to copy
// for this metadata. Rather than leave it Arabic-only in English mode
// (the exact bug this pass fixes) or touch the Master file, every value
// below is a faithful English RENDERING of the SAME already-verified
// Arabic fact already sitting in `count_ar`/`source_ar`/`occasion_ar`/
// `note_ar` on the matching MISC_DUAS_BASE record — same collection, same
// hadith/ayah numbers, same companion narrator, same grading verdict,
// same occasion — using the standard English collection names and
// "graded sahih/hasan by X" phrasing already established in this app's
// own written-adhkar.ts (SHORT_SOURCE). Nothing here is a new source, a
// new grading, or a new attribution; it is the existing one in English.
// Additive and keyed by id exactly like MISC_ENGLISH_CONTENT, so the
// Arabic literals on MISC_DUAS_BASE are never touched by this layer.
const MISC_ENGLISH_METADATA: Record<
  string,
  { count_en?: string; source_en?: string; occasion_en?: string; note_en?: string }
> = {
  "rabbana-atina": { count_en: "No specific count", source_en: "The Noble Qur'an — Surah al-Baqarah, 2:201" },
  "allahumma-inni-asaluka-alhuda": { count_en: "No specific count", source_en: "Sahih Muslim (2721)" },
  "allahumma-ighfir-li-warhamni": { count_en: "No specific count", source_en: "Sahih Muslim" },
  "allahumma-ihdini-wasaddidni": { count_en: "No specific count", source_en: "Sahih Muslim" },
  "allahumma-aslih-li-dini": { count_en: "No specific count", source_en: "Sahih Muslim" },
  "allahumma-inni-asaluka-min-al-khayr-kullih": {
    count_en: "No specific count",
    source_en: "Sunan Ibn Majah (3846) — narrated by 'A'ishah (may Allah be pleased with her), graded sahih by al-Albani in Sahih Ibn Majah",
  },
  "allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah": {
    count_en: "No specific count",
    source_en:
      "Sunan Abi Dawud (5074), Sunan Ibn Majah (3871), and Musnad Ahmad (4785) — narrated by Abdullah ibn Umar (may Allah be pleased with both of them), chain graded sahih",
    note_en:
      "The commonly heard phrase 'O Allah, I ask You for pardon and well-being in this world and the Hereafter' is an approximate, non-literal merging of two sentences from this hadith; the full wording, as authentically established, is used here.",
  },
  "allahumma-iqsim-lana-min-khashyatik": { count_en: "No specific count", source_en: "Jami` at-Tirmidhi (3502), graded hasan by al-Tirmidhi" },
  "allahumma-bi-ilmika-al-ghayb": {
    count_en: "No specific count",
    source_en:
      "Sunan an-Nasa'i (1305) and Musnad Ahmad (18351) — narrated by Ammar ibn Yasir (may Allah be pleased with him), graded sahih by al-Albani",
  },
  "allahumma-inni-asaluka-al-thabat-fi-al-amr": {
    count_en: "No specific count",
    source_en:
      "Al-Mu'jam al-Kabir (al-Tabarani), Musnad Ahmad, and Sahih Ibn Hibban — narrated by Shaddad ibn Aws (may Allah be pleased with him), graded sahih by al-Albani in Silsilat al-Ahadith as-Sahihah (3228)",
  },
  "rabbi-aini-wala-tuin-alayya": { count_en: "No specific count", source_en: "Jami` at-Tirmidhi (3551), graded hasan sahih by al-Tirmidhi" },

  "sayyid-al-istighfar": {
    count_en: "As set by the hadith's own context, not a general daily count",
    source_en: "Sahih al-Bukhari (6306) — narrated by Shaddad ibn Aws (may Allah be pleased with him)",
  },
  "rabbi-ighfir-li-watub-alayya": {
    count_en: "Mentioned in the context of saying it often in a gathering, not an absolute daily count",
    source_en: "Abu Dawud (1516), al-Tirmidhi (3434), and Ibn Majah (3814) — narrated by Abdullah ibn Umar (may Allah be pleased with both of them)",
  },
  "allahumma-ighfir-li-khatiati-wajahli": {
    count_en: "No specific count",
    source_en: "Sahih al-Bukhari (6398) and Sahih Muslim — narrated by Abu Musa al-Ash'ari (may Allah be pleased with him)",
  },

  "audhu-bikalimatillah-al-tammat": { count_en: "Depends on the occasion; no general count is fixed", source_en: "Sahih Muslim" },
  "allahumma-inni-audhu-bika-min-al-ajz": {
    count_en: "No specific count",
    source_en: "Sahih Muslim (2706) — narrated by Anas ibn Malik (may Allah be pleased with him)",
  },
  "allahumma-inni-audhu-bika-min-jahd-al-bala": { count_en: "No specific count", source_en: "Sahih al-Bukhari and Sahih Muslim" },
  "allahumma-inni-audhu-bika-min-al-faqr": {
    count_en: "No specific count",
    source_en:
      "Sunan Abi Dawud (1544) and Sunan an-Nasa'i (5460, 5462) — narrated by Abu Hurairah (may Allah be pleased with him), graded sahih by al-Albani, Ibn Hibban, and al-Hakim",
  },
  "allahumma-inni-audhu-bika-min-sharri-samee": {
    count_en: "No specific count",
    source_en:
      "Sunan Abi Dawud (1551), Jami` at-Tirmidhi (3492), and Sunan an-Nasa'i (5444) — narrated by Shakal ibn Humayd (may Allah be pleased with him), graded sahih by al-Albani",
  },
  "allahumma-inni-audhu-bika-min-sharri-ma-amiltu": { count_en: "No specific count", source_en: "Sahih Muslim (2716)" },
  "allahumma-inni-audhu-bika-min-zawal-nimatik": { count_en: "No specific count", source_en: "Sahih Muslim (2739)" },
  "allahumma-inni-audhu-bika-min-al-bukhl-wal-jubn": { count_en: "No specific count", source_en: "Sahih al-Bukhari" },

  "dua-al-karb": {
    count_en: "No specific count",
    source_en: "Sahih al-Bukhari and Sahih Muslim — narrated by Abdullah ibn Abbas (may Allah be pleased with both of them)",
  },
  "la-ilaha-illa-anta-subhanaka": { count_en: "No specific count", source_en: "The Noble Qur'an — Surah al-Anbiya, 21:87" },
  "allahumma-inni-audhu-bika-min-al-hamm": { count_en: "No specific count", source_en: "Sahih al-Bukhari and Sahih Muslim" },
  "audhu-billahi-min-al-shaytan-al-rajim": {
    count_en: "Depends on the situation; not a fixed general count",
    source_en: "Established in the Sunnah",
    occasion_en: "When angry or experiencing Satan's whispers",
  },

  "allahumma-rabb-al-nas-adhhib-al-bas": { count_en: "No specific count", source_en: "Sahih al-Bukhari and Sahih Muslim" },
  "bismillahi-arqik": {
    count_en: "No specific count",
    source_en: "Sahih Muslim (2186) — narrated by Abu Sa'id al-Khudri (may Allah be pleased with him)",
  },
  "asalu-allah-al-adhim-an-yashfiyak": { count_en: "7 times when visiting the sick", source_en: "Abu Dawud (3106)" },
  "la-bas-tahurun-inshallah": { count_en: "No count", source_en: "Sahih al-Bukhari" },

  "dua-al-janaza": {
    count_en: "As said within the funeral prayer supplication",
    source_en: "Sahih Muslim (963) — narrated by Awf ibn Malik (may Allah be pleased with him)",
  },
  "allahumma-ighfir-li-abi-salama": { source_en: "Sahih Muslim" },
  "inna-lillahi-wa-inna-ilayhi-rajiun": { source_en: "Sahih Muslim" },

  "bismillahi-allahumma-jannibna-al-shaytan": { count_en: "Once, on the occasion", source_en: "Sahih al-Bukhari and Sahih Muslim" },
  "rabbi-hab-li-min-ladunka-dhurriyyatan": { source_en: "The Noble Qur'an — Surah Aal 'Imran, 3:38" },
  "rabbi-ijalni-muqim-al-salah": { source_en: "The Noble Qur'an — Surah Ibrahim, 14:40" },
  "rabbana-hab-lana-min-azwajina": { source_en: "The Noble Qur'an — Surah al-Furqan, 25:74" },

  "dua-al-rukub": { source_en: "Established in the Sunnah, within the supplication for riding and travel" },
  "ayibun-taibun-abidun": { source_en: "Sahih Muslim" },

  "khuruj-min-al-manzil": { count_en: "Once, when leaving", source_en: "Abu Dawud (5095), al-Tirmidhi (3426), and al-Nasa'i; graded sahih by al-Albani" },
  "allahumma-inni-audhu-bika-an-adilla-aw-udall": {
    count_en: "No specific count (once, when leaving)",
    source_en:
      "Sunan Abi Dawud (5094), Jami` at-Tirmidhi (3427), Sunan an-Nasa'i, Sunan Ibn Majah, and Musnad Ahmad — narrated by Umm Salamah (may Allah be pleased with her), graded hasan sahih by al-Tirmidhi and sahih by al-Albani",
    note_en:
      "A second, independent supplication from 'In the name of Allah, I place my trust in Allah...' (a different narration from Umm Salamah); also said when leaving the house.",
  },
  "before-sleeping": { source_en: "Sahih al-Bukhari 6324" },
  "upon-waking": { source_en: "Sahih al-Bukhari 6312" },
  "after-eating": { source_en: "Abu Dawud; Jami` at-Tirmidhi" },

  "after-wudu": { count_en: "Once, after wudu", source_en: "Sahih Muslim" },
  "entering-mosque": { count_en: "Upon entering", source_en: "Sahih Muslim" },
  "leaving-mosque": { count_en: "Upon leaving", source_en: "Sahih Muslim" },
  "after-adhan": { source_en: "Sahih al-Bukhari" },

  "before-food": { count_en: "Once", source_en: "Established in the Sunnah" },
  "forgot-tasmiyah": { count_en: "If forgotten [at the start]", source_en: "Al-Tirmidhi, graded hasan by a number of scholars" },

  "kaffarat-al-majlis": { source_en: "The Sunan collections, through multiple chains graded sahih/hasan by scholars" },
  "sneezing-alhamdulillah": { source_en: "Sahih al-Bukhari" },
  "yarhamuk-allah": { source_en: "Sahih al-Bukhari" },
  "yahdikum-allah": { source_en: "Sahih al-Bukhari" },

  "when-wind-blows": { source_en: "Sahih al-Bukhari and Sahih Muslim — narrated by 'A'ishah (may Allah be pleased with her)" },

  "rabbana-la-tuakhidhna": { source_en: "The Noble Qur'an — Surah al-Baqarah, 2:286" },
  "rabbana-wala-tahmil-alayna-isran": { source_en: "The Noble Qur'an — Surah al-Baqarah, 2:286" },
  "rabbana-wala-tuhammilna": { source_en: "The Noble Qur'an — Surah al-Baqarah, 2:286" },
  "rabbana-dhalamna-anfusana": { source_en: "The Noble Qur'an — Surah al-A'raf, 7:23" },
  "rabbana-hab-lana-min-ladunka-rahmatan": { source_en: "The Noble Qur'an — Surah al-Kahf, 18:10" },
  "rabbi-ishrah-li-sadri": { source_en: "The Noble Qur'an — Surah Ta-Ha, 20:25-26" },
  "rabbi-zidni-ilman": { source_en: "The Noble Qur'an — Surah Ta-Ha, 20:114" },
  "rabbi-ighfir-li-waliwalidayya": { source_en: "The Noble Qur'an — Surah Ibrahim, 14:41" },
  "rabbi-inni-lima-anzalta": { source_en: "The Noble Qur'an — Surah al-Qasas, 28:24" },
  "rabbana-afrigh-alayna-sabran-tawaffana": { source_en: "The Noble Qur'an — Surah al-A'raf, 7:126" },
  "rabbana-afrigh-alayna-sabran-thabbit": { source_en: "The Noble Qur'an — Surah al-Baqarah, 2:250" },
  "rabbana-la-tuzigh-qulubana": { source_en: "The Noble Qur'an — Surah Aal 'Imran, 3:8" },
  "rabbana-taqabbal-minna": { source_en: "The Noble Qur'an — Surah al-Baqarah, 2:127" },
  "rabbana-ighfir-lana-waliikhwanina": { source_en: "The Noble Qur'an — Surah al-Hashr, 59:10" },
  "rabbana-alayka-tawakkalna": { source_en: "The Noble Qur'an — Surah al-Mumtahanah, 60:4" },
  "rabbana-atmim-lana-nurana": { source_en: "The Noble Qur'an — Surah at-Tahrim, 66:8" },

  "istiftah": { source_en: "Authentically established hadiths on the opening supplication (istiftah)" },
  "before-salam-audhu": { source_en: "Sahih Muslim" },
  "allahumma-aini-ala-dhikrik": {
    source_en:
      "Abu Dawud (1522), al-Nasa'i, and Ibn Khuzaymah — narrated by Mu'adh ibn Jabal (may Allah be pleased with him), graded sahih by al-Albani",
  },
  "allahumma-audhu-biridaka-min-sakhatik": {
    count_en: "No specific count",
    source_en: "Sahih Muslim (486)",
    occasion_en: "In prostration (within the context of night prayer)",
  },
  "allahumma-inni-asaluka-fil-al-khayrat": {
    count_en: "No specific count",
    source_en: "Jami` at-Tirmidhi (3233), graded sahih li-ghayrihi (through corroborating chains) by al-Albani in Sahih al-Targhib (3192)",
    occasion_en: "A supplication mentioned in the context of prayer",
  },
  "allahumma-hasibni-hisaban-yasiran": {
    count_en: "No specific count",
    source_en: "Sahih al-Bukhari (6536) and Sahih Muslim (2876) — narrated by 'A'ishah (may Allah be pleased with her)",
    note_en:
      "The opening of the hadith in which 'A'ishah (may Allah be pleased with her) asked about the meaning of 'an easy reckoning'; the Prophet ﷺ replied: 'that his record be looked into and he be overlooked.' The sentence occurs within the context of his ﷺ prayer.",
  },

  "dua-al-istikharah": {
    count_en: "Once, as the supplication after the Istikharah prayer; no fixed repetition count for the dua itself",
    source_en: "Sahih al-Bukhari (6382) — narrated by Jabir ibn Abdullah (may Allah be pleased with both of them)",
    note_en:
      "The supplication is preceded by praying two non-obligatory rak'ahs, as stated in the hadith; the person substitutes 'this matter' with their actual need when supplicating, without changing the original wording.",
  },

  "allahumma-inni-audhu-bika-min-al-matham-wal-maghram": {
    count_en: "No specific count",
    source_en: "Sahih al-Bukhari (2397) and Sahih Muslim (589) — narrated by 'A'ishah (may Allah be pleased with her)",
  },
  "allahumma-ikfini-bihalalika-an-haramik": {
    count_en: "No specific count",
    source_en: "Jami` at-Tirmidhi (3563) — narrated by Ali ibn Abi Talib (may Allah be pleased with him), graded hasan by al-Albani",
  },
  "allahumma-inni-asaluka-min-fadlika-warahmatik": {
    count_en: "No specific count",
    source_en:
      "Al-Mu'jam al-Kabir (al-Tabarani) (10379) and Hilyat al-Awliya (Abu Nu'aym) — narrated by Abdullah ibn Mas'ud (may Allah be pleased with him), graded sahih by al-Albani in Silsilat al-Ahadith as-Sahihah (1543)",
  },

  "ya-muqallib-al-qulub-thabbit-qalbi": {
    count_en: "No specific count",
    source_en: "Jami` at-Tirmidhi (2140) — narrated by Umm Salamah (may Allah be pleased with her), graded hasan by al-Tirmidhi and sahih by al-Albani",
  },

  "dhahaba-al-zama-wabtallat-al-uruq": {
    occasion_en: "At the breaking of the fast",
    count_en: "Once, at the breaking of the fast; no other repetition count is established",
    source_en: "Sunan Abi Dawud (2357) — narrated by Abdullah ibn Umar (may Allah be pleased with both of them), graded hasan by al-Albani in Sahih Abi Dawud",
  },
  "allahumma-innaka-afuwwun-tuhibb-al-afw": {
    occasion_en: "Laylat al-Qadr — asked of the Prophet ﷺ about what to say on this night",
    count_en: "No specific count",
    source_en:
      "Jami` at-Tirmidhi (3513) and Ibn Majah (3850) — narrated by 'A'ishah (may Allah be pleased with her), graded hasan sahih by al-Tirmidhi and sahih by al-Albani",
  },
  "talbiyah": {
    occasion_en: "Upon entering the state of ihram for Hajj or Umrah",
    count_en: "As repeated during the Talbiyah throughout the rites; no fixed specific count",
    source_en: "Sahih al-Bukhari (1549) and Sahih Muslim (1184) — narrated by Abdullah ibn Umar (may Allah be pleased with both of them)",
  },
  "dhikr-al-safa-wal-marwah": {
    occasion_en: "At Safa and Marwah during the sa'i",
    count_en: "Three times, with supplication in between",
    source_en: "The hadith of Jabir (may Allah be pleased with him) describing the Prophet's ﷺ Hajj, narrated by Muslim",
    note_en: "This dhikr is established at the place mentioned, and is not turned into a general supplication for the sa'i outside this context.",
  },
};

export const MISC_DUAS: MiscDuaItem[] = MISC_DUAS_BASE.map((item) => {
  const en = MISC_ENGLISH_CONTENT[item.id];
  const meta = MISC_ENGLISH_METADATA[item.id];
  return { ...item, ...en, ...meta };
});

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

// Interface strings for the new library screens — Arabic-only, rendered
// regardless of the app's global language toggle (see MiscLibraryScreen's
// own note). The dua CONTENT itself now has an English layer (see
// `englishMeaning`/`englishTransliteration` above and `miscMeaningLabels`
// below), shown inline in the card only when the app language is English —
// these interface strings (screen titles, search, favorite/copy aria
// labels, etc.) are a separate, still-Arabic-only concern untouched by
// that addition.
export const miscLibraryLabels = {
  ar: {
    screenTitle: "الأذكار والأدعية",
    screenSubtitle: "أدعية وأذكار ثابتة من القرآن والسنة",
    searchPlaceholder: "ابحث في المكتبة...",
    searchAria: "بحث في الأذكار والأدعية",
    noResults: "لا توجد نتائج مطابقة",
    featuredTitle: "مختارات اليوم",
    itemsCount: (n: number) => `${n} ${n === 1 ? "دعاء" : "أدعية"}`,
    countLabel: "العدد",
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
  },
  en: {
    screenTitle: "Adhkar & Duas",
    screenSubtitle: "Established duas and adhkar from the Qur'an and Sunnah",
    searchPlaceholder: "Search the library...",
    searchAria: "Search Adhkar & Duas",
    noResults: "No matching results",
    featuredTitle: "Today's Selections",
    itemsCount: (n: number) => `${n} ${n === 1 ? "dua" : "duas"}`,
    countLabel: "Count",
    sourceLabelHadith: "Reference / Takhrij",
    sourceLabelQuran: "Source",
    occasionLabel: "Occasion",
    noteLabel: "Note",
    favoriteAria: "Add to favorites",
    unfavoriteAria: "Remove from favorites",
    copyAria: "Copy text",
    copiedToast: "Copied",
    comingSoon: "Coming soon",
    back: "Back",
  },
};

// Bilingual interface strings for the "Listen" card action and the inline
// Transliteration/Meaning section headings — kept separate from
// `miscLibraryLabels` above (which stays Arabic-only, unchanged) so this
// addition carries zero risk to that existing, already-shipped object.
// Ordinary UI chrome only (aria text, section headings) — never religious
// content; the actual englishMeaning/englishTransliteration values always
// come from the data layer above, never from here. The `en` heading strings
// are the ones actually shown (the inline section only renders when
// language === "en" — see MiscDuaCard); the `ar` strings exist purely so
// this stays a uniform bilingual lookup like every other labels object.
export const miscMeaningLabels = {
  ar: {
    ...dhikrLanguageLabels.ar,
    listenAria: "استماع",
    stopListenAria: "إيقاف الاستماع",
  },
  en: {
    ...dhikrLanguageLabels.en,
    listenAria: "Listen",
    stopListenAria: "Stop",
  },
};
