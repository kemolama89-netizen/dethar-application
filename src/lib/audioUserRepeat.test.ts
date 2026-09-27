// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getUserRepeatCount, isValidUserRepeatCount, setUserRepeatCount } from "./audioUserRepeat";

beforeEach(() => setUserRepeatCount("morning_023", null));

describe("user-chosen audio repeat counts", () => {
  it("is null until the user chooses", () => {
    expect(getUserRepeatCount("morning_023")).toBeNull();
  });

  it("saves, persists and clears a chosen count", () => {
    setUserRepeatCount("morning_023", 7);
    expect(getUserRepeatCount("morning_023")).toBe(7);
    expect(JSON.parse(localStorage.getItem("dithar:audio-adhkar:user-repeat:v1")!)).toEqual({ morning_023: 7 });
    setUserRepeatCount("morning_023", null);
    expect(getUserRepeatCount("morning_023")).toBeNull();
  });

  it("ignores invalid counts", () => {
    setUserRepeatCount("morning_023", 4);
    for (const bad of [0, -1, 1.5, 101, Number.NaN]) setUserRepeatCount("morning_023", bad);
    expect(getUserRepeatCount("morning_023")).toBe(4);
    expect([1, 100].every(isValidUserRepeatCount)).toBe(true);
  });
});
