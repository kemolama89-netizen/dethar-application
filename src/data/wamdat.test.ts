import { describe, expect, it } from "vitest";
import { WAMDAT, getWamdaVerseReference, getWamdaVerseText } from "./wamdat";

// Structural invariants for the Wamdat dataset (source:
// DITHAR_Wamdat_524_Bilingual_Source_Aligned.ts, with a content-cleanup
// pass on top — see the header comment in ./wamdat.ts for exactly what
// changed). Entries 46 and 405 were removed entirely (both had no usable
// reflection), so the dataset holds 522 entries with two intentional
// gaps in the original 1..524 id range — ids are NOT renumbered.
const ARABIC_RE = /[؀-ۿ]/;
const REMOVED_IDS = [46, 405];
const RESTORED_IDS = [5, 9, 34, 117, 190, 215, 271, 284, 298];

describe("WAMDAT", () => {
  it("has exactly 522 entries", () => {
    expect(WAMDAT).toHaveLength(522);
  });

  it("has unique, ascending ids spanning 1..524 with only the two removed ids missing", () => {
    const ids = WAMDAT.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(524);
    for (const removed of REMOVED_IDS) {
      expect(ids).not.toContain(removed);
    }
  });

  it("no longer contains entries 46 or 405", () => {
    for (const removed of REMOVED_IDS) {
      expect(WAMDAT.find((e) => e.id === removed)).toBeUndefined();
    }
  });

  it("has no empty surah/ayah/source/insightAr/insightEn fields", () => {
    const emptySurah = WAMDAT.filter((e) => !e.surah.trim());
    const emptyAyah = WAMDAT.filter((e) => !e.ayah.trim());
    const emptySource = WAMDAT.filter((e) => !e.source.trim());
    const emptyAr = WAMDAT.filter((e) => !e.insightAr.trim());
    const emptyEn = WAMDAT.filter((e) => !e.insightEn.trim());
    expect(emptySurah.map((e) => e.id)).toEqual([]);
    expect(emptyAyah.map((e) => e.id)).toEqual([]);
    expect(emptySource.map((e) => e.id)).toEqual([]);
    expect(emptyAr.map((e) => e.id)).toEqual([]);
    expect(emptyEn.map((e) => e.id)).toEqual([]);
  });

  it("never contains Arabic script in insightEn", () => {
    const offenders = WAMDAT.filter((e) => ARABIC_RE.test(e.insightEn)).map((e) => e.id);
    expect(offenders).toEqual([]);
  });

  it("has properly terminated insightAr for the entries restored from truncation", () => {
    for (const id of RESTORED_IDS) {
      const entry = WAMDAT.find((e) => e.id === id)!;
      expect(entry.insightAr.trim()).toMatch(/[.؛]$/);
    }
  });

  it("derives a non-empty verse reference for every entry", () => {
    for (const entry of WAMDAT) {
      expect(getWamdaVerseReference(entry)).toContain(entry.surah);
      expect(getWamdaVerseText(entry).length).toBeGreaterThan(0);
    }
  });

  it("derives the ayah number into the reference when present in the source", () => {
    const withNumber = WAMDAT.find((e) => e.id === 3)!;
    expect(getWamdaVerseReference(withNumber)).toBe("سورة البقرة – الآية 186");

    const withoutNumber = WAMDAT.find((e) => e.id === 1)!;
    expect(getWamdaVerseReference(withoutNumber)).toBe("سورة الفاتحة");
  });

  it("strips the {} wrapper from the derived verse text", () => {
    for (const entry of WAMDAT) {
      const verse = getWamdaVerseText(entry);
      expect(verse.startsWith("{")).toBe(false);
      expect(verse.endsWith("}")).toBe(false);
    }
  });
});
