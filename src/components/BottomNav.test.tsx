// @vitest-environment jsdom
// The bottom navigation's six items, their order (right to left in Arabic:
// الأذكار المسموعة، الأذكار المكتوبة، الرئيسية، المصحف، السبحة، الإعدادات)
// and destinations, in Arabic and English.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { BottomNav } from "./BottomNav";
import { QuranNavContext } from "../lib/quranNav";
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

function mount(onSelect: (key: string) => void, activeKey?: string, openQuran: (() => void) | null = null) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <QuranNavContext.Provider value={openQuran}>
          <BottomNav onSelect={onSelect} activeKey={activeKey} />
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
    it(`shows exactly six destinations, in the approved order (${language})`, () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      const selected: string[] = [];
      const buttons = mount((key) => selected.push(key));
      const l = navLabels[language];
      expect(buttons.map((b) => b.textContent)).toEqual([l.audioAdhkar, l.writtenAdhkar, l.home, l.quran, l.tasbih, l.settings]);
      for (const b of buttons) act(() => b.click());
      expect(selected).toEqual(["audio", "written", "home", "quran", "tasbih", "settings"]);
    });
  }

  it("labels the Arabic items exactly as approved", () => {
    const buttons = mount(() => {});
    expect(buttons.map((b) => b.textContent)).toEqual(["الأذكار المسموعة", "الأذكار المكتوبة", "الرئيسية", "المصحف", "السبحة", "الإعدادات"]);
  });

  it("marks only the active destination as the current page", () => {
    const buttons = mount(() => {}, "tasbih");
    expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual([null, null, null, null, "page", null]);
  });

  it("the Mushaf item opens the Qur'an reader from any screen (and not again while already there)", () => {
    const openQuran = vi.fn();
    let buttons = mount(() => {}, "home", openQuran);
    act(() => buttons[3].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
    act(() => buttons[0].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
    cleanup?.();
    buttons = mount(() => {}, "quran", openQuran);
    act(() => buttons[3].click());
    expect(openQuran).toHaveBeenCalledTimes(1);
  });
});
