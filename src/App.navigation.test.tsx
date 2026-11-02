// @vitest-environment jsdom
//
// Bottom-tab navigation through the real AppRouter (useScreenNavigation):
// the Adhkar tab opens the Adhkar screen from EVERY screen that shows the
// bottom navigation, its two cards open Audio Adhkar and Written Adhkar, and
// Back still walks the stack.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { MISC_DUAS } from "./data/misc-library";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels } from "./data/written-adhkar";
import { resetQuranReadingCacheForTesting, saveQuranPosition } from "./lib/quranReading";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TAB = { home: "الرئيسية", settings: "الإعدادات", adhkar: "الأذكار", tasbih: "السبحة", quran: "المصحف" };
/** The Adhkar screen's two cards, and the screens they open (titled as before). */
const AUDIO = "الأذكار المسموعة";
const WRITTEN = "الأذكار المكتوبة";

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  // jsdom has no layout; the Reader scrolls its cards into view.
  Element.prototype.scrollIntoView ??= () => {};
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<App />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const tab = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("nav button")).find((b) => b.textContent === label)!;
/** The highlighted bottom tab (each screen marks its own section). */
const activeTab = () => container.querySelector('nav button[aria-current="page"]')?.textContent ?? "";
const heading = () => container.querySelector("h1")?.textContent?.trim() ?? "";

/** Waits (screens load lazily, some open after a short card transition) until `ok()`; fails after 5 s. */
async function waitFor(ok: () => boolean, what: string) {
  for (let waited = 0; !ok(); waited += 20) {
    if (waited > 5000) throw new Error(`Timed out waiting for ${what} (tab "${activeTab()}", heading "${heading()}")`);
    await act(async () => new Promise((r) => setTimeout(r, 20)));
  }
}
const expectScreen = (label: string) => waitFor(() => activeTab().includes(label), `the "${label}" tab`);
const expectHeading = (text: string) => waitFor(() => heading() === text, `heading "${text}"`);

async function click(el: Element | null | undefined, what: string) {
  if (!el) throw new Error(`No ${what}`);
  await act(async () => (el as HTMLElement).click());
}
const tap = (label: string) => click(tab(label), `"${label}" tab`);
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text));

/** The Audio Adhkar MAIN screen (not one of its lists) — under the Adhkar tab. */
const expectAudioAdhkar = async () => {
  await expectScreen(TAB.adhkar);
  await expectHeading(AUDIO);
};

/** The Adhkar tab, then the Adhkar screen's card for Audio or Written Adhkar. */
async function openAdhkarCard(card: "audio" | "written") {
  await tap(TAB.adhkar);
  await expectHeading(TAB.adhkar);
  await click(container.querySelector(`[data-adhkar-card="${card}"]`), `${card} card`);
}

/** The browser Back button: consumes the history guard entry (see useScreenNavigation). */
async function browserBack() {
  await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
}

async function openWritten() {
  await expectScreen(TAB.home);
  await openAdhkarCard("written");
  await expectHeading(WRITTEN);
}

// How to reach each screen that shows the bottom navigation.
const SCREENS: { name: string; open: () => Promise<void> }[] = [
  {
    name: "Settings",
    open: async () => {
      await expectScreen(TAB.home);
      await tap(TAB.settings);
      await expectScreen(TAB.settings);
    },
  },
  {
    name: "Tasbeeh",
    open: async () => {
      await expectScreen(TAB.home);
      await tap(TAB.tasbih);
      await expectScreen(TAB.tasbih);
    },
  },
  { name: "Written Adhkar", open: openWritten },
  {
    name: "Reader (Written Adhkar category)",
    open: async () => {
      await openWritten();
      await click(button(writtenAdhkarCategoryLabels.morning.ar), "Morning card");
      await expectHeading(writtenAdhkarCategoryLabels.morning.ar);
    },
  },
  {
    name: "Search",
    open: async () => {
      await openWritten();
      await click(container.querySelector(`button[aria-label="${writtenAdhkarLabels.ar.searchAria}"]`), "search button");
      await expectHeading(writtenAdhkarLabels.ar.searchTitle);
    },
  },
  {
    name: "Audio Adhkar list",
    open: async () => {
      await expectScreen(TAB.home);
      await openAdhkarCard("audio");
      await expectAudioAdhkar();
      await click(button(writtenAdhkarCategoryLabels.morning.ar), "Morning card");
      await expectHeading(writtenAdhkarCategoryLabels.morning.ar);
    },
  },
];

describe("the Adhkar tab opens the Adhkar screen, whose cards open Audio and Written Adhkar", () => {
  it.each(SCREENS)("from $name", async ({ open }) => {
    await open();
    await openAdhkarCard("audio");
    await expectAudioAdhkar();
  });

  it("the Written Adhkar card opens Written Adhkar, and Back returns to the Adhkar screen, then Home", async () => {
    await openWritten();
    expect(activeTab()).toBe(TAB.adhkar);
    await browserBack();
    await expectHeading(TAB.adhkar);
    await browserBack();
    await expectScreen(TAB.home);
  });

  it("the bar has exactly five tabs, Home in the centre", async () => {
    await expectScreen(TAB.home);
    // Left to right on screen; i.e. right to left: Tasbeeh, Adhkar, Home, Mushaf, Settings.
    expect(Array.from(container.querySelectorAll("nav button")).map((b) => b.textContent)).toEqual([TAB.settings, TAB.quran, TAB.home, TAB.adhkar, TAB.tasbih]);
  });
});

describe("the back arrows", () => {
  const backArrow = () => container.querySelector<HTMLElement>("[data-back-arrow]");

  it("the Adhkar screen's arrow returns to the previous screen (Home, or Settings)", async () => {
    await expectScreen(TAB.home);
    await tap(TAB.adhkar);
    await expectHeading(TAB.adhkar);
    await click(backArrow(), "Adhkar back arrow");
    await expectScreen(TAB.home);
    await tap(TAB.settings);
    await expectScreen(TAB.settings);
    await tap(TAB.adhkar);
    await expectHeading(TAB.adhkar);
    await click(backArrow(), "Adhkar back arrow");
    await expectScreen(TAB.settings);
  });

  it("Audio Adhkar's and Written Adhkar's arrows return to the Adhkar screen", async () => {
    await expectScreen(TAB.home);
    await openAdhkarCard("audio");
    await expectAudioAdhkar();
    await click(backArrow(), "Audio Adhkar back arrow");
    await expectHeading(TAB.adhkar);
    await click(container.querySelector('[data-adhkar-card="written"]'), "written card");
    await expectHeading(WRITTEN);
    await click(backArrow(), "Written Adhkar back arrow");
    await expectHeading(TAB.adhkar);
    // …and from there, back to Home.
    await click(backArrow(), "Adhkar back arrow");
    await expectScreen(TAB.home);
  }, 20_000);

  it("the Written Adhkar card shows an open book with a bookmark — no star ornament", async () => {
    await expectScreen(TAB.home);
    await tap(TAB.adhkar);
    await expectHeading(TAB.adhkar);
    const card = container.querySelector('[data-adhkar-card="written"]')!;
    expect(card.querySelectorAll("svg rect")).toHaveLength(0);
    expect(card.innerHTML).not.toContain("rotate(45)");
  });
});

describe("Back behavior is unchanged", () => {
  it("Settings → Adhkar → Audio Adhkar, then Back → Adhkar → Settings → Home", async () => {
    await SCREENS[0].open();
    await openAdhkarCard("audio");
    await expectAudioAdhkar();
    await browserBack();
    await expectHeading(TAB.adhkar);
    await browserBack();
    await expectScreen(TAB.settings);
    await browserBack();
    await expectScreen(TAB.home);
  });

  it("Search → Adhkar → Audio Adhkar, then Back → Adhkar → Home (the Adhkar screen was already on the way to Search: the stack rewinds to it)", async () => {
    await SCREENS.find((s) => s.name === "Search")!.open();
    await openAdhkarCard("audio");
    await expectAudioAdhkar();
    await browserBack();
    await expectHeading(TAB.adhkar);
    await browserBack();
    await expectScreen(TAB.home);
  }, 20_000);
});

describe("the Mushaf tab", () => {
  // localStorage is cleared before each test; the reading position's in-memory copy too.
  beforeEach(() => resetQuranReadingCacheForTesting());
  const reader = () => container.querySelector("[data-quran-reader]");
  const current = () => container.querySelector("[data-quran-current]")?.getAttribute("data-quran-current");

  it("from Home, opens the Mushaf at its beginning before any reading", async () => {
    await expectScreen(TAB.home);
    await tap(TAB.quran);
    await waitFor(() => reader() !== null, "the Qur'an reader");
    expect(current()).toBe("1:1");
    expect(container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page")).toBe("1");
  });

  it.each(SCREENS)("from $name, continues at the saved reading position", async ({ open }) => {
    saveQuranPosition(18, 10);
    await open();
    await tap(TAB.quran);
    await waitFor(() => reader() !== null, "the Qur'an reader");
    expect(current()).toBe("18:10");
  });

  it("its surah index keeps the navigation (the Mushaf active); Back returns to the reader where it was left, then Home", async () => {
    await expectScreen(TAB.home);
    await tap(TAB.quran);
    await waitFor(() => reader() !== null, "the Qur'an reader");
    await click(container.querySelector("[data-quran-next-page]"), "next page");
    await waitFor(() => current() === "2:1", "page 2");
    await click(container.querySelector("[data-quran-open-settings]"), "reading settings");
    await click(container.querySelector("[data-quran-open-index]"), "surah index button");
    await expectScreen(TAB.quran);
    await tap(TAB.tasbih);
    await expectScreen(TAB.tasbih);
    await browserBack();
    await waitFor(() => reader() !== null, "the Qur'an reader again");
    expect(current()).toBe("2:1");
    await browserBack();
    await expectScreen(TAB.home);
  }, 20_000);
});

describe("Written Adhkar categories", () => {
  it("offers Morning, Evening and Prayer only — no Misc Duas card", async () => {
    await openWritten();
    for (const key of ["morning", "evening", "prayer"] as const) expect(button(writtenAdhkarCategoryLabels[key].ar), key).toBeDefined();
    expect(button(writtenAdhkarCategoryLabels.misc.ar)).toBeUndefined();
  });
});

describe("the Morning and Evening lamps on Home", () => {
  for (const [section, title] of [["morning", "أذكار الصباح"], ["evening", "أذكار المساء"]] as const) {
    it(`the ${section} lamp opens that session in Written Adhkar`, async () => {
      await expectScreen(TAB.home);
      const lamp = container.querySelector<HTMLElement>(`[data-home-wird="${section}"]`);
      expect(lamp!.textContent).toContain(title);
      await click(lamp, `${section} lamp`);
      await waitFor(() => container.querySelector("[data-home-wird]") === null, "Home to give way to the reader");
      await waitFor(() => (container.textContent ?? "").includes(title), "the session's reader");
      await browserBack();
      await expectScreen(TAB.home);
    });
  }
});

describe("«مختارات اليوم» on Home", () => {
  it("opens like a tapped notification: the same full-screen view, on the very dua the card shows — never settings — and Back returns to Home", async () => {
    await expectScreen(TAB.home);
    const card = () => container.querySelector<HTMLElement>("[data-home-daily-picks]");
    await waitFor(() => !!card()?.getAttribute("data-home-daily-picks"), "today's pick on the card");
    const id = card()!.getAttribute("data-home-daily-picks")!;
    const dua = MISC_DUAS.find((d) => d.id === id)!;
    // The dua's text stays hidden on Home until it is opened.
    expect(card()!.textContent).not.toContain(dua.text_ar.slice(0, 12));
    await click(card(), "Daily Picks card");
    await waitFor(() => container.querySelector("[data-spiritual-reminder]") !== null, "the reminder view");
    expect(container.querySelector("[data-spiritual-reminder]")!.getAttribute("data-spiritual-reminder")).toBe(`dua:${id}`);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(dua.text_ar);
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain(dua.source_ar!);
    expect(container.querySelector("[data-widget-info]")).toBeNull();
    await browserBack();
    await waitFor(() => container.querySelector("[data-spiritual-reminder]") === null, "the reminder view to close");
    await expectScreen(TAB.home);
  });
});
