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
//
// Alongside the reciter: the reciter MODE (one specific reciter, or
// automatic rotation through the available reciters) and the rotation's
// position — see quranReciterSelection.ts for how they are used.
import { DEFAULT_QURAN_RECITER_ID, getQuranReciterById } from "../data/quranReciters";

export const QURAN_RECITER_STORAGE_KEY = "dithar:quran:reciter:v1";
export const QURAN_RECITER_MODE_STORAGE_KEY = "dithar:quran:reciter-mode:v1";
export const QURAN_ROTATION_STORAGE_KEY = "dithar:quran:rotation:v1";

export type QuranReciterMode = "specific" | "rotation";
export const DEFAULT_QURAN_RECITER_MODE: QuranReciterMode = "specific";

// Mirrors of the last value written, used ONLY when localStorage itself is
// missing or throws, so the choice still holds for the rest of the session.
let memorySelectedId: string | null = null;
let memoryMode: QuranReciterMode | null = null;
let memoryRotation = 0;

export function isSelectableQuranReciterId(value: unknown): value is string {
  return typeof value === "string" && getQuranReciterById(value)?.available === true;
}

export function loadSelectedQuranReciterId(): string {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(QURAN_RECITER_STORAGE_KEY);
    return isSelectableQuranReciterId(raw) ? raw : DEFAULT_QURAN_RECITER_ID;
  } catch {
    return isSelectableQuranReciterId(memorySelectedId) ? memorySelectedId : DEFAULT_QURAN_RECITER_ID;
  }
}

export function saveSelectedQuranReciterId(id: string): void {
  if (!isSelectableQuranReciterId(id)) return;
  memorySelectedId = id;
  try {
    localStorage.setItem(QURAN_RECITER_STORAGE_KEY, id);
  } catch {
    // Best-effort only — the in-memory selection already took effect.
  }
}

export function isQuranReciterMode(value: unknown): value is QuranReciterMode {
  return value === "specific" || value === "rotation";
}

export function loadQuranReciterMode(): QuranReciterMode {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(QURAN_RECITER_MODE_STORAGE_KEY);
    return isQuranReciterMode(raw) ? raw : DEFAULT_QURAN_RECITER_MODE;
  } catch {
    return memoryMode ?? DEFAULT_QURAN_RECITER_MODE;
  }
}

export function saveQuranReciterMode(mode: QuranReciterMode): void {
  if (!isQuranReciterMode(mode)) return;
  memoryMode = mode;
  try {
    localStorage.setItem(QURAN_RECITER_MODE_STORAGE_KEY, mode);
  } catch {
    // Best-effort only — the in-memory mode already took effect.
  }
}

/** The rotation's position: index (into the available reciters) of the NEXT reciter to play. 0 when unset/invalid. */
export function loadQuranRotationIndex(): number {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(QURAN_ROTATION_STORAGE_KEY);
    const n = Number(raw);
    return raw !== null && /^\d+$/.test(raw) && Number.isSafeInteger(n) ? n : 0;
  } catch {
    return memoryRotation;
  }
}

export function saveQuranRotationIndex(index: number): void {
  if (!Number.isSafeInteger(index) || index < 0) return;
  memoryRotation = index;
  try {
    localStorage.setItem(QURAN_ROTATION_STORAGE_KEY, String(index));
  } catch {
    // Best-effort only.
  }
}
