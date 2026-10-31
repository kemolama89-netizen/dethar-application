// The duas imported 2026-10-23 (data/importedDuas.ts): each is its cited
// source's own words, with that source's published English, not already in
// the app, honestly graded, fit for the widget, and waiting for review.
import { describe, expect, it } from "vitest";
import fixture from "../lib/__fixtures__/masnun-import-2026-10-23.json";
import { IMPORTED_DUAS } from "./importedDuas";
import { ENRICHED_DUAS } from "./widgetContent";
import { MISC_DUAS } from "./misc-library";
import { HADITHS } from "./hadith";
import { WIDGET_VERSES } from "./widgetVerses";
import { defaultReviewStatus } from "../lib/contentReview";
import { reminderCandidates, reminderPool } from "../lib/reminderContent";
import { isWidgetItem } from "../lib/widgetFeed";

interface SourceEntry {
  id: string;
  ref: string;
  arabic: string;
  english: string;
  grades?: { name: string; grade: string }[];
}
const sources = new Map((fixture.entries as SourceEntry[]).map((e) => [e.id, e]));

const plain = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي]+/g, " ")
    .trim();
const flat = (s: string) => s.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();

describe("imported duas (2026-10-23)", () => {
  it("are 30 distinct entries whose ids don't collide with the app's own", () => {
    const ids = IMPORTED_DUAS.map((d) => d.id);
    expect(ids.length).toBe(30);
    expect(new Set(ids).size).toBe(ids.length);
    const existing = new Set([...ENRICHED_DUAS.map((d) => d.id), ...MISC_DUAS.map((d) => d.id)]);
    for (const id of ids) expect(existing.has(id), id).toBe(false);
  });

  it("each is its source's own words, diacritics and all (the Qur'an without waqf marks)", () => {
    for (const d of IMPORTED_DUAS) {
      const src = sources.get(d.id)!;
      expect(src, d.id).toBeDefined();
      const text = d.kind === "quran" ? src.arabic.replace(/[ۖ-ۭ]/g, "").replace(/\s+/g, " ") : src.arabic.replace(/[‎‏]/g, "");
      expect(text.includes(d.textAr), d.id).toBe(true);
    }
  });

  it("each English is the published translation of that same source, its words verbatim", () => {
    for (const d of IMPORTED_DUAS) {
      expect(flat(sources.get(d.id)!.english).includes(flat(d.meaningEn)), d.id).toBe(true);
      expect(d.translation.reviewed, d.id).toBe(false);
      expect(d.translation.source, d.id).toMatch(d.kind === "quran" ? /Saheeh International/ : /published/);
    }
  });

  it("nothing duplicates what the app already has, or each other", () => {
    const corpus = [
      ...MISC_DUAS.map((d) => d.text_ar),
      ...ENRICHED_DUAS.map((d) => d.textAr),
      ...WIDGET_VERSES.map((v) => v.textAr),
      ...HADITHS.map((h) => h.textAr),
    ]
      .map(plain)
      .filter((c) => c.split(" ").length >= 3);
    const mine = IMPORTED_DUAS.map((d) => plain(d.textAr));
    for (const [i, t] of mine.entries()) {
      expect(corpus.some((c) => c.includes(t) || t.includes(c)), IMPORTED_DUAS[i].id).toBe(false);
      expect(mine.filter((o) => o.includes(t) || t.includes(o)).length, IMPORTED_DUAS[i].id).toBe(1);
    }
  });

  it("cite their source; Sunan duas carry al-Albani's sahih/hasan grade and name any grader who differs", () => {
    for (const d of IMPORTED_DUAS) {
      if (d.kind === "quran") {
        expect(d.sourceAr).toMatch(/^القرآن الكريم — سورة .+، الآية \d+$/);
        expect(d.url).toMatch(/^https:\/\/quran\.com\/\d+\/\d+$/);
        continue;
      }
      expect(d.url).toMatch(/^https:\/\/sunnah\.com\/[a-z]+:\d+$/);
      expect(d.sourceAr).toMatch(/\(\d+\) — عن /);
      const grades = sources.get(d.id)!.grades ?? [];
      if (d.id.startsWith("muslim-")) {
        expect(d.sourceAr).toMatch(/^صحيح مسلم/);
        continue;
      }
      const albani = grades.find((g) => g.name === "Al-Albani")!;
      expect(albani.grade, d.id).toMatch(/^(Sahih|Hasan)/);
      expect(d.sourceAr, d.id).toContain("الألباني");
      if (grades.some((g) => g.grade === "Daif")) expect(d.sourceAr, d.id).toContain("ضعّفه زبير علي زئي");
    }
  });

  it("all fit the widget in both languages, and enter the review queue unpublished", () => {
    const candidates = new Map(reminderCandidates().map((i) => [i.id, i]));
    const published = new Set(reminderPool().map((i) => i.id));
    for (const d of IMPORTED_DUAS) {
      const item = candidates.get(`dua:${d.id}`)!;
      expect(item, d.id).toBeDefined();
      expect(isWidgetItem(item, "ar"), d.id).toBe(true);
      expect(isWidgetItem(item, "en"), d.id).toBe(true);
      expect(item.comments.length, d.id).toBeGreaterThanOrEqual(3);
      expect(defaultReviewStatus(`dua:${d.id}`), d.id).toBe("pending");
      expect(published.has(`dua:${d.id}`), d.id).toBe(false);
    }
  });

  it("bring the widget's dua library to between 100 and 150 entries", () => {
    const duas = reminderCandidates().filter((i) => i.category === "dua");
    const widget = duas.filter((i) => isWidgetItem(i, "ar") && isWidgetItem(i, "en"));
    expect(widget.length).toBeGreaterThanOrEqual(100);
    expect(widget.length).toBeLessThanOrEqual(150);
  });
});
