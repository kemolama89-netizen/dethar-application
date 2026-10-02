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

describe("playUrlQueue — back-to-back files (next file preloaded on a standby element)", () => {
  /** A media element that records what it was asked to do. */
  class Element implements AudioElementLike {
    src = "";
    preload?: string;
    loads: string[] = [];
    plays: string[] = [];
    refusePlay = false;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play() {
      if (this.refusePlay) return Promise.reject(new Error("NotAllowedError"));
      this.plays.push(this.src);
    }
    pause() {}
    removeAttribute(name: string) {
      if (name === "src") this.src = "";
    }
    load() {
      if (this.src) this.loads.push(this.src);
    }
    end() {
      this.onended?.();
    }
  }

  let elements: Element[];
  beforeEach(() => {
    elements = [];
    setAudioElementFactory(() => {
      const el = new Element();
      elements.push(el);
      return el;
    });
  });
  const playing = () => elements.find((e) => e.onended)!;
  const allPlays = () => elements.flatMap((e) => e.plays);

  it("preloads the next file while the current one plays, then starts it the moment the current one ends", () => {
    const onEnded = vi.fn();
    playUrlQueue("quran", "quran:r:112:1-4", ["a1", "a2", "a3", "a4"], { onEnded });
    const [main, standby] = elements;
    expect(main.plays).toEqual(["a1"]);
    expect(standby).toMatchObject({ src: "a2", preload: "auto" });
    expect(standby.loads).toEqual(["a2"]);

    main.end();
    // a2 starts synchronously on "ended" — no timer, no reload — and a3 is preloaded on the other element.
    expect(standby.plays).toEqual(["a2"]);
    expect(main).toMatchObject({ src: "a3" });

    playing().end();
    playing().end();
    expect(allPlays().sort()).toEqual(["a1", "a2", "a3", "a4"]);
    expect([main.plays, standby.plays]).toEqual([["a1", "a3"], ["a2", "a4"]]);
    expect(onEnded).not.toHaveBeenCalled();
    playing().end();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();
  });

  it("pause/resume act on the file currently playing", () => {
    playUrlQueue("quran", "q", ["a1", "a2"]);
    elements[0].end();
    const second = playing();
    expect(second).toBe(elements[1]);
    const pause = vi.spyOn(second, "pause");
    expect(pauseAudio("q")).toBe(true);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(resumeAudio("q")).toBe(true);
    expect(second.plays).toEqual(["a2", "a2"]);
  });

  it("stopping clears both elements, so a preloaded file never plays later", () => {
    const onInterrupted = vi.fn();
    playUrlQueue("quran", "q", ["a1", "a2", "a3"], { onInterrupted });
    stopAudio();
    expect(onInterrupted).toHaveBeenCalledTimes(1);
    expect(elements.map((e) => e.src)).toEqual(["", ""]);
    expect(elements.every((e) => e.onended === null)).toBe(true);
  });

  it("falls back to loading on the playing element when the standby element may not play", async () => {
    playUrlQueue("quran", "q", ["a1", "a2", "a3"]);
    elements[1].refusePlay = true;
    elements[0].end();
    await Promise.resolve();
    await Promise.resolve();
    expect(elements[0].plays).toEqual(["a1", "a2"]);
    elements[0].end();
    expect(elements[0].plays).toEqual(["a1", "a2", "a3"]);
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "q" });
  });

  it("a single-file queue never touches the standby element", () => {
    playUrlQueue("adhkar", "x", ["only"]);
    expect(elements).toHaveLength(1);
  });
});
