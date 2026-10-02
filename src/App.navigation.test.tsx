// @vitest-environment jsdom
//
// Bottom-tab navigation through the real AppRouter (useScreenNavigation):
// the Audio Adhkar tab opens the Audio Adhkar screen directly from EVERY
// screen that shows the bottom navigation, and Back still walks the stack.
import { afterEach, beforeEach, describe, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { MISC_CATEGORIES, miscLibraryLabels } from "./data/misc-library";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels } from "./data/written-adhkar";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TAB = { home: "الرئيسية", settings: "الإعدادات", audio: "الأذكار المسموعة", written: "الأذكار المكتوبة", tasbih: "السبحة" };

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

const tab = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("nav button")).find((b) => b.textContent?.includes(label))!;
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

/** The Audio Adhkar MAIN screen (not one of its lists). */
const expectAudioAdhkar = async () => {
  await expectScreen(TAB.audio);
  await expectHeading(TAB.audio);
};

/** The browser Back button: consumes the history guard entry (see useScreenNavigation). */
async function browserBack() {
  await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
}

async function openWritten() {
  await expectScreen(TAB.home);
  await tap(TAB.written);
  await expectHeading(TAB.written);
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
    name: "Misc Library",
    open: async () => {
      await openWritten();
      await click(button(writtenAdhkarCategoryLabels.misc.ar), "Various card");
      await expectHeading(miscLibraryLabels.ar.screenTitle);
    },
  },
  {
    name: "Misc Category",
    open: async () => {
      await openWritten();
      await click(button(writtenAdhkarCategoryLabels.misc.ar), "Various card");
      await expectHeading(miscLibraryLabels.ar.screenTitle);
      await click(button(MISC_CATEGORIES.comprehensive.title_ar), "category tile");
      await expectHeading(MISC_CATEGORIES.comprehensive.title_ar);
    },
  },
  {
    name: "Audio Adhkar list",
    open: async () => {
      await expectScreen(TAB.home);
      await tap(TAB.audio);
      await expectAudioAdhkar();
      await click(button(writtenAdhkarCategoryLabels.morning.ar), "Morning card");
      await expectHeading(writtenAdhkarCategoryLabels.morning.ar);
    },
  },
];

describe("the Audio Adhkar tab opens Audio Adhkar directly", () => {
  it.each(SCREENS)("from $name", async ({ open }) => {
    await open();
    await tap(TAB.audio);
    await expectAudioAdhkar();
  });
});

describe("Back behavior is unchanged", () => {
  it("Settings → Audio Adhkar, then Back → Settings → Home", async () => {
    await SCREENS[0].open();
    await tap(TAB.audio);
    await expectAudioAdhkar();
    await browserBack();
    await expectScreen(TAB.settings);
    await browserBack();
    await expectScreen(TAB.home);
  });

  it("Search → Audio Adhkar, then Back → Search → Written Adhkar → Home", async () => {
    await SCREENS.find((s) => s.name === "Search")!.open();
    await tap(TAB.audio);
    await expectAudioAdhkar();
    await browserBack();
    await expectHeading(writtenAdhkarLabels.ar.searchTitle);
    await browserBack();
    await expectHeading(TAB.written);
    await browserBack();
    await expectScreen(TAB.home);
  });
});
