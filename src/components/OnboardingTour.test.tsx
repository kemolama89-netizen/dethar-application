// @vitest-environment jsdom
// The tour lights only controls that are really on screen: a missing one is left out, and with none it
// ends quietly. A section's first-visit hint shows once.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { OnboardingTour } from "./OnboardingTour";
import { FirstVisitHint } from "./FirstVisitHint";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const realRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
  // Laid out: an element counts as on screen when it has a box (jsdom gives none by itself).
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const on = (this as HTMLElement).dataset?.onscreen === "1" || this.closest?.("[data-onboarding-card]");
    return (on ? { x: 40, y: 600, top: 600, left: 40, right: 340, bottom: 650, width: 300, height: 50 } : { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }) as DOMRect;
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.querySelectorAll("[data-fixture]").forEach((e) => e.remove());
  Element.prototype.getBoundingClientRect = realRect;
});

function fixture(html: string) {
  const host = document.createElement("div");
  host.setAttribute("data-fixture", "");
  host.innerHTML = html;
  document.body.appendChild(host);
}

describe("the tour on what is really there", () => {
  it("leaves out a step whose control isn't on screen", async () => {
    fixture(`<div data-toggles-row data-onscreen="1"></div><button data-tour-tab="adhkar" data-onscreen="1"></button><button data-tour-tab="quran"></button>`);
    const onClose = vi.fn();
    await act(async () => root.render(<LanguageProvider><OnboardingTour onClose={onClose} /></LanguageProvider>));
    expect(container.querySelector("[data-onboarding-tour]")!.getAttribute("data-onboarding-tour")).toBe("prayer");
    expect(container.querySelector("[data-onboarding-count]")!.textContent).toBe("1 / 2");
    expect(container.querySelector("[data-onboarding-ring]")).not.toBeNull();
    await act(async () => void (container.querySelector("[data-onboarding-next]") as HTMLElement).click());
    expect(container.querySelector("[data-onboarding-tour]")!.getAttribute("data-onboarding-tour")).toBe("adhkar");
    expect(container.querySelector("[data-onboarding-next]")!.textContent).toBe("Finish");
    await act(async () => void (container.querySelector("[data-onboarding-next]") as HTMLElement).click());
    expect(onClose).toHaveBeenCalledWith("finished");
  });

  it("ends quietly when nothing it points at is on screen", async () => {
    const onClose = vi.fn();
    await act(async () => root.render(<LanguageProvider><OnboardingTour onClose={onClose} /></LanguageProvider>));
    expect(onClose).toHaveBeenCalledWith("skipped");
    expect(container.querySelector("[data-onboarding-card]")).toBeNull();
  });

  it("is a labelled dialog, in the interface's direction, its main button focused", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    fixture(`<div data-home-daily-picks data-onscreen="1"></div>`);
    await act(async () => root.render(<LanguageProvider><OnboardingTour onClose={() => {}} /></LanguageProvider>));
    const card = container.querySelector("[data-onboarding-card]")!;
    expect(card.getAttribute("role")).toBe("dialog");
    expect(card.getAttribute("aria-label")).toBe("جولة في دِثار");
    expect(container.querySelector("[data-onboarding-tour]")!.getAttribute("dir")).toBe("rtl");
    expect(document.activeElement).toBe(container.querySelector("[data-onboarding-next]"));
  });
});

describe("first-visit hints", () => {
  it("shows once, until «Got it»", async () => {
    await act(async () => root.render(<LanguageProvider><FirstVisitHint id="audio-play-all" text="hint" /></LanguageProvider>));
    expect(container.querySelector("[data-first-visit-hint='audio-play-all']")).not.toBeNull();
    await act(async () => void (container.querySelector("[data-first-visit-hint-ok]") as HTMLElement).click());
    expect(container.querySelector("[data-first-visit-hint]")).toBeNull();
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<LanguageProvider><FirstVisitHint id="audio-play-all" text="hint" /></LanguageProvider>));
    expect(container.querySelector("[data-first-visit-hint]")).toBeNull();
  });
});
