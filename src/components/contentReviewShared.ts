// Helpers shared by the Religious Content Review screen (ContentReviewView)
// and its Wamdat Lataif cards (WamdatReview): the status colours, what an
// edit replaces, and the reviewer's own "done reviewing" ticks.
import type { CatalogItem } from "../lib/contentCatalog";
import { getContentEdits } from "../lib/contentReview";
import type { EditField, ReviewStatus } from "../lib/contentReview";
import { findReminderCandidate } from "../lib/reminderContent";

/** A Wamdat latifa (src/data/wamdat.ts) — reviewed in its own card (WamdatReview). */
export function isWamdaId(id: string): boolean {
  return /^lataif:w\d+$/.test(id);
}

export const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: "#8a6d1f",
  verified: "#1f6b4a",
  "needs-verification": "#9a5a12",
  "needs-editing": "#8a3b3b",
  approved: "#1f5e2e",
  rejected: "#6b6b6b",
};

/** The value an edit replaces: the shipped one, as the published content shows it (the reminder's own source line, grading and evidence). */
export function shippedValue(item: CatalogItem, field: EditField): string {
  const candidate = findReminderCandidate(item.id);
  switch (field) {
    case "textAr":
      return item.textAr;
    case "textEn":
      return item.textEn ?? "";
    case "translationSource":
      return item.translationSource ?? "";
    case "reference":
      return candidate?.sourceAr ?? item.sourceName ?? "";
    case "grade":
      return candidate?.gradeAr ?? item.grade ?? "";
    case "url":
      return item.url ?? "";
    case "reflectionAr":
      return candidate?.evidence?.ar ?? item.supportAr ?? "";
    case "reflectionEn":
      return candidate?.evidence?.en ?? item.supportEn ?? "";
    case "tafsirSource":
      return candidate?.evidence?.sourceAr ?? item.tafsirSource ?? "";
  }
}

/** The value shown now: an approved edit, else the shipped value. */
export function currentValue(item: CatalogItem, field: EditField): string {
  return getContentEdits(item.id)?.approved[field] ?? shippedValue(item, field);
}

export const FIELD_DIR: Record<EditField, "rtl" | "ltr" | "auto"> = {
  textAr: "rtl",
  textEn: "ltr",
  translationSource: "auto",
  reference: "auto",
  grade: "auto",
  url: "ltr",
  reflectionAr: "rtl",
  reflectionEn: "ltr",
  tafsirSource: "auto",
};

/** The reviewer's own "done reviewing" ticks — a personal checklist, separate from the review decisions. */
export const REVIEW_CHECKED_KEY = "dithar:content-review:checked:v1";

export function loadChecked(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REVIEW_CHECKED_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveChecked(id: string, checked: boolean): void {
  const ids = loadChecked();
  if (checked) ids.add(id);
  else ids.delete(id);
  try {
    localStorage.setItem(REVIEW_CHECKED_KEY, JSON.stringify([...ids]));
  } catch {
    // Best effort.
  }
}
