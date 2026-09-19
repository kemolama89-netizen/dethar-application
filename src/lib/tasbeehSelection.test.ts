// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadSelectedDhikrId,
  saveSelectedDhikrId,
  loadTasbeehTargets,
  saveTasbeehTargets,
  loadCelebratedTargets,
  saveCelebratedTargets,
} from "./tasbeehSelection";

const SELECTED_KEY = "dithar:tasbeeh:selectedDhikr:v1";
const TARGETS_KEY = "dithar:tasbeeh:targets:v1";
const valid = (id: number) => id >= 1 && id <= 10;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("selected dhikr persistence", () => {
  it("returns null when nothing is saved", () => {
    expect(loadSelectedDhikrId(valid)).toBeNull();
  });

  it("round-trips a saved id", () => {
    saveSelectedDhikrId(7);
    expect(loadSelectedDhikrId(valid)).toBe(7);
  });

  it.each([
    ["an id no longer in the library", "99"],
    ["a non-integer", "2.5"],
    ["a string", '"3"'],
    ["null", "null"],
    ["an object", "{}"],
    ["corrupt JSON", "{oops"],
  ])("ignores %s", (_label, raw) => {
    localStorage.setItem(SELECTED_KEY, raw);
    expect(loadSelectedDhikrId(valid)).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(loadSelectedDhikrId(valid)).toBeNull();
    expect(() => saveSelectedDhikrId(3)).not.toThrow();
    expect(loadTasbeehTargets(valid)).toEqual({});
    expect(() => saveTasbeehTargets({ 1: "33" })).not.toThrow();
  });
});

describe("per-dhikr target persistence", () => {
  it("returns {} when nothing is saved", () => {
    expect(loadTasbeehTargets(valid)).toEqual({});
  });

  it("round-trips targets for several dhikr independently", () => {
    saveTasbeehTargets({ 1: "33", 4: "100" });
    expect(loadTasbeehTargets(valid)).toEqual({ 1: "33", 4: "100" });
  });

  it("drops entries that are not a positive-integer string for a valid id, keeping the good ones", () => {
    localStorage.setItem(
      TARGETS_KEY,
      JSON.stringify({ 1: "33", 2: "0", 3: "", 4: "abc", 5: 100, 6: "07", 99: "10", x: "5", 7: "1e3", 8: "-4" }),
    );
    expect(loadTasbeehTargets(valid)).toEqual({ 1: "33" });
  });

  it.each([["an array", "[1,2]"], ["a number", "5"], ["null", "null"], ["corrupt JSON", "{oops"]])("returns {} for %s", (_l, raw) => {
    localStorage.setItem(TARGETS_KEY, raw);
    expect(loadTasbeehTargets(valid)).toEqual({});
  });
});

describe("celebrated-target persistence", () => {
  it("returns {} when nothing is saved and round-trips saved markers", () => {
    expect(loadCelebratedTargets(valid)).toEqual({});
    saveCelebratedTargets({ 2: 33, 5: 100 });
    expect(loadCelebratedTargets(valid)).toEqual({ 2: 33, 5: 100 });
  });

  it("drops invalid ids, non-positive/non-integer/non-number values and keeps the good ones", () => {
    localStorage.setItem(
      "dithar:tasbeeh:celebrated:v1",
      JSON.stringify({ 1: 33, 2: 0, 3: -5, 4: 2.5, 5: "10", 99: 7, x: 3 }),
    );
    expect(loadCelebratedTargets(valid)).toEqual({ 1: 33 });
  });

  it.each([["an array", "[1]"], ["null", "null"], ["corrupt JSON", "{oops"]])("returns {} for %s", (_l, raw) => {
    localStorage.setItem("dithar:tasbeeh:celebrated:v1", raw);
    expect(loadCelebratedTargets(valid)).toEqual({});
  });
});
