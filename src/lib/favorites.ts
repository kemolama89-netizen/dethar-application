// Favorites («المفضلة»): content the user saved from the widget, the
// full-screen reflection, or anywhere else reminder content is shown.
//
//  - One entry per content item, keyed by its stable reminder id
//    ("hadith:muslim-2564", "dua:…", "virtue:…", "poetry:…"): saving the
//    same item again — even with a different comment shown — never makes a
//    duplicate.
//  - Each entry is a SNAPSHOT of what was saved: the original Arabic text
//    (never altered), its type, source, grading or poet attribution, its
//    meaning, and the DITHAR comment that was displayed with it — in both
//    languages, so a language change never loses or corrupts anything, and
//    a later content update can't silently change a saved item.
//  - Stored in localStorage (this app's established persistence; it lives
//    in the app's private storage on Android and survives restarts and
//    reboots). On Android the widget's heart writes to a native queue that
//    is merged in here (lib/favoritesSync.ts).
//
// The written library's own per-dua hearts (lib/miscFavorites.ts) keep
// their own store; the Favorites screen shows both.
import type { EditorialComment } from "../data/widgetContent";
import type { ReminderCategory, ReminderItem, ReminderKind } from "./reminderContent";

const KEY = "dithar:favorites:v1";

export interface FavoriteEntry {
  /** The content's stable id — also the dedupe key. */
  key: string;
  category: ReminderCategory;
  kind: ReminderKind;
  textAr: string;
  meaningEn?: string;
  sourceAr: string;
  sourceEn?: string;
  gradeAr?: string;
  gradeEn?: string;
  /** Poetry: "established" | "attributed" | "disputed". */
  attribution?: string;
  /** The DITHAR comment shown when it was saved. */
  comment?: { id: string; ar: string; en: string };
  savedAt: number;
  origin: "app" | "widget";
}

const listeners = new Set<() => void>();

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of [...listeners]) listener();
}

function isEntry(value: unknown): value is FavoriteEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.key === "string" && typeof v.textAr === "string" && typeof v.category === "string" && typeof v.sourceAr === "string";
}

/** Newest first. Corrupt or foreign data is skipped, never thrown. */
export function loadFavorites(): FavoriteEntry[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: FavoriteEntry[] = [];
    for (const entry of parsed) {
      if (!isEntry(entry) || seen.has(entry.key)) continue;
      seen.add(entry.key);
      out.push({ ...entry, kind: entry.kind ?? (entry.category as ReminderKind), savedAt: typeof entry.savedAt === "number" ? entry.savedAt : 0, origin: entry.origin === "widget" ? "widget" : "app" });
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function saveFavorites(entries: FavoriteEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  } finally {
    notify();
  }
}

export function favoriteKeys(): string[] {
  return loadFavorites().map((e) => e.key);
}

export function isFavorite(key: string): boolean {
  return loadFavorites().some((e) => e.key === key);
}

export function favoriteFromItem(item: ReminderItem, comment: EditorialComment | undefined, origin: FavoriteEntry["origin"], savedAt = Date.now()): FavoriteEntry {
  return {
    key: item.id,
    category: item.category,
    kind: item.kind,
    textAr: item.textAr,
    meaningEn: item.meaningEn,
    sourceAr: item.sourceAr,
    sourceEn: item.sourceEn,
    gradeAr: item.gradeAr,
    gradeEn: item.gradeEn,
    attribution: item.attribution,
    comment: comment ? { id: comment.id, ar: comment.ar, en: comment.en } : undefined,
    savedAt,
    origin,
  };
}

/** Adds (or keeps — never duplicates) an entry. */
export function addFavorite(entry: FavoriteEntry): void {
  const current = loadFavorites();
  if (current.some((e) => e.key === entry.key)) return;
  saveFavorites([entry, ...current]);
}

export function removeFavorite(key: string): void {
  const current = loadFavorites();
  if (!current.some((e) => e.key === key)) return;
  saveFavorites(current.filter((e) => e.key !== key));
}

/** Saves the item if it isn't saved yet, else removes it. Returns whether it is now a favorite. */
export function toggleFavorite(item: ReminderItem, comment: EditorialComment | undefined, origin: FavoriteEntry["origin"] = "app"): boolean {
  if (isFavorite(item.id)) {
    removeFavorite(item.id);
    return false;
  }
  addFavorite(favoriteFromItem(item, comment, origin));
  return true;
}
