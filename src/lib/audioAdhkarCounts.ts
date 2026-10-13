// Audio Adhkar repetition counters: how many times each dhikr has been
// heard to the end — per list (Morning, Evening, Various), per dhikr — shown
// on every Audio Adhkar card, kept across restarts, and fed into the shared
// Statistics log (stats.ts) with the dhikr's shared identity.
//
// A repetition counts only when its audio finished: the in-app player
// commits on a playback's own "ended" (never on a cancel, an interruption
// or an error), and the Android background player queues each completion
// natively with a unique id (AudioAdhkarStore.appendCompletion), which the
// app takes in through commitAudioCompletions and then acknowledges. Every
// completion id is remembered here (and in the Statistics log itself), so
// the same completion delivered twice — a repeated event, an app restart
// before the native queue was acknowledged — counts once.
import { useSyncExternalStore } from "react";
import { recordAudioRepetitions } from "./stats";
import type { AudioRepetition } from "./stats";

export type AudioCountCollection = "morning" | "evening" | "misc";

const COUNTS_KEY = "dithar:audio-adhkar:counts:v1";
const PROCESSED_KEY = "dithar:audio-adhkar:processed:v1";
/** Completion ids remembered for de-duplication (the Statistics log de-duplicates by id too). */
const MAX_PROCESSED = 5000;

const memory: { counts: Record<string, number> | null; processed: string[] | null } = { counts: null, processed: null };
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T | null, valid: (v: unknown) => v is T, empty: T): T {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return valid(parsed) ? parsed : empty;
  } catch {
    return fallback ?? empty;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort only — the in-memory copy already took effect.
  }
}

const isCounts = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function loadCounts(): Record<string, number> {
  return (memory.counts = read(COUNTS_KEY, memory.counts, isCounts, {}));
}

function loadProcessed(): string[] {
  return (memory.processed = read(PROCESSED_KEY, memory.processed, isIds, []));
}

const countKey = (collection: AudioCountCollection, itemId: string) => `${collection}:${itemId}`;

/** How many times this dhikr was heard to the end in this list. */
export function getAudioAdhkarCount(collection: AudioCountCollection, itemId: string): number {
  return loadCounts()[countKey(collection, itemId)] ?? 0;
}

/**
 * The dhikr's identity in Statistics, shared with the rest of the app:
 * Various items are the Tasbeeh dhikr ("tasbeeh-3" → "3", as Tasbeeh
 * records it); Morning/Evening items keep their Written Adhkar id.
 */
export function statsDhikrId(collection: AudioCountCollection, itemId: string): string {
  return collection === "misc" && itemId.startsWith("tasbeeh-") ? itemId.slice("tasbeeh-".length) : itemId;
}

/** "YYYY-MM-DD" and "HH:MM:SS" of an instant in a time zone (the device's at that moment). */
function localStamp(at: number, timeZone: string): NonNullable<AudioRepetition["occurredAt"]> {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date(at))
        .map((p) => [p.type, p.value]),
    );
  } catch {
    return localStamp(at, "");
  }
  return { ts: at, localDate: `${parts.year}-${parts.month}-${parts.day}`, localTime: `${parts.hour}:${parts.minute}:${parts.second}`, timeZone: zone };
}

export interface AudioCompletion {
  /** Unique per completion — the same id is only ever counted once. */
  id: string;
  collection: AudioCountCollection;
  /** The Audio Adhkar item id (e.g. "morning_005", "tasbeeh-3"). */
  dhikrId: string;
  /** When the audio finished (epoch millis) and the device's time zone then — omitted for "now". */
  at?: number;
  timeZone?: string;
}

/**
 * Takes in completed repetitions: each not seen before adds one to its
 * dhikr's counter and one Statistics event. Returns how many were new.
 */
export function commitAudioCompletions(completions: AudioCompletion[]): number {
  const processed = loadProcessed();
  const seen = new Set(processed);
  const fresh = completions.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  if (fresh.length === 0) return 0;
  const counts = { ...loadCounts() };
  for (const c of fresh) counts[countKey(c.collection, c.dhikrId)] = (counts[countKey(c.collection, c.dhikrId)] ?? 0) + 1;
  memory.counts = counts;
  write(COUNTS_KEY, counts);
  const nextProcessed = [...processed, ...fresh.map((c) => c.id)].slice(-MAX_PROCESSED);
  memory.processed = nextProcessed;
  write(PROCESSED_KEY, nextProcessed);
  recordAudioRepetitions(
    fresh.map((c) => ({
      category: c.collection,
      dhikrId: statsDhikrId(c.collection, c.dhikrId),
      eventId: c.id,
      occurredAt: c.at !== undefined ? localStamp(c.at, c.timeZone ?? "") : undefined,
    })),
  );
  for (const listener of listeners) listener();
  return fresh.length;
}

let sequence = 0;

/** One repetition the in-app player heard to the end, right now. */
export function commitInAppCompletion(collection: AudioCountCollection, itemId: string): void {
  sequence += 1;
  commitAudioCompletions([{ id: `app:${Date.now()}:${sequence}:${Math.random().toString(36).slice(2, 8)}`, collection, dhikrId: itemId }]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The live count for one card. */
export function useAudioAdhkarCount(collection: AudioCountCollection, itemId: string): number {
  return useSyncExternalStore(
    subscribe,
    () => getAudioAdhkarCount(collection, itemId),
    () => getAudioAdhkarCount(collection, itemId),
  );
}

/** Test seam: forget the in-memory copies. */
export function resetAudioAdhkarCountsMemoryForTesting(): void {
  memory.counts = null;
  memory.processed = null;
}
