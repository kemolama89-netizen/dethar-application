// @vitest-environment jsdom
//
// Audio Adhkar listening in the daily statistics (lib/stats.ts
// getDailyAudioActivity, lib/audioAdhkarCounts.ts):
//  - a recording heard to the end is one completed play, with its length;
//  - a recording that stops before its end (stopped, interrupted, failed,
//    replaced) adds the time it REALLY played — the player's own position —
//    and is never a completed play or a repetition;
//  - nothing is counted twice (a playback either completes or stops early;
//    repeated stops/callbacks/drains change nothing), it survives a restart,
//    and listening that crosses midnight is split between the two days.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, setAudioElementFactory, stopAudio } from "./audioEngine";

vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));

import { writtenAdhkarItems } from "../data/written-adhkar";
import { pauseAudioAdhkar, startAudioAdhkar, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { commitAudioCompletions, commitAudioListening, resetAudioAdhkarCountsMemoryForTesting, getAudioAdhkarCount, splitAtLocalMidnight } from "./audioAdhkarCounts";
import { clearAllStats, getDailyActivity, getDailyAudioActivity, todayLocalDate } from "./stats";

class FakeAudio implements AudioElementLike {
  private url = "";
  // A new file starts from 0 with its length unknown, as a real media element does.
  get src() {
    return this.url;
  }
  set src(value: string) {
    this.url = value;
    this.currentTime = 0;
    this.duration = NaN;
  }
  currentTime = 0;
  duration = NaN;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {}
}

let fake: FakeAudio;
const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
const today = () => todayLocalDate();
/** Simulates an app restart for the statistics: the in-memory copy is dropped and re-read from storage. */
const restart = () => {
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  resetAudioAdhkarCountsMemoryForTesting();
};

beforeEach(() => {
  localStorage.clear();
  clearAllStats();
  resetAudioAdhkarCountsMemoryForTesting();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
});

/** The file has loaded (30 s long) and played `seconds` of it. */
const playedFor = (seconds: number) => {
  fake.duration = 30;
  fake.currentTime = seconds;
};

describe("in-app listening", () => {
  it("a recording heard to the end is one completed play with its real length — no stopped-early time", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(30);
    fake.onended?.();
    const a = getDailyAudioActivity(today());
    expect(a.completedPlays).toBe(1);
    expect(a.stoppedEarlyPlays).toBe(0);
    expect(a.listenedMs).toBe(30_000);
    expect(a.sessions).toBe(1);
  });

  it("stopping part-way adds exactly the time that played, once — never a play or a repetition", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(12);
    stopAudioAdhkar();
    stopAudioAdhkar(); // a repeated stop changes nothing
    const a = getDailyAudioActivity(today());
    expect(a.completedPlays).toBe(0);
    expect(a.stoppedEarlyPlays).toBe(1);
    expect(a.listenedMs).toBe(12_000);
    expect(a.sessions).toBe(1);
    expect(a.dhikr[0]).toMatchObject({ plays: 0, stoppedEarly: 1 });
    expect(getAudioAdhkarCount("evening", "morning_016")).toBe(0);
    expect(getDailyActivity(today()).total).toBe(0); // listening is never the user's own dhikr
  });

  it("pausing doesn't count; the paused position counts once when it is then stopped", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(8);
    pauseAudioAdhkar();
    expect(getDailyAudioActivity(today()).listenedMs).toBe(0);
    stopAudioAdhkar();
    expect(getDailyAudioActivity(today()).listenedMs).toBe(8_000);
  });

  it("another source taking over records what had played (read before it stopped)", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(5);
    claimAudio("quran", "quran:x", () => {});
    expect(getDailyAudioActivity(today())).toMatchObject({ stoppedEarlyPlays: 1, listenedMs: 5_000 });
  });

  it("a playback error records what had played", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(3);
    fake.onerror?.();
    expect(getDailyAudioActivity(today())).toMatchObject({ completedPlays: 0, stoppedEarlyPlays: 1, listenedMs: 3_000 });
  });

  it("starting another dhikr records the replaced one's time under its own title and session", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    playedFor(7);
    startAudioAdhkar("evening", evening("morning_016"));
    const a = getDailyAudioActivity(today());
    expect(a.stoppedEarlyPlays).toBe(1);
    expect(a.listenedMs).toBe(7_000);
    stopAudioAdhkar(); // the new one never loaded: nothing measurable, nothing invented
    expect(getDailyAudioActivity(today()).listenedMs).toBe(7_000);
    expect(getDailyAudioActivity(today()).sessions).toBe(1);
  });

  it("nothing loaded yet: stopping records nothing (never estimated)", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    stopAudioAdhkar();
    expect(getDailyAudioActivity(today())).toMatchObject({ completedPlays: 0, stoppedEarlyPlays: 0, listenedMs: 0 });
  });
});

describe("restarts, repeated deliveries and the background player's queue", () => {
  it("keeps sessions, listening time and titles across a restart (they used to be dropped on reload)", () => {
    commitAudioCompletions([{ id: "native:a", collection: "morning", dhikrId: "morning_005", sessionId: "s1", durationMs: 60_000, title: "سيد الاستغفار" }]);
    commitAudioListening([{ id: "native-listen:b", collection: "morning", dhikrId: "morning_006", listenedMs: 20_000, sessionId: "s1" }]);
    restart();
    const a = getDailyAudioActivity(today());
    expect(a).toMatchObject({ completedPlays: 1, stoppedEarlyPlays: 1, sessions: 1, playsWithoutSession: 0, listenedMs: 80_000, playsWithoutDuration: 0 });
    expect(a.dhikr.find((d) => d.key === "morning:morning_005")!.title).toBe("سيد الاستغفار");
  });

  it("the same delivery twice (or after a restart) is taken in once", () => {
    const listening = { id: "native-listen:c", collection: "evening" as const, dhikrId: "morning_016", listenedMs: 9_000 };
    expect(commitAudioListening([listening])).toBe(1);
    expect(commitAudioListening([listening])).toBe(0);
    restart();
    expect(commitAudioListening([listening])).toBe(0);
    expect(getDailyAudioActivity(today()).listenedMs).toBe(9_000);
  });

  it("an empty day reads as zero, not as invented values", () => {
    expect(getDailyAudioActivity(today())).toMatchObject({ completedPlays: 0, stoppedEarlyPlays: 0, sessions: 0, listenedMs: 0, dhikr: [] });
  });
});

describe("midnight and time zones", () => {
  // 2026-03-07 23:59:00 in Kuwait (UTC+3, no DST) = 20:59:00Z.
  const KUWAIT_BEFORE_MIDNIGHT = Date.UTC(2026, 2, 7, 20, 59, 0);

  it("splits listening that crosses local midnight between the two days", () => {
    const end = KUWAIT_BEFORE_MIDNIGHT + 3 * 60_000; // 00:02 on the 8th
    expect(splitAtLocalMidnight(end, 5 * 60_000, "Asia/Kuwait")).toEqual([
      { at: end, ms: 2 * 60_000 },
      { at: KUWAIT_BEFORE_MIDNIGHT + 60_000, ms: 3 * 60_000 },
    ]);
  });

  it("a span within one day is one piece; a piece ending exactly at midnight belongs to the day before", () => {
    const midnight = KUWAIT_BEFORE_MIDNIGHT + 60_000;
    expect(splitAtLocalMidnight(midnight, 60_000, "Asia/Kuwait")).toEqual([{ at: midnight, ms: 60_000 }]);
    commitAudioListening([{ id: "x", collection: "evening", dhikrId: "morning_016", at: midnight, timeZone: "Asia/Kuwait", listenedMs: 60_000 }]);
    expect(getDailyAudioActivity("2026-03-07").listenedMs).toBe(60_000);
    expect(getDailyAudioActivity("2026-03-08").listenedMs).toBe(0);
  });

  it("records each day's share under the time zone the device had then, once", () => {
    const end = KUWAIT_BEFORE_MIDNIGHT + 3 * 60_000;
    const entry = { id: "y", collection: "evening" as const, dhikrId: "morning_016", at: end, timeZone: "Asia/Kuwait", listenedMs: 5 * 60_000, sessionId: "s" };
    commitAudioListening([entry, entry]);
    expect(getDailyAudioActivity("2026-03-07")).toMatchObject({ listenedMs: 3 * 60_000, stoppedEarlyPlays: 1, sessions: 1 });
    expect(getDailyAudioActivity("2026-03-08")).toMatchObject({ listenedMs: 2 * 60_000, stoppedEarlyPlays: 1, sessions: 1 });
  });

  it("handles a daylight-saving night (New York, spring forward)", () => {
    // 2026-03-08 01:59 EST → 03:01 EDT is 2 real minutes on ONE local day.
    const end = Date.UTC(2026, 2, 8, 7, 1, 0); // 03:01 EDT
    expect(splitAtLocalMidnight(end, 2 * 60_000, "America/New_York")).toEqual([{ at: end, ms: 2 * 60_000 }]);
  });
});
