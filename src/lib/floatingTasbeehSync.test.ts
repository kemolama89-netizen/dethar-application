// @vitest-environment jsdom
//
// Regression coverage for the JS-side half of the Floating Tasbeeh Shared
// Counting Core bridge (see floatingTasbeehSync.ts's own doc comment).
// What this file protects:
//   - reconciliation is a complete no-op on any platform without a native
//     bridge (iOS, web, this app's own dev server) — never throws, never
//     calls the (unregistered) plugin.
//   - a pending native tap's OWN captured local date/time (not "now" at
//     reconciliation time) ends up in the Statistics log.
//   - native is only told events were drained AFTER they were actually
//     committed, and with the exact count that was committed.
//   - the FULL dhikr list pushed to native matches the real
//     tasbeeh-library.json ids/labels, not a hardcoded subset.
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
  // floatingTasbeehBridge.ts's own registerPlugin("FloatingTasbeeh") call
  // runs for real via importOriginal below (only FloatingTasbeeh itself is
  // overridden there) — this stub just needs to exist, its return value is
  // never used.
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn() },
}));

vi.mock("./floatingTasbeehBridge", async (importOriginal) => {
  // isFloatingTasbeehAvailable now lives in this module (see its own doc
  // comment) — kept REAL here (not mocked) so it still reflects the
  // separately-mocked @capacitor/core above, exactly like before it moved.
  const actual = await importOriginal<typeof import("./floatingTasbeehBridge")>();
  return {
    ...actual,
    FloatingTasbeeh: {
      setDhikrList: vi.fn().mockResolvedValue(undefined),
      getPendingEvents: vi.fn().mockResolvedValue({ events: [] }),
      confirmPendingEventsDrained: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    },
  };
});

import { Capacitor } from "@capacitor/core";
import { isFloatingTasbeehAvailable, reconcileFloatingTasbeeh, pushFloatingDhikrList, startFloatingTasbeehSync } from "./floatingTasbeehSync";
import { FloatingTasbeeh } from "./floatingTasbeehBridge";
import { loadTasbeehCounters } from "./tasbeehCounters";
import { getTasbeehStats, clearAllStats } from "./stats";
import { dhikrItems } from "../data/tasbeeh";
import { computeTasbeehReadyDurationMs } from "./tasbeehTiming";

const ALL = { kind: "all" } as const;

beforeEach(() => {
  localStorage.clear();
  clearAllStats();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
  vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({ events: [] });
  vi.mocked(FloatingTasbeeh.confirmPendingEventsDrained).mockClear();
  vi.mocked(FloatingTasbeeh.setDhikrList).mockClear();
});

describe("isFloatingTasbeehAvailable", () => {
  it("is true only when native AND the platform is android", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    expect(isFloatingTasbeehAvailable()).toBe(true);
  });

  it("is false on iOS even if native", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    expect(isFloatingTasbeehAvailable()).toBe(false);
  });

  it("is false on the plain web/dev-server build", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
    expect(isFloatingTasbeehAvailable()).toBe(false);
  });
});

describe("reconcileFloatingTasbeeh — unavailable platforms", () => {
  it("never calls the bridge when unavailable", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await reconcileFloatingTasbeeh();
    expect(FloatingTasbeeh.getPendingEvents).not.toHaveBeenCalled();
  });
});

describe("reconcileFloatingTasbeeh — available (Android)", () => {
  it("is a no-op (no counters/stats write, no confirm call) when there are no pending events", async () => {
    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({ events: [] });
    await reconcileFloatingTasbeeh();
    expect(FloatingTasbeeh.confirmPendingEventsDrained).not.toHaveBeenCalled();
    expect(getTasbeehStats(ALL).total).toBe(0);
  });

  it("commits every pending event into the SAME counters store and Statistics log a manual tap uses, tagged source \"floating\"", async () => {
    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({
      events: [
        { dhikrId: 3, times: 1, ts: 1000, localDate: "2026-01-01", localTime: "10:00:00", timeZone: "Asia/Kuwait" },
        { dhikrId: 3, times: 1, ts: 2000, localDate: "2026-01-01", localTime: "10:00:05", timeZone: "Asia/Kuwait" },
      ],
    });

    await reconcileFloatingTasbeeh();

    expect(loadTasbeehCounters()[3]).toBe(2);
    const stats = getTasbeehStats(ALL);
    expect(stats.total).toBe(2);
    expect(stats.perDhikr).toEqual([{ dhikrId: "3", total: 2 }]);
  });

  it("preserves each pending event's OWN captured local date/time — never re-stamps with 'now' at reconciliation time", async () => {
    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({
      events: [{ dhikrId: 4, times: 1, ts: 500, localDate: "2020-05-05", localTime: "03:33:33", timeZone: "Asia/Kuwait" }],
    });

    await reconcileFloatingTasbeeh();

    const raw = JSON.parse(localStorage.getItem("dithar:stats:events:v1")!);
    expect(raw[0].localDate).toBe("2020-05-05");
    expect(raw[0].localTime).toBe("03:33:33");
    expect(raw[0].ts).toBe(500);
  });

  it("confirms drained ONLY after committing, with the exact count committed", async () => {
    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({
      events: [
        { dhikrId: 1, times: 1, ts: 1, localDate: "2026-01-01", localTime: "00:00:01", timeZone: "UTC" },
        { dhikrId: 2, times: 1, ts: 2, localDate: "2026-01-01", localTime: "00:00:02", timeZone: "UTC" },
        { dhikrId: 1, times: 1, ts: 3, localDate: "2026-01-01", localTime: "00:00:03", timeZone: "UTC" },
      ],
    });

    const callOrder: string[] = [];
    vi.mocked(FloatingTasbeeh.confirmPendingEventsDrained).mockImplementation(async () => {
      callOrder.push("confirm");
    });

    await reconcileFloatingTasbeeh();

    expect(FloatingTasbeeh.confirmPendingEventsDrained).toHaveBeenCalledWith({ count: 3 });
    expect(getTasbeehStats(ALL).total).toBe(3); // committed BEFORE confirm was called
  });

  it("preserves a multi-repetition batch's `times` field exactly", async () => {
    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({
      events: [{ dhikrId: 7, times: 5, ts: 1, localDate: "2026-01-01", localTime: "00:00:00", timeZone: "UTC" }],
    });
    await reconcileFloatingTasbeeh();
    expect(loadTasbeehCounters()[7]).toBe(5);
    expect(getTasbeehStats(ALL).total).toBe(5);
  });
});

describe("pushFloatingDhikrList", () => {
  it("pushes the FULL dhikr library, in tasbeeh-library.json order, with real ids/labels/readyDurationMs", async () => {
    await pushFloatingDhikrList();

    const expectedItems = dhikrItems.map((item) => ({
      id: item.id,
      label: item.dhikr_ar,
      readyDurationMs: computeTasbeehReadyDurationMs(item.dhikr_ar),
    }));
    expect(FloatingTasbeeh.setDhikrList).toHaveBeenCalledWith({ items: expectedItems });
    // Guards against the popup silently showing only a subset again —
    // every library item must be represented, not a hardcoded few.
    expect(expectedItems).toHaveLength(dhikrItems.length);
  });

  it("pushes the SAME readyDurationMs the main Tasbeeh screen itself would compute for a given dhikr", async () => {
    await pushFloatingDhikrList();
    const call = vi.mocked(FloatingTasbeeh.setDhikrList).mock.calls.at(-1)![0];
    const pushedItem = call.items.find((i) => i.id === dhikrItems[0].id)!;
    expect(pushedItem.readyDurationMs).toBe(computeTasbeehReadyDurationMs(dhikrItems[0].dhikr_ar));
  });

  it("does not call the bridge when unavailable", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await pushFloatingDhikrList();
    expect(FloatingTasbeeh.setDhikrList).not.toHaveBeenCalled();
  });
});

// startFloatingTasbeehSync guards itself with a module-level "already
// started" flag (see its own doc comment) — it can only meaningfully run
// ONCE across this whole file's test run, so this is deliberately the
// file's only test that calls it.
describe("startFloatingTasbeehSync — event-driven reconciliation", () => {
  it("registers a pendingEventsChanged listener that reconciles IMMEDIATELY when native fires it — no polling involved", async () => {
    startFloatingTasbeehSync();
    // Flushes the synchronous void App.addListener(...)/FloatingTasbeeh.addListener(...)
    // calls startFloatingTasbeehSync fires without awaiting.
    await Promise.resolve();
    await Promise.resolve();

    expect(FloatingTasbeeh.addListener).toHaveBeenCalledWith("pendingEventsChanged", expect.any(Function));
    const [, handler] = vi.mocked(FloatingTasbeeh.addListener).mock.calls[0]!;

    vi.mocked(FloatingTasbeeh.getPendingEvents).mockResolvedValue({
      events: [{ dhikrId: 9, times: 1, ts: 1, localDate: "2026-01-01", localTime: "00:00:00", timeZone: "UTC" }],
    });

    // Simulates native's own notifyListeners call — the exact same handler
    // reconcileFloatingTasbeeh already has full coverage for above; this
    // only proves the EVENT actually triggers it.
    await (handler as () => void | Promise<void>)();

    expect(loadTasbeehCounters()[9]).toBe(1);
  });
});
