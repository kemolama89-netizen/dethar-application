// @vitest-environment jsdom
// Resume Adhkar: an unfinished «تشغيل الكل» (Play All) run of Morning/Evening continues from the next
// unfinished dhikr and repetition — saved only when a repetition is heard to its end (or the user skips),
// kept through a stop, an interruption or the app being closed, cleared when the run completes or the
// user restarts; Morning and Evening each keep their own.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";

vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));
const native = vi.hoisted(() => ({ available: false, progress: null as unknown }));
const playNow = vi.hoisted(() => vi.fn(async (_options: unknown) => ({ started: true })));
const getPlayAllProgress = vi.hoisted(() => vi.fn(async (_o: unknown) => ({ progress: native.progress })));
const clearPlayAllProgress = vi.hoisted(() => vi.fn(async (_o: unknown) => {}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    playNow,
    getPlayAllProgress,
    clearPlayAllProgress,
    stopManual: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  },
}));

import { audioAdhkarItems } from "../data/audio-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { audioRepetitionTotal, getAudioAdhkarPlayAll, getAudioAdhkarSource, playAllRunIds, skipAudioAdhkar, startAudioAdhkarPlayAll, stopAudioAdhkar, stopAudioAdhkarPlayback } from "./audioAdhkarPlayer";
import type { AudioAdhkarPlayAllEntry } from "./audioAdhkarPlayer";
import { clearResumePoint, loadResumePoint, nextPoint, resumesRun, saveWebResumePoint } from "./audioAdhkarResume";

class FakeAudio implements AudioElementLike {
  src = "";
  played: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.played.push(this.src);
  }
  pause() {}
  removeAttribute() {}
  load() {}
  end() {
    this.onended?.();
  }
}

let fake: FakeAudio;
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  native.available = false;
  native.progress = null;
  playNow.mockClear();
  getPlayAllProgress.mockClear();
  clearPlayAllProgress.mockClear();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkarPlayback();
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

/** A run of recorded, non-Qur'anic adhkar of [section] (played by the in-app audio element), the first with several repetitions. */
function run(section: "morning" | "evening", length = 3): AudioAdhkarPlayAllEntry[] {
  const recorded = (audioAdhkarItems[section] as WrittenAdhkarItem[]).filter((i) => !i.quranRef && getAudioAdhkarSource(section, i));
  const multi = recorded.find((i) => audioRepetitionTotal(i) > 1)!;
  const rest = recorded.filter((i) => i !== multi).slice(0, length - 1);
  return [multi, ...rest].map((item) => ({ kind: "written" as const, item }));
}
const total = (e: AudioAdhkarPlayAllEntry) => audioRepetitionTotal(e.item as WrittenAdhkarItem);
/** One repetition heard to its end, then the silence after it. */
const hearRepetition = () => {
  fake.end();
  vi.advanceTimersByTime(REPETITION_PAUSE_MS);
};

describe("the point", () => {
  it("is the next repetition, else the next dhikr, else nothing (complete)", () => {
    expect(nextPoint(0, 3, 1, 3)).toEqual({ index: 0, repetition: 2 });
    expect(nextPoint(0, 3, 3, 3)).toEqual({ index: 1, repetition: 1 });
    expect(nextPoint(2, 3, 1, 1)).toBeNull();
  });

  it("is only offered for a run of exactly the same adhkar", () => {
    const point = { ids: ["a", "b", "c"], index: 1, repetition: 2, updatedAt: 1 };
    expect(resumesRun(point, ["a", "b", "c"])).toBe(true);
    expect(resumesRun(point, ["a", "c", "b"])).toBe(false);
    expect(resumesRun(point, ["a", "b"])).toBe(false);
    expect(resumesRun(null, ["a"])).toBe(false);
  });

  it("an unreadable or impossible saved point is ignored", async () => {
    localStorage.setItem("dithar:audio-adhkar:play-all-resume:morning:v1", "{broken");
    expect(await loadResumePoint("morning")).toBeNull();
    localStorage.setItem("dithar:audio-adhkar:play-all-resume:morning:v1", JSON.stringify({ ids: ["a"], index: 3, repetition: 1, updatedAt: 1 }));
    expect(await loadResumePoint("morning")).toBeNull();
  });
});

describe("web: saving while a run plays", () => {
  it("saves only when a repetition is heard to its end — a stop part-way keeps the last finished point", async () => {
    const entries = run("morning");
    expect(startAudioAdhkarPlayAll("morning", entries)).toBe(true);
    // Nothing finished yet: nothing to resume.
    expect(await loadResumePoint("morning")).toBeNull();
    hearRepetition();
    expect(await loadResumePoint("morning")).toMatchObject({ ids: playAllRunIds("morning", entries), index: 0, repetition: 2 });
    // The second repetition starts, then a call / leaving the list stops it part-way: it was not finished.
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    stopAudioAdhkar();
    expect(await loadResumePoint("morning")).toMatchObject({ index: 0, repetition: 2 });
  });

  it("moves to the next dhikr after its last repetition, and on «الذكر التالي»", async () => {
    const entries = run("morning");
    startAudioAdhkarPlayAll("morning", entries);
    for (let r = 0; r < total(entries[0]); r++) hearRepetition();
    expect(await loadResumePoint("morning")).toMatchObject({ index: 1, repetition: 1 });
    expect(getAudioAdhkarPlayAll()).toMatchObject({ index: 1 });
    expect(skipAudioAdhkar()).toBe(true);
    expect(await loadResumePoint("morning")).toMatchObject({ index: 2, repetition: 1 });
  });

  it("is cleared when the run completes", async () => {
    const entries = run("morning", 2);
    startAudioAdhkarPlayAll("morning", entries);
    for (const e of entries) for (let r = 0; r < total(e); r++) hearRepetition();
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    expect(getNowPlaying()).toMatchObject({ status: "finished" });
    expect(await loadResumePoint("morning")).toBeNull();
  });
});

describe("web: resuming", () => {
  it("continues at the saved dhikr and repetition — the finished ones are not replayed", () => {
    const entries = run("morning");
    const ids = playAllRunIds("morning", entries);
    expect(startAudioAdhkarPlayAll("morning", entries, { index: 0, repetition: 2 })).toBe(true);
    expect(getNowPlaying()).toMatchObject({ itemId: ids[0], repetition: 2, status: "playing" });
    expect(fake.played).toHaveLength(1);
    stopAudioAdhkar();
    startAudioAdhkarPlayAll("morning", entries, { index: 2, repetition: 1 });
    expect(getNowPlaying()).toMatchObject({ itemId: ids[2], repetition: 1 });
    expect(getAudioAdhkarPlayAll()).toMatchObject({ collection: "morning", index: 2, count: ids.length });
  });

  it("survives the app being closed: the point is read back from storage", async () => {
    const entries = run("evening");
    startAudioAdhkarPlayAll("evening", entries);
    hearRepetition();
    stopAudioAdhkar(); // the app goes away mid-run
    const point = await loadResumePoint("evening");
    expect(resumesRun(point, playAllRunIds("evening", entries))).toBe(true);
    startAudioAdhkarPlayAll("evening", entries, point!);
    expect(getNowPlaying()).toMatchObject({ itemId: point!.ids[0], repetition: 2 });
  });

  it("restart clears the point and plays from the first dhikr", async () => {
    const entries = run("morning");
    startAudioAdhkarPlayAll("morning", entries);
    hearRepetition();
    stopAudioAdhkar();
    await clearResumePoint("morning");
    expect(await loadResumePoint("morning")).toBeNull();
    startAudioAdhkarPlayAll("morning", entries);
    expect(getNowPlaying()).toMatchObject({ itemId: playAllRunIds("morning", entries)[0], repetition: 1 });
  });

  it("Morning and Evening keep their own points", async () => {
    const morning = run("morning");
    startAudioAdhkarPlayAll("morning", morning);
    hearRepetition();
    stopAudioAdhkar();
    const evening = run("evening");
    startAudioAdhkarPlayAll("evening", evening);
    for (let r = 0; r < total(evening[0]); r++) hearRepetition();
    stopAudioAdhkar();
    expect(await loadResumePoint("morning")).toMatchObject({ index: 0, repetition: 2 });
    expect(await loadResumePoint("evening")).toMatchObject({ index: 1, repetition: 1 });
    // Restarting one leaves the other.
    await clearResumePoint("evening");
    expect(await loadResumePoint("morning")).not.toBeNull();
    // Each is stored under its own section (the two lists can hold the same adhkar).
    saveWebResumePoint("evening", { ids: ["x"], index: 0, repetition: 1, updatedAt: 1 });
    expect(await loadResumePoint("morning")).toMatchObject({ index: 0, repetition: 2 });
  });
});

describe("Android: the native player keeps the point", () => {
  it("resumes the native run from the saved point, showing that dhikr and repetition at once", () => {
    native.available = true;
    const entries: AudioAdhkarPlayAllEntry[] = (audioAdhkarItems.morning as WrittenAdhkarItem[]).map((item) => ({ kind: "written", item }));
    const ids = playAllRunIds("morning", entries);
    expect(startAudioAdhkarPlayAll("morning", entries, { index: 3, repetition: 2 })).toBe(true);
    const options = playNow.mock.calls[0][0] as { items: { dhikrId: string }[]; item: { dhikrId: string }; startIndex: number; startRepetition: number };
    expect(options.items.map((i) => i.dhikrId)).toEqual(ids);
    expect(options).toMatchObject({ startIndex: 3, startRepetition: 2 });
    expect(options.item.dhikrId).toBe(ids[3]);
    expect(getAudioAdhkarPlayAll()).toEqual({ collection: "morning", index: 3, count: ids.length });
    expect(getNowPlaying()).toMatchObject({ itemId: ids[3], repetition: 2 });
  });

  it("a fresh run sends no start point", () => {
    native.available = true;
    const entries: AudioAdhkarPlayAllEntry[] = (audioAdhkarItems.evening as WrittenAdhkarItem[]).map((item) => ({ kind: "written", item }));
    startAudioAdhkarPlayAll("evening", entries);
    expect(playNow.mock.calls[0][0]).not.toHaveProperty("startIndex");
  });

  it("reads and clears the point natively, per section", async () => {
    native.available = true;
    native.progress = { ids: ["morning_001", "morning_002"], index: 1, repetition: 3, updatedAt: 5 };
    expect(await loadResumePoint("morning")).toEqual(native.progress);
    expect(getPlayAllProgress).toHaveBeenCalledWith({ section: "morning" });
    await clearResumePoint("evening");
    expect(clearPlayAllProgress).toHaveBeenCalledWith({ section: "evening" });
  });
});
