import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, pauseAudio, playUrlQueue, resumeAudio, setAudioElementFactory, stopAudio } from "./audioEngine";

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
