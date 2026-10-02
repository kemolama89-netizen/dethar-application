// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_QURAN_RECITER_ID, getAvailableQuranReciters } from "../data/quranReciters";
import {
  DEFAULT_QURAN_RECITER_MODE,
  QURAN_RECITER_MODE_STORAGE_KEY,
  QURAN_RECITER_STORAGE_KEY,
  QURAN_ROTATION_STORAGE_KEY,
  isSelectableQuranReciterId,
  loadQuranReciterMode,
  loadQuranRotationIndex,
  loadSelectedQuranReciterId,
  saveQuranReciterMode,
  saveQuranRotationIndex,
  saveSelectedQuranReciterId,
} from "./quranAudioPreferences";

const OTHER_ID = getAvailableQuranReciters().find((r) => r.id !== DEFAULT_QURAN_RECITER_ID)!.id;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("quranAudioPreferences", () => {
  it("defaults when nothing is stored", () => {
    expect(loadSelectedQuranReciterId()).toBe(DEFAULT_QURAN_RECITER_ID);
  });

  it("restores a valid persisted reciter", () => {
    localStorage.setItem(QURAN_RECITER_STORAGE_KEY, OTHER_ID);
    expect(loadSelectedQuranReciterId()).toBe(OTHER_ID);
  });

  it("falls back to the default for an unknown or corrupted stored id, without overwriting it", () => {
    for (const bad of ["removed-reciter", "", "{not json", '"abdulbasit-murattal"', "ABDULBASIT-MURATTAL"]) {
      localStorage.setItem(QURAN_RECITER_STORAGE_KEY, bad);
      expect(loadSelectedQuranReciterId()).toBe(DEFAULT_QURAN_RECITER_ID);
      expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBe(bad);
    }
  });

  it("persists a changed reciter", () => {
    saveSelectedQuranReciterId(OTHER_ID);
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBe(OTHER_ID);
    expect(loadSelectedQuranReciterId()).toBe(OTHER_ID);
  });

  it("refuses to persist an id that isn't a selectable reciter", () => {
    saveSelectedQuranReciterId(OTHER_ID);
    saveSelectedQuranReciterId("no-such-reciter");
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBe(OTHER_ID);
    expect(isSelectableQuranReciterId(42)).toBe(false);
  });

  it("never throws when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => loadSelectedQuranReciterId()).not.toThrow();
    expect(() => saveSelectedQuranReciterId(OTHER_ID)).not.toThrow();
    // The choice still holds for the rest of the session.
    expect(loadSelectedQuranReciterId()).toBe(OTHER_ID);
    expect(() => saveQuranReciterMode("rotation")).not.toThrow();
    expect(loadQuranReciterMode()).toBe("rotation");
    expect(() => saveQuranRotationIndex(3)).not.toThrow();
    expect(loadQuranRotationIndex()).toBe(3);
  });

  it("uses working storage over the session copy, even when storage was cleared", () => {
    saveSelectedQuranReciterId(OTHER_ID);
    saveQuranReciterMode("rotation");
    saveQuranRotationIndex(2);
    localStorage.clear();
    expect(loadSelectedQuranReciterId()).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(loadQuranReciterMode()).toBe("specific");
    expect(loadQuranRotationIndex()).toBe(0);
  });

  it("persists the reciter mode, defaulting to a specific reciter", () => {
    expect(loadQuranReciterMode()).toBe(DEFAULT_QURAN_RECITER_MODE);
    expect(DEFAULT_QURAN_RECITER_MODE).toBe("specific");
    saveQuranReciterMode("rotation");
    expect(localStorage.getItem(QURAN_RECITER_MODE_STORAGE_KEY)).toBe("rotation");
    expect(loadQuranReciterMode()).toBe("rotation");
    saveQuranReciterMode("shuffle" as never);
    expect(loadQuranReciterMode()).toBe("rotation");
    localStorage.setItem(QURAN_RECITER_MODE_STORAGE_KEY, "garbage");
    expect(loadQuranReciterMode()).toBe("specific");
  });

  it("persists the rotation position, treating anything invalid as the start", () => {
    expect(loadQuranRotationIndex()).toBe(0);
    saveQuranRotationIndex(4);
    expect(localStorage.getItem(QURAN_ROTATION_STORAGE_KEY)).toBe("4");
    expect(loadQuranRotationIndex()).toBe(4);
    saveQuranRotationIndex(-1);
    expect(loadQuranRotationIndex()).toBe(4);
    for (const bad of ["-2", "1.5", "x", ""]) {
      localStorage.setItem(QURAN_ROTATION_STORAGE_KEY, bad);
      expect(loadQuranRotationIndex(), bad).toBe(0);
    }
  });
});
