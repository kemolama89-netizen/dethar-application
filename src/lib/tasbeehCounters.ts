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

// Where the ORIGINAL stored text is copied (once) if load ever has to drop or
// repair anything in it, so a repair can never be what destroys the only
// copy of a user's counts. Nothing reads it back automatically. Same
// convention as stats.ts's corrupt-backup.
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`;

// Turns whatever JSON.parse produced into a clean counters record. Entries
// are validated one by one so a single bad value can't cost the user every
// other count:
//   - the key must be a whole-number dhikr id; the id is NOT checked against
//     the current library — a count for a dhikr that is no longer in it is
//     kept, not dropped (it is the user's history, and a later library could
//     bring the id back);
//   - the value must be a finite whole number >= 0 and safely representable.
//     A fractional number is floored, and a digit-only string (an older
//     writer) is converted; anything else (NaN/Infinity, negative, object,
//     null, non-numeric string) drops just that entry, i.e. that dhikr
//     restarts at 0 — better than showing "NaN" or a negative count.
// `changed` is true whenever anything was dropped or repaired, or the root
// wasn't a plain object at all.
function sanitizeStoredCounters(parsed: unknown): { counters: TasbeehCounters; changed: boolean } {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { counters: {}, changed: true };
  const counters: TasbeehCounters = {};
  let changed = false;
  for (const [key, value] of Object.entries(parsed)) {
    const id = Number(key);
    const count = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    if (
      !Number.isSafeInteger(id) ||
      id < 0 ||
      String(id) !== key ||
      typeof count !== "number" ||
      !Number.isFinite(count) ||
      count < 0 ||
      count > Number.MAX_SAFE_INTEGER
    ) {
      changed = true;
      continue;
    }
    const whole = Math.floor(count);
    if (whole !== value) changed = true;
    counters[id] = whole;
  }
  return { counters, changed };
}

function backUpUnreadableCounters(raw: string): void {
  try {
    if (localStorage.getItem(CORRUPT_BACKUP_KEY) === null) localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
  } catch {
    // Nothing more to do.
  }
}

export function loadTasbeehCounters(): TasbeehCounters {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      backUpUnreadableCounters(raw);
      return {};
    }
    const { counters, changed } = sanitizeStoredCounters(parsed);
    if (changed) backUpUnreadableCounters(raw);
    return counters;
  } catch {
    // Storage unavailable (private mode, blocked) — start clean rather than
    // throwing; the counter is a convenience, never load-bearing for the app
    // to function.
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
