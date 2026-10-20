// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { startupHadithPublished } from "./startupOverlay";
import { CONTENT_REVIEW_KEY, REVIEW_STATUSES, STARTUP_HADITH_REVIEW_ID, isPublished, resetContentReviewCacheForTesting, setReview } from "./contentReview";
import { ENRICHED_HADITHS } from "../data/widgetContent";
import { STARTUP_HADITH, STARTUP_HADITH_ENTRY_ID } from "../data/startupHadith";

describe("startup Hadith (launch intro)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetContentReviewCacheForTesting();
  });

  it("is word for word the verified ENRICHED_HADITHS entry, every field", () => {
    const entry = ENRICHED_HADITHS.find((h) => h.id === STARTUP_HADITH_ENTRY_ID)!;
    expect(STARTUP_HADITH.textAr).toBe(entry.textAr);
    expect(STARTUP_HADITH.meaningEn).toBe(entry.meaningEn);
    expect(STARTUP_HADITH.narratorAr).toBe(entry.narratorAr);
    expect(STARTUP_HADITH.sourceAr).toBe(entry.sourceAr);
    expect(STARTUP_HADITH.sourceEn).toBe(entry.sourceEn);
    expect(STARTUP_HADITH.referenceAr).toBe(entry.referenceAr);
    expect(STARTUP_HADITH.referenceEn).toBe(entry.referenceEn);
    expect(STARTUP_HADITH.gradeAr).toBe(entry.gradeAr);
    expect(STARTUP_HADITH.gradeEn).toBe(entry.gradeEn);
    expect(STARTUP_HADITH.gradingSourceAr).toBe(entry.gradingSourceAr);
    expect(STARTUP_HADITH.url).toBe(entry.url);
    expect(STARTUP_HADITH.translationSource).toBe(entry.translation.source);
  });

  it("the light publication check agrees with the review store for every status", () => {
    expect(localStorage.getItem(CONTENT_REVIEW_KEY)).toBeNull();
    expect(startupHadithPublished()).toBe(isPublished(STARTUP_HADITH_REVIEW_ID));
    for (const status of REVIEW_STATUSES) {
      setReview(STARTUP_HADITH_REVIEW_ID, { status });
      expect(startupHadithPublished(), status).toBe(isPublished(STARTUP_HADITH_REVIEW_ID));
    }
  });

  it("reads the review store's own storage key", () => {
    expect(CONTENT_REVIEW_KEY).toBe("dithar:content-review:v1");
  });

  it("falls back to its default (approved) when storage is unreadable", () => {
    localStorage.setItem(CONTENT_REVIEW_KEY, "{not json");
    expect(startupHadithPublished()).toBe(true);
  });
});
