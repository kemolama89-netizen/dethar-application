// What a tapped reminder notification or widget opens: EXACTLY the content it
// showed — never another item, never a random or positional pick.
//
// Native sends the item's stable id ("<category>:<library id>", e.g.
// "virtue:1", "hadith:12") with the shown comment's id, and a snapshot of the
// very strings it drew (ShownReminder — RemindersScheduler.openIntent). The
// app's own item for that id is used — it has the full view's evidence and
// reflection — ONLY when its text is still the text that was shown (letter
// for letter; the widget's spacing fixes are whitespace only,
// lib/arabicTypography.ts). Otherwise — the library changed since the
// notification was posted (an app update), or the item is no longer
// published — the snapshot itself is shown, as it was, under the same id.
// With no snapshot (an older build) the id alone decides, as before.
import { findReminderCandidate, findReminderItem } from "./reminderContent";
import type { ReminderCategory, ReminderItem, ReminderKind } from "./reminderContent";
import { REMINDER_CATEGORIES } from "./reminderContent";
import { findComment } from "./contentRotation";
import type { EditorialComment } from "../data/widgetContent";
import type { ShownReminder } from "./remindersNative";
import type { Language } from "../theme/LanguageContext";

export interface OpenedReminder {
  item: ReminderItem;
  comment?: EditorialComment;
  /** The title as shown when the snapshot is used (already localized), else undefined (the kind's own title). */
  title?: string;
  /** "library": the app's own item (its text matches what was shown); "as-shown": the snapshot. */
  from: "library" | "as-shown";
}

/** The wording, without the whitespace the widget/notification may have adjusted. */
export function sameWording(a: string, b: string): boolean {
  const norm = (s: string) => s.normalize("NFC").replace(/[\s​-‏⁦-⁩ـ]/gu, "");
  return norm(a) === norm(b);
}

const KIND_OF: Record<ReminderCategory, ReminderKind> = { dua: "dua", hadith: "hadith", virtue: "virtue", poetry: "poetry", lataif: "lataif" };

function asCategory(value: string, id: string): ReminderCategory {
  const c = (REMINDER_CATEGORIES as readonly string[]).includes(value) ? value : id.slice(0, id.indexOf(":"));
  return (REMINDER_CATEGORIES as readonly string[]).includes(c) ? (c as ReminderCategory) : "dua";
}

/** The shown strings as an item of their own (same id, so Favorites and history still match). */
function itemAsShown(id: string, shown: ShownReminder, language: Language): ReminderItem {
  const category = asCategory(shown.category, id);
  const isEn = language === "en";
  return {
    id,
    category,
    kind: KIND_OF[category],
    textAr: shown.text,
    meaningEn: shown.meaning || undefined,
    sourceAr: shown.source,
    sourceEn: isEn ? shown.source || undefined : undefined,
    evidence: shown.detail ? { kind: "hadith", ar: shown.detail, en: isEn ? shown.detail : undefined, sourceAr: shown.source, sourceEn: isEn ? shown.source : undefined } : undefined,
    comments: [],
    theme: category === "hadith" || category === "poetry" || category === "lataif" ? category : category === "virtue" ? "tasbih" : "dua",
  };
}

function shownComment(commentId: string | null | undefined, shown: ShownReminder | undefined): EditorialComment | undefined {
  if (!commentId || !shown?.commentText) return undefined;
  return { id: commentId, style: "reflection", ar: shown.commentText, en: shown.commentText };
}

/**
 * Resolves a tapped reminder. Returns null only when there is nothing to
 * show: no snapshot, and the id is unknown to this version of the app.
 */
export function resolveOpenedReminder(id: string, commentId: string | null | undefined, shown: ShownReminder | undefined, language: Language): OpenedReminder | null {
  const library = findReminderItem(id) ?? findReminderCandidate(id);
  if (library && (!shown || !shown.text || sameWording(library.textAr, shown.text))) {
    return { item: library, comment: findComment(library, commentId) ?? shownComment(commentId, shown), from: "library" };
  }
  if (shown?.text) {
    return { item: itemAsShown(id, shown, language), comment: shownComment(commentId, shown), title: shown.title || undefined, from: "as-shown" };
  }
  return null;
}
