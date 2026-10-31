// @vitest-environment jsdom
// The religious-content audit, limited to Prophetic Hadiths, the Quranic
// Wamadat / Lataif and the Saadi Lataif: what it gates, and — just as
// important — that it gates nothing else.
import { describe, expect, it } from "vitest";
import { RELIGIOUS_AUDIT } from "../data/religiousAudit";
import { HADITHS } from "../data/hadith";
import { WAMDAT } from "../data/wamdat";
import { QURAN_LATAIF } from "../data/quranLataif";
import { ENRICHED_HADITHS } from "../data/widgetContent";
import { STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { dhikrItems } from "../data/tasbeeh";
import { MISC_DUAS } from "../data/misc-library";
import { reminderCandidates, reminderPool } from "./reminderContent";
import { approveItemEdits, defaultReviewStatus, isPublished, resetContentReviewCacheForTesting, saveEditDraft } from "./contentReview";
import { auditShowsArabic, auditShowsEnglish, inAuditScope, reminderAuditApproved } from "./religiousAudit";
import { isWidgetItem } from "./widgetFeed";
import { startupHadithPublished } from "./startupOverlay";

const inScopeIds = [
  ...HADITHS.map((h) => `hadith:${h.id}`),
  ...ENRICHED_HADITHS.map((h) => `hadith:${h.id}`),
  ...WAMDAT.map((w) => `lataif:w${w.id}`),
  ...QURAN_LATAIF.map((l) => `lataif:${l.id}`),
  STARTUP_HADITH_REVIEW_ID,
];

describe("the audit's scope", () => {
  it("has a decision for every Hadith, Wamadat and Saadi Latifa", () => {
    for (const id of inScopeIds) {
      expect(inAuditScope(id), id).toBe(true);
      expect(RELIGIOUS_AUDIT[id], id).toBeDefined();
    }
    expect(Object.keys(RELIGIOUS_AUDIT).sort()).toEqual([...new Set(inScopeIds)].sort());
  });
  it("gates nothing outside it: Written and Audio Adhkar, duas, Tasbeeh, dhikr virtues, poetry, short verses", () => {
    const outside = reminderCandidates().filter((i) => !inAuditScope(i.id));
    expect(outside.some((i) => i.category === "dua")).toBe(true);
    expect(outside.some((i) => i.category === "virtue")).toBe(true);
    for (const i of outside) {
      expect(auditShowsArabic(i.id), i.id).toBe(true);
      expect(auditShowsEnglish(i.id), i.id).toBe(true);
    }
    for (const id of [
      ...Object.entries(writtenAdhkarItems).flatMap(([c, items]) => items.map((i) => `written:${c}:${i.id}`)),
      ...dhikrItems.map((d) => `tasbeeh:${d.id}`),
      ...MISC_DUAS.map((d) => `dua:${d.id}`),
    ]) {
      expect(inAuditScope(id), id).toBe(false);
      expect(auditShowsArabic(id), id).toBe(true);
    }
  });
  it("leaves every published out-of-scope item in the pool exactly as before", () => {
    const pool = new Map(reminderPool().map((i) => [i.id, i]));
    for (const c of reminderCandidates().filter((i) => !inAuditScope(i.id) && isPublished(i.id))) {
      const p = pool.get(c.id);
      expect(p, c.id).toBeDefined();
      expect(p!.textAr, c.id).toBe(c.textAr);
      expect(p!.meaningEn, c.id).toBe(c.meaningEn);
      expect(p!.evidence, c.id).toEqual(c.evidence);
      expect(p!.comments.map((x) => x.id), c.id).toEqual(c.comments.filter((x) => isPublished(x.id)).map((x) => x.id));
    }
  });
});

describe("inside the scope", () => {
  const pool = reminderPool();
  it("publishes only verified Hadiths and Lataif, with English only when verified", () => {
    for (const item of pool.filter((i) => inAuditScope(i.id))) {
      expect(reminderAuditApproved(item.id, "ar"), item.id).toBe(true);
      if (!auditShowsEnglish(item.id)) expect(item.meaningEn, item.id).toBeUndefined();
    }
    const ids = new Set(pool.map((i) => i.id));
    expect(ids.has("hadith:23")).toBe(false); // Bukhari 6016 is narrated by Abu Shurayh, not Abu Hurairah
    expect(ids.has("lataif:w16")).toBe(false); // the verse reads «قالت» for «قال» (3:40)
    expect(ids.has("lataif:w8")).toBe(true); // supported by al-Tabari at 2:155
  });
  it("credits a Wamadat reflection as drawn from its tafsir, never as a quotation, and shows it in Arabic only", () => {
    const w = pool.find((i) => i.id === "lataif:w8")!;
    expect(w.evidence?.kind).toBe("insight");
    expect(w.evidence?.sourceAr.startsWith("مستفاد من: ")).toBe(true);
    expect(w.evidence?.en).toBeUndefined();
  });
  it("publishes verified items that were pending, so the report and the app agree (the 20 Saadi Lataif)", () => {
    for (const l of QURAN_LATAIF) {
      const id = `lataif:${l.id}`;
      expect(defaultReviewStatus(id), id).toBe(auditShowsArabic(id) ? "approved" : "pending");
    }
    expect(pool.some((i) => i.id === "lataif:q33-41")).toBe(true);
    expect(pool.some((i) => i.id === "lataif:q2-153")).toBe(false); // the two editions of al-Sa'di disagree
  });
  it("keeps unverified Hadiths and Lataif off the widget in both languages", () => {
    for (const item of reminderCandidates().filter((i) => inAuditScope(i.id) && !auditShowsArabic(i.id))) {
      expect(isWidgetItem(item, "ar"), item.id).toBe(false);
      expect(isWidgetItem(item, "en"), item.id).toBe(false);
    }
  });
  it("withholds an audited Hadith once a reviewer's edit to it is approved — the edited text was never verified", () => {
    const id = "hadith:5";
    expect(reminderPool().some((i) => i.id === id)).toBe(true);
    saveEditDraft(id, "textAr", "نص معدل");
    approveItemEdits(id);
    expect(reminderPool().some((i) => i.id === id)).toBe(false);
    localStorage.clear();
    resetContentReviewCacheForTesting();
    expect(reminderPool().some((i) => i.id === id)).toBe(true);
  });
  it("shows the startup hadith in Arabic, without its unverified English", () => {
    expect(startupHadithPublished()).toBe(true);
    expect(auditShowsEnglish(STARTUP_HADITH_REVIEW_ID)).toBe(false);
  });
  it("keeps only Approved items in the content sources — the 293 that failed the audit were removed", () => {
    expect(inScopeIds).toHaveLength(506);
    for (const id of inScopeIds) expect(auditShowsArabic(id), id).toBe(true);
  });
});
