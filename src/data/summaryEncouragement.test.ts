// The end-of-day summary's encouragement library: grounded messages carry a verified source
// and quote only what that source says; DITHAR's own wording makes no religious claim.
import { describe, expect, it } from "vitest";
import { SUMMARY_ENCOURAGEMENT, SUMMARY_ENCOURAGEMENT_APPROVAL, encouragementCredit } from "./summaryEncouragement";
import type { EncouragementSituation } from "./summaryEncouragement";
import { nativeEncouragements } from "../lib/dailySummary";

const SITUATIONS: EncouragementSituation[] = ["any", "morningEvening", "wird", "prayer", "tasbeeh", "written", "week", "listening", "empty"];
/** Letters only: vowel marks, tatweel, punctuation and alif forms aside, as the sources are compared. */
const letters = (s: string) =>
  s
    .replace(/[ً-ْٰـۖ-ۭ]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("the library", () => {
  it("has unique ids and texts, both languages, and known situations", () => {
    const ids = SUMMARY_ENCOURAGEMENT.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(SUMMARY_ENCOURAGEMENT.map((e) => e.ar)).size).toBe(ids.length);
    for (const e of SUMMARY_ENCOURAGEMENT) {
      expect(e.ar.trim(), e.id).not.toBe("");
      expect(e.en.trim(), e.id).not.toBe("");
      expect(e.situations.length, e.id).toBeGreaterThan(0);
      for (const s of e.situations) expect(SITUATIONS, e.id).toContain(s);
    }
  });

  it("gives every situation several messages, so they can rotate", () => {
    for (const s of SITUATIONS) {
      const n = SUMMARY_ENCOURAGEMENT.filter((e) => e.situations.includes(s)).length;
      expect(n, s).toBeGreaterThanOrEqual(s === "any" ? 8 : 3);
    }
  });

  it("grounded messages cite only the Qur'an, Sahih al-Bukhari or Sahih Muslim, with the source opened recorded", () => {
    const grounded = SUMMARY_ENCOURAGEMENT.filter((e) => e.kind === "grounded");
    expect(grounded.length).toBeGreaterThanOrEqual(15);
    for (const e of grounded) {
      expect(e.source, e.id).toBeDefined();
      expect(e.verified?.sourceText.trim(), e.id).toBeTruthy();
      expect(e.verified!.url, e.id).toMatch(/^https:\/\/(api\.alquran\.cloud\/v1\/quran\/quran-simple|cdn\.jsdelivr\.net\/gh\/fawazahmed0\/hadith-api@1\/editions\/ara-(bukhari|muslim)\.json)$/);
      expect(e.verified!.on, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (e.source!.kind === "hadith") for (const r of [e.source!, ...(e.source!.alsoIn ?? [])]) expect(["bukhari", "muslim"]).toContain(r.book);
    }
  });

  it("quotes («») only words that are verbatim in the recorded source text", () => {
    for (const e of SUMMARY_ENCOURAGEMENT) {
      const quotes = [...e.ar.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
      if (e.kind === "original") expect(quotes, e.id).toEqual([]);
      for (const q of quotes) expect(letters(e.verified!.sourceText), `${e.id}: «${q}»`).toContain(letters(q));
    }
  });

  it("names the Prophet ﷺ only in grounded messages, and only as reporting a cited hadith", () => {
    for (const e of SUMMARY_ENCOURAGEMENT) {
      const mentions = /النبي|ﷺ|Prophet/.test(e.ar + e.en);
      if (mentions) expect(e.kind === "grounded" && e.source?.kind === "hadith", e.id).toBe(true);
    }
  });

  it("DITHAR's own wording makes no religious claim: no source, no attribution, no promised reward", () => {
    const claim = /القرآن|الحديث|النبي|ﷺ|قال الله|أجر|ثواب|الجنة|مغفرة|يغفر|Qur'an|hadith|Prophet|reward|Paradise|forgive/i;
    for (const e of SUMMARY_ENCOURAGEMENT.filter((x) => x.kind === "original")) {
      expect(e.source, e.id).toBeUndefined();
      expect(e.verified, e.id).toBeUndefined();
      expect(claim.test(e.ar) || claim.test(e.en), e.id).toBe(false);
    }
  });

  it("puts no pressure or guilt on an empty day", () => {
    const pressure = /يجب|لازم|قصّرت|تقصير|خسرت|must|should have|failed|guilt/i;
    for (const e of SUMMARY_ENCOURAGEMENT.filter((x) => x.situations.includes("empty"))) expect(pressure.test(e.ar) || pressure.test(e.en), e.id).toBe(false);
  });
});

describe("approval", () => {
  it("shows exactly the 36 approved messages (18 grounded, 18 original): any change needs a new check and approval", () => {
    expect(SUMMARY_ENCOURAGEMENT.map((e) => e.id)).toEqual([...SUMMARY_ENCOURAGEMENT_APPROVAL.ids]);
    expect(SUMMARY_ENCOURAGEMENT.filter((e) => e.kind === "grounded")).toHaveLength(18);
    expect(SUMMARY_ENCOURAGEMENT.filter((e) => e.kind === "original")).toHaveLength(18);
  });

  it("keeps each approved message's wording and credit as checked", () => {
    // The verified texts are pinned: an edit to a message or its source shows up here.
    const pinned = SUMMARY_ENCOURAGEMENT.map((e) => [e.id, e.ar, e.en, e.source ? encouragementCredit(e.source, "ar") : null]);
    expect(pinned).toMatchSnapshot();
  });
});

describe("credits", () => {
  it("reads «مستفاد من» with the reference, in each language", () => {
    expect(encouragementCredit({ kind: "quran", surah: 2, ayah: 152 }, "ar")).toBe("مستفاد من: سورة البقرة، الآية 152");
    expect(encouragementCredit({ kind: "quran", surah: 2, ayah: 152 }, "en")).toBe("Drawn from: Qur'an 2:152");
    expect(encouragementCredit({ kind: "hadith", book: "muslim", number: 2694, alsoIn: [{ book: "bukhari", number: 6406 }] }, "ar")).toBe("مستفاد من: صحيح مسلم 2694، صحيح البخاري 6406");
    expect(encouragementCredit({ kind: "hadith", book: "bukhari", number: 6407 }, "en")).toBe("Drawn from: Sahih al-Bukhari 6407");
  });

  it("every cited surah has its Arabic name", () => {
    for (const e of SUMMARY_ENCOURAGEMENT) if (e.source?.kind === "quran") expect(encouragementCredit(e.source, "ar"), e.id).not.toMatch(/سورة \d/);
  });

  it("native gets the text in the interface language, a credit only for grounded messages", () => {
    for (const language of ["ar", "en"] as const) {
      const pushed = nativeEncouragements(language);
      expect(pushed).toHaveLength(SUMMARY_ENCOURAGEMENT.length);
      for (const [i, n] of pushed.entries()) {
        const e = SUMMARY_ENCOURAGEMENT[i];
        expect(n.text).toBe(language === "en" ? e.en : e.ar);
        expect(Boolean(n.credit)).toBe(e.kind === "grounded");
        expect(n.situations).toEqual(e.situations);
      }
    }
  });
});
