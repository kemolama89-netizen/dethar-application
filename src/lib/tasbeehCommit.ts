// The Shared Tasbeeh Counting Core — the one seam every input source
// (manual tap, Voice Tasbeeh, and the future Floating Tasbeeh bridge)
// routes a completed repetition through, so the live counter
// (tasbeehCounters.ts) and the Statistics event log (stats.ts) can never
// drift apart because one caller persisted them differently from another.
//
// Deliberately NOT added to tasbeehCounters.ts itself — that module's own
// doc comment documents it never importing stats.ts, which is what
// guarantees Reset can never touch Statistics history. This file imports
// both, so tasbeehCounters.ts's own import graph — and that guarantee —
// stays exactly as it was.
import { saveTasbeehCounters, type TasbeehCounters } from "./tasbeehCounters";
import { FloatingTasbeeh, isFloatingTasbeehAvailable } from "./floatingTasbeehBridge";
import {
  recordTasbeehRepetition,
  recordFloatingTasbeehRepetition,
  recordFloatingTasbeehRepetitions,
  type FloatingTasbeehOccurredAt,
  type FloatingTasbeehBatchEntry,
} from "./stats";

// Pushes ONE dhikr's freshly-updated count into the native live-count
// mirror (the same one a floating TAP itself writes — see
// FloatingTasbeehStore#setLiveCount) so the bubble, if it's currently
// showing this exact dhikr, reflects a manual tap or the main screen's own
// Voice Tasbeeh match immediately — no separate counter, just this one
// authoritative value pushed to wherever else it needs to be displayed.
// A safe no-op on every platform without the native bridge (iOS, web).
// Floating Tasbeeh itself has no voice input of its own — this only ever
// covers JS-side commits, never anything native code does on its own.
function syncLiveCountToNative(dhikrId: number, count: number): void {
  if (!isFloatingTasbeehAvailable()) return;
  void FloatingTasbeeh.syncLiveCount({ dhikrId, count });
}

// Pure increment + persist, plus the native live-count push above — no
// Statistics write. Exported on its own (see applyVoiceTasbeehCountIncrement
// below) because it's safe to call from inside a React functional state
// updater; a Statistics-log append is not. Every real caller that turns a
// completed repetition into a counters update funnels through this ONE
// function — commitManualTasbeehRepetition, commitFloatingTasbeehRepetition,
// and applyVoiceTasbeehCountIncrement below — which is what makes the
// native push above cover manual taps and Voice Tasbeeh from one single
// place, rather than needing to be repeated at each call site.
function applyTasbeehCountIncrement(counters: TasbeehCounters, dhikrId: number, times: number): TasbeehCounters {
  const updated = { ...counters, [dhikrId]: (counters[dhikrId] ?? 0) + times };
  saveTasbeehCounters(updated);
  syncLiveCountToNative(dhikrId, updated[dhikrId]);
  return updated;
}

// Manual in-app tap — one repetition. TasbeehScreen's handleTap calls this
// as a single, ordinary function call (never from inside a setCounts
// functional updater), so combining the counters write and the Statistics
// write into one call here is safe.
export function commitManualTasbeehRepetition(counters: TasbeehCounters, dhikrId: number): TasbeehCounters {
  const updated = applyTasbeehCountIncrement(counters, dhikrId, 1);
  recordTasbeehRepetition(dhikrId);
  return updated;
}

// Floating Tasbeeh's own commit path — same shape as the manual one above,
// tagged with its own `source: "floating"` in Statistics (see
// recordFloatingTasbeehRepetition's own doc comment in stats.ts). Not yet
// called from any UI or native bridge in this phase; this is the seam a
// future reconciliation step (draining taps committed outside the app)
// will call once one exists. `times` defaults to 1: one ACCEPTED floating
// tap (i.e. one that already cleared the native-side calm-counting pacing
// gate — see FloatingTasbeehService#handleTap, which uses the SAME
// per-dhikr readyDurationMs the main screen computes) is one immediate +1
// here, never re-paced a second time on the JS side. Accepts a larger
// batch for that same future reconciliation step, which may need to
// commit more than one pending tap at once.
export function commitFloatingTasbeehRepetition(
  counters: TasbeehCounters,
  dhikrId: number,
  times = 1,
  occurredAt?: FloatingTasbeehOccurredAt,
): TasbeehCounters {
  const updated = applyTasbeehCountIncrement(counters, dhikrId, times);
  recordFloatingTasbeehRepetition(dhikrId, times, occurredAt);
  return updated;
}

// Reconciliation's own entry point (see floatingTasbeehSync.ts) — commits
// an entire batch of pending native taps (each with its own dhikr/times/
// occurredAt) in ONE counters write and ONE Statistics-log write, instead
// of one of each per pending event. Used specifically for draining the
// native offline queue, which can hold many entries (e.g. 50 floating taps
// made while the app was closed) by the time the app is next foregrounded.
export function commitFloatingTasbeehRepetitions(
  counters: TasbeehCounters,
  entries: FloatingTasbeehBatchEntry[],
): TasbeehCounters {
  let updated = counters;
  for (const entry of entries) {
    if (entry.times <= 0) continue;
    updated = { ...updated, [entry.dhikrId]: (updated[entry.dhikrId] ?? 0) + entry.times };
  }
  saveTasbeehCounters(updated);
  recordFloatingTasbeehRepetitions(entries);
  return updated;
}

// Voice Tasbeeh's own counters increment — deliberately NOT bundled with a
// Statistics write, unlike the two functions above. TasbeehScreen.tsx's
// applyVoiceRepetitions must call this from INSIDE a setCounts(prev => ...)
// functional updater, to avoid a stale `counts` closure racing a fast
// recognizer callback. React StrictMode (see main.tsx) intentionally calls
// that updater function TWICE in development to catch impure updaters.
// applyTasbeehCountIncrement's own saveTasbeehCounters call is idempotent
// under that double call (same inputs -> same final persisted value), but
// a Statistics-log append is NOT — calling recordTasbeehRepetitions twice
// would silently double-record the same repetitions. So Voice Tasbeeh's
// Statistics write stays exactly where it already is in TasbeehScreen.tsx:
// a single, separate call immediately after setCounts, never inside it.
export function applyVoiceTasbeehCountIncrement(counters: TasbeehCounters, dhikrId: number, times: number): TasbeehCounters {
  return applyTasbeehCountIncrement(counters, dhikrId, times);
}
