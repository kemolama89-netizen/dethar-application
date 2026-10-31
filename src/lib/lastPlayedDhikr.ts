// The last dhikr started from Audio Adhkar (in-app «استماع»), remembered on
// this device so the Home screen's player can show it — and play it again —
// when nothing is playing. Only what was really started; never a guess.
import { useSyncExternalStore } from "react";
import type { AudioAdhkarCollection } from "./audioAdhkarPlayback";

export interface LastPlayedDhikr {
  collection: AudioAdhkarCollection;
  itemId: string;
  titleAr: string;
  titleEn: string;
  at: number;
}

const KEY = "dithar:audio-adhkar:last-played:v1";
const listeners = new Set<() => void>();
let cache: LastPlayedDhikr | null | undefined;

function load(): LastPlayedDhikr | null {
  if (cache !== undefined) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<LastPlayedDhikr> | null;
    cache =
      v && (v.collection === "morning" || v.collection === "evening" || v.collection === "misc") && typeof v.itemId === "string" && typeof v.titleAr === "string"
        ? { collection: v.collection, itemId: v.itemId, titleAr: v.titleAr, titleEn: typeof v.titleEn === "string" ? v.titleEn : v.titleAr, at: typeof v.at === "number" ? v.at : 0 }
        : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function rememberLastPlayed(entry: Omit<LastPlayedDhikr, "at">, now: number = Date.now()): void {
  cache = { ...entry, at: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Kept for this session.
  }
  for (const listener of [...listeners]) listener();
}

export function getLastPlayed(): LastPlayedDhikr | null {
  return load();
}

export function useLastPlayed(): LastPlayedDhikr | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    load,
    load,
  );
}

/** Tests only. */
export function resetLastPlayedForTesting(): void {
  cache = undefined;
}
