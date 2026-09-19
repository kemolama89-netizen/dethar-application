// Persistence for the Tasbeeh screen's two remaining per-user selections:
// WHICH dhikr is selected and each dhikr's TARGET. The live per-dhikr counts
// have their own store (tasbeehCounters.ts) and already survive navigation
// and restart; without these two, the screen came back on dhikr #1 with
// every target blank each time it was opened — so a user midway through
// dhikr #7 with a target of 100 found neither the selection nor the target
// they had set.
//
// Same conventions as tasbeehCounters.ts / appearancePreferences.ts: read
// once, synchronously, as a lazy useState initializer; written when the
// user changes them; every read validates what it got and ignores anything
// unusable (missing, corrupt, from another build, an id no longer in the
// library); every access is guarded so blocked/full storage never throws
// into the UI. Deliberately separate from stats.ts (Statistics history) and
// tasbeehCounters.ts (progress) — Reset only touches the latter, and neither
// Reset nor Reset All ever clears a selection or a target.
const SELECTED_KEY = "dithar:tasbeeh:selectedDhikr:v1";
const TARGETS_KEY = "dithar:tasbeeh:targets:v1";

function readJson(key: string): unknown {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort only — the in-memory selection already took effect.
  }
}

/** The saved selected dhikr id, or null if none is saved or it isn't a currently valid id. */
export function loadSelectedDhikrId(isValidId: (id: number) => boolean): number | null {
  const stored = readJson(SELECTED_KEY);
  return typeof stored === "number" && Number.isInteger(stored) && isValidId(stored) ? stored : null;
}

export function saveSelectedDhikrId(id: number): void {
  writeJson(SELECTED_KEY, id);
}

// A target is only meaningful as a positive whole number written in digits
// (the same test TasbeehScreen applies when it parses the input field).
const TARGET_SHAPE = /^[1-9]\d*$/;

/** Saved per-dhikr target inputs; entries that aren't a positive-integer string for a valid id are dropped. */
export function loadTasbeehTargets(isValidId: (id: number) => boolean): Record<number, string> {
  const stored = readJson(TARGETS_KEY);
  const targets: Record<number, string> = {};
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) return targets;
  for (const [key, value] of Object.entries(stored)) {
    const id = Number(key);
    if (Number.isInteger(id) && isValidId(id) && typeof value === "string" && TARGET_SHAPE.test(value)) {
      targets[id] = value;
    }
  }
  return targets;
}

export function saveTasbeehTargets(targets: Record<number, string>): void {
  writeJson(TARGETS_KEY, targets);
}

// Which target value each dhikr has ALREADY celebrated (id -> target), so a
// celebration fires once per target reach rather than once per screen visit.
// Needed because the voice path celebrates on `count >= target` (a completion
// can add several repetitions at once), so a dhikr that is already past its
// target would otherwise celebrate again on its first voice completion after
// every navigation or restart, once this marker — previously component-local
// — was lost. Reset, Reset All and changing a target still clear it (they
// update the component state, which is written back here).
const CELEBRATED_KEY = "dithar:tasbeeh:celebrated:v1";

export function loadCelebratedTargets(isValidId: (id: number) => boolean): Record<number, number> {
  const stored = readJson(CELEBRATED_KEY);
  const celebrated: Record<number, number> = {};
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) return celebrated;
  for (const [key, value] of Object.entries(stored)) {
    const id = Number(key);
    if (Number.isInteger(id) && isValidId(id) && typeof value === "number" && Number.isInteger(value) && value > 0) {
      celebrated[id] = value;
    }
  }
  return celebrated;
}

export function saveCelebratedTargets(celebrated: Record<number, number>): void {
  writeJson(CELEBRATED_KEY, celebrated);
}
