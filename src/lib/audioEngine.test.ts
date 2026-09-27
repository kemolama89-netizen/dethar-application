import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, pauseAudio, playSilence, playUrlQueue, resumeAudio, setAudioElementFactory, stopAudio } from "./audioEngine";

class FakeAudio implements AudioElementLike {
  src = "";
  log: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.log.push(`play ${this.src}`);
  }
  pause() {
    this.log.push("pause");
  }
  removeAttribute() {}
  load() {}
}

let fake: FakeAudio;
beforeEach(() => {
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => stopAudio());

describe("pause / resume", () => {
  it("pauses and resumes only the source that owns the audio", () => {
    playUrlQueue("adhkar", "a", ["/a.mp3"]);
    expect(pauseAudio("other")).toBe(false);
    expect(pauseAudio("a")).toBe(true);
    expect(resumeAudio("a")).toBe(true);
    expect(fake.log).toEqual(["play /a.mp3", "pause", "play /a.mp3"]);
    expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "a" });
  });

  it("can't resume once something else took over", () => {
    playUrlQueue("adhkar", "a", ["/a.mp3"]);
    pauseAudio("a");
    claimAudio("quran", "q", () => {});
    expect(resumeAudio("a")).toBe(false);
  });

  it("sources without controls simply can't pause", () => {
    claimAudio("tts", "t", () => {});
    expect(pauseAudio("t")).toBe(false);
  });
});

describe("onInterrupted", () => {
  it("fires when another source takes over or stopAudio is called", () => {
    let interrupted = 0;
    playUrlQueue("adhkar", "a", ["/a.mp3"], { onInterrupted: () => interrupted++ });
    claimAudio("quran", "q", () => {});
    expect(interrupted).toBe(1);

    playUrlQueue("adhkar", "b", ["/b.mp3"], { onInterrupted: () => interrupted++ });
    stopAudio();
    expect(interrupted).toBe(2);
  });

  it("does not fire when the queue ends by itself", () => {
    let interrupted = 0;
    let ended = 0;
    playUrlQueue("adhkar", "a", ["/a.mp3"], { onInterrupted: () => interrupted++, onEnded: () => ended++ });
    fake.onended?.();
    stopAudio();
    expect(ended).toBe(1);
    expect(interrupted).toBe(0);
  });
});

describe("playSilence", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    stopAudio();
    vi.useRealTimers();
  });

  it("holds the audio for exactly its duration, then releases it and calls onEnded", () => {
    const events: string[] = [];
    playSilence("adhkar", "adhkar:x", 3_000, { onEnded: () => events.push("ended") });
    expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "adhkar:x" });
    vi.advanceTimersByTime(2_999);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["ended"]);
    expect(getActiveAudio()).toBeNull();
  });

  it("pause freezes the remaining time; resume continues it", () => {
    const events: string[] = [];
    playSilence("adhkar", "adhkar:x", 3_000, { onEnded: () => events.push("ended") });
    vi.advanceTimersByTime(1_000);
    expect(pauseAudio("adhkar:x")).toBe(true);
    vi.advanceTimersByTime(10_000);
    expect(events).toEqual([]);
    expect(resumeAudio("adhkar:x")).toBe(true);
    vi.advanceTimersByTime(1_999);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual(["ended"]);
  });

  it("another source claiming the audio interrupts it; it never ends later", () => {
    const events: string[] = [];
    playSilence("adhkar", "adhkar:x", 3_000, { onEnded: () => events.push("ended"), onInterrupted: () => events.push("interrupted") });
    claimAudio("quran", "quran:y", () => {});
    vi.advanceTimersByTime(10_000);
    expect(events).toEqual(["interrupted"]);
  });
});
