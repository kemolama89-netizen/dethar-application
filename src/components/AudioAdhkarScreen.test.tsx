// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AudioAdhkarListScreen, AudioAdhkarScreen, AudioMiscCategoriesScreen } from "./AudioAdhkarScreen";
import { audioAdhkarPlayback, getNowPlaying } from "../lib/audioAdhkarPlayback";
import { setAudioElementFactory, stopAudio } from "../lib/audioEngine";
import type { AudioElementLike } from "../lib/audioEngine";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { MISC_CATEGORY_ORDER, MISC_DUAS } from "../data/misc-library";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};
const nav = { onNavigateHome: noop, onNavigateToTasbeeh: noop, onNavigateToWritten: noop, onNavigateToSettings: noop };

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => audioAdhkarPlayback.stop());
  act(() => root.unmount());
  container.remove();
});

function render(node: ReactNode) {
  act(() =>
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>{node}</PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    ),
  );
}

const renderedIds = () => [...container.querySelectorAll("[data-dhikr-id]")].map((el) => el.getAttribute("data-dhikr-id"));

describe("AudioAdhkarScreen", () => {
  it("renders three equal tiles, with Various centered at one column's width — never full width", () => {
    render(<AudioAdhkarScreen {...nav} onSelectCategory={noop} />);
    const tiles = [...container.querySelectorAll<HTMLButtonElement>("button.dithar-wa-category-card")];
    expect(tiles).toHaveLength(3);
    const [morning, evening, various] = tiles;
    expect(morning.className).toContain("w-full");
    expect(evening.className).toContain("w-full");
    expect(various.className).toContain("w-[calc((100%_-_0.75rem)/2)]");
    expect(various.className).not.toContain("w-full");
    expect(various.parentElement!.className).toContain("justify-center");
  });

  it("shows only Morning, Evening and Various — no Prayer Adhkar", () => {
    render(<AudioAdhkarScreen {...nav} onSelectCategory={noop} />);
    const text = container.textContent ?? "";
    expect(text).toContain("أذكار الصباح");
    expect(text).toContain("أذكار المساء");
    expect(text).toContain("أذكار وأدعية متفرقة");
    expect(text).not.toContain("أذكار الصلاة");
  });

  for (const key of ["morning", "evening"] as const) {
    it(`lists every Written ${key} dhikr, in order, with its exact Arabic text`, () => {
      render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key }} onBack={noop} />);
      expect(renderedIds()).toEqual(writtenAdhkarItems[key].map((i) => i.id));
      const text = container.textContent ?? "";
      for (const item of writtenAdhkarItems[key]) expect(text).toContain(item.text_ar);
    });
  }

  it("lists each Various category's items, in order, with their exact Arabic text", () => {
    for (const key of MISC_CATEGORY_ORDER) {
      render(<AudioAdhkarListScreen {...nav} list={{ kind: "misc", key }} onBack={noop} />);
      const expected = MISC_DUAS.filter((i) => i.categories.includes(key));
      expect(renderedIds(), key).toEqual(expected.map((i) => i.id));
      const text = container.textContent ?? "";
      for (const item of expected) expect(text).toContain(item.text_ar);
    }
  });
});

describe("AudioAdhkarListScreen secondary information", () => {
  const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const dialog = () => document.querySelector('[role="dialog"]');
  const trigger = (card: Element, label: string) =>
    [...card.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLButtonElement | undefined;

  it("keeps Meaning out of the card and reveals the exact existing text via a toggle (English mode)", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    const item = writtenAdhkarItems.morning.find((i) => i.text_en)!;
    const card = container.querySelector(`[data-dhikr-id="${item.id}"]`)!;
    expect(card.textContent).not.toContain(item.text_en);
    expect(card.querySelector("[data-audio-player-slot]")).not.toBeNull();

    click(trigger(card, "Meaning")!);
    expect(dialog()?.textContent).toContain(item.text_en);
    click(trigger(card, "Meaning")!);
    expect(dialog()).toBeNull();
  });

  it("keeps Transliteration collapsed until its control is tapped", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    const item = MISC_DUAS.find((i) => i.englishTransliteration)!;
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "misc", key: item.categories[0] }} onBack={noop} />);
    const card = container.querySelector(`[data-dhikr-id="${item.id}"]`)!;
    expect(card.textContent).not.toContain(item.englishTransliteration);

    click(trigger(card, "Transliteration")!);
    expect(dialog()?.textContent).toContain(item.englishTransliteration);
    click(trigger(card, "Transliteration")!);
    expect(dialog()).toBeNull();
  });

  it("offers no English-only controls in Arabic mode", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    expect(container.querySelector("[data-meaning-trigger]")).toBeNull();
  });
});

describe("AudioAdhkarListScreen navigation and repetition status", () => {
  const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  it("pins the back arrow (sticky) and it returns via onBack", () => {
    let backs = 0;
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={() => backs++} />);
    const back = [...container.querySelectorAll<HTMLButtonElement>('button[aria-label="رجوع"]')];
    expect(back).toHaveLength(1);
    expect(back[0].className).toContain("sticky");
    click(back[0]);
    expect(backs).toBe(1);
  });

  it("pins the back arrow on the Various sub-category list too", () => {
    render(<AudioMiscCategoriesScreen {...nav} onBack={noop} onSelectCategory={noop} />);
    const back = [...container.querySelectorAll<HTMLButtonElement>('button[aria-label="رجوع"]')];
    expect(back).toHaveLength(1);
    expect(back[0].className).toContain("sticky");
  });

  const indicator = (id: string) => container.querySelector(`[data-dhikr-id="${id}"] [data-repetition-indicator]`) as HTMLElement;

  it("shows the repetition circle as a status, not a button — one per dhikr", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    const all = container.querySelectorAll("[data-repetition-indicator]");
    expect(all).toHaveLength(writtenAdhkarItems.evening.length);
    for (const el of all) {
      expect(el.tagName).not.toBe("BUTTON");
      expect(el.closest("button")).toBeNull();
      expect(el.querySelector("button")).toBeNull();
      expect(el.getAttribute("data-playback-status")).toBe("idle");
    }
  });

  it("tapping the circle changes nothing — only playback state moves it", () => {
    const item = writtenAdhkarItems.evening.find((i) => (i.repeat ?? 1) === 3 && !i.unboundedCount)!;
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    const before = indicator(item.id).getAttribute("aria-label");
    click(indicator(item.id));
    expect(indicator(item.id).getAttribute("aria-label")).toBe(before);

    act(() => audioAdhkarPlayback.startDhikr({ collection: "evening", itemId: item.id }, 3));
    expect(indicator(item.id).getAttribute("aria-label")).toBe("التكرار الحالي 1 من 3");
    act(() => audioAdhkarPlayback.repetitionEnded());
    expect(indicator(item.id).getAttribute("aria-label")).toBe("التكرار الحالي 2 من 3");
    act(() => audioAdhkarPlayback.repetitionEnded());
    expect(indicator(item.id).textContent).toContain("3");
    act(() => audioAdhkarPlayback.repetitionEnded());
    expect(indicator(item.id).getAttribute("data-playback-status")).toBe("finished");
  });

  it("does not light up the same id in the other collection", () => {
    const item = writtenAdhkarItems.morning[0];
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    act(() => audioAdhkarPlayback.startDhikr({ collection: "evening", itemId: item.id }, 1));
    expect(indicator(item.id).getAttribute("data-playback-status")).toBe("idle");
  });
});

describe("Evening audio player", () => {
  const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const card = (id: string) => container.querySelector(`[data-dhikr-id="${id}"]`) as HTMLElement;
  const playerButton = (id: string) => card(id).querySelector("[data-audio-player-slot] button") as HTMLButtonElement | null;
  let ended: (() => void) | null = null;

  beforeEach(() => {
    setAudioElementFactory(() => {
      const el: AudioElementLike = {
        src: "",
        play: () => {},
        pause: () => {},
        removeAttribute: () => {},
        load: () => {},
        get onended() {
          return ended;
        },
        set onended(fn) {
          ended = fn;
        },
        onerror: null,
      };
      return el;
    });
  });
  afterEach(() => act(() => stopAudio()));

  it("offers Listen on exactly the three recorded Evening dhikr", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    const withPlayer = writtenAdhkarItems.evening.filter((i) => playerButton(i.id)).map((i) => i.id);
    expect(withPlayer).toEqual(["morning_003", "morning_005", "morning_016"]);
    const unrecorded = writtenAdhkarItems.evening.find((i) => !withPlayer.includes(i.id))!;
    expect(card(unrecorded.id).textContent).toContain("لا يتوفر تسجيل صوتي بعد");
  });

  it("offers no player in Morning or Various", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    expect(container.querySelector("[data-audio-player-slot] button")).toBeNull();
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "misc", key: "istighfar" }} onBack={noop} />);
    expect(container.querySelector("[data-audio-player-slot] button")).toBeNull();
  });

  it("Listen → Pause → Resume, with the active card and repetition indicator following playback", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    click(playerButton("morning_016")!);
    expect(getNowPlaying()).toMatchObject({ collection: "evening", itemId: "morning_016", repetition: 1, status: "playing" });
    expect(card("morning_016").hasAttribute("data-active-dhikr")).toBe(true);
    expect(card("morning_016").querySelector("[data-repetition-indicator]")!.getAttribute("data-playback-status")).toBe("playing");
    expect(playerButton("morning_016")!.textContent).toBe("إيقاف مؤقت");

    click(playerButton("morning_016")!);
    expect(getNowPlaying()?.status).toBe("paused");
    expect(playerButton("morning_016")!.textContent).toBe("استئناف");

    click(playerButton("morning_016")!);
    expect(getNowPlaying()).toMatchObject({ repetition: 1, status: "playing" });

    act(() => ended?.());
    expect(card("morning_016").querySelector("[data-repetition-indicator]")!.getAttribute("data-playback-status")).toBe("finished");
    expect(card("morning_016").hasAttribute("data-active-dhikr")).toBe(false);
  });

  it("leaving the list stops playback", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    click(playerButton("morning_003")!);
    act(() => root.render(<div />));
    expect(getNowPlaying()).toBeNull();
  });
});
