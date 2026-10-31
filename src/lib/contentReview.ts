// Religious-content review decisions — the publication gate.
//
// Kept SEPARATE from the religious texts themselves: this store holds only
// a status, notes, the reviewer's name and a history per content id; the
// texts are never copied or changed here.
//
// Defaults:
//   - content that already shipped in DITHAR before this review workflow
//     (the Hadith library, the written library's duas, the dhikr virtues,
//     the Wamdat Lataif and their existing reflections) starts as
//     "approved" — nothing already live disappears; so do DITHAR's short
//     dua reflections (data/duaReflections.ts), which replace the one dua
//     line that shipped before (theme:dua:legacy) — DITHAR's own words with
//     no quotation or attribution, like it;
//   - everything added since (data/widgetContent.ts, data/quranLataif.ts,
//     data/widgetVerses.ts,
//     and their DITHAR comments) starts as "pending" and is NOT published
//     anywhere until a reviewer approves it;
//   - the startup Hadith overlay (Tirmidhi 3377) starts as "approved"
//     because the app owner requested that exact narration; it can be set
//     back to any other status like everything else;
//   - a Hadith or Latifa that passed the religious-content audit
//     (lib/religiousAudit.ts) starts as "approved" too, and can be set back
//     like everything else.
//
// Only "approved" content is published (widgets, reminders, the full-screen
// reflection, the startup overlay). Decisions persist in localStorage,
// i.e. on this device.
//
// Reviewer EDITS (Arabic text, English, translation source, reference/
// takhrij, grading, source URL, and for the Wamdat Lataif the reflection in
// Arabic and English and its tafsir source) are a separate layer under their
// own key: each is first a draft, seen only in the review screen; "Approve
// All Pending Changes" (or one item's own Approve) turns the drafts into
// approved edits, which the published
// pool (lib/reminderContent.ts reminderPool) lays over the shipped text. The
// shipped data files are never rewritten, so removing an edit restores them.
import { DHIKR_THEME_COMMENTS, DUA_CATEGORY_COMMENTS, ENRICHED_DUAS, ENRICHED_HADITHS, POEMS } from "../data/widgetContent";
import { IMPORTED_DUAS } from "../data/importedDuas";
import { QURAN_LATAIF } from "../data/quranLataif";
import { WAMDAT, WAMDA_NEEDS_VERIFICATION } from "../data/wamdat";
import { WIDGET_VERSES } from "../data/widgetVerses";
import { STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";
import { auditPublishesByDefault } from "./religiousAudit";

export type ReviewStatus = "pending" | "verified" | "needs-verification" | "needs-editing" | "approved" | "rejected";

export const REVIEW_STATUSES: readonly ReviewStatus[] = ["pending", "verified", "needs-verification", "needs-editing", "approved", "rejected"];

export interface ReviewHistoryEntry {
  status: ReviewStatus;
  notes?: string;
  reviewer?: string;
  at: number;
}

export interface ReviewRecord {
  status: ReviewStatus;
  notes: string;
  reviewer?: string;
  updatedAt: number;
  history: ReviewHistoryEntry[];
}

/** Also read directly (no import of this module) by lib/startupOverlay.ts startupHadithPublished. */
export const CONTENT_REVIEW_KEY = "dithar:content-review:v1";
const KEY = CONTENT_REVIEW_KEY;
const REVIEWER_KEY = "dithar:content-review:reviewer:v1";
const MAX_HISTORY = 20;

/** The startup overlay's narration — requested by the app owner, so approved by default. */
export { STARTUP_HADITH_REVIEW_ID };

let newIds: Set<string> | null = null;

/** Ids of content added since the review workflow began (pending until approved). */
export function newContentIds(): Set<string> {
  if (newIds) return newIds;
  const ids = new Set<string>();
  for (const h of ENRICHED_HADITHS) {
    ids.add(`hadith:${h.id}`);
    for (const c of h.comments) ids.add(c.id);
  }
  for (const d of [...ENRICHED_DUAS, ...IMPORTED_DUAS]) {
    ids.add(`dua:${d.id}`);
    for (const c of d.comments) ids.add(c.id);
  }
  for (const p of POEMS) {
    ids.add(`poetry:${p.id}`);
    for (const c of p.comments) ids.add(c.id);
  }
  for (const v of WIDGET_VERSES) {
    ids.add(`lataif:verse:${v.id}`);
    for (const c of v.comments) ids.add(c.id);
  }
  for (const l of QURAN_LATAIF) {
    ids.add(`lataif:${l.id}`);
    for (const c of l.comments) ids.add(c.id);
  }
  for (const list of [...Object.values(DUA_CATEGORY_COMMENTS), ...Object.values(DHIKR_THEME_COMMENTS)]) for (const c of list) ids.add(c.id);
  return (newIds = ids);
}

let miracleClaimIds: Set<string> | null = null;

/** Existing Lataif that cite "scientific/medical miracle" works — held for scholarly review before publication. */
function miracleClaimLataif(): Set<string> {
  return (miracleClaimIds ??= new Set(WAMDAT.filter((w) => w.source.includes("الإعجاز")).map((w) => `lataif:w${w.id}`)));
}

export function defaultReviewStatus(id: string): ReviewStatus {
  if (id === STARTUP_HADITH_REVIEW_ID) return "approved";
  // A Hadith or Latifa verified by the religious-content audit is published by default.
  if (auditPublishesByDefault(id)) return "approved";
  if (miracleClaimLataif().has(id)) return "needs-verification";
  // Verse, reference and reflection disagree (data/wamdat.ts WAMDA_NEEDS_VERIFICATION).
  if (/^lataif:w\d+$/.test(id) && Number(id.slice("lataif:w".length)) in WAMDA_NEEDS_VERIFICATION) return "needs-verification";
  return newContentIds().has(id) ? "pending" : "approved";
}

// ---- store ------------------------------------------------------------------

let memory: Record<string, ReviewRecord> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function isStatus(v: unknown): v is ReviewStatus {
  return typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v);
}

function load(): Record<string, ReviewRecord> {
  if (memory) return memory;
  const out: Record<string, ReviewRecord> = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") {
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const r = value as Partial<ReviewRecord> | null;
        if (!r || !isStatus(r.status)) continue;
        out[id] = {
          status: r.status,
          notes: typeof r.notes === "string" ? r.notes : "",
          reviewer: typeof r.reviewer === "string" ? r.reviewer : undefined,
          updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
          history: Array.isArray(r.history) ? r.history.filter((h): h is ReviewHistoryEntry => !!h && isStatus((h as ReviewHistoryEntry).status)) : [],
        };
      }
    }
  } catch {
    // Unreadable: no decisions — every item falls back to its default.
  }
  return (memory = out);
}

function persist(records: Record<string, ReviewRecord>): void {
  memory = records;
  version += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Kept in memory for this session.
  }
  for (const listener of [...listeners]) listener();
}

/** Told whenever a decision changes (the published pool and the widget re-sync). */
export function subscribeContentReview(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Changes with every saved decision — for caches built from the published content. */
export function contentReviewVersion(): number {
  load();
  return version;
}

export function getReviewRecord(id: string): ReviewRecord | undefined {
  return load()[id];
}

export function reviewStatusOf(id: string): ReviewStatus {
  return load()[id]?.status ?? defaultReviewStatus(id);
}

/** Only approved content is published. */
export function isPublished(id: string): boolean {
  return reviewStatusOf(id) === "approved";
}

export interface ReviewUpdate {
  status: ReviewStatus;
  notes?: string;
  reviewer?: string;
}

function applyUpdate(records: Record<string, ReviewRecord>, id: string, update: ReviewUpdate, now: number): void {
  const previous = records[id];
  const notes = update.notes ?? previous?.notes ?? "";
  const reviewer = update.reviewer?.trim() || previous?.reviewer;
  const entry: ReviewHistoryEntry = { status: update.status, at: now, ...(update.notes !== undefined ? { notes: update.notes } : {}), ...(reviewer ? { reviewer } : {}) };
  records[id] = { status: update.status, notes, reviewer, updatedAt: now, history: [...(previous?.history ?? []), entry].slice(-MAX_HISTORY) };
}

export function setReview(id: string, update: ReviewUpdate, now: number = Date.now()): void {
  const records = { ...load() };
  applyUpdate(records, id, update, now);
  persist(records);
}

/** One status for many items (the filtered list) — a single save. */
export function setReviewMany(ids: readonly string[], update: ReviewUpdate, now: number = Date.now()): void {
  const records = { ...load() };
  for (const id of ids) applyUpdate(records, id, update, now);
  persist(records);
}

export function loadReviewerName(): string {
  try {
    return localStorage.getItem(REVIEWER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveReviewerName(name: string): void {
  try {
    localStorage.setItem(REVIEWER_KEY, name);
  } catch {
    // Best effort.
  }
}

// ---- reviewer edits ---------------------------------------------------------

export type EditField = "textAr" | "textEn" | "translationSource" | "reference" | "grade" | "url" | "reflectionAr" | "reflectionEn" | "tafsirSource";

export const EDIT_FIELDS: readonly EditField[] = ["textAr", "textEn", "translationSource", "reference", "grade", "url", "reflectionAr", "reflectionEn", "tafsirSource"];

/** The Wamdat Lataif's reflection (its Arabic and English) and the tafsir it cites — edited on those items only. */
export const REFLECTION_EDIT_FIELDS: readonly EditField[] = ["reflectionAr", "reflectionEn", "tafsirSource"];

export interface EditHistoryEntry {
  field: EditField;
  action: "draft" | "discarded" | "approved";
  value?: string;
  reviewer?: string;
  at: number;
}

export interface ContentEditRecord {
  /** Saved but not yet approved — shown only in the review screen. */
  drafts: Partial<Record<EditField, string>>;
  /** Approved — laid over the shipped content wherever it is published. */
  approved: Partial<Record<EditField, string>>;
  updatedAt: number;
  history: EditHistoryEntry[];
}

export interface PendingEdit {
  id: string;
  field: EditField;
  value: string;
}

export const CONTENT_EDITS_KEY = "dithar:content-edits:v1";

let editsMemory: Record<string, ContentEditRecord> | null = null;
const editListeners = new Set<() => void>();

function isField(v: unknown): v is EditField {
  return typeof v === "string" && (EDIT_FIELDS as readonly string[]).includes(v);
}

function fieldValues(v: unknown): Partial<Record<EditField, string>> {
  const out: Partial<Record<EditField, string>> = {};
  if (v && typeof v === "object") for (const [k, s] of Object.entries(v)) if (isField(k) && typeof s === "string") out[k] = s;
  return out;
}

function loadEdits(): Record<string, ContentEditRecord> {
  if (editsMemory) return editsMemory;
  const out: Record<string, ContentEditRecord> = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CONTENT_EDITS_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") {
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const r = value as Partial<ContentEditRecord> | null;
        if (!r || typeof r !== "object") continue;
        out[id] = {
          drafts: fieldValues(r.drafts),
          approved: fieldValues(r.approved),
          updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
          history: Array.isArray(r.history) ? r.history.filter((h): h is EditHistoryEntry => !!h && isField((h as EditHistoryEntry).field)) : [],
        };
      }
    }
  } catch {
    // Unreadable: no edits — the shipped content is shown as it is.
  }
  return (editsMemory = out);
}

/** `published`: approved edits changed, so the published pool (and the widget) must refresh. */
function persistEdits(records: Record<string, ContentEditRecord>, published: boolean): void {
  editsMemory = records;
  try {
    localStorage.setItem(CONTENT_EDITS_KEY, JSON.stringify(records));
  } catch {
    // Kept in memory for this session.
  }
  if (published) {
    version += 1;
    for (const listener of [...listeners]) listener();
  }
  for (const listener of [...editListeners]) listener();
}

/** Told whenever an edit draft or an approval changes (the review screen). */
export function subscribeContentEdits(listener: () => void): () => void {
  editListeners.add(listener);
  return () => editListeners.delete(listener);
}

export function getContentEdits(id: string): ContentEditRecord | undefined {
  return loadEdits()[id];
}

/** The approved edits for an item — what published content shows instead of the shipped value. */
export function approvedEdits(id: string): Partial<Record<EditField, string>> {
  return loadEdits()[id]?.approved ?? {};
}

function editEntry(records: Record<string, ContentEditRecord>, id: string): ContentEditRecord {
  const previous = records[id];
  return { drafts: { ...previous?.drafts }, approved: { ...previous?.approved }, updatedAt: previous?.updatedAt ?? 0, history: [...(previous?.history ?? [])] };
}

/** Saves a draft for one field. Nothing published changes until it is approved. */
export function saveEditDraft(id: string, field: EditField, value: string, reviewer?: string, now: number = Date.now()): void {
  const records = { ...loadEdits() };
  const entry = editEntry(records, id);
  entry.drafts[field] = value;
  entry.updatedAt = now;
  entry.history = [...entry.history, { field, action: "draft" as const, value, at: now, ...(reviewer?.trim() ? { reviewer: reviewer.trim() } : {}) }].slice(-MAX_HISTORY);
  records[id] = entry;
  persistEdits(records, false);
}

export function discardEditDraft(id: string, field: EditField, reviewer?: string, now: number = Date.now()): void {
  const records = { ...loadEdits() };
  if (records[id]?.drafts[field] === undefined) return;
  const entry = editEntry(records, id);
  delete entry.drafts[field];
  entry.updatedAt = now;
  entry.history = [...entry.history, { field, action: "discarded" as const, at: now, ...(reviewer?.trim() ? { reviewer: reviewer.trim() } : {}) }].slice(-MAX_HISTORY);
  records[id] = entry;
  persistEdits(records, false);
}

/** Every saved draft, across all items. */
export function pendingEdits(): PendingEdit[] {
  return Object.entries(loadEdits()).flatMap(([id, r]) => EDIT_FIELDS.filter((f) => r.drafts[f] !== undefined).map((field) => ({ id, field, value: r.drafts[field]! })));
}

/** Approves every pending draft at once (one save); returns how many were approved. */
export function approveAllPendingEdits(reviewer?: string, now: number = Date.now()): number {
  return approveEdits(pendingEdits(), reviewer, now);
}

/** Approves the pending drafts of ONE item only; every other item's drafts stay drafts. */
export function approveItemEdits(id: string, reviewer?: string, now: number = Date.now()): number {
  return approveEdits(
    pendingEdits().filter((e) => e.id === id),
    reviewer,
    now,
  );
}

function approveEdits(pending: readonly PendingEdit[], reviewer: string | undefined, now: number): number {
  if (pending.length === 0) return 0;
  const records = { ...loadEdits() };
  for (const { id, field, value } of pending) {
    const entry = editEntry(records, id);
    entry.approved[field] = value;
    delete entry.drafts[field];
    entry.updatedAt = now;
    entry.history = [...entry.history, { field, action: "approved" as const, value, at: now, ...(reviewer?.trim() ? { reviewer: reviewer.trim() } : {}) }].slice(-MAX_HISTORY);
    records[id] = entry;
  }
  persistEdits(records, true);
  return pending.length;
}

/** The status a rejected item returns to when it is recovered: the one recorded before its rejection, else its default. */
export function statusBeforeRejection(id: string): ReviewStatus {
  const history = load()[id]?.history ?? [];
  let i = history.length - 1;
  while (i >= 0 && history[i].status === "rejected") i -= 1;
  if (i >= 0) return history[i].status;
  const fallback = defaultReviewStatus(id);
  return fallback === "rejected" ? "pending" : fallback;
}

/** Tests only: approve every newly added item, as a reviewer would, so tests can exercise published new content. */
export function approveAllNewContentForTesting(): void {
  memory = null;
  setReviewMany([...newContentIds()], { status: "approved", reviewer: "test" });
}

/** Tests only: forget the in-memory copy so the next read comes from storage (as after a restart). */
export function resetContentReviewCacheForTesting(): void {
  memory = null;
  editsMemory = null;
  version += 1;
}
