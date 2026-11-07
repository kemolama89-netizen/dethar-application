// @vitest-environment jsdom
// The Qur'an Journey on screen: the day's mark in Basa'ir, its leaf with al-Sa'di's own words,
// and what counts as exploring the day's page (only the day's insight, kept on screen).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../../lib/appearancePreferences";
import { getSaadiVerse } from "../../lib/saadiTafsir";
import { loadJourney } from "../../lib/quranJourney";
import { todayLocalDate } from "../../lib/stats";
import { VerseTafsirView } from "./TafsirReadingView";
import { QuranJourneyStatCard } from "../QuranJourneyStatCard";

// The view counts after DAILY_VIEW_MS on screen: shortened here so the tests don't wait 3 s each.
vi.mock("../../lib/quranJourney", async (original) => ({ ...(await original<typeof import("../../lib/quranJourney")>()), DAILY_VIEW_MS: 60 }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = "dithar:quran-journey:v1";
let container: HTMLDivElement;
let root: Root;
const mount = (node: React.ReactNode) => act(async () => root.render(<LanguageProvider>{node}</LanguageProvider>));
const settle = (ms = 5) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const q = (s: string) => container.querySelector(s);
const click = (el: Element | null) => act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 600 && !ok(); i++) await settle();
  expect(ok()).toBe(true);
};
const choose = (el: Element | null, value: number) =>
  act(async () => {
    const select = el as HTMLSelectElement;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, String(value));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
const explored = () => loadJourney()?.rounds.flatMap((r) => r.visits.map((v) => v.page)) ?? [];
const today = () => loadJourney()!.today!;

async function openBasair(surah = 1, ayah = 1) {
  await mount(<VerseTafsirView surah={surah} ayah={ayah} onClose={() => {}} />);
  await until(() => q("[data-journey-mark]") !== null && q("[data-tafsir-passage]") !== null);
}
async function openLeaf() {
  await click(q("[data-journey-mark]"));
  await until(() => q("[data-journey-leaf] [data-tafsir-passage]") !== null);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("the day's page in Basa'ir", () => {
  it("shows today's page in the header, unread, with its name", async () => {
    await openBasair();
    const mark = q("[data-journey-mark]")!;
    expect(mark.getAttribute("data-journey-mark")).toBe("unread");
    expect(mark.getAttribute("aria-label")).toBe("صفحة اليوم: الصفحة ١");
    expect(today()).toMatchObject({ localDate: todayLocalDate(), page: 1, round: 1 });
    // Being assigned is not exploring.
    expect(explored()).toEqual([]);
  });

  it("opens the leaf with the day's verse and al-Sa'di's own words on it, exactly as stored", async () => {
    await openBasair();
    await openLeaf();
    const insight = today().insight;
    expect(q("[data-journey-leaf]")!.getAttribute("data-journey-leaf")).toBe(insight);
    expect(q("[data-journey-page='1']")).not.toBeNull();
    const [s, a] = insight.split(":").map(Number);
    const r = await getSaadiVerse(s, a);
    if (r.status !== "found") throw new Error("not found");
    const shown = [...container.querySelectorAll("[data-journey-leaf] [data-tafsir-paragraph]")].map((p) => {
      const copy = p.cloneNode(true) as Element;
      copy.querySelectorAll("[data-saadi-noteref]").forEach((n) => n.remove());
      return copy.textContent;
    });
    const stored = r.parsed.paragraphs.map((p) => p.runs.map((run) => (run.kind === "text" || run.kind === "quote" || run.kind === "marker" ? run.text : "")).join(""));
    expect(shown).toEqual(stored);
    // The page it comes from is the day's page: only verses of page 1 (Al-Fatiha).
    expect(s).toBe(1);
  });

  it("counts the page once the insight has stayed on screen, and shows it read", async () => {
    await openBasair();
    await openLeaf();
    await until(() => explored().length === 1);
    expect(explored()).toEqual([1]);
    await until(() => q("[data-journey-read]") !== null);
    expect(q("[data-journey-mark]")!.getAttribute("data-journey-mark")).toBe("read");
    // Opening it again changes nothing.
    await click(q("[data-journey-close]"));
    await openLeaf();
    await settle(150);
    expect(explored()).toEqual([1]);
  });

  it("doesn't count a leaf closed before the insight had time on screen", async () => {
    await openBasair();
    await click(q("[data-journey-mark]"));
    await click(q("[data-journey-close]"));
    await settle(150);
    expect(q("[data-journey-leaf]")).toBeNull();
    expect(explored()).toEqual([]);
  });

  it("doesn't count reading the same verse's Tafsir freely in Basa'ir", async () => {
    await openBasair();
    await openLeaf();
    await click(q("[data-journey-close]"));
    const [, a] = today().insight.split(":").map(Number);
    // Away and back again, by the pickers: free reading of the very same verse.
    await choose(q("[data-saadi-picker]"), a === 1 ? 2 : 1);
    await choose(q("[data-saadi-picker]"), a);
    await until(() => q("[data-tafsir-passage]")?.getAttribute("data-tafsir-passage") === today().insight);
    await settle(200);
    expect(explored()).toEqual([]);
  });

  it("counts the insight read in its context, reached from the leaf — and not once the reader moves on", async () => {
    await openBasair();
    await click(q("[data-journey-mark]"));
    await click(q("[data-journey-context]"));
    expect(q("[data-journey-leaf]")).toBeNull();
    await until(() => q("[data-tafsir-passage]")?.getAttribute("data-tafsir-passage") === today().insight);
    await until(() => explored().length === 1);

    // Another day's page, left at once for another verse: not counted.
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    await act(async () => root.unmount());
    root = createRoot(container);
    await openBasair();
    await click(q("[data-journey-mark]"));
    await click(q("[data-journey-context]"));
    await click(q("[data-saadi-next]"));
    await settle(200);
    expect(explored()).toEqual([]);
  });

  it("offers the day's page in the bar when no verse is open", async () => {
    await openBasair();
    await click(q("[data-opening-close]"));
    const button = q("[data-journey-footer]")!;
    expect(button.textContent).toBe("صفحة اليوم: ١");
    await click(button);
    await until(() => q("[data-journey-leaf]") !== null);
  });

  it("shows nothing of the journey when its record can't be read, and leaves that record alone", async () => {
    localStorage.setItem(KEY, "{broken");
    await mount(<VerseTafsirView surah={1} ayah={1} onClose={() => {}} />);
    await until(() => q("[data-tafsir-passage]") !== null);
    await settle(50);
    expect(q("[data-journey-mark]")).toBeNull();
    expect(localStorage.getItem(KEY)).toBe("{broken");
  });
});

describe("opened from the daily notification", () => {
  const setVisibility = (state: "visible" | "hidden") =>
    act(async () => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
    });
  afterEach(() => setVisibility("visible"));

  it("opens straight on the day's leaf — the assigned insight — and says when it is on screen", async () => {
    const shown = vi.fn();
    await mount(<VerseTafsirView surah={1} ayah={1} openDailyLeaf onDailyLeafShown={shown} onClose={() => {}} />);
    await until(() => q("[data-journey-leaf] [data-tafsir-passage]") !== null);
    expect(q("[data-journey-leaf]")!.getAttribute("data-journey-leaf")).toBe(today().insight);
    await until(() => shown.mock.calls.length === 1);
    // Opening is not reading: it counts only after its time on screen.
    await until(() => explored().length === 1);
    await settle(100);
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it("doesn't count while the app is in the background, and counts its full time once back", async () => {
    await mount(<VerseTafsirView surah={1} ayah={1} openDailyLeaf onDailyLeafShown={() => {}} onClose={() => {}} />);
    await until(() => q("[data-journey-leaf] [data-tafsir-passage]") !== null);
    await setVisibility("hidden");
    await settle(200);
    expect(explored()).toEqual([]);
    await setVisibility("visible");
    await until(() => explored().length === 1);
  });

  it("still says it is done when there is no assignment to show (unreadable record)", async () => {
    localStorage.setItem(KEY, "{broken");
    const shown = vi.fn();
    await mount(<VerseTafsirView surah={1} ayah={1} openDailyLeaf onDailyLeafShown={shown} onClose={() => {}} />);
    await until(() => shown.mock.calls.length === 1);
    expect(q("[data-journey-leaf]")).toBeNull();
    expect(localStorage.getItem(KEY)).toBe("{broken");
  });
});

describe("the Qur'an Journey in Statistics", () => {
  const card = (expanded = true) => mount(<QuranJourneyStatCard selection={{ kind: "all" }} expanded={expanded} onToggle={() => {}} />);

  it("says the journey hasn't started when nothing is explored", async () => {
    await card();
    expect(q("[data-journey-headline]")!.textContent).toBe("0 من 604 صفحة");
    expect(q("[data-journey-empty]")).not.toBeNull();
  });

  it("shows the round, its percentage, every round kept, the years and the page history", async () => {
    const visits = (n: number, year: number) => Array.from({ length: n }, (_, i) => ({ page: i + 1, insight: `2:${i + 1}`, localDate: `${year}-03-${String((i % 28) + 1).padStart(2, "0")}`, ts: year * 1000 + i }));
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, rounds: [{ n: 1, startedOn: "2024-01-01", completedOn: "2025-12-31", visits: visits(604, 2025) }, { n: 2, startedOn: "2026-01-01", visits: visits(12, 2026) }] }),
    );
    await card();
    expect(q("[data-journey-headline]")!.textContent).toBe("12 من 604 صفحة");
    expect(q("[data-journey-percent]")!.textContent).toBe("1.9%");
    expect(q("[data-journey-rounds]")!.children).toHaveLength(2);
    expect(q("[data-journey-years]")!.textContent).toContain("2025");
    expect(q("[data-journey-history]")!.children).toHaveLength(10);
    await click(q("[data-journey-show-all]"));
    expect(q("[data-journey-history]")!.children).toHaveLength(616);
  });
});
