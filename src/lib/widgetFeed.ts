// Which published reminder items (and comments) the HOME-SCREEN WIDGET may
// show. The widget is read at a glance, in a small box drawn by the
// launcher, so it takes a stricter subset of the reminder pool
// (lib/reminderContent.ts); notifications and the in-app views are not
// affected by anything here.
//
// An item is left out of the widget when:
//   - it is a Wamdat Lataif verse — chosen for its tafsir insight, it is
//     often a fragment that is unclear without that insight, and the widget
//     only has room for the verse;
//   - its text is too long to read at a glance (WIDGET_MAX_TEXT_CHARS) —
//     the widget never cuts a religious text short;
//   - its text contains characters that do not render reliably in a
//     widget (widgetTextProblem);
//   - in English, it has no English meaning (it would be unreadable);
//   - it is one of the Hadiths listed in WIDGET_EXCLUDED_HADITHS;
//   - it is a dhikr virtue without its virtue text in the interface language
//     — on its own the widget would show a bare phrase (e.g. «سبحان الله»)
//     under the title «فضل الذكر» with the source of a virtue it never
//     shows; with it, the virtue is drawn labelled under the phrase
//     (widgetDetail);
//   - its wording awaits correction (WIDGET_WORDING_REVIEW).
// A comment is left out when it is long, or when it is the one generic dua
// line repeated under every dua.
//
// Native (reminders/DhikrWidgetProvider.kt) then measures each candidate at
// the widget's real size and only shows one that fits in full.
import type { ReminderItem } from "./reminderContent";
import type { EditorialComment } from "../data/widgetContent";
import type { Language } from "../theme/LanguageContext";

/** Longest text (characters, diacritics included) the widget is offered. */
export const WIDGET_MAX_TEXT_CHARS = 190;
/** Longest DITHAR comment the widget is offered. */
export const WIDGET_MAX_COMMENT_CHARS = 90;
/** The generic dua line shown under every dua — repetitive on a widget. */
export const GENERIC_DUA_COMMENT_ID = "theme:dua:legacy";

/**
 * Library Hadiths that are authentic and stay everywhere else, but are not
 * suited to a glance on the home screen — an editorial choice, by reason:
 */
export const WIDGET_EXCLUDED_HADITHS: Readonly<Record<string, "legal-ruling" | "needs-explanation" | "obscure-wording" | "fragment" | "seasonal">> = {
  // A legal ruling or etiquette detail, better read with its context.
  "hadith:27": "legal-ruling",
  "hadith:47": "legal-ruling",
  "hadith:55": "legal-ruling",
  "hadith:101": "legal-ruling",
  "hadith:134": "legal-ruling",
  "hadith:135": "legal-ruling",
  "hadith:136": "legal-ruling",
  "hadith:146": "legal-ruling",
  "hadith:151": "legal-ruling",
  "hadith:159": "legal-ruling",
  "hadith:164": "legal-ruling",
  "hadith:176": "legal-ruling",
  "hadith:177": "legal-ruling",
  "hadith:178": "legal-ruling",
  "hadith:179": "legal-ruling",
  "hadith:181": "legal-ruling",
  "hadith:186": "legal-ruling",
  // Its meaning depends on a scholar's explanation (kufr, nullified deeds, images, trials…).
  "hadith:61": "needs-explanation",
  "hadith:63": "needs-explanation",
  "hadith:76": "needs-explanation",
  "hadith:77": "needs-explanation",
  "hadith:78": "needs-explanation",
  "hadith:80": "needs-explanation",
  "hadith:85": "needs-explanation",
  "hadith:93": "needs-explanation",
  "hadith:99": "needs-explanation",
  "hadith:127": "needs-explanation",
  "hadith:128": "needs-explanation",
  "hadith:129": "needs-explanation",
  "hadith:150": "needs-explanation",
  "hadith:172": "needs-explanation",
  "hadith:190": "needs-explanation",
  "hadith:191": "needs-explanation",
  "hadith:195": "needs-explanation",
  "hadith:196": "needs-explanation",
  "hadith:197": "needs-explanation",
  // Words most readers won't know without a gloss (قتّات، لقست، تعس… انتكس، لا هامة ولا صفر، تربت يداك).
  "hadith:42": "obscure-wording",
  "hadith:60": "obscure-wording",
  "hadith:65": "obscure-wording",
  "hadith:160": "obscure-wording",
  "hadith:163": "obscure-wording",
  // Part of a longer report, or with the narrator's own doubt in the text.
  "hadith:110": "fragment",
  "hadith:166": "fragment",
  "hadith:175": "fragment",
  // Tied to one season.
  "hadith:143": "seasonal",
};

/**
 * Dhikr texts (data/tasbeeh-library.json) whose wording or vowelling has
 * slips, kept off the home screen until the text is corrected and reviewed
 * — the widget must never present a mis-vowelled dhikr under a Sahih
 * reference. They stay everywhere else, unchanged (the Tasbeeh counter and
 * voice matching read the same text).
 */
export const WIDGET_WORDING_REVIEW: Readonly<Record<string, string>> = {
  // «الْلَّهُم صَلِّي وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد»: misspelled, and the cited Muslim 408
  // records only the virtue («مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا»), not this
  // formula — so no correction can be verified against it; its wording is kept as it is.
  "virtue:9": "unverifiable wording",
};

const WAMDA_ID = /^lataif:w\d+$/;
/** A diacritic or Qur'anic mark with no letter before it: drawn on a dotted circle. */
const DETACHED_MARK = /(^|[\s«»"'(){}[\]،.:؛!؟-])[\u064B-\u065F\u0670\u06D6-\u06ED]/u;
/** Arabic presentation forms (except the ornate Qur'anic brackets ﴾ ﴿) and invisible direction/joiner controls. */
const FRAGILE_CHARS = /[\uFB50-\uFD3D\uFD40-\uFDFF\uFE70-\uFEFF\u200B-\u200F\u202A-\u202E\u2066-\u2069]/u;
const PAIRS: readonly [string, string][] = [
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["«", "»"],
  ["﴿", "﴾"],
];

/** Why a text can't be shown correctly in the widget, or null. */
export function widgetTextProblem(text: string): string | null {
  if (DETACHED_MARK.test(text)) return "detached-mark";
  if (FRAGILE_CHARS.test(text)) return "fragile-character";
  for (const [open, close] of PAIRS) {
    if (text.split(open).length !== text.split(close).length) return "unbalanced-bracket";
  }
  return null;
}

/** A dhikr virtue's virtue text in [language], for the widget's labelled line; "" for every other item. */
export function widgetDetail(item: ReminderItem, language: Language): string {
  if (item.category !== "virtue" || !item.evidence) return "";
  return (language === "en" ? item.evidence.en : item.evidence.ar)?.trim() ?? "";
}

export function isWidgetItem(item: ReminderItem, language: Language): boolean {
  if (WAMDA_ID.test(item.id) || item.id in WIDGET_EXCLUDED_HADITHS || item.id in WIDGET_WORDING_REVIEW) return false;
  if (item.category === "virtue") {
    const detail = widgetDetail(item, language);
    if (!detail || detail.length > WIDGET_MAX_TEXT_CHARS || item.textAr.length + detail.length > WIDGET_MAX_TEXT_CHARS * 1.5 || widgetTextProblem(detail)) return false;
  }
  if (item.textAr.length > WIDGET_MAX_TEXT_CHARS) return false;
  if (widgetTextProblem(item.textAr)) return false;
  if (language === "en" && !item.meaningEn) return false;
  return true;
}

export function isWidgetComment(comment: EditorialComment, language: Language): boolean {
  if (comment.id === GENERIC_DUA_COMMENT_ID) return false;
  const text = language === "en" ? comment.en : comment.ar;
  return text.length > 0 && text.length <= WIDGET_MAX_COMMENT_CHARS && !widgetTextProblem(text);
}
