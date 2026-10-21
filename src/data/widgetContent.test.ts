import { beforeAll, describe, expect, it } from "vitest";
import { approveAllNewContentForTesting, defaultReviewStatus } from "../lib/contentReview";
import { isWidgetItem } from "../lib/widgetFeed";
import hadithApiWidgetDuas from "../lib/__fixtures__/hadith-api-widget-duas.json";
import { DHIKR_THEME_COMMENTS, DUA_CATEGORY_COMMENTS, ENRICHED_DUAS, ENRICHED_HADITHS, EXTRA_POOL_DUA_IDS, POEMS, inDefaultFeed, stripReflectionLabel } from "./widgetContent";
import type { EditorialComment } from "./widgetContent";
import { HADITHS } from "./hadith";
import { MISC_DUAS } from "./misc-library";
import { reminderPool } from "../lib/reminderContent";

// Content-safety guards for the widget/reminder enrichment. The wording of
// every added Hadith, dua and Qur'anic text was checked against its source
// when it was added (see the file's header); these tests keep the rules that
// make that safe from regressing.

beforeAll(() => approveAllNewContentForTesting());

const norm = (s: string) =>
  s
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const allComments: EditorialComment[] = [
  ...ENRICHED_HADITHS.flatMap((h) => h.comments),
  ...ENRICHED_DUAS.flatMap((d) => d.comments),
  ...POEMS.flatMap((p) => p.comments),
  ...Object.values(DUA_CATEGORY_COMMENTS).flat(),
  ...Object.values(DHIKR_THEME_COMMENTS).flat(),
];

describe("the default feed takes only reviewed content", () => {
  it("only source-checked entries are eligible — pending and disputed ones never are", () => {
    expect(inDefaultFeed({ status: "source-checked", checkedAgainst: "x", checkedOn: "2026-10-15" })).toBe(true);
    expect(inDefaultFeed({ status: "pending-review", checkedAgainst: "x", checkedOn: "2026-10-15" })).toBe(false);
    expect(inDefaultFeed({ status: "disputed", checkedAgainst: "x", checkedOn: "2026-10-15" })).toBe(false);
  });

  it("every addition records what it was checked against", () => {
    for (const entry of [...ENRICHED_HADITHS, ...ENRICHED_DUAS, ...POEMS]) {
      expect(entry.review.checkedAgainst.length, entry.id).toBeGreaterThan(10);
      expect(entry.review.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("no weak grading anywhere among the added Hadiths", () => {
    for (const h of ENRICHED_HADITHS) {
      expect(["صحيح", "صحيح متفق عليه", "حسن", "حسن صحيح"], h.id).toContain(h.gradeAr);
      expect(h.gradeAr + h.gradingSourceAr).not.toMatch(/ضعيف|موضوع|منكر/);
      expect(h.gradingSourceAr.length).toBeGreaterThan(0);
      expect(h.referenceAr).toMatch(/\d/);
    }
  });

  it("added Hadiths and duas don't duplicate what the libraries already have", () => {
    const hadithCorpus = HADITHS.map((h) => norm(h.textAr));
    for (const h of ENRICHED_HADITHS) {
      for (const quote of h.textAr.match(/«([^»]*)»/g) ?? []) {
        const q = norm(quote);
        if (q.length < 12) continue; // short phrases like «لا تغضب» are checked as whole texts below
        expect(hadithCorpus.some((c) => c.includes(q)), `${h.id}: ${quote}`).toBe(false);
      }
    }
    // Very short library phrases (e.g. «رب اغفر لي» between the prostrations) naturally occur inside longer duas.
    const duaCorpus = MISC_DUAS.map((d) => norm(d.text_ar)).filter((c) => c.length >= 20);
    for (const d of ENRICHED_DUAS) expect(duaCorpus.some((c) => c.includes(norm(d.textAr)) || norm(d.textAr).includes(c)), d.id).toBe(false);
  });

  it("the Prophet's ﷺ words are quoted whole: balanced «», and narrators outside them", () => {
    for (const h of ENRICHED_HADITHS) {
      expect((h.textAr.match(/«/g) ?? []).length, h.id).toBe((h.textAr.match(/»/g) ?? []).length);
      expect(h.textAr.startsWith("عن "), h.id).toBe(true);
    }
  });

  it("Qur'anic duas cite surah and ayah, Prophetic ones their collection", () => {
    for (const d of ENRICHED_DUAS) {
      if (d.kind === "quran") expect(d.sourceAr).toMatch(/^القرآن الكريم — سورة .+، الآية \d+$/);
      else expect(d.sourceAr).toMatch(/صحيح (مسلم|البخاري) \(\d+\)/);
    }
  });
});

describe("poetry is clearly poetry, with honest attribution", () => {
  it("uncertain attributions say so in both languages", () => {
    for (const p of POEMS) {
      if (p.attribution === "established") {
        expect(p.attributionAr, p.id).not.toMatch(/يُنسب/);
      } else {
        expect(p.attributionAr, p.id).toMatch(/يُنسب|نسبه/);
        expect(p.attributionEn, p.id).toMatch(/[Aa]ttributed/);
      }
    }
    expect(POEMS.some((p) => p.attribution === "disputed")).toBe(true);
  });

  it("is never attributed to the Prophet ﷺ, and its only religious evidence is a cited Hadith", () => {
    for (const p of POEMS) {
      expect(p.attributionAr).not.toMatch(/رسول الله|النبي|ﷺ/);
      if (p.evidence) expect(p.evidence.sourceAr).toMatch(/صحيح البخاري \d+/);
    }
  });

  it("enters the pool under its own category and label, never as a Hadith", () => {
    const poetry = reminderPool().filter((i) => i.category === "poetry");
    expect(poetry.length).toBe(POEMS.length);
    for (const item of poetry) {
      expect(item.kind).toBe("poetry");
      expect(item.id.startsWith("poetry:")).toBe(true);
    }
  });
});

describe("editorial comments", () => {
  it("have unique, stable ids", () => {
    const ids = allComments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("are short enough for a widget line or a notification, in both languages", () => {
    for (const c of allComments) {
      expect(c.ar.length, c.id).toBeLessThanOrEqual(110);
      expect(c.en.length, c.id).toBeLessThanOrEqual(150);
      expect(c.ar.trim()).toBe(c.ar);
    }
  });

  it("are never presented as narrations: no quotation marks and no attribution formulas", () => {
    for (const c of allComments) {
      for (const text of [c.ar, c.en]) {
        expect(text, c.id).not.toMatch(/[«»"“”]/);
        expect(text, c.id).not.toMatch(/قال رسول الله|قال النبي|يقول النبي|the Prophet ﷺ said|said the Prophet/);
      }
    }
  });

  it("vary: several per item, theme and dua category, in more than one style", () => {
    for (const entry of [...ENRICHED_HADITHS, ...ENRICHED_DUAS, ...POEMS]) {
      expect(entry.comments.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(new Set(entry.comments.map((c) => c.style)).size, entry.id).toBeGreaterThanOrEqual(2);
    }
    for (const [theme, list] of Object.entries(DHIKR_THEME_COMMENTS)) expect(list.length, theme).toBeGreaterThanOrEqual(3);
    for (const [group, list] of Object.entries(DUA_CATEGORY_COMMENTS)) {
      expect(list.length, group).toBeGreaterThanOrEqual(3);
      expect(new Set(list.map((c) => c.style)).size, group).toBeGreaterThanOrEqual(3);
    }
  });

  it("no longer follow every dua with the same generic line", () => {
    const duas = reminderPool().filter((i) => i.category === "dua");
    expect(duas.every((d) => d.comments.length >= 3)).toBe(true);
    const firstComments = new Set(duas.map((d) => d.comments[0].id));
    expect(firstComments.size).toBeGreaterThanOrEqual(10);
    for (const c of allComments) expect(c.ar).not.toContain("الدعاء صلة بينك وبين ربك");
  });

  it("the Hadith library's own reflection is reused without its label prefix", () => {
    expect(stripReflectionLabel("ومضة دِثار: نص", "ar")).toBe("نص");
    expect(stripReflectionLabel("DITHAR reflection: text", "en")).toBe("text");
    const item = reminderPool().find((i) => i.id === `hadith:${HADITHS[0].id}`)!;
    expect(item.comments[0].ar).not.toMatch(/^ومضة دِثار/);
  });
});

describe("the reminder pool is richer", () => {
  it("has more duas, more Hadiths, and a poetry category", () => {
    const pool = reminderPool();
    const count = (c: string) => pool.filter((i) => i.category === c).length;
    expect(count("dua")).toBeGreaterThanOrEqual(60);
    expect(count("hadith")).toBeGreaterThanOrEqual(230);
    expect(count("poetry")).toBeGreaterThanOrEqual(15);
    expect(new Set(pool.map((i) => i.id)).size).toBe(pool.length);
  });

  it("labels Qur'anic duas as Qur'an, distinct from other duas", () => {
    const pool = reminderPool();
    expect(pool.find((i) => i.id === "dua:q-23-118")?.kind).toBe("quran-dua");
    expect(pool.find((i) => i.id === "dua:muslim-2654")?.kind).toBe("dua");
  });
});

describe("the widget's added written duas (2026-10-19)", () => {
  // The narrations they are checked against, verbatim from the dataset (fixture: its source and date).
  const narrations = (hadithApiWidgetDuas as { narrations: { ref: string; text: string }[] }).narrations;
  const plain = (s: string) =>
    s
      .normalize("NFC")
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^ء-ي]+/g, " ")
      .trim();
  const narration = (ref: string) => plain(narrations.find((n) => n.ref === ref)!.text);
  const ADDED: Record<string, string> = {
    "allahumma-audhu-biridaka-min-sakhatik": "Sahih Muslim 486",
    "allahumma-inni-asaluka-fil-al-khayrat": "Jami' at-Tirmidhi 3233",
    "before-salam-audhu": "Sahih Muslim 588",
    "inna-lillahi-wa-inna-ilayhi-rajiun": "Sahih Muslim 918",
    "allahumma-inni-audhu-bika-an-adilla-aw-udall": "Sunan Abi Dawud 5094",
  };

  it("each is the cited narration's own words, letter for letter, with the library's source line kept", () => {
    for (const [id, ref] of Object.entries(ADDED)) {
      const dua = MISC_DUAS.find((d) => d.id === id)!;
      expect(narration(ref).includes(plain(dua.text_ar)), `${id} in ${ref}`).toBe(true);
      const item = reminderPool().find((i) => i.id === `dua:${id}`)!;
      expect(item.sourceAr, id).toBe(dua.source_ar);
      expect(item.textAr, id).toBe(dua.text_ar);
    }
  });

  it("each reaches the widget, in Arabic and in English", () => {
    for (const id of Object.keys(ADDED)) {
      const item = reminderPool().find((i) => i.id === `dua:${id}`)!;
      expect(isWidgetItem(item, "ar"), id).toBe(true);
      expect(isWidgetItem(item, "en"), id).toBe(true);
    }
  });

  it("the library dua that blends two narrations' wordings is kept off the widget", () => {
    expect(EXTRA_POOL_DUA_IDS).not.toContain("allahumma-rabb-al-nas-adhhib-al-bas");
    expect(reminderPool().some((i) => i.id === "dua:allahumma-rabb-al-nas-adhhib-al-bas")).toBe(false);
  });

  it("Bukhari 834 is its narration's words, sourced, linked, and enters the review queue as new content", () => {
    const d = ENRICHED_DUAS.find((e) => e.id === "bukhari-834")!;
    expect(narration("Sahih al-Bukhari 6326").includes(plain(d.textAr))).toBe(true);
    // Bukhari 834 itself, apart from the one character the dataset garbles at «ولا».
    expect(narration("Sahih al-Bukhari 834").replace(/ لا يغفر/, " ولا يغفر").includes(plain(d.textAr))).toBe(true);
    expect(d.sourceAr).toContain("834");
    expect(d.url).toBe("https://sunnah.com/bukhari/10/227");
    expect(defaultReviewStatus("dua:bukhari-834")).toBe("pending");
  });
});

describe("the written duas added 2026-10-20", () => {
  const narrations = (hadithApiWidgetDuas as { narrations: { ref: string; text: string }[] }).narrations;
  const QURAN = ["q-3-191", "q-10-85", "q-12-101", "q-17-80", "q-23-29", "q-25-65", "q-28-16", "q-60-5", "q-66-11"];
  const SUNNAH: Record<string, string> = { "muslim-2717": "Sahih Muslim 2717", "bukhari-6316": "Sahih al-Bukhari 6316" };
  const byId = (id: string) => ENRICHED_DUAS.find((d) => d.id === id)!;

  it("are all there, with their sources, and enter the review queue as new content (unpublished until approved)", () => {
    for (const id of [...QURAN, ...Object.keys(SUNNAH)]) {
      const d = byId(id);
      expect(d, id).toBeDefined();
      expect(d.review.checkedOn, id).toBe("2026-10-20");
      expect(d.sourceAr.length, id).toBeGreaterThan(10);
      expect(defaultReviewStatus(`dua:${id}`), id).toBe("pending");
    }
    for (const id of QURAN) expect(byId(id).kind, id).toBe("quran");
  });

  it("each Prophetic dua is its narration's own words, diacritics and all, from the cited collection and number", () => {
    for (const [id, ref] of Object.entries(SUNNAH)) {
      const narration = narrations.find((n) => n.ref === ref)!.text.replace(/[‎‏]/g, "");
      expect(narration.includes(byId(id).textAr), id).toBe(true);
      const number = ref.split(" ").pop()!;
      expect(byId(id).sourceAr, id).toContain(`(${number})`);
      expect(byId(id).sourceAr, id).toContain(ref.includes("Muslim") ? "صحيح مسلم" : "صحيح البخاري");
    }
  });
});
