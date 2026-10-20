// @vitest-environment jsdom
// The Qur'an reader and the Home screen's Qur'an and player cards.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { QuranReaderScreen } from "./QuranReaderScreen";
import { QuranContinueCard } from "./QuranContinueCard";
import { HomeAudioPlayer } from "./HomeAudioPlayer";
import { QURAN_VERSES } from "../lib/quranText";
import { QURAN_ZOOM_FIT, isQuranBookmarked, loadQuranPosition, loadQuranZoom, resetQuranReadingCacheForTesting, saveQuranPosition, toggleQuranBookmark } from "../lib/quranReading";
import { MUSHAF_SHOWN_BOX, pageOf, pageVerses } from "../lib/quranMeta";
import { rememberLastPlayed, resetLastPlayedForTesting } from "../lib/lastPlayedDhikr";
import { pageTurnTooSlow, resetPageTurnPerformanceForTesting } from "../lib/pageTurnPerformance";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE_ASPECT = (() => {
  const [, , w, h] = MUSHAF_SHOWN_BOX.split(" ").map(Number);
  return w / h;
})();

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function mount(node: ReactNode) {
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

beforeEach(() => {
  localStorage.clear();
  resetQuranReadingCacheForTesting();
  resetLastPlayedForTesting();
  resetPageTurnPerformanceForTesting();
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Home Qur'an card", () => {
  it("welcomes a first-time reader and starts at the beginning of the Qur'an", () => {
    const onOpen = vi.fn();
    mount(<QuranContinueCard onOpen={onOpen} />);
    const card = container.querySelector("[data-home-quran]")!;
    expect(card.getAttribute("data-home-quran")).toBe("start");
    expect(card.textContent).toContain("القرآن الكريم");
    expect(card.querySelector("[data-home-quran-action]")!.textContent).toBe("ابدأ القراءة");
    click(card);
    expect(onOpen).toHaveBeenCalledWith({ surah: 1, ayah: 1 });
  });

  it("shows the last place read — surah, verse and Mushaf page — and opens exactly there", () => {
    saveQuranPosition(2, 255);
    const onOpen = vi.fn();
    mount(<QuranContinueCard onOpen={onOpen} />);
    const card = container.querySelector("[data-home-quran]")!;
    expect(card.textContent).toContain("متابعة القراءة");
    expect(card.querySelector("[data-home-quran-surah]")!.textContent).toBe("سورة البقرة");
    expect(card.querySelector("[data-home-quran-detail]")!.textContent).toBe("الآية ٢٥٥ · صفحة ٤٢");
    expect(card.querySelector("[data-home-quran-action]")!.textContent).toBe("متابعة القراءة");
    click(card);
    expect(onOpen).toHaveBeenCalledWith({ surah: 2, ayah: 255 });
  });

  it("updates as soon as the position changes", () => {
    mount(<QuranContinueCard onOpen={() => {}} />);
    act(() => saveQuranPosition(18, 10));
    expect(container.querySelector("[data-home-quran]")!.getAttribute("data-home-quran")).toBe("18:10");
  });
});

// The reader fetches each page's verse shapes from the bundled assets
// (public/mushaf/hafs-kfqc/json); here they are read from those same files.
const PAGE_JSON = import.meta.glob<unknown>("/public/mushaf/hafs-kfqc/json/*.json", { eager: true, import: "default" });
function stubPageFetch() {
  vi.stubGlobal("fetch", async (url: string) => {
    const file = `/public/mushaf/hafs-kfqc/json/${String(url).split("/").pop()}`;
    const data = PAGE_JSON[file];
    return data ? { ok: true, status: 200, json: async () => data } : { ok: false, status: 404, json: async () => null };
  });
}
/** Lets the page's verse shapes arrive. */
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

describe("Qur'an reader (one page of the 1441H Madinah Mushaf at a time)", () => {
  beforeEach(stubPageFetch);
  afterEach(() => vi.unstubAllGlobals());

  const shownVerses = () => [...container.querySelectorAll<SVGElement>("[data-verse]")].map((e) => e.dataset.verse);
  const current = () => container.querySelector("[data-quran-current]")!.getAttribute("data-quran-current");
  const shownPage = () => container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page");
  const pageImage = () => container.querySelector("[data-quran-page-image]")!.getAttribute("href");
  const range = (s: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${s}:${from + i}`);
  const swipe = (dx: number) => {
    const area = container.querySelector("[data-quran-swipe]")!;
    const touchEvent = (type: string, x: number) => Object.assign(new Event(type, { bubbles: true }), { touches: type === "touchend" ? [] : [{ clientX: x, clientY: 300 }], changedTouches: [{ clientX: x, clientY: 300 }] });
    act(() => {
      area.dispatchEvent(touchEvent("touchstart", 200));
      area.dispatchEvent(touchEvent("touchend", 200 + dx));
    });
  };
  const open = async (surah: number, ayah: number) => {
    mount(<QuranReaderScreen start={{ surah, ayah }} onBack={() => {}} />);
    await settle();
  };

  it("opens at a verse on its page — the edition's own page image, with a tappable shape for each verse on it — and saves the position", async () => {
    await open(2, 255);
    expect(shownPage()).toBe("42");
    expect(pageImage()).toBe("/mushaf/hafs-kfqc/svg/042.svg");
    // Shown: the text block with a slim margin (MUSHAF_SHOWN_BOX) of the page's 345 × 550 artwork, which is laid out whole —
    // framed, never moved within itself — so the verse shapes (same viewBox) stay exactly on their words.
    expect(container.querySelector("[data-quran-art]")!.getAttribute("viewBox")).toBe(MUSHAF_SHOWN_BOX);
    expect(container.querySelector("[data-quran-hits]")!.getAttribute("viewBox")).toBe(MUSHAF_SHOWN_BOX);
    const image = container.querySelector("[data-quran-page-image]")!;
    expect([image.getAttribute("x"), image.getAttribute("y"), image.getAttribute("width"), image.getAttribute("height")]).toEqual(["0", "0", "345", "550"]);
    expect(shownVerses()).toEqual(["2:253", "2:254", "2:255", "2:256"]);
    // Screen readers get the verse's words: Tanzil's text, verbatim.
    expect(container.querySelector("[data-verse='2:255'] title")!.textContent).toBe(QURAN_VERSES[1][254]);
    expect(current()).toBe("2:255");
    expect(container.querySelector("[data-verse='2:255']")!.hasAttribute("data-target")).toBe(true);
    expect(container.querySelector("[data-quran-folio]")!.textContent).toBe("٤٢");
    expect(container.querySelector("[data-quran-page-of]")!.textContent).toBe("٤٢ / ٦٠٤");
    expect(container.querySelector("[data-quran-page-of]")!.getAttribute("aria-label")).toBe("صفحة ٤٢ من ٦٠٤");
    expect(container.querySelector("[data-quran-juz]")!.getAttribute("data-quran-juz")).toBe("3");
    expect(loadQuranPosition()).toMatchObject({ surah: 2, ayah: 255 });
  });

  it("shows the 1441H print's pages: 1, 2, 3, 586, 590 and 604", async () => {
    await open(1, 1);
    expect(shownVerses()).toEqual(range(1, 1, 7));
    // The opening pages are the decorated opening (public/mushaf/hafs-kfqc-opening/composed: the design
    // reference's frame with quran-svg's own text in its medallion), each in its own pixel box; the artwork,
    // and the verse shapes placed on it by the text's own transform, share that box.
    expect(pageImage()).toBe("/mushaf/hafs-kfqc-opening/composed/001.svg");
    // Shown: the whole page, frame edge to frame edge; the verse shapes share that box.
    expect(container.querySelector("[data-quran-art]")!.getAttribute("viewBox")).toBe("0 0 1432 2188");
    expect(container.querySelector("[data-quran-hits]")!.getAttribute("viewBox")).toBe("0 0 1432 2188");
    // The image itself is laid out whole, at its own size.
    const image = container.querySelector("[data-quran-page-image]")!;
    expect([image.getAttribute("x"), image.getAttribute("y"), image.getAttribute("width"), image.getAttribute("height")]).toEqual(["0", "0", "1432", "2188"]);
    expect(image.getAttribute("clip-path")).toBe("url(#dithar-mushaf-shown-1)");
    expect(container.querySelector("[data-quran-hits] > g")!.getAttribute("transform")).toMatch(/^matrix\(/);
    // No surah-heading frame on the opening pages: their own cartouches are part of the artwork.
    expect(container.querySelector("[data-surah-heading]")).toBeNull();
    click(container.querySelector("[data-quran-next-page]")!);
    await settle();
    expect(pageImage()).toBe("/mushaf/hafs-kfqc-opening/composed/002.svg");
    expect(container.querySelector("[data-quran-art]")!.getAttribute("viewBox")).toBe("0 0 1432 2188");
    expect(shownVerses()).toEqual(range(2, 1, 5));
    click(container.querySelector("[data-quran-next-page]")!);
    await settle();
    expect(pageImage()).toBe("/mushaf/hafs-kfqc/svg/003.svg");
    expect(shownVerses()).toEqual(range(2, 6, 16));
    act(() => root.unmount());
    // Where the 1441H print differs from the older one: page 586 starts at 80:41, page 590 at 84:25.
    await open(81, 1);
    expect(shownPage()).toBe("586");
    expect(shownVerses()[0]).toBe("80:41");
    act(() => root.unmount());
    await open(85, 1);
    expect(shownPage()).toBe("590");
    expect(shownVerses()).toEqual(["84:25", ...range(85, 1, 22)]);
    act(() => root.unmount());
    await open(114, 6);
    expect(shownPage()).toBe("604");
    expect(shownVerses()).toEqual([...range(112, 1, 4), ...range(113, 1, 5), ...range(114, 1, 6)]);
    // Each surah's title in its ornamental frame, drawn behind the artwork, in order, out of the reading order.
    const headings = container.querySelector("[data-quran-headings]")!;
    expect([...headings.querySelectorAll("[data-surah-heading]")].map((h) => h.getAttribute("data-surah-heading"))).toEqual(["112", "113", "114"]);
    expect(headings.getAttribute("aria-hidden")).toBe("true");
    expect(headings.compareDocumentPosition(container.querySelector("[data-quran-page-image]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector<HTMLButtonElement>("[data-quran-next-page]")!.disabled).toBe(true);
  });

  it("turns pages with the buttons and with a swipe, saving the page's first verse, and stops at the first and last page", async () => {
    await open(1, 1);
    expect(container.querySelector<HTMLButtonElement>("[data-quran-prev-page]")!.disabled).toBe(true);
    click(container.querySelector("[data-quran-next-page]")!);
    await settle();
    expect(shownPage()).toBe("2");
    expect(shownVerses()[0]).toBe("2:1");
    expect(loadQuranPosition()).toMatchObject({ surah: 2, ayah: 1 });
    swipe(120); // finger drawn to the right: the next page, as in a printed Mushaf
    expect(shownPage()).toBe("3");
    expect(current()).toBe("2:6");
    swipe(-120);
    expect(shownPage()).toBe("2");
    swipe(20); // too short: not a page turn
    expect(shownPage()).toBe("2");
    click(container.querySelector("[data-quran-prev-page]")!);
    expect(shownPage()).toBe("1");
  });

  it("crosses from one surah into the next, the header following the reading position", async () => {
    await open(2, 283);
    expect(shownPage()).toBe("49");
    expect(shownVerses().at(-1)).toBe("2:286");
    click(container.querySelector("[data-quran-next-page]")!);
    await settle();
    expect(shownPage()).toBe("50");
    expect(container.querySelector("[data-quran-title]")!.textContent).toBe("سورة آل عمران");
    expect(current()).toBe("3:1");
  });

  it("goes straight to a typed page, a surah, or a verse", async () => {
    await open(1, 1);
    const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!.call(el, value);
        el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
      });
    click(container.querySelector("[data-quran-open-goto]")!);
    setValue(container.querySelector<HTMLInputElement>("[data-quran-goto-page]")!, "187");
    click(container.querySelector("[data-quran-goto-page-submit]")!);
    expect(shownPage()).toBe("187");
    expect(current()).toBe("9:1");
    click(container.querySelector("[data-quran-open-goto]")!);
    setValue(container.querySelector<HTMLSelectElement>("[data-quran-goto-surah]")!, "18");
    click(container.querySelector("[data-quran-goto-surah-open]")!);
    expect(shownPage()).toBe("293");
    expect(current()).toBe("18:1");
    click(container.querySelector("[data-quran-open-goto]")!);
    setValue(container.querySelector<HTMLSelectElement>("[data-quran-goto-surah]")!, "36");
    setValue(container.querySelector<HTMLSelectElement>("[data-quran-goto]")!, "58");
    expect(current()).toBe("36:58");
    expect(shownPage()).toBe(String(pageOf(36, 58)));
    expect(container.querySelector("[data-quran-panel]")).toBeNull();
  });

  it("credits the edition and its sources: the King Fahd Complex on every page, quran-svg and Tanzil (with its full notice) in About", async () => {
    await open(1, 1);
    const footer = container.querySelector("[data-quran-attribution]")!;
    expect(footer.textContent).toContain("مجمع الملك فهد");
    click([...footer.querySelectorAll("button")].find((b) => b.textContent === "عن هذا المصحف")!);
    const about = container.querySelector("[data-quran-panel='about']")!;
    expect(about.textContent).toContain("١٤٤١هـ");
    expect(about.textContent).toContain("CC BY 4.0");
    expect([...about.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["https://github.com/quran-ws/quran-svg", "https://tanzil.net"]);
    expect(container.querySelector("[data-quran-notice]")!.textContent).toContain("CHANGING IT IS NOT ALLOWED");
  });

  it("bookmarks a long-pressed verse (which becomes the reading position), and zooms the page (remembered)", async () => {
    await open(36, 1);
    // A long press (Android's long press is a "contextmenu"): a tap only shows or hides the controls.
    act(() => void container.querySelector("[data-verse='36:12']")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })));
    expect(loadQuranPosition()).toMatchObject({ surah: 36, ayah: 12 });
    expect(container.querySelector("[data-verse='36:12']")!.hasAttribute("data-selected")).toBe(true);
    click(container.querySelector("[data-quran-select-bookmark]")!);
    expect(isQuranBookmarked(36, 12)).toBe(true);
    expect(loadQuranZoom()).toBe(QURAN_ZOOM_FIT);
    expect(container.querySelector("[data-quran-zoom]")).toBeNull(); // the full controls are in the settings panel
    click(container.querySelector("[data-quran-open-settings]")!);
    expect(container.querySelector<HTMLButtonElement>("[data-quran-zoom='out']")!.disabled).toBe(true);
    click(container.querySelector("[data-quran-zoom='in']")!);
    expect(loadQuranZoom()).toBeGreaterThan(QURAN_ZOOM_FIT);
    expect(container.querySelector("[data-quran-area]")!.hasAttribute("data-zoomed")).toBe(true);
    swipe(120); // a zoomed page pans under the finger: no page turn
    expect(shownPage()).toBe("440");
    click(container.querySelector("[data-quran-zoom='fit']")!);
    expect(loadQuranZoom()).toBe(QURAN_ZOOM_FIT);
    expect(container.querySelector("[data-quran-area]")!.hasAttribute("data-zoomed")).toBe(false);
  });

  it("says so when a page's image can't be loaded", async () => {
    await open(2, 6);
    act(() => void container.querySelector("[data-quran-page-image]")!.dispatchEvent(new Event("error")));
    expect(container.querySelector("[data-quran-load-error]")!.textContent).toBe("تعذّر تحميل صفحة المصحف.");
  });

  it("opens a bookmark from the index on its page", async () => {
    saveQuranPosition(1, 1);
    await open(1, 1);
    act(() => void toggleQuranBookmark(18, 10));
    click(container.querySelector("[data-quran-open-settings]")!);
    click(container.querySelector("[data-quran-open-index]")!);
    click(container.querySelector("[data-quran-bookmark='18:10']")!);
    expect(current()).toBe("18:10");
    expect(shownPage()).toBe(String(pageOf(18, 10)));
  });

  it("across all 604 pages, shows each page's own image and every one of the 6,236 verses exactly once, on the page the edition puts it", async () => {
    await open(1, 1);
    const seen = new Map<string, number>();
    const next = container.querySelector<HTMLButtonElement>("[data-quran-next-page]")!;
    for (let page = 1; page <= 604; page++) {
      expect(shownPage()).toBe(String(page));
      expect(pageImage()).toBe(page <= 2 ? `/mushaf/hafs-kfqc-opening/composed/00${page}.svg` : `/mushaf/hafs-kfqc/svg/${String(page).padStart(3, "0")}.svg`);
      const keys = shownVerses();
      expect(keys, `page ${page}`).toEqual(pageVerses(page).map(([s, a]) => `${s}:${a}`));
      for (const key of keys) {
        const [s, a] = key!.split(":").map(Number);
        expect(container.querySelector(`[data-verse='${key}'] title`)!.textContent).toBe(QURAN_VERSES[s - 1][a - 1]);
        seen.set(key!, (seen.get(key!) ?? 0) + 1);
      }
      if (page < 604) {
        click(next);
        await settle();
      }
    }
    expect(seen.size).toBe(6236);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  }, 120_000);

  it("lists all 114 surahs, finds one by name, and opens it at its first verse", () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    expect(container.querySelectorAll("[data-quran-surah]")).toHaveLength(114);
    const search = container.querySelector<HTMLInputElement>("[data-quran-search]")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "الكهف");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const found = container.querySelectorAll("[data-quran-surah]");
    expect(found).toHaveLength(1);
    click(found[0]);
    expect(current()).toBe("18:1");
    expect(shownPage()).toBe("293");
  });

  it("browses by Juz: all 30, each opened where it begins", () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    expect(container.querySelector("[data-quran-browse]")!.getAttribute("data-quran-browse")).toBe("surah");
    click(container.querySelector("[data-quran-browse-tab='juz']")!);
    expect(container.querySelectorAll("[data-quran-surah]")).toHaveLength(0);
    const juzs = container.querySelectorAll("[data-quran-juz-item]");
    expect(juzs).toHaveLength(30);
    expect(juzs[1].textContent).toContain("الجزء ٢");
    expect(juzs[1].textContent).toContain("سورة البقرة");
    expect(juzs[1].textContent).toContain("الآية ١٤٢");
    expect(juzs[29].textContent).toContain("سورة النبأ");
    click(container.querySelector("[data-quran-browse-tab='surah']")!);
    expect(container.querySelectorAll("[data-quran-surah]")).toHaveLength(114);
    click(container.querySelector("[data-quran-browse-tab='juz']")!);
    click(container.querySelector("[data-quran-juz-item='15']")!);
    expect(current()).toBe("17:1");
    expect(shownPage()).toBe(String(pageOf(17, 1)));
    expect(container.querySelector("[data-quran-juz]")!.getAttribute("data-quran-juz")).toBe("15");
  });

  const type = (el: HTMLInputElement, value: string) =>
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("searches the verses from the index — a word, or a whole verse typed without its marks — and opens a result on its page", async () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    const search = container.querySelector<HTMLInputElement>("[data-quran-search]")!;
    type(search, "الله لا إله إلا هو الحي القيوم");
    await settle();
    expect(container.querySelectorAll("[data-quran-surah]")).toHaveLength(0);
    const results = [...container.querySelectorAll("[data-quran-result]")].map((r) => r.getAttribute("data-quran-result"));
    expect(results).toEqual(["2:255", "3:2"]);
    const first = container.querySelector("[data-quran-result='2:255']")!;
    expect(first.textContent).toContain("سورة البقرة · الآية ٢٥٥ · صفحة ٤٢");
    // The verse as written, its matched words marked.
    expect(first.querySelectorAll("[data-quran-result-match]")).toHaveLength(7);
    expect(first.querySelector(".dithar-quran-verse-text")!.textContent).toBe(QURAN_VERSES[1][254]);
    click(first);
    expect(current()).toBe("2:255");
    expect(shownPage()).toBe("42");
  });

  it("a short query asks for more; a word with many verses shows them fifty at a time", async () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    const search = container.querySelector<HTMLInputElement>("[data-quran-search]")!;
    type(search, "ر");
    await settle();
    expect(container.querySelectorAll("[data-quran-result]")).toHaveLength(0);
    type(search, "الصلاة");
    await settle();
    const total = Number(container.querySelector("[data-quran-results]")!.getAttribute("data-quran-results"));
    expect(total).toBeGreaterThan(50);
    expect(container.querySelectorAll("[data-quran-result]")).toHaveLength(50);
    click(container.querySelector("[data-quran-results-more]")!);
    expect(container.querySelectorAll("[data-quran-result]")).toHaveLength(Math.min(100, total));
  });

  it("searches from within the reader too, and opens the verse found", async () => {
    await open(1, 1);
    click(container.querySelector("[data-quran-open-search]")!);
    const input = container.querySelector<HTMLInputElement>("[data-quran-verse-search]")!;
    type(input, "قل هو الله أحد");
    await settle();
    click(container.querySelector("[data-quran-result='112:1']")!);
    expect(container.querySelector("[data-quran-panel]")).toBeNull();
    expect(current()).toBe("112:1");
    expect(shownPage()).toBe("604");
  });

  it("puts the page number at the page's outer corner: bottom right on right-hand (odd) pages, bottom left on left-hand (even) ones", async () => {
    await open(1, 1);
    const folio = () => container.querySelector("[data-quran-folio]")!;
    expect(folio().textContent).toBe("١");
    expect(folio().getAttribute("data-quran-folio-side")).toBe("right");
    click(container.querySelector("[data-quran-next-page]")!);
    expect(folio().textContent).toBe("٢");
    expect(folio().getAttribute("data-quran-folio-side")).toBe("left");
    click(container.querySelector("[data-quran-next-page]")!);
    expect(folio().getAttribute("data-quran-folio-side")).toBe("right");
  });
});

describe("Home dhikr player", () => {
  it("before anything was played, says what will appear — no button, no shortcut", () => {
    mount(<HomeAudioPlayer />);
    expect(container.querySelector("[data-home-player]")!.getAttribute("data-home-player")).toBe("empty");
    expect(container.querySelector("[data-home-player-empty]")).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("when idle, shows the last dhikr listened to, ready to play again", () => {
    rememberLastPlayed({ collection: "morning", itemId: "morning_005", titleAr: "سيد الاستغفار", titleEn: "The master of seeking forgiveness" });
    mount(<HomeAudioPlayer />);
    expect(container.querySelector("[data-home-player]")!.getAttribute("data-home-player")).toBe("last");
    expect(container.querySelector("[data-home-player-last]")!.textContent).toBe("سيد الاستغفار");
    expect(container.querySelector("[data-home-player-replay]")).not.toBeNull();
  });
});

describe("Qur'an reader — header Home button", () => {
  beforeEach(stubPageFetch);
  afterEach(() => vi.unstubAllGlobals());

  it("a compact Home button (where the back arrow was) opens the Qur'an section's main screen, the surah index", () => {
    const onBack = vi.fn();
    mount(<QuranReaderScreen start={{ surah: 2, ayah: 6 }} onBack={onBack} />);
    expect(container.querySelector("[data-quran-mushaf-page]")).not.toBeNull();
    const home = container.querySelector<HTMLButtonElement>("[data-quran-home]")!;
    expect(home).not.toBeNull();
    expect(home.getAttribute("aria-label")).toBe("صفحة القرآن الرئيسية");
    expect(home.querySelector(".lucide-house, .lucide-home")).not.toBeNull();
    // It is the first control in the header: the top-right corner in Arabic, where the back arrow was.
    expect(container.querySelector("header")!.firstElementChild).toBe(home);
    act(() => home.click());
    expect(container.querySelector("[data-quran-index]")).not.toBeNull();
    expect(container.querySelector("[data-quran-mushaf-page]")).toBeNull();
    // It stays in the Qur'an section: the app-level Back is not triggered.
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe("Qur'an reader — immersive full-screen reading", () => {
  beforeEach(stubPageFetch);
  afterEach(() => vi.unstubAllGlobals());

  // jsdom lays nothing out: the reading area's size is set here, and a stub ResizeObserver lets a
  // test "rotate" the phone (the reader measures its area through it).
  let size = { w: 400, h: 820 };
  let resized: (() => void) | null = null;
  beforeEach(() => {
    size = { w: 400, h: 820 };
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          resized = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-quran-area") ? size.w : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-quran-area") ? size.h : 0;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const rotate = (w: number, h: number) => {
    size = { w, h };
    act(() => resized?.());
  };
  const page = () => container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page");
  /** The current page's sheet (neighbouring pages are drawn too, in the continuous scroll). */
  const sheet = (p = page()) => {
    const el = container.querySelector<HTMLElement>(`[data-quran-sheet="${p}"]`)!;
    return { w: parseFloat(el.style.width), h: parseFloat(el.style.height) };
  };
  const leafTop = (p: string | number) => parseFloat(container.querySelector<HTMLElement>(`[data-quran-leaf="${p}"]`)!.style.top);
  const controls = () => container.querySelector("[data-quran-reader]")!.getAttribute("data-quran-controls");
  const stage = () => container.querySelector("[data-quran-swipe]")!;
  const current = () => container.querySelector("[data-quran-current]")!.getAttribute("data-quran-current");
  const open = async (surah: number, ayah: number) => {
    mount(<QuranReaderScreen start={{ surah, ayah }} onBack={() => {}} />);
    await settle();
  };
  const longPress = (sel: string) => act(() => void container.querySelector(sel)!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })));

  it("is drawn outside the app's phone frame, across the whole screen", async () => {
    await open(2, 255);
    expect(container.querySelector(".device-frame")).toBeNull();
    expect(container.querySelector(".dithar-quran-immersive")).not.toBeNull();
  });

  it("reads with the controls hidden; a tap shows them over the page, a second tap — even on a verse — hides them, and nothing else changes", async () => {
    await open(36, 1);
    expect(controls()).toBe("hidden");
    expect(container.querySelector("header")!.hasAttribute("inert")).toBe(true);
    expect(container.querySelector("[data-quran-tap-hint]")).not.toBeNull();
    const before = { page: page(), current: current(), top: leafTop(page()!), sheet: sheet() };
    click(stage());
    expect(controls()).toBe("shown");
    click(container.querySelector("[data-verse='36:12']")!);
    expect(controls()).toBe("hidden");
    expect(container.querySelector("[data-verse][data-selected]")).toBeNull();
    // Shown or hidden, the controls take no room: the pages stay exactly where they were.
    expect({ page: page(), current: current(), top: leafTop(page()!), sheet: sheet() }).toEqual(before);
    expect(container.querySelector<HTMLElement>("[data-quran-area]")!.style.paddingTop).toBe("");
  });

  it("a long press selects a verse — it becomes the reading position — and shows the controls", async () => {
    await open(36, 1);
    longPress("[data-verse='36:12']");
    expect(container.querySelector("[data-verse='36:12']")!.hasAttribute("data-selected")).toBe(true);
    expect(current()).toBe("36:12");
    expect(loadQuranPosition()).toMatchObject({ surah: 36, ayah: 12 });
    expect(controls()).toBe("shown");
    // The tap that ends a long press doesn't hide them again.
    click(stage());
    expect(controls()).toBe("shown");
  });

  it("the overlay carries the Surah, Juz, Hizb and page, the bookmark, zoom and the settings", async () => {
    await open(18, 10);
    const info = container.querySelector("[data-quran-current]")!.textContent;
    expect(container.querySelector("[data-quran-title]")!.textContent).toContain("سورة الكهف");
    expect(info).toContain("الجزء ١٥");
    expect(info).toContain("الحزب");
    expect(info).toContain(`صفحة ${["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"].reduce((s, d, i) => s.replaceAll(String(i), d), String(pageOf(18, 10)))}`);
    expect(container.querySelector("[data-quran-bookmark-toggle]")).not.toBeNull();
    click(container.querySelector("[data-quran-quick-zoom='in']")!);
    expect(loadQuranZoom()).toBeGreaterThan(QURAN_ZOOM_FIT);
    click(container.querySelector("[data-quran-quick-zoom='out']")!);
    expect(loadQuranZoom()).toBe(QURAN_ZOOM_FIT);
    click(container.querySelector("[data-quran-open-settings]")!);
    const settings = container.querySelector("[data-quran-panel='settings']")!;
    expect(settings.querySelector("[data-quran-zoom='fit']")).not.toBeNull();
    expect(settings.querySelector("[data-quran-orientation-toggle]")).not.toBeNull();
    expect(settings.querySelector("[data-quran-open-index]")).not.toBeNull();
  });

  it("goes to the previous and next surah", async () => {
    await open(18, 10);
    click(container.querySelector("[data-quran-next-surah]")!);
    await settle();
    expect(current()).toBe("19:1");
    expect(page()).toBe(String(pageOf(19, 1)));
    click(container.querySelector("[data-quran-prev-surah]")!);
    click(container.querySelector("[data-quran-prev-surah]")!);
    await settle();
    expect(current()).toBe("17:1");
    expect(loadQuranPosition()).toMatchObject({ surah: 17, ayah: 1 });
  });

  it("portrait: one whole page fits the screen — as wide as it allows, at its own proportions — and nothing scrolls", async () => {
    await open(2, 6);
    const { w, h } = sheet();
    expect(w).toBe(400);
    expect(Math.abs(w / h - PAGE_ASPECT)).toBeLessThan(0.01);
    expect(h + 18).toBeLessThanOrEqual(820);
    expect(container.querySelectorAll("[data-quran-sheet]")).toHaveLength(1);
    expect(container.querySelector("[data-quran-area]")!.hasAttribute("data-scrollable")).toBe(false);
  });

  it("landscape: the page takes the full width and scrolls vertically — scrolling or a vertical drag never turns the page; a horizontal swipe does", async () => {
    await open(2, 6);
    rotate(820, 380);
    expect(sheet().w).toBe(820);
    const area = container.querySelector<HTMLElement>("[data-quran-area]")!;
    expect(area.hasAttribute("data-scrollable")).toBe(true);
    act(() => {
      area.scrollTop = 500;
      area.dispatchEvent(new Event("scroll"));
    });
    expect(page()).toBe("3");
    // A vertical drag (finger moved 300 px up, a little sideways): no page change.
    const touchEvent = (type: string, x: number, y: number) => Object.assign(new Event(type, { bubbles: true }), { touches: type === "touchend" ? [] : [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });
    act(() => {
      stage().dispatchEvent(touchEvent("touchstart", 400, 350));
      stage().dispatchEvent(touchEvent("touchend", 440, 50));
    });
    expect(page()).toBe("3");
    act(() => {
      stage().dispatchEvent(touchEvent("touchstart", 200, 200));
      stage().dispatchEvent(touchEvent("touchend", 400, 210));
    });
    expect(page()).toBe("4");
  });

  it("rotating keeps the same page, reading position and bookmarks; landscape fills the width at the page's own proportions", async () => {
    await open(2, 255);
    act(() => void toggleQuranBookmark(2, 255));
    const versesBefore = [...container.querySelectorAll<SVGElement>("[data-quran-sheet='42'] [data-verse]")].map((e) => e.dataset.verse);
    rotate(820, 380);
    expect(page()).toBe("42");
    expect([...container.querySelectorAll<SVGElement>("[data-quran-sheet='42'] [data-verse]")].map((e) => e.dataset.verse)).toEqual(versesBefore);
    expect(current()).toBe("2:255");
    const wide = sheet();
    expect(wide.w).toBe(820);
    expect(Math.abs(wide.w / wide.h - PAGE_ASPECT)).toBeLessThan(0.01);
    expect(isQuranBookmarked(2, 255)).toBe(true);
    rotate(400, 820);
    expect(sheet().w).toBe(400);
    expect(current()).toBe("2:255");
  });

  it("landscape always uses the full width — there is no whole-page option to shrink it", async () => {
    // A preference stored by an older version for the removed "whole page" option has no effect.
    localStorage.setItem("dithar:quran:landscape-fit:v1", '"page"');
    await open(2, 6);
    rotate(820, 380);
    expect(sheet().w).toBe(820);
    click(container.querySelector("[data-quran-open-settings]")!);
    expect(container.querySelector("[data-quran-fit]")).toBeNull();
    expect(container.querySelector("[data-quran-zoom='fit']")!.textContent).toBe("ملء العرض");
  });

  describe("turning a page like a Mushaf leaf", () => {
    // The turn is drawn frame by frame: here the frames are run by hand.
    let frames: FrameRequestCallback[] = [];
    let now = 0;
    beforeEach(() => {
      frames = [];
      now = 0;
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
      vi.stubGlobal("cancelAnimationFrame", () => {});
    });
    const runFrames = (ms: number) =>
      act(() => {
        for (let t = 0; t < ms; t += 16) {
          now += 16;
          const due = frames;
          frames = [];
          due.forEach((cb) => cb(now));
        }
      });
    const turnEl = () => container.querySelector<HTMLElement>("[data-quran-turn]");
    const leaf = () => container.querySelector<HTMLElement>(".dithar-mushaf-turn-over > .dithar-mushaf-leaf")!;
    const touch = (type: string, x: number, y = 300) =>
      act(() => void stage().dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: type === "touchend" ? [] : [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] })));

    it("the next page: the page changes at once (position saved) while a copy of the old one turns away over its spine, then is gone", async () => {
      await open(2, 6);
      click(container.querySelector("[data-quran-next-page]")!);
      expect(page()).toBe("4");
      expect(loadQuranPosition()).toMatchObject({ surah: 2, ayah: 17 });
      expect(turnEl()!.getAttribute("data-quran-turn")).toBe("next");
      // The copies are plain images: no second set of verse shapes, page images or numbers for the reader.
      expect(container.querySelectorAll("[data-quran-page-image]")).toHaveLength(1);
      expect(container.querySelectorAll("[data-quran-folio]")).toHaveLength(1);
      expect(turnEl()!.querySelectorAll("[data-verse]")).toHaveLength(0);
      runFrames(160);
      const mid = leaf().style.transform;
      expect(mid).toMatch(/^rotateY\((\d+(\.\d+)?)deg\)/);
      const angle = Number(/rotateY\(([\d.]+)deg\)/.exec(mid)![1]);
      expect(angle).toBeGreaterThan(10);
      expect(angle).toBeLessThanOrEqual(90);
      runFrames(600);
      expect(turnEl()).toBeNull();
      expect(page()).toBe("4");
    });

    it("the previous page comes back over the current one", async () => {
      await open(2, 17);
      click(container.querySelector("[data-quran-prev-page]")!);
      expect(page()).toBe("3");
      expect(turnEl()!.getAttribute("data-quran-turn")).toBe("prev");
      runFrames(800);
      expect(turnEl()).toBeNull();
    });

    it("the leaf follows the finger; let go early it falls back (nothing changes), drawn far enough it turns", async () => {
      await open(2, 6);
      touch("touchstart", 50);
      touch("touchmove", 70);
      touch("touchmove", 110);
      expect(turnEl()!.getAttribute("data-quran-turn")).toBe("next");
      expect(page()).toBe("3"); // not yet: only the leaf has moved
      const small = Number(/rotateY\(([\d.]+)deg\)/.exec(leaf().style.transform)![1]);
      touch("touchmove", 200);
      const larger = Number(/rotateY\(([\d.]+)deg\)/.exec(leaf().style.transform)![1]);
      expect(larger).toBeGreaterThan(small);
      // Back near the start and let go slowly: it falls back.
      touch("touchmove", 60);
      now = 0;
      await new Promise((r) => setTimeout(r, 30));
      touch("touchend", 60);
      runFrames(600);
      expect(turnEl()).toBeNull();
      expect(page()).toBe("3");
      expect(loadQuranPosition()).toMatchObject({ surah: 2, ayah: 6 });
      // Drawn past a quarter of the page and let go: the page turns.
      touch("touchstart", 20);
      touch("touchmove", 40);
      touch("touchmove", 260);
      touch("touchend", 260);
      expect(page()).toBe("4");
      runFrames(600);
      expect(turnEl()).toBeNull();
      // Drawn to the left: the previous page.
      touch("touchstart", 380);
      touch("touchmove", 360);
      touch("touchmove", 100);
      expect(turnEl()!.getAttribute("data-quran-turn")).toBe("prev");
      touch("touchend", 100);
      expect(page()).toBe("3");
    });

    it("a vertical drag never lifts the leaf; a zoomed page changes without the turn", async () => {
      await open(2, 6);
      touch("touchstart", 200, 600);
      touch("touchmove", 210, 560);
      touch("touchmove", 220, 300);
      touch("touchend", 220, 300);
      expect(turnEl()).toBeNull();
      expect(page()).toBe("3");
      click(container.querySelector("[data-quran-quick-zoom='in']")!);
      click(container.querySelector("[data-quran-next-page]")!);
      expect(page()).toBe("4");
      expect(turnEl()).toBeNull();
    });

    it("a device too slow to draw the turn: it ends at once, and from then on pages simply change", async () => {
      await open(2, 6);
      click(container.querySelector("[data-quran-next-page]")!);
      expect(page()).toBe("4");
      expect(turnEl()).not.toBeNull();
      // Frames 400 ms apart (no GPU, say).
      act(() => {
        for (let i = 0; i < 5; i++) {
          now += 400;
          const due = frames;
          frames = [];
          due.forEach((cb) => cb(now));
        }
      });
      expect(turnEl()).toBeNull();
      expect(pageTurnTooSlow()).toBe(true);
      expect(page()).toBe("4");
      click(container.querySelector("[data-quran-next-page]")!);
      expect(page()).toBe("5");
      expect(turnEl()).toBeNull();
      // A swipe still turns the page.
      touch("touchstart", 50);
      touch("touchmove", 80);
      touch("touchmove", 250);
      expect(turnEl()).toBeNull();
      touch("touchend", 250);
      expect(page()).toBe("6");
    });

    it("with reduced motion the page simply changes", async () => {
      vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
      await open(2, 6);
      click(container.querySelector("[data-quran-next-page]")!);
      expect(page()).toBe("4");
      expect(turnEl()).toBeNull();
    });
  });

  it("a short phone (portrait): the whole page still fits — fitted to the height, never cut, never stretched", async () => {
    size = { w: 360, h: 520 };
    await open(2, 6);
    const { w, h } = sheet();
    expect(w).toBeLessThan(360);
    expect(h + 18 + 4).toBeLessThanOrEqual(520);
    expect(Math.abs(w / h - PAGE_ASPECT)).toBeLessThan(0.01);
    expect(container.querySelector("[data-quran-area]")!.hasAttribute("data-scrollable")).toBe(false);
  });
});
