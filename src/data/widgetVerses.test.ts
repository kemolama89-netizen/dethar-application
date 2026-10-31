import { describe, expect, it } from "vitest";
import { WIDGET_VERSES } from "./widgetVerses";
import { widgetTextProblem } from "../lib/widgetFeed";
import { newContentIds } from "../lib/contentReview";
import { findReminderCandidate } from "../lib/reminderContent";

describe("WIDGET_VERSES", () => {
  it("each shown verse is its fetched source text with only the waqf marks removed", () => {
    for (const v of WIDGET_VERSES) {
      const stripped = v.sourceTextAr.replace(/\s*[\u06D6-\u06DC]/gu, "").replace(/\s+/gu, " ").trim();
      expect(v.textAr, v.verseKey).toBe(stripped);
    }
  });
  it("renders cleanly in the widget", () => {
    for (const v of WIDGET_VERSES) expect(widgetTextProblem(v.textAr), v.verseKey).toBeNull();
  });
  it("cites the surah and verse it comes from", () => {
    for (const v of WIDGET_VERSES) {
      const [, ayah] = v.verseKey.split(":");
      expect(v.sourceAr).toMatch(new RegExp(`الآية ${ayah}$`));
      expect(v.sourceEn.endsWith(v.verseKey)).toBe(true);
      expect(v.url).toBe(`https://quran.com/${v.verseKey}`);
    }
  });
  it("ids are unique", () => {
    expect(new Set(WIDGET_VERSES.map((v) => v.id)).size).toBe(WIDGET_VERSES.length);
  });
  it("is new content: pending review (with its comments) until approved", () => {
    for (const v of WIDGET_VERSES) {
      expect(newContentIds().has(`lataif:verse:${v.id}`)).toBe(true);
      for (const c of v.comments) expect(newContentIds().has(c.id)).toBe(true);
    }
  });
  it("is labelled as Qur'an, not as a Lataif reflection", () => {
    for (const v of WIDGET_VERSES) expect(findReminderCandidate(`lataif:verse:${v.id}`)?.kind).toBe("quran");
  });
});
