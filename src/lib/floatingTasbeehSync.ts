// Reconciliation between the native Floating Tasbeeh layer (Android, for
// now — see the feature plan) and DITHAR's Shared Counting Core
// (tasbeehCommit.ts). This is the ONLY place a Floating Tasbeeh tap ever
// turns into a real counters/Statistics write — the native side itself
// never touches tasbeehCounters.ts or stats.ts directly (it can't; those
// only exist inside this JS runtime).
import { App } from "@capacitor/app";
import { FloatingTasbeeh, isFloatingTasbeehAvailable } from "./floatingTasbeehBridge";
import { loadTasbeehCounters } from "./tasbeehCounters";
import { commitFloatingTasbeehRepetitions } from "./tasbeehCommit";
import { computeTasbeehReadyDurationMs } from "./tasbeehTiming";
import { dhikrItems } from "../data/tasbeeh";
import type { FloatingTasbeehBatchEntry } from "./stats";

// Re-exported for every existing importer of this module — see
// floatingTasbeehBridge.ts's own doc comment on isFloatingTasbeehAvailable
// for why it now actually lives there.
export { isFloatingTasbeehAvailable };

// Pushes the FULL Tasbeeh dhikr library (id + Arabic label, in
// tasbeeh-library.json order) to native storage, so the long-press popup's
// scrollable dhikr list always shows the SAME items and wording as the main
// app's own Tasbeeh screen — never a hardcoded native subset that could
// drift out of sync with a future content edit. Each item also carries its
// own `readyDurationMs`, computed with the EXACT SAME function TasbeehScreen
// itself calls (computeTasbeehReadyDurationMs — see tasbeehTiming.ts) — so
// the floating bubble's own calm-counting pacing gate uses the identical
// per-dhikr duration as the main screen, without native code ever needing
// to know the word-count tiering logic itself.
export async function pushFloatingDhikrList(): Promise<void> {
  if (!isFloatingTasbeehAvailable()) return;
  const items = dhikrItems.map((item) => ({
    id: item.id,
    label: item.dhikr_ar,
    readyDurationMs: computeTasbeehReadyDurationMs(item.dhikr_ar),
  }));
  await FloatingTasbeeh.setDhikrList({ items });
}

// Drains every pending native tap and commits it through
// commitFloatingTasbeehRepetitions — the Shared Counting Core, the exact
// same path a manual tap or Voice Tasbeeh repetition goes through (just a
// different `source` tag in Statistics). Native is only told the drain
// succeeded (confirmPendingEventsDrained) AFTER the commit above has
// actually completed — so if this process is killed in between, the same
// events are simply redelivered and recommitted next time: safe, since
// they were never confirmed as drained, and commitFloatingTasbeehRepetitions
// has no other side effect that recommitting would corrupt (it's a plain
// increment + log-append, not something that needs its own idempotency
// key on the JS side — the native cursor is what prevents an
// ALREADY-CONFIRMED event from ever being redelivered).
export async function reconcileFloatingTasbeeh(): Promise<void> {
  if (!isFloatingTasbeehAvailable()) return;

  const { events } = await FloatingTasbeeh.getPendingEvents();
  if (events.length === 0) return;

  const entries: FloatingTasbeehBatchEntry[] = events.map((event) => ({
    dhikrId: event.dhikrId,
    times: event.times,
    occurredAt: { ts: event.ts, localDate: event.localDate, localTime: event.localTime, timeZone: event.timeZone },
  }));

  commitFloatingTasbeehRepetitions(loadTasbeehCounters(), entries);
  await FloatingTasbeeh.confirmPendingEventsDrained({ count: events.length });
}

let syncStarted = false;

// Wires reconciliation to run at app startup, again every time the app
// returns to the foreground (the two moments a native tap could have
// happened while this JS runtime wasn't running to see it at all), AND —
// the immediate, no-noticeable-delay path — the instant native itself
// reports a fresh tap via the "pendingEventsChanged" event (see
// FloatingTasbeehService#notifyPendingEventsChanged), which fires even
// while this JS runtime is already alive and foregrounded (a floating tap
// never itself triggers an appStateChange, since the overlay never takes
// focus away from DITHAR's own WebView). Event-driven, never polled.
// Idempotent: calling it more than once (e.g. a hot-reload in dev) never
// registers a second listener.
export function startFloatingTasbeehSync(): void {
  if (syncStarted || !isFloatingTasbeehAvailable()) return;
  syncStarted = true;

  void pushFloatingDhikrList();
  void reconcileFloatingTasbeeh();
  void App.addListener("appStateChange", (state) => {
    if (state.isActive) void reconcileFloatingTasbeeh();
  });
  void FloatingTasbeeh.addListener("pendingEventsChanged", () => {
    void reconcileFloatingTasbeeh();
  });
}
