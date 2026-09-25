import { describe, expect, it } from "vitest";
import {
  DEFAULT_QURAN_RECITER_ID,
  QURAN_RECITERS,
  getAvailableQuranReciters,
  getDefaultQuranReciter,
  getQuranReciterById,
} from "./quranReciters";

describe("Quran reciter registry", () => {
  it("has unique, stable-format ids", () => {
    const ids = QURAN_RECITERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("gives every reciter a bilingual name and a known style", () => {
    for (const r of QURAN_RECITERS) {
      expect(r.name.ar.trim()).not.toBe("");
      expect(r.name.en.trim()).not.toBe("");
      expect(["murattal", "mujawwad"]).toContain(r.style);
    }
  });

  it("has an existing, available default reciter", () => {
    expect(getQuranReciterById(DEFAULT_QURAN_RECITER_ID)).toBeDefined();
    expect(getDefaultQuranReciter().id).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(getDefaultQuranReciter().available).toBe(true);
  });

  it("lists only available reciters as selectable", () => {
    expect(getAvailableQuranReciters().every((r) => r.available)).toBe(true);
    expect(getAvailableQuranReciters().length).toBeGreaterThanOrEqual(2);
  });

  it("returns undefined for an unknown id", () => {
    expect(getQuranReciterById("no-such-reciter")).toBeUndefined();
  });

  // Phase 1: no audio hosting chosen yet — guards against a real
  // third-party URL slipping in before that decision is made.
  it("has no configured audio source yet (phase 1)", () => {
    for (const r of QURAN_RECITERS) expect(r.audio.kind).toBe("unconfigured");
  });
});
