// @vitest-environment jsdom
// The Religious Content Review screen's Lataif (Wamdat) tab: one card per
// latifa with every field editable in place, Save Draft that touches only
// the fields typed in, Approve for that item alone, Remove as a recoverable
// rejection, and search with review-state filters.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// This file tests the review workflow itself (defaults, decisions, edits) on
// fixed fixtures; the religious-content audit's own gating — including that
// an approved edit withholds an audited Hadith or Latifa — is tested in
// lib/religiousAudit.test.tsx. Here it is switched off.
vi.mock("../lib/religiousAudit", () => ({
  AUDIT_ENFORCED: false,
  inAuditScope: () => false,
  auditShowsArabic: () => true,
  auditShowsEnglish: () => true,
  reminderAuditApproved: () => true,
  auditPublishesByDefault: () => false,
}));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { ContentReviewView } from "./ContentReviewView";
import { getContentEdits, pendingEdits, resetContentReviewCacheForTesting, reviewStatusOf } from "../lib/contentReview";
import { findReminderItem } from "../lib/reminderContent";
import { WAMDAT, WAMDA_NEEDS_VERIFICATION } from "../data/wamdat";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function mount() {
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <ContentReviewView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
  resetContentReviewCacheForTesting();
  container = document.createElement("div");
  document.body.appendChild(container);
  mount();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const setValue = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const W1 = WAMDAT.find((w) => w.id === 1)!;
const W3 = WAMDAT.find((w) => w.id === 3)!;

async function openTab() {
  await click(container.querySelector("[data-review-category='wamdat']")!);
}
const card = (id: string) => container.querySelector(`[data-review-item='${id}']`);
const input = (id: string, field: string) => card(id)!.querySelector<HTMLTextAreaElement>(`[data-wamda-input='${field}']`)!;
async function search(q: string) {
  await setValue(container.querySelector<HTMLInputElement>("[data-wamda-search]")!, q);
}
async function filter(state: string) {
  await click(container.querySelector(`[data-wamda-filter='${state}']`)!);
}
const shownIds = () => [...container.querySelectorAll("[data-wamda-card]")].map((c) => c.getAttribute("data-review-item"));

describe("Lataif review cards", () => {
  it("shows every field of a latifa together, Arabic right-to-left and English left-to-right", async () => {
    await openTab();
    await search("lataif:w1");
    const c = card("lataif:w1")!;
    expect(input("lataif:w1", "reflectionAr").value).toBe(W1.insightAr);
    expect(input("lataif:w1", "reflectionAr").dir).toBe("rtl");
    expect(input("lataif:w1", "reflectionEn").value).toBe(W1.insightEn);
    expect(input("lataif:w1", "reflectionEn").dir).toBe("ltr");
    expect(input("lataif:w1", "tafsirSource").value).toBe(W1.source);
    expect([...c.querySelectorAll("[data-wamda-input]")].map((e) => e.getAttribute("data-wamda-input"))).toEqual([
      "reflectionAr",
      "reflectionEn",
      "textAr",
      "reference",
      "tafsirSource",
      "url",
      "translationSource",
    ]);
    expect(c.textContent).toContain("src/data/wamdat.ts → WAMDAT (id 1)");
    // No URL is recorded: marked empty, never invented.
    expect(input("lataif:w1", "url").value).toBe("");
    expect(c.querySelector("[data-wamda-field='url']")!.textContent).toContain("فارغ");
    expect(c.querySelector("[data-wamda-actions] [data-wamda-approve]")).not.toBeNull();
    expect(c.querySelector("[data-wamda-actions] [data-wamda-remove]")).not.toBeNull();
  });

  it("marks unsaved changes, and Save Draft stores only the edited field without publishing it", async () => {
    await openTab();
    await search("lataif:w1");
    expect(card("lataif:w1")!.getAttribute("data-wamda-unsaved")).toBe("false");
    await setValue(input("lataif:w1", "reflectionEn"), "Edited English reflection");
    expect(card("lataif:w1")!.getAttribute("data-wamda-unsaved")).toBe("true");
    expect(card("lataif:w1")!.querySelector("[data-wamda-unsaved-badge]")).not.toBeNull();

    await click(card("lataif:w1")!.querySelector("[data-wamda-save]")!);
    expect(getContentEdits("lataif:w1")!.drafts).toEqual({ reflectionEn: "Edited English reflection" });
    expect(card("lataif:w1")!.getAttribute("data-wamda-unsaved")).toBe("false");
    expect(card("lataif:w1")!.querySelector("[data-wamda-message]")!.textContent).toContain("لم تُنشر");
    // Every other field is still the shipped value.
    expect(input("lataif:w1", "reflectionAr").value).toBe(W1.insightAr);
    expect(input("lataif:w1", "tafsirSource").value).toBe(W1.source);
    // Published content is unchanged until approval.
    expect(findReminderItem("lataif:w1")!.evidence!.en).toBe(W1.insightEn);
  });

  it("a saved draft is there again after reopening the screen", async () => {
    await openTab();
    await search("lataif:w1");
    await setValue(input("lataif:w1", "reflectionAr"), "لطيفة معدّلة");
    await click(card("lataif:w1")!.querySelector("[data-wamda-save]")!);

    act(() => root.unmount());
    resetContentReviewCacheForTesting();
    mount();
    await openTab();
    await search("lataif:w1");
    expect(input("lataif:w1", "reflectionAr").value).toBe("لطيفة معدّلة");
    expect(card("lataif:w1")!.querySelector("[data-wamda-field='reflectionAr'] [data-wamda-field-draft]")).not.toBeNull();
    expect(card("lataif:w1")!.querySelector("[data-wamda-draft-badge]")).not.toBeNull();
    // The original stays visible next to the draft.
    expect(card("lataif:w1")!.querySelector("[data-wamda-original='reflectionAr']")!.textContent).toContain(W1.insightAr);
  });

  it("Approve approves the selected item only, with its own drafts", async () => {
    await openTab();
    await search("lataif:w");
    await setValue(input("lataif:w1", "reflectionEn"), "Approved English");
    await click(card("lataif:w1")!.querySelector("[data-wamda-save]")!);
    await setValue(input("lataif:w3", "reflectionEn"), "Still a draft");
    await click(card("lataif:w3")!.querySelector("[data-wamda-save]")!);
    const w3Status = reviewStatusOf("lataif:w3");

    await click(card("lataif:w1")!.querySelector("[data-wamda-approve]")!);
    expect(reviewStatusOf("lataif:w1")).toBe("approved");
    expect(findReminderItem("lataif:w1")!.evidence!.en).toBe("Approved English");
    expect(card("lataif:w1")!.querySelector("[data-wamda-message]")!.textContent).toContain("هذا الجهاز فقط");
    // The other item is untouched.
    expect(pendingEdits()).toEqual([{ id: "lataif:w3", field: "reflectionEn", value: "Still a draft" }]);
    expect(reviewStatusOf("lataif:w3")).toBe(w3Status);
    expect(findReminderItem("lataif:w3")!.evidence!.en).toBe(W3.insightEn);
  });

  it("Approve with unsaved changes asks first; declining changes nothing", async () => {
    await openTab();
    await search("lataif:w1");
    await setValue(input("lataif:w1", "reflectionEn"), "Unsaved");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click(card("lataif:w1")!.querySelector("[data-wamda-approve]")!);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(pendingEdits()).toEqual([]);
    expect(getContentEdits("lataif:w1")).toBeUndefined();
    expect(card("lataif:w1")!.getAttribute("data-wamda-unsaved")).toBe("true");
  });

  it("Remove confirms with the id and title, hides the item as rejected, and Restore brings it back", async () => {
    await openTab();
    await search("lataif:w1");
    const before = reviewStatusOf("lataif:w1");
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await click(card("lataif:w1")!.querySelector("[data-wamda-remove]")!);
    expect(confirm.mock.calls[0][0]).toContain("lataif:w1");
    expect(confirm.mock.calls[0][0]).toContain("سورة الفاتحة");
    expect(reviewStatusOf("lataif:w1")).toBe(before);

    confirm.mockReturnValueOnce(true);
    await click(card("lataif:w1")!.querySelector("[data-wamda-remove]")!);
    expect(reviewStatusOf("lataif:w1")).toBe("rejected");
    expect(findReminderItem("lataif:w1")).toBeUndefined();
    // The source data is untouched.
    expect(WAMDAT.find((w) => w.id === 1)).toBe(W1);
    expect(card("lataif:w1")!.getAttribute("data-wamda-state")).toBe("rejected");

    await click(card("lataif:w1")!.querySelector("[data-wamda-restore]")!);
    expect(reviewStatusOf("lataif:w1")).toBe(before);
    expect(findReminderItem("lataif:w1")).toBeDefined();
  });

  it("searches the reflections and filters by review state", async () => {
    await openTab();
    await search("التفات الخطاب");
    expect(shownIds()).toEqual(["lataif:w1"]);

    await search("");
    await filter("verification");
    const flagged = Object.keys(WAMDA_NEEDS_VERIFICATION).map((id) => `lataif:w${id}`);
    for (const id of flagged) expect(shownIds()).toContain(id);
    expect(shownIds().every((id) => reviewStatusOf(id!) === "needs-verification")).toBe(true);

    await filter("draft");
    expect(shownIds()).toEqual([]);
    await filter("all");
    await search("lataif:w3");
    await setValue(input("lataif:w3", "tafsirSource"), "مصدر معدّل");
    await click(card("lataif:w3")!.querySelector("[data-wamda-save]")!);
    await search("");
    await filter("draft");
    expect(shownIds()).toEqual(["lataif:w3"]);
  });
});
