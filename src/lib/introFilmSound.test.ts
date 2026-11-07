// @vitest-environment jsdom
// The introduction's sound: never two religious recordings at once; a pause holds every clip; a clip
// stops at the end of its span; interface touches need nothing to be set up.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntroFilmSound } from "./introFilmSound";

type FakeAudio = { src: string; currentTime: number; volume: number; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };
const made: FakeAudio[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  made.length = 0;
  vi.stubGlobal(
    "Audio",
    class {
      readyState = 4;
      currentTime = 0;
      duration = 10;
      volume = 1;
      preload = "";
      src: string;
      play = vi.fn(() => Promise.resolve());
      pause = vi.fn();
      addEventListener = vi.fn();
      constructor(src: string) {
        this.src = src;
        made.push(this as unknown as FakeAudio);
      }
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const clip = (path: string, religious = true) => ({ path, from: 1, to: 6, volume: 0.4, religious });
const frames = (ms: number) => vi.advanceTimersByTime(ms);

describe("the introduction's sound", () => {
  it("plays a span of the app's own file, from its start point", () => {
    const sound = new IntroFilmSound("/");
    sound.play(clip("audio/quran/alafasy-murattal/basmala.mp3"));
    expect(made[0].src).toBe("/audio/quran/alafasy-murattal/basmala.mp3");
    expect(made[0].currentTime).toBe(1);
    expect(made[0].play).toHaveBeenCalledTimes(1);
  });

  it("never lets two religious recordings sound together: the earlier one fades out at once", () => {
    const sound = new IntroFilmSound("/");
    sound.play(clip("adhan.mp3"));
    made[0].currentTime = 3;
    sound.play(clip("basmala.mp3"));
    made[0].currentTime = 3.15; // half way through its 0.3 s fade
    frames(50);
    expect(made[0].volume).toBeCloseTo(0.2, 2);
    made[0].currentTime = 3.31;
    frames(50);
    expect(made[0].pause).toHaveBeenCalled(); // gone within the fade
    expect(made[1].pause).not.toHaveBeenCalled();
  });

  it("a forced fade-out never makes a quiet clip louder: it fades from where it is", () => {
    const sound = new IntroFilmSound("/");
    sound.play({ path: "adhan.mp3", from: 1, to: 6, fadeOut: 2, volume: 0.4, religious: true });
    made[0].currentTime = 5.5; // in its own fade: a quarter of its level
    frames(50);
    expect(made[0].volume).toBeCloseTo(0.1, 2);
    sound.play({ path: "basmala.mp3", from: 0, volume: 0.4, religious: true }); // asks it to go now
    frames(50);
    expect(made[0].volume).toBeLessThanOrEqual(0.1 + 1e-9);
    made[0].currentTime = 5.6;
    frames(50);
    expect(made[0].volume).toBeLessThan(0.1);
  });

  it("holds every clip through a pause, and continues it after", () => {
    const sound = new IntroFilmSound("/");
    sound.play(clip("dhikr.mp3"));
    sound.pause();
    expect(made[0].pause).toHaveBeenCalled();
    sound.resume();
    expect(made[0].play).toHaveBeenCalledTimes(2);
  });

  it("stops a clip at the end of its span", () => {
    const sound = new IntroFilmSound("/");
    sound.play(clip("adhan.mp3"));
    made[0].currentTime = 6;
    frames(50);
    expect(made[0].pause).toHaveBeenCalled();
  });

  it("a touch needs no setup, and is simply silent where Web Audio isn't available", () => {
    const sound = new IntroFilmSound("/");
    expect(() => sound.touch("tap")).not.toThrow();
    expect(made).toHaveLength(0);
  });
});
