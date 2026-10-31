// @vitest-environment jsdom
// «الذكر التالي» (Next dhikr) and the PRACTICED Morning/Evening session:
//  - Next leaves the dhikr playing now for the next one; the part heard is
//    listening only, its remaining repetitions are never counted.
//  - A Morning/Evening session (scheduled, or «تشغيل الكل») is practiced
//    that day as soon as any of its audio plays — once, however it goes on —
//    and the statistics and the end-of-day summary count that day.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { setAudioElementFactory, stopAudio } from "./audioEngine";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import type { NativeAudioAdhkarState } from "./audioAdhkarNative";

vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));
const native = vi.hoisted(() => ({ available: false }));
const next = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./audioAdhkarNative", () => ({
  isAudioAdhkarNativeAvailable: () => native.available,
  AudioAdhkarNative: {
    playNow: vi.fn(async () => ({ started: true })),
    next,
    stopManual: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    log: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  },
}));

import { audioAdhkarItems } from "../data/audio-adhkar";
import {
  applyNativePlaybackState,
  canSkipAudioAdhkar,
  getAudioAdhkarPlayAll,
  getAudioAdhkarSource,
  pauseAudioAdhkar,
  resumeAudioAdhkar,
  skipAudioAdhkar,
  startAudioAdhkar,
  startAudioAdhkarPlayAll,
  stopAudioAdhkar,
  stopAudioAdhkarPlayback,
} from "./audioAdhkarPlayer";
import type { AudioAdhkarPlayAllEntry } from "./audioAdhkarPlayer";
import { clearAllStats, getAudioStats, getWirdDayStats, todayLocalDate } from "./stats";
import { commitCompletedSessions } from "./audioAdhkarCounts";
import { summaryDayActivity } from "./dailySummary";

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
  vi.setSystemTime(new Date("2026-10-21T07:00:00"));
  localStorage.clear();
  clearAllStats();
  native.available = false;
  next.mockClear();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkarPlayback();
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

// The recorded (non-Quranic) adhkar: they play through the <audio> element the test fakes.
const entries = (section: "morning" | "evening"): AudioAdhkarPlayAllEntry[] =>
  audioAdhkarItems[section].filter((item) => getAudioAdhkarSource(section, item)?.channel === "adhkar").map((item) => ({ kind: "written", item }));
const today = () => ({ kind: "daily" as const, date: todayLocalDate() });
const days = (section: "morning" | "evening") => getWirdDayStats(section, today()).daysCompleted;
const repetitionsHeard = () => getAudioStats(today()).total;
/** Session records in the statistics (each one a "wird-complete" event). */
const sessionRecords = (section: "morning" | "evening") =>
  (JSON.parse(localStorage.getItem("dithar:stats:events:v1") ?? "[]") as { kind: string; category: string }[]).filter((e) => e.kind === "wird-complete" && e.category === section).length;

describe("a practiced Morning/Evening session", () => {
  it("partial listening: the session counts as soon as its audio starts — no repetition is counted", () => {
    expect(startAudioAdhkarPlayAll("morning", entries("morning"))).toBe(true);
    expect(days("morning")).toBe(1);
    expect(repetitionsHeard()).toBe(0);
    stopAudioAdhkarPlayback(); // stopped part-way through the first repetition
    expect(days("morning")).toBe(1);
    expect(repetitionsHeard()).toBe(0);
  });

  it("one repetition heard out of many: one repetition, one practiced day", () => {
    const first = entries("morning")[0].item;
    startAudioAdhkarPlayAll("morning", entries("morning"));
    fake.end();
    expect(repetitionsHeard()).toBe(1);
    expect(days("morning")).toBe(1);
    expect(getNowPlaying()?.itemId).toBe(first.id);
  });

  it("the statistics and the end-of-day summary agree on it", () => {
    startAudioAdhkarPlayAll("evening", entries("evening"));
    stopAudioAdhkarPlayback();
    expect(summaryDayActivity(todayLocalDate()).wirds).toEqual(["evening"]);
    expect(getWirdDayStats("evening", { kind: "all" }).daysCompleted).toBe(1);
  });

  it("is recorded once: pausing, resuming, skipping and playing it again the same day add nothing", () => {
    startAudioAdhkarPlayAll("morning", entries("morning"));
    pauseAudioAdhkar();
    resumeAudioAdhkar();
    skipAudioAdhkar();
    skipAudioAdhkar();
    stopAudioAdhkarPlayback();
    startAudioAdhkarPlayAll("morning", entries("morning")); // reopened
    fake.end();
    expect(sessionRecords("morning")).toBe(1);
    expect(days("morning")).toBe(1);
  });

  it("Morning and Evening are separate sessions", () => {
    startAudioAdhkarPlayAll("morning", entries("morning"));
    startAudioAdhkarPlayAll("evening", entries("evening"));
    expect(sessionRecords("morning")).toBe(1);
    expect(sessionRecords("evening")).toBe(1);
    expect(summaryDayActivity(todayLocalDate()).wirds).toEqual(["morning", "evening"]);
  });

  it("a single «استماع» of one dhikr is not a session — its repetitions still count", () => {
    startAudioAdhkar("morning", entries("morning")[0].item);
    fake.end();
    expect(repetitionsHeard()).toBe(1);
    expect(days("morning")).toBe(0);
  });

  it("the Android player's records (one per session id) are filed once each", () => {
    const morning = { id: "native-session-complete:morning:day:2026-10-21", collection: "morning" as const, at: Date.now() };
    expect(commitCompletedSessions([morning])).toBe(1);
    expect(commitCompletedSessions([morning])).toBe(0); // re-sent after the app reopened
    expect(commitCompletedSessions([{ ...morning, id: "native-session-complete:evening:day:2026-10-21", collection: "evening" }])).toBe(1);
    expect(sessionRecords("morning")).toBe(1);
    expect(sessionRecords("evening")).toBe(1);
  });
});

describe("«الذكر التالي» in the app", () => {
  it("skips the rest of the dhikr: the next one plays at once, the skipped repetitions are never counted", () => {
    const list = entries("morning");
    startAudioAdhkarPlayAll("morning", list);
    fake.end(); // one repetition heard
    vi.advanceTimersByTime(REPETITION_PAUSE_MS); // the next playback starts (a repetition, or the next dhikr)
    const at = getAudioAdhkarPlayAll()!.index;
    expect(canSkipAudioAdhkar()).toBe(true);
    expect(skipAudioAdhkar()).toBe(true);
    expect(getNowPlaying()).toMatchObject({ itemId: list[at + 1].item.id, repetition: 1, status: "playing" });
    expect(getAudioAdhkarPlayAll()?.index).toBe(at + 1);
    expect(repetitionsHeard()).toBe(1);
    // A late "ended" from the skipped playback changes nothing.
    vi.advanceTimersByTime(10 * REPETITION_PAUSE_MS);
    expect(getNowPlaying()?.itemId).toBe(list[at + 1].item.id);
  });

  it("works in the silence between repetitions and while paused", () => {
    const list = entries("morning");
    startAudioAdhkarPlayAll("morning", list);
    fake.end(); // now in the silence before the next playback
    skipAudioAdhkar();
    expect(getNowPlaying()?.itemId).toBe(list[1].item.id);
    expect(getAudioAdhkarPlayAll()?.index).toBe(1);
    pauseAudioAdhkar();
    skipAudioAdhkar();
    expect(getNowPlaying()?.itemId).toBe(list[2].item.id);
    expect(repetitionsHeard()).toBe(1);
  });

  it("is offered only while another dhikr follows — never on the last one or for a single «استماع»", () => {
    const list = entries("evening");
    startAudioAdhkarPlayAll("evening", list);
    for (let i = 1; i < list.length; i++) skipAudioAdhkar();
    expect(getAudioAdhkarPlayAll()?.index).toBe(list.length - 1);
    expect(canSkipAudioAdhkar()).toBe(false);
    expect(skipAudioAdhkar()).toBe(false);
    stopAudioAdhkarPlayback();
    startAudioAdhkar("evening", list[0].item);
    expect(canSkipAudioAdhkar()).toBe(false);
  });

  it("full completion still counts every repetition heard, and the day once", () => {
    const list = entries("evening").slice(0, 2);
    startAudioAdhkarPlayAll("evening", list);
    for (let guard = 0; guard < 500 && getNowPlaying()?.status === "playing"; guard++) {
      fake.end();
      vi.advanceTimersByTime(REPETITION_PAUSE_MS);
    }
    expect(getNowPlaying()?.status).toBe("finished");
    // Every playback heard to its end was a repetition: at least one per dhikr.
    expect(repetitionsHeard()).toBeGreaterThanOrEqual(list.length);
    expect(sessionRecords("evening")).toBe(1);
  });
});

describe("«الذكر التالي» on Android", () => {
  const state = (over: Partial<NativeAudioAdhkarState>): NativeAudioAdhkarState => ({
    active: true,
    collection: "morning",
    dhikrId: "morning_001",
    title: "x",
    repetition: 1,
    total: 3,
    status: "playing",
    index: 0,
    count: 4,
    ...over,
  });

  beforeEach(() => {
    native.available = true;
  });
  afterEach(() => applyNativePlaybackState(null));

  it("a scheduled session or a Play All run with a dhikr after this one offers Next; it asks the native player", () => {
    applyNativePlaybackState(state({ manual: false }));
    expect(canSkipAudioAdhkar()).toBe(true);
    expect(skipAudioAdhkar()).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
    applyNativePlaybackState(state({ manual: true, index: 2, count: 4 }));
    expect(canSkipAudioAdhkar()).toBe(true);
  });

  it("not on the last dhikr, for a single «استماع», or once the session ended", () => {
    applyNativePlaybackState(state({ index: 3, count: 4 }));
    expect(canSkipAudioAdhkar()).toBe(false);
    expect(skipAudioAdhkar()).toBe(false);
    applyNativePlaybackState(state({ manual: true, index: 0, count: 1 }));
    expect(canSkipAudioAdhkar()).toBe(false);
    applyNativePlaybackState(state({ index: 0, count: 4 }));
    applyNativePlaybackState(null);
    expect(canSkipAudioAdhkar()).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });
});
