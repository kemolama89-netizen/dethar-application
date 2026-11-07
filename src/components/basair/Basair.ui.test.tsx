// @vitest-environment jsdom
// Basa'ir on screen: the surah as one text, a tapped verse in its opening with the
// book's own words beneath it, and verses the book groups said to be grouped.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../../lib/appearancePreferences";
import { LOOK_OFF_ATTRIBUTE, LOOKS } from "../../theme/looks";
import { getSaadiVerse } from "../../lib/saadiTafsir";
import { loadBasairPosition } from "../../lib/basairPosition";
import { backOverlayCount, dismissTopBackOverlay } from "../../lib/backOverlays";
import { VerseTafsirView } from "./TafsirReadingView";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const mount = (node: React.ReactNode) => act(async () => root.render(<LanguageProvider>{node}</LanguageProvider>));
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 5))));
const q = (s: string) => container.querySelector(s);
const click = (el: Element | null) => act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 600 && !ok(); i++) await settle();
  expect(ok()).toBe(true);
};
const passage = () => q("[data-tafsir-passage]")?.getAttribute("data-tafsir-passage");
const open = async (surah: number, ayah: number, onClose: (at: { surah: number; ayah: number }) => void = () => {}) => {
  await mount(<VerseTafsirView key={`${surah}:${ayah}`} surah={surah} ayah={ayah} onClose={onClose} />);
  await until(() => passage() === `${surah}:${ayah}`);
};
const choose = (el: Element | null, value: number) =>
  act(async () => {
    const select = el as HTMLSelectElement;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, String(value));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
  document.documentElement.removeAttribute(LOOK_OFF_ATTRIBUTE);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("the opening", () => {
  it("shows the selected verse, then its Tafsir beneath it, inside the surah's own text", async () => {
    await open(88, 17);
    const opening = q("[data-verse-tafsir='88:17']")!;
    const verse = opening.querySelector("[data-tafsir-verse]")!;
    const tafsir = opening.querySelector("[data-tafsir-passage]")!;
    expect(verse.compareDocumentPosition(tafsir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(verse.getAttribute("dir")).toBe("rtl");
    expect(q("[data-opening-verse='88:16']")!.compareDocumentPosition(opening) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(opening.compareDocumentPosition(q("[data-opening-verse='88:18']")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Every other verse once, and the opened one only in the opening.
    expect(container.querySelectorAll("[data-opening-verse]").length).toBe(25);
    expect(q("[data-opening-verse='88:17']")).toBeNull();
  });

  it("draws the Qur'an's text only in the Complex's font", async () => {
    await open(88, 3);
    for (const el of container.querySelectorAll(".dithar-kfgqpc-mark")) expect(el.closest(".dithar-kfgqpc")).not.toBeNull();
    expect(q("[data-tafsir-verse]")!.classList.contains("dithar-kfgqpc")).toBe(true);
  });

  it("shows the book's words exactly, for verses across the Qur'an", async () => {
    for (const [s, a] of [[1, 1], [2, 255], [13, 25], [88, 17], [114, 6]]) {
      await open(s, a);
      const r = await getSaadiVerse(s, a);
      if (r.status !== "found") throw new Error("not found");
      // Note references draw a number in place: without them, each paragraph is the source's characters.
      const shown = [...container.querySelectorAll("[data-tafsir-paragraph]")].map((p) => {
        const copy = p.cloneNode(true) as Element;
        copy.querySelectorAll("[data-saadi-noteref]").forEach((ref) => ref.remove());
        return copy.textContent;
      });
      const source = r.parsed.paragraphs.map((p) => p.runs.map((x) => (x.kind === "note" || x.kind === "stray" ? "" : x.text)).join(""));
      expect(shown).toEqual(source);
      expect(q("[data-tafsir-source]")!.querySelector("a")!.getAttribute("href")).toBe("https://cms.itqan.dev/gallery/asset/6");
    }
  });

  it("opens a tapped verse, and by keyboard too", async () => {
    await open(88, 3);
    await click(q("[data-opening-verse='88:10']"));
    await until(() => passage() === "88:10");
    expect(q("[data-opening-verse='88:3']")).not.toBeNull();
    const verse = q("[data-opening-verse='88:2']") as HTMLElement;
    expect(verse.getAttribute("role")).toBe("button");
    expect(verse.tabIndex).toBe(0);
    await act(async () => void verse.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    await until(() => passage() === "88:2");
  });

  it("closes into the whole surah with a hint, and reopens from a tap", async () => {
    await open(88, 3);
    await click(q("[data-opening-close]"));
    expect(q("[data-verse-tafsir]")).toBeNull();
    expect(container.querySelectorAll("[data-opening-verse]").length).toBe(26);
    expect(q("[data-opening-hint]")!.textContent).toContain("المس آية");
    expect(q("[data-saadi-next]")).toBeNull();
    await click(q("[data-opening-verse='88:5']"));
    await until(() => passage() === "88:5");
  });

  it("moves by the picker, across surahs, and keeps the place for next time", async () => {
    await open(88, 3);
    await choose(q("[data-saadi-picker]"), 20);
    await until(() => passage() === "88:20");
    await choose(q("[data-opening-surah-picker]"), 2);
    await until(() => passage() === "2:1");
    expect(q("[data-saadi-picker]")!.querySelectorAll("option").length).toBe(286);
    expect(loadBasairPosition()).toEqual({ surah: 2, ayah: 1 });
  });

  it("moves verse by verse, across surahs, and tells the reader where it ended up", async () => {
    const onClose = vi.fn();
    await open(1, 7, onClose);
    await click(q("[data-saadi-next]"));
    await until(() => passage() === "2:1");
    await click(q("[data-saadi-prev]"));
    await until(() => passage() === "1:7");
    await click(q("[data-saadi-next]"));
    await until(() => passage() === "2:1");
    await click(q("[data-tafsir-back]"));
    expect(onClose).toHaveBeenCalledWith({ surah: 2, ayah: 1 });
  });

  it("stops at the first and last verses of the Qur'an", async () => {
    await open(1, 1);
    expect((q("[data-saadi-prev]") as HTMLButtonElement).disabled).toBe(true);
    await open(114, 6);
    expect((q("[data-saadi-next]") as HTMLButtonElement).disabled).toBe(true);
  });

  it("heads each surah with the basmala, except where it's a verse or absent", async () => {
    await open(88, 1);
    expect(q(".dithar-opening-basmala")).not.toBeNull();
    await open(1, 1);
    expect(q(".dithar-opening-basmala")).toBeNull();
    await open(9, 1);
    expect(q(".dithar-opening-basmala")).toBeNull();
  });

  it("shows the editor's notes apart, numbered, with no raw markers on screen", async () => {
    await open(2, 1);
    expect(q("[data-saadi-note='0']")!.textContent).toContain("في (ب): «السور».");
    expect(q("[data-saadi-noteref='0']")).not.toBeNull();
    expect(container.textContent).not.toMatch(/[¬¥]/);
  });

  it("where the Sheikh left a verse without comment, shows the book saying so and nothing else", async () => {
    await open(2, 50);
    expect(q("[data-tafsir-passage]")!.textContent).toContain("الشيخ رحمه الله");
    expect(q("[data-saadi-marker]")).toBeNull();
  });

  it("is laid out for the interface language, with the Qur'an and Tafsir always right to left", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    await open(2, 2);
    expect(q(".dithar-tafsir-page")!.getAttribute("dir")).toBe("ltr");
    expect(q("[data-saadi-next]")!.textContent).toContain("Next verse");
    expect(q("[data-tafsir-passage]")!.getAttribute("dir")).toBe("rtl");
    expect(q("[data-tafsir-verse]")!.getAttribute("dir")).toBe("rtl");
    expect(q("[data-opening-verse]")!.closest("p")!.getAttribute("dir")).toBe("rtl");
  });

  it("closes from its button and from system Back", async () => {
    const onClose = vi.fn();
    await open(88, 1, onClose);
    expect(backOverlayCount()).toBe(1);
    act(() => void dismissTopBackOverlay());
    expect(onClose).toHaveBeenCalledTimes(1);
    await click(q("[data-tafsir-back]"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("follows the theme while open, and leaves the Mushaf's own state as it found it", async () => {
    document.documentElement.setAttribute(LOOK_OFF_ATTRIBUTE, "");
    await open(88, 1);
    expect(document.documentElement.hasAttribute(LOOK_OFF_ATTRIBUTE)).toBe(false);
    await act(async () => root.unmount());
    expect(document.documentElement.hasAttribute(LOOK_OFF_ATTRIBUTE)).toBe(true);
    root = createRoot(container);
  });

  it("has nothing left of the map", async () => {
    await open(88, 1);
    expect(container.querySelector("canvas, img, [class*='dithar-map']")).toBeNull();
    expect(container.textContent).not.toMatch(/المحطة|الخريطة|قرأت|Station|map/);
  });
});

describe("sharing the verse with its Tafsir", () => {
  it("opens the share sheet naming the verse, copies the verse and al-Sa'di's words exactly, and closes on Back before Basa'ir", async () => {
    let copied = "";
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void (copied = t) } });
    await open(112, 1);
    const button = q("[data-tafsir-share]")!;
    expect(button.getAttribute("aria-label")).toBe("مشاركة الآية مع تفسيرها: سورة الإخلاص · الآية ١");
    await click(button);
    await until(() => document.querySelector("[data-share-menu]") !== null);
    expect(document.querySelector("[data-share-subtitle]")!.textContent).toBe("سورة الإخلاص · الآية ١");

    // System Back closes the sheet, not Basa'ir.
    expect(backOverlayCount()).toBe(2);
    await act(async () => void dismissTopBackOverlay());
    expect(document.querySelector("[data-share-menu]")).toBeNull();
    expect(q("[data-basair]")).not.toBeNull();
    expect(backOverlayCount()).toBe(1);

    await click(button);
    await until(() => document.querySelector("[data-share-menu]") !== null);
    await click(document.querySelector("[data-share-option='copy']"));
    await until(() => copied !== "");
    const { markedVerseForSharing } = await import("../../lib/quranShareText");
    const tafsir = await getSaadiVerse(112, 1);
    if (tafsir.status !== "found") throw new Error("no tafsir");
    expect(copied.startsWith(`${markedVerseForSharing(112, 1)}\n\n`)).toBe(true);
    // Every paragraph of the book's text on this verse, as it stands (this one has no editor's notes).
    expect(tafsir.text).not.toMatch(/[¬¥]/);
    expect(copied).toContain(`تفسير السعدي:\n${tafsir.text.split("\n").filter((l) => l.trim()).join("\n")}\n`);
    expect(q("[data-basair]")).not.toBeNull();
  });
});

describe("the source's verse ranges", () => {
  const notices = () => container.querySelectorAll("[data-saadi-heading-together], [data-saadi-comment-also]").length;

  it.each([
    [2, 6],
    [2, 7],
  ])("says %i:%i is printed with the other under one heading", async (s, a) => {
    await open(s, a);
    expect(q("[data-saadi-heading-together]")!.getAttribute("data-saadi-heading-together")).toBe("6,7");
    expect(notices()).toBe(1);
  });

  it("gives Ra'd 25 one notice: its place also holds verse 26's comment", async () => {
    await open(13, 25);
    expect(q("[data-saadi-comment-also]")!.getAttribute("data-saadi-comment-also")).toBe("26");
    expect(q("[data-saadi-heading-together]")).toBeNull();
    expect(notices()).toBe(1);
  });

  it.each([
    [88, 3],
    [13, 26],
    [25, 9],
  ])("claims no grouping for %i:%i, which the book gives under its own heading", async (s, a) => {
    await open(s, a);
    expect(notices()).toBe(0);
  });
});

describe("the reading aids", () => {
  it("offers the return to the verse in the bar, only once the verse has scrolled away", async () => {
    await open(2, 255);
    expect(q("[data-opening-return]")).toBeNull();
    expect(q("[data-opening-close]")).not.toBeNull();
    const box = q(".dithar-tafsir-scroll")!;
    const line = q("[data-tafsir-verse]")!;
    const scrolledAway = { top: -300, bottom: -200, left: 0, right: 0, width: 0, height: 100, x: 0, y: 0, toJSON: () => ({}) };
    line.getBoundingClientRect = () => scrolledAway;
    q("[data-verse-tafsir]")!.getBoundingClientRect = () => ({ ...scrolledAway, bottom: 900, height: 1200 });
    await act(async () => void box.dispatchEvent(new Event("scroll")));
    const back = q("[data-opening-return]")!;
    expect(back.closest("[data-saadi-nav]")).not.toBeNull();
    expect(back.getAttribute("aria-label")).toBe("العودة إلى الآية ٢٥٥");
    expect(back.textContent).toContain("الآية ٢٥٥");
    expect(q("[data-opening-close]")).toBeNull();
  });

  it("keeps each picker's label and arrow together, with the native control over them", async () => {
    await open(88, 17);
    for (const label of container.querySelectorAll(".dithar-opening-select")) {
      const text = label.querySelector(".dithar-opening-select-text")!;
      expect(text.nextElementSibling!.tagName.toLowerCase()).toBe("svg");
      expect(text.nextElementSibling!.nextElementSibling!.tagName.toLowerCase()).toBe("select");
    }
    expect(q("[data-opening-position] .dithar-opening-select-text")!.textContent).toBe("الآية ١٧ من ٢٦");
  });

  it("sets the Qur'an in an editor's note as Qur'an, its characters unchanged", async () => {
    await open(2, 29);
    const r = await getSaadiVerse(2, 29);
    if (r.status !== "found") throw new Error("not found");
    r.parsed.notes.forEach((note, i) => {
      const shown = q(`[data-saadi-note='${i}']`)!;
      expect(shown.textContent!.slice(shown.querySelector(".dithar-saadi-notenum")!.textContent!.length + 1)).toBe(note);
    });
    expect(q("[data-tafsir-notes] .dithar-tafsir-quran")!.textContent).toBe("{ثم استوى على العرش}");
  });
});

describe("the look tokens", () => {
  it("keeps the entry's colours equal to the looks", async () => {
    // Vitest empties CSS imports, so the stylesheet is read as a file.
    const fs = await import(/* @vite-ignore */ ["node", "fs"].join(":"));
    const root = String(import.meta.url).replace(/^(?!file:)/, "file://");
    const css: string = fs.readFileSync(new URL("./basair.css", root), "utf8");
    const value = (look: string, token: string) => new RegExp(`html\\[data-look="${look}"\\] \\{[^}]*${token}: (#\\w+)`).exec(css)?.[1];
    expect(value("nature", "--basair-deep")).toBe(LOOKS.nature.originalPrimary!.primary);
    expect(value("sunset", "--basair-deep")).toBe(LOOKS.sunset.originalPrimary!.primary);
    expect(value("night", "--basair-deep")).toBe("#1c2b5e");
    expect(value("night", "--basair-gold")).toBe("#e3c27e");
    // Browser scroll anchoring threw the reader far from the verse at large text sizes.
    expect(/\.dithar-tafsir-scroll \{[^}]*overflow-anchor: none/.test(css)).toBe(true);
  });
});
