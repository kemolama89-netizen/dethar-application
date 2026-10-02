// A Quranic recitation as one continuous Web Audio stream: every ayah is
// fetched + decoded up front, then scheduled to start exactly where the
// previous ayah ends — no pause, no load wait between ayahs. The 1.5 s
// adhkar pause stays between repetitions only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { AudioElementLike } from "./audioEngine";
import { getActiveAudio, pauseAudio, resumeAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import type { AudioBufferLike, AudioContextLike, BufferSourceLike } from "./webAudioSequence";
import { playAudioSequence, setWebAudioForTesting } from "./webAudioSequence";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import { startAudioAdhkar, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { loadQuranRotationIndex, saveQuranReciterMode, saveQuranRotationIndex, saveSelectedQuranReciterId } from "./quranAudioPreferences";
import { DEFAULT_QURAN_RECITER_ID } from "../data/quranReciters";

class FakeSource implements BufferSourceLike {
  buffer: (AudioBufferLike & { url: string }) | null = null;
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  offset = 0;
  stopped = false;
  connect() {}
  disconnect() {}
  start(when: number, offset = 0) {
    this.startedAt = when;
    this.offset = offset;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeContext implements AudioContextLike {
  currentTime = 10;
  state = "running";
  destination = {};
  sources: FakeSource[] = [];
  decodes: string[] = [];
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  async decodeAudioData(data: ArrayBuffer) {
    const url = new TextDecoder().decode(data);
    this.decodes.push(url);
    return { url, duration: DURATIONS[url] ?? 2 };
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  /** The scheduled stream plays to its end. */
  finish() {
    this.sources.at(-1)?.onended?.();
  }
}

// Durations of the decoded ayahs (seconds), by url.
const DURATIONS: Record<string, number> = {
  a1: 3.25,
  a2: 2.5,
  a3: 4.125,
  a4: 1.75,
  // First ayahs that open with the reciter's own basmala.
  "/audio/quran/banna-murattal/113001.mp3": 9,
  "/audio/quran/mustafaismail-mujawwad/113001.mp3": 9,
};

let ctx: FakeContext;
let fetched: string[];
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  ctx = new FakeContext();
  fetched = [];
  setWebAudioForTesting({
    createContext: () => ctx,
    fetch: async (url) => {
      fetched.push(url);
      return new TextEncoder().encode(url).buffer as ArrayBuffer;
    },
  });
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
  setWebAudioForTesting();
  // No localStorage here: the preferences live in their session copy — reset it.
  saveSelectedQuranReciterId(DEFAULT_QURAN_RECITER_ID);
  saveQuranReciterMode("specific");
  saveQuranRotationIndex(0);
  vi.useRealTimers();
});

describe("playAudioSequence", () => {
  it("decodes every ayah first, then schedules each to start exactly where the previous one ends", async () => {
    const onEnded = vi.fn();
    playAudioSequence("quran", "q", ["a1", "a2", "a3", "a4"], { onEnded });
    expect(ctx.sources).toHaveLength(0); // nothing plays before all ayahs are decoded
    await flush();
    expect(fetched).toEqual(["a1", "a2", "a3", "a4"]);
    expect(ctx.sources.map((s) => s.buffer?.url)).toEqual(["a1", "a2", "a3", "a4"]);
    const starts = ctx.sources.map((s) => s.startedAt!);
    // Back to back: each start = previous start + previous duration. No pause, nothing trimmed.
    expect(starts[1] - starts[0]).toBe(3.25);
    expect(starts[2] - starts[1]).toBe(2.5);
    expect(starts[3] - starts[2]).toBe(4.125);
    expect(starts[0]).toBeGreaterThanOrEqual(10); // first ayah starts (just ahead of) now
    expect(onEnded).not.toHaveBeenCalled();
    ctx.finish();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();
  });

  it("holds the audio while loading, pause/resume suspend/resume the stream", async () => {
    playAudioSequence("quran", "q", ["a1", "a2"]);
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "q" });
    await flush();
    expect(pauseAudio("q")).toBe(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(resumeAudio("q")).toBe(true);
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("stopping (or another source taking over) stops every scheduled ayah", async () => {
    const onInterrupted = vi.fn();
    const onEnded = vi.fn();
    playAudioSequence("quran", "q", ["a1", "a2", "a3"], { onInterrupted, onEnded });
    await flush();
    stopAudio();
    expect(onInterrupted).toHaveBeenCalledTimes(1);
    expect(ctx.sources.every((s) => s.stopped && s.onended === null)).toBe(true);
    ctx.finish();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("stopping while still loading schedules nothing", async () => {
    playAudioSequence("quran", "q", ["a1", "a2"]);
    stopAudio();
    await flush();
    expect(ctx.sources).toHaveLength(0);
  });

  it("a file that can't be loaded ends the playback with onError, and is not cached", async () => {
    setWebAudioForTesting({ createContext: () => ctx, fetch: async () => Promise.reject(new Error("404")) });
    const onError = vi.fn();
    playAudioSequence("quran", "q", ["a1", "a2"], { onError });
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(ctx.sources).toHaveLength(0);
    expect(getActiveAudio()).toBeNull();
  });

  it("decodes a recitation once — its next repetition reuses the decoded ayahs", async () => {
    playAudioSequence("quran", "q", ["a1", "a2"]);
    await flush();
    ctx.finish();
    playAudioSequence("quran", "q", ["a1", "a2"]);
    await flush();
    expect(fetched).toEqual(["a1", "a2"]);
    expect(ctx.sources).toHaveLength(4);
  });

  it("falls back to the <audio> element queue where Web Audio is unavailable", () => {
    setWebAudioForTesting({ createContext: () => null });
    const played: string[] = [];
    const el: AudioElementLike = { src: "", play() { played.push(this.src); }, pause() {}, removeAttribute() {}, load() {}, onended: null, onerror: null };
    setAudioElementFactory(() => el);
    playAudioSequence("quran", "q", ["a1", "a2"]);
    expect(played).toEqual(["a1"]);
  });
});

describe("Quranic adhkar through the Audio Adhkar player", () => {
  const morning = (id: string) => writtenAdhkarItems.morning.find((i) => i.id === id)!;

  it.each([
    ["morning_002", 112, 4],
    ["morning_002b", 113, 5],
    ["morning_002c", 114, 6],
  ])("%s plays his basmala then all %i:1-%i ayahs as one continuous stream, in order", async (id, surah, ayahs) => {
    saveSelectedQuranReciterId("alafasy-murattal");
    startAudioAdhkar("morning", morning(id));
    await flush();
    const expected = [
      "/audio/quran/alafasy-murattal/basmala.mp3",
      ...Array.from({ length: ayahs }, (_, i) => `/audio/quran/alafasy-murattal/${surah}${String(i + 1).padStart(3, "0")}.mp3`),
    ];
    expect(ctx.sources.map((s) => s.buffer?.url)).toEqual(expected);
    const starts = ctx.sources.map((s) => s.startedAt!);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1], `ayah ${i} → ${i + 1}`).toBe(2); // = previous ayah's duration: no added pause
  });

  it("the 1.5 s pause comes only between repetitions — never between ayahs", async () => {
    vi.useFakeTimers();
    startAudioAdhkar("morning", morning("morning_002")); // al-Ikhlas ×3 (Abdul Basit: his basmala + 4 ayahs)
    await flush();
    expect(ctx.sources).toHaveLength(5);
    expect(vi.getTimerCount()).toBe(0); // no timer between basmala/ayahs — they are one schedule
    ctx.finish(); // repetition 1's last ayah ends
    expect(vi.getTimerCount()).toBe(1); // now the 1.5 s pause
    vi.advanceTimersByTime(REPETITION_PAUSE_MS - 1);
    expect(ctx.sources).toHaveLength(5);
    vi.advanceTimersByTime(1);
    await flush();
    expect(ctx.sources).toHaveLength(10); // repetition 2: his basmala and the 4 ayahs again
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_002", repetition: 2, total: 3 });
    expect(fetched).toHaveLength(5); // each file decoded once
  });

  it("keeps the rotation: one reciter per recitation, chosen once", async () => {
    saveQuranReciterMode("rotation");
    startAudioAdhkar("morning", morning("morning_002c"));
    await flush();
    expect(new Set(ctx.sources.map((s) => s.buffer?.url.split("/")[3]))).toEqual(new Set(["abdulbasit-murattal"]));
    expect(loadQuranRotationIndex()).toBe(1);
  });
});


describe("basmala — before every repetition, in the reciter's own voice, never between ayahs", () => {
  const item = (category: "morning" | "evening", id: string) => writtenAdhkarItems[category].find((i) => i.id === id)!;
  const ayahs = (reciter: string, surah: number, n: number) => Array.from({ length: n }, (_, i) => `${reciter}/${surah}${String(i + 1).padStart(3, "0")}.mp3`);

  /** Plays all repetitions; returns each repetition's sources. */
  async function playAll(category: "morning" | "evening", id: string) {
    vi.useFakeTimers();
    const base = ctx.sources.length;
    startAudioAdhkar(category, item(category, id));
    const reps: FakeSource[][] = [];
    for (;;) {
      await flush();
      reps.push(ctx.sources.slice(base + reps.flat().length));
      ctx.finish();
      if (getNowPlaying()?.status === "finished") return reps;
      vi.advanceTimersByTime(REPETITION_PAUSE_MS);
    }
  }
  const names = (sources: FakeSource[]) => sources.map((s) => s.buffer!.url.split("/").slice(-2).join("/"));
  const backToBack = (rep: FakeSource[]) => {
    for (let i = 1; i < rep.length; i++) expect(rep[i].startedAt! - rep[i - 1].startedAt!).toBe(rep[i - 1].buffer!.duration - rep[i - 1].offset);
  };
  const SEPARATE = ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "muaiqly-murattal", "dosari-murattal", "qatami-murattal"];
  const IN_FIRST_AYAH = ["banna-murattal", "mustafaismail-mujawwad"];

  it.each(SEPARATE)("%s: his basmala → al-Falaq, before EVERY repetition (×3), never between ayahs", async (reciter) => {
    saveSelectedQuranReciterId(reciter);
    const reps = await playAll("evening", "morning_002b");
    expect(reps).toHaveLength(3);
    for (const rep of reps) {
      expect(names(rep)).toEqual([`${reciter}/basmala.mp3`, ...ayahs(reciter, 113, 5)]);
      backToBack(rep);
    }
  });

  it.each(IN_FIRST_AYAH)("%s: his own basmala inside his first ayah, every repetition — no duplicate added", async (reciter) => {
    saveSelectedQuranReciterId(reciter);
    const reps = await playAll("morning", "morning_002b");
    expect(reps).toHaveLength(3);
    for (const rep of reps) {
      expect(names(rep)).toEqual(ayahs(reciter, 113, 5)); // no separate basmala
      expect(rep[0].offset).toBe(0); // played from the start: his basmala is heard each time
      backToBack(rep);
    }
  });

  it.each([...SEPARATE, ...IN_FIRST_AYAH])("%s: Ayat al-Kursi starts with his own basmala", async (reciter) => {
    saveSelectedQuranReciterId(reciter);
    const reps = await playAll("evening", "morning_001");
    expect(names(reps.flat())).toEqual([`${reciter}/basmala.mp3`, `${reciter}/002255.mp3`]);
    backToBack(reps[0]);
  });

  it("sudais-murattal (no voice-verified basmala): plays none — never another reciter's", async () => {
    saveSelectedQuranReciterId("sudais-murattal");
    const nas = await playAll("morning", "morning_002c");
    for (const rep of nas) expect(names(rep)).toEqual(ayahs("sudais-murattal", 114, 6));
    stopAudioAdhkar();
    const kursi = await playAll("morning", "morning_001");
    expect(names(kursi.flat())).toEqual(["sudais-murattal/002255.mp3"]);
    expect(fetched.some((u) => u.endsWith("/basmala.mp3"))).toBe(false);
  });

  it("Automatic Rotation: each recitation's basmala is that recitation's reciter — no voice mixing", async () => {
    saveQuranReciterMode("rotation");
    const order = ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "sudais-murattal", "muaiqly-murattal", "dosari-murattal", "qatami-murattal", "banna-murattal", "mustafaismail-mujawwad"];
    for (const reciter of order) {
      const from = ctx.sources.length;
      startAudioAdhkar("evening", item("evening", "morning_001"));
      await flush();
      const played = ctx.sources.slice(from).map((s) => s.buffer!.url.split("/").slice(-2).join("/"));
      expect(played, reciter).toEqual(reciter === "sudais-murattal" ? [`${reciter}/002255.mp3`] : [`${reciter}/basmala.mp3`, `${reciter}/002255.mp3`]);
      stopAudioAdhkar();
    }
  });
});
