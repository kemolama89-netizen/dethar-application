// @vitest-environment jsdom
// The Audio Adhkar player's progress and the daily listening statistics:
// positions and lengths come from the media itself (never estimated), the
// length is null until it is really known, and each completed recording is
// counted once — whatever loops, repeated callbacks or restarts happen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { getPlaybackProgress, playUrlQueue, setAudioElementFactory, stopAudio } from "./audioEngine";
import type { AudioBufferLike, AudioContextLike, BufferSourceLike } from "./webAudioSequence";
import { playAudioSequence, setWebAudioForTesting } from "./webAudioSequence";
import { commitAudioCompletions } from "./audioAdhkarCounts";
import { getDailyActivity, getDailyAudioActivity } from "./stats";
import { cleanProgress, formatPlaybackTime } from "./useAudioAdhkarProgress";

class FakeAudio implements AudioElementLike {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  duration = Number.NaN;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {
    this.currentTime = 0;
    this.duration = Number.NaN;
  }
}

describe("in-app file playback progress (HTML audio)", () => {
  let el: FakeAudio;
  beforeEach(() => {
    el = new FakeAudio();
    setAudioElementFactory(() => el);
  });
  afterEach(() => stopAudio());

  it("has no length until the file reports one, then reads position and length from the element", () => {
    playUrlQueue("adhkar", "a", ["/a.mp3"]);
    expect(getPlaybackProgress()).toEqual({ key: "a", positionMs: 0, durationMs: null, loading: true });
    el.duration = 12.5;
    el.currentTime = 4.25;
    expect(getPlaybackProgress()).toEqual({ key: "a", positionMs: 4250, durationMs: 12500, loading: false });
  });

  it("reports the real length of what played when it ends — and null when it was never known", () => {
    const ended = vi.fn();
    playUrlQueue("adhkar", "a", ["/a.mp3"], { onEnded: ended });
    el.duration = 8;
    el.onended!();
    expect(ended).toHaveBeenCalledWith({ durationMs: 8000 });

    const unknown = vi.fn();
    playUrlQueue("adhkar", "b", ["/b.mp3"], { onEnded: unknown });
    el.onended!();
    expect(unknown).toHaveBeenCalledWith({ durationMs: null });
  });

  it("a repetition that skips its first seconds counts only what played", () => {
    const ended = vi.fn();
    playUrlQueue("adhkar", "a", ["/a.mp3"], { startAt: 2, onEnded: ended });
    el.duration = 10;
    el.currentTime = 5;
    expect(getPlaybackProgress()).toMatchObject({ positionMs: 3000, durationMs: 8000 });
    el.onended!();
    expect(ended).toHaveBeenCalledWith({ durationMs: 8000 });
  });

  it("is nothing once another source owns the audio", () => {
    playUrlQueue("adhkar", "a", ["/a.mp3"]);
    stopAudio();
    expect(getPlaybackProgress()).toBeNull();
  });
});

class FakeSource implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  onended: (() => void) | null = null;
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  destination = {};
  sources: FakeSource[] = [];
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  async decodeAudioData(data: ArrayBuffer) {
    const url = new TextDecoder().decode(data);
    return { duration: url === "x1" ? 3 : 4.5 };
  }
  resume = vi.fn(async () => {});
  suspend = vi.fn(async () => {});
}

describe("in-app Quranic recitation progress (Web Audio)", () => {
  let ctx: FakeContext;
  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };
  beforeEach(() => {
    ctx = new FakeContext();
    setWebAudioForTesting({ createContext: () => ctx, fetch: async (url) => new TextEncoder().encode(url).buffer as ArrayBuffer });
  });
  afterEach(() => {
    stopAudio();
    setWebAudioForTesting();
  });

  it("is loading while decoding, then reads the audio clock against the decoded ayahs' real total", async () => {
    const ended = vi.fn();
    playAudioSequence("quran", "q", ["x1", "x2"], { onEnded: ended });
    expect(getPlaybackProgress()).toEqual({ key: "q", positionMs: 0, durationMs: null, loading: true });
    await flush();
    ctx.currentTime += 0.05 + 2; // past the start lead, 2 s in
    expect(getPlaybackProgress()).toEqual({ key: "q", positionMs: 2000, durationMs: 7500, loading: false });
    ctx.sources.at(-1)!.onended!();
    expect(ended).toHaveBeenCalledWith({ durationMs: 7500 });
  });
});

// The statistics keep an in-memory copy for the whole test file, so each test uses its own day.
describe("daily listening statistics", () => {
  const at = (iso: string) => Date.parse(iso);

  it("counts each completed recording once, with its sessions, real length and titles — apart from the user's own repetitions", () => {
    const completion = { collection: "morning" as const, dhikrId: "morning_005", timeZone: "Asia/Kuwait", sessionId: "native-session:1", title: "سيد الاستغفار" };
    commitAudioCompletions([
      { ...completion, id: "native:a", at: at("2026-10-15T06:00:00Z"), durationMs: 35_000 },
      { ...completion, id: "native:b", at: at("2026-10-15T06:01:00Z"), durationMs: 35_000 },
      { ...completion, id: "app:c", at: at("2026-10-15T09:00:00Z"), sessionId: "app-session:9", durationMs: 12_000, dhikrId: "morning_006" },
    ]);
    // The same completions again (a repeated event, a restart before native forgot them): nothing changes.
    commitAudioCompletions([{ ...completion, id: "native:a", at: at("2026-10-15T06:00:00Z"), durationMs: 35_000 }]);
    const day = getDailyAudioActivity("2026-10-15");
    expect(day).toMatchObject({ completedPlays: 3, sessions: 2, playsWithoutSession: 0, listenedMs: 82_000, playsWithoutDuration: 0 });
    expect(day.dhikr[0]).toEqual({ key: "morning:morning_005", title: "سيد الاستغفار", plays: 2, stoppedEarly: 0 });
    // Listening never becomes the user's repetitions.
    expect(getDailyActivity("2026-10-15").total).toBe(0);
  });

  it("reports unknown lengths and older plays without a session separately, never estimating them", () => {
    commitAudioCompletions([
      { id: "old:1", collection: "misc", dhikrId: "tasbeeh-3", at: at("2026-11-01T08:00:00Z"), timeZone: "Asia/Kuwait" },
      { id: "new:1", collection: "misc", dhikrId: "tasbeeh-3", at: at("2026-11-01T08:05:00Z"), timeZone: "Asia/Kuwait", sessionId: "s", durationMs: 4000 },
    ]);
    expect(getDailyAudioActivity("2026-11-01")).toMatchObject({ completedPlays: 2, sessions: 1, playsWithoutSession: 1, listenedMs: 4000, playsWithoutDuration: 1 });
  });

  it("a session running past midnight counts toward each day it played in (local time)", () => {
    const session = { collection: "evening" as const, dhikrId: "morning_003", timeZone: "Asia/Kuwait", sessionId: "s1", durationMs: 30_000 };
    commitAudioCompletions([
      { ...session, id: "1", at: at("2026-11-05T20:59:00Z") }, // 23:59 Kuwait
      { ...session, id: "2", at: at("2026-11-05T21:01:00Z") }, // 00:01 Kuwait, the next day
    ]);
    expect(getDailyAudioActivity("2026-11-05")).toMatchObject({ completedPlays: 1, listenedMs: 30_000, sessions: 1 });
    expect(getDailyAudioActivity("2026-11-06")).toMatchObject({ completedPlays: 1, listenedMs: 30_000, sessions: 1 });
  });

  it("an empty day is zero, not missing", () => {
    expect(getDailyAudioActivity("2026-01-01")).toEqual({ date: "2026-01-01", completedPlays: 0, stoppedEarlyPlays: 0, sessions: 0, playsWithoutSession: 0, listenedMs: 0, playsWithoutDuration: 0, dhikr: [] });
  });
});

describe("time display", () => {
  it("formats real milliseconds as mm:ss (h:mm:ss from an hour)", () => {
    expect(formatPlaybackTime(0)).toBe("00:00");
    expect(formatPlaybackTime(18_000)).toBe("00:18");
    expect(formatPlaybackTime(165_400)).toBe("02:45");
    expect(formatPlaybackTime(3_725_000)).toBe("1:02:05");
  });

  it("shows --:-- for anything that isn't a real time — never NaN", () => {
    for (const bad of [NaN, Infinity, -1, null, undefined]) expect(formatPlaybackTime(bad as number)).toBe("--:--");
  });
});

describe("cleaning a player's reading", () => {
  it("turns a missing, zero, negative or non-finite duration into unknown (never a guess)", () => {
    for (const durationMs of [null, 0, -5, NaN, Infinity]) {
      expect(cleanProgress({ positionMs: 4_000, durationMs: durationMs as number | null, loading: false })).toEqual({ positionMs: 4_000, durationMs: null, loading: false });
    }
  });

  it("keeps the position within a known duration, and never negative or NaN", () => {
    expect(cleanProgress({ positionMs: 70_000, durationMs: 60_000, loading: false })!.positionMs).toBe(60_000);
    expect(cleanProgress({ positionMs: -3, durationMs: 60_000, loading: false })!.positionMs).toBe(0);
    expect(cleanProgress({ positionMs: NaN, durationMs: 60_000, loading: false })!.positionMs).toBe(0);
    expect(cleanProgress(null)).toBeNull();
  });
});
