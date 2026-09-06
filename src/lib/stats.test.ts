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
import { recordTasbeehRepetition, recordTasbeehRepetitions, getTasbeehStats, clearAllStats } from "./stats";

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
