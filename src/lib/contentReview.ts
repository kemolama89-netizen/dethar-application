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
//     "approved" — nothing already live disappears;
//   - everything added since (data/widgetContent.ts, data/quranLataif.ts,
//     data/widgetVerses.ts,
//     and their DITHAR comments) starts as "pending" and is NOT published
//     anywhere until a reviewer approves it;
//   - the startup Hadith overlay (Tirmidhi 3377) starts as "approved"
//     because the app owner requested that exact narration; it can be set
//     back to any other status like everything else.
//
// Only "approved" content is published (widgets, reminders, the full-screen
// reflection, the startup overlay). Decisions persist in localStorage,
// i.e. on this device.
import { DHIKR_THEME_COMMENTS, DUA_CATEGORY_COMMENTS, ENRICHED_DUAS, ENRICHED_HADITHS, POEMS } from "../data/widgetContent";
import { QURAN_LATAIF } from "../data/quranLataif";
import { WAMDAT, WAMDA_NEEDS_VERIFICATION } from "../data/wamdat";
import { WIDGET_VERSES } from "../data/widgetVerses";
import { STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";

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
  for (const d of ENRICHED_DUAS) {
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

/** Tests only: approve every newly added item, as a reviewer would, so tests can exercise published new content. */
export function approveAllNewContentForTesting(): void {
  memory = null;
  setReviewMany([...newContentIds()], { status: "approved", reviewer: "test" });
}

/** Tests only: forget the in-memory copy so the next read comes from storage (as after a restart). */
export function resetContentReviewCacheForTesting(): void {
  memory = null;
  version += 1;
}
