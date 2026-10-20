// @vitest-environment jsdom
//
// The whole tap path, through the real App: native reports a tapped reminder
// (a cold start's launch reminder, or an "openReminder" event while running)
// and the full-screen view opens on exactly that item — never another.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ShownReminder } from "./lib/remindersNative";

type OpenEvent = { id: string; commentId?: string | null; shown?: ShownReminder };
const native = vi.hoisted(() => ({
  listener: null as ((e: OpenEvent) => void) | null,
  launch: { id: null as string | null } as OpenEvent | { id: null },
}));

vi.mock("./lib/remindersNative", () => ({
  isRemindersNativeAvailable: () => true,
  RemindersNative: {
    addListener: async (_: string, listener: (e: OpenEvent) => void) => {
      native.listener = listener;
      return { remove: async () => {} };
    },
    consumeLaunchReminder: async () => native.launch,
    setReminders: async () => ({ widgets: 0 }),
    setSummary: async () => {},
    setCustomBackground: async () => {},
    getWidgetStatus: async () => ({ count: 0, pinSupported: false }),
    requestPinWidget: async () => ({ requested: false }),
    getFavoriteOps: async () => ({ ops: [] }),
    setFavoriteKeys: async () => {},
  },
}));

import App from "./App";
import { reminderPool } from "./lib/reminderContent";
import { nativeReminderItem } from "./lib/remindersSync";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function shownFor(id: string): OpenEvent {
  const item = reminderPool().find((i) => i.id === id)!;
  const n = nativeReminderItem(item, "ar");
  const c = n.comments[0];
  return { id, commentId: c?.id ?? null, shown: { category: n.category, title: n.title, text: n.text, meaning: n.meaning, detail: n.detail ?? "", source: n.source, commentText: c?.text ?? null } };
}

let container: HTMLDivElement;
let root: Root;
const settle = () => act(async () => new Promise((r) => setTimeout(r, 30)));
async function waitFor(ok: () => boolean) {
  for (let waited = 0; !ok(); waited += 30) {
    if (waited > 5000) throw new Error("timed out");
    await settle();
  }
}
const opened = () => container.querySelector("[data-spiritual-reminder]")?.getAttribute("data-spiritual-reminder") ?? null;
const text = () => container.querySelector("[data-reminder-text]")?.textContent ?? null;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("dithar:startup-intro-shown", "1");
  Element.prototype.scrollIntoView ??= () => {};
  native.listener = null;
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
// Home's idle prefetch of the next screens schedules a short image-preload timer
// (icons/CategoryEmblem.tsx): let it run before this file's DOM is torn down.
afterAll(() => new Promise((r) => setTimeout(r, 400)));

describe("a tapped reminder opens exactly what it showed", () => {
  it("cold start: the launch reminder (a «سبحان الله» dhikr) opens as that very dhikr", async () => {
    const dhikr = reminderPool().find((i) => i.category === "virtue" && i.textAr.startsWith("سُبْحَانَ اللَّهِ"))!;
    native.launch = shownFor(dhikr.id);
    root = createRoot(container);
    await act(async () => root.render(<App />));
    await waitFor(() => opened() !== null);
    expect(opened()).toBe(dhikr.id);
    expect(text()).toBe(dhikr.textAr);
    // The content itself — never the widget's settings.
    expect(container.querySelector("[data-widget-info]")).toBeNull();
  });

  it("while running: each tapped Hadith opens itself, in turn — with its own source", async () => {
    native.launch = { id: null };
    root = createRoot(container);
    await act(async () => root.render(<App />));
    await waitFor(() => native.listener !== null);
    const [a, b] = reminderPool().filter((i) => i.category === "hadith");
    for (const h of [a, b]) {
      await act(async () => native.listener!(shownFor(h.id)));
      await waitFor(() => opened() === h.id);
      expect(text()).toBe(h.textAr);
      expect(container.querySelector("[data-reminder-source]")!.textContent).toContain(h.sourceAr);
      expect(container.querySelector("[data-widget-info]")).toBeNull();
    }
  });
});
