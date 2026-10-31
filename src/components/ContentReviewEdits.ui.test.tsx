// @vitest-environment jsdom
// The Religious Content Review screen's editing: an Edit button per field,
// drafts kept out of published content, a summary of every pending change
// across items, and one confirmed "Approve All Pending Changes".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { ContentReviewView } from "./ContentReviewView";
import { pendingEdits, resetContentReviewCacheForTesting } from "../lib/contentReview";
import { findReminderItem, reminderPool } from "../lib/reminderContent";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
  resetContentReviewCacheForTesting();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <ContentReviewView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
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

/** Finds an item by its id and opens its card. */
async function openCard(id: string): Promise<Element> {
  await setValue(container.querySelector<HTMLInputElement>("[data-review-search]")!, id);
  const card = container.querySelector(`[data-review-item='${id}']`)!;
  expect(card, id).not.toBeNull();
  const toggle = card.querySelector("[aria-expanded]")!;
  if (toggle.getAttribute("aria-expanded") === "false") await click(toggle);
  return container.querySelector(`[data-review-item='${id}']`)!;
}

async function editField(id: string, field: string, value: string) {
  let card = await openCard(id);
  await click(card.querySelector(`[data-review-edit='${field}']`)!);
  card = container.querySelector(`[data-review-item='${id}']`)!;
  await setValue(card.querySelector<HTMLTextAreaElement>(`[data-review-edit-input='${field}']`)!, value);
  await click(card.querySelector(`[data-review-edit-save='${field}']`)!);
}

const pendingCount = () => Number(container.querySelector("[data-review-pending]")!.getAttribute("data-review-pending"));

describe("Religious Content Review — editing", () => {
  const DUA = "dua:dua-al-karb";

  it("offers its own Edit button for each field, with the grading only on Hadiths", async () => {
    const dua = await openCard(DUA);
    const duaFields = [...dua.querySelectorAll("[data-review-edit]")].map((b) => b.getAttribute("data-review-edit"));
    expect(duaFields).toEqual(["textAr", "textEn", "translationSource", "reference", "url"]);

    const hadith = reminderPool().find((i) => i.category === "hadith")!.id;
    const card = await openCard(hadith);
    expect([...card.querySelectorAll("[data-review-edit]")].map((b) => b.getAttribute("data-review-edit"))).toContain("grade");
  });

  it("saves a draft without changing published content, and lists drafts from several items", async () => {
    const shipped = findReminderItem(DUA)!;
    await editField(DUA, "textEn", "Draft meaning");
    const card = container.querySelector(`[data-review-item='${DUA}']`)!;
    expect(card.querySelector("[data-review-edit-draft]")!.textContent).toContain("Draft meaning");
    expect(findReminderItem(DUA)!.meaningEn).toBe(shipped.meaningEn);

    const hadith = reminderPool().find((i) => i.category === "hadith")!.id;
    await editField(hadith, "url", "https://example.org/h");
    expect(pendingCount()).toBe(2);
    const changes = [...container.querySelectorAll("[data-review-pending-change]")].map((c) => c.getAttribute("data-review-pending-change"));
    expect(changes).toEqual([`${DUA}:textEn`, `${hadith}:url`]);
    expect(pendingEdits()).toHaveLength(2);
  });

  it("saving the unchanged value creates no draft", async () => {
    let card = await openCard(DUA);
    await click(card.querySelector("[data-review-edit='textAr']")!);
    card = container.querySelector(`[data-review-item='${DUA}']`)!;
    await click(card.querySelector("[data-review-edit-save='textAr']")!);
    expect(pendingEdits()).toEqual([]);
  });

  it("discards one pending change from the summary", async () => {
    await editField(DUA, "textEn", "To discard");
    await click(container.querySelector(`[data-review-pending-discard='${DUA}:textEn']`)!);
    expect(pendingCount()).toBe(0);
  });

  it("Approve All Pending Changes asks first; declining changes nothing", async () => {
    await editField(DUA, "textAr", "نص مسودة");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click(container.querySelector("[data-review-approve-all]")!);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(pendingCount()).toBe(1);
    expect(findReminderItem(DUA)!.textAr).not.toBe("نص مسودة");
  });

  it("every item has a 'finished reviewing' checkbox that stays checked after a refresh", async () => {
    const hadith = reminderPool().find((i) => i.category === "hadith")!.id;
    const ids = [DUA, hadith, "lataif:w3"];
    for (const id of ids) {
      await setValue(container.querySelector<HTMLInputElement>("[data-review-search]")!, id);
      const box = container.querySelector<HTMLInputElement>(`[data-review-checked='${id}']`)!;
      expect(box, id).not.toBeNull();
      expect(box.checked).toBe(false);
      await click(box);
      expect(container.querySelector<HTMLInputElement>(`[data-review-checked='${id}']`)!.checked).toBe(true);
    }
    // Every card shown has one.
    await setValue(container.querySelector<HTMLInputElement>("[data-review-search]")!, "");
    const cards = container.querySelectorAll("[data-review-item]");
    expect(container.querySelectorAll("[data-review-checked]").length).toBe(cards.length);

    // Refresh: a fresh screen reads the saved ticks.
    act(() => root.unmount());
    root = createRoot(container);
    act(() =>
      root.render(
        <LanguageProvider>
          <ContentReviewView onBack={() => {}} />
        </LanguageProvider>,
      ),
    );
    for (const id of ids) {
      await setValue(container.querySelector<HTMLInputElement>("[data-review-search]")!, id);
      expect(container.querySelector<HTMLInputElement>(`[data-review-checked='${id}']`)!.checked, id).toBe(true);
    }
    // Unticking is saved too.
    await click(container.querySelector(`[data-review-checked='lataif:w3']`)!);
    expect(JSON.parse(localStorage.getItem("dithar:content-review:checked:v1")!)).not.toContain("lataif:w3");
  });

  it("approving publishes every pending change at once", async () => {
    await editField(DUA, "textAr", "نص معتمد");
    await editField(DUA, "textEn", "Approved meaning");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click(container.querySelector("[data-review-approve-all]")!);
    expect(pendingCount()).toBe(0);
    expect(findReminderItem(DUA)!.textAr).toBe("نص معتمد");
    expect(findReminderItem(DUA)!.meaningEn).toBe("Approved meaning");
    const card = container.querySelector(`[data-review-item='${DUA}']`)!;
    expect(card.querySelectorAll("[data-review-edit-approved]").length).toBe(2);
  });
});
