// "مختارات اليوم" / Daily Picks on the Miscellaneous library landing
// screen: three written duas that change every day.
//
//  - Only existing, verified items of the written library (MISC_DUAS) —
//    nothing is generated or added. Situational duas (eating, travel,
//    in-prayer phrases, funerals, seasonal rites, …) are left out: they are
//    said at their occasion, not as a dua "of the day".
//  - One fixed rotation order (seeded, so it is the same on every device
//    and every launch) in which each category is spread evenly, read three
//    at a time by the device's local date: day d shows positions 3d, 3d+1,
//    3d+2. Two consecutive days therefore never share an item (the pool is
//    far larger than six), and the three of one day come from different
//    categories wherever the pool allows.
//  - The day's three ids are also saved, so the selection stays exactly
//    the same for the whole day — across restarts, and even if an app
//    update changes the library mid-day.
import { MISC_DUAS } from "../data/misc-library";
import type { MiscCategoryKey, MiscDuaItem } from "../data/misc-library";

export const DAILY_PICKS_COUNT = 3;
const STORAGE_KEY = "dithar:misc:daily-picks:v1";
const ROTATION_SEED = 0x6d697363; // "misc"

/** Categories whose duas suit any day (by an item's first, primary category). */
const GENERAL_CATEGORIES: ReadonlySet<MiscCategoryKey> = new Set([
  "comprehensive",
  "istighfar",
  "protection",
  "distress",
  "family",
  "quran",
  "guidance",
  "debtRizq",
]);

/** The duas Daily Picks draws from: general-purpose ones, without a specific occasion. */
export function dailyPicksPool(items: readonly MiscDuaItem[] = MISC_DUAS): MiscDuaItem[] {
  return items.filter((item) => GENERAL_CATEGORIES.has(item.categories[0]) && !item.occasion_ar && item.text_ar.trim().length > 0);
}

/** A small deterministic PRNG (mulberry32) — the rotation must not depend on Math.random. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The fixed rotation: within each category a seeded shuffle, then every
 * item placed at an evenly spaced position for its category ((i + jitter) /
 * size) and all sorted by position — so no category bunches up anywhere.
 */
export function buildDailyPicksRotation(pool: readonly MiscDuaItem[], seed = ROTATION_SEED): MiscDuaItem[] {
  const random = seededRandom(seed);
  const groups = new Map<MiscCategoryKey, MiscDuaItem[]>();
  for (const item of [...pool].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = item.categories[0];
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const placed: { item: MiscDuaItem; position: number; tie: number }[] = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key)!;
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
    const jitter = random();
    group.forEach((item, i) => placed.push({ item, position: (i + jitter) / group.length, tie: random() }));
  }
  return placed.sort((a, b) => a.position - b.position || a.tie - b.tie).map((p) => p.item);
}

/** "YYYY-MM-DD" of the device's local calendar day. */
export function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days since 1970-01-01 for a local date key — independent of time zone and DST. */
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The ids the rotation gives a local date (pure — no storage). */
export function computeDailyPickIds(dateKey: string, rotation: readonly MiscDuaItem[], count = DAILY_PICKS_COUNT): string[] {
  if (rotation.length === 0) return [];
  const n = Math.min(count, rotation.length);
  const start = (((dayNumber(dateKey) * count) % rotation.length) + rotation.length) % rotation.length;
  return Array.from({ length: n }, (_, k) => rotation[(start + k) % rotation.length].id);
}

interface StoredPicks {
  date: string;
  ids: string[];
}

function readStored(): StoredPicks | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && typeof (parsed as StoredPicks).date === "string" && Array.isArray((parsed as StoredPicks).ids)) {
      return parsed as StoredPicks;
    }
  } catch {
    // Unreadable or blocked storage: computed again (deterministically) below.
  }
  return null;
}

function writeStored(value: StoredPicks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Best effort: the same ids are computed again from the date anyway.
  }
}

let cachedRotation: MiscDuaItem[] | null = null;

/** Today's three picks (stable for the whole local day). */
export function getDailyPicks(now: Date = new Date(), items: readonly MiscDuaItem[] = MISC_DUAS): MiscDuaItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const date = localDateKey(now);
  const stored = readStored();
  if (stored && stored.date === date && stored.ids.length > 0 && stored.ids.every((id) => byId.has(id))) {
    return stored.ids.map((id) => byId.get(id)!);
  }
  const rotation = items === MISC_DUAS ? (cachedRotation ??= buildDailyPicksRotation(dailyPicksPool(items))) : buildDailyPicksRotation(dailyPicksPool(items));
  const ids = computeDailyPickIds(date, rotation);
  writeStored({ date, ids });
  return ids.map((id) => byId.get(id)!);
}
