// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { pageOf, pageVerses } from "./quranMeta";
import {
  JOURNEY_PAGES,
  applyView,
  chooseInsight,
  dailyAssignment,
  eligibleInsights,
  emptyJourney,
  isEligibleInsight,
  journeyStats,
  loadJourney,
  nextPage,
  orderInsights,
  recordDailyInsightViewed,
} from "./quranJourney";
import type { DailyAssignment, InsightId, JourneyState } from "./quranJourney";

const KEY = "dithar:quran-journey:v1";
/** Three made-up insight ids per page: the journey logic, without loading the Tafsir. */
const fake = async (page: number): Promise<InsightId[]> => orderInsights(page, [`${page}:1`, `${page}:2`, `${page}:3`]);
const day = (n: number) => {
  const d = new Date(2026, 0, 1 + n, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const at = (n: number) => new Date(2026, 0, 1 + n, 12);

/** Opens and views the day's insight on day [n]; returns the assignment. */
async function exploreDay(n: number, eligible = fake): Promise<DailyAssignment> {
  const status = await dailyAssignment(day(n), eligible);
  if (status.kind !== "assigned") throw new Error("not assigned");
  recordDailyInsightViewed(status.assignment, at(n));
  return status.assignment;
}

/** A round with every page explored but [missing], dated well before day 0. */
function nearlyComplete(missing: number[]): JourneyState {
  const visits = [];
  for (let p = 1; p <= JOURNEY_PAGES; p++) if (!missing.includes(p)) visits.push({ page: p, insight: `${p}:1`, localDate: "2025-01-01", ts: p });
  return { v: 1, rounds: [{ n: 1, startedOn: "2024-01-01", visits }] };
}

beforeEach(() => localStorage.clear());

describe("the day's page", () => {
  it("starts at page 1 and moves on one page a day, only once the day's insight is viewed", async () => {
    const first = await dailyAssignment(day(0), fake);
    expect(first).toMatchObject({ kind: "assigned", explored: false, assignment: { page: 1, round: 1 } });
    // Not viewed: the next day is still page 1, nothing counted.
    const again = await dailyAssignment(day(1), fake);
    expect(again).toMatchObject({ assignment: { page: 1 }, explored: false });
    expect(loadJourney()!.rounds).toEqual([]);
    await exploreDay(1);
    expect(await dailyAssignment(day(1), fake)).toMatchObject({ assignment: { page: 1 }, explored: true });
    expect((await exploreDay(2)).page).toBe(2);
    expect((await exploreDay(3)).page).toBe(3);
  });

  it("stays the same all day, and never gives a second page on the same day", async () => {
    const a = await dailyAssignment(day(0), fake);
    expect(await dailyAssignment(day(0), fake)).toEqual(a);
    await exploreDay(0);
    const after = await dailyAssignment(day(0), fake);
    expect(after).toMatchObject({ assignment: { page: 1 }, explored: true });
  });

  it("chooses only an insight of the page itself", async () => {
    for (let n = 0; n < 5; n++) {
      const a = await exploreDay(n);
      expect(a.insight.startsWith(`${a.page}:`)).toBe(true);
    }
  });
});

describe("duplicate prevention", () => {
  it("counts a page once, however many times its insight is viewed", async () => {
    const a = await exploreDay(0);
    expect(recordDailyInsightViewed(a, at(0))).toBe(true); // Saved again, unchanged.
    recordDailyInsightViewed(a, at(0));
    expect(loadJourney()!.rounds[0].visits).toHaveLength(1);
    expect(journeyStats(loadJourney()!, { kind: "all" }).totalViews).toBe(1);
  });

  it("ignores a view of anything but the day's own assignment", async () => {
    const a = await exploreDay(0);
    expect(recordDailyInsightViewed({ ...a, localDate: day(5) })).toBe(false);
    expect(recordDailyInsightViewed({ ...a, page: 9, insight: "9:1" })).toBe(false);
    expect(loadJourney()!.rounds[0].visits.map((v) => v.page)).toEqual([1]);
  });

  it("never records a page twice in one round, even from a stale assignment", () => {
    const state = applyView(emptyJourney(), { localDate: day(0), round: 1, page: 1, insight: "1:1" }, 1);
    const again = applyView(state, { localDate: day(1), round: 1, page: 1, insight: "1:2" }, 2);
    expect(again).toBe(state);
  });

  it("keeps every valid record when storage holds a broken one, and drops repeated pages", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        rounds: [{ n: 1, startedOn: "2026-01-01", visits: [{ page: 1, insight: "1:1", localDate: "2026-01-01", ts: 1 }, { page: 1, insight: "1:2", localDate: "2026-01-02", ts: 2 }, { page: 999, insight: "x", localDate: "bad", ts: 3 }, { page: 2, insight: "2:3", localDate: "2026-01-02", ts: 4 }] }],
      }),
    );
    expect(loadJourney()!.rounds[0].visits.map((v) => v.page)).toEqual([1, 2]);
  });

  it("never replaces an unreadable journey with a fresh one", async () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadJourney()).toBeNull();
    expect(await dailyAssignment(day(0), fake)).toEqual({ kind: "unavailable" });
    expect(localStorage.getItem(KEY)).toBe("{not json");
  });
});

describe("round renewal", () => {
  it("completes the round on page 604 and starts round 2 the next day at page 1, keeping round 1", async () => {
    localStorage.setItem(KEY, JSON.stringify(nearlyComplete([604])));
    const last = await exploreDay(0);
    expect(last.page).toBe(604);
    const round1 = loadJourney()!.rounds[0];
    expect(round1.completedOn).toBe(day(0));
    expect(round1.visits).toHaveLength(JOURNEY_PAGES);
    // The same day: no new round yet.
    expect(await dailyAssignment(day(0), fake)).toMatchObject({ explored: true, assignment: { page: 604, round: 1 } });
    const next = await exploreDay(1);
    expect(next).toMatchObject({ round: 2, page: 1 });
    const state = loadJourney()!;
    expect(state.rounds.map((r) => r.n)).toEqual([1, 2]);
    expect(state.rounds[0].visits).toHaveLength(JOURNEY_PAGES); // Round 1 kept whole.
    expect(state.rounds[1]).toMatchObject({ startedOn: day(1), visits: [{ page: 1 }] });
  });

  it("gives each page a different insight in each new round until all of its own are used", async () => {
    const used: InsightId[] = [];
    let state = emptyJourney();
    for (let round = 1; round <= 3; round++) {
      const insight = chooseInsight(state, 7, await fake(7))!;
      used.push(insight);
      state = applyView({ ...state, rounds: [...state.rounds.map((r) => ({ ...r, completedOn: r.completedOn ?? "2026-01-01" }))] }, { localDate: day(round), round, page: 7, insight }, round);
    }
    expect(new Set(used).size).toBe(3); // Three rounds, three different insights.
    expect(used.every((id) => id.startsWith("7:"))).toBe(true);
  });

  it("once all of a page's insights are used, repeats the one used longest ago — never one from another page", () => {
    const state: JourneyState = {
      v: 1,
      rounds: [
        { n: 1, startedOn: "2024-01-01", completedOn: "2025-01-01", visits: [{ page: 48, insight: "2:282", localDate: "2024-03-01", ts: 1 }] },
        { n: 2, startedOn: "2025-01-02", visits: [] },
      ],
    };
    expect(chooseInsight(state, 48, ["2:282"])).toBe("2:282");
    const two: JourneyState = {
      v: 1,
      rounds: [
        { n: 1, startedOn: "2024-01-01", completedOn: "2025-01-01", visits: [{ page: 5, insight: "2:30", localDate: "2024-01-05", ts: 10 }] },
        { n: 2, startedOn: "2025-01-02", completedOn: "2026-01-01", visits: [{ page: 5, insight: "2:31", localDate: "2025-01-05", ts: 20 }] },
      ],
    };
    expect(chooseInsight(two, 5, ["2:31", "2:30"])).toBe("2:30");
  });

  it("an earlier round's page doesn't stop it in the new round", () => {
    const round = { n: 2, startedOn: "2026-01-01", visits: [] };
    expect(nextPage(round)).toBe(1);
  });
});

describe("statistics", () => {
  it("reports the round's progress, insights viewed by period, rounds, years and history", async () => {
    await exploreDay(0);
    await exploreDay(1);
    const s = journeyStats(loadJourney()!, { kind: "daily", date: day(1) });
    expect(s.round).toMatchObject({ n: 1, explored: 2, percent: 0.3 });
    expect(s.viewedInSelection).toBe(1);
    expect(s.totalViews).toBe(2);
    expect(s.years).toEqual([{ year: 2026, explored: 2 }]);
    expect(s.history.map((h) => h.page)).toEqual([2, 1]);
    expect(s.rounds).toEqual([{ n: 1, explored: 2, startedOn: day(0) }]);
  });

  it("is kept apart from the Adhkar and Tasbeeh statistics", async () => {
    await exploreDay(0);
    expect(localStorage.getItem("dithar:stats:events:v1")).toBeNull();
  });
});

describe("insights from al-Sa'di's own text", () => {
  it("leaves out «not explained» notes, bare cross-references and passing glosses", () => {
    expect(isEligibleInsight("لم يُفسِّرها الشيخ رحمه الله.", 50)).toBe(false);
    expect(isEligibleInsight("{122} وقد تقدم تفسير الآية التي بعدها.", 122)).toBe(false);
    expect(isEligibleInsight("فثبتوا وصبروا لقتال عدوهم جالوت وجنوده.", 250)).toBe(false);
  });

  it("orders a page's insights the same way every time, and adding one doesn't reorder the rest", () => {
    const a = orderInsights(12, ["2:80", "2:81", "2:82", "2:83"]);
    expect(orderInsights(12, ["2:83", "2:82", "2:81", "2:80"])).toEqual(a);
    const withNew = orderInsights(12, ["2:80", "2:81", "2:82", "2:83", "2:84"]).filter((id) => id !== "2:84");
    expect(withNew).toEqual(a);
  });

  it("takes every page's insights from its own verses, with the counts the dataset gives", async () => {
    // The thinnest pages, as measured over the whole Tafsir (2026-11-06): page 48 is 2:282 alone.
    expect(await eligibleInsights(48)).toEqual(["2:282"]);
    for (const page of [1, 16, 37, 106, 358, 604]) {
      const ids = await eligibleInsights(page);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      const own = new Set(pageVerses(page).map(([s, a]) => `${s}:${a}`));
      expect(ids.every((id) => own.has(id))).toBe(true);
      for (const id of ids) {
        const [s, a] = id.split(":").map(Number);
        expect(pageOf(s, a)).toBe(page);
      }
    }
  });

  it("finds an insight for every one of the 604 pages", async () => {
    let total = 0;
    for (let page = 1; page <= JOURNEY_PAGES; page++) {
      const ids = await eligibleInsights(page);
      expect(ids.length, `page ${page}`).toBeGreaterThan(0);
      total += ids.length;
    }
    expect(total).toBe(5759);
  }, 60_000);
});
