// @vitest-environment jsdom
//
// The first-time tour through the real App: on a new install's first launch it lights each real control
// on Home in turn; Next, Back, Skip and Finish; it doesn't come back; Settings replays it; Arabic and English.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { LANGUAGE_STORAGE_KEY } from "./lib/appearancePreferences";
import { appTourLabels, onboardingLabels } from "./data/onboardingLabels";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The tour waits 1.2 s after Home appears (the launch intro first); these tests launch the app more than once.
vi.setConfig({ testTimeout: 20_000 });

let container: HTMLDivElement;
let root: Root | null = null;
const settle = (ms = 30) => act(async () => new Promise((r) => setTimeout(r, ms)));
async function waitFor(ok: () => boolean, what: string, limit = 6000) {
  for (let waited = 0; !ok(); waited += 30) {
    if (waited > limit) throw new Error(`timed out waiting for ${what}`);
    await settle();
  }
}
const tour = () => container.querySelector("[data-onboarding-tour]");
const stepId = () => tour()?.getAttribute("data-onboarding-tour") ?? null;
const click = (sel: string) => act(async () => void (container.querySelector(sel) as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true })));
async function launch(language: "ar" | "en" = "ar") {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  root = createRoot(container);
  await act(async () => root!.render(<App />));
}
async function relaunch() {
  await act(async () => root!.unmount());
  root = createRoot(container);
  await act(async () => root!.render(<App />));
}

// jsdom lays nothing out (every box is 0×0, so the tour would rightly find nothing on screen to point at):
// give elements a size, as a real screen does.
const realRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { x: 40, y: 200, top: 200, left: 40, right: 340, bottom: 260, width: 300, height: 60, toJSON: () => ({}) } as DOMRect;
  };
});
afterEach(() => {
  Element.prototype.getBoundingClientRect = realRect;
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("dithar:startup-intro-shown", "1");
  Element.prototype.scrollIntoView ??= () => {};
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  container.remove();
});
afterAll(() => new Promise((r) => setTimeout(r, 400)));

describe.each(["ar", "en"] as const)("first launch (%s)", (language) => {
  const t = onboardingLabels[language];
  it("lights each real control on Home in turn — Back returns, Finish ends it for good", async () => {
    await launch(language);
    await waitFor(() => tour() !== null, "the tour");
    const visited: string[] = [];
    // Each step's ring surrounds a real element that is on screen.
    for (;;) {
      visited.push(stepId()!);
      expect(container.querySelector("[data-onboarding-title]")!.textContent).toBe(t.steps[stepId() as keyof typeof t.steps].title);
      expect(container.querySelector("[data-onboarding-count]")!.textContent).toBe(`${visited.length} / 7`);
      if (visited.length === 2) {
        await click("[data-onboarding-back]");
        expect(stepId()).toBe("prayer");
        await click("[data-onboarding-next]");
      }
      const next = container.querySelector("[data-onboarding-next]")!;
      if (next.textContent === t.finish) break;
      await click("[data-onboarding-next]");
    }
    // Its last word points to Settings → «جولة داخل التطبيق», where the film and the guide are.
    expect(visited).toEqual(["prayer", "picks", "adhkar", "tasbeeh", "quran", "settings", "explore"]);
    expect(t.steps.explore.body).toContain(appTourLabels[language].row);
    // The film is no part of the first launch.
    expect(container.querySelector("[data-intro-film]")).toBeNull();
    // The last step has no Skip, only Back and Finish.
    expect(container.querySelector("[data-onboarding-skip]")).toBeNull();
    await click("[data-onboarding-next]");
    expect(tour()).toBeNull();
    expect(localStorage.getItem("dithar:onboarding:v1")).toBe("finished");
    await relaunch();
    await settle(1500);
    expect(tour()).toBeNull();
  });
});

describe("skip and replay", () => {
  it("Skip ends it and it doesn't return; Settings → «جولة داخل التطبيق» → the guided tour brings it back on Home", async () => {
    await launch("ar");
    await waitFor(() => tour() !== null, "the tour");
    await click("[data-onboarding-skip]");
    expect(tour()).toBeNull();
    expect(localStorage.getItem("dithar:onboarding:v1")).toBe("skipped");
    await relaunch();
    await settle(1500);
    expect(tour()).toBeNull();
    // Settings → «جولة داخل التطبيق» → the guided tour.
    const settingsTab = container.querySelector("[data-tour-tab='settings']") as HTMLElement;
    await act(async () => void settingsTab.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const tap = async (sel: string, what: string) => {
      await waitFor(() => container.querySelector(sel) !== null, what);
      const el = container.querySelector(sel) as HTMLElement;
      await act(async () => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    };
    await tap("[data-settings-row='app-tour']", "the «جولة داخل التطبيق» row");
    await tap("[data-settings-row='onboarding-tour']", "the guided tour row");
    await waitFor(() => tour() !== null && container.querySelector("[data-prayer-panel]") !== null, "the tour again, on Home");
    expect(stepId()).toBe("prayer");
  });

  it("someone who already used DITHAR isn't interrupted by it", async () => {
    localStorage.setItem("dithar:stats:events:v1", "[]");
    // The module decided at load; a fresh module graph isn't needed here because state is read from storage on each check.
    localStorage.setItem("dithar:onboarding:v1", "existing-user");
    await launch("ar");
    await settle(1500);
    expect(tour()).toBeNull();
  });
});
