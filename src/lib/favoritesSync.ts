// Keeps the widget's hearts and the app's Favorites in step (Android only).
//
// A heart tapped on the home-screen widget is saved natively at once
// (FavoritesStore.kt — the widget redraws with the filled heart), and
// queued. Here, at launch, on every return to the app and whenever the
// app's Favorites change, the queue is merged into lib/favorites.ts in tap
// order — an add saves a snapshot of the item (from the app's own verified
// content when it still has it, else from what the widget showed), a
// remove removes it — and the app's full list is pushed back with the
// last merged op, so the widget shows exactly the app's state and nothing
// is merged twice.
import { App } from "@capacitor/app";
import { RemindersNative, isRemindersNativeAvailable } from "./remindersNative";
import type { NativeFavoriteOp } from "./remindersNative";
import { addFavorite, favoriteFromItem, favoriteKeys, removeFavorite, subscribeFavorites } from "./favorites";
import type { FavoriteEntry } from "./favorites";
import { findReminderCandidate, REMINDER_CATEGORIES } from "./reminderContent";
import type { ReminderCategory } from "./reminderContent";
import { findComment } from "./contentRotation";

/** The entry a widget "add" saves: the app's own item (both languages, full details) when known, else the widget's snapshot. */
export function entryFromNativeOp(op: NativeFavoriteOp): FavoriteEntry | null {
  const item = findReminderCandidate(op.key);
  if (item) return favoriteFromItem(item, findComment(item, op.commentId), "widget", op.at || Date.now());
  if (!op.text) return null;
  const category = (REMINDER_CATEGORIES as readonly string[]).includes(op.category) ? (op.category as ReminderCategory) : "dua";
  return {
    key: op.key,
    category,
    kind: category,
    textAr: op.text,
    meaningEn: op.meaning || undefined,
    // The widget's line is in the language it was shown in; keep it as the source.
    sourceAr: op.source,
    sourceEn: op.source || undefined,
    comment: op.commentId && op.commentText ? { id: op.commentId, ar: op.commentText, en: op.commentText } : undefined,
    savedAt: op.at || Date.now(),
    origin: "widget",
  };
}

/** Applies queued widget taps in order; returns the last merged seq. */
export function applyNativeFavoriteOps(ops: readonly NativeFavoriteOp[]): number {
  let last = 0;
  for (const op of [...ops].sort((a, b) => a.seq - b.seq)) {
    if (op.add) {
      const entry = entryFromNativeOp(op);
      if (entry) addFavorite(entry);
    } else {
      removeFavorite(op.key);
    }
    last = Math.max(last, op.seq);
  }
  return last;
}

let syncing: Promise<void> | null = null;

/** Merge the widget's queue, then push the app's list back. Serialised so two syncs never interleave. */
export function syncFavorites(): Promise<void> {
  if (!isRemindersNativeAvailable()) return Promise.resolve();
  const run = async () => {
    const { ops } = await RemindersNative.getFavoriteOps();
    const ackThrough = applyNativeFavoriteOps(ops ?? []);
    await RemindersNative.setFavoriteKeys({ keys: favoriteKeys(), ackThrough });
  };
  const next = (syncing ?? Promise.resolve()).then(run, run);
  syncing = next.catch(() => {});
  return next;
}

/** Started with the reminders sync (Android). */
export function startFavoritesSync(): () => void {
  if (!isRemindersNativeAvailable()) return () => {};
  const sync = () => void syncFavorites().catch(() => {});
  const resume = App.addListener("resume", sync);
  const unsubscribe = subscribeFavorites(sync);
  sync();
  return () => {
    unsubscribe();
    void resume.then((h) => h.remove());
  };
}
