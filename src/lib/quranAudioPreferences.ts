// Persistence for the user's selected Quran reciter — the one Quran audio
// preference. Same conventions as appearancePreferences.ts /
// calculationSettings.ts: its own storage key, every read/write wrapped so a
// blocked or full localStorage (private mode, quota) can never throw into
// the UI, and every read validated against the current registry.
//
// Loaded once, synchronously, as QuranReciterProvider's lazy initial state
// (so the first render already uses the saved reciter) and written only
// when the user actually picks a reciter.
//
// Invalid/unknown/retired stored ids fall back to the default IN MEMORY
// only — the stored value is deliberately not overwritten on read, so a
// reciter that is temporarily marked unavailable (see quranReciters.ts)
// comes back as the user's choice once it is available again.
import { DEFAULT_QURAN_RECITER_ID, getQuranReciterById } from "../data/quranReciters";

export const QURAN_RECITER_STORAGE_KEY = "dithar:quran:reciter:v1";

export function isSelectableQuranReciterId(value: unknown): value is string {
  return typeof value === "string" && getQuranReciterById(value)?.available === true;
}

export function loadSelectedQuranReciterId(): string {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(QURAN_RECITER_STORAGE_KEY) : null;
    return isSelectableQuranReciterId(raw) ? raw : DEFAULT_QURAN_RECITER_ID;
  } catch {
    return DEFAULT_QURAN_RECITER_ID;
  }
}

export function saveSelectedQuranReciterId(id: string): void {
  if (!isSelectableQuranReciterId(id)) return;
  try {
    localStorage.setItem(QURAN_RECITER_STORAGE_KEY, id);
  } catch {
    // Best-effort only — the in-memory selection already took effect.
  }
}
