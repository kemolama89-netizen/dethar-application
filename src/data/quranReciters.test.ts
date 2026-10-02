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

  // The ten reciters and the EveryAyah folders their bundled files were
  // copied from — each folder verified against everyayah.com/data/recitations.js
  // (Hafs; 128 kbps where EveryAyah has it, otherwise 192 kbps — except
  // Al-Banna and Mustafa Ismail, whose only EveryAyah folders are 32/48 kbps).
  it("bundles exactly the ten chosen reciters, in order, each from its verified EveryAyah folder", () => {
    const audio = (r: (typeof QURAN_RECITERS)[number]) => (r.audio.kind === "bundled" ? [r.audio.everyAyahFolder, r.audio.basmala] : null);
    expect(QURAN_RECITERS.map((r) => [r.id, r.style, ...audio(r)!])).toEqual([
      ["abdulbasit-murattal", "murattal", "Abdul_Basit_Murattal_192kbps", { kind: "separate", source: "1:1" }],
      ["minshawi-murattal", "murattal", "Minshawy_Murattal_128kbps", { kind: "separate", source: "1:1" }],
      ["husary-murattal", "murattal", "Husary_128kbps", { kind: "separate", source: "1:1" }],
      ["alafasy-murattal", "murattal", "Alafasy_128kbps", { kind: "separate", source: "1:1" }],
      ["sudais-murattal", "murattal", "Abdurrahmaan_As-Sudais_192kbps", { kind: "none" }],
      ["muaiqly-murattal", "murattal", "MaherAlMuaiqly128kbps", { kind: "separate", source: "27:30", from: 3.739 }],
      ["dosari-murattal", "murattal", "Yasser_Ad-Dussary_128kbps", { kind: "separate", source: "27:30", from: 5.429 }],
      ["qatami-murattal", "murattal", "Nasser_Alqatami_128kbps", { kind: "separate", source: "27:30", from: 5.204 }],
      ["banna-murattal", "murattal", "mahmoud_ali_al_banna_32kbps", { kind: "in-first-ayah", ayahStartsAt: { 112: 5.02, 113: 5.26, 114: 5.36 } }],
      ["mustafaismail-mujawwad", "mujawwad", "Mustafa_Ismail_48kbps", { kind: "in-first-ayah", ayahStartsAt: { 112: 6.58, 113: 7.08, 114: 6.78 } }],
    ]);
    expect(getAvailableQuranReciters()).toHaveLength(10);
  });

  it("keeps the existing persisted reciter ids", () => {
    for (const id of ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal"]) expect(getQuranReciterById(id)?.available, id).toBe(true);
  });
});
