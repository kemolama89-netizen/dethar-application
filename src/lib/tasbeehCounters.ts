// Persistent per-Dhikr Tasbih counter state — the user's CURRENT live count
// for each Dhikr (keyed by its numeric id from tasbeeh-library.json), kept
// in localStorage so it survives switching between Dhikr, leaving and
// returning to the Tasbeeh screen, ordinary app navigation, and component
// unmount/remount. Loaded once per mount via a lazy useState initializer in
// TasbeehScreen and written back synchronously on every tap/reset — never
// left to an effect, so a count is never at risk of being lost to a
// same-tick navigation away from the screen.
//
// Deliberately a SEPARATE store from src/lib/stats.ts's event-sourced
// Statistics log: this is mutable "current state" (one number per Dhikr,
// always overwritten), not append-only history. Resetting a counter here
// must never touch — and never can, since it never imports stats.ts —
// previously recorded Statistics ("RESET COUNTER ≠ DELETE STATISTICS").
const STORAGE_KEY = "dithar:tasbeeh:counters:v1";

export type TasbeehCounters = Record<number, number>;

export function loadTasbeehCounters(): TasbeehCounters {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as TasbeehCounters) : {};
  } catch {
    // Corrupt data or storage unavailable (private mode, quota) — start
    // clean rather than throwing; the counter is a convenience, never
    // load-bearing for the app to function.
    return {};
  }
}

export function saveTasbeehCounters(counters: TasbeehCounters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch {
    // Best-effort only — counting itself must never depend on this succeeding.
  }
  notifyListeners(counters);
}

// Live, event-driven fan-out for whoever's currently rendering these
// counters (TasbeehScreen) — so a change from a source OTHER than the
// mounted screen's own handlers (specifically: a Floating Tasbeeh tap,
// reconciled via floatingTasbeehSync.ts's reconcileFloatingTasbeeh, which
// calls saveTasbeehCounters exactly like every other commit path) is
// reflected immediately, without polling. Deliberately placed here, on
// saveTasbeehCounters itself, rather than in tasbeehCommit.ts or
// floatingTasbeehSync.ts: EVERY real write to this store — manual tap,
// either Voice Tasbeeh path, a floating tap's own single/batch
// reconciliation, and Reset/Reset All — already funnels through this one
// function, so hooking it here covers all of them from exactly one place,
// with no risk of a future write path forgetting to notify.
type TasbeehCountersListener = (counters: TasbeehCounters) => void;
const listeners = new Set<TasbeehCountersListener>();

function notifyListeners(counters: TasbeehCounters): void {
  listeners.forEach((listener) => listener(counters));
}

/** Returns an unsubscribe function — call it on cleanup (e.g. a useEffect return). */
export function subscribeTasbeehCounters(listener: TasbeehCountersListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
