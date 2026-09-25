// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_QURAN_RECITER_ID, getAvailableQuranReciters } from "../data/quranReciters";
import {
  QURAN_RECITER_STORAGE_KEY,
  isSelectableQuranReciterId,
  loadSelectedQuranReciterId,
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
    expect(loadSelectedQuranReciterId()).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(() => saveSelectedQuranReciterId(OTHER_ID)).not.toThrow();
  });
});
