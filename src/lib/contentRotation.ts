// Which reminder item and which DITHAR comment come next — in the app (the
// full-screen reflection's "Next", its first comment, the content preview).
// The widget and notifications are chosen natively by the same rules
// (android/.../reminders/ReminderLogic.kt: ReminderRotation), with their
// own history.
//
//  - Items: never one of the recent ones of its category while others
//    remain. The "recent" window scales with the category (three quarters
//    of it), so a small category doesn't come back too soon and a large one
//    isn't forced into a fixed order.
//  - Comments: the one shown least recently (never-shown first, in the
//    authored order), so an item seen again gets a different comment.
//  - The history is saved (localStorage), so a restart doesn't reset it,
//    and bounded, so it never grows without limit.
import type { EditorialComment } from "../data/widgetContent";
import type { ReminderItem } from "./reminderContent";

const KEY = "dithar:content-history:v1";
export const ITEM_HISTORY_LIMIT = 300;
export const COMMENT_HISTORY_LIMIT = 400;

export interface ContentHistory {
  /** Item ids, oldest first. */
  items: string[];
  /** Comment ids, oldest first. */
  comments: string[];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function loadContentHistory(): ContentHistory {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      return { items: strings(p.items).slice(-ITEM_HISTORY_LIMIT), comments: strings(p.comments).slice(-COMMENT_HISTORY_LIMIT) };
    }
  } catch {
    // Unreadable: start a fresh history.
  }
  return { items: [], comments: [] };
}

function saveContentHistory(history: ContentHistory): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Best effort — rotation still works within this session.
  }
}

function remember(list: string[], id: string, limit: number): string[] {
  return [...list.filter((x) => x !== id), id].slice(-limit);
}

/** Records that an item (and the comment shown with it) was displayed. */
export function recordShown(itemId: string, commentId?: string): ContentHistory {
  const history = loadContentHistory();
  const next: ContentHistory = {
    items: remember(history.items, itemId, ITEM_HISTORY_LIMIT),
    comments: commentId ? remember(history.comments, commentId, COMMENT_HISTORY_LIMIT) : history.comments,
  };
  saveContentHistory(next);
  return next;
}

/** How many of a category's most recent items are held back: three quarters of it (at least one, never all). */
export function freshnessWindow(categorySize: number): number {
  return Math.max(1, Math.min(categorySize - 1, Math.floor((categorySize * 3) / 4)));
}

/**
 * The next item from `candidates` (one category, or a mix), in tiers:
 * items not in the history at all; else items outside their category's
 * recent window (the ones shown longest ago); else anything. `random`
 * picks within the tier, so the order isn't fixed.
 */
export function pickFreshItem(candidates: readonly ReminderItem[], recentItems: readonly string[], random: (n: number) => number = (n) => Math.floor(Math.random() * n)): ReminderItem | undefined {
  if (candidates.length === 0) return undefined;
  const recent = new Set(recentItems);
  const byCategory = new Map<string, number>();
  for (const item of candidates) byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
  const heldBack = new Set<string>();
  for (const [category, size] of byCategory) {
    const recentOfCategory = recentItems.filter((id) => id.startsWith(`${category}:`));
    for (const id of recentOfCategory.slice(-freshnessWindow(size))) heldBack.add(id);
  }
  const unseen = candidates.filter((item) => !recent.has(item.id));
  const notRecent = candidates.filter((item) => !heldBack.has(item.id));
  const from = unseen.length > 0 ? unseen : notRecent.length > 0 ? notRecent : candidates;
  return from[Math.min(from.length - 1, Math.max(0, random(from.length)))];
}

/** The comment to show: never shown before (in authored order), else the one shown longest ago. */
export function pickComment(comments: readonly EditorialComment[], recentComments: readonly string[]): EditorialComment | undefined {
  if (comments.length === 0) return undefined;
  const lastSeen = (c: EditorialComment) => recentComments.lastIndexOf(c.id);
  return [...comments].sort((a, b) => lastSeen(a) - lastSeen(b))[0];
}

export function findComment(item: ReminderItem, commentId: string | null | undefined): EditorialComment | undefined {
  return commentId ? item.comments.find((c) => c.id === commentId) : undefined;
}
