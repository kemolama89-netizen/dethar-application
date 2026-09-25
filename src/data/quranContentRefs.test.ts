// Every piece of Quranic content that may play Quran audio must carry a
// valid, source-established QuranRef — and nothing else may.
import { describe, expect, it } from "vitest";
import { isValidQuranRef } from "../lib/quranRef";
import { resolveQuranAudio } from "../lib/quranAudio";
import { getDefaultQuranReciter } from "./quranReciters";
import { surahNumberFromArabicName } from "./quranSurahs";
import { WAMDAT, getWamdaQuranRef } from "./wamdat";
import { writtenAdhkarItems } from "./written-adhkar";
import { MISC_DUAS } from "./misc-library";
import { insightCardContent } from "./content";

// The only Wamdat entries whose source gives no ayah number (both
// al-Fatihah, verse text only). Left unresolved on purpose — see report.
const WAMDA_UNRESOLVED_IDS = [1, 2];

describe("Wamdat Quran refs", () => {
  it("resolves every entry except the known unresolved ones", () => {
    const unresolved = WAMDAT.filter((e) => getWamdaQuranRef(e) === null).map((e) => e.id);
    expect(unresolved).toEqual(WAMDA_UNRESOLVED_IDS);
  });

  it("only produces valid refs whose surah matches the entry's own surah name", () => {
    for (const entry of WAMDAT) {
      const ref = getWamdaQuranRef(entry);
      if (!ref) continue;
      expect(isValidQuranRef(ref)).toBe(true);
      expect(ref.surah).toBe(surahNumberFromArabicName(entry.surah));
    }
  });

  it("parses single ayahs, ranges and the repeated-surah marker", () => {
    const byId = (id: number) => getWamdaQuranRef(WAMDAT.find((e) => e.id === id)!);
    expect(byId(3)).toEqual({ surah: 2, fromAyah: 186, toAyah: 186 });
    expect(byId(183)).toEqual({ surah: 3, fromAyah: 124, toAyah: 124 });
    const range = WAMDAT.find((e) => /\[الآية\s*\d+\s*-\s*\d+\]$/.test(e.ayah))!;
    const [, from, to] = range.ayah.match(/\[الآية\s*(\d+)\s*-\s*(\d+)\]$/)!;
    expect(getWamdaQuranRef(range)).toMatchObject({ fromAyah: Number(from), toAyah: Number(to) });
  });

  it("rejects markers that contradict the entry or run past the surah", () => {
    const base = WAMDAT.find((e) => e.id === 183)!;
    expect(getWamdaQuranRef({ ...base, ayah: "{…} [الآية 124 - البقرة]" })).toBeNull();
    expect(getWamdaQuranRef({ ...base, ayah: "{…} [الآية 201]" })).toBeNull();
    expect(getWamdaQuranRef({ ...base, ayah: "{…} [الآية 5-3]" })).toBeNull();
    expect(getWamdaQuranRef({ ...base, surah: "سورة آل عمران" })).toBeNull();
  });
});

describe("Written adhkar Quran refs", () => {
  const QURANIC = {
    morning_001: "2:255",
    morning_002: "112:1-4",
    morning_002b: "113:1-5",
    morning_002c: "114:1-6",
    prayer_006: "2:255",
    prayer_005: "112:1-4",
    prayer_005b: "113:1-5",
    prayer_005c: "114:1-6",
  } as Record<string, string>;

  it("gives exactly the Quranic cards a ref, in every category they appear", () => {
    for (const [category, items] of Object.entries(writtenAdhkarItems)) {
      for (const item of items) {
        const expected = QURANIC[item.id];
        if (!expected) {
          expect(item.quranRef, `${category}/${item.id}`).toBeUndefined();
          continue;
        }
        const ref = item.quranRef!;
        expect(isValidQuranRef(ref)).toBe(true);
        const key = ref.fromAyah === ref.toAyah ? `${ref.surah}:${ref.fromAyah}` : `${ref.surah}:${ref.fromAyah}-${ref.toAyah}`;
        expect(key, `${category}/${item.id}`).toBe(expected);
      }
    }
    const evening = writtenAdhkarItems.evening.map((i) => i.id);
    expect(evening).toEqual(expect.arrayContaining(["morning_001", "morning_002", "morning_002b", "morning_002c"]));
  });
});

describe("Misc library Quran refs", () => {
  const SOURCE_RE = /^القرآن الكريم — سورة (.+?)، الآي(?:ة|تان) (\d+)(?:\s*[–-]\s*(\d+))?$/;

  it("gives every Quranic dua a ref that matches its own stated source", () => {
    const quranic = MISC_DUAS.filter((d) => d.isQuranic);
    expect(quranic.length).toBe(21);
    for (const dua of quranic) {
      const ref = dua.quranRef;
      expect(ref, dua.id).toBeDefined();
      expect(isValidQuranRef(ref)).toBe(true);
      const m = dua.source_ar?.match(SOURCE_RE);
      expect(m, dua.id).not.toBeNull();
      expect(ref!.surah, dua.id).toBe(surahNumberFromArabicName(m![1]));
      expect(ref!.fromAyah, dua.id).toBe(Number(m![2]));
      expect(ref!.toAyah, dua.id).toBe(Number(m![3] ?? m![2]));
    }
  });

  it("never gives a hadith dua a ref, even one quoting Quranic wording", () => {
    for (const dua of MISC_DUAS.filter((d) => !d.isQuranic)) expect(dua.quranRef, dua.id).toBeUndefined();
  });
});

describe("Home Quranic insight content", () => {
  it("carries the 13:28 ref its citation states", () => {
    expect(insightCardContent.quranRef).toEqual({ surah: 13, fromAyah: 28, toAyah: 28, excerpt: true });
  });
});

describe("content without a ref", () => {
  it("is never silently mapped to an ayah by the resolver", () => {
    const fatiha = WAMDAT.find((e) => e.id === 1)!;
    const nonQuranic = writtenAdhkarItems.morning.find((i) => !i.quranRef)!;
    for (const ref of [getWamdaQuranRef(fatiha), nonQuranic.quranRef]) {
      expect(resolveQuranAudio(ref, getDefaultQuranReciter()).status).toBe("invalid-ref");
    }
  });
});
