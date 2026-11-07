// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  available: true,
  listeners: new Map<string, () => void>(),
  getWidgetPreview: vi.fn(),
}));
vi.mock("./remindersNative", () => ({
  isRemindersNativeAvailable: () => native.available,
  RemindersNative: {
    getWidgetPreview: native.getWidgetPreview,
    addListener: (event: string, fn: () => void) => {
      native.listeners.set(event, fn);
      return Promise.resolve({ remove: async () => void native.listeners.delete(event) });
    },
  },
}));
const app = vi.hoisted(() => ({ resume: null as null | (() => void) }));
vi.mock("@capacitor/app", () => ({
  App: { addListener: (_e: string, fn: () => void) => ((app.resume = fn), Promise.resolve({ remove: async () => {} })) },
}));

import { PREVIEW_MAX_CHARS, previewState, watchWidgetPreview, type WidgetPreviewState } from "./homeWidgetPreview";
import { WIDGET_MAX_TEXT_CHARS } from "./widgetFeed";

const shown = (text: string) => ({ category: "hadith", title: "حديث نبوي", text, meaning: "", detail: "", source: "رواه مسلم", commentText: null });
const answer = (id: string | null, text = "نص", extra: Partial<{ from: "widget" | "rotation"; nextChangeAt: number | null; commentId: string }> = {}) => ({
  open: id ? { id, commentId: extra.commentId ?? null, shown: shown(text) } : null,
  from: extra.from ?? "widget",
  nextChangeAt: extra.nextChangeAt ?? null,
});
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  native.available = true;
  native.listeners.clear();
  native.getWidgetPreview.mockReset();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date(2026, 10, 6, 10));
});
afterEach(() => vi.useRealTimers());

describe("the widget's item as Home previews it", () => {
  it("shows no more than the widget itself may: the same length limit", () => {
    expect(PREVIEW_MAX_CHARS).toBe(WIDGET_MAX_TEXT_CHARS);
  });

  it("is the very request a tap on the widget sends: its id, the comment drawn with it, the strings drawn", () => {
    const state = previewState(answer("hadith:12", "إنما الأعمال بالنيات", { commentId: "theme:x" }));
    expect(state).toEqual({ kind: "item", from: "widget", request: { id: "hadith:12", commentId: "theme:x", shown: shown("إنما الأعمال بالنيات") } });
  });

  it("is empty when native holds no item, or an item without its text", () => {
    expect(previewState(answer(null))).toEqual({ kind: "empty" });
    expect(previewState(answer("dua:1", "  "))).toEqual({ kind: "empty" });
    expect(previewState({ open: { id: "dua:1" }, from: "rotation", nextChangeAt: null })).toEqual({ kind: "empty" });
  });

  it("follows the widget: read again when it redraws, and on coming back to the app", async () => {
    native.getWidgetPreview.mockResolvedValueOnce(answer("dua:1")).mockResolvedValueOnce(answer("hadith:2")).mockResolvedValueOnce(answer("virtue:3"));
    const seen: WidgetPreviewState[] = [];
    const stop = watchWidgetPreview((s) => seen.push(s));
    await flush();
    native.listeners.get("widgetChanged")!();
    await flush();
    app.resume!();
    await flush();
    expect(seen.map((s) => (s.kind === "item" ? s.request.id : s.kind))).toEqual(["dua:1", "hadith:2", "virtue:3"]);
    stop();
  });

  it("reads again at the clock's next slot, when nothing else would redraw it", async () => {
    native.getWidgetPreview.mockResolvedValueOnce(answer("dua:1", "نص", { nextChangeAt: Date.now() + 60_000, from: "rotation" })).mockResolvedValueOnce(answer("hadith:9"));
    const seen: string[] = [];
    const stop = watchWidgetPreview((s) => seen.push(s.kind === "item" ? s.request.id : s.kind));
    await flush();
    await vi.advanceTimersByTimeAsync(59_000);
    expect(seen).toEqual(["dua:1"]);
    await vi.advanceTimersByTimeAsync(3_000);
    await flush();
    expect(seen).toEqual(["dua:1", "hadith:9"]);
    stop();
  });

  it("never lets an earlier, slower answer replace a newer one", async () => {
    let first!: (v: unknown) => void;
    native.getWidgetPreview.mockReturnValueOnce(new Promise((r) => (first = r))).mockResolvedValueOnce(answer("hadith:2"));
    const seen: string[] = [];
    const stop = watchWidgetPreview((s) => seen.push(s.kind === "item" ? s.request.id : s.kind));
    native.listeners.get("widgetChanged")!();
    await flush();
    first(answer("dua:1"));
    await flush();
    expect(seen).toEqual(["hadith:2"]);
    stop();
  });

  it("is unsupported without the native widget, or in a build that lacks the preview", async () => {
    native.available = false;
    const seen: WidgetPreviewState[] = [];
    watchWidgetPreview((s) => seen.push(s));
    expect(seen).toEqual([{ kind: "unsupported" }]);

    native.available = true;
    native.getWidgetPreview.mockRejectedValueOnce(new Error("not implemented"));
    const later: WidgetPreviewState[] = [];
    const stop = watchWidgetPreview((s) => later.push(s));
    await flush();
    expect(later).toEqual([{ kind: "unsupported" }]);
    stop();
  });

  it("stops listening when Home goes", async () => {
    native.getWidgetPreview.mockResolvedValue(answer("dua:1"));
    const seen: string[] = [];
    const stop = watchWidgetPreview((s) => seen.push(s.kind));
    await flush();
    stop();
    await flush();
    expect(native.listeners.has("widgetChanged")).toBe(false);
  });
});
