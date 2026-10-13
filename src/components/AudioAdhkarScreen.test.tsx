// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AudioAdhkarListScreen, AudioAdhkarScreen } from "./AudioAdhkarScreen";
import { audioAdhkarPlayback, getNowPlaying } from "../lib/audioAdhkarPlayback";
import { setAudioElementFactory, stopAudio } from "../lib/audioEngine";
import type { AudioElementLike } from "../lib/audioEngine";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { setUserRepeatCount } from "../lib/audioUserRepeat";
import { commitAudioCompletions, resetAudioAdhkarCountsMemoryForTesting } from "../lib/audioAdhkarCounts";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};
const nav = { onNavigateHome: noop, onNavigateToTasbeeh: noop, onNavigateToWritten: noop, onNavigateToSettings: noop, onNavigateToAudio: noop };

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

  it("lists every Tasbeeh dhikr under Various, in order, with its exact Arabic text", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    expect(renderedIds()).toEqual(AUDIO_VARIOUS_ITEMS.map((i) => i.id));
    expect(renderedIds()).not.toContain("tasbeeh-13");
    const text = container.textContent ?? "";
    expect(text).toContain("أذكار وأدعية متفرقة");
    for (const item of AUDIO_VARIOUS_ITEMS) expect(text).toContain(item.text_ar);
  });

  it("shows each Various dhikr's virtue and source when it has them", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    for (const item of AUDIO_VARIOUS_ITEMS) {
      const card = container.querySelector(`[data-dhikr-id="${item.id}"]`)!;
      if (item.virtue_ar) expect(card.textContent, item.id).toContain(item.virtue_ar);
      if (item.source_ar) expect(card.textContent, item.id).toContain(item.source_ar);
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
    const item = writtenAdhkarItems.morning.find((i) => i.transliteration_en)!;
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    const card = container.querySelector(`[data-dhikr-id="${item.id}"]`)!;
    expect(card.textContent).not.toContain(item.transliteration_en);

    click(trigger(card, "Transliteration")!);
    expect(dialog()?.textContent).toContain(item.transliteration_en);
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

  it("pins the back arrow on the Various list too", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    const back = [...container.querySelectorAll<HTMLButtonElement>('button[aria-label="رجوع"]')];
    expect(back).toHaveLength(1);
    expect(back[0].className).toContain("sticky");
  });

  it("shows no count anywhere — no repetition circle, no «N مرات», no count picker", () => {
    for (const key of ["morning", "evening"] as const) {
      render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key }} onBack={noop} />);
      expect(container.querySelector("[data-repetition-indicator]"), key).toBeNull();
      expect(container.querySelector("[data-user-repeat-count]"), key).toBeNull();
      expect(container.textContent, key).not.toMatch(/\d+ مرات|مرة واحدة/);
      // The text and sources stay.
      for (const item of writtenAdhkarItems[key]) expect(container.textContent).toContain(item.text_ar);
    }
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    expect(container.querySelector("[data-repetition-indicator]")).toBeNull();
  });

  it("does not light up the same id in the other collection", () => {
    const item = writtenAdhkarItems.morning[0];
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    act(() => audioAdhkarPlayback.startDhikr({ collection: "evening", itemId: item.id }, 1));
    expect(container.querySelector(`[data-dhikr-id="${item.id}"]`)!.hasAttribute("data-active-dhikr")).toBe(false);
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

  it("offers Listen on exactly the recorded Evening dhikr", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    const withPlayer = writtenAdhkarItems.evening.filter((i) => playerButton(i.id)).map((i) => i.id);
    expect(withPlayer).toEqual(["morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_023", "evening_001"]);
    // Every Evening dhikr now has audio: none shows the "no recording yet" note.
    expect(withPlayer).toHaveLength(writtenAdhkarItems.evening.length);
    expect(container.textContent).not.toContain("لا يتوفر تسجيل صوتي بعد");
  });

  it("offers Listen on exactly the recorded Morning dhikr", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    const withPlayer = writtenAdhkarItems.morning.filter((i) => playerButton(i.id)).map((i) => i.id);
    expect(withPlayer).toEqual(["morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_020", "morning_023"]);
  });

  it("morning_023 (no fixed count) plays without asking for a count — once, or the count chosen earlier", () => {
    setUserRepeatCount("morning_023", null);
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    expect(card("morning_023").querySelector("[data-user-repeat-count]")).toBeNull();
    expect(playerButton("morning_023")!.disabled).toBe(false);
    click(playerButton("morning_023")!);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_023", repetition: 1, total: 1, status: "playing" });
    act(() => stopAudio());
    setUserRepeatCount("morning_023", 4);
    click(playerButton("morning_023")!);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_023", total: 4 });
    setUserRepeatCount("morning_023", null);
  });

  it("offers Listen on exactly the recorded Various dhikr, each with its own local file", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    const withPlayer = AUDIO_VARIOUS_ITEMS.filter((i) => playerButton(i.id)).map((i) => i.id);
    expect(withPlayer).toEqual(AUDIO_VARIOUS_ITEMS.map((i) => i.id));
    for (const item of AUDIO_VARIOUS_ITEMS) {
      expect(card(item.id).querySelector("[data-audio-player-slot]")!.getAttribute("data-audio-source"), item.id).toBe(`/${item.audio}`);
    }
    expect(container.textContent).not.toContain("قريبًا");
  });

  it("plays tasbeeh_14.mp3 for «…اللهم اغفر لي، اللهم ارحمني، اللهم ارزقني»", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    expect(card("tasbeeh-14").querySelector("[data-audio-player-slot]")!.getAttribute("data-audio-source")).toBe("/audio/audio-azkar/tasbeeh_14.mp3");
    click(playerButton("tasbeeh-14")!);
    expect(getNowPlaying()).toMatchObject({ collection: "misc", itemId: "tasbeeh-14", total: 1, status: "playing" });
    act(() => ended?.());
    expect(getNowPlaying()).toMatchObject({ itemId: "tasbeeh-14", status: "finished" });
  });

  it("plays a Various dhikr once: Listen → Pause → Resume → finished", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    click(playerButton("tasbeeh-10")!);
    expect(getNowPlaying()).toMatchObject({ collection: "misc", itemId: "tasbeeh-10", repetition: 1, total: 1, status: "playing" });
    expect(card("tasbeeh-10").hasAttribute("data-active-dhikr")).toBe(true);
    click(playerButton("tasbeeh-10")!);
    expect(getNowPlaying()?.status).toBe("paused");
    click(playerButton("tasbeeh-10")!);
    expect(getNowPlaying()?.status).toBe("playing");
    act(() => ended?.());
    expect(getNowPlaying()).toMatchObject({ itemId: "tasbeeh-10", status: "finished" });
    expect(card("tasbeeh-10").hasAttribute("data-active-dhikr")).toBe(false);
  });

  it("starting another Various dhikr replaces the one playing", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    click(playerButton("tasbeeh-1")!);
    click(playerButton("tasbeeh-16")!);
    expect(getNowPlaying()).toMatchObject({ itemId: "tasbeeh-16", status: "playing" });
    expect(card("tasbeeh-1").hasAttribute("data-active-dhikr")).toBe(false);
  });

  it("Listen → Pause → Resume, with the active card following playback", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    click(playerButton("morning_016")!);
    expect(getNowPlaying()).toMatchObject({ collection: "evening", itemId: "morning_016", repetition: 1, status: "playing" });
    expect(card("morning_016").hasAttribute("data-active-dhikr")).toBe(true);
    expect(playerButton("morning_016")!.textContent).toBe("إيقاف مؤقت");

    click(playerButton("morning_016")!);
    expect(getNowPlaying()?.status).toBe("paused");
    expect(playerButton("morning_016")!.textContent).toBe("استئناف");

    click(playerButton("morning_016")!);
    expect(getNowPlaying()).toMatchObject({ repetition: 1, status: "playing" });

    act(() => ended?.());
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", status: "finished" });
    expect(card("morning_016").hasAttribute("data-active-dhikr")).toBe(false);
  });

  it("leaving the list stops playback", () => {
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "evening" }} onBack={noop} />);
    click(playerButton("morning_003")!);
    act(() => root.render(<div />));
    expect(getNowPlaying()).toBeNull();
  });
});

describe("Audio Adhkar heard counts on the cards", () => {
  const countOf = (id: string) => container.querySelector(`[data-dhikr-id="${id}"] [data-audio-count]`);

  it("every Morning, Evening and Various card shows how many times it was heard — 0 at first", () => {
    resetAudioAdhkarCountsMemoryForTesting();
    for (const list of [{ kind: "written", key: "morning" }, { kind: "written", key: "evening" }, { kind: "various" }] as const) {
      render(<AudioAdhkarListScreen {...nav} list={list} onBack={noop} />);
      const cards = container.querySelectorAll("[data-dhikr-id]");
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) expect(card.querySelector("[data-audio-count]")!.textContent).toBe("عدد مرات الاستماع: 0");
    }
  });

  it("updates live, per dhikr and per list", () => {
    resetAudioAdhkarCountsMemoryForTesting();
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "various" }} onBack={noop} />);
    act(() => {
      commitAudioCompletions([
        { id: "ui-1", collection: "misc", dhikrId: "tasbeeh-2" },
        { id: "ui-2", collection: "misc", dhikrId: "tasbeeh-2" },
        { id: "ui-3", collection: "evening", dhikrId: "morning_005" },
      ]);
    });
    expect(countOf("tasbeeh-2")!.getAttribute("data-audio-count")).toBe("2");
    expect(countOf("tasbeeh-3")!.getAttribute("data-audio-count")).toBe("0");
    render(<AudioAdhkarListScreen {...nav} list={{ kind: "written", key: "morning" }} onBack={noop} />);
    expect(countOf("morning_005")!.getAttribute("data-audio-count")).toBe("0"); // heard in Evening, not Morning
  });
});

