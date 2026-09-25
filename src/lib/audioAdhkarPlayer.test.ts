import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { MISC_DUAS } from "../data/misc-library";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import { getNowPlaying } from "./audioAdhkarPlayback";
import {
  AUDIO_ENABLED_COLLECTIONS,
  getAudioAdhkarSource,
  pauseAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkar,
  stopAudioAdhkar,
} from "./audioAdhkarPlayer";

class FakeAudio implements AudioElementLike {
  src = "";
  played: string[] = [];
  paused = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.played.push(this.src);
  }
  pause() {
    this.paused++;
  }
  removeAttribute() {}
  load() {}
  /** What the browser does when the file actually finishes. */
  end() {
    this.onended?.();
  }
}

let fake: FakeAudio;
beforeEach(() => {
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
});

const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
// The actual file contents (as data URIs) — to prove each served file IS the uploaded recording.
const files = {
  ...import.meta.glob<string>("/public/audio/adhkar/**/*.mp3", { query: "?inline", import: "default", eager: true }),
  ...import.meta.glob<string>("/ASSETS/audio/adhkar/*.mp3", { query: "?inline", import: "default", eager: true }),
};
const bytes = (path: string) => files[`/${path}`];

// The three uploaded recordings, by what they contain (verified by transcription).
const RECORDINGS = [
  { upload: "evening_001.mp3", id: "morning_003", opening: "أمسينا وأمسى الملك", url: "/audio/adhkar/evening/morning_003.mp3" },
  { upload: "evening_002.mp3", id: "morning_005", opening: "اللهم أنت ربي", url: "/audio/adhkar/shared/morning_005.mp3" },
  { upload: "evening_003.mp3", id: "morning_016", opening: "أمسينا عَلَى فِطْرَةِ", url: "/audio/adhkar/evening/morning_016.mp3" },
];

describe("Evening recordings map to the right dhikr", () => {
  for (const r of RECORDINGS) {
    it(`${r.upload} → evening ${r.id}`, () => {
      const item = evening(r.id);
      expect(item.text_ar.replace(/[ؐ-ًؚ-ٰٟـ]/g, "")).toContain(r.opening.replace(/[ؐ-ًؚ-ٰٟـ]/g, ""));
      expect(getAudioAdhkarSource("evening", item)?.urls).toEqual([r.url]);
      expect(bytes(`public${r.url}`)).toBeTruthy();
      expect(bytes(`public${r.url}`)).toBe(bytes(`ASSETS/audio/adhkar/${r.upload}`));
    });
  }

  it("only these three Evening dhikr are playable; the rest stay unavailable", () => {
    const playable = writtenAdhkarItems.evening.filter((i) => getAudioAdhkarSource("evening", i)).map((i) => i.id);
    expect(playable).toEqual(["morning_003", "morning_005", "morning_016"]);
  });

  it("never plays Quranic Evening items (reciter audio comes later)", () => {
    for (const item of writtenAdhkarItems.evening.filter((i) => i.quranRef)) expect(getAudioAdhkarSource("evening", item)).toBeNull();
  });

  it("does not enable Morning — not even the shared Sayyid al-Istighfar file", () => {
    expect(AUDIO_ENABLED_COLLECTIONS).toEqual(["evening"]);
    for (const item of writtenAdhkarItems.morning) expect(getAudioAdhkarSource("morning", item), item.id).toBeNull();
    expect(startAudioAdhkar("morning", writtenAdhkarItems.morning.find((i) => i.id === "morning_005")!)).toBe(false);
    expect(getNowPlaying()).toBeNull();
    expect(fake.played).toEqual([]);
  });

  it("does not enable Various", () => {
    for (const item of MISC_DUAS) {
      expect(getAudioAdhkarSource("misc", item as unknown as WrittenAdhkarItem)).toBeNull();
    }
  });

  it("does nothing for an Evening dhikr without a recording", () => {
    const unrecorded = writtenAdhkarItems.evening.find((i) => !getAudioAdhkarSource("evening", i))!;
    expect(startAudioAdhkar("evening", unrecorded)).toBe(false);
    expect(getNowPlaying()).toBeNull();
    expect(fake.played).toEqual([]);
  });
});

describe("playback drives the existing repetition state", () => {
  const threeTimes = () => {
    // Every connected Evening recording is said once, so drive the
    // repetition logic with a 3× copy of a real recorded item.
    return { ...evening("morning_003"), repeat: 3 };
  };

  it("starting sets the current dhikr at repetition 1 and plays its file", () => {
    expect(startAudioAdhkar("evening", evening("morning_016"))).toBe(true);
    expect(getNowPlaying()).toEqual({ collection: "evening", itemId: "morning_016", repetition: 1, total: 1, status: "playing" });
    expect(fake.played).toEqual(["/audio/adhkar/evening/morning_016.mp3"]);
    expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "adhkar:evening/morning_016" });
  });

  it("advances exactly once per completed playback, replaying the file for the next repetition", () => {
    startAudioAdhkar("evening", threeTimes());
    fake.end();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    expect(fake.played).toHaveLength(2);
    fake.end();
    expect(getNowPlaying()).toMatchObject({ repetition: 3, status: "playing" });
    expect(fake.played).toHaveLength(3);
  });

  it("finishing the last repetition ends in the finished state and stops playing", () => {
    startAudioAdhkar("evening", threeTimes());
    fake.end();
    fake.end();
    fake.end();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_003", repetition: 3, status: "finished" });
    expect(fake.played).toHaveLength(3);
    expect(getActiveAudio()).toBeNull();
  });

  it("a duplicate completion callback for the same playback can't advance twice", () => {
    startAudioAdhkar("evening", threeTimes());
    const firstEnded = fake.onended!;
    firstEnded();
    firstEnded();
    expect(getNowPlaying()?.repetition).toBe(2);
    // A late "ended" from the first playback, after the second started:
    firstEnded();
    expect(getNowPlaying()?.repetition).toBe(2);
    expect(fake.played).toHaveLength(2);
  });

  it("a single-repetition dhikr finishes after one playback, even if 'ended' fires twice", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    const ended = fake.onended!;
    ended();
    ended();
    expect(getNowPlaying()).toMatchObject({ repetition: 1, status: "finished" });
    expect(fake.played).toHaveLength(1);
  });

  it("pause does not advance; resume continues the same repetition without restarting it", () => {
    startAudioAdhkar("evening", threeTimes());
    fake.end();
    const pausesBefore = fake.paused;
    pauseAudioAdhkar();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "paused" });
    expect(fake.paused).toBe(pausesBefore + 1);
    pauseAudioAdhkar();
    expect(getNowPlaying()?.repetition).toBe(2);
    resumeAudioAdhkar();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    // resume = play() on the same element and src — same repetition continues
    expect(fake.played).toEqual(Array(3).fill("/audio/adhkar/evening/morning_003.mp3"));
    fake.end();
    expect(getNowPlaying()?.repetition).toBe(3);
  });

  it("starting another dhikr replaces the current one; the old playback's late end is ignored", () => {
    startAudioAdhkar("evening", threeTimes());
    const oldEnded = fake.onended!;
    startAudioAdhkar("evening", evening("morning_016"));
    oldEnded();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", repetition: 1, status: "playing" });
  });

  it("another audio source taking over clears the state instead of leaving it 'playing'", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    claimAudio("quran", "quran:x", () => {});
    expect(getNowPlaying()).toBeNull();
  });

  it("stop clears the state and the audio", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    stopAudioAdhkar();
    expect(getNowPlaying()).toBeNull();
    expect(getActiveAudio()).toBeNull();
  });
});
