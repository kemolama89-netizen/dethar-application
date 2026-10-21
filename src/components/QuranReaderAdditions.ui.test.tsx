// @vitest-environment jsdom
// The Qur'an reader's catchword (the next page's first words), its coloured
// quarter-hizb signs, Juz → Hizb → quarter navigation, a search result kept
// marked, the page-turn sound and its mute, the lightweight page turn, and
// keeping the screen awake while a page is open.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { QuranReaderScreen } from "./QuranReaderScreen";
import { QURAN_VERSES, pageOpeningWords } from "../lib/quranText";
import { JUZ_STARTS, PRINT_QUARTER_STARTS, QUARTER_STARTS, TOTAL_PAGES, pageOf, pageVerses, quarterMarksOnPage, quarterStart } from "../lib/quranMeta";
import { loadQuranTurnSound, resetQuranReadingCacheForTesting } from "../lib/quranReading";
import { markPageTurnTooSlow, resetPageTurnPerformanceForTesting } from "../lib/pageTurnPerformance";
import { resetPageTurnSoundForTesting } from "../lib/pageTurnSound";
import { screenAwakeHoldersForTesting } from "../lib/screenAwake";
import quarterMarks from "../data/quran/kfqc-hafs-1441-quarter-marks.json";
import quranCom from "../lib/__fixtures__/quran-com-rub-el-hizb.json";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot> | null = null;
function mount(node: ReactNode) {
  root = createRoot(container);
  act(() => root!.render(<LanguageProvider>{node}</LanguageProvider>));
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

const PAGE_JSON = import.meta.glob<unknown>("/public/mushaf/hafs-kfqc/json/*.json", { eager: true, import: "default" });

let size = { w: 400, h: 820 };
beforeEach(() => {
  localStorage.clear();
  resetQuranReadingCacheForTesting();
  resetPageTurnPerformanceForTesting();
  resetPageTurnSoundForTesting();
  container = document.createElement("div");
  document.body.appendChild(container);
  vi.stubGlobal("fetch", async (url: string) => {
    const data = PAGE_JSON[`/public/mushaf/hafs-kfqc/json/${String(url).split("/").pop()}`];
    return data ? { ok: true, status: 200, json: async () => data } : { ok: false, status: 404, json: async () => null };
  });
  size = { w: 400, h: 820 };
  vi.stubGlobal(
    "ResizeObserver",
    class {
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
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = async (surah: number, ayah: number) => {
  mount(<QuranReaderScreen start={{ surah, ayah }} onBack={() => {}} />);
  await settle();
};
const shownPage = () => container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page");
const current = () => container.querySelector("[data-quran-current]")!.getAttribute("data-quran-current");
const showControls = () => click(container.querySelector("[data-quran-swipe]")!);

describe("the next page's first words (catchword)", () => {
  it("are taken from the next page itself, never estimated", () => {
    // Page starts of the 1441H print (kfqc-hafs-1441-pages.json) in Tanzil's text, letter for letter
    // (and checked by eye against the pages: «الٓمٓ ذَٰلِكَ», «إِنَّ ٱلَّذِينَ», «وَإِذْ قَالَ», «عَمَّ يَتَسَآءَلُونَ», «قُلْ هُوَ»).
    const words = (s: number, a: number) => QURAN_VERSES[s - 1][a - 1].split(" ");
    // 2:1 is one word (its basmala aside): the next verse on that page goes on.
    expect(pageOpeningWords(2)).toEqual([words(2, 1)[4], words(2, 2)[0]]);
    expect(pageOpeningWords(3)).toEqual(words(2, 6).slice(0, 2));
    expect(pageOpeningWords(6)).toEqual(words(2, 30).slice(0, 2));
    // A surah's first verse: its basmala is not part of it.
    expect(pageOpeningWords(582)).toEqual(words(78, 1).slice(4, 6));
    expect(pageOpeningWords(604)).toEqual(words(112, 1).slice(4, 6));
    expect(pageOpeningWords(TOTAL_PAGES + 1)).toEqual([]);
  });

  it("every page's words begin the first verse that page starts with", () => {
    for (let p = 2; p <= TOTAL_PAGES; p++) {
      const words = pageOpeningWords(p);
      expect(words, `page ${p}`).toHaveLength(2);
      for (const w of words) expect(w, `page ${p}`).toMatch(/[ء-ي]/);
      expect(pageVerses(p).length, `page ${p}`).toBeGreaterThan(0);
    }
  });

  it("are shown under each page — the next page's, and none under the last", async () => {
    await open(2, 25);
    expect(shownPage()).toBe("5");
    expect(container.querySelector("[data-quran-next-cue]")!.getAttribute("data-quran-next-cue")).toBe(pageOpeningWords(6).join(" "));
    showControls();
    click(container.querySelector("[data-quran-next-page]")!);
    expect(container.querySelector("[data-quran-next-cue]")!.getAttribute("data-quran-next-cue")).toBe(pageOpeningWords(7).join(" "));
    act(() => root!.unmount());
    root = null;
    await open(114, 1);
    expect(shownPage()).toBe("604");
    expect(container.querySelector("[data-quran-next-cue]")).toBeNull();
  });
});

describe("quarter-hizb signs (۞)", () => {
  it("are known for every quarter that begins mid-surah, and only those — a quarter that begins a surah has no sign in the text", () => {
    expect(quarterMarks.marks.length + quarterMarks.noSign.length).toBe(240);
    for (const m of quarterMarks.marks) {
      expect(m.ayah, `quarter ${m.quarter}`).toBeGreaterThan(1);
      expect([m.surah, m.ayah], `quarter ${m.quarter}`).toEqual([...PRINT_QUARTER_STARTS[m.quarter - 1]]);
      expect(m.page).toBe(pageOf(m.surah, m.ayah));
      const [x, y, w, h] = m.box;
      // Inside the page's text block, and the size of the sign (about 7 × 7 units).
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(345);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(550);
      expect(w).toBeGreaterThan(5);
      expect(w).toBeLessThan(9);
      expect(m.score).toBeGreaterThanOrEqual(0.8);
    }
    for (const n of quarterMarks.noSign) expect(n.ayah, `quarter ${n.quarter}`).toBe(1);
  });

  it("the print's quarter starts are Quran.com's, everywhere (Tanzil differs at quarter 106 only)", () => {
    const qc = quranCom.quarters;
    expect(PRINT_QUARTER_STARTS.map((s) => s.join(":"))).toEqual(qc.map((r) => r.start.join(":")));
    expect(QUARTER_STARTS[105]).toEqual([15, 50]);
    expect(PRINT_QUARTER_STARTS[105]).toEqual([15, 49]);
  });

  it("are drawn in their own colour over the printed sign, on the page and on no other", async () => {
    expect(quarterMarksOnPage(5).map((m) => m.quarter)).toEqual([2]);
    await open(2, 25);
    const marks = container.querySelectorAll("[data-quran-quarter-mark]");
    expect([...marks].map((m) => m.getAttribute("data-quran-quarter-mark"))).toEqual(["2"]);
    const [x, y] = quarterMarksOnPage(5)[0].box;
    expect(Number(marks[0].getAttribute("x"))).toBeCloseTo(x - 0.6, 5);
    expect(Number(marks[0].getAttribute("y"))).toBeCloseTo(y - 0.6, 5);
    // The colour is masked by the artwork's own ink: the sign's shape, nothing added.
    const mask = container.querySelector(`mask#${marks[0].getAttribute("mask")!.slice(5, -1)}`)!;
    expect(mask.querySelector("image")!.getAttribute("href")).toContain("/mushaf/hafs-kfqc/svg/005.svg");
    act(() => root!.unmount());
    root = null;
    await open(2, 30);
    expect(shownPage()).toBe("6");
    expect(container.querySelectorAll("[data-quran-quarter-mark]")).toHaveLength(0);
  });
});

describe("Juz → Hizb → quarter navigation", () => {
  const openJuzTab = () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    click(container.querySelector("[data-quran-browse-tab='juz']")!);
  };

  it("a Juz shows its two Hizbs with their numbers, a Hizb its four quarters — for all 30", () => {
    openJuzTab();
    for (let juz = 1; juz <= 30; juz++) {
      click(container.querySelector(`[data-quran-juz-item='${juz}']`)!);
      const hizbs = [...container.querySelectorAll(`[data-quran-juz-hizbs='${juz}'] [data-quran-hizb-item]`)].map((e) => Number(e.getAttribute("data-quran-hizb-item")));
      expect(hizbs, `juz ${juz}`).toEqual([2 * juz - 1, 2 * juz]);
      for (const hizb of hizbs) {
        click(container.querySelector(`[data-quran-hizb-item='${hizb}']`)!);
        const quarters = [...container.querySelectorAll(`[data-quran-hizb-quarters='${hizb}'] [data-quran-quarter-item]`)];
        expect(quarters.map((q) => Number(q.getAttribute("data-quran-quarter-item"))), `hizb ${hizb}`).toEqual([1, 2, 3, 4].map((k) => 4 * hizb - 4 + k));
        quarters.forEach((q, k) => expect(q.getAttribute("data-quran-quarter-start")).toBe(PRINT_QUARTER_STARTS[4 * hizb - 4 + k].join(":")));
      }
      // The Juz begins with its first Hizb.
      expect(PRINT_QUARTER_STARTS[(juz - 1) * 8]).toEqual(JUZ_STARTS[juz - 1]);
    }
  });

  for (const quarter of [1, 2, 3, 4, 105, 106, 107, 160, 237, 240]) {
    it(`opening quarter ${quarter} opens the exact verse it begins with, on its page`, async () => {
      openJuzTab();
      const hizb = Math.ceil(quarter / 4);
      click(container.querySelector(`[data-quran-juz-item='${Math.ceil(hizb / 2)}']`)!);
      click(container.querySelector(`[data-quran-hizb-item='${hizb}']`)!);
      click(container.querySelector(`[data-quran-quarter-item='${quarter}']`)!);
      await settle();
      const q = quarterStart(quarter)!;
      expect(current()).toBe(`${q.surah}:${q.ayah}`);
      expect(shownPage()).toBe(String(q.page));
    });
  }
});

describe("a search result", () => {
  it("opens on its verse, kept marked (even a verse 1) with the matched words named, until the page is tapped", async () => {
    mount(<QuranReaderScreen start={null} onBack={() => {}} />);
    const input = container.querySelector<HTMLInputElement>("[data-quran-search]")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "عم يتساءلون");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle();
    const result = container.querySelector("[data-quran-result='78:1']");
    expect(result).not.toBeNull();
    click(result!);
    await settle();
    expect(shownPage()).toBe("582");
    expect(container.querySelector("path[data-found]")!.getAttribute("data-verse")).toBe("78:1");
    expect(container.querySelector("[data-quran-found]")!.textContent).toContain("سورة النبأ");
    showControls();
    expect(container.querySelector("path[data-found]")).toBeNull();
    expect(container.querySelector("[data-quran-found]")).toBeNull();
    expect(current()).toBe("78:1");
  });
});

describe("the page-turn sound", () => {
  let started = 0;
  beforeEach(() => {
    started = 0;
    const param = () => ({ value: 0, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        currentTime = 0;
        destination = {};
        resume = async () => {};
        suspend = async () => {};
        decodeAudioData = async () => ({ duration: 0.8 });
        createBufferSource = () => ({ buffer: null, connect() {}, start: () => void (started += 1), stop() {} });
        createGain = () => ({ gain: param(), connect() {} });
      },
    );
    // The recording, alongside the pages' verse shapes.
    const pages = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).endsWith("audio/ui/page-turn.m4a") ? { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) } : pages(url),
    );
  });

  it("plays when a page turns, not when the reader jumps elsewhere — and never once muted", async () => {
    await open(2, 25);
    // The reader decodes the recording as it opens.
    await settle();
    showControls();
    click(container.querySelector("[data-quran-next-page]")!);
    expect(shownPage()).toBe("6");
    expect(started).toBe(1);
    click(container.querySelector("[data-quran-prev-page]")!);
    expect(started).toBe(2);
    // A jump to another surah is not a page turn.
    click(container.querySelector("[data-quran-next-surah]")!);
    expect(started).toBe(2);

    expect(loadQuranTurnSound()).toBe(true);
    click(container.querySelector("[data-quran-open-settings]")!);
    const toggle = container.querySelector("[data-quran-turn-sound]")!;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    click(toggle);
    expect(container.querySelector("[data-quran-turn-sound]")!.getAttribute("data-quran-turn-sound")).toBe("off");
    expect(loadQuranTurnSound()).toBe(false);
    click(container.querySelector("[data-quran-panel]")!); // closes the panel
    const before = started;
    click(container.querySelector("[data-quran-next-page]")!);
    click(container.querySelector("[data-quran-next-page]")!);
    expect(started).toBe(before);
    // Kept on this device.
    resetQuranReadingCacheForTesting();
    expect(loadQuranTurnSound()).toBe(false);
  });
});

describe("the lightweight page turn", () => {
  it("is used on a device too slow to move the pages: the page changes at once and a plain sheet sweeps over it", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    markPageTurnTooSlow();
    await open(2, 25);
    showControls();
    click(container.querySelector("[data-quran-next-page]")!);
    expect(shownPage()).toBe("6");
    expect(container.querySelector("[data-quran-turn]")).toBeNull();
    const lite = container.querySelector("[data-quran-lite-turn]")!;
    expect(lite.getAttribute("data-quran-lite-turn")).toBe("next");
    // A plain sheet: no copy of the page artwork is drawn for it.
    expect(lite.querySelector("image, svg")).toBeNull();
    // (jsdom has no AnimationEvent, so React listens for the prefixed name there.)
    act(() => {
      for (const type of ["animationend", "webkitAnimationEnd"]) lite.firstElementChild!.dispatchEvent(new Event(type, { bubbles: true }));
    });
    expect(container.querySelector("[data-quran-lite-turn]")).toBeNull();
    click(container.querySelector("[data-quran-prev-page]")!);
    expect(container.querySelector("[data-quran-lite-turn]")!.getAttribute("data-quran-lite-turn")).toBe("prev");
  });
});

describe("keeping the screen awake", () => {
  it("holds while a page is open and lets go on leaving the reader (Screen Wake Lock in a browser)", async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ released: false, release }));
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await open(2, 25);
    expect(screenAwakeHoldersForTesting()).toBe(1);
    expect(request).toHaveBeenCalledWith("screen");
    // To the surah index: the page closes, the phone's own timeout returns.
    showControls();
    click(container.querySelector("[data-quran-home]")!);
    await settle();
    expect(screenAwakeHoldersForTesting()).toBe(0);
    expect(release).toHaveBeenCalledTimes(1);
    // Back to a page: held again; closing the reader entirely releases it.
    click(container.querySelector("[data-quran-surah='1']")!);
    await settle();
    expect(screenAwakeHoldersForTesting()).toBe(1);
    act(() => root!.unmount());
    root = null;
    await settle();
    expect(screenAwakeHoldersForTesting()).toBe(0);
    expect(release).toHaveBeenCalledTimes(2);
    delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
  });
});
