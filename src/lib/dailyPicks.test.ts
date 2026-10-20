// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MISC_DUAS } from "../data/misc-library";
import { buildDailyPicksRotation, computeDailyPickIds, dailyPicksPool, getDailyPicks, localDateKey } from "./dailyPicks";

const STORAGE_KEY = "dithar:misc:daily-picks:v1";

function dayKeys(from: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) => localDateKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12)));
}

describe("daily picks", () => {
  beforeEach(() => localStorage.clear());

  it("draws only from existing, general-purpose library duas", () => {
    const pool = dailyPicksPool();
    const ids = new Set(MISC_DUAS.map((d) => d.id));
    expect(pool.length).toBeGreaterThanOrEqual(20);
    for (const item of pool) {
      expect(ids.has(item.id)).toBe(true);
      expect(item.occasion_ar).toBeFalsy();
      expect(["travel", "food", "mosque", "prayer", "seasonal", "deceased", "healing", "home", "weather", "gatherings", "istikharah"]).not.toContain(
        item.categories[0],
      );
    }
  });

  it("gives three distinct items that change every day, never repeating on consecutive days", () => {
    const rotation = buildDailyPicksRotation(dailyPicksPool());
    const days = dayKeys(new Date(2026, 0, 1), 400);
    let previous: string[] = [];
    for (const day of days) {
      const ids = computeDailyPickIds(day, rotation);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
      for (const id of ids) expect(previous).not.toContain(id);
      previous = ids;
    }
  });

  it("is deterministic: the rotation and a date's picks are identical on every build of the rotation", () => {
    const a = buildDailyPicksRotation(dailyPicksPool()).map((d) => d.id);
    const b = buildDailyPicksRotation(dailyPicksPool()).map((d) => d.id);
    expect(a).toEqual(b);
    expect(computeDailyPickIds("2026-10-14", buildDailyPicksRotation(dailyPicksPool()))).toEqual(
      computeDailyPickIds("2026-10-14", buildDailyPicksRotation(dailyPicksPool())),
    );
  });

  it("mixes categories inside a day wherever the pool allows", () => {
    const rotation = buildDailyPicksRotation(dailyPicksPool());
    const byId = new Map(rotation.map((d) => [d.id, d]));
    let mixedDays = 0;
    const days = dayKeys(new Date(2026, 0, 1), 120);
    for (const day of days) {
      const categories = new Set(computeDailyPickIds(day, rotation).map((id) => byId.get(id)!.categories[0]));
      if (categories.size >= 2) mixedDays++;
    }
    expect(mixedDays / days.length).toBeGreaterThan(0.9);
  });

  it("keeps the same three for the whole day, across restarts (storage), and moves on the next day", () => {
    const morning = getDailyPicks(new Date(2026, 9, 14, 6, 0)).map((d) => d.id);
    const evening = getDailyPicks(new Date(2026, 9, 14, 23, 59)).map((d) => d.id);
    expect(evening).toEqual(morning);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ date: "2026-10-14", ids: morning });

    const tomorrow = getDailyPicks(new Date(2026, 9, 15, 0, 1)).map((d) => d.id);
    expect(tomorrow).not.toEqual(morning);
    for (const id of tomorrow) expect(morning).not.toContain(id);
  });

  it("honours a stored selection for today even if the rotation would now differ (e.g. an app update mid-day)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "2026-10-14", ids: ["dua-al-karb", "rabbana-atina", "sayyid-al-istighfar"] }));
    expect(getDailyPicks(new Date(2026, 9, 14, 12)).map((d) => d.id)).toEqual(["dua-al-karb", "rabbana-atina", "sayyid-al-istighfar"]);
  });

  it("ignores a stored selection that is stale or names an item that no longer exists", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "2026-10-14", ids: ["no-such-dua", "rabbana-atina", "dua-al-karb"] }));
    const picks = getDailyPicks(new Date(2026, 9, 14, 12));
    expect(picks).toHaveLength(3);
    expect(picks.map((d) => d.id)).not.toContain("no-such-dua");
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getDailyPicks(new Date(2026, 9, 14, 12))).toHaveLength(3);
  });
});
