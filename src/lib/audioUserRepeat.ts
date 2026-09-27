// DITHAR — user-chosen audio repetition counts.
//
// A dhikr with no fixed count (`unboundedCount`, e.g. morning_023 — the
// Salat al-Ibrahimiyyah) has no written total for audio to follow. The
// user picks how many times its recording plays; until they do, it does
// not play at all — never an endless loop, never an assumed 1.
//
// One count per dhikr id, shared by Morning and Evening (same text, same
// file). The written data is untouched: this is an audio setting only.
// Same localStorage pattern as the app's other settings, with an in-memory
// copy so it also works where storage is unavailable.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dithar:audio-adhkar:user-repeat:v1";

export const USER_REPEAT_MIN = 1;
export const USER_REPEAT_MAX = 100;

export function isValidUserRepeatCount(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= USER_REPEAT_MIN && n <= USER_REPEAT_MAX;
}

let counts: Record<string, number> | undefined;
const listeners = new Set<() => void>();

function load(): Record<string, number> {
  if (counts) return counts;
  counts = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") {
      for (const [id, n] of Object.entries(parsed)) if (isValidUserRepeatCount(n)) counts[id] = n;
    }
  } catch {
    // Unreadable storage: start with no choices.
  }
  return counts;
}

/** The count the user chose for this dhikr's audio, or null when not chosen yet. */
export function getUserRepeatCount(dhikrId: string): number | null {
  return load()[dhikrId] ?? null;
}

/** Saves (or, with null, clears) the user's count for this dhikr's audio. Invalid counts are ignored. */
export function setUserRepeatCount(dhikrId: string, count: number | null): void {
  if (count !== null && !isValidUserRepeatCount(count)) return;
  const next = { ...load() };
  if (count === null) delete next[dhikrId];
  else next[dhikrId] = count;
  counts = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUserRepeatCount(dhikrId: string): number | null {
  return useSyncExternalStore(subscribe, () => getUserRepeatCount(dhikrId));
}
