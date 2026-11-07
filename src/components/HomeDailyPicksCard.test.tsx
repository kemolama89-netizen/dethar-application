// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { HomeDailyPicksCard } from "./HomeDailyPicksCard";
import { LanguageProvider } from "../theme/LanguageContext";
import { getDailyPicks } from "../lib/dailyPicks";
import { MISC_DUAS } from "../data/misc-library";
import { msUntilNextLocalDay, useLocalDateKey } from "../lib/useLocalDateKey";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = "dithar:misc:daily-picks:v1";
let container: HTMLDivElement;
let root: Root;

/** Today's first pick for a local date, as the library computes it (storage cleared, so nothing stale is honoured). */
function firstPickOn(date: Date): string {
  localStorage.removeItem(STORAGE_KEY);
  const id = getDailyPicks(date)[0].id;
  localStorage.removeItem(STORAGE_KEY);
  return id;
}

const shownId = () => container.querySelector("[data-home-daily-picks]")?.getAttribute("data-home-daily-picks") ?? "";
const pickId = (id: string) => `dua:${id}`;

/** Lets the card's lazy import and state update settle. */
async function settle() {
  for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.dispatchEvent(new Event("resume"));
  vi.useRealTimers();
  localStorage.clear();
});

describe("Home «مختارات اليوم»: one pick per local day", () => {
  it("without a widget (the web app), previews today's dua: its kind, and its whole text exactly as stored", async () => {
    const day = new Date(2026, 9, 22, 9);
    vi.setSystemTime(day);
    const opened: unknown[] = [];
    await act(async () => root.render(<LanguageProvider><HomeDailyPicksCard onOpen={(r) => opened.push(r)} /></LanguageProvider>));
    await settle();
    const id = firstPickOn(day);
    expect(shownId()).toBe(`dua:${id}`);
    const card = container.querySelector("[data-home-daily-picks]")!;
    expect(card.getAttribute("data-home-daily-picks-from")).toBe("daily-pick");
    expect(card.textContent).toContain("مختارات اليوم");
    const dua = MISC_DUAS.find((d) => d.id === id)!;
    // Its whole text when it is as short as a widget item; a longer dua shows the hint, never part of it.
    const excerpt = card.querySelector("[data-home-daily-pick-excerpt]");
    if (dua.text_ar.length <= 190) expect(excerpt!.textContent).toBe(dua.text_ar);
    else expect(excerpt).toBeNull();
    expect(card.querySelector(".dithar-daily-pick__kind")!.textContent).toBe("دعاء");
    // A tap opens that very dua, in full, down the notification path.
    await act(async () => void card.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(opened).toEqual([{ id: `dua:${id}`, commentId: null, shown: { category: "dua", title: "دعاء", text: dua.text_ar, meaning: "", detail: "", source: dua.source_ar ?? "", commentText: null } }]);
  });

  it("changes at local midnight while Home stays open, and stays the same all day", async () => {
    const evening = new Date(2026, 9, 21, 23, 59, 30);
    const yesterday = firstPickOn(evening);
    const today = firstPickOn(new Date(2026, 9, 22, 9));
    expect(today).not.toBe(yesterday);

    vi.setSystemTime(evening);
    await act(async () => root.render(<LanguageProvider><HomeDailyPicksCard onOpen={() => {}} /></LanguageProvider>));
    await settle();
    expect(shownId()).toBe(pickId(yesterday));

    // Still the same day: no change.
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    await settle();
    expect(shownId()).toBe(pickId(yesterday));

    // Past midnight (the hook fires a second after it): the new day's pick.
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    await settle();
    expect(shownId()).toBe(pickId(today));

    // Through the day — and on coming back to the app — it stays put.
    await act(async () => { await vi.advanceTimersByTimeAsync(12 * 3_600_000); });
    document.dispatchEvent(new Event("pause"));
    document.dispatchEvent(new Event("resume"));
    await settle();
    expect(shownId()).toBe(pickId(today));
  });

  it("back in the app the next morning (no midnight timer ran in the background), it shows that day's pick", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 22, 0));
    const yesterday = firstPickOn(new Date(2026, 9, 21, 22, 0));
    await act(async () => root.render(<LanguageProvider><HomeDailyPicksCard onOpen={() => {}} /></LanguageProvider>));
    await settle();
    expect(shownId()).toBe(pickId(yesterday));

    // The app goes to the background; the clock moves on without timers firing (Android may defer them).
    document.dispatchEvent(new Event("pause"));
    vi.setSystemTime(new Date(2026, 9, 22, 7, 30));
    document.dispatchEvent(new Event("resume"));
    await settle();
    expect(shownId()).toBe(pickId(firstPickOn(new Date(2026, 9, 22, 7, 30))));
  });
});

describe("useLocalDateKey", () => {
  it("counts to the next calendar midnight, also across a DST change", () => {
    expect(msUntilNextLocalDay(new Date(2026, 9, 21, 23, 59, 30))).toBe(30_000);
    const start = new Date(2026, 2, 29, 0, 0);
    expect(new Date(start.getTime() + msUntilNextLocalDay(start)).getDate()).toBe(30);
  });

  it("without atMidnight, the day changes only when the app comes back (a screen never shifts while open)", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 59, 30));
    const seen: string[] = [];
    function Probe() {
      const day = useLocalDateKey();
      seen.push(day);
      return null;
    }
    await act(async () => root.render(<Probe />));
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(seen.at(-1)).toBe("2026-10-21");
    document.dispatchEvent(new Event("pause"));
    document.dispatchEvent(new Event("resume"));
    await settle();
    expect(seen.at(-1)).toBe("2026-10-22");
  });
});
