// What Home's «مختارات اليوم» card previews on Android: the home-screen widget's own
// item, read from native (RemindersPlugin.getWidgetPreview → WidgetPreview.kt), never a
// rotation of its own. With a widget on the home screen it is exactly the item and
// comment the widget drew; with none, the item the widget's rotation is due to show.
// The result is the very request a tap on the widget sends (lib/reminderOpenRequests.ts),
// so the card's preview and what it opens are always the same item.
//
// Read again whenever it can change: when native says the widget redrew ("widgetChanged":
// a delivered reminder, the clock's slot, new settings or content, a widget added or
// removed), at the clock's next slot (nextChangeAt, reminders off, no widget to redraw),
// and on coming back to the app.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { RemindersNative, isRemindersNativeAvailable } from "./remindersNative";
import type { OpenReminderRequest } from "./reminderOpenRequests";

/**
 * The longest text Home shows: the widget's own limit (lib/widgetFeed.ts WIDGET_MAX_TEXT_CHARS, not imported:
 * it would bring the content review into Home's first load). A longer one is never shown in part.
 */
export const PREVIEW_MAX_CHARS = 190;

export type WidgetPreviewState =
  /** Not known yet. */
  | { kind: "loading" }
  /** The widget's item, as a tap on the widget opens it. */
  | { kind: "item"; request: OpenReminderRequest; from: "widget" | "rotation" }
  /** Native has nothing to show yet (no content pushed). */
  | { kind: "empty" }
  /** No widget here: the web app, or an Android build without the preview. */
  | { kind: "unsupported" };

type NativePreview = Awaited<ReturnType<typeof RemindersNative.getWidgetPreview>>;

/** Native's answer as an open request; empty when it holds no item, or one without its text. */
export function previewState(result: NativePreview): WidgetPreviewState {
  const open = result.open;
  const shown = open?.shown;
  if (!open?.id || !shown || !shown.text.trim()) return { kind: "empty" };
  return { kind: "item", request: { id: open.id, commentId: open.commentId ?? null, shown }, from: result.from === "widget" ? "widget" : "rotation" };
}

/** Never wait longer than this for the clock's next slot: a timer the phone deferred is caught up on. */
const MAX_WAIT_MS = 6 * 3_600_000;

/** Calls [onChange] with the preview now and on every change; returns the unsubscribe. */
export function watchWidgetPreview(onChange: (state: WidgetPreviewState) => void): () => void {
  if (!isRemindersNativeAvailable()) {
    onChange({ kind: "unsupported" });
    return () => {};
  }
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reading = 0;
  const read = () => {
    const mine = ++reading;
    let answer: ReturnType<typeof RemindersNative.getWidgetPreview>;
    try {
      answer = RemindersNative.getWidgetPreview();
    } catch {
      // A plugin without the method at all: as unsupported as a call that rejects.
      if (!stopped) onChange({ kind: "unsupported" });
      return;
    }
    answer.then(
      (result) => {
        // Only the latest read counts: an earlier one answering late must not undo a newer state.
        if (stopped || mine !== reading) return;
        onChange(previewState(result));
        clearTimeout(timer);
        if (typeof result.nextChangeAt === "number" && Number.isFinite(result.nextChangeAt)) {
          timer = setTimeout(read, Math.min(MAX_WAIT_MS, Math.max(1_000, result.nextChangeAt - Date.now() + 1_000)));
        }
      },
      () => {
        if (!stopped && mine === reading) onChange({ kind: "unsupported" });
      },
    );
  };
  const handles: Promise<PluginListenerHandle>[] = [RemindersNative.addListener("widgetChanged", read), App.addListener("resume", read)];
  const onVisible = () => {
    if (document.visibilityState === "visible") read();
  };
  document.addEventListener("visibilitychange", onVisible);
  read();
  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    for (const h of handles) void h.then((x) => x.remove()).catch(() => {});
  };
}
