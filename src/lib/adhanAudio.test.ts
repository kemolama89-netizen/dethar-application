import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdhanAudioElement } from "./adhanAudio";
import { adhanAudioUrl, playAdhanSegment, setAdhanAudioElementFactory } from "./adhanAudio";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, pauseAudio, playUrlQueue, resumeAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import { getAdhanRecordingById } from "../data/adhanRecordings";

class FakeAdhanAudio implements AdhanAudioElement {
  src = "";
  preload = "";
  currentTime = 0;
  log: string[] = [];
  onloadedmetadata: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.log.push(`play@${this.currentTime}`);
    this.onplaying?.();
  }
  pause() {
    this.log.push("pause");
    this.onpause?.();
  }
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {
    this.log.push(`load ${decodeURI(this.src).split("/").pop()}`);
  }
}

class FakeQueueAudio implements AudioElementLike {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {}
}

let el: FakeAdhanAudio;
let created: number;
const refaat = getAdhanRecordingById("refaat")!;
const omranFajr = getAdhanRecordingById("omran-fajr")!;
const kuwait = getAdhanRecordingById("alafasy-kuwait")!;
const loads = () => el.log.filter((l) => l.startsWith("load")).length;

beforeEach(() => {
  vi.useFakeTimers();
  el = new FakeAdhanAudio();
  created = 0;
  setAdhanAudioElementFactory(() => {
    created++;
    return el;
  });
});
afterEach(() => {
  stopAudio();
  vi.useRealTimers();
});

describe("playAdhanSegment", () => {
  it("seeks to the segment start once metadata loads, then plays", () => {
    const { start } = refaat.segments.takbeer!;
    expect(playAdhanSegment(refaat, "takbeer")).toBe(true);
    expect(el.src).toBe(adhanAudioUrl(refaat));
    expect(loads()).toBe(1);
    el.onloadedmetadata!();
    expect(el.currentTime).toBe(start);
    expect(el.log.at(-1)).toBe(`play@${start}`);
    expect(getActiveAudio()).toEqual({ channel: "adhan", key: "adhan:refaat:takbeer" });
  });

  it("stops exactly at the segment end and releases the audio", () => {
    const { start, end } = refaat.segments.takbeer!;
    const onEnded = vi.fn();
    playAdhanSegment(refaat, "takbeer", { onEnded });
    el.onloadedmetadata!();
    vi.advanceTimersByTime((end - start) * 1000 - 50);
    expect(onEnded).not.toHaveBeenCalled();
    el.currentTime = end;
    vi.advanceTimersByTime(100);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(el.log.at(-1)).toBe("pause");
    expect(getActiveAudio()).toBeNull();
  });

  it("re-arms instead of stopping early if playback lagged behind the timer", () => {
    const { start, end } = omranFajr.segments.fajrPhrase!;
    const onEnded = vi.fn();
    playAdhanSegment(omranFajr, "fajrPhrase", { onEnded });
    el.onloadedmetadata!();
    expect(el.currentTime).toBe(start);
    el.currentTime = end - 3; // e.g. buffering stalled: 3 s still to play when the timer fires
    vi.advanceTimersByTime((end - start) * 1000);
    expect(onEnded).not.toHaveBeenCalled();
    el.currentTime = end;
    vi.advanceTimersByTime(6000);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("also stops on a timeupdate past the end (backstop)", () => {
    const onEnded = vi.fn();
    playAdhanSegment(omranFajr, "fajrPhrase", { onEnded });
    el.onloadedmetadata!();
    el.currentTime = omranFajr.segments.fajrPhrase!.end + 0.1;
    el.ontimeupdate!();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("refuses a mode the recording has no segment for", () => {
    expect(playAdhanSegment(refaat, "fajrPhrase")).toBe(false);
    expect(getActiveAudio()).toBeNull();
    expect(el.log).toEqual([]);
  });

  it("pauses and resumes through the shared engine without losing the end", () => {
    const onEnded = vi.fn();
    playAdhanSegment(refaat, "takbeer", { onEnded });
    el.onloadedmetadata!();
    expect(pauseAudio("adhan:refaat:takbeer")).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(onEnded).not.toHaveBeenCalled();
    expect(resumeAudio("adhan:refaat:takbeer")).toBe(true);
    el.currentTime = refaat.segments.takbeer!.end;
    vi.advanceTimersByTime(30_000);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe("no unnecessary reloads (fast voice / mode switching)", () => {
  it("uses ONE element for all adhan playback", () => {
    playAdhanSegment(refaat, "full");
    playAdhanSegment(kuwait, "takbeer");
    playAdhanSegment(omranFajr, "fajrPhrase");
    expect(created).toBe(1);
  });

  it("replays an already-loaded recording instantly: no new load, straight to the segment start", () => {
    playAdhanSegment(refaat, "full");
    el.onloadedmetadata!();
    stopAudio();
    playAdhanSegment(refaat, "full");
    expect(loads()).toBe(1);
    expect(el.log.at(-1)).toBe(`play@${refaat.segments.full!.start}`);
  });

  it("switches Full ↔ Takbeer on the same recording without reloading", () => {
    playAdhanSegment(omranFajr, "full");
    el.onloadedmetadata!();
    playAdhanSegment(omranFajr, "fajrPhrase");
    expect(loads()).toBe(1);
    expect(el.currentTime).toBe(omranFajr.segments.fajrPhrase!.start);
    expect(getActiveAudio()?.key).toBe("adhan:omran-fajr:fajrPhrase");
  });

  it("does not restart a download that is still in progress for the same recording", () => {
    playAdhanSegment(refaat, "full");
    playAdhanSegment(refaat, "takbeer"); // tapped again before metadata arrived
    expect(loads()).toBe(1);
    el.onloadedmetadata!();
    expect(el.currentTime).toBe(refaat.segments.takbeer!.start);
    expect(getActiveAudio()?.key).toBe("adhan:refaat:takbeer");
  });

  it("loads a different recording (replacing src aborts the previous download)", () => {
    playAdhanSegment(refaat, "full");
    el.onloadedmetadata!();
    playAdhanSegment(kuwait, "full");
    expect(loads()).toBe(2);
    expect(el.src).toBe(adhanAudioUrl(kuwait));
  });

  it("stops the previous preview BEFORE wiring the new one (its handlers survive)", () => {
    const first = vi.fn();
    playAdhanSegment(refaat, "full", { onInterrupted: first });
    el.onloadedmetadata!();
    playAdhanSegment(kuwait, "takbeer");
    expect(first).toHaveBeenCalledTimes(1);
    expect(el.onloadedmetadata).not.toBeNull();
    expect(el.ontimeupdate).not.toBeNull();
    el.onloadedmetadata!();
    expect(el.currentTime).toBe(kuwait.segments.takbeer!.start);
  });

  it("plays after Preview → quick Stop → Preview, even though metadata arrived while stopped", () => {
    playAdhanSegment(refaat, "takbeer");
    stopAudio("adhan"); // stopped before the file's metadata loaded
    // The file finishes loading with no playback listening (as a browser would):
    (el as FakeAdhanAudio & { readyState: number }).readyState = 4;
    playAdhanSegment(refaat, "takbeer");
    expect(loads()).toBe(1);
    expect(el.log.at(-1)).toBe(`play@${refaat.segments.takbeer!.start}`);
  });

  it("reloads if the load failed while nothing was listening", () => {
    playAdhanSegment(refaat, "takbeer");
    stopAudio("adhan");
    (el as FakeAdhanAudio & { error: unknown }).error = { code: 4 };
    playAdhanSegment(refaat, "takbeer");
    expect(loads()).toBe(2);
  });

  it("reloads after a failed load instead of reusing the broken one", () => {
    playAdhanSegment(refaat, "full");
    el.onerror!();
    playAdhanSegment(refaat, "full");
    expect(loads()).toBe(2);
  });
});

describe("coexistence with Quran / Audio Adhkar playback", () => {
  it("is stopped by Quran audio, and stops it in turn, like the other channels", () => {
    const onInterrupted = vi.fn();
    playAdhanSegment(refaat, "full", { onInterrupted });
    el.onloadedmetadata!();
    claimAudio("quran", "q", () => {});
    expect(onInterrupted).toHaveBeenCalledTimes(1);
    expect(el.log.at(-1)).toBe("pause");
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "q" });
  });

  it("uses its own element: the shared Quran/adhkar element is never used for the adhan", () => {
    const shared = new FakeQueueAudio();
    setAudioElementFactory(() => shared);
    playUrlQueue("adhkar", "a", ["/a.mp3"]);
    expect(shared.src).toBe("/a.mp3");
    playAdhanSegment(refaat, "full");
    expect(el.src).toBe(adhanAudioUrl(refaat));
    expect(shared.src).not.toBe(adhanAudioUrl(refaat));
    expect(getActiveAudio()?.channel).toBe("adhan");
  });

  it("stopAudio('quran') leaves a playing adhan alone", () => {
    playAdhanSegment(refaat, "full");
    el.onloadedmetadata!();
    stopAudio("quran");
    expect(getActiveAudio()?.channel).toBe("adhan");
  });
});

describe("adhan volume", () => {
  it("follows the adhan slider while it plays", async () => {
    const { saveAudioVolume } = await import("./audioVolumeSettings");
    const fakeEl = el as FakeAdhanAudio & { volume?: number };
    saveAudioVolume("adhan", 100);
    playAdhanSegment(refaat, "takbeer");
    expect(fakeEl.volume).toBe(1);
    saveAudioVolume("adhan", 40);
    expect(fakeEl.volume).toBe(0.4);
    // Another category's slider leaves it alone.
    saveAudioVolume("misc", 10);
    expect(fakeEl.volume).toBe(0.4);
    stopAudio();
    saveAudioVolume("adhan", 90);
    expect(fakeEl.volume).toBe(0.4); // stopped: no longer follows
    saveAudioVolume("adhan", 100);
  });
});
