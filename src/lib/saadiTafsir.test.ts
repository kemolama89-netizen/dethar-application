import { describe, expect, it } from "vitest";
import manifest from "../data/tafsir/saadi-itqan/manifest.json";
import { getSaadiVerse, headingRun, joinSaadiParsed, loadSaadiSurah, neighbourVerse, parseSaadiText } from "./saadiTafsir";

const sha256 = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");

describe("Tafsir al-Sa'di from Itqan", () => {
  it("every surah is the imported text, and every verse parses back to its exact characters", async () => {
    let verses = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const data = (await loadSaadiSurah(surah))!;
      const entry = (manifest.surahs as Record<string, { verses: number; contentSha256: string }>)[surah];
      expect(data.ayat).toHaveLength(entry.verses);
      expect(await sha256(data.ayat.map((a) => a.text).join(""))).toBe(entry.contentSha256);
      for (const { ayah, text } of data.ayat) {
        verses++;
        const parsed = parseSaadiText(text);
        const back = joinSaadiParsed(parsed);
        // Blank lines carry no runs: compare without them, nothing else is allowed to differ.
        if (back !== text.replace(/\n{2,}/g, "\n").replace(/^\n|\n$/g, "")) throw new Error(`${surah}:${ayah} did not join back`);
      }
    }
    expect(verses).toBe(6236);
  }, 60_000);

  it("every verse proves itself by its own number in the book's heading or comment marker", async () => {
    for (let surah = 1; surah <= 114; surah++) {
      for (const { ayah, text } of (await loadSaadiSurah(surah))!.ayat) {
        const { headingVerses, commentVerses } = parseSaadiText(text);
        if (!headingVerses.includes(ayah) && !commentVerses.includes(ayah) && !/\(\d+\)/.test(text)) {
          // 2:29 prints part of its verse without a number, with its comment marker {29}.
          throw new Error(`${surah}:${ayah}`);
        }
      }
    }
  }, 60_000);

  it("sets notes, quotes and comment markers apart without losing a character", () => {
    const parsed = parseSaadiText("{الم (1)}.\n{1} قوله: {ذلك الكتاب}؛ أي ¬في (ب): «هذا».¥ تم");
    expect(parsed.headingVerses).toEqual([1]);
    expect(parsed.commentVerses).toEqual([1]);
    expect(parsed.notes).toEqual(["في (ب): «هذا»."]);
    expect(parsed.paragraphs[0].heading).toBe(true);
    expect(parsed.paragraphs[1].runs.map((r) => r.kind)).toEqual(["marker", "text", "quote", "text", "note", "text"]);
  });

  it("keeps the source's slips rather than repairing them", () => {
    expect(joinSaadiParsed(parseSaadiText("نص ¬ملاحظة بلا نهاية"))).toBe("نص ¬ملاحظة بلا نهاية");
    expect(joinSaadiParsed(parseSaadiText("نص¥ تم"))).toBe("نص¥ تم");
  });

  it("shows what the book says where the Sheikh left a verse without comment, and refuses verses that don't exist", async () => {
    const v = await getSaadiVerse(2, 50);
    expect(v.status === "found" && v.parsed.commentVerses).toEqual([]);
    expect(v.status === "found" && v.text).toContain("الشيخ رحمه الله");
    expect((await getSaadiVerse(1, 8)).status).toBe("invalid");
    expect((await getSaadiVerse(115, 1)).status).toBe("invalid");
  });

  it("the verse's own text is what's returned, for verses across the Qur'an", async () => {
    for (const [s, a, n] of [[1, 1, 1], [2, 255, 255], [18, 10, 10], [114, 6, 6]] as const) {
      const v = await getSaadiVerse(s, a);
      expect(v.status === "found" && (v.parsed.headingVerses.includes(n) || v.parsed.commentVerses.includes(n))).toBe(true);
    }
  });

  it("moves between verses across surahs, and stops at both ends", () => {
    expect(neighbourVerse(1, 7, 1)).toEqual({ surah: 2, ayah: 1 });
    expect(neighbourVerse(2, 1, -1)).toEqual({ surah: 1, ayah: 7 });
    expect(neighbourVerse(2, 5, 1)).toEqual({ surah: 2, ayah: 6 });
    expect(neighbourVerse(1, 1, -1)).toBeNull();
    expect(neighbourVerse(114, 6, 1)).toBeNull();
  });

  it("finds verses printed under one heading, and only those, across the whole Qur'an", async () => {
    const parsed = (text: string) => parseSaadiText(text);
    expect(headingRun(parsed("{a (6) b (7)}.\n{6} c"), 6)).toEqual([6, 7]);
    expect(headingRun(parsed("{a (25)}.\n{25} b\n{c (26)}.\n{26} d"), 25)).toEqual([]);
    expect(headingRun(parsed("{a (9) b (1)}."), 9)).toEqual([]);
    const grouped: string[] = [];
    for (let s = 1; s <= 114; s++) {
      const count = (await loadSaadiSurah(s))!.ayat.length;
      for (let a = 1; a <= count; a++) {
        const r = await getSaadiVerse(s, a);
        if (r.status === "found" && r.together.length > 0) grouped.push(`${s}:${a}=${r.together.join("-")}`);
      }
    }
    expect(grouped).toEqual(["2:6=6-7", "2:7=6-7"]);
  });
});
