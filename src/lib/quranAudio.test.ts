import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuranReciter } from "../data/quranReciters";
import { getDefaultQuranReciter } from "../data/quranReciters";
import { playQuranRef, quranAudioKey, resolveQuranAudio } from "./quranAudio";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, playUrlQueue, setAudioElementFactory, stopAudio } from "./audioEngine";

// Test-only reciters with a per-ayah source on a fake host — never real
// audio URLs.
function fakeReciter(id: string, baseUrl: string): QuranReciter {
  return { id, name: { ar: id, en: id }, style: "murattal", audio: { kind: "per-ayah", baseUrl, extension: "mp3" }, available: true };
}
const RECITER_A = fakeReciter("test-a", "https://audio.test/a/");
const RECITER_B = fakeReciter("test-b", "https://audio.test/b");

class FakeAudio implements AudioElementLike {
  src = "";
  played: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.played.push(this.src);
  }
  pause() {}
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {}
}

let fake: FakeAudio;
beforeEach(() => {
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => stopAudio());

describe("resolveQuranAudio", () => {
  it("resolves with the reciter it is given", () => {
    const ref = { surah: 2, fromAyah: 255, toAyah: 255 };
    const a = resolveQuranAudio(ref, RECITER_A);
    const b = resolveQuranAudio(ref, RECITER_B);
    expect(a).toEqual({ status: "ready", reciterId: "test-a", ref, urls: ["https://audio.test/a/002255.mp3"] });
    expect(b).toEqual({ status: "ready", reciterId: "test-b", ref, urls: ["https://audio.test/b/002255.mp3"] });
  });

  it("expands an ayah range into one file per ayah, in order", () => {
    const res = resolveQuranAudio({ surah: 114, fromAyah: 1, toAyah: 3 }, RECITER_A);
    expect(res.status === "ready" && res.urls).toEqual([
      "https://audio.test/a/114001.mp3",
      "https://audio.test/a/114002.mp3",
      "https://audio.test/a/114003.mp3",
    ]);
  });

  it("reports unconfigured reciters as unavailable (phase 1 registry)", () => {
    const reciter = getDefaultQuranReciter();
    const res = resolveQuranAudio({ surah: 1, fromAyah: 1, toAyah: 7 }, reciter);
    expect(res).toMatchObject({ status: "unavailable", reason: "audio-source-not-configured", reciterId: reciter.id });
  });

  it("reports a retired reciter as unavailable", () => {
    const res = resolveQuranAudio({ surah: 1, fromAyah: 1, toAyah: 1 }, { ...RECITER_A, available: false });
    expect(res).toMatchObject({ status: "unavailable", reason: "reciter-unavailable" });
  });

  it("never maps missing or invalid references to an ayah", () => {
    for (const ref of [undefined, null, { surah: 2, fromAyah: 300, toAyah: 300 }, { surah: 0, fromAyah: 1, toAyah: 1 }]) {
      expect(resolveQuranAudio(ref as never, RECITER_A)).toEqual({ status: "invalid-ref", reciterId: "test-a" });
    }
  });
});

describe("playQuranRef + audio engine", () => {
  it("plays the resolved queue on the quran channel, advancing per ayah", () => {
    const onEnded = vi.fn();
    const res = playQuranRef({ surah: 20, fromAyah: 25, toAyah: 26 }, RECITER_A, { onEnded });
    expect(res.status).toBe("ready");
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "quran:test-a:20:25-26" });
    expect(fake.played).toEqual(["https://audio.test/a/020025.mp3"]);
    fake.onended?.();
    expect(fake.played).toEqual(["https://audio.test/a/020025.mp3", "https://audio.test/a/020026.mp3"]);
    fake.onended?.();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();
  });

  it("plays nothing when the reference or reciter can't resolve", () => {
    expect(playQuranRef(undefined, RECITER_A).status).toBe("invalid-ref");
    expect(playQuranRef({ surah: 1, fromAyah: 1, toAyah: 1 }, getDefaultQuranReciter()).status).toBe("unavailable");
    expect(fake.played).toEqual([]);
    expect(getActiveAudio()).toBeNull();
  });

  it("keys sessions by reciter", () => {
    const ref = { surah: 2, fromAyah: 255, toAyah: 255 };
    expect(quranAudioKey("test-a", ref)).not.toBe(quranAudioKey("test-b", ref));
  });

  it("allows only one audio source at a time", () => {
    const stopTts = vi.fn();
    claimAudio("tts", "tts:1", stopTts);
    playQuranRef({ surah: 2, fromAyah: 255, toAyah: 255 }, RECITER_A);
    expect(stopTts).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()?.channel).toBe("quran");

    playUrlQueue("adhkar", "adhkar:x", ["https://audio.test/adhkar/x.mp3"]);
    expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "adhkar:x" });
    // The earlier Quran queue's handlers were detached — its "ended" can't advance anything.
    expect(fake.src).toBe("https://audio.test/adhkar/x.mp3");
  });

  it("stopAudio(channel) only stops that channel", () => {
    const stopTts = vi.fn();
    claimAudio("tts", "tts:1", stopTts);
    stopAudio("quran");
    expect(stopTts).not.toHaveBeenCalled();
    stopAudio("tts");
    expect(stopTts).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();
  });

  it("releases ownership and reports an error when a file fails", () => {
    const onError = vi.fn();
    playQuranRef({ surah: 2, fromAyah: 255, toAyah: 255 }, RECITER_A, { onError });
    fake.onerror?.();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();
  });
});
