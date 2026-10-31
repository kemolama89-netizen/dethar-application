// @vitest-environment jsdom
// Settings → Appearance → «تخصيص المظهر»: choices are previewed first, applied
// together (and kept after a restart), and the default appearance can be
// restored; the look reaches the whole app (html[data-look]) and Home shows
// its wallpaper and frosted cards.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { LookProvider } from "../theme/LookContext";
import { LookCustomizer } from "./LookCustomizer";
import { DeviceFrame } from "./DeviceFrame";
import { DailyProgressCard } from "./HomeDashboard";
import { BottomNav } from "./BottomNav";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { LOOK_STORAGE_KEY, wallpaperUrl } from "../theme/looks";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <LookProvider>{node}</LookProvider>
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    ),
  );
}
const click = (sel: string) => act(() => void container.querySelector<HTMLElement>(sel)!.click());
const look = () => document.documentElement.getAttribute("data-look");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-look");
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("customize appearance", () => {
  it("previews a choice before applying it; Apply saves the theme, wallpaper, transparency and dark mode together", () => {
    mount(<LookCustomizer onBack={() => {}} />);
    expect(look()).toBe("classic");
    click('[data-look-tile="look:night"]');
    // Only the preview changed; the app is still Classic, and nothing is saved.
    expect(container.querySelector("[data-look-preview]")!.getAttribute("data-look-preview")).toBe("night");
    expect(container.querySelector("[data-look-dirty]")).not.toBeNull();
    expect(look()).toBe("classic");
    expect(localStorage.getItem(LOOK_STORAGE_KEY)).toBeNull();

    click('[data-look-tile="wallpaper:sea"]');
    // There is no manual colour choice any more: the theme sets the colours.
    expect(container.querySelector("[data-look-accent]")).toBeNull();
    click('[data-look-autodark="time"]');
    const slider = container.querySelector<HTMLInputElement>("[data-look-opacity]")!;
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(slider, "0.6");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    click("[data-look-apply]");

    expect(JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY)!)).toEqual({ look: "night", wallpaper: "sea", cardOpacity: 0.6, autoDark: "time" });
    expect(document.documentElement.getAttribute("data-palette")).toBe("original");
    expect(look()).toBe("night");
    expect(document.documentElement.style.getPropertyValue("--look-wallpaper")).toContain(wallpaperUrl("sea"));
    expect(document.documentElement.style.getPropertyValue("--look-card-alpha")).toBe("0.6");
    expect(container.querySelector("[data-look-dirty]")).toBeNull();
  });

  it("is kept after a restart, and «restore default» brings the original appearance back", () => {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ look: "sunset", wallpaper: "flowers", cardOpacity: 0.9, autoDark: "off" }));
    mount(<LookCustomizer onBack={() => {}} />);
    expect(look()).toBe("sunset");
    expect(container.querySelector('[data-look-tile="look:sunset"]')!.getAttribute("aria-pressed")).toBe("true");
    click("[data-look-restore]");
    expect(look()).toBe("classic");
    expect(JSON.parse(localStorage.getItem(LOOK_STORAGE_KEY)!)).toEqual({ look: "classic", wallpaper: "theme", cardOpacity: 0.82, autoDark: "off" });
    expect(document.documentElement.getAttribute("data-palette")).toBe("original");
  });

  it("is in English, left to right, in English mode", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount(<LookCustomizer onBack={() => {}} />);
    expect(container.textContent).toContain("Customize appearance");
    expect(container.textContent).toContain("Modern Sunset");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("Home under a look", () => {
  it("shows the wallpaper behind it, and its cards and navigation frosted — the same content", () => {
    mount(
      <DeviceFrame wallpaper>
        <DailyProgressCard />
        <BottomNav />
      </DeviceFrame>,
    );
    const screen = container.querySelector(".device-screen")!;
    expect(screen.classList.contains("dithar-home-screen")).toBe(true);
    expect(container.querySelector("[data-home-progress]")!.classList.contains("dithar-glass")).toBe(true);
    expect(container.querySelector("nav")!.classList.contains("dithar-glass")).toBe(true);
    expect(container.querySelectorAll("[data-home-stat]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("nav button")).toHaveLength(5);
  });

  it("other screens keep their solid page (no wallpaper class)", () => {
    mount(
      <DeviceFrame>
        <BottomNav activeKey="settings" />
      </DeviceFrame>,
    );
    expect(container.querySelector(".device-screen")!.classList.contains("dithar-home-screen")).toBe(false);
  });
});
