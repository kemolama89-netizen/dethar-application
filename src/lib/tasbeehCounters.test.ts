// @vitest-environment jsdom
//
// Regression coverage for tasbeehCounters.ts's event-driven listener
// fan-out (see saveTasbeehCounters/subscribeTasbeehCounters's own doc
// comments) — the mechanism that lets TasbeehScreen reflect a counters
// change from OUTSIDE its own handlers (a reconciled Floating Tasbeeh tap)
// immediately, without polling.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { loadTasbeehCounters, saveTasbeehCounters, subscribeTasbeehCounters } from "./tasbeehCounters";

beforeEach(() => {
  localStorage.clear();
});

describe("subscribeTasbeehCounters", () => {
  it("notifies subscribers with the exact counters object every saveTasbeehCounters call persists", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTasbeehCounters(listener);

    saveTasbeehCounters({ 1: 5 });

    expect(listener).toHaveBeenCalledWith({ 1: 5 });
    unsubscribe();
  });

  it("still persists to storage — the listener fan-out is additive, never a replacement", () => {
    subscribeTasbeehCounters(() => {});
    saveTasbeehCounters({ 3: 9 });
    expect(loadTasbeehCounters()[3]).toBe(9);
  });

  it("supports multiple simultaneous subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeTasbeehCounters(a);
    subscribeTasbeehCounters(b);

    saveTasbeehCounters({ 2: 1 });

    expect(a).toHaveBeenCalledWith({ 2: 1 });
    expect(b).toHaveBeenCalledWith({ 2: 1 });
  });

  it("stops notifying once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTasbeehCounters(listener);
    unsubscribe();

    saveTasbeehCounters({ 4: 2 });

    expect(listener).not.toHaveBeenCalled();
  });
});

// Stored-data validation (Batch 4, issue B): the live counts are the user's
// own progress, so a bad entry must cost at most itself — never the whole
// store — and must never surface as NaN/negative in the UI. Unknown dhikr
// ids are kept on purpose (history; an id may come back with a later library).
describe("loadTasbeehCounters — stored data validation", () => {
  const KEY = "dithar:tasbeeh:counters:v1";
  const BACKUP_KEY = `${KEY}:corrupt-backup`;

  it("returns {} and writes nothing when nothing is stored", () => {
    expect(loadTasbeehCounters()).toEqual({});
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("a valid store loads unchanged and leaves no backup", () => {
    const original = JSON.stringify({ 1: 33, 2: 0, 14: 1000 });
    localStorage.setItem(KEY, original);
    expect(loadTasbeehCounters()).toEqual({ 1: 33, 2: 0, 14: 1000 });
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(original);
  });

  it("keeps counts for dhikr ids that are not in the current library", () => {
    localStorage.setItem(KEY, JSON.stringify({ 1: 5, 9999: 42 }));
    expect(loadTasbeehCounters()).toEqual({ 1: 5, 9999: 42 });
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("drops only the bad entries, keeps every good one, and backs up the original text once", () => {
    const original = JSON.stringify({
      1: 10,
      2: -3, // negative
      3: null,
      4: "abc",
      5: { n: 1 },
      6: 7,
      abc: 5, // non-numeric id
      "07": 4, // non-canonical id
      "-1": 9,
      8: 1e400, // Infinity — JSON.stringify writes it as null
    });
    localStorage.setItem(KEY, original);
    expect(loadTasbeehCounters()).toEqual({ 1: 10, 6: 7 });
    expect(localStorage.getItem(BACKUP_KEY)).toBe(original);
  });

  it("repairs recoverable values instead of losing them: floors a fractional count, converts a digit-only string", () => {
    localStorage.setItem(KEY, JSON.stringify({ 1: 5.9, 2: "12" }));
    expect(loadTasbeehCounters()).toEqual({ 1: 5, 2: 12 });
    expect(localStorage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it("rejects a count beyond the safe-integer range for that entry only", () => {
    localStorage.setItem(KEY, '{"1":9007199254740993,"2":4}');
    expect(loadTasbeehCounters()).toEqual({ 2: 4 });
  });

  it.each([
    ["an array", "[1,2,3]"],
    ["a string", '"hello"'],
    ["a number", "7"],
    ["null", "null"],
    ["corrupt JSON", "{oops"],
  ])("treats %s as an empty store, without throwing, and preserves the original", (_label, raw) => {
    localStorage.setItem(KEY, raw);
    expect(loadTasbeehCounters()).toEqual({});
    expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it("the FIRST unreadable snapshot is the one preserved — a later corrupt load never overwrites the backup", () => {
    localStorage.setItem(KEY, "first-corrupt");
    loadTasbeehCounters();
    localStorage.setItem(KEY, "second-corrupt");
    loadTasbeehCounters();
    expect(localStorage.getItem(BACKUP_KEY)).toBe("first-corrupt");
  });

  it("a saved store round-trips, and unknown ids survive a save that follows a load", () => {
    localStorage.setItem(KEY, JSON.stringify({ 9999: 42, 1: 2 }));
    const loaded = loadTasbeehCounters();
    saveTasbeehCounters({ ...loaded, 1: 3 });
    expect(loadTasbeehCounters()).toEqual({ 9999: 42, 1: 3 });
  });

  it("never throws when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadTasbeehCounters()).toEqual({});
    vi.restoreAllMocks();
  });
});
