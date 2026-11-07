// @vitest-environment jsdom
// Settings → «دليل الميزات»: reachable from the menu, one section open at a time, a section can open its
// Settings page and Back returns to the guide where it was. Plus the one-line first-visit hint on the
// involved Settings pages: shown once, never for existing users.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SettingsScreen } from "./SettingsScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { QuranReciterProvider } from "../theme/QuranReciterContext";
import { AdhkarNavContext } from "../lib/adhkarNav";
import { featureGuideLabels, GUIDE_ORDER } from "../data/featureGuideLabels";
import { appTourLabels } from "../data/onboardingLabels";
import { subscribeIntroReplay } from "../lib/introFilm";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20_000 });

const g = featureGuideLabels.ar; // LanguageProvider's own initial language
let container: HTMLDivElement;
let root: Root;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <QuranReciterProvider>
              <AdhkarNavContext.Provider value={null}>
                <SettingsScreen onNavigateHome={() => {}} onNavigateToTasbeeh={() => {}} onNavigateToWritten={() => {}} onNavigateToAudio={() => {}} />
              </AdhkarNavContext.Provider>
            </QuranReciterProvider>
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
}

async function click(el: Element | null) {
  if (!el) throw new Error("element not found");
  await act(async () => {
    (el as HTMLElement).click();
  });
}

const $ = (sel: string) => container.querySelector(sel);
/** Settings → «جولة داخل التطبيق» → «دليل الميزات». */
async function openGuide() {
  await click($("[data-settings-row='app-tour']"));
  await click($("[data-settings-row='feature-guide']"));
}

beforeEach(() => localStorage.clear());
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Feature guide", () => {
  it("opens from Settings → «جولة داخل التطبيق», every section closed", async () => {
    await mount();
    expect($("[data-settings-row='feature-guide']")).toBeNull(); // not on the menu itself any more
    await click($("[data-settings-row='app-tour']"));
    expect($("[data-app-tour]")).not.toBeNull();
    const row = $("[data-settings-row='feature-guide']");
    expect(row?.textContent).toContain(g.row);
    await click(row);
    expect($("[data-feature-guide]")).not.toBeNull();
    expect(container.querySelectorAll("[data-guide-section]")).toHaveLength(GUIDE_ORDER.length);
    expect(container.querySelectorAll("[data-guide-panel]")).toHaveLength(0);
  });

  it("opens one section at a time, announced with aria-expanded", async () => {
    await mount();
    await openGuide();
    const adhan = $("[data-guide-toggle='adhan']")!;
    await click(adhan);
    expect(adhan.getAttribute("aria-expanded")).toBe("true");
    const panel = $("[data-guide-panel='adhan']")!;
    expect(adhan.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.querySelectorAll("li")).toHaveLength(g.sections.adhan.points.length);
    await click($("[data-guide-toggle='weekly']"));
    expect($("[data-guide-panel='adhan']")).toBeNull();
    expect($("[data-guide-panel='weekly']")).not.toBeNull();
    await click($("[data-guide-toggle='weekly']"));
    expect(container.querySelectorAll("[data-guide-panel]")).toHaveLength(0);
  });

  it("opens a section's Settings page, and Back returns to the guide at that section", async () => {
    await mount();
    await openGuide();
    await click($("[data-guide-toggle='weekly']"));
    await click($("[data-guide-open='weekly-schedule']"));
    expect($("[data-holiday-start]")).not.toBeNull();
    await click(container.querySelector("button[aria-label='رجوع']"));
    expect($("[data-feature-guide]")).not.toBeNull();
    expect($("[data-guide-panel='weekly']")).not.toBeNull();
    // From the guide, Back goes to «جولة داخل التطبيق», then to the menu; a page opened from the menu goes back to the menu.
    await click(container.querySelector("button[aria-label='رجوع']"));
    expect($("[data-app-tour]")).not.toBeNull();
    await click(container.querySelector("button[aria-label='رجوع']"));
    expect($("[data-settings-row='app-tour']")).not.toBeNull();
    await click($("[data-settings-row='weekly-schedule']") ?? [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("الجدول الأسبوعي")) ?? null);
    await click(container.querySelector("button[aria-label='رجوع']"));
    expect($("[data-feature-guide]")).toBeNull();
  });

  it("«جولة داخل التطبيق» also holds the film and the guided tour", async () => {
    const opened = vi.fn();
    const stop = subscribeIntroReplay(opened);
    await mount();
    await click($("[data-settings-row='app-tour']"));
    expect($("[data-settings-row='intro-film']")?.textContent).toContain(appTourLabels.ar.film);
    expect($("[data-settings-row='onboarding-tour']")?.textContent).toContain(appTourLabels.ar.tour);
    await click($("[data-settings-row='intro-film']"));
    expect(opened).toHaveBeenCalledTimes(1);
    stop();
  });

  it("has the same sections and the same number of points in Arabic and English", () => {
    for (const id of GUIDE_ORDER) {
      expect(featureGuideLabels.en.sections[id].points).toHaveLength(featureGuideLabels.ar.sections[id].points.length);
      expect(featureGuideLabels.en.sections[id].open).toBe(featureGuideLabels.ar.sections[id].open);
    }
  });
});

describe("Settings first-visit hints", () => {
  async function openWeekly() {
    await mount();
    await click([...container.querySelectorAll("button")].find((b) => b.textContent?.includes("الجدول الأسبوعي")) ?? null);
  }

  it("shows once on the weekly schedule, until «حسنًا»", async () => {
    await openWeekly();
    const hint = $("[data-first-visit-hint='settings-weekly']");
    expect(hint?.textContent).toContain(g.hints.weekly);
    await click($("[data-first-visit-hint-ok]"));
    expect($("[data-first-visit-hint='settings-weekly']")).toBeNull();
    await act(async () => root.unmount());
    container.remove();
    await openWeekly();
    expect($("[data-first-visit-hint='settings-weekly']")).toBeNull();
  });

  it("isn't shown to someone who used the app before the tour existed", async () => {
    localStorage.setItem("dithar:onboarding:v1", "existing-user");
    await openWeekly();
    expect($("[data-holiday-start]")).not.toBeNull();
    expect($("[data-first-visit-hint]")).toBeNull();
  });
});
