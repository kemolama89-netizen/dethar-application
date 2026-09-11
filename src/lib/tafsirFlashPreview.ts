// PREVIEW-ONLY indexing for the Tafsir Flash / لطيفة قرآنية card. Every
// actual browser/app RELOAD advances to the next flash in tafsirFlashes
// (wrapping back to the first after the last); React re-renders, component
// remounts, and in-app screen navigation must never advance it.
//
// That distinction is enforced by resolving the index exactly ONCE per
// module evaluation, cached in `cachedIndex` below. A JS/ES module is only
// evaluated once per real page/app load — re-renders, remounts, and
// client-side navigation all reuse the already-evaluated module instance —
// so anything computed at first-call time here and then cached is, in
// effect, "computed once per reload" for free, with no reload/visibility
// listener needed.
//
// This is temporary scaffolding, not the final behavior: see the bottom of
// this file for how it's meant to be swapped for a real calendar-day ->
// deterministic-flash mapping later.
import { tafsirFlashes } from "../data/tafsirFlashes";
import type { TafsirFlash } from "../data/tafsirFlashes";

const STORAGE_KEY = "dithar:tafsir:previewIndex:v1";

function loadStoredIndex(): number {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw === null) return -1;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : -1;
  } catch {
    // Corrupt data or storage unavailable — start from "before the first
    // flash" rather than throwing; this preview pointer is a convenience,
    // never load-bearing for the app to function.
    return -1;
  }
}

function saveIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Best-effort only.
  }
}

function resolveNextIndex(): number {
  const total = tafsirFlashes.length;
  if (total === 0) return 0;
  const previous = loadStoredIndex();
  const next = (((previous + 1) % total) + total) % total;
  saveIndex(next);
  return next;
}

let cachedIndex: number | null = null;

/**
 * The flash to show for the current page load. First call resolves and
 * persists the next index (advancing one step past whatever the previous
 * real reload left behind); every later call during the same load returns
 * the same flash.
 */
export function getPreviewTafsirFlash(): TafsirFlash {
  if (cachedIndex === null) {
    cachedIndex = resolveNextIndex();
  }
  return tafsirFlashes[cachedIndex] ?? tafsirFlashes[0];
}

// --- Future replacement notes ---
// To switch from preview rotation to a real "calendar day -> deterministic
// flash" behavior, replace resolveNextIndex()'s body with a pure function
// of the current calendar day (e.g. Gregorian or Hijri day-of-year modulo
// tafsirFlashes.length) and drop the localStorage read/write entirely —
// HomeScreen only ever calls getPreviewTafsirFlash(), so that swap needs
// no changes anywhere else.
