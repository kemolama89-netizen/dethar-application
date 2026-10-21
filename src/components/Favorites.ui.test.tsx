// @vitest-environment jsdom
// The heart on the full-screen reflection, the rotating DITHAR comment, and
// Settings → Favorites.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approveAllNewContentForTesting } from "../lib/contentReview";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { FavoritesView } from "./FavoritesView";
import { favoriteFromItem, addFavorite, isFavorite, loadFavorites } from "../lib/favorites";
import { saveMiscFavorites, loadMiscFavorites } from "../lib/miscFavorites";
import { findReminderItem } from "../lib/reminderContent";
import { loadContentHistory } from "../lib/contentRotation";
import { MISC_DUAS } from "../data/misc-library";
import { subscribeOpenReminderRequests } from "../lib/reminderOpenRequests";
import type { OpenReminderRequest } from "../lib/reminderOpenRequests";
import { resolveOpenedReminder } from "../lib/reminderOpen";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function mount(node: ReactNode) {
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
}

beforeEach(() => {
  localStorage.clear();
  approveAllNewContentForTesting();
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("the full-screen reflection", () => {
  it("shows the comment the widget showed, under its own label, and remembers it", () => {
    const item = findReminderItem("virtue:8")!;
    mount(<SpiritualReminderView itemId="virtue:8" commentId={item.comments[2].id} onClose={() => {}} />);
    const comment = container.querySelector("[data-reminder-comment]")!;
    expect(comment.getAttribute("data-reminder-comment")).toBe(item.comments[2].id);
    expect(comment.textContent).toBe(item.comments[2].ar);
    expect(container.querySelector("[data-reminder-reflection]")!.textContent).toContain("تأمّل دِثار");
    expect(loadContentHistory()).toEqual({ items: ["virtue:8"], comments: [item.comments[2].id] });
  });

  it("opening the same item again shows a different comment", () => {
    const item = findReminderItem("virtue:8")!;
    mount(<SpiritualReminderView itemId="virtue:8" onClose={() => {}} />);
    const first = container.querySelector("[data-reminder-comment]")!.getAttribute("data-reminder-comment");
    act(() => root.unmount());
    mount(<SpiritualReminderView itemId="virtue:8" onClose={() => {}} />);
    const second = container.querySelector("[data-reminder-comment]")!.getAttribute("data-reminder-comment");
    expect(second).not.toBe(first);
    expect(item.comments.map((c) => c.id)).toContain(second);
  });

  it("'Next' never shows the item just seen", async () => {
    mount(<SpiritualReminderView itemId="hadith:bukhari-6116" onClose={() => {}} />);
    const seen = new Set<string>(["hadith:bukhari-6116"]);
    for (let i = 0; i < 5; i++) {
      await click([...container.querySelectorAll("button")].find((b) => b.textContent?.includes("التالي"))!);
      const id = container.querySelector("[data-spiritual-reminder]")!.getAttribute("data-spiritual-reminder")!;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it("the heart saves the item with its comment, shows it, and a second tap removes it", async () => {
    const item = findReminderItem("hadith:muslim-2564")!;
    mount(<SpiritualReminderView itemId={item.id} commentId={item.comments[1].id} onClose={() => {}} />);
    const heart = container.querySelector<HTMLButtonElement>("[data-reminder-favorite]")!;
    expect(heart.getAttribute("aria-pressed")).toBe("false");
    await click(heart);
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[role=status]")!.textContent).toBe("أُضيف إلى المفضلة");
    expect(loadFavorites()[0]).toMatchObject({ key: item.id, textAr: item.textAr, comment: { id: item.comments[1].id } });
    await click(heart);
    expect(isFavorite(item.id)).toBe(false);
    expect(heart.getAttribute("aria-pressed")).toBe("false");
  });

  it("labels poetry as poetry, with its poet and an uncertain attribution flagged", () => {
    mount(<SpiritualReminderView itemId="poetry:nazila-faraj" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-kind]")!.textContent).toBe("من الشعر");
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain("الشاعر");
    expect(container.querySelector("[data-reminder-poetry-note]")!.textContent).toContain("غير مقطوعٍ بها");
  });

  it("labels a Qur'anic dua as Qur'an", () => {
    mount(<SpiritualReminderView itemId="dua:q-23-118" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-kind]")!.textContent).toBe("دعاء من القرآن");
  });
});

describe("Settings → Favorites", () => {
  it("opens a widget favorite exactly as the widget does: same id, comment and full reminder view", async () => {
    const item = findReminderItem("virtue:8")!;
    addFavorite(favoriteFromItem(item, item.comments[1], "widget"));
    const requests: OpenReminderRequest[] = [];
    const unsubscribe = subscribeOpenReminderRequests((r) => requests.push(r));
    mount(<FavoritesView onBack={() => {}} />);
    await click(container.querySelector('[data-favorite-open="virtue:8"]')!);
    unsubscribe();
    expect(requests).toHaveLength(1);
    expect(requests[0].id).toBe("virtue:8");
    expect(requests[0].commentId).toBe(item.comments[1].id);
    // The app's own item opens (full evidence and reflection), with the comment that was saved.
    const opened = resolveOpenedReminder(requests[0].id, requests[0].commentId, requests[0].shown, "ar")!;
    expect(opened.from).toBe("library");
    expect(opened.item.id).toBe("virtue:8");
    expect(opened.comment?.id).toBe(item.comments[1].id);
    act(() => root.unmount());
    mount(<SpiritualReminderView itemId={requests[0].id} commentId={requests[0].commentId} shownAs={requests[0].shown} onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-comment]")!.getAttribute("data-reminder-comment")).toBe(item.comments[1].id);
  });

  it("a favorite whose library text changed since opens as it was saved", () => {
    const item = findReminderItem("virtue:8")!;
    addFavorite({ ...favoriteFromItem(item, undefined, "widget"), textAr: "نص محفوظ قديم" });
    const entry = loadFavorites()[0];
    const request = { id: entry.key, commentId: null, shown: { category: entry.category, title: "", text: entry.textAr, meaning: "", detail: "", source: entry.sourceAr, commentText: null } };
    const opened = resolveOpenedReminder(request.id, request.commentId, request.shown, "ar")!;
    expect(opened.from).toBe("as-shown");
    expect(opened.item.textAr).toBe("نص محفوظ قديم");
    expect(opened.item.id).toBe("virtue:8");
  });

  it("explains how to add favorites when there are none", () => {
    mount(<FavoritesView onBack={() => {}} />);
    expect(container.querySelector("[data-favorites-empty]")!.textContent).toContain("لا يوجد شيء في المفضلة بعد");
  });

  it("lists saved items with the original text, and opens them in full with source, grade and comment", async () => {
    const item = findReminderItem("hadith:tirmidhi-2346")!;
    addFavorite(favoriteFromItem(item, item.comments[0], "widget"));
    mount(<FavoritesView onBack={() => {}} />);
    const card = container.querySelector(`[data-favorite-item='${item.id}']`)!;
    expect(card.textContent).toContain(item.textAr);
    expect(card.textContent).toContain("حُفظ من الودجت");
    await click([...card.querySelectorAll("button")].find((b) => b.textContent === "قراءة كاملة")!);
    const details = card.querySelector("[data-favorite-details]")!;
    expect(details.textContent).toContain("سنن الترمذي");
    expect(details.textContent).toContain(item.comments[0].ar);
    expect(details.textContent).toContain("تأمّل دِثار");
  });

  it("removes an item", async () => {
    const item = findReminderItem("poetry:busti-ihsan")!;
    addFavorite(favoriteFromItem(item, undefined, "app"));
    mount(<FavoritesView onBack={() => {}} />);
    await click(container.querySelector(`[data-favorite-remove='${item.id}']`)!);
    expect(isFavorite(item.id)).toBe(false);
    expect(container.querySelector("[data-favorites-empty]")).not.toBeNull();
  });

  it("also shows — and can remove — duas hearted in the written library", async () => {
    const dua = MISC_DUAS[0];
    saveMiscFavorites(new Set([dua.id]));
    mount(<FavoritesView onBack={() => {}} />);
    expect(container.textContent).toContain(dua.text_ar);
    await click(container.querySelector(`[data-favorite-remove='library:${dua.id}']`)!);
    expect(loadMiscFavorites().has(dua.id)).toBe(false);
  });

  it("keeps saved items across a language change: English labels, the Arabic text untouched", async () => {
    const item = findReminderItem("hadith:muslim-2564")!;
    addFavorite(favoriteFromItem(item, item.comments[0], "app"));
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount(<FavoritesView onBack={() => {}} />);
    const card = container.querySelector(`[data-favorite-item='${item.id}']`)!;
    expect(card.textContent).toContain(item.textAr);
    await click([...card.querySelectorAll("button")].find((b) => b.textContent === "Read in full")!);
    expect(card.textContent).toContain(item.meaningEn!);
    expect(card.textContent).toContain(item.comments[0].en);
    expect(card.textContent).toContain("Sahih Muslim");
  });
});
