// @vitest-environment jsdom
//
// Regression coverage for the Shared Tasbeeh Counting Core (see
// tasbeehCommit.ts's own doc comment). What this file protects:
//   - manual and floating commits both persist to the SAME counters store
//     and the SAME Statistics log, so a floating tap can never become an
//     isolated, second counter.
//   - floating repetitions are tagged source "floating" but still fold
//     into the app's existing Tasbeeh totals.
//   - the Voice Tasbeeh increment helper never itself writes to the
//     Statistics log (see its own doc comment in tasbeehCommit.ts for why).
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("./floatingTasbeehBridge", async (importOriginal) => {
  // Defaults to unavailable — every test in this file except the dedicated
  // "live sync" describe block below only cares about counters/Statistics
  // and should see the native push as a complete no-op, exactly as it
  // already is for real on every non-Android platform.
  const actual = await importOriginal<typeof import("./floatingTasbeehBridge")>();
  return {
    ...actual,
    isFloatingTasbeehAvailable: vi.fn(() => false),
    FloatingTasbeeh: {
      ...actual.FloatingTasbeeh,
      syncLiveCount: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { commitManualTasbeehRepetition, commitFloatingTasbeehRepetition, applyVoiceTasbeehCountIncrement } from "./tasbeehCommit";
import { loadTasbeehCounters, saveTasbeehCounters, type TasbeehCounters } from "./tasbeehCounters";
import { getTasbeehStats, clearAllStats } from "./stats";
import { FloatingTasbeeh, isFloatingTasbeehAvailable } from "./floatingTasbeehBridge";

const ALL = { kind: "all" } as const;

beforeEach(() => {
  localStorage.clear();
  // stats.ts keeps a module-level in-memory cache that localStorage.clear()
  // alone doesn't reset — same note as stats.test.ts/TasbeehScreen.test.tsx.
  clearAllStats();
  vi.mocked(FloatingTasbeeh.syncLiveCount).mockClear();
});

describe("commitManualTasbeehRepetition", () => {
  it("increments the given dhikr's counter by 1 and returns the updated map", () => {
    const updated = commitManualTasbeehRepetition({ 1: 4 }, 1);
    expect(updated).toEqual({ 1: 5 });
  });

  it("persists the updated counters to the shared counter store", () => {
    commitManualTasbeehRepetition({}, 2);
    expect(loadTasbeehCounters()[2]).toBe(1);
  });

  it("records exactly one Statistics event tagged source \"tasbeeh\"", () => {
    commitManualTasbeehRepetition({}, 3);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(1);
    expect(stats.perDhikr).toEqual([{ dhikrId: "3", total: 1 }]);
  });

  it("never mutates the counters object passed in", () => {
    const original: TasbeehCounters = { 1: 4 };
    commitManualTasbeehRepetition(original, 1);
    expect(original).toEqual({ 1: 4 });
  });
});

describe("commitFloatingTasbeehRepetition", () => {
  it("defaults `times` to 1 for a single floating tap", () => {
    const updated = commitFloatingTasbeehRepetition({}, 7);
    expect(updated).toEqual({ 7: 1 });
  });

  it("records the repetition tagged source \"floating\" in the raw event log", () => {
    commitFloatingTasbeehRepetition({}, 7, 1);
    const raw = JSON.parse(localStorage.getItem("dithar:stats:events:v1")!);
    expect(raw).toHaveLength(1);
    expect(raw[0].source).toBe("floating");
    expect(raw[0].dhikrId).toBe("7");
  });

  it("shares the SAME counters store as a manual commit — the exact 'in-app 40 + floating 33 = 73' scenario", () => {
    let counters = commitManualTasbeehRepetition({}, 3); // +1
    // Seed the rest of the in-app 40 directly via the same persisted store
    // a real TasbeehScreen session would have already built up.
    saveTasbeehCounters({ 3: 40 });
    counters = loadTasbeehCounters();
    counters = commitFloatingTasbeehRepetition(counters, 3, 33);

    expect(counters[3]).toBe(73);
    expect(loadTasbeehCounters()[3]).toBe(73);
  });

  it("folds into the SAME getTasbeehStats() total as manual repetitions for the same dhikr, not a separate number", () => {
    let counters: TasbeehCounters = {};
    for (let i = 0; i < 5; i++) counters = commitManualTasbeehRepetition(counters, 4);
    counters = commitFloatingTasbeehRepetition(counters, 4, 2);

    expect(counters[4]).toBe(7);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(7);
    expect(stats.perDhikr).toEqual([{ dhikrId: "4", total: 7 }]);
  });

  it("is a no-op for times <= 0 — never writes counters, never records a phantom event", () => {
    const updated = commitFloatingTasbeehRepetition({ 8: 2 }, 8, 0);
    // The counters increment itself is unconditional in applyTasbeehCountIncrement
    // (adding 0 is a no-op value-wise), but no Statistics event may be recorded.
    expect(updated).toEqual({ 8: 2 });
    expect(getTasbeehStats(ALL).total).toBe(0);
  });
});

describe("applyVoiceTasbeehCountIncrement", () => {
  it("increments the given dhikr's counter by `times` and returns the updated map", () => {
    const updated = applyVoiceTasbeehCountIncrement({ 6: 1 }, 6, 3);
    expect(updated).toEqual({ 6: 4 });
  });

  it("persists the updated counters to the shared counter store", () => {
    applyVoiceTasbeehCountIncrement({}, 6, 2);
    expect(loadTasbeehCounters()[6]).toBe(2);
  });

  it("does NOT itself record any Statistics event — the caller (TasbeehScreen's applyVoiceRepetitions) owns that call, exactly once, outside any React state updater", () => {
    applyVoiceTasbeehCountIncrement({}, 6, 5);
    expect(getTasbeehStats(ALL).total).toBe(0);
    expect(localStorage.getItem("dithar:stats:events:v1")).toBeNull();
  });
});

describe("Floating Tasbeeh live sync — every real commit path pushes to the SAME native mirror a floating tap writes", () => {
  beforeEach(() => {
    vi.mocked(isFloatingTasbeehAvailable).mockReturnValue(true);
  });
  afterEach(() => {
    vi.mocked(isFloatingTasbeehAvailable).mockReturnValue(false);
  });

  it("commitManualTasbeehRepetition pushes the dhikr's updated count to native", () => {
    commitManualTasbeehRepetition({ 5: 2 }, 5);
    expect(FloatingTasbeeh.syncLiveCount).toHaveBeenCalledWith({ dhikrId: 5, count: 3 });
  });

  it("commitFloatingTasbeehRepetition pushes the dhikr's updated count to native", () => {
    commitFloatingTasbeehRepetition({}, 7, 4);
    expect(FloatingTasbeeh.syncLiveCount).toHaveBeenCalledWith({ dhikrId: 7, count: 4 });
  });

  it("applyVoiceTasbeehCountIncrement pushes the dhikr's updated count to native", () => {
    applyVoiceTasbeehCountIncrement({ 2: 1 }, 2, 3);
    expect(FloatingTasbeeh.syncLiveCount).toHaveBeenCalledWith({ dhikrId: 2, count: 4 });
  });

  it("is a safe no-op on every platform without the native bridge", () => {
    vi.mocked(isFloatingTasbeehAvailable).mockReturnValue(false);
    commitManualTasbeehRepetition({}, 1);
    expect(FloatingTasbeeh.syncLiveCount).not.toHaveBeenCalled();
  });
});
