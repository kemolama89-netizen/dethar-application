// @vitest-environment jsdom
// The bottom navigation's five items, their order (right to left in both
// languages: Tasbeeh, Adhkar, Home in the centre, Mushaf, Settings) and
// destinations, in Arabic and English.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { BottomNav } from "./BottomNav";
import { QuranNavContext } from "../lib/quranNav";
import { AdhkarNavContext } from "../lib/adhkarNav";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { navLabels } from "../data/content";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
  localStorage.clear();
});

function mount(onSelect: (key: string) => void, activeKey?: string, openQuran: (() => void) | null = null, openAdhkar: (() => void) | null = null) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <QuranNavContext.Provider value={openQuran}>
          <AdhkarNavContext.Provider value={openAdhkar}>
            <BottomNav onSelect={onSelect} activeKey={activeKey} />
          </AdhkarNavContext.Provider>
        </QuranNavContext.Provider>
      </LanguageProvider>,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return [...container.querySelectorAll("button")];
}

describe("BottomNav", () => {
  for (const language of ["ar", "en"] as const) {
    it(`shows exactly five destinations — right to left: Tasbeeh, Adhkar, Home (centre), Mushaf, Settings (${language})`, () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      const selected: string[] = [];
      const buttons = mount((key) => selected.push(key));
      const l = navLabels[language];
      // DOM order = left to right on screen (the nav is laid out left-to-right in both languages).
      expect(buttons.map((b) => b.textContent)).toEqual([l.settings, l.quran, l.home, l.adhkar, l.tasbih]);
      // Home is the third of five: the centre.
      expect(buttons[0].closest("nav")!.getAttribute("dir")).toBe("ltr");
      expect(buttons[2].textContent).toBe(l.home);
      for (const b of buttons) act(() => b.click());
      expect(selected).toEqual(["settings", "quran", "home", "adhkar", "tasbih"]);
    });
  }

  it("labels the Arabic items exactly as approved", () => {
    const buttons = mount(() => {});
    // Right to left: السبحة، الأذكار، الرئيسية، المصحف، الإعدادات.
    expect(buttons.map((b) => b.textContent).reverse()).toEqual(["السبحة", "الأذكار", "الرئيسية", "المصحف", "الإعدادات"]);
  });

  it("marks only the active destination as the current page", () => {
    const buttons = mount(() => {}, "tasbih");
    expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual([null, null, null, null, "page"]);
  });

  it("highlights Adhkar on the Adhkar screen and on the Audio and Written Adhkar screens under it", () => {
    for (const key of ["adhkar", "audio", "written"]) {
      const buttons = mount(() => {}, key);
      expect(buttons.map((b) => b.getAttribute("aria-current")), key).toEqual([null, null, null, "page", null]);
      cleanup?.();
    }
  });

  it("the Adhkar item opens the Adhkar screen from any screen — Audio and Written Adhkar too — but not again while on it", () => {
    const openAdhkar = vi.fn();
    for (const key of ["home", "tasbih", "audio", "written"]) {
      const buttons = mount(() => {}, key, null, openAdhkar);
      act(() => buttons[3].click());
      cleanup?.();
    }
    expect(openAdhkar).toHaveBeenCalledTimes(4);
    const buttons = mount(() => {}, "adhkar", null, openAdhkar);
    act(() => buttons[3].click());
    expect(openAdhkar).toHaveBeenCalledTimes(4);
  });

  it("the Mushaf item opens the Qur'an reader from any screen (and not again while already there)", () => {
    const openQuran = vi.fn();
    let buttons = mount(() => {}, "home", openQuran);
    act(() => buttons[1].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
    act(() => buttons[2].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
    cleanup?.();
    buttons = mount(() => {}, "quran", openQuran);
    act(() => buttons[1].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
  });
});
