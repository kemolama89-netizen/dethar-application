// The Religious Content Review screen's data — read from the SAME sources
// the widgets, reminders and the startup overlay use (no separate,
// hand-maintained list that could drift from what is live):
//
//   reminderCandidates()        every widget/reminder item, published or not
//   each item's comments        DITHAR's editorial comments
//   DHIKR_REFLECTIONS           the longer dhikr reflections
//   STARTUP_HADITH              the startup overlay's narration
//
// For each it gathers the source metadata, where the text is stored, where
// it is used, the warnings a reviewer should see, and near-duplicates.
// Review decisions themselves live in lib/contentReview.ts.
import { HADITHS } from "../data/hadith";
import type { HadithEntry } from "../data/hadith";
import { MISC_DUAS } from "../data/misc-library";
import { WAMDAT } from "../data/wamdat";
import { dhikrItems } from "../data/tasbeeh";
import { DHIKR_REFLECTIONS } from "../data/dhikrReflections";
import type { ReflectionTheme } from "../data/dhikrReflections";
import { DERIVED_IN_BOOK, ENRICHED_DUAS, ENRICHED_HADITHS, POEMS } from "../data/widgetContent";
import type { EditorialComment } from "../data/widgetContent";
import { QURAN_LATAIF } from "../data/quranLataif";
import { WIDGET_VERSES, WIDGET_VERSE_SOURCE_CHECK } from "../data/widgetVerses";
import { STARTUP_HADITH } from "../data/startupHadith";
import { dailyPicksPool } from "./dailyPicks";
import { reminderCandidates } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";
import { STARTUP_HADITH_REVIEW_ID, defaultReviewStatus, newContentIds, reviewStatusOf, getReviewRecord } from "./contentReview";
import type { ReviewStatus } from "./contentReview";

export type ContentType = "quran" | "lataif" | "hadith" | "dua" | "virtue" | "poetry" | "reflection";

export const CONTENT_TYPES: readonly ContentType[] = ["quran", "lataif", "hadith", "dua", "virtue", "poetry", "reflection"];

export type UsageKey = "widget" | "notifications" | "reflection-screen" | "favorites" | "written-library" | "daily-picks" | "hadith-library" | "home-legacy" | "startup-overlay" | "tasbeeh";

export type WarningKey =
  | "missing-source"
  | "missing-url"
  | "derived-url"
  | "missing-grade"
  | "uncertain-attribution"
  | "disputed-attribution"
  | "unverified-translation"
  | "translation-source-unknown"
  | "no-english"
  | "paraphrased-tafsir"
  | "miracle-claim"
  | "number-check"
  | "scholar-review";

export interface CatalogItem {
  /** The review id (= the content id used by widgets/reminders). */
  id: string;
  type: ContentType;
  /** Contains Qur'anic text (a verse, a Qur'anic dua). */
  quranic: boolean;
  textAr: string;
  textEn?: string;
  /** A second text shown with it: a tafsir excerpt, a Lataif reflection, a dhikr's virtue Hadith. */
  supportAr?: string;
  supportEn?: string;
  supportLabel?: "tafsir" | "insight" | "virtue" | "evidence";
  sourceName?: string;
  reference?: string;
  url?: string;
  grade?: string;
  gradedBy?: string;
  narrator?: string;
  verseRef?: string;
  tafsirSource?: string;
  tafsirRef?: string;
  tafsirUrl?: string;
  poet?: string;
  attributionConfidence?: "established" | "attributed" | "disputed";
  translationSource?: string;
  /** Where the text lives in the project. */
  storage: string;
  usage: UsageKey[];
  /** Comments: the items they accompany. */
  attachedTo?: string[];
  origin: "existing" | "new";
  defaultStatus: ReviewStatus;
  /** A reviewer note carried in the data itself (e.g. a reference number to confirm). */
  dataNote?: string;
  warnings: WarningKey[];
  /** Lower-cased searchable text: wording, source, narrator, poet, reference. */
  haystack: string;
}

const REMINDER_USAGE: UsageKey[] = ["widget", "notifications", "reflection-screen", "favorites"];

const enrichedHadith = new Map(ENRICHED_HADITHS.map((h) => [`hadith:${h.id}`, h]));
const enrichedDua = new Map(ENRICHED_DUAS.map((d) => [`dua:${d.id}`, d]));
const poems = new Map(POEMS.map((p) => [`poetry:${p.id}`, p]));
const lataif = new Map(QURAN_LATAIF.map((l) => [`lataif:${l.id}`, l]));

function libraryHadith(id: string): HadithEntry | undefined {
  const n = Number(id.slice("hadith:".length));
  return Number.isFinite(n) ? HADITHS.find((h) => h.id === n) : undefined;
}

function itemType(item: ReminderItem): ContentType {
  if (item.category === "dua") return "dua";
  if (item.category === "hadith") return "hadith";
  if (item.category === "virtue") return "virtue";
  if (item.category === "poetry") return "poetry";
  if (item.kind === "quran") return "quran";
  return "lataif";
}

function baseItem(item: ReminderItem): CatalogItem {
  const origin = newContentIds().has(item.id) ? "new" : "existing";
  return {
    id: item.id,
    type: itemType(item),
    quranic: item.kind === "quran-dua" || item.category === "lataif",
    textAr: item.textAr,
    textEn: item.meaningEn,
    sourceName: item.sourceAr,
    storage: "",
    usage: [...REMINDER_USAGE],
    origin,
    defaultStatus: defaultReviewStatus(item.id),
    warnings: [],
    haystack: "",
  };
}

function describe(item: ReminderItem): CatalogItem {
  const c = baseItem(item);
  const [, rawId] = item.id.split(/:(.*)/s);
  if (item.category === "hadith") {
    const added = enrichedHadith.get(item.id);
    if (added) {
      Object.assign(c, {
        sourceName: added.sourceAr,
        reference: added.referenceAr,
        url: added.url,
        grade: added.gradeAr,
        gradedBy: added.gradingSourceAr,
        narrator: added.narratorAr,
        translationSource: added.translation.source,
        storage: `src/data/widgetContent.ts → ENRICHED_HADITHS (${added.id})`,
        dataNote: added.review.note,
      });
      if (DERIVED_IN_BOOK.has(added.id)) c.warnings.push("derived-url");
      if (added.review.note) c.warnings.push("number-check");
      if (!added.translation.reviewed) c.warnings.push("unverified-translation");
    } else {
      const h = libraryHadith(item.id);
      Object.assign(c, {
        sourceName: h?.sourceAr,
        reference: h?.referenceAr,
        grade: h?.gradeAr,
        gradedBy: h?.gradingSourceAr,
        narrator: h?.narratorAr,
        translationSource: h?.textEn ? "Hadith library's own English (source not recorded)" : undefined,
        storage: `ASSETS/dithar_hadith_library_final.json → hadiths (id ${rawId})`,
      });
      c.usage.push("hadith-library", "home-legacy");
      if (!c.url) c.warnings.push("missing-url");
      if (h?.textEn) c.warnings.push("translation-source-unknown");
    }
    if (!c.grade) c.warnings.push("missing-grade");
  } else if (item.category === "dua") {
    const added = enrichedDua.get(item.id);
    if (added) {
      Object.assign(c, {
        sourceName: added.sourceAr,
        url: added.url,
        verseRef: added.kind === "quran" ? added.sourceAr : undefined,
        translationSource: added.translation.source,
        storage: `src/data/widgetContent.ts → ENRICHED_DUAS (${added.id})`,
        dataNote: added.review.note,
      });
      if (!added.translation.reviewed) c.warnings.push("unverified-translation");
    } else {
      const d = MISC_DUAS.find((x) => x.id === rawId);
      Object.assign(c, {
        sourceName: d?.source_ar,
        narrator: d?.narrator_ar,
        verseRef: d?.isQuranic ? d.source_ar : undefined,
        translationSource: d?.englishMeaning ? "Written library's own English (source not recorded)" : undefined,
        storage: `src/data/misc-library.ts → MISC_DUAS (${rawId})`,
      });
      c.usage.push("written-library");
      if (dailyPicksPool(MISC_DUAS).some((x) => x.id === rawId)) c.usage.push("daily-picks");
      if (!d?.isQuranic) c.warnings.push("missing-url");
      if (d?.englishMeaning) c.warnings.push("translation-source-unknown");
    }
  } else if (item.category === "virtue") {
    const d = dhikrItems.find((x) => String(x.id) === rawId);
    Object.assign(c, {
      supportAr: item.evidence?.ar,
      supportEn: item.evidence?.en,
      supportLabel: "virtue",
      sourceName: item.evidence?.sourceAr,
      translationSource: d?.virtue_en ? "Tasbeeh library's own English (source not recorded)" : undefined,
      storage: `src/data/tasbeeh-library.json (id ${rawId}) + src/data/tasbeeh.ts (sources)`,
    });
    c.usage.push("tasbeeh");
    c.warnings.push("missing-url");
    if (d?.virtue_en) c.warnings.push("translation-source-unknown");
  } else if (item.category === "poetry") {
    const p = poems.get(item.id)!;
    Object.assign(c, {
      textAr: p.verses.join("\n"),
      sourceName: p.attributionAr,
      poet: p.attributionAr,
      attributionConfidence: p.attribution,
      url: p.url,
      supportAr: p.evidence?.ar,
      supportEn: p.evidence?.en,
      supportLabel: p.evidence ? "evidence" : undefined,
      translationSource: p.translation.source,
      storage: `src/data/widgetContent.ts → POEMS (${p.id})`,
    });
    if (p.attribution === "attributed") c.warnings.push("uncertain-attribution");
    if (p.attribution === "disputed") c.warnings.push("disputed-attribution");
    if (!p.translation.reviewed) c.warnings.push("unverified-translation");
  } else if (item.kind === "quran") {
    const v = WIDGET_VERSES.find((x) => `lataif:verse:${x.id}` === item.id)!;
    Object.assign(c, {
      verseRef: v.sourceAr,
      url: v.url,
      translationSource: "Saheeh International (quran.com translation 20)",
      storage: `src/data/widgetVerses.ts → WIDGET_VERSES (${v.id})`,
      dataNote: `Checked against ${WIDGET_VERSE_SOURCE_CHECK}; only the waqf marks were removed.`,
    });
  } else {
    const added = lataif.get(item.id);
    if (added) {
      Object.assign(c, {
        verseRef: added.verseRefAr,
        url: added.verseUrl,
        sourceName: `القرآن الكريم — ${added.verseRefAr}`,
        supportAr: added.tafsirAr,
        supportLabel: "tafsir",
        tafsirSource: added.tafsirSourceAr,
        tafsirRef: added.tafsirRef,
        tafsirUrl: added.tafsirUrl,
        translationSource: `${added.verseEnSource} (the verse); the tafsir has no verified English translation here`,
        storage: `src/data/quranLataif.ts → QURAN_LATAIF (${added.id})`,
      });
    } else {
      const w = WAMDAT.find((x) => `lataif:w${x.id}` === item.id);
      Object.assign(c, {
        verseRef: item.sourceAr,
        supportAr: w?.insightAr,
        supportEn: w?.insightEn,
        supportLabel: "insight",
        tafsirSource: w?.source,
        translationSource: w?.insightEn ? "Wamdat's own English rendering of the reflection (not a Qur'an translation)" : undefined,
        storage: `src/data/wamdat.ts → WAMDAT (id ${w?.id})`,
      });
      c.usage.push("home-legacy");
      c.warnings.push("paraphrased-tafsir", "missing-url");
      if (w?.source.includes("الإعجاز")) c.warnings.push("miracle-claim");
      if (!item.meaningEn) c.warnings.push("no-english");
    }
  }
  if (!c.sourceName) c.warnings.push("missing-source");
  if (c.origin === "new") c.warnings.push("scholar-review");
  return c;
}

function commentItem(comment: EditorialComment, attachedTo: string[], storage: string): CatalogItem {
  const origin = newContentIds().has(comment.id) ? "new" : "existing";
  return {
    id: comment.id,
    type: "reflection",
    quranic: false,
    textAr: comment.ar,
    textEn: comment.en,
    sourceName: "DITHAR — تأمّل تحريري (ليس نصًّا مأثورًا ولا تفسيرًا)",
    translationSource: "DITHAR's own English (editorial)",
    storage,
    usage: ["widget", "notifications", "reflection-screen", "favorites"],
    attachedTo,
    origin,
    defaultStatus: defaultReviewStatus(comment.id),
    warnings: [],
    haystack: "",
  };
}

function commentStorage(id: string): string {
  if (id.startsWith("widget-verse:")) return "src/data/widgetVerses.ts (comments)";
  if (id.startsWith("lataif:")) return "src/data/quranLataif.ts (comments)";
  if (id.startsWith("theme:dua:legacy")) return "src/data/dhikrReflections.ts → DHIKR_REFLECTIONS.dua";
  if (id.startsWith("theme:") || id.startsWith("dua-cat:")) return "src/data/widgetContent.ts (DHIKR_THEME_COMMENTS / DUA_CATEGORY_COMMENTS)";
  if (/^hadith:\d+:reflection$/.test(id)) return "ASSETS/dithar_hadith_library_final.json → reflectionAr/reflectionEn";
  return "src/data/widgetContent.ts (item comments)";
}

function startupItem(): CatalogItem {
  const h = STARTUP_HADITH;
  return {
    id: STARTUP_HADITH_REVIEW_ID,
    type: "hadith",
    quranic: false,
    textAr: h.textAr,
    textEn: h.meaningEn,
    sourceName: h.sourceAr,
    reference: h.referenceAr,
    url: h.url,
    grade: h.gradeAr,
    gradedBy: h.gradingSourceAr,
    narrator: h.narratorAr,
    translationSource: h.translationSource,
    storage: "src/data/startupHadith.ts → STARTUP_HADITH (mirrors ENRICHED_HADITHS tirmidhi-3377; startupOverlay.test.ts checks it)",
    usage: ["startup-overlay"],
    origin: "new",
    defaultStatus: defaultReviewStatus(STARTUP_HADITH_REVIEW_ID),
    dataNote: h.note,
    warnings: ["unverified-translation", "scholar-review"],
    haystack: "",
  };
}

export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let catalogCache: CatalogItem[] | null = null;

/** Every reviewable item (texts are static; statuses are read live). */
export function contentCatalog(): CatalogItem[] {
  if (catalogCache) return catalogCache;
  const items: CatalogItem[] = [];
  const comments = new Map<string, { comment: EditorialComment; attachedTo: string[] }>();
  for (const item of reminderCandidates()) {
    items.push(describe(item));
    for (const comment of item.comments) {
      const entry = comments.get(comment.id) ?? { comment, attachedTo: [] };
      entry.attachedTo.push(item.id);
      comments.set(comment.id, entry);
    }
  }
  for (const { comment, attachedTo } of comments.values()) items.push(commentItem(comment, attachedTo, commentStorage(comment.id)));
  for (const theme of Object.keys(DHIKR_REFLECTIONS) as ReflectionTheme[]) {
    const r = DHIKR_REFLECTIONS[theme];
    const attached = reminderCandidates().filter((i) => i.theme === theme && i.category === "virtue").map((i) => i.id);
    if (attached.length === 0) continue;
    items.push(commentItem({ id: `reflection:theme:${theme}`, style: "reflection", ar: r.reflection.ar, en: r.reflection.en }, attached, "src/data/dhikrReflections.ts → DHIKR_REFLECTIONS"));
  }
  items.push(startupItem());
  for (const item of items) {
    item.haystack = [item.id, item.textAr, normalizeArabic(item.textAr), item.textEn, item.supportAr, item.sourceName, item.reference, item.narrator, item.poet, item.verseRef, item.tafsirSource, item.storage]
      .filter(Boolean)
      .join(" \n ")
      .toLowerCase();
  }
  return (catalogCache = items);
}

/** Live status (the review decision, else the default). */
export function statusOf(item: CatalogItem): ReviewStatus {
  return reviewStatusOf(item.id);
}

// ---- duplicates ---------------------------------------------------------------

/**
 * Groups of items whose Arabic text is the same (diacritics and punctuation
 * aside) or where one long text contains another — the same narration or
 * verse entered twice.
 */
export function duplicateGroups(items: readonly CatalogItem[] = contentCatalog()): Map<string, string[]> {
  const byId = new Map<string, string[]>();
  const texts = items.map((i) => ({ id: i.id, type: i.type, n: normalizeArabic(i.textAr) })).filter((t) => t.n.length >= 12);
  const link = (a: string, b: string) => {
    byId.set(a, [...(byId.get(a) ?? []), b]);
    byId.set(b, [...(byId.get(b) ?? []), a]);
  };
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if ((a.type === "reflection") !== (b.type === "reflection")) continue;
      if (a.n === b.n || (Math.min(a.n.length, b.n.length) >= 25 && (a.n.includes(b.n) || b.n.includes(a.n)))) link(a.id, b.id);
    }
  }
  return byId;
}

// ---- filtering & export --------------------------------------------------------

// ---- review categories ---------------------------------------------------------
//
// The six groups the review screen offers. An item can belong to more than
// one (a Quranic latifa is both "Qur'an" and "Tafsir"; any item with an
// English text is also under "Comments & translations").

export type ReviewCategory = "quran" | "tafsir-reflections" | "hadith" | "dua-adhkar" | "poetry" | "comments-translations";

export const REVIEW_CATEGORIES: readonly ReviewCategory[] = ["quran", "tafsir-reflections", "hadith", "dua-adhkar", "poetry", "comments-translations"];

/** A short DITHAR comment shown with one item (in the widget and reminders): ids end in ":c<n>". */
export function isShortComment(item: CatalogItem): boolean {
  return item.type === "reflection" && /:c\d+$/.test(item.id);
}

export function categoriesOf(item: CatalogItem): ReviewCategory[] {
  const out: ReviewCategory[] = [];
  if (item.quranic || item.type === "quran" || item.type === "lataif") out.push("quran");
  if (item.supportLabel === "tafsir" || item.supportLabel === "insight" || (item.type === "reflection" && !isShortComment(item))) out.push("tafsir-reflections");
  if (item.type === "hadith") out.push("hadith");
  if (item.type === "dua" || item.type === "virtue") out.push("dua-adhkar");
  if (item.type === "poetry") out.push("poetry");
  if (isShortComment(item) || (item.type !== "reflection" && item.textEn)) out.push("comments-translations");
  return out;
}

/** The DITHAR comments that accompany `itemId` (each reviewed on its own). */
export function commentsFor(items: readonly CatalogItem[], itemId: string): CatalogItem[] {
  return items.filter((i) => i.type === "reflection" && i.attachedTo?.includes(itemId));
}

export interface CatalogFilter {
  query?: string;
  category?: ReviewCategory | "all";
  type?: ContentType | "all";
  /** "ar": every item; "en": items with an English text; "en-missing": items without one. */
  language?: "all" | "en" | "en-missing";
  status?: ReviewStatus | "all";
  verification?: "all" | "warnings" | "scholar" | "clean" | "new";
}

export function filterCatalog(items: readonly CatalogItem[], filter: CatalogFilter): CatalogItem[] {
  const query = filter.query?.trim().toLowerCase();
  const nq = query ? normalizeArabic(query) : "";
  return items.filter((item) => {
    if (filter.category && filter.category !== "all" && !categoriesOf(item).includes(filter.category)) return false;
    if (filter.type && filter.type !== "all") {
      if (filter.type === "quran" ? !item.quranic : item.type !== filter.type) return false;
    }
    if (filter.language === "en" && !item.textEn) return false;
    if (filter.language === "en-missing" && item.textEn) return false;
    if (filter.status && filter.status !== "all" && statusOf(item) !== filter.status) return false;
    if (filter.verification === "warnings" && item.warnings.length === 0) return false;
    if (filter.verification === "scholar" && !item.warnings.includes("scholar-review") && !item.warnings.includes("miracle-claim")) return false;
    if (filter.verification === "clean" && item.warnings.length > 0) return false;
    if (filter.verification === "new" && item.origin !== "new") return false;
    if (query && !item.haystack.includes(query) && !(nq && item.haystack.includes(nq))) return false;
    return true;
  });
}

function exportRow(item: CatalogItem, duplicates: Map<string, string[]>) {
  const record = getReviewRecord(item.id);
  return {
    id: item.id,
    type: item.type,
    quranic: item.quranic,
    origin: item.origin,
    status: statusOf(item),
    defaultStatus: item.defaultStatus,
    reviewer: record?.reviewer ?? "",
    notes: record?.notes ?? "",
    reviewedAt: record ? new Date(record.updatedAt).toISOString() : "",
    textAr: item.textAr,
    textEn: item.textEn ?? "",
    supportAr: item.supportAr ?? "",
    sourceName: item.sourceName ?? "",
    reference: item.reference ?? "",
    url: item.url ?? "",
    grade: item.grade ?? "",
    gradedBy: item.gradedBy ?? "",
    narrator: item.narrator ?? "",
    verseRef: item.verseRef ?? "",
    tafsirSource: item.tafsirSource ?? "",
    tafsirRef: item.tafsirRef ?? "",
    tafsirUrl: item.tafsirUrl ?? "",
    poet: item.poet ?? "",
    attributionConfidence: item.attributionConfidence ?? "",
    translationSource: item.translationSource ?? "",
    storage: item.storage,
    usage: item.usage.join("; "),
    attachedTo: (item.attachedTo ?? []).join("; "),
    dataNote: item.dataNote ?? "",
    warnings: item.warnings.join("; "),
    duplicates: (duplicates.get(item.id) ?? []).join("; "),
  };
}

export function exportJson(items: readonly CatalogItem[]): string {
  const duplicates = duplicateGroups();
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: items.length, items: items.map((i) => exportRow(i, duplicates)) }, null, 2);
}

export function exportCsv(items: readonly CatalogItem[]): string {
  const duplicates = duplicateGroups();
  const rows = items.map((i) => exportRow(i, duplicates));
  const headers = Object.keys(rows[0] ?? exportRow(contentCatalog()[0], duplicates));
  const cell = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  // A BOM so spreadsheet apps read the Arabic as UTF-8.
  return "﻿" + [headers.join(","), ...rows.map((r) => headers.map((h) => cell((r as Record<string, unknown>)[h])).join(","))].join("\r\n");
}
