// @vitest-environment jsdom
// The Qur'an reader's saved state: last position, bookmarks and page zoom —
// saved on the device, kept across restarts, and validated so an invalid
// saved verse (e.g. after a dataset change) is never used.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  QURAN_ZOOM_FIT,
  isQuranBookmarked,
  loadQuranBookmarks,
  loadQuranPosition,
  loadQuranZoom,
  resetQuranReadingCacheForTesting,
  saveQuranPosition,
  saveQuranZoom,
  subscribeQuranReading,
  toggleQuranBookmark,
} from "./quranReading";

beforeEach(() => {
  localStorage.clear();
  resetQuranReadingCacheForTesting();
});

describe("Qur'an reading position", () => {
  it("is empty for someone who never opened the Qur'an", () => {
    expect(loadQuranPosition()).toBeNull();
    expect(loadQuranBookmarks()).toEqual([]);
  });

  it("saves the exact verse, tells listeners, and survives a restart", () => {
    const seen = vi.fn();
    const unsubscribe = subscribeQuranReading(seen);
    saveQuranPosition(2, 255, 1000);
    expect(seen).toHaveBeenCalledTimes(1);
    saveQuranPosition(2, 255, 2000); // same place: nothing to tell
    expect(seen).toHaveBeenCalledTimes(1);
    unsubscribe();
    resetQuranReadingCacheForTesting();
    expect(loadQuranPosition()).toEqual({ surah: 2, ayah: 255, at: 1000 });
  });

  it("never saves or uses a verse that doesn't exist", () => {
    saveQuranPosition(115, 1);
    saveQuranPosition(1, 8);
    expect(loadQuranPosition()).toBeNull();
    localStorage.setItem("dithar:quran:position:v1", JSON.stringify({ surah: 2, ayah: 300, at: 1 }));
    resetQuranReadingCacheForTesting();
    expect(loadQuranPosition()).toBeNull();
    localStorage.setItem("dithar:quran:position:v1", "not json");
    resetQuranReadingCacheForTesting();
    expect(loadQuranPosition()).toBeNull();
  });
});

describe("Qur'an bookmarks and page zoom", () => {
  it("adds and removes a bookmark, newest first, kept across a restart", () => {
    expect(toggleQuranBookmark(18, 10, 1)).toBe(true);
    expect(toggleQuranBookmark(36, 1, 2)).toBe(true);
    resetQuranReadingCacheForTesting();
    expect(loadQuranBookmarks().map((b) => `${b.surah}:${b.ayah}`)).toEqual(["36:1", "18:10"]);
    expect(toggleQuranBookmark(18, 10)).toBe(false);
    expect(isQuranBookmarked(18, 10)).toBe(false);
    expect(toggleQuranBookmark(200, 1)).toBe(false);
  });

  it("fits the page by default, keeps a valid zoom and ignores anything else", () => {
    localStorage.setItem("dithar:quran:font-size:v1", "27"); // the old text size: no longer applies
    expect(loadQuranZoom()).toBe(QURAN_ZOOM_FIT);
    saveQuranZoom(1.5);
    expect(loadQuranZoom()).toBe(1.5);
    saveQuranZoom(500);
    expect(loadQuranZoom()).toBe(1.5);
    saveQuranZoom(QURAN_ZOOM_FIT);
    expect(loadQuranZoom()).toBe(QURAN_ZOOM_FIT);
  });
});
