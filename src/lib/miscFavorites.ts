// Favorites for the "الأذكار والأدعية" library — a minimal
// localStorage-backed set of Dhikr ids, mirroring the exact same
// load/save-with-try/catch pattern already established in
// tasbeehCounters.ts (this app's only existing simple-persistence
// precedent) rather than introducing a new persistence approach. Per spec:
// only added because it fits this existing architecture cleanly — not a
// larger favorites system (no syncing, no collections, no tags).
const STORAGE_KEY = "dithar:misc-library:favorites:v1";

export function loadMiscFavorites(): Set<string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === "string")) : new Set();
  } catch {
    // Corrupt data or storage unavailable (private mode, quota) — start
    // clean rather than throwing; favorites are a convenience, never
    // load-bearing for the app to function.
    return new Set();
  }
}

export function saveMiscFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // Best-effort only — browsing/reading must never depend on this succeeding.
  }
}
