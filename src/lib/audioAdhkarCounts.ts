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
import { recordAudioListening, recordAudioRepetitions, recordListenedSessions } from "./stats";
import type { AudioListeningPiece, AudioRepetition } from "./stats";

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
  /** The listening session it belongs to (one «استماع» or one scheduled session), when known. */
  sessionId?: string;
  /** The real length of what played (its files' measured duration), when known — never estimated. */
  durationMs?: number | null;
  /** The dhikr's title as the player showed it, when known. */
  title?: string;
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
      sessionId: c.sessionId || undefined,
      durationMs: typeof c.durationMs === "number" && Number.isFinite(c.durationMs) && c.durationMs > 0 ? Math.round(c.durationMs) : undefined,
      title: c.title || undefined,
    })),
  );
  for (const listener of listeners) listener();
  return fresh.length;
}

// ---- listening that stopped before the end -----------------------------------

/** A playback that stopped before its recording's end, and how long it really played. */
export interface AudioListening {
  /** Unique per playback — the same id is only ever taken in once. */
  id: string;
  collection: AudioCountCollection;
  dhikrId: string;
  /** When it stopped (epoch millis) and the device's time zone then — omitted for "now". */
  at?: number;
  timeZone?: string;
  /** How long it played, ms: the player's position when it stopped (never estimated). */
  listenedMs: number;
  sessionId?: string;
  title?: string;
}

/**
 * Splits [at − listenedMs, at] at local midnight(s) in `timeZone`, latest
 * piece first: a playback that crossed into a new day gives each day the
 * time it really played on it. (Pauses aren't known here, so the span is
 * taken as continuous — it can only move time between adjacent days.)
 */
export function splitAtLocalMidnight(at: number, listenedMs: number, timeZone: string): { at: number; ms: number }[] {
  const dateOf = (t: number) => localStamp(t, timeZone).localDate;
  const pieces: { at: number; ms: number }[] = [];
  let end = at;
  let start = at - listenedMs;
  for (let guard = 0; end > start && guard < 4; guard++) {
    const day = dateOf(end - 1);
    if (dateOf(start) === day) {
      pieces.push({ at: end, ms: end - start });
      return pieces;
    }
    // The first instant of `day`: the smallest t in (start, end] with dateOf(t) === day.
    let lo = start;
    let hi = end - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (dateOf(mid) === day) hi = mid;
      else lo = mid;
    }
    pieces.push({ at: end, ms: end - hi });
    end = hi;
  }
  if (end > start) pieces.push({ at: end, ms: end - start });
  return pieces;
}

/** Takes in stopped-early listening: each playback not seen before adds its time (never a repetition). Returns how many were new. */
export function commitAudioListening(entries: AudioListening[]): number {
  const pieces: AudioListeningPiece[] = [];
  for (const e of entries) {
    if (!(typeof e.listenedMs === "number" && Number.isFinite(e.listenedMs) && e.listenedMs > 0)) continue;
    const at = e.at ?? Date.now();
    const zone = e.timeZone ?? "";
    splitAtLocalMidnight(at, Math.round(e.listenedMs), zone).forEach((piece, part) =>
      pieces.push({
        category: e.collection,
        dhikrId: statsDhikrId(e.collection, e.dhikrId),
        eventId: e.id,
        part,
        // Stamped just inside its own day (a piece ending exactly at midnight belongs to the day before).
        occurredAt: localStamp(piece.at - 1, zone),
        listenedMs: piece.ms,
        sessionId: e.sessionId || undefined,
        title: e.title || undefined,
      }),
    );
  }
  const added = recordAudioListening(pieces);
  if (added > 0) for (const listener of listeners) listener();
  return added;
}

// ---- whole sessions heard to their end -------------------------------------------

/** A Morning/Evening session the background player played to its very end. */
export interface CompletedSession {
  /** "native-session-complete:<section>:<occurrence>" — stable, so it is taken in once. */
  id: string;
  collection: "morning" | "evening";
  at?: number;
  timeZone?: string;
}

/** Records each not-yet-recorded completed session (by id) on the local day it finished. Returns how many were new. */
export function commitCompletedSessions(sessions: CompletedSession[]): number {
  const added = recordListenedSessions(
    sessions
      .filter((s) => s.collection === "morning" || s.collection === "evening")
      .map((s) => ({ category: s.collection, eventId: s.id, occurredAt: s.at !== undefined ? localStamp(s.at, s.timeZone ?? "") : undefined })),
  );
  if (added > 0) for (const listener of listeners) listener();
  return added;
}

let sequence = 0;

/** A playback in the app stopped before its end after playing `listenedMs`, right now. */
export function commitInAppListening(collection: AudioCountCollection, itemId: string, listenedMs: number, details: { sessionId?: string; title?: string } = {}): void {
  sequence += 1;
  commitAudioListening([{ id: `app-listen:${Date.now()}:${sequence}:${Math.random().toString(36).slice(2, 8)}`, collection, dhikrId: itemId, listenedMs, ...details }]);
}

/** One repetition the in-app player heard to the end, right now. */
export function commitInAppCompletion(collection: AudioCountCollection, itemId: string, details: { sessionId?: string; title?: string; durationMs?: number | null } = {}): void {
  sequence += 1;
  commitAudioCompletions([{ id: `app:${Date.now()}:${sequence}:${Math.random().toString(36).slice(2, 8)}`, collection, dhikrId: itemId, ...details }]);
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
