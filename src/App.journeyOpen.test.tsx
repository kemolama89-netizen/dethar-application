// @vitest-environment jsdom
//
// The Journey notification's tap path, through the real App: native reports the tapped
// notification (cold start, or "openJourney" while running) and Basa'ir opens straight on
// the day's leaf — the assigned insight — over the current screen, with native's cover taken
// away once it has painted. Opening counts nothing until the insight has had its time.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { JourneyOpen } from "./lib/quranJourneyNative";

const native = vi.hoisted(() => ({
  listener: null as ((e: JourneyOpen) => void) | null,
  launch: { page: null } as JourneyOpen,
  shown: 0,
  notices: [] as unknown[],
}));

vi.mock("./lib/quranJourneyNative", () => ({
  isJourneyNativeAvailable: () => true,
  QuranJourneyNative: {
    addListener: async (event: string, listener: (e: JourneyOpen) => void) => {
      if (event === "openJourney") native.listener = listener;
      return { remove: async () => {} };
    },
    consumeLaunchJourney: async () => native.launch,
    journeyViewShown: async () => {
      native.shown++;
    },
    setJourneyNotice: async (o: unknown) => {
      native.notices.push(o);
      return { nextAt: null };
    },
    getStatus: async () => ({ notifications: true, exact: true, nextAt: null }),
  },
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: async () => ({ remove: async () => {} }), exitApp: async () => {} } }));

import App from "./App";
import { loadJourney } from "./lib/quranJourney";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => new Promise((r) => setTimeout(r, 30)));
async function waitFor(ok: () => boolean) {
  for (let waited = 0; !ok(); waited += 30) {
    if (waited > 8000) throw new Error("timed out");
    await settle();
  }
}
const leaf = () => container.querySelector("[data-journey-leaf]")?.getAttribute("data-journey-leaf") ?? null;
const explored = () => loadJourney()?.rounds.flatMap((r) => r.visits.map((v) => v.page)) ?? [];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("dithar:startup-intro-shown", "1");
  Element.prototype.scrollIntoView ??= () => {};
  native.listener = null;
  native.shown = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
afterAll(() => new Promise((r) => setTimeout(r, 400)));

describe("a tapped Journey notification opens the day's insight", () => {
  it("cold start: opens on the day's leaf (page 1), not the Mushaf or Home, and takes the cover away", async () => {
    native.launch = { page: 1, round: 1, insight: "1:1", fromDate: "2026-01-01" };
    root = createRoot(container);
    await act(async () => root.render(<App />));
    await waitFor(() => container.querySelector("[data-journey-leaf] [data-tafsir-passage]") !== null);
    expect(leaf()).toBe(loadJourney()!.today!.insight);
    expect(container.querySelector("[data-journey-page='1']")).not.toBeNull();
    await waitFor(() => native.shown > 0);
    // Opening isn't reading: nothing yet counted at once.
    expect(explored()).toEqual([]);
  });

  it("while running: opens over the current screen; closing returns to it", async () => {
    native.launch = { page: null };
    root = createRoot(container);
    await act(async () => root.render(<App />));
    await waitFor(() => native.listener !== null);
    expect(leaf()).toBeNull();
    await act(async () => native.listener!({ page: 1, round: 1, insight: "1:2", fromDate: "2026-01-01" }));
    await waitFor(() => leaf() !== null);
    // The day's assignment, whatever an older notification carried.
    expect(leaf()).toBe(loadJourney()!.today!.insight);
    await act(async () => (container.querySelector("[data-journey-close]") as HTMLElement).click());
    await act(async () => (container.querySelector("[data-tafsir-back]") as HTMLElement).click());
    await waitFor(() => container.querySelector("[data-basair]") === null);
  });

  it("a plain launch opens nothing of the journey, and assigns nothing while the notification is off", async () => {
    native.launch = { page: null };
    root = createRoot(container);
    await act(async () => root.render(<App />));
    await waitFor(() => native.notices.length > 0);
    await settle();
    expect(container.querySelector("[data-basair]")).toBeNull();
    expect(loadJourney()!.today).toBeUndefined();
  });
});
