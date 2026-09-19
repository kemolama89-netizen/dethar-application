// @vitest-environment jsdom
//
// Regression coverage for recordTasbeehRepetitions — the batched sibling of
// recordTasbeehRepetition added to shave the latency Voice Tasbeeh's counter
// UI update was blocked behind (see TasbeehScreen.tsx's applyVoiceRepetitions,
// its only caller, and this function's own doc comment in stats.ts). The
// requirement this file protects: batching the localStorage write must never
// change WHAT gets recorded, in what order, or how many events end up
// persisted — only how many synchronous writes it takes to get there.
import { describe, expect, it, beforeEach } from "vitest";
import {
  recordTasbeehRepetition,
  recordTasbeehRepetitions,
  recordFloatingTasbeehRepetition,
  getTasbeehStats,
  getPrayerStats,
  getWirdDayStats,
  clearAllStats,
  resolveCustomRange,
  addDays,
} from "./stats";

const STORAGE_KEY = "dithar:stats:events:v1";
const ALL = { kind: "all" } as const;

beforeEach(() => {
  // clearAllStats() (not just localStorage.clear()) — stats.ts keeps a
  // module-level in-memory cache that a bare localStorage.clear() would
  // leave stale across tests in this same file.
  clearAllStats();
});

describe("recordTasbeehRepetitions", () => {
  it("records exactly `times` events for the given dhikr, matching calling recordTasbeehRepetition() that many times", () => {
    recordTasbeehRepetitions(7, 3);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(3);
    expect(stats.perDhikr).toEqual([{ dhikrId: "7", total: 3 }]);
  });

  it("does one single localStorage write for a burst, not one per repetition", () => {
    const originalSetItem = Storage.prototype.setItem;
    let writeCount = 0;
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key === STORAGE_KEY) writeCount += 1;
      return originalSetItem.call(this, key, value);
    };
    try {
      recordTasbeehRepetitions(1, 5);
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
    expect(writeCount).toBe(1);
    expect(getTasbeehStats(ALL).total).toBe(5);
  });

  it("is a no-op for times <= 0 — never writes, never records a phantom event", () => {
    recordTasbeehRepetitions(1, 0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getTasbeehStats(ALL).total).toBe(0);
  });

  it("interleaves correctly with plain recordTasbeehRepetition — both share the same underlying log", () => {
    recordTasbeehRepetition(1);
    recordTasbeehRepetitions(1, 2);
    recordTasbeehRepetition(2);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(4);
    expect(stats.perDhikr.sort((a, b) => a.dhikrId.localeCompare(b.dhikrId))).toEqual([
      { dhikrId: "1", total: 3 },
      { dhikrId: "2", total: 1 },
    ]);
  });

  it("persists across a fresh module load (i.e. actually reaches localStorage, not just the in-memory cache)", () => {
    recordTasbeehRepetitions(4, 3);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.filter((e: { dhikrId: string }) => e.dhikrId === "4")).toHaveLength(3);
  });
});

// Regression coverage for the Floating Tasbeeh feature's own source — see
// recordFloatingTasbeehRepetition's doc comment in stats.ts. The
// requirement this protects: a repetition committed from outside the app
// is tagged `source: "floating"` in the raw log, but still folds into the
// exact same getTasbeehStats() total/breakdown a manual or Voice Tasbeeh
// repetition would — never a second, isolated number.
describe("recordFloatingTasbeehRepetition", () => {
  it('records exactly `times` events, tagged source "floating" in the raw log', () => {
    recordFloatingTasbeehRepetition(9, 4);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const events = raw.filter((e: { dhikrId: string }) => e.dhikrId === "9");
    expect(events).toHaveLength(4);
    expect(events.every((e: { source: string }) => e.source === "floating")).toBe(true);
  });

  it("is a no-op for times <= 0 — never writes, never records a phantom event", () => {
    recordFloatingTasbeehRepetition(9, 0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getTasbeehStats(ALL).total).toBe(0);
  });

  it("folds into the SAME getTasbeehStats() total/breakdown as manual/Voice tasbeeh repetitions, matching the exact 'in-app 40 + floating 33 = 73' scenario", () => {
    recordTasbeehRepetitions(3, 40);
    recordFloatingTasbeehRepetition(3, 33);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(73);
    expect(stats.perDhikr).toEqual([{ dhikrId: "3", total: 73 }]);
  });

  it("interleaves correctly across manual, batched, and floating sources for the same dhikr", () => {
    recordTasbeehRepetition(5);
    recordTasbeehRepetitions(5, 2);
    recordFloatingTasbeehRepetition(5, 3);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(6);
    expect(stats.perDhikr).toEqual([{ dhikrId: "5", total: 6 }]);
  });

  it('never leaks into the Written Adhkar (Morning/Prayer) aggregators, which filter by source "written" only', () => {
    recordFloatingTasbeehRepetition(1, 5);
    expect(getWirdDayStats("morning", ALL).perDhikr).toEqual([]);
    expect(getPrayerStats(ALL).perDhikr).toEqual([]);
  });
});

// The custom-range picker's raw values -> the inclusive range actually
// reported (see resolveCustomRange's own doc comment for why the pickers'
// own values are never snapped). All plain string logic, so none of it can
// be timezone-sensitive — the TZ-varied runs of this file prove that.
describe("resolveCustomRange", () => {
  const TODAY = "2026-09-19";

  it("keeps an already-ordered range as is", () => {
    expect(resolveCustomRange("2026-09-01", "2026-09-10", TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-10" });
  });

  it("orders an inverted pair chronologically instead of producing an empty range", () => {
    expect(resolveCustomRange("2026-09-12", "2026-09-09", TODAY)).toEqual({ from: "2026-09-09", to: "2026-09-12" });
  });

  it("accepts a single-day range (from === to)", () => {
    expect(resolveCustomRange("2026-08-30", "2026-08-30", TODAY)).toEqual({ from: "2026-08-30", to: "2026-08-30" });
  });

  it("caps any date after today at today", () => {
    expect(resolveCustomRange("2026-09-10", "2027-01-01", TODAY)).toEqual({ from: "2026-09-10", to: TODAY });
    expect(resolveCustomRange("2027-01-01", "2028-01-01", TODAY)).toEqual({ from: TODAY, to: TODAY });
  });

  it("falls back to today for a value that is not a full YYYY-MM-DD", () => {
    expect(resolveCustomRange("", "2026-09-10", TODAY)).toEqual({ from: "2026-09-10", to: TODAY });
    expect(resolveCustomRange("2026-09", "2026-09-10", TODAY)).toEqual({ from: "2026-09-10", to: TODAY });
  });

  it("tolerates the partial values a native date input reports mid-typing (year arrives digit by digit)", () => {
    // Still a well-formed date string, so it is used as-is — the range just
    // temporarily spans further back, and settles once typing finishes.
    expect(resolveCustomRange("0002-09-01", "2026-09-10", TODAY)).toEqual({ from: "0002-09-01", to: "2026-09-10" });
    expect(resolveCustomRange("2026-09-01", "2026-09-10", TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-10" });
  });

  it("selects exactly the events inside the resolved range, inclusive, in either pick order", () => {
    const at = (localDate: string) => ({ ts: 1, localDate, localTime: "10:00:00", timeZone: "UTC" });
    recordFloatingTasbeehRepetition(1, 2, at("2026-09-05"));
    recordFloatingTasbeehRepetition(1, 3, at("2026-09-07"));
    recordFloatingTasbeehRepetition(1, 4, at("2026-09-09"));

    const total = (a: string, b: string) => {
      const range = resolveCustomRange(a, b, TODAY);
      return getTasbeehStats({ kind: "custom", ...range }).total;
    };
    expect(total("2026-09-05", "2026-09-07")).toBe(5);
    expect(total("2026-09-07", "2026-09-05")).toBe(5);
    expect(total("2026-09-09", "2026-09-09")).toBe(4);
    expect(total("2026-09-06", "2026-09-08")).toBe(3);
  });

  it("addDays around DST/month/year boundaries never drifts a day", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09"); // US DST start
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26"); // EU DST end
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
