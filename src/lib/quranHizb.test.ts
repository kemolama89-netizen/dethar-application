// Hizb and quarter-hizb data (Tanzil's "HizbQaurter" list, in quranMeta.ts),
// checked against an independent source — Quran.com's first verse of each of
// the 240 quarters (fixture: quran-com-rub-el-hizb.json, fetched 2026-10-19).
import { describe, expect, it } from "vitest";
import quranCom from "./__fixtures__/quran-com-rub-el-hizb.json";
import { JUZ_STARTS, QUARTER_STARTS, TOTAL_PAGES, hizbOf, juzOf, pageOf, quarterStartsOnPage } from "./quranMeta";

const qc = (quranCom as unknown as { quarters: { rub: number; start: [number, number]; hizb: number; juz: number }[] }).quarters;

describe("hizb and quarter-hizb data", () => {
  it("has 240 quarters (60 hizbs), in order, matching Quran.com everywhere except one verse of quarter 106", () => {
    expect(QUARTER_STARTS).toHaveLength(240);
    expect(qc).toHaveLength(240);
    const differing = QUARTER_STARTS.map((start, i) => ({ q: i + 1, tanzil: start.join(":"), quranCom: qc[i].start.join(":") })).filter((d) => d.tanzil !== d.quranCom);
    expect(differing).toEqual([{ q: 106, tanzil: "15:50", quranCom: "15:49" }]);
    // That one difference never changes what is shown: both verses are on the same page.
    expect(pageOf(15, 49)).toBe(pageOf(15, 50));
    for (const q of qc) {
      expect(hizbOf(q.start[0], q.start[1]), `quarter ${q.rub}`).toBe(q.hizb);
      expect(juzOf(q.start[0], q.start[1]), `quarter ${q.rub}`).toBe(q.juz);
    }
  });

  it("every juz begins with a hizb, two hizbs to a juz", () => {
    JUZ_STARTS.forEach(([s, a], j) => expect(QUARTER_STARTS[j * 8]).toEqual([s, a]));
  });

  it("each quarter's marker appears on exactly one page, and pages show them in order", () => {
    const seen: number[] = [];
    for (let p = 1; p <= TOTAL_PAGES; p++) seen.push(...quarterStartsOnPage(p).map((m) => m.quarter));
    expect(seen).toEqual(Array.from({ length: 240 }, (_, i) => i + 1));
  });

  it("pages 1, 2, a middle page and 604", () => {
    expect(quarterStartsOnPage(1)).toEqual([{ quarter: 1, hizb: 1, part: 0 }]);
    expect(quarterStartsOnPage(2)).toEqual([]);
    expect([juzOf(2, 1), hizbOf(2, 1)]).toEqual([1, 1]);
    // Page 264 (al-Hijr): «نبئ عبادي…» — quarter 106, the ¼ of hizb 27 (quarters 105–108).
    expect(quarterStartsOnPage(264)).toEqual([{ quarter: 106, hizb: 27, part: 1 }]);
    expect([juzOf(15, 49), hizbOf(15, 49)]).toEqual([14, 27]);
    expect(quarterStartsOnPage(604)).toEqual([]);
    expect([juzOf(114, 6), hizbOf(114, 6)]).toEqual([30, 60]);
  });
});
