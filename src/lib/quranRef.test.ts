import { describe, expect, it } from "vitest";
import { SURAHS, getSurahAyahCount, surahNumberFromArabicName } from "../data/quranSurahs";
import { formatQuranRefKey, isValidQuranRef } from "./quranRef";

describe("surah table", () => {
  it("has 114 surahs numbered 1..114 with 6,236 ayahs (Hafs count)", () => {
    expect(SURAHS).toHaveLength(114);
    SURAHS.forEach((s, i) => expect(s.number).toBe(i + 1));
    expect(SURAHS.reduce((sum, s) => sum + s.ayahCount, 0)).toBe(6236);
    expect(new Set(SURAHS.map((s) => s.nameAr)).size).toBe(114);
  });

  it("looks names up exactly, never fuzzily", () => {
    expect(surahNumberFromArabicName("البقرة")).toBe(2);
    expect(surahNumberFromArabicName("الناس")).toBe(114);
    expect(surahNumberFromArabicName("سورة البقرة")).toBeUndefined();
    expect(surahNumberFromArabicName("البقره")).toBeUndefined();
  });

  it("knows ayah counts", () => {
    expect(getSurahAyahCount(2)).toBe(286);
    expect(getSurahAyahCount(0)).toBeUndefined();
    expect(getSurahAyahCount(115)).toBeUndefined();
  });
});

describe("isValidQuranRef", () => {
  it("accepts single ayahs, ranges and excerpts within bounds", () => {
    expect(isValidQuranRef({ surah: 2, fromAyah: 255, toAyah: 255 })).toBe(true);
    expect(isValidQuranRef({ surah: 20, fromAyah: 25, toAyah: 26, excerpt: true })).toBe(true);
    expect(isValidQuranRef({ surah: 114, fromAyah: 1, toAyah: 6 })).toBe(true);
  });

  it("rejects anything out of range or malformed", () => {
    expect(isValidQuranRef(null)).toBe(false);
    expect(isValidQuranRef(undefined)).toBe(false);
    expect(isValidQuranRef("2:255")).toBe(false);
    expect(isValidQuranRef({ surah: 0, fromAyah: 1, toAyah: 1 })).toBe(false);
    expect(isValidQuranRef({ surah: 115, fromAyah: 1, toAyah: 1 })).toBe(false);
    expect(isValidQuranRef({ surah: 1, fromAyah: 0, toAyah: 1 })).toBe(false);
    expect(isValidQuranRef({ surah: 1, fromAyah: 1, toAyah: 8 })).toBe(false);
    expect(isValidQuranRef({ surah: 2, fromAyah: 10, toAyah: 9 })).toBe(false);
    expect(isValidQuranRef({ surah: 2, fromAyah: 1.5, toAyah: 2 })).toBe(false);
    expect(isValidQuranRef({ surah: "2", fromAyah: 1, toAyah: 1 })).toBe(false);
    expect(isValidQuranRef({ surah: 2, fromAyah: 1, toAyah: 1, excerpt: "yes" })).toBe(false);
  });

  it("formats a stable key", () => {
    expect(formatQuranRefKey({ surah: 2, fromAyah: 255, toAyah: 255 })).toBe("2:255");
    expect(formatQuranRefKey({ surah: 20, fromAyah: 25, toAyah: 26 })).toBe("20:25-26");
  });
});
