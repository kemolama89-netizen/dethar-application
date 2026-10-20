// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveAllNewContentForTesting } from "./contentReview";

// The native bridge, as on Android: a queue of widget taps and the list it receives back.
const native = vi.hoisted(() => ({
  ops: [] as unknown[],
  pushed: [] as { keys: string[]; ackThrough: number }[],
}));
vi.mock("./remindersNative", () => ({
  isRemindersNativeAvailable: () => true,
  RemindersNative: {
    getFavoriteOps: async () => ({ ops: native.ops }),
    setFavoriteKeys: async (options: { keys: string[]; ackThrough: number }) => {
      native.pushed.push(options);
      native.ops = (native.ops as { seq: number }[]).filter((op) => op.seq > options.ackThrough);
    },
  },
}));

import { addFavorite, favoriteFromItem, favoriteKeys, isFavorite, loadFavorites, removeFavorite, subscribeFavorites, toggleFavorite } from "./favorites";
import { applyNativeFavoriteOps, entryFromNativeOp, syncFavorites } from "./favoritesSync";
import { findReminderItem } from "./reminderContent";
import type { NativeFavoriteOp } from "./remindersNative";

const hadith = () => findReminderItem("hadith:muslim-2564")!;
const poem = () => findReminderItem("poetry:nazila-faraj")!;

const op = (seq: number, key: string, add: boolean, extra: Partial<NativeFavoriteOp> = {}): NativeFavoriteOp => ({
  seq,
  key,
  add,
  at: 1_700_000_000_000 + seq,
  category: "hadith",
  title: "حديث نبوي",
  text: "",
  meaning: "",
  source: "",
  commentId: null,
  commentText: null,
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  approveAllNewContentForTesting();
  native.ops = [];
  native.pushed = [];
});

describe("Favorites", () => {
  it("toggles: the first tap saves, the second removes", () => {
    expect(toggleFavorite(hadith(), hadith().comments[0])).toBe(true);
    expect(isFavorite("hadith:muslim-2564")).toBe(true);
    expect(toggleFavorite(hadith(), hadith().comments[0])).toBe(false);
    expect(isFavorite("hadith:muslim-2564")).toBe(false);
  });

  it("never duplicates the same content, even when saved again with another comment", () => {
    addFavorite(favoriteFromItem(hadith(), hadith().comments[0], "app"));
    addFavorite(favoriteFromItem(hadith(), hadith().comments[1], "widget"));
    expect(loadFavorites()).toHaveLength(1);
    expect(loadFavorites()[0].comment?.id).toBe(hadith().comments[0].id);
  });

  it("keeps the original text, type, source, grading and the shown comment — in both languages", () => {
    const item = hadith();
    toggleFavorite(item, item.comments[1]);
    const [saved] = loadFavorites();
    expect(saved.textAr).toBe(item.textAr);
    expect(saved.kind).toBe("hadith");
    expect(saved.sourceAr).toContain("صحيح مسلم");
    expect(saved.sourceEn).toContain("Sahih Muslim");
    expect(saved.gradeAr).toContain("صحيح");
    expect(saved.comment).toEqual({ id: item.comments[1].id, ar: item.comments[1].ar, en: item.comments[1].en });
  });

  it("keeps a poem's uncertain attribution", () => {
    toggleFavorite(poem(), undefined);
    const [saved] = loadFavorites();
    expect(saved.category).toBe("poetry");
    expect(saved.attribution).toBe("disputed");
    expect(saved.sourceAr).toContain("يُنسب");
  });

  it("persists across a restart (read back from storage), newest first", () => {
    addFavorite({ ...favoriteFromItem(hadith(), undefined, "app"), savedAt: 1 });
    addFavorite({ ...favoriteFromItem(poem(), undefined, "app"), savedAt: 2 });
    expect(favoriteKeys()).toEqual(["poetry:nazila-faraj", "hadith:muslim-2564"]);
  });

  it("survives corrupt storage and drops duplicate or malformed entries", () => {
    localStorage.setItem("dithar:favorites:v1", "nope");
    expect(loadFavorites()).toEqual([]);
    const entry = favoriteFromItem(hadith(), undefined, "app");
    localStorage.setItem("dithar:favorites:v1", JSON.stringify([entry, entry, { key: 5 }, null]));
    expect(loadFavorites()).toHaveLength(1);
  });

  it("tells subscribers about changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFavorites(listener);
    toggleFavorite(hadith(), undefined);
    removeFavorite("hadith:muslim-2564");
    unsubscribe();
    toggleFavorite(hadith(), undefined);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("widget hearts → Favorites", () => {
  it("a widget 'add' saves the app's own verified item with the comment the widget showed", () => {
    const item = hadith();
    const entry = entryFromNativeOp(op(1, item.id, true, { commentId: item.comments[1].id, text: "ignored" }))!;
    expect(entry.textAr).toBe(item.textAr);
    expect(entry.sourceEn).toBe(item.sourceEn);
    expect(entry.comment?.id).toBe(item.comments[1].id);
    expect(entry.origin).toBe("widget");
  });

  it("falls back to the widget's own snapshot for content the app no longer has", () => {
    const entry = entryFromNativeOp(op(1, "hadith:gone", true, { text: "نص محفوظ", source: "مصدر", commentId: "x", commentText: "تأمل" }))!;
    expect(entry.textAr).toBe("نص محفوظ");
    expect(entry.comment).toEqual({ id: "x", ar: "تأمل", en: "تأمل" });
    expect(entryFromNativeOp(op(2, "hadith:gone", true))).toBeNull(); // nothing to save
  });

  it("applies taps in order — add, remove, add again ends saved once — and reports the last merged tap", () => {
    const item = hadith();
    const last = applyNativeFavoriteOps([op(3, item.id, true), op(1, item.id, true), op(2, item.id, false)]);
    expect(last).toBe(3);
    expect(favoriteKeys()).toEqual([item.id]);
  });

  it("syncs both ways: merges the queue, then pushes the full list with the acknowledgement", async () => {
    addFavorite(favoriteFromItem(poem(), undefined, "app"));
    native.ops = [op(7, "hadith:muslim-2564", true)];
    await syncFavorites();
    expect(isFavorite("hadith:muslim-2564")).toBe(true);
    const lastPush = native.pushed.at(-1)!;
    expect(lastPush.ackThrough).toBe(7);
    expect(new Set(lastPush.keys)).toEqual(new Set(["hadith:muslim-2564", "poetry:nazila-faraj"]));
    expect(native.ops).toEqual([]);
    // A second sync merges nothing twice.
    await syncFavorites();
    expect(loadFavorites()).toHaveLength(2);
  });

  it("a removal from the widget removes the app's favorite", async () => {
    addFavorite(favoriteFromItem(hadith(), undefined, "app"));
    native.ops = [op(1, "hadith:muslim-2564", false)];
    await syncFavorites();
    expect(isFavorite("hadith:muslim-2564")).toBe(false);
    expect(native.pushed.at(-1)!.keys).toEqual([]);
  });
});
