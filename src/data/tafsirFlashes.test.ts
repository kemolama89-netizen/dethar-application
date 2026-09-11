// Data-integrity coverage for the converted DITHAR_373_Tafsir_Flashes_v14
// content (see tafsirFlashes.ts's own doc comment) — this is what
// programmatically enforces the conversion's hard requirements: exactly
// 373 records, ids 1..373 with no gaps or duplicates, and no record
// missing any of its required fields.
import { describe, expect, it } from "vitest";
import { tafsirFlashes } from "./tafsirFlashes";

describe("tafsirFlashes", () => {
  it("contains exactly 373 records", () => {
    expect(tafsirFlashes).toHaveLength(373);
  });

  it("has ids exactly 1..373 with no gaps or duplicates", () => {
    const ids = tafsirFlashes.map((flash) => flash.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 373 }, (_, i) => i + 1));
  });

  it("has no duplicate ids", () => {
    const ids = tafsirFlashes.map((flash) => flash.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a non-empty arabic field on every record", () => {
    const empty = tafsirFlashes.filter((flash) => !flash.arabic.trim());
    expect(empty).toEqual([]);
  });

  it("has a non-empty english field on every record", () => {
    const empty = tafsirFlashes.filter((flash) => !flash.english.trim());
    expect(empty).toEqual([]);
  });

  it("has a non-empty source field on every record", () => {
    const empty = tafsirFlashes.filter((flash) => !flash.source.trim());
    expect(empty).toEqual([]);
  });
});
