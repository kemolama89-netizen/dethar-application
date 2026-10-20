// @vitest-environment jsdom
// The religious-content approval workflow: what is published by default,
// that review decisions gate widgets/reminders, that they persist across a
// restart, and the review screen's catalog (read from the live data),
// filters, duplicates and export.
import { beforeEach, describe, expect, it } from "vitest";
import {
  STARTUP_HADITH_REVIEW_ID,
  defaultReviewStatus,
  getReviewRecord,
  isPublished,
  newContentIds,
  resetContentReviewCacheForTesting,
  reviewStatusOf,
  setReview,
  setReviewMany,
} from "./contentReview";
import { findReminderCandidate, findReminderItem, reminderCandidates, reminderPool } from "./reminderContent";
import { contentCatalog, duplicateGroups, exportCsv, exportJson, filterCatalog } from "./contentCatalog";
import { ENRICHED_HADITHS, POEMS } from "../data/widgetContent";
import { QURAN_LATAIF } from "../data/quranLataif";
import { HADITHS } from "../data/hadith";
import { STARTUP_HADITH } from "../data/startupHadith";

beforeEach(() => {
  localStorage.clear();
  resetContentReviewCacheForTesting();
});

describe("defaults", () => {
  it("content that already shipped stays published; everything newly added starts as Pending Review", () => {
    expect(defaultReviewStatus(`hadith:${HADITHS[0].id}`)).toBe("approved");
    expect(defaultReviewStatus("dua:dua-al-karb")).toBe("approved");
    for (const h of ENRICHED_HADITHS) expect(defaultReviewStatus(`hadith:${h.id}`)).toBe("pending");
    for (const p of POEMS) expect(defaultReviewStatus(`poetry:${p.id}`)).toBe("pending");
    for (const l of QURAN_LATAIF) expect(defaultReviewStatus(`lataif:${l.id}`)).toBe("pending");
    for (const id of newContentIds()) expect(isPublished(id)).toBe(false);
  });

  it("existing Lataif that cite 'scientific/medical miracle' works are held for verification", () => {
    const flagged = contentCatalog().filter((i) => i.warnings.includes("miracle-claim"));
    expect(flagged.length).toBeGreaterThan(0);
    for (const item of flagged) {
      expect(reviewStatusOf(item.id)).toBe("needs-verification");
      expect(findReminderItem(item.id)).toBeUndefined();
    }
  });

  it("the startup Hadith (requested by the owner) is approved by default", () => {
    expect(reviewStatusOf(STARTUP_HADITH_REVIEW_ID)).toBe("approved");
  });
});

describe("publication gating", () => {
  const id = "hadith:muslim-2564";

  it("pending content is in the candidates but not in what widgets and reminders get", () => {
    expect(findReminderCandidate(id)).toBeDefined();
    expect(findReminderItem(id)).toBeUndefined();
    expect(reminderPool().some((i) => i.category === "poetry")).toBe(false);
  });

  it("approving publishes it; any other status withdraws it", () => {
    setReview(id, { status: "approved", reviewer: "R" });
    expect(findReminderItem(id)?.textAr).toBe(findReminderCandidate(id)!.textAr);
    for (const status of ["verified", "needs-verification", "needs-editing", "rejected", "pending"] as const) {
      setReview(id, { status });
      expect(findReminderItem(id), status).toBeUndefined();
    }
  });

  it("rejecting existing content withdraws it too", () => {
    const existing = `hadith:${HADITHS[0].id}`;
    expect(findReminderItem(existing)).toBeDefined();
    setReview(existing, { status: "rejected", notes: "test" });
    expect(findReminderItem(existing)).toBeUndefined();
  });

  it("comments are gated one by one; a dua falls back to its existing reflection until its new comments are approved", () => {
    const dua = findReminderItem("dua:dua-al-karb")!;
    expect(dua.comments.map((c) => c.id)).toEqual(["theme:dua:legacy"]);
    const firstNew = findReminderCandidate("dua:dua-al-karb")!.comments[0];
    setReview(firstNew.id, { status: "approved" });
    expect(findReminderItem("dua:dua-al-karb")!.comments.map((c) => c.id)).toEqual([firstNew.id]);
  });

  it("the original text is never touched by a review decision", () => {
    const before = findReminderCandidate(id)!.textAr;
    setReview(id, { status: "needs-editing", notes: "check the wording" });
    expect(findReminderCandidate(id)!.textAr).toBe(before);
  });
});

describe("persistence", () => {
  it("decisions, notes, reviewer and history survive a restart", () => {
    setReview("poetry:shafii-afw", { status: "needs-verification", notes: "attribution?", reviewer: "Reviewer A" }, 1000);
    setReview("poetry:shafii-afw", { status: "approved", reviewer: "Reviewer A" }, 2000);
    resetContentReviewCacheForTesting(); // as on a fresh launch: read from storage
    const record = getReviewRecord("poetry:shafii-afw")!;
    expect(record).toMatchObject({ status: "approved", notes: "attribution?", reviewer: "Reviewer A", updatedAt: 2000 });
    expect(record.history.map((h) => h.status)).toEqual(["needs-verification", "approved"]);
    expect(findReminderItem("poetry:shafii-afw")).toBeDefined();
  });

  it("a bulk decision is one save over many items", () => {
    const ids = POEMS.map((p) => `poetry:${p.id}`);
    setReviewMany(ids, { status: "approved", reviewer: "B" });
    resetContentReviewCacheForTesting();
    expect(ids.every(isPublished)).toBe(true);
  });

  it("ignores corrupt or unknown stored values (falls back to defaults)", () => {
    localStorage.setItem("dithar:content-review:v1", JSON.stringify({ "hadith:muslim-2564": { status: "weird" }, x: null }));
    resetContentReviewCacheForTesting();
    expect(reviewStatusOf("hadith:muslim-2564")).toBe("pending");
  });
});

describe("the review catalog", () => {
  it("is read from the live sources: every widget/reminder candidate and every comment, plus the startup Hadith", () => {
    const catalog = contentCatalog();
    const ids = new Set(catalog.map((i) => i.id));
    for (const item of reminderCandidates()) {
      expect(ids.has(item.id), item.id).toBe(true);
      for (const c of item.comments) expect(ids.has(c.id), c.id).toBe(true);
    }
    expect(ids.has(STARTUP_HADITH_REVIEW_ID)).toBe(true);
    expect(new Set(catalog.map((i) => i.id)).size).toBe(catalog.length);
  });

  it("carries source metadata, storage location and usage for each item", () => {
    const hadith = contentCatalog().find((i) => i.id === "hadith:tirmidhi-3377")!;
    expect(hadith).toMatchObject({ type: "hadith", url: "https://sunnah.com/tirmidhi/48/8", reference: expect.stringContaining("3377"), origin: "new" });
    expect(hadith.storage).toContain("widgetContent.ts");
    expect(hadith.usage).toContain("widget");
    const latifa = contentCatalog().find((i) => i.id === "lataif:q33-41")!;
    expect(latifa).toMatchObject({ type: "lataif", quranic: true, tafsirRef: "33:41" });
    expect(latifa.tafsirUrl).toBe("https://quran.com/ar/33:41/tafsirs/ar-tafseer-al-saddi");
    const startup = contentCatalog().find((i) => i.id === STARTUP_HADITH_REVIEW_ID)!;
    expect(startup.usage).toEqual(["startup-overlay"]);
  });

  it("warns about missing links, uncertain attribution, unreviewed translations and items needing scholarly review", () => {
    const catalog = contentCatalog();
    expect(catalog.find((i) => i.id === `hadith:${HADITHS[0].id}`)!.warnings).toContain("missing-url");
    expect(catalog.find((i) => i.id === "poetry:nazila-faraj")!.warnings).toContain("disputed-attribution");
    expect(catalog.find((i) => i.id === "poetry:shafii-afw")!.warnings).toContain("uncertain-attribution");
    expect(catalog.find((i) => i.id === "hadith:muslim-2564")!.warnings).toEqual(expect.arrayContaining(["unverified-translation", "scholar-review"]));
    expect(catalog.find((i) => i.id === "hadith:muslim-2733")!.warnings).toEqual(expect.arrayContaining(["derived-url", "number-check"]));
  });

  it("filters by type, status, language, verification and free-text search (narrator, reference, text)", () => {
    const catalog = contentCatalog();
    expect(filterCatalog(catalog, { type: "poetry" }).length).toBe(POEMS.length);
    expect(filterCatalog(catalog, { type: "quran" }).every((i) => i.quranic)).toBe(true);
    expect(filterCatalog(catalog, { status: "pending" }).every((i) => i.origin === "new")).toBe(true);
    expect(filterCatalog(catalog, { verification: "new" }).length).toBe(catalog.filter((i) => i.origin === "new").length);
    expect(filterCatalog(catalog, { language: "en-missing" }).every((i) => !i.textEn)).toBe(true);
    expect(filterCatalog(catalog, { query: "سلمان الفارسي" }).map((i) => i.id)).toContain("hadith:tirmidhi-3556");
    expect(filterCatalog(catalog, { query: "tirmidhi-3377" }).length).toBeGreaterThan(0);
    // Diacritics don't matter for search.
    expect(filterCatalog(catalog, { query: "فاستقم" }).map((i) => i.id)).toContain("hadith:muslim-38");
  });

  it("finds duplicates and near-duplicates", () => {
    const groups = duplicateGroups();
    expect(groups.size).toBeGreaterThan(0);
    // A Qur'anic dua that is also a Lataif verse is reported against it.
    const [first, others] = [...groups.entries()][0];
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) expect(groups.get(other)).toContain(first);
  });

  it("exports the list with metadata, status, notes and usage, as JSON and CSV", () => {
    setReview("hadith:muslim-2564", { status: "verified", notes: "checked against print", reviewer: "R" });
    const items = filterCatalog(contentCatalog(), { query: "muslim-2564" }).filter((i) => i.id === "hadith:muslim-2564");
    const json = JSON.parse(exportJson(items));
    expect(json.count).toBe(1);
    expect(json.items[0]).toMatchObject({ id: "hadith:muslim-2564", status: "verified", notes: "checked against print", reviewer: "R", url: "https://sunnah.com/muslim/45/42" });
    expect(json.items[0].usage).toContain("widget");
    const csv = exportCsv(items);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"checked against print"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});

describe("the startup Hadith", () => {
  it("is Tirmidhi 3377's words of the Prophet ﷺ only — Mu'adh's own statement is not merged in", () => {
    expect(STARTUP_HADITH.quoteAr.startsWith("«ألا أنبئكم بخير أعمالكم")).toBe(true);
    expect(STARTUP_HADITH.quoteAr.endsWith("«ذكر الله تعالى»")).toBe(true);
    expect(STARTUP_HADITH.textAr).not.toContain("أنجى");
    expect(STARTUP_HADITH.url).toBe("https://sunnah.com/tirmidhi/48/8");
  });
});
