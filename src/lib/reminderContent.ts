// What reminders, the widget and the full-screen reflection show — built
// ONLY from content the app ships and has reviewed; nothing here is
// written or generated:
//
//   dua     the written library's general-purpose duas (the Daily Picks
//           pool — situational duas are left out — plus a few general
//           ones listed in data/widgetContent.ts), and the source-checked
//           Qur'anic and Prophetic duas added there, each with its source.
//   hadith  the curated Hadith library (all graded sahih/hasan with
//           source), except the one entry whose grading is noted as
//           disputed and the longest texts that can't be read at a glance;
//           plus the source-checked Hadiths added in data/widgetContent.ts.
//   virtue  the Tasbeeh dhikr whose virtue has a citation (the audited
//           virtue_ar/virtue_en + source), i.e. the importance and merit of
//           dhikr.
//   poetry  carefully attributed Arabic poetry on faith and character
//           (data/widgetContent.ts) — always labelled as poetry with its
//           poet, or «يُنسب إلى…» where the attribution is uncertain.
//   lataif  Short, whole Qur'anic verses (data/widgetVerses.ts), and
//           Quranic Lataif: the Wamdat verses with their reflection (the
//           Home Screen's former Quranic Insight card), and the verses with
//           verbatim Tafsir al-Sa'di excerpts (data/quranLataif.ts).
//
// PUBLICATION: `reminderCandidates()` is everything; `reminderPool()` is
// what is published — only items (and comments) whose review status is
// "approved" (lib/contentReview.ts). Newly added content is pending until a
// reviewer approves it in the Religious Content Review screen.
//
// Every item keeps its evidence separate from DITHAR's own words: its
// `comments` (several short editorial comments, varied by style, chosen in
// turn so the same one doesn't keep coming back — lib/contentRotation.ts)
// are shown under their own label, never as part of the text.
import { MISC_DUAS } from "../data/misc-library";
import type { MiscDuaItem } from "../data/misc-library";
import { HADITHS, translateHadithGradeToEnglish, translateHadithReferenceToEnglish, translateHadithSourceToEnglish } from "../data/hadith";
import { dhikrItems, sourceAr as tasbeehSourceAr } from "../data/tasbeeh";
import { WAMDAT, getWamdaSourceCitation, getWamdaVerseReference, getWamdaVerseText } from "../data/wamdat";
import { QURAN_LATAIF } from "../data/quranLataif";
import { contentReviewVersion, isPublished } from "./contentReview";
import { DHIKR_REFLECTIONS, TASBEEH_REFLECTION_THEME } from "../data/dhikrReflections";
import type { ReflectionTheme } from "../data/dhikrReflections";
import {
  DHIKR_THEME_COMMENTS,
  DUA_CATEGORY_COMMENTS,
  ENRICHED_DUAS,
  ENRICHED_HADITHS,
  EXTRA_POOL_DUA_IDS,
  POEMS,
  inDefaultFeed,
  stripReflectionLabel,
} from "../data/widgetContent";
import type { DuaCommentGroup, EditorialComment, PoemAttribution } from "../data/widgetContent";
import { WIDGET_VERSES } from "../data/widgetVerses";
import { dailyPicksPool } from "./dailyPicks";
import type { Language } from "../theme/LanguageContext";

export type ReminderCategory = "dua" | "hadith" | "virtue" | "poetry" | "lataif";
export const REMINDER_CATEGORIES: readonly ReminderCategory[] = ["dua", "hadith", "virtue", "poetry", "lataif"];

/** Finer than the category: what the text IS, for its label (a Qur'anic dua is labelled as Qur'an). */
export type ReminderKind = "quran-dua" | "dua" | "hadith" | "virtue" | "poetry" | "quran" | "lataif";

/**
 * A text shown beside the main one, and where it comes from. `kind` decides
 * its label: Qur'an, Hadith/Sunnah, a verbatim tafsir excerpt, or a Lataif
 * reflection that cites a tafsir work (a summary, not a quotation).
 */
export interface ReminderEvidence {
  kind: "quran" | "hadith" | "tafsir" | "insight";
  ar: string;
  en?: string;
  sourceAr: string;
  sourceEn?: string;
}

export interface ReminderItem {
  /** Stable: "<category>:<library id>". */
  id: string;
  category: ReminderCategory;
  kind: ReminderKind;
  /** The Arabic text shown large — never altered. Poetry: one verse per line. */
  textAr: string;
  /** Its established English meaning, when there is one. */
  meaningEn?: string;
  /** Where the text itself comes from (shown under it); for poetry, the poet or «يُنسب إلى…». */
  sourceAr: string;
  sourceEn?: string;
  /** A Hadith's grading, on its own (it is also part of the source line). */
  gradeAr?: string;
  gradeEn?: string;
  /** Poetry only: how certain the attribution is. */
  attribution?: PoemAttribution;
  /** A verified supporting text (a dhikr's virtue, a verse), when there is one. */
  evidence?: ReminderEvidence;
  /** A longer, labelled DITHAR reflection for the in-app view (dhikr themes). */
  reflection?: Record<Language, string>;
  /** Short DITHAR comments — one is shown at a time, in turn. */
  comments: EditorialComment[];
  theme: ReflectionTheme | "hadith" | "poetry" | "lataif";
}

/** Hadith texts longer than this don't fit a reminder at a glance. */
const MAX_HADITH_CHARS = 420;

function virtueEvidence(tasbeehId: number): ReminderEvidence | undefined {
  const item = dhikrItems.find((d) => d.id === tasbeehId);
  const sourceAr = tasbeehSourceAr[tasbeehId];
  if (!item || !item.virtue_ar || !sourceAr) return undefined;
  return { kind: "hadith", ar: item.virtue_ar, en: item.virtue_en || undefined, sourceAr, sourceEn: item.source || undefined };
}

function quranEvidence(wamdaId: number): ReminderEvidence | undefined {
  const entry = WAMDAT.find((w) => w.id === wamdaId);
  if (!entry) return undefined;
  return { kind: "quran", ar: getWamdaVerseText(entry), sourceAr: getWamdaVerseReference(entry), sourceEn: undefined };
}

/** The verified evidence a reflection theme points to (data/dhikrReflections.ts). */
export function evidenceForTheme(theme: ReflectionTheme): ReminderEvidence | undefined {
  const e = DHIKR_REFLECTIONS[theme].evidence;
  return e.kind === "virtue" ? virtueEvidence(e.tasbeehId) : quranEvidence(e.wamdaId);
}

function duaCommentGroup(item: MiscDuaItem): DuaCommentGroup {
  const key = item.categories[0];
  return key in DUA_CATEGORY_COMMENTS ? (key as DuaCommentGroup) : "general";
}

/** The dua reflection the app shipped before per-category comments — the fallback while those are pending review. */
const LEGACY_DUA_COMMENT: EditorialComment = { id: "theme:dua:legacy", style: "reflection", ...DHIKR_REFLECTIONS.dua.reflection };

function libraryDuaItems(): ReminderItem[] {
  const pool = dailyPicksPool(MISC_DUAS);
  const extra = MISC_DUAS.filter((d) => EXTRA_POOL_DUA_IDS.includes(d.id) && !pool.includes(d));
  return [...pool, ...extra].map((d) => ({
    id: `dua:${d.id}`,
    category: "dua" as const,
    kind: d.isQuranic ? ("quran-dua" as const) : ("dua" as const),
    textAr: d.text_ar,
    meaningEn: d.englishMeaning || undefined,
    sourceAr: d.source_ar ?? "",
    sourceEn: d.source_en || undefined,
    evidence: evidenceForTheme("dua"),
    comments: [...DUA_CATEGORY_COMMENTS[duaCommentGroup(d)], LEGACY_DUA_COMMENT],
    theme: "dua" as const,
  }));
}

function enrichedDuaItems(): ReminderItem[] {
  return ENRICHED_DUAS.filter((d) => inDefaultFeed(d.review)).map((d) => ({
    id: `dua:${d.id}`,
    category: "dua" as const,
    kind: d.kind === "quran" ? ("quran-dua" as const) : ("dua" as const),
    textAr: d.textAr,
    meaningEn: d.meaningEn,
    sourceAr: d.sourceAr,
    sourceEn: d.sourceEn,
    evidence: d.kind === "quran" ? undefined : evidenceForTheme("dua"),
    // The item's own comments first, then its kind's — so even these rotate through several.
    comments: [...d.comments, ...DUA_CATEGORY_COMMENTS[d.kind === "quran" ? "quran" : "general"]],
    theme: "dua" as const,
  }));
}

function libraryHadithItems(): ReminderItem[] {
  return HADITHS.filter((h) => !h.gradeAr.includes("خلاف") && h.textAr.length <= MAX_HADITH_CHARS).map((h) => {
    const sourceEn = [translateHadithSourceToEnglish(h.sourceAr), translateHadithReferenceToEnglish(h.referenceAr)].filter(Boolean).join(" ");
    const gradeEn = translateHadithGradeToEnglish(h.gradeAr);
    const comments: EditorialComment[] = h.reflectionAr
      ? [{ id: `hadith:${h.id}:reflection`, style: "reflection", ar: stripReflectionLabel(h.reflectionAr, "ar"), en: stripReflectionLabel(h.reflectionEn || h.reflectionAr, "en") }]
      : [];
    return {
      id: `hadith:${h.id}`,
      category: "hadith" as const,
      kind: "hadith" as const,
      textAr: h.textAr,
      meaningEn: h.textEn || undefined,
      sourceAr: `${h.sourceAr} (${h.referenceAr}) — ${h.gradeAr}`,
      sourceEn: sourceEn ? `${sourceEn}${gradeEn ? ` — ${gradeEn}` : ""}` : undefined,
      gradeAr: h.gradeAr,
      gradeEn: gradeEn || undefined,
      comments,
      theme: "hadith" as const,
    };
  });
}

function enrichedHadithItems(): ReminderItem[] {
  return ENRICHED_HADITHS.filter((h) => inDefaultFeed(h.review) && h.textAr.length <= MAX_HADITH_CHARS).map((h) => ({
    id: `hadith:${h.id}`,
    category: "hadith" as const,
    kind: "hadith" as const,
    textAr: h.textAr,
    meaningEn: h.meaningEn,
    sourceAr: `${h.sourceAr} (${h.referenceAr}) — ${h.gradeAr}`,
    sourceEn: `${h.referenceEn} — ${h.gradeEn}`,
    gradeAr: `${h.gradeAr} (${h.gradingSourceAr})`,
    gradeEn: `${h.gradeEn} (${h.gradingSourceEn})`,
    comments: h.comments,
    theme: "hadith" as const,
  }));
}

function virtueItems(): ReminderItem[] {
  return dhikrItems.flatMap((d) => {
    const evidence = virtueEvidence(d.id);
    if (!evidence) return [];
    const theme = TASBEEH_REFLECTION_THEME[d.id] ?? "tasbih";
    return [
      {
        id: `virtue:${d.id}`,
        category: "virtue" as const,
        kind: "virtue" as const,
        textAr: d.dhikr_ar,
        meaningEn: d.dhikr_en || undefined,
        sourceAr: evidence.sourceAr,
        sourceEn: evidence.sourceEn,
        evidence,
        reflection: DHIKR_REFLECTIONS[theme].reflection,
        comments: DHIKR_THEME_COMMENTS[theme],
        theme,
      },
    ];
  });
}

/** Wamdat entries citing "scientific/medical miracle" works need scholarly review before they are published. */
export function wamdaCitesMiracleClaims(source: string): boolean {
  return source.includes("الإعجاز");
}

function wamdatItems(): ReminderItem[] {
  return WAMDAT.map((w) => ({
    id: `lataif:w${w.id}`,
    category: "lataif" as const,
    kind: "lataif" as const,
    textAr: getWamdaVerseText(w),
    sourceAr: getWamdaVerseReference(w),
    evidence: { kind: "insight" as const, ar: w.insightAr, en: w.insightEn || undefined, sourceAr: w.source, sourceEn: getWamdaSourceCitation(w, "en") },
    comments: [],
    theme: "lataif" as const,
  }));
}

function saadiLataifItems(): ReminderItem[] {
  return QURAN_LATAIF.filter((l) => inDefaultFeed(l.review)).map((l) => ({
    id: `lataif:${l.id}`,
    category: "lataif" as const,
    kind: "lataif" as const,
    textAr: l.verseAr,
    meaningEn: l.verseEn,
    // An excerpt (part of the verse) says so — never shown as if it were the whole verse.
    sourceAr: `القرآن الكريم — ${l.excerpt ? "من " : ""}${l.verseRefAr}`,
    sourceEn: `The Qur'an — ${l.excerpt ? "from " : ""}${l.verseRefEn}`,
    evidence: { kind: "tafsir" as const, ar: l.tafsirAr, sourceAr: `${l.tafsirSourceAr} — ${l.tafsirRef}`, sourceEn: `${l.tafsirSourceEn} — ${l.tafsirRef}` },
    comments: l.comments,
    theme: "lataif" as const,
  }));
}

/** Short, whole verses (in the Qur'an category, labelled as Qur'an — not as a Lataif reflection). */
function verseItems(): ReminderItem[] {
  return WIDGET_VERSES.map((v) => ({
    id: `lataif:verse:${v.id}`,
    category: "lataif" as const,
    kind: "quran" as const,
    textAr: v.textAr,
    meaningEn: v.meaningEn,
    sourceAr: v.sourceAr,
    sourceEn: v.sourceEn,
    comments: v.comments,
    theme: "lataif" as const,
  }));
}

function poetryItems(): ReminderItem[] {
  return POEMS.filter((p) => inDefaultFeed(p.review)).map((p) => ({
    id: `poetry:${p.id}`,
    category: "poetry" as const,
    kind: "poetry" as const,
    textAr: p.verses.join("\n"),
    meaningEn: p.meaningEn,
    sourceAr: p.attributionAr,
    sourceEn: p.attributionEn,
    attribution: p.attribution,
    evidence: p.evidence ? { kind: p.evidence.kind, ar: p.evidence.ar, en: p.evidence.en, sourceAr: p.evidence.sourceAr, sourceEn: p.evidence.sourceEn } : undefined,
    comments: p.comments,
    theme: "poetry" as const,
  }));
}

let candidates: ReminderItem[] | null = null;

/** Every candidate item, all categories, published or not (the review screen reads this). */
export function reminderCandidates(): ReminderItem[] {
  return (candidates ??= [
    ...libraryDuaItems(),
    ...enrichedDuaItems(),
    ...libraryHadithItems(),
    ...enrichedHadithItems(),
    ...virtueItems(),
    ...poetryItems(),
    ...verseItems(),
    ...wamdatItems(),
    ...saadiLataifItems(),
  ]);
}

let published: { version: number; items: ReminderItem[] } | null = null;

/**
 * The PUBLISHED pool: approved items only, each with only its approved
 * comments. Rebuilt whenever a review decision changes.
 */
export function reminderPool(): ReminderItem[] {
  const version = contentReviewVersion();
  if (published?.version === version) return published.items;
  const items = reminderCandidates()
    .filter((item) => isPublished(item.id))
    .map((item) => {
      const comments = item.comments.filter((c) => isPublished(c.id));
      // The legacy dua line is only a fallback: shown while none of the dua's newer comments is approved.
      const own = comments.filter((c) => c.id !== LEGACY_DUA_COMMENT.id);
      // A dhikr theme's longer reflection is published on its own decision too.
      const reflection = item.reflection && item.category === "virtue" && !isPublished(`reflection:theme:${item.theme}`) ? undefined : item.reflection;
      return { ...item, reflection, comments: own.length > 0 ? own : comments };
    });
  published = { version, items };
  return items;
}

/** A published item by id. */
export function findReminderItem(id: string): ReminderItem | undefined {
  return reminderPool().find((item) => item.id === id);
}

/** Any candidate by id, published or not (Favorites already saved, the review screen). */
export function findReminderCandidate(id: string): ReminderItem | undefined {
  return reminderCandidates().find((item) => item.id === id);
}

/** A background that suits the item's theme, or "auto". */
export function suggestedBackground(item: ReminderItem): string {
  return item.theme === "hadith" || item.theme === "poetry" || item.theme === "lataif" ? "auto" : DHIKR_REFLECTIONS[item.theme].background;
}
