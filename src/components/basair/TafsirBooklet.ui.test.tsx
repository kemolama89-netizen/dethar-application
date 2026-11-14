// @vitest-environment jsdom
// The Tafsir booklet over the Mushaf: the verse, al-Sa'di's whole comment, his notes and the
// source — all of it, exactly as stored — with its own page controls and a way out.
// (Real column layout needs a browser; the page count's invariance under a page turn is checked here
// against a faked layout.)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../../lib/appearancePreferences";
import { getSaadiVerse } from "../../lib/saadiTafsir";
import { paragraphsUnderVerse, saadiTextForSharing } from "../../lib/tafsirShare";
import { TafsirBooklet } from "./TafsirBooklet";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const q = (s: string) => container.querySelector(s);
const settle = (ms = 5) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 600 && !ok(); i++) await settle();
  expect(ok()).toBe(true);
};
const click = (el: Element | null) => act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function open(surah: number, ayah: number, onClose = () => {}) {
  await act(async () => root.render(<LanguageProvider><TafsirBooklet surah={surah} ayah={ayah} verseTop={400} verseBottom={460} onClose={onClose} /></LanguageProvider>));
  await until(() => q("[data-booklet-paragraph]") !== null && q("[data-booklet-verse]") !== null);
}

describe("the Tafsir booklet", () => {
  it("holds the verse, then al-Sa'di's whole comment, word for word, then the source", async () => {
    await open(3, 57);
    expect(q("[data-tafsir-booklet]")!.getAttribute("data-tafsir-booklet")).toBe("3:57");
    expect(q("[data-booklet-verse]")!.getAttribute("data-booklet-verse")).toBe("whole");
    expect(q("[data-booklet-excerpt]")).toBeNull();
    const r = await getSaadiVerse(3, 57);
    if (r.status !== "found") throw new Error("not found");
    const shown = [...container.querySelectorAll("[data-booklet-paragraph]")].map((p) => normalize(p.textContent ?? ""));
    const text = (ps: typeof r.parsed.paragraphs) => ps.map((p) => normalize(p.runs.filter((x) => x.kind === "text" || x.kind === "quote" || x.kind === "marker").map((x) => ("text" in x ? x.text : "")).join("")));
    // Every paragraph word for word — except al-Sa'di's opening quotation of this very verse, which the
    // verse above already shows (the share card's rule): the verse appears once.
    expect(shown.map((s) => s.replace(/[٠-٩]/g, ""))).toEqual(text(paragraphsUnderVerse(r.parsed, 57)).map((s) => s.replace(/[٠-٩]/g, "")));
    expect(r.parsed.paragraphs.length).toBe(shown.length + 1);
    expect(q("[data-booklet-source]")!.textContent).toContain("تفسير السعدي");
    expect(q("[role='dialog']")!.getAttribute("aria-label")).toBe("كتيّب تفسير السعدي: سورة آل عمران · الآية ٥٧");
  });

  it("keeps the editor's notes, numbered as in the text", async () => {
    await open(2, 255);
    expect(q(".dithar-booklet-notes")).not.toBeNull();
    expect(container.querySelectorAll(".dithar-booklet-noteref").length).toBeGreaterThan(0);
  });

  it("starts on its first page, can't go before it, and closes with ×", async () => {
    const onClose = vi.fn();
    await open(3, 57, onClose);
    expect(q("[data-booklet-folio]")!.textContent).toBe("١ من ١");
    expect((q("[data-booklet-prev]") as HTMLButtonElement).disabled).toBe(true);
    await click(q("[data-booklet-close]"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with a tap beside it, leaving the page under it alone", async () => {
    const onClose = vi.fn();
    await open(3, 57, onClose);
    await click(q(".dithar-booklet-scrim"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shares through the share menu: the pages as images, or the complete text — never a single card that could leave text out", async () => {
    const shared: ShareData[] = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d: ShareData) => void shared.push(d) });
    await open(2, 255);
    await click(q("[data-booklet-share]"));
    await until(() => document.querySelector("[data-share-menu]") !== null);
    const options = [...document.querySelectorAll("[data-share-option]")].map((o) => o.getAttribute("data-share-option"));
    expect(options).toEqual(["image-set", "text", "copy"]);
    expect(document.querySelector("[data-share-subtitle]")!.textContent).toBe("سورة البقرة · الآية ٢٥٥");
    await click(document.querySelector('[data-share-option="text"]'));
    await until(() => shared.length === 1);
    const r = await getSaadiVerse(2, 255);
    if (r.status !== "found") throw new Error("not found");
    const text = shared[0].text ?? "";
    // al-Sa'di's whole Tafsir, character for character, with its source and DITHAR's signature.
    expect(text).toContain(saadiTextForSharing(r.parsed));
    expect(text).toContain("تفسير السعدي");
    expect(text).toContain("عبد الرحمن بن ناصر السعدي");
    expect(text).toContain("دِثار");
    // The verse's reference is not called a source: «المصدر:» labels the Tafsir's source only.
    expect(text).toContain("\nسورة البقرة · الآية ٢٥٥\n");
    expect(text.match(/المصدر:/g)).toHaveLength(1);
  });

  it("keeps the same page count while pages turn, even mid-slide — no phantom last page, no collapse", async () => {
    // A faked column layout: pages 300 wide, 40 apart; the text ends on the 9th page (index 8). While a
    // turn slides, the text and the flow's own box sit at an arbitrary in-between offset — the
    // window never moves. (Measuring against the window minus the target shift gave 10, then 1.)
    const PAGES = 9;
    const step = 340;
    let slide = 0;
    const rect = (right: number, width = 10) => ({ right, left: right - width, top: 0, bottom: 20, width, height: 20, x: right - width, y: 0, toJSON() {} }) as DOMRect;
    const restore = [
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
        return this.matches("[data-booklet-window]") ? 300 : 0;
      }),
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
        return this.matches("[data-booklet-window]") ? 500 : 0;
      }),
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        // A different in-flight position at every measurement (within one, text and flow move together).
        if (this.matches(".dithar-booklet-flow")) {
          slide = (slide + 137) % step;
          return rect(360 + slide, 300);
        }
        if (this.parentElement?.matches(".dithar-booklet-ornament")) return rect(360 + slide - (PAGES - 1) * step - 120, 0);
        if (this.matches("[data-booklet-window]")) return rect(360, 300);
        return rect(0, 0);
      }),
    ];
    try {
      await open(2, 282);
      await until(() => q("[data-booklet-folio]")!.textContent === "١ من ٩");
      const folios: string[] = [];
      const turn = async (sel: string) => {
        await click(q(sel));
        await settle(40);
        folios.push(q("[data-booklet-folio]")!.textContent!);
      };
      for (let i = 0; i < PAGES + 2; i++) await turn("[data-booklet-next]");
      expect(folios.at(-1)).toBe("٩ من ٩");
      expect((q("[data-booklet-next]") as HTMLButtonElement).disabled).toBe(true);
      for (let i = 0; i < PAGES + 2; i++) await turn("[data-booklet-prev]");
      expect(folios.at(-1)).toBe("١ من ٩");
      // Every folio says «… من ٩»: the total never moved.
      expect(folios.every((f) => f.endsWith("من ٩"))).toBe(true);
    } finally {
      restore.forEach((r) => r.mockRestore());
    }
  });
});
