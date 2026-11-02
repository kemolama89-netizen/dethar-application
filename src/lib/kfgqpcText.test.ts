import { describe, expect, it } from "vitest";
import pagesFile from "../data/quran/kfqc-hafs-1441-pages.json";
import tanzilText from "../data/quran/tanzil-quran-uthmani.txt?raw";
import textFile from "../data/quran/kfgqpc-hafs-text.json?raw";
import { loadKfgqpcText } from "./kfgqpcText";
import { pageVerses } from "./quranMeta";

const sha256 = async (bytes: BufferSource) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
const pageStarts = (pagesFile as unknown as { pageStarts: [number, number][] }).pageStarts;

const skeleton = (text: string) =>
  [...text.replace(/[ﭐ-﷿ﹰ-﻿]/g, "").normalize("NFKC").replace(/[^ء-ي]/g, "").replace(/[ء-اةوىيـ]/g, "")].join("").replace(/ل+/g, "ل");

describe("the Complex's Uthmanic text", () => {
  it("is the imported text, byte for byte, and the font file is the Complex's", async () => {
    expect(await sha256(new TextEncoder().encode(textFile))).toBe("4607a10e64794c70498e6072f9ebad90727bb4ff4385b6a18d1d734a3370a3bd");
    const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as { readFileSync: (path: string) => Uint8Array<ArrayBuffer> };
    expect(await sha256(fs.readFileSync("src/assets/fonts/kfgqpc-hafs/uthmanic_hafs_v20.ttf"))).toBe("d560bbbc7a90a4f4d416d206a5ac48bd8a1ad00273d64d232f16ca54941bd041");
  });

  it("has every verse, and each verse's consonants equal Tanzil's", async () => {
    const verses = (await loadKfgqpcText())!;
    const tanzil = new Map(
      tanzilText
        .split("\n")
        .map((l) => l.split("|"))
        .filter((p) => p.length === 3 && /^\d+$/.test(p[0]))
        .map((p) => [`${p[0]}:${p[1]}`, p[2]] as const),
    );
    expect(verses).toHaveLength(6236);
    const basmala = skeleton(verses[0].words);
    for (const v of verses) {
      let target = skeleton(tanzil.get(`${v.surah}:${v.ayah}`)!);
      if (v.ayah === 1 && v.surah !== 1 && v.surah !== 9 && target.startsWith(basmala)) target = target.slice(basmala.length);
      if (skeleton(v.words) !== target) throw new Error(`differs at ${v.surah}:${v.ayah}`);
    }
  });

  it("keeps the verse-number glyph apart from the words", async () => {
    for (const v of (await loadKfgqpcText())!) {
      expect([...v.mark]).toHaveLength(1);
      expect(v.mark.codePointAt(0)!).toBeGreaterThanOrEqual(0xfb50);
      expect(/[ﭐ-﷿ﹰ-﻿]/.test(v.words)).toBe(false);
    }
  });

  it("every page starts on the verse the reader's 1441H page starts on", async () => {
    const verses = (await loadKfgqpcText())!;
    const first = new Map<number, [number, number]>();
    for (const v of verses) if (!first.has(v.page)) first.set(v.page, [v.surah, v.ayah]);
    expect(pageStarts.map((_, i) => first.get(i + 1))).toEqual(pageStarts);
  });

  it("every one of the 604 pages holds exactly the verses of the reader's printed page", async () => {
    const verses = (await loadKfgqpcText())!;
    for (let page = 1; page <= 604; page++) {
      expect(verses.filter((v) => v.page === page).map((v) => [v.surah, v.ayah])).toEqual(pageVerses(page).map(([s, a]) => [s, a]));
    }
  });
});
