// @vitest-environment jsdom
//
// C7 — Statistics data safety:
//   * stored data is validated before it's used (a corrupt log can never
//     make recording throw), and anything repaired/dropped leaves the
//     ORIGINAL text behind in a backup key instead of destroying it;
//   * valid existing history (including legacy entries) is preserved;
//   * a failed write never loses events from the session;
//   * another tab's writes are never silently overwritten;
//   * a replayed floating batch is never recorded twice.
//
// stats.ts keeps a module-level cache, so every test loads a FRESH copy of
// the module (vi.resetModules + dynamic import) against prepared storage —
// that's what a real app restart looks like.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "dithar:stats:events:v1";
const BACKUP_KEY = `${KEY}:corrupt-backup`;
const ALL = { kind: "all" } as const;

type StatsModule = typeof import("./stats");
async function freshStats(): Promise<StatsModule> {
  vi.resetModules();
  return import("./stats");
}

const goodEvent = (over: Record<string, unknown> = {}) => ({
  ts: 1_800_000_000_000,
  localDate: "2026-09-10",
  localTime: "10:00:00",
  timeZone: "Asia/Kuwait",
  kind: "repetition",
  source: "tasbeeh",
  dhikrId: "1",
  ...over,
});

const storedEvents = (): unknown[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("stored data is validated before use", () => {
  it("a valid log loads untouched: same events, no backup written", async () => {
    const original = JSON.stringify([goodEvent(), goodEvent({ dhikrId: "8", ts: 1_800_000_001_000 })]);
    localStorage.setItem(KEY, original);
    const stats = await freshStats();
    expect(stats.getTasbeehStats(ALL).total).toBe(2);
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(original);
  });

  it("a non-array value (object) no longer makes recording throw — it is backed up, and recording starts a fresh log", async () => {
    const corrupt = JSON.stringify({ events: [goodEvent()] });
    localStorage.setItem(KEY, corrupt);
    const stats = await freshStats();
    expect(() => stats.recordTasbeehRepetition(3)).not.toThrow();
    expect(stats.getTasbeehStats(ALL).total).toBe(1);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(corrupt);
    expect(storedEvents()).toHaveLength(1);
  });

  it.each([
    ["null", "null"],
    ["a number", "42"],
    ["a string", "\"hello\""],
    ["truncated JSON", "[{\"ts\":1,"],
    ["not JSON at all", "garbage"],
  ])("%s is treated as unreadable: backed up, and recording still works", async (_name, raw) => {
    localStorage.setItem(KEY, raw);
    const stats = await freshStats();
    expect(() => stats.recordTasbeehRepetitions(2, 3)).not.toThrow();
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it("keeps every valid event and drops only the unusable ones, preserving the original text in the backup", async () => {
    const original = JSON.stringify([
      goodEvent({ dhikrId: "1" }),
      null,
      "junk",
      42,
      goodEvent({ ts: "yesterday" }), // non-numeric ts
      goodEvent({ ts: null }),
      goodEvent({ kind: "mystery" }),
      goodEvent({ source: "audio" }), // unknown source
      goodEvent({ dhikrId: null }),
      goodEvent({ dhikrId: "" }),
      { ts: 5, kind: "wird-complete" }, // no category
      goodEvent({ dhikrId: "2", ts: 1_800_000_002_000 }),
    ]);
    localStorage.setItem(KEY, original);
    const stats = await freshStats();

    const tasbeeh = stats.getTasbeehStats(ALL);
    expect(tasbeeh.total).toBe(2);
    expect(tasbeeh.perDhikr.map((d) => d.dhikrId).sort()).toEqual(["1", "2"]);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(original);
  });

  it("repairs legacy/partial entries instead of dropping them: missing localDate is derived from ts, numeric dhikrId is stringified", async () => {
    const ts = new Date(2026, 8, 12, 9, 30, 0).getTime(); // local 2026-09-12
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { ts, kind: "repetition", source: "tasbeeh", dhikrId: 7 }, // legacy: no localDate/localTime/timeZone
        { ts, localDate: "not-a-date", kind: "repetition", source: "written", category: "morning", dhikrId: "m1" },
        { ts, kind: "wird-complete", category: "morning" },
      ]),
    );
    const stats = await freshStats();
    expect(stats.getTasbeehStats({ kind: "daily", date: "2026-09-12" })).toEqual({ total: 1, perDhikr: [{ dhikrId: "7", total: 1 }] });
    const morning = stats.getWirdDayStats("morning", { kind: "daily", date: "2026-09-12" });
    expect(morning.daysCompleted).toBe(1);
    expect(morning.perDhikr).toEqual([{ dhikrId: "m1", total: 1 }]);
  });

  it("the first unreadable snapshot is the one preserved — a later corrupt load never overwrites the backup", async () => {
    localStorage.setItem(KEY, "first-corrupt-version");
    (await freshStats()).getTasbeehStats(ALL); // the log loads lazily, on first read
    localStorage.setItem(KEY, "second-corrupt-version");
    (await freshStats()).getTasbeehStats(ALL);
    expect(localStorage.getItem(BACKUP_KEY)).toBe("first-corrupt-version");
  });

  it("an empty array and a missing key are both simply 'no history' (no backup)", async () => {
    localStorage.setItem(KEY, "[]");
    let stats = await freshStats();
    expect(stats.getTasbeehStats(ALL).total).toBe(0);
    localStorage.removeItem(KEY);
    stats = await freshStats();
    expect(stats.getTasbeehStats(ALL).total).toBe(0);
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("does not throw when storage itself can't be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const stats = await freshStats();
    expect(() => stats.recordTasbeehRepetition(1)).not.toThrow();
    expect(stats.getTasbeehStats(ALL).total).toBe(1);
  });
});

describe("a failed write never loses events", () => {
  it("events recorded while storage refuses writes stay in the session, and the next successful write persists ALL of them", async () => {
    const stats = await freshStats();
    stats.recordTasbeehRepetition(1); // persisted normally
    expect(storedEvents()).toHaveLength(1);

    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    stats.recordTasbeehRepetition(1);
    stats.recordTasbeehRepetitions(2, 2);
    expect(() => stats.recordWirdComplete("morning")).not.toThrow();
    expect(stats.getTasbeehStats(ALL).total).toBe(4); // still counted in this session
    expect(storedEvents()).toHaveLength(1); // storage still has only the first one

    setItem.mockRestore();
    stats.recordTasbeehRepetition(3); // storage is writable again
    expect(storedEvents()).toHaveLength(6); // 1 + 1 + 2 + 1 wird-complete + 1 — nothing was lost
    expect(stats.getTasbeehStats(ALL).total).toBe(5);
  });
});

describe("another tab's writes are not overwritten", () => {
  it("a 'storage' event for the stats key drops the stale cache, so the next record builds on the other tab's log", async () => {
    const stats = await freshStats();
    stats.recordTasbeehRepetition(1); // this tab's cache now holds 1 event
    expect(stats.getTasbeehStats(ALL).total).toBe(1);

    // "Another tab" appends two events to the shared storage...
    localStorage.setItem(KEY, JSON.stringify([goodEvent(), goodEvent({ ts: 1_800_000_003_000 }), goodEvent({ ts: 1_800_000_004_000 })]));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));

    // ...and this tab then records: it must keep them, not clobber them.
    stats.recordTasbeehRepetition(9);
    expect(storedEvents()).toHaveLength(4);
    expect(stats.getTasbeehStats(ALL).total).toBe(4);
  });

  it("a whole-storage clear (key === null) also invalidates the cache", async () => {
    const stats = await freshStats();
    stats.recordTasbeehRepetition(1);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(stats.getTasbeehStats(ALL).total).toBe(0);
  });

  it("a 'storage' event for an unrelated key leaves the cache alone (no needless re-parse)", async () => {
    const stats = await freshStats();
    stats.recordTasbeehRepetition(1);
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    window.dispatchEvent(new StorageEvent("storage", { key: "dithar:something:else" }));
    stats.getTasbeehStats(ALL);
    expect(getItem).not.toHaveBeenCalledWith(KEY);
  });
});

describe("replayed floating taps are never recorded twice", () => {
  const at = (ts: number) => ({ ts, localDate: "2026-09-10", localTime: "10:00:00", timeZone: "Asia/Kuwait" });
  const batch = () => [
    { dhikrId: 1, times: 1, occurredAt: at(1_800_000_000_100) },
    { dhikrId: 1, times: 1, occurredAt: at(1_800_000_001_100) },
    { dhikrId: 8, times: 1, occurredAt: at(1_800_000_001_100) }, // same moment, different dhikr => a different tap
  ];

  it("redelivering the same pending batch (process killed before native was told it was drained) adds nothing", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetitions(batch());
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
    stats.recordFloatingTasbeehRepetitions(batch());
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
    expect(storedEvents()).toHaveLength(3);
  });

  it("a replay is also caught after a restart (the log is what remembers)", async () => {
    let stats = await freshStats();
    stats.recordFloatingTasbeehRepetitions(batch());
    stats = await freshStats();
    stats.recordFloatingTasbeehRepetitions(batch());
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
  });

  it("a partially-overlapping redelivery records only the genuinely new taps", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetitions(batch().slice(0, 2));
    stats.recordFloatingTasbeehRepetitions([...batch(), { dhikrId: 1, times: 1, occurredAt: at(1_800_000_002_100) }]);
    expect(stats.getTasbeehStats(ALL).total).toBe(4);
  });

  it("the same tap listed twice inside one batch is recorded once", async () => {
    const stats = await freshStats();
    const entry = { dhikrId: 5, times: 1, occurredAt: at(1_800_000_000_500) };
    stats.recordFloatingTasbeehRepetitions([entry, { ...entry }]);
    expect(stats.getTasbeehStats(ALL).total).toBe(1);
  });

  it("the single-event recorder is replay-safe when given the tap's own occurredAt", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetition(2, 1, at(1_800_000_000_900));
    stats.recordFloatingTasbeehRepetition(2, 1, at(1_800_000_000_900));
    expect(stats.getTasbeehStats(ALL).total).toBe(1);
  });

  it("genuinely different taps are never merged: different moment, or different dhikr, or a manual/voice repetition at the same instant", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetition(2, 1, at(1_800_000_000_900));
    stats.recordFloatingTasbeehRepetition(2, 1, at(1_800_000_001_900));
    stats.recordFloatingTasbeehRepetition(3, 1, at(1_800_000_000_900));
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
  });

  it("without an explicit occurredAt ('now' stamps) repeated calls always record — they are never replays", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetition(4, 1);
    stats.recordFloatingTasbeehRepetition(4, 1);
    expect(stats.getTasbeehStats(ALL).total).toBe(2);
  });

  it("an entry with times > 1 still records all of its repetitions the first time", async () => {
    const stats = await freshStats();
    stats.recordFloatingTasbeehRepetitions([{ dhikrId: 6, times: 3, occurredAt: at(1_800_000_000_700) }]);
    expect(stats.getTasbeehStats(ALL).total).toBe(3);
  });

  it("manual and voice repetitions are unaffected by the floating replay guard", async () => {
    const stats = await freshStats();
    stats.recordTasbeehRepetition(1);
    stats.recordTasbeehRepetition(1);
    stats.recordTasbeehRepetitions(1, 2);
    expect(stats.getTasbeehStats(ALL).total).toBe(4);
  });
});

// Batch 4: history for a dhikr that is no longer in the library is history,
// not garbage — it must survive load, further recording and re-persisting.
describe("statistics for dhikr ids that no longer exist in the library are preserved", () => {
  it("keeps unknown numeric-string, unknown written and legacy ids through load and a following write", async () => {
    const original = [
      goodEvent({ dhikrId: "9999" }),
      goodEvent({ source: "written", category: "morning", dhikrId: "removed-item-id", ts: 1_800_000_003_000 }),
      goodEvent({ source: "floating", dhikrId: "424242", ts: 1_800_000_004_000 }),
    ];
    localStorage.setItem(KEY, JSON.stringify(original));
    const stats = await freshStats();

    const before = stats.getTasbeehStats(ALL);
    expect(before.total).toBe(2); // tasbeeh + floating
    expect(before.perDhikr.map((d) => d.dhikrId).sort()).toEqual(["424242", "9999"]);

    stats.recordTasbeehRepetitions(1, 1); // a normal write re-persists the whole log
    const stored = storedEvents() as { dhikrId: string }[];
    expect(stored).toHaveLength(4);
    expect(stored.map((e) => e.dhikrId)).toEqual(expect.arrayContaining(["9999", "removed-item-id", "424242"]));
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull(); // nothing was "repaired" away
  });
});
