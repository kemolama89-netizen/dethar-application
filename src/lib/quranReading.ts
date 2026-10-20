// The Qur'an reader's saved state, on this device (localStorage, the same
// conventions as the app's other preferences — see tasbeehSelection.ts):
// the last reading position, bookmarks, and the page zoom. Kept apart from
// everything else; nothing here touches any other stored setting.
//
// Every read is validated against the surah/verse counts (quranMeta.ts):
// a saved position or bookmark that no longer points at a real verse (e.g.
// the dataset changed) is dropped instead of being used, so the reader can
// never open at a verse that doesn't exist.
import { useSyncExternalStore } from "react";
import { isValidVerse, pageOf } from "./quranMeta";

export interface QuranPosition {
  surah: number;
  ayah: number;
  /** When it was saved (epoch millis). */
  at: number;
}

const POSITION_KEY = "dithar:quran:position:v1";
const BOOKMARKS_KEY = "dithar:quran:bookmarks:v1";
// The reader shows page images now, so the old text-size setting
// ("dithar:quran:font-size:v1") no longer applies and is not read.
const ZOOM_KEY = "dithar:quran:zoom:v1";

/** Page zooms the reader can be set to: 1 fits the whole page to the screen (the default). */
export const QURAN_ZOOMS: readonly number[] = [1, 1.25, 1.5, 1.75, 2];
export const QURAN_ZOOM_FIT = 1;

const listeners = new Set<() => void>();
function notify() {
  cache = null;
  for (const listener of [...listeners]) listener();
}

function read(key: string): unknown {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort; the in-memory state already changed.
  }
}

function asPosition(v: unknown): QuranPosition | null {
  if (!v || typeof v !== "object") return null;
  const { surah, ayah, at } = v as Record<string, unknown>;
  if (typeof surah !== "number" || typeof ayah !== "number" || !isValidVerse(surah, ayah)) return null;
  return { surah, ayah, at: typeof at === "number" && Number.isFinite(at) ? at : 0 };
}

let cache: { position: QuranPosition | null; bookmarks: QuranPosition[] } | null = null;

function state() {
  if (cache) return cache;
  const position = asPosition(read(POSITION_KEY));
  const rawBookmarks = read(BOOKMARKS_KEY);
  const bookmarks = (Array.isArray(rawBookmarks) ? rawBookmarks : []).map(asPosition).filter((b): b is QuranPosition => b !== null);
  return (cache = { position, bookmarks });
}

export function subscribeQuranReading(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The last reading position, or null when the reader was never opened (or the saved one is no longer valid). */
export function loadQuranPosition(): QuranPosition | null {
  return state().position;
}

export function saveQuranPosition(surah: number, ayah: number, now: number = Date.now()): void {
  if (!isValidVerse(surah, ayah)) return;
  const current = state().position;
  if (current && current.surah === surah && current.ayah === ayah) return;
  write(POSITION_KEY, { surah, ayah, at: now });
  notify();
}

export function loadQuranBookmarks(): QuranPosition[] {
  return state().bookmarks;
}

export function isQuranBookmarked(surah: number, ayah: number): boolean {
  return state().bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
}

/** Adds the verse as a bookmark, or removes it if it is one. Returns whether it is bookmarked now. */
export function toggleQuranBookmark(surah: number, ayah: number, now: number = Date.now()): boolean {
  if (!isValidVerse(surah, ayah)) return false;
  const bookmarks = state().bookmarks;
  const exists = bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
  const next = exists ? bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah)) : [{ surah, ayah, at: now }, ...bookmarks];
  write(BOOKMARKS_KEY, next);
  notify();
  return !exists;
}

/** The page zoom, one of QURAN_ZOOMS. */
export function loadQuranZoom(): number {
  const v = read(ZOOM_KEY);
  return typeof v === "number" && QURAN_ZOOMS.includes(v) ? v : QURAN_ZOOM_FIT;
}

export function saveQuranZoom(zoom: number): void {
  if (QURAN_ZOOMS.includes(zoom)) write(ZOOM_KEY, zoom);
}

/** The saved position with its Mushaf page (null page if the metadata can't place it). */
export function useQuranPosition(): (QuranPosition & { page: number | null }) | null {
  const position = useSyncExternalStore(subscribeQuranReading, loadQuranPosition, loadQuranPosition);
  return position ? { ...position, page: pageOf(position.surah, position.ayah) } : null;
}

export function useQuranBookmarks(): QuranPosition[] {
  return useSyncExternalStore(subscribeQuranReading, loadQuranBookmarks, loadQuranBookmarks);
}

/** Tests only: forget the in-memory copy (as after a restart). */
export function resetQuranReadingCacheForTesting(): void {
  cache = null;
}
