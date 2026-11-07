// @vitest-environment jsdom
// «مختارات اليوم» on Android: the widget's own item (lib/homeWidgetPreview.ts), and what a tap opens.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import type { WidgetPreviewState } from "../lib/homeWidgetPreview";
import type { OpenReminderRequest } from "../lib/reminderOpenRequests";

const preview = vi.hoisted(() => ({ push: null as null | ((s: WidgetPreviewState) => void), stopped: 0 }));
vi.mock("../lib/homeWidgetPreview", () => ({
  PREVIEW_MAX_CHARS: 190,
  watchWidgetPreview: (fn: (s: WidgetPreviewState) => void) => {
    preview.push = fn;
    return () => void preview.stopped++;
  },
}));

import { HomeDailyPicksCard } from "./HomeDailyPicksCard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const card = () => container.querySelector("[data-home-daily-picks]")!;
const excerpt = () => card().querySelector("[data-home-daily-pick-excerpt]")?.textContent ?? null;
const push = (s: WidgetPreviewState) => act(async () => preview.push!(s));
const tap = () => act(async () => void card().dispatchEvent(new MouseEvent("click", { bubbles: true })));
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 10))));

/** A widget item as native gives it (kinds the widget rotates: dua, Hadith, a dhikr's virtue, poetry). */
const item = (id: string, category: string, title: string, text: string, commentId: string | null = null): WidgetPreviewState => ({
  kind: "item",
  from: "widget",
  request: { id, commentId, shown: { category, title, text, meaning: "", detail: "", source: "المصدر", commentText: commentId ? "تعليق" : null } },
});

let opened: OpenReminderRequest[];
beforeEach(() => {
  localStorage.clear();
  opened = [];
  preview.stopped = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const mount = () => act(async () => root.render(<LanguageProvider><HomeDailyPicksCard onOpen={(r) => opened.push(r)} /></LanguageProvider>));

describe("«مختارات اليوم» previews the widget's item", () => {
  it("shows a quiet hint while the widget's item is being read, and opens nothing yet", async () => {
    await mount();
    expect(card().getAttribute("data-home-daily-picks-from")).toBe("loading");
    expect(excerpt()).toBeNull();
    await tap();
    expect(opened).toEqual([]);
  });

  it.each([
    ["dua:allahumma-x", "dua", "دعاء"],
    ["hadith:12", "hadith", "حديث نبوي"],
    ["virtue:subhanallah", "virtue", "فضل الذكر"],
    ["poetry:3", "poetry", "من الشعر"],
  ])("%s: its kind and its text exactly as the widget holds them, and a tap opens that same item", async (id, category, title) => {
    await mount();
    const state = item(id, category, title, "نصٌّ كما هو، بلا أي تغيير.", "theme:c1");
    await push(state);
    expect(card().getAttribute("data-home-daily-picks")).toBe(id);
    expect(card().getAttribute("data-home-daily-picks-from")).toBe("widget");
    expect(card().querySelector(".dithar-daily-pick__kind")!.textContent).toBe(title);
    expect(excerpt()).toBe("نصٌّ كما هو، بلا أي تغيير.");
    await tap();
    expect(opened).toEqual([state.kind === "item" ? state.request : null]);
  });

  it("changes with the widget, without a refresh, and still opens what it shows", async () => {
    await mount();
    await push(item("dua:1", "dua", "دعاء", "الأول"));
    await push(item("hadith:7", "hadith", "حديث نبوي", "الثاني"));
    expect(excerpt()).toBe("الثاني");
    await tap();
    expect(opened.map((r) => r.id)).toEqual(["hadith:7"]);
  });

  it("never shows part of a text: one longer than the widget's limit shows the hint instead", async () => {
    await mount();
    await push(item("hadith:1", "hadith", "حديث نبوي", "كلمة ".repeat(40).trim()));
    expect(excerpt()).toBeNull();
    expect(card().querySelector(".dithar-daily-pick__hint")).not.toBeNull();
    // Still that item's kind, and a tap still opens it in full.
    expect(card().querySelector(".dithar-daily-pick__kind")!.textContent).toBe("حديث نبوي");
    await tap();
    expect(opened.map((r) => r.id)).toEqual(["hadith:1"]);
  });

  it("shows a widget-length text whole, with no clipping", async () => {
    const text = "ب".repeat(190);
    await mount();
    await push(item("hadith:2", "hadith", "حديث نبوي", text));
    expect(excerpt()).toBe(text);
    expect(getComputedStyle(card().querySelector("[data-home-daily-pick-excerpt]")!).webkitLineClamp ?? "").not.toBe("2");
  });

  it("with nothing on the widget yet, or no preview in this build, shows today's dua instead", async () => {
    await mount();
    await push({ kind: "empty" });
    for (let i = 0; i < 50 && card().getAttribute("data-home-daily-picks-from") !== "daily-pick"; i++) await settle();
    expect(card().getAttribute("data-home-daily-picks-from")).toBe("daily-pick");
    expect(card().getAttribute("data-home-daily-picks")!.startsWith("dua:")).toBe(true);
    // Today's dua whole when it fits the card (190 characters), else the «read» hint — never cut short.
    // Which one depends on the day's dua, so either is right; both are never shown together.
    const hint = card().querySelector(".dithar-daily-pick__hint");
    expect((excerpt() === null) !== (hint === null)).toBe(true);
    if (excerpt() !== null) expect(excerpt()!.length).toBeLessThanOrEqual(190);

    await push({ kind: "unsupported" });
    expect(card().getAttribute("data-home-daily-picks-from")).toBe("daily-pick");
  });

  it("stops following the widget when Home goes", async () => {
    await mount();
    await act(async () => root.unmount());
    expect(preview.stopped).toBe(1);
    root = createRoot(container);
  });
});
