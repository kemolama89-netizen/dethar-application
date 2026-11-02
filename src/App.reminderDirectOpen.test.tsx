// @vitest-environment jsdom
//
// A reminder tapped in a notification or the home-screen widget opens
// DIRECTLY — Home (or any other screen) is never seen first — whether the app
// was closed (cold start), in the background or open. What is seen is
// index.html's launch cover, then the reminder itself; jsdom paints nothing,
// so "seen" is: the cover is in the document, or the reminder view (or its
// opaque stand-in while its code loads) is. Recorded at every DOM change.
//
// The full-screen view's code arrives late here, as on a phone the first time
// (its module is delayed — renderApp): the window in which Home used to show.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ShownReminder } from "./lib/remindersNative";

type OpenEvent = { id: string; commentId?: string | null; shown?: ShownReminder };
const native = vi.hoisted(() => ({
  listener: null as ((e: OpenEvent) => void) | null,
  launch: { id: null as string | null } as OpenEvent | { id: null },
  coverRemovals: 0,
}));

vi.mock("./lib/remindersNative", () => ({
  isRemindersNativeAvailable: () => true,
  RemindersNative: {
    addListener: async (_: string, listener: (e: OpenEvent) => void) => {
      native.listener = listener;
      return { remove: async () => {} };
    },
    consumeLaunchReminder: async () => native.launch,
    reminderViewShown: async () => {
      native.coverRemovals++;
    },
    setAppLook: async () => {},
    setReminders: async () => ({ widgets: 0 }),
    setSummary: async () => {},
    setCustomBackground: async () => {},
    getWidgetStatus: async () => ({ count: 0, pinSupported: false }),
    requestPinWidget: async () => ({ requested: false }),
    getFavoriteOps: async () => ({ ops: [] }),
    setFavoriteKeys: async () => {},
  },
}));

import { reminderPool } from "./lib/reminderContent";
import { nativeReminderItem } from "./lib/remindersSync";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function shownFor(id: string): OpenEvent {
  const item = reminderPool().find((i) => i.id === id)!;
  const n = nativeReminderItem(item, "ar");
  return { id, commentId: null, shown: { category: n.category, title: n.title, text: n.text, meaning: n.meaning, detail: n.detail ?? "", source: n.source, commentText: null } };
}

let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => new Promise((r) => setTimeout(r, 30)));
async function waitFor(ok: () => boolean) {
  for (let waited = 0; !ok(); waited += 30) {
    if (waited > 6000) throw new Error("timed out");
    await settle();
  }
}
const opened = () => container.querySelector("[data-spiritual-reminder]")?.getAttribute("data-spiritual-reminder") ?? null;
const text = () => container.querySelector("[data-reminder-text]")?.textContent ?? null;

/** Every moment, from the first render, at which neither the cover nor the reminder (or its stand-in) is up. */
function watchUncovered() {
  const gaps: string[] = [];
  const check = () => {
    const covered = document.getElementById("dithar-launch-cover") !== null;
    const reminder = container.querySelector("[data-spiritual-reminder], [data-reminder-loading]") !== null;
    if (!covered && !reminder) gaps.push(container.querySelector("[data-home-dashboard]") ? "home" : "other");
  };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { subtree: true, childList: true });
  return { gaps, stop: () => observer.disconnect() };
}
function launchCover({ logo }: { logo: boolean }) {
  const cover = document.createElement("div");
  cover.id = "dithar-launch-cover";
  if (logo) cover.setAttribute("data-logo", "");
  document.body.appendChild(cover);
}
async function renderApp() {
  // A fresh module graph for each test, with the full-screen view's code arriving late, as on a
  // device the first time it is opened.
  vi.resetModules();
  vi.doMock("./components/SpiritualReminderView", async (importOriginal) => {
    await new Promise((r) => setTimeout(r, 250));
    return importOriginal();
  });
  const { default: App } = await import("./App");
  root = createRoot(container);
  await act(async () => root.render(<App />));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("dithar:startup-intro-shown", "1");
  Element.prototype.scrollIntoView ??= () => {};
  native.listener = null;
  native.coverRemovals = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.getElementById("dithar-launch-cover")?.remove();
  delete window.__ditharLogoShownAt;
});
afterAll(() => new Promise((r) => setTimeout(r, 400)));

describe("a tapped reminder opens directly — never Home first", () => {
  for (const logo of [true, false]) {
    it(`cold start (${logo ? "fresh launch: the logo, then the Hadith intro" : "WebView reloaded in the same launch"}): the cover stays until the reminder's view is up`, async () => {
      if (logo) sessionStorage.removeItem("dithar:startup-intro-shown");
      const hadith = reminderPool().find((i) => i.category === "hadith")!;
      native.launch = shownFor(hadith.id);
      launchCover({ logo });
      const watch = watchUncovered();
      await renderApp();
      if (logo) {
        // index.html reports the logo's first frame; its time runs out while the reminder still loads.
        await act(async () => {
          window.__ditharLogoShownAt = performance.now();
          window.dispatchEvent(new Event("dithar-logo-shown"));
        });
      }
      await waitFor(() => opened() === hadith.id && document.getElementById("dithar-launch-cover") === null);
      watch.stop();
      expect(watch.gaps).toEqual([]);
      expect(text()).toBe(hadith.textAr);
      // The Hadith intro stepped aside: nothing stands between the user and the reminder.
      await waitFor(() => container.querySelector("[data-startup-overlay]") === null);
      // Native's own cover goes once the reminder is up (ReminderOpenCover.kt).
      await waitFor(() => native.coverRemovals === 1);
    });
  }

  it("cold start without a reminder: the launch goes on as usual (the cover is released, Home shows)", async () => {
    native.launch = { id: null };
    launchCover({ logo: false });
    await renderApp();
    await waitFor(() => document.getElementById("dithar-launch-cover") === null && container.querySelector("[data-home-dashboard]") !== null);
    expect(opened()).toBeNull();
    expect(native.coverRemovals).toBe(0); // native put up no cover: nothing to take away
  });

  it('app open or in the background ("openReminder"): the view opens over the current screen at once — an opaque stand-in while its code loads', async () => {
    native.launch = { id: null };
    await renderApp();
    await waitFor(() => native.listener !== null && container.querySelector("[data-home-dashboard]") !== null);
    const dua = reminderPool().find((i) => i.kind === "dua")!; // an ordinary dua (a Qur'anic one shows in ﴿ … ﴾)
    const watch = watchUncovered();
    await act(async () => native.listener!(shownFor(dua.id)));
    // Right after the event is handled: the view, or its opaque stand-in, already covers the screen.
    expect(container.querySelector("[data-spiritual-reminder], [data-reminder-loading]")).not.toBeNull();
    // Native's cover stays until the reminder's view is really up.
    expect(native.coverRemovals).toBe(0);
    await waitFor(() => opened() === dua.id);
    watch.stop();
    expect(watch.gaps).toEqual([]);
    expect(text()).toBe(dua.textAr);
    await waitFor(() => native.coverRemovals === 1);
  });

  it("tapping the reminder that is already open still takes native's cover away", async () => {
    native.launch = { id: null };
    await renderApp();
    await waitFor(() => native.listener !== null && container.querySelector("[data-home-dashboard]") !== null);
    const dua = reminderPool().find((i) => i.kind === "dua")!;
    await act(async () => native.listener!(shownFor(dua.id)));
    await waitFor(() => native.coverRemovals === 1);
    await act(async () => native.listener!(shownFor(dua.id)));
    await waitFor(() => native.coverRemovals === 2);
  });

  it("a reminder with nothing to show closes and takes native's cover away, rather than leaving it up until its timer", async () => {
    native.launch = { id: null };
    await renderApp();
    await waitFor(() => native.listener !== null && container.querySelector("[data-home-dashboard]") !== null);
    await act(async () => native.listener!({ id: "dua:no-such-item", commentId: null }));
    await waitFor(() => native.coverRemovals === 1);
    expect(opened()).toBeNull();
  });
});
