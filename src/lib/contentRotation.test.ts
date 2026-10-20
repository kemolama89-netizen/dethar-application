// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { approveAllNewContentForTesting } from "./contentReview";
import { COMMENT_HISTORY_LIMIT, ITEM_HISTORY_LIMIT, findComment, freshnessWindow, loadContentHistory, pickComment, pickFreshItem, recordShown } from "./contentRotation";
import { findReminderItem, reminderPool } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";
import type { EditorialComment } from "../data/widgetContent";

const item = (id: string, category: ReminderItem["category"] = "dua"): ReminderItem => ({
  id,
  category,
  kind: category === "dua" ? "dua" : category,
  textAr: "نص",
  sourceAr: "مصدر",
  comments: [],
  theme: "dua",
});

const comment = (id: string): EditorialComment => ({ id, style: "reflection", ar: "تأمل", en: "reflection" });

beforeEach(() => {
  localStorage.clear();
  approveAllNewContentForTesting();
});

describe("item rotation", () => {
  it("shows every item of a category before any repeats", () => {
    const pool = Array.from({ length: 12 }, (_, i) => item(`dua:${i}`));
    let recent: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const next = pickFreshItem(pool, recent, () => 0)!;
      seen.push(next.id);
      recent = [...recent, next.id];
    }
    expect(new Set(seen).size).toBe(12);
  });

  it("after a full round, never brings back one of the recent three quarters", () => {
    const pool = Array.from({ length: 8 }, (_, i) => item(`hadith:${i}`, "hadith"));
    const recent = pool.map((p) => p.id); // all shown, hadith:7 most recently
    for (let r = 0; r < 20; r++) {
      const next = pickFreshItem(pool, recent, (n) => r % n)!;
      expect(recent.slice(-freshnessWindow(8))).not.toContain(next.id);
    }
  });

  it("never repeats immediately, even with a tiny category", () => {
    const pool = [item("poetry:a", "poetry"), item("poetry:b", "poetry")];
    expect(pickFreshItem(pool, ["poetry:a", "poetry:b"], () => 0)!.id).toBe("poetry:a");
    expect(pickFreshItem(pool, ["poetry:b", "poetry:a"], () => 0)!.id).toBe("poetry:b");
  });

  it("the freshness window is three quarters of the category, never all of it", () => {
    expect(freshnessWindow(1)).toBe(1);
    expect(freshnessWindow(2)).toBe(1);
    expect(freshnessWindow(4)).toBe(3);
    expect(freshnessWindow(100)).toBe(75);
  });

  it("works on the real pool: 50 'Next's in a row show 50 different items", () => {
    const pool = reminderPool();
    let recent: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const next = pickFreshItem(pool, recent, (n) => (i * 7919) % n)!;
      seen.add(next.id);
      recent = [...recent, next.id];
    }
    expect(seen.size).toBe(50);
  });
});

describe("comment rotation", () => {
  it("goes through every comment of an item before reusing one, then reuses the oldest", () => {
    const comments = [comment("a"), comment("b"), comment("c")];
    let recent: string[] = [];
    const shown: string[] = [];
    for (let i = 0; i < 6; i++) {
      const c = pickComment(comments, recent)!;
      shown.push(c.id);
      recent = [...recent.filter((x) => x !== c.id), c.id];
    }
    expect(shown).toEqual(["a", "b", "c", "a", "b", "c"]);
  });

  it("an item seen again gets a different comment than last time", () => {
    const virtue = findReminderItem("virtue:8")!;
    expect(virtue.comments.length).toBeGreaterThanOrEqual(3);
    const first = pickComment(virtue.comments, [])!;
    const second = pickComment(virtue.comments, [first.id])!;
    expect(second.id).not.toBe(first.id);
  });

  it("finds a comment the widget showed by its id, and nothing for an unknown one", () => {
    const virtue = findReminderItem("virtue:8")!;
    expect(findComment(virtue, virtue.comments[2].id)).toBe(virtue.comments[2]);
    expect(findComment(virtue, "nope")).toBeUndefined();
    expect(findComment(virtue, null)).toBeUndefined();
  });
});

describe("history survives a restart", () => {
  it("is saved and read back (as after relaunching the app)", () => {
    recordShown("dua:x", "dua-cat:general:c1");
    recordShown("hadith:y", "hadith:y:c2");
    const history = loadContentHistory();
    expect(history.items).toEqual(["dua:x", "hadith:y"]);
    expect(history.comments).toEqual(["dua-cat:general:c1", "hadith:y:c2"]);
  });

  it("moves a re-shown item to the end instead of duplicating it, and stays bounded", () => {
    recordShown("a");
    recordShown("b");
    recordShown("a");
    expect(loadContentHistory().items).toEqual(["b", "a"]);
    for (let i = 0; i < ITEM_HISTORY_LIMIT + 50; i++) recordShown(`i${i}`, `c${i}`);
    const history = loadContentHistory();
    expect(history.items.length).toBe(ITEM_HISTORY_LIMIT);
    expect(history.comments.length).toBeLessThanOrEqual(COMMENT_HISTORY_LIMIT);
    expect(history.items.at(-1)).toBe(`i${ITEM_HISTORY_LIMIT + 49}`);
  });

  it("starts fresh from corrupt storage instead of throwing", () => {
    localStorage.setItem("dithar:content-history:v1", "{not json");
    expect(loadContentHistory()).toEqual({ items: [], comments: [] });
    localStorage.setItem("dithar:content-history:v1", JSON.stringify({ items: [1, "ok", null], comments: "x" }));
    expect(loadContentHistory()).toEqual({ items: ["ok"], comments: [] });
  });
});
