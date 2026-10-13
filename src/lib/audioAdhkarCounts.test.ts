// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { commitAudioCompletions, getAudioAdhkarCount, resetAudioAdhkarCountsMemoryForTesting, statsDhikrId } from "./audioAdhkarCounts";
import { startAudioAdhkar, startAudioVarious, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { clearAllStats, getAudioStats, getTasbeehStats, recordTasbeehRepetition, todayLocalDate } from "./stats";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";

class FakeAudio implements AudioElementLike {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {}
}

let fake: FakeAudio;
const ALL = { kind: "all" } as const;
const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
const various = (id: string) => AUDIO_VARIOUS_ITEMS.find((i) => i.id === id)!;
/** The current repetition's audio plays to its end (and the 1.5 s pause after it, if any, elapses). */
async function hearRepetition() {
  fake.onended?.();
  await new Promise((r) => setTimeout(r, 1600));
}

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

describe("counting repetitions heard in the app", () => {
  it("counts each repetition once its audio finished — a ×3 dhikr heard fully counts 3", async () => {
    expect(evening("morning_008").repeat).toBe(3);
    startAudioAdhkar("evening", evening("morning_008"));
    expect(getAudioAdhkarCount("evening", "morning_008")).toBe(0); // nothing until the audio ends
    for (let rep = 1; rep <= 3; rep++) {
      await hearRepetition();
      expect(getAudioAdhkarCount("evening", "morning_008")).toBe(rep);
    }
    expect(getAudioStats(ALL).total).toBe(3);
  }, 10_000);

  it("never counts a playback that was stopped, interrupted or failed", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    stopAudioAdhkar(); // stopped
    startAudioAdhkar("evening", evening("morning_005"));
    fake.onerror?.(); // failed
    startAudioAdhkar("evening", evening("morning_005"));
    stopAudio(); // interrupted (another audio took over)
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(0);
    expect(getAudioStats(ALL).total).toBe(0);
  });

  it("a repeated 'ended' for the same playback counts once", async () => {
    startAudioAdhkar("evening", evening("morning_005")); // ×1
    const ended = fake.onended;
    ended?.();
    ended?.();
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(1);
  });

  it("keeps every Various dhikr's count separate, and Morning/Evening separate for a shared dhikr", () => {
    startAudioVarious(various("tasbeeh-3"));
    fake.onended?.();
    startAudioVarious(various("tasbeeh-3"));
    fake.onended?.();
    startAudioVarious(various("tasbeeh-7"));
    fake.onended?.();
    expect(getAudioAdhkarCount("misc", "tasbeeh-3")).toBe(2);
    expect(getAudioAdhkarCount("misc", "tasbeeh-7")).toBe(1);
    expect(getAudioAdhkarCount("misc", "tasbeeh-1")).toBe(0);
    commitAudioCompletions([{ id: "x1", collection: "morning", dhikrId: "morning_005" }]);
    expect(getAudioAdhkarCount("morning", "morning_005")).toBe(1);
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(0);
  });
});

describe("counts and Statistics", () => {
  it("keeps the counts across an app restart", () => {
    commitAudioCompletions([
      { id: "a", collection: "misc", dhikrId: "tasbeeh-2" },
      { id: "b", collection: "misc", dhikrId: "tasbeeh-2" },
    ]);
    resetAudioAdhkarCountsMemoryForTesting(); // only storage survives
    expect(getAudioAdhkarCount("misc", "tasbeeh-2")).toBe(2);
  });

  it("the same completion delivered again — even after a restart — counts once, in counts and Statistics", () => {
    const c = { id: "native:abc", collection: "evening" as const, dhikrId: "morning_005", at: Date.now() - 60_000, timeZone: "Asia/Kuwait" };
    expect(commitAudioCompletions([c, c])).toBe(1);
    expect(commitAudioCompletions([c])).toBe(0);
    resetAudioAdhkarCountsMemoryForTesting();
    expect(commitAudioCompletions([c])).toBe(0);
    expect(getAudioAdhkarCount("evening", "morning_005")).toBe(1);
    expect(getAudioStats(ALL).total).toBe(1);
  });

  it("uses the dhikr's shared identity: a Various dhikr counts toward the same Tasbeeh dhikr's totals", () => {
    expect(statsDhikrId("misc", "tasbeeh-3")).toBe("3");
    expect(statsDhikrId("evening", "morning_005")).toBe("morning_005");
    recordTasbeehRepetition(3); // tapped in Tasbeeh
    commitAudioCompletions([{ id: "m1", collection: "misc", dhikrId: "tasbeeh-3" }]); // heard in Audio Adhkar
    const tasbeeh = getTasbeehStats(ALL);
    expect(tasbeeh.total).toBe(2);
    expect(tasbeeh.perDhikr).toEqual([{ dhikrId: "3", total: 2 }]); // one dhikr, combined — not two unrelated items
    // Audio keeps its own per-item numbers.
    expect(getAudioStats(ALL).perDhikr).toEqual([{ dhikrId: "misc:3", total: 1 }]);
  });

  it("Morning/Evening audio counts are reported per list and never touch Tasbeeh", () => {
    commitAudioCompletions([
      { id: "e1", collection: "evening", dhikrId: "morning_005" },
      { id: "m1", collection: "morning", dhikrId: "morning_005" },
    ]);
    expect(getAudioStats(ALL).perDhikr).toEqual(
      expect.arrayContaining([
        { dhikrId: "evening:morning_005", total: 1 },
        { dhikrId: "morning:morning_005", total: 1 },
      ]),
    );
    expect(getTasbeehStats(ALL).total).toBe(0);
  });

  it("keeps existing history: earlier events stay and only add up", () => {
    recordTasbeehRepetition(1);
    recordTasbeehRepetition(1);
    commitAudioCompletions([{ id: "z", collection: "misc", dhikrId: "tasbeeh-1" }]);
    expect(getTasbeehStats(ALL).total).toBe(3);
  });

  it("dates a background completion by when (and in which time zone) it finished, not when the app took it in", () => {
    const at = Date.UTC(2026, 9, 9, 22, 30); // 23:30 the 9th in London, 01:30 the 10th in Kuwait
    commitAudioCompletions([{ id: "late", collection: "misc", dhikrId: "tasbeeh-1", at, timeZone: "Asia/Kuwait" }]);
    expect(getAudioStats({ kind: "daily", date: "2026-10-10" }).total).toBe(1);
    expect(getAudioStats({ kind: "daily", date: todayLocalDate() === "2026-10-10" ? "2026-10-11" : "2026-10-09" }).total).toBe(0);
  });
});
