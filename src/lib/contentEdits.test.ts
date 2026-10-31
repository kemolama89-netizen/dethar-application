// @vitest-environment jsdom
// Reviewer edits in the Religious Content Review: saved as drafts that
// survive a restart and never reach the published pool (widgets, reminders),
// approved all at once, and only then laid over the shipped text.
import { beforeEach, describe, expect, it, vi } from "vitest";
// This file tests the review workflow itself (defaults, decisions, edits) on
// fixed fixtures; the religious-content audit's own gating — including that
// an approved edit withholds an audited Hadith or Latifa — is tested in
// lib/religiousAudit.test.tsx. Here it is switched off.
vi.mock("./religiousAudit", () => ({
  AUDIT_ENFORCED: false,
  inAuditScope: () => false,
  auditShowsArabic: () => true,
  auditShowsEnglish: () => true,
  reminderAuditApproved: () => true,
  auditPublishesByDefault: () => false,
}));

import {
  CONTENT_EDITS_KEY,
  approveAllPendingEdits,
  approveItemEdits,
  approvedEdits,
  contentReviewVersion,
  discardEditDraft,
  getContentEdits,
  pendingEdits,
  resetContentReviewCacheForTesting,
  saveEditDraft,
  setReview,
  statusBeforeRejection,
  subscribeContentEdits,
  subscribeContentReview,
} from "./contentReview";
import { findReminderCandidate, findReminderItem, reminderPool } from "./reminderContent";
import { nativeReminderItem } from "./remindersSync";

const DUA = "dua:dua-al-karb";
const hadithId = () => reminderPool().find((i) => i.category === "hadith" && i.gradeAr)!.id;

beforeEach(() => {
  localStorage.clear();
  resetContentReviewCacheForTesting();
});

describe("edit drafts", () => {
  it("are saved per field and per item, listed together, and survive a restart", () => {
    const hadith = hadithId();
    saveEditDraft(DUA, "textEn", "Edited meaning", "Reviewer A", 1000);
    saveEditDraft(DUA, "url", "https://example.org/source", "Reviewer A", 1001);
    saveEditDraft(hadith, "grade", "صحيح (تعديل)", "Reviewer A", 1002);
    expect(pendingEdits()).toEqual([
      { id: DUA, field: "textEn", value: "Edited meaning" },
      { id: DUA, field: "url", value: "https://example.org/source" },
      { id: hadith, field: "grade", value: "صحيح (تعديل)" },
    ]);
    expect(JSON.parse(localStorage.getItem(CONTENT_EDITS_KEY)!)[DUA].drafts.textEn).toBe("Edited meaning");

    resetContentReviewCacheForTesting(); // as after a restart
    expect(pendingEdits()).toHaveLength(3);
    expect(getContentEdits(DUA)!.history.map((h) => [h.field, h.action, h.reviewer])).toEqual([
      ["textEn", "draft", "Reviewer A"],
      ["url", "draft", "Reviewer A"],
    ]);
  });

  it("can be discarded one field at a time", () => {
    saveEditDraft(DUA, "textAr", "نص معدل");
    saveEditDraft(DUA, "reference", "مرجع معدل");
    discardEditDraft(DUA, "textAr");
    expect(pendingEdits()).toEqual([{ id: DUA, field: "reference", value: "مرجع معدل" }]);
    expect(getContentEdits(DUA)!.history.at(-1)!.action).toBe("discarded");
  });

  it("never reach the published pool, the widget's strings, or the publication version", () => {
    const before = findReminderItem(DUA)!;
    const nativeBefore = { ar: nativeReminderItem(before, "ar"), en: nativeReminderItem(before, "en") };
    const version = contentReviewVersion();
    const published = vi.fn();
    const unsubscribe = subscribeContentReview(published);

    saveEditDraft(DUA, "textAr", "نص لم يُعتمد");
    saveEditDraft(DUA, "textEn", "Unapproved meaning");
    saveEditDraft(DUA, "reference", "مرجع لم يُعتمد");

    const after = findReminderItem(DUA)!;
    expect(after.textAr).toBe(before.textAr);
    expect(after.meaningEn).toBe(before.meaningEn);
    expect(after.sourceAr).toBe(before.sourceAr);
    expect(nativeReminderItem(after, "ar")).toEqual(nativeBefore.ar);
    expect(nativeReminderItem(after, "en")).toEqual(nativeBefore.en);
    expect(reminderPool().some((i) => i.textAr === "نص لم يُعتمد")).toBe(false);
    expect(contentReviewVersion()).toBe(version);
    expect(published).not.toHaveBeenCalled();
    expect(approvedEdits(DUA)).toEqual({});
    unsubscribe();
  });
});

describe("Approve All Pending Changes", () => {
  it("approves every draft across items in one save, and only then the published content changes", () => {
    const hadith = hadithId();
    const shippedSource = findReminderItem(DUA)!.sourceEn;
    saveEditDraft(DUA, "textAr", "نص معتمد");
    saveEditDraft(DUA, "textEn", "Approved meaning");
    saveEditDraft(DUA, "reference", "مرجع معتمد");
    saveEditDraft(hadith, "grade", "حسن (معدل)");
    const published = vi.fn();
    const edits = vi.fn();
    const unsubscribe = [subscribeContentReview(published), subscribeContentEdits(edits)];

    expect(approveAllPendingEdits("Reviewer B", 2000)).toBe(4);

    expect(published).toHaveBeenCalledTimes(1);
    expect(edits).toHaveBeenCalledTimes(1);
    expect(pendingEdits()).toEqual([]);
    const dua = findReminderItem(DUA)!;
    expect(dua.textAr).toBe("نص معتمد");
    expect(dua.meaningEn).toBe("Approved meaning");
    expect(dua.sourceAr).toBe("مرجع معتمد");
    expect(dua.sourceEn).toBe(shippedSource);
    expect(nativeReminderItem(dua, "ar").text).toBe("نص معتمد");
    expect(nativeReminderItem(dua, "en").meaning).toBe("Approved meaning");
    expect(findReminderItem(hadith)!.gradeAr).toBe("حسن (معدل)");
    expect(getContentEdits(DUA)!.history.filter((h) => h.action === "approved").every((h) => h.reviewer === "Reviewer B" && h.at === 2000)).toBe(true);

    // The shipped data itself is untouched — the candidate (unpublished view) keeps the original.
    expect(findReminderCandidate(DUA)!.textAr).not.toBe("نص معتمد");

    resetContentReviewCacheForTesting(); // approved edits persist
    expect(findReminderItem(DUA)!.textAr).toBe("نص معتمد");
    unsubscribe.forEach((u) => u());
  });

  it("does nothing when there is nothing pending", () => {
    const version = contentReviewVersion();
    expect(approveAllPendingEdits("R")).toBe(0);
    expect(contentReviewVersion()).toBe(version);
  });

  it("an approved edit doesn't publish an item that isn't approved for publication", () => {
    const pendingItem = "dua:q-37-100";
    expect(findReminderItem(pendingItem)).toBeUndefined();
    saveEditDraft(pendingItem, "textEn", "Edited");
    approveAllPendingEdits("R");
    expect(approvedEdits(pendingItem)).toEqual({ textEn: "Edited" });
    expect(findReminderItem(pendingItem)).toBeUndefined();
  });

  it("a later draft on an approved field stays a draft until approved again", () => {
    saveEditDraft(DUA, "textEn", "First");
    approveAllPendingEdits("R");
    saveEditDraft(DUA, "textEn", "Second");
    expect(findReminderItem(DUA)!.meaningEn).toBe("First");
    approveAllPendingEdits("R");
    expect(findReminderItem(DUA)!.meaningEn).toBe("Second");
  });
});

describe("one item at a time (the Lataif cards)", () => {
  const W = "lataif:w1";

  it("approves only that item's drafts", () => {
    saveEditDraft(W, "reflectionEn", "One");
    saveEditDraft(DUA, "textEn", "Other");
    expect(approveItemEdits(W, "R")).toBe(1);
    expect(approvedEdits(W)).toEqual({ reflectionEn: "One" });
    expect(pendingEdits()).toEqual([{ id: DUA, field: "textEn", value: "Other" }]);
  });

  it("lays an approved reflection over the published latifa, dropping the shipped English citation when its source changes", () => {
    const shipped = findReminderItem(W)!.evidence!;
    saveEditDraft(W, "reflectionAr", "لطيفة");
    approveItemEdits(W);
    expect(findReminderItem(W)!.evidence).toEqual({ ...shipped, ar: "لطيفة" });
    saveEditDraft(W, "tafsirSource", "مصدر آخر");
    approveItemEdits(W);
    expect(findReminderItem(W)!.evidence!.sourceAr).toBe("مصدر آخر");
    expect(findReminderItem(W)!.evidence!.sourceEn).toBeUndefined();
  });

  it("a recovered item returns to the status it had before it was rejected", () => {
    expect(statusBeforeRejection(W)).toBe("approved");
    setReview(W, { status: "needs-editing" });
    setReview(W, { status: "rejected" });
    expect(statusBeforeRejection(W)).toBe("needs-editing");
    // (Its needs-verification example, lataif:w16, was removed by the 2026-10-30 audit cleanup.)
  });
});
