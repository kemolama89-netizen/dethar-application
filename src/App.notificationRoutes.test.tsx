// @vitest-environment jsdom
//
// A tapped notification opens its own screen through the real App — at a cold start (the route is
// waiting before the screens exist) and while the app runs — never just Home; in Arabic and English.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const routes = vi.hoisted(() => ({ launch: null as string | null, onRoute: null as ((r: string) => void) | null }));
vi.mock("./lib/floatingTasbeehSync", async (original) => ({
  ...(await original<typeof import("./lib/floatingTasbeehSync")>()),
  startFloatingTasbeehSync: () => {},
  // As native: the cold start's route is pulled at once; later ones arrive while running.
  startFloatingOpenRouteRequests: (onRoute: (r: string) => void) => {
    routes.onRoute = onRoute;
    if (routes.launch) {
      const r = routes.launch;
      routes.launch = null; // pull-and-clear
      onRoute(r);
    }
    return () => {};
  },
}));

import App from "./App";
import { LANGUAGE_STORAGE_KEY } from "./lib/appearancePreferences";
import { writtenAdhkarCategoryLabels } from "./data/written-adhkar";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => new Promise((r) => setTimeout(r, 30)));
async function waitFor(ok: () => boolean, what: string) {
  for (let waited = 0; !ok(); waited += 30) {
    if (waited > 6000) throw new Error(`timed out waiting for ${what}; heading: ${heading()}`);
    await settle();
  }
}
const heading = () => container.querySelector("h1")?.textContent?.trim() ?? "";
const T = {
  ar: { statistics: "إحصائيات دِثار", tasbeeh: "السبحة", audio: "الأذكار المسموعة", settings: "الإعدادات" },
  en: { statistics: "Dithar Statistics", tasbeeh: "Tasbeeh", audio: "Audio Adhkar", settings: "Settings" },
};

async function launch(language: "ar" | "en", route: string | null) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  routes.launch = route;
  root = createRoot(container);
  await act(async () => root.render(<App />));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("dithar:startup-intro-shown", "1");
  Element.prototype.scrollIntoView ??= () => {};
  routes.onRoute = null;
  routes.launch = null;
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
afterAll(() => new Promise((r) => setTimeout(r, 400)));

describe.each(["ar", "en"] as const)("cold start (%s): the tapped notification's screen opens first", (language) => {
  const t = T[language];
  it("the end-of-day summary opens Statistics", async () => {
    await launch(language, "statistics");
    await waitFor(() => heading() === t.statistics, "Statistics");
  });
  it("a prayer notification opens the prayer times", async () => {
    await launch(language, "prayer");
    await waitFor(() => container.querySelector("[data-prayer-panel]") !== null, "the prayer panel");
  });
  it("Floating Tasbeeh's notification opens Tasbeeh", async () => {
    await launch(language, "tasbeeh");
    await waitFor(() => heading() === t.tasbeeh, "Tasbeeh");
  });
  it("an adhan-interrupted session's resume opens Audio Adhkar (its banner)", async () => {
    await launch(language, "audio");
    await waitFor(() => heading() === t.audio, "Audio Adhkar");
  });
  it.each(["morning", "evening", "misc"] as const)("an Audio Adhkar notification of %s opens that section's list", async (section) => {
    await launch(language, `audio:${section}`);
    await waitFor(() => heading() === writtenAdhkarCategoryLabels[section][language] && container.querySelector("[data-play-all]") !== null, `the ${section} list`);
  });
});

describe("while running (background or foreground)", () => {
  it("each tap navigates to its screen — a repeated tap changes nothing, and Back returns where the user was", async () => {
    await launch("ar", null);
    await waitFor(() => routes.onRoute !== null, "the route listener");
    expect(container.querySelector("[data-prayer-panel]")).not.toBeNull(); // Home, as launched
    await act(async () => routes.onRoute!("audio:evening"));
    await waitFor(() => heading() === writtenAdhkarCategoryLabels.evening.ar, "the Evening list");
    await act(async () => routes.onRoute!("audio:morning"));
    await waitFor(() => heading() === writtenAdhkarCategoryLabels.morning.ar, "the Morning list");
    await act(async () => routes.onRoute!("statistics"));
    await waitFor(() => heading() === T.ar.statistics, "Statistics");
    await act(async () => routes.onRoute!("statistics"));
    await settle();
    expect(heading()).toBe(T.ar.statistics);
  });

  it("an unknown route is ignored", async () => {
    await launch("en", null);
    await waitFor(() => routes.onRoute !== null, "the route listener");
    await act(async () => routes.onRoute!("javascript:alert(1)"));
    await settle();
    expect(container.querySelector("[data-prayer-panel]")).not.toBeNull();
  });

  it("Settings opened normally after the summary starts at its menu, not Statistics", async () => {
    await launch("en", "statistics");
    await waitFor(() => heading() === T.en.statistics, "Statistics");
    await act(async () => routes.onRoute!("prayer"));
    await waitFor(() => container.querySelector("[data-prayer-panel]") !== null, "Home");
    const settingsTab = [...container.querySelectorAll("nav button")].find((b) => b.textContent?.includes(T.en.settings))!;
    await act(async () => void settingsTab.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitFor(() => heading() === T.en.settings, "the Settings menu");
  });
});
