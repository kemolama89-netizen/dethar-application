// @vitest-environment jsdom
//
// Bilingual coverage for the Exit App button + confirmation dialog. Mounts
// the real ExitAppButton alongside the real LanguageControl (the app's own
// language toggle) under LanguageProvider, so the language switch goes
// through the app's existing state rather than a test-only mechanism.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ExitAppButton } from "./ExitAppButton";
import { LanguageControl } from "./LanguageControl";
import { LanguageProvider } from "../theme/LanguageContext";
import { exitAppLabels } from "../data/exitApp";
import { dismissTopBackOverlay, backOverlayCount } from "../lib/backOverlays";

vi.mock("@capacitor/app", () => ({ App: { exitApp: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

async function click(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const exitButton = () => container.querySelector('button[aria-label="' + exitAppLabels.ar.buttonAria + '"], button[aria-label="' + exitAppLabels.en.buttonAria + '"]') as HTMLButtonElement;
const dialog = () => container.querySelector('[role="dialog"]') as HTMLElement | null;
const languageToggle = () => container.querySelector('button[aria-label="Switch to English"], button[aria-label="التبديل إلى العربية"]') as HTMLButtonElement;

beforeEach(async () => {
  // The chosen language now persists (appearancePreferences.ts) — every test
  // here assumes a fresh, first-launch (Arabic) start.
  localStorage.clear();
  vi.mocked(CapacitorApp.exitApp).mockClear();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <LanguageControl />
        <ExitAppButton />
      </LanguageProvider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.removeChild(container);
});

describe("ExitAppButton — Arabic (default)", () => {
  it("shows Arabic only, rtl", async () => {
    expect(exitButton().getAttribute("aria-label")).toBe("الخروج من التطبيق");
    await click(exitButton());
    const d = dialog()!;
    expect(d.getAttribute("dir")).toBe("rtl");
    expect(d.getAttribute("aria-label")).toBe("هل تريد الخروج من التطبيق؟");
    expect(d.textContent).toContain("هل تريد الخروج من التطبيق؟");
    const labels = Array.from(d.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels).toEqual(["إلغاء", "خروج"]);
    expect(LATIN.test(d.textContent ?? "")).toBe(false);
    expect(LATIN.test(exitButton().getAttribute("aria-label")!)).toBe(false);
  });
});

describe("ExitAppButton — English", () => {
  beforeEach(async () => {
    await click(languageToggle());
  });

  it("shows English only, ltr", async () => {
    expect(document.documentElement.lang).toBe("en");
    expect(exitButton().getAttribute("aria-label")).toBe("Exit the app");
    await click(exitButton());
    const d = dialog()!;
    expect(d.getAttribute("dir")).toBe("ltr");
    expect(d.getAttribute("aria-label")).toBe("Do you want to exit the app?");
    expect(d.textContent).toContain("Do you want to exit the app?");
    const labels = Array.from(d.querySelectorAll("button")).map((b) => b.textContent);
    expect(labels).toEqual(["Cancel", "Exit"]);
    expect(ARABIC.test(d.textContent ?? "")).toBe(false);
    expect(ARABIC.test(d.getAttribute("aria-label")!)).toBe(false);
    expect(ARABIC.test(exitButton().getAttribute("aria-label")!)).toBe(false);
  });

  it("switches back to Arabic when the language is toggled again", async () => {
    await click(exitButton());
    await click(languageToggle());
    expect(dialog()!.textContent).toContain("هل تريد الخروج من التطبيق؟");
    expect(dialog()!.getAttribute("dir")).toBe("rtl");
  });
});

describe("ExitAppButton — behavior unchanged in both languages", () => {
  for (const [name, cancelIdx] of [["ar", 0], ["en", 0]] as const) {
    it(`Cancel closes without exiting (${name})`, async () => {
      if (name === "en") await click(languageToggle());
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      await click(exitButton());
      await click(dialog()!.querySelectorAll("button")[cancelIdx]);
      expect(dialog()).toBeNull();
      expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    });

    it(`Confirm calls App.exitApp on native (${name})`, async () => {
      if (name === "en") await click(languageToggle());
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      await click(exitButton());
      await click(dialog()!.querySelectorAll("button")[1]);
      expect(dialog()).toBeNull();
      expect(CapacitorApp.exitApp).toHaveBeenCalledTimes(1);
    });

    it(`Confirm on web only closes the dialog (${name})`, async () => {
      if (name === "en") await click(languageToggle());
      await click(exitButton());
      await click(dialog()!.querySelectorAll("button")[1]);
      expect(dialog()).toBeNull();
      expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    });
  }
});

describe("exitAppLabels", () => {
  it("has the same keys in both languages and no cross-script leakage", () => {
    expect(Object.keys(exitAppLabels.en).sort()).toEqual(Object.keys(exitAppLabels.ar).sort());
    for (const v of Object.values(exitAppLabels.en)) expect(ARABIC.test(v)).toBe(false);
    for (const v of Object.values(exitAppLabels.ar)) expect(LATIN.test(v)).toBe(false);
  });
});

// System Back (lib/backOverlays.ts) must cancel the open confirmation — like
// its backdrop — WITHOUT exiting the app; with the dialog closed it has
// nothing to dismiss, so the navigation layer's own Back handling applies.
describe("ExitAppButton — system Back", () => {
  it("cancels the open dialog and does not exit the app", async () => {
    expect(backOverlayCount()).toBe(0);
    await click(exitButton());
    expect(dialog()).not.toBeNull();
    expect(backOverlayCount()).toBe(1);
    await act(async () => {
      expect(dismissTopBackOverlay()).toBe(true);
    });
    expect(dialog()).toBeNull();
    expect(backOverlayCount()).toBe(0);
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
  });

  it("registers nothing while the dialog is closed", () => {
    expect(backOverlayCount()).toBe(0);
    expect(dismissTopBackOverlay()).toBe(false);
  });
});
