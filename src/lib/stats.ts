// DITHAR usage statistics — a small, local, event-sourced log (localStorage
// only; nothing is ever sent to a server). Every user action that should be
// reflected in "الإحصائيات" appends one lightweight event; every report
// (daily/weekly/monthly/yearly/custom-range/since-start, per-Dhikr
// breakdown, days-completed) is DERIVED from that log at read time rather
// than pre-aggregated — so adding a new report, a new period, or a new
// Adhkar category later never requires a data migration, and only
// COMPLETED repetitions are ever recorded (a ring confirm that the
// calm-reading gate ignored, or a tap that never reaches its target, never
// calls these functions at all).
//
// `source` is the seam for future growth: today only "written" (the
// Written Adhkar reader) and "tasbeeh" (the digital Tasbeeh) exist. A future
// Audio Adhkar feature adds "audio" as a new source value and its own
// aggregator function below — it can NEVER be mixed into the written/tasbeeh
// totals because every read path filters by `source` explicitly.
//
// Every event records the DEVICE's local date/time/timezone AT THE MOMENT
// IT HAPPENED (not just a raw epoch timestamp) — so a completion always
// stays attributed to the calendar day it actually happened on, even if the
// user later travels and their device's timezone changes. All period
// bucketing below (day/week/month/year/range) reads these stored strings,
// never re-derives a "local date" from `ts` under whatever timezone happens
// to be active at read time.
import type { WrittenAdhkarCategoryKey } from "../data/written-adhkar";

const STORAGE_KEY = "dithar:stats:events:v1";

export type StatSource = "written" | "tasbeeh"; // future: "audio"

interface RepetitionEvent {
  ts: number;
  /** Device-local calendar date at the moment of completion, "YYYY-MM-DD". */
  localDate: string;
  /** Device-local time at the moment of completion, "HH:MM:SS". */
  localTime: string;
  /** IANA timezone name active on the device at the moment of completion. */
  timeZone: string;
  kind: "repetition";
  source: StatSource;
  /** Written Adhkar only — which category ("morning"/"evening"/"prayer"/"misc") this repetition belongs to. */
  category?: WrittenAdhkarCategoryKey;
  /** Stable Dhikr id (string form of the Written Adhkar id, or the Tasbeeh numeric id) — never the display text, so re-wording content later doesn't orphan history. */
  dhikrId: string;
}

interface WirdCompleteEvent {
  ts: number;
  localDate: string;
  localTime: string;
  timeZone: string;
  kind: "wird-complete";
  category: WrittenAdhkarCategoryKey;
}

type StatEvent = RepetitionEvent | WirdCompleteEvent;

// ---- device local date/time helpers ---------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// "YYYY-MM-DD" built from the Date object's own LOCAL getters (never
// `toISOString`, which is UTC) — this is what makes every date bucket below
// a genuine device-local calendar day.
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localTimeString(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

// "YYYY-MM-DD" -> local midnight Date. Deliberately NOT `new Date(dateStr)`
// — that parses a date-only ISO string as UTC midnight, which lands on the
// WRONG calendar day once converted back to local time in any negative UTC
// offset (most of the Americas) — a real bug for a feature explicitly about
// getting local dates right.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

// Gulf/Kuwait convention (this app's home market — see the Home Screen's
// prayer-times city) — the week runs Saturday through Friday.
function startOfWeek(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const sinceSaturday = (d.getDay() + 1) % 7; // Sat=6 -> 0, Sun=0 -> 1, ... Fri=5 -> 6
  return addDays(dateStr, -sinceSaturday);
}

export function todayLocalDate(): string {
  return localDateString(new Date());
}

export { addDays, startOfWeek };

// ---- recording ---------------------------------------------------------

// In-memory mirror of localStorage, loaded lazily once per page session —
// every write updates both, so repeated reads within one session never
// re-parse JSON.
let cache: StatEvent[] | null = null;

function load(): StatEvent[] {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    cache = raw ? (JSON.parse(raw) as StatEvent[]) : [];
  } catch {
    // Corrupt data or storage unavailable (private mode, quota) — start
    // clean rather than throwing; stats are a nice-to-have, never load-bearing.
    cache = [];
  }
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Nothing to do — worship/recitation itself must never depend on this succeeding.
  }
}

function nowStamp() {
  const d = new Date();
  return { ts: d.getTime(), localDate: localDateString(d), localTime: localTimeString(d), timeZone: currentTimeZone() };
}

function append(event: StatEvent) {
  load().push(event);
  persist();
}

// User-initiated, complete deletion of the Statistics event log — the
// "حذف سجل الإحصائيات" action in Settings. Wipes both the in-memory cache
// and the localStorage entry atomically (from the caller's perspective:
// this function either fully succeeds or the try/catch below leaves the
// in-memory cache empty regardless, so every aggregator immediately sees
// zero history either way). This is the ONLY function in the whole app
// that touches STORAGE_KEY for deletion — it never touches
// src/lib/tasbeehCounters.ts (the separate, persistent Tasbih counter
// store) or any other localStorage key, so current Tasbih counters,
// language/theme preference, etc. are structurally untouched by this call.
export function clearAllStats(): void {
  cache = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only — the in-memory cache above is already cleared
    // regardless, so every report already reads as empty for this session.
  }
}

export function recordWrittenRepetition(category: WrittenAdhkarCategoryKey, dhikrId: string) {
  append({ ...nowStamp(), kind: "repetition", source: "written", category, dhikrId });
}

// One event per fully-finished Wird/session — Morning/Evening report this
// as DISTINCT DEVICE-LOCAL DAYS (see getWirdDayStats), Prayer reports it as
// a raw occurrence count (see getPrayerStats), matching how each is meant
// to read. Never fired for a partial completion (see WrittenAdhkarReader —
// this is only called once `allDone` actually becomes true).
export function recordWirdComplete(category: WrittenAdhkarCategoryKey) {
  append({ ...nowStamp(), kind: "wird-complete", category });
}

export function recordTasbeehRepetition(dhikrId: number) {
  append({ ...nowStamp(), kind: "repetition", source: "tasbeeh", dhikrId: String(dhikrId) });
}

// Legacy events recorded before this file tracked explicit local
// date/time/timezone only had `ts` — this derives the same local date from
// it (using the device's CURRENT timezone, the best available fallback) so
// old data already on a user's device keeps reporting correctly rather than
// silently disappearing from every bucket.
function resolvedLocalDate(e: StatEvent): string {
  return e.localDate ?? localDateString(new Date(e.ts));
}

// ---- report period selection -------------------------------------------

export type StatSelection =
  | { kind: "daily"; date: string }
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number } // month is 1-12
  | { kind: "yearly"; year: number }
  | { kind: "custom"; from: string; to: string } // inclusive, "YYYY-MM-DD"
  | { kind: "all" };

// All comparisons are plain string comparisons against fixed-width
// "YYYY-MM-DD" values, which sort/compare correctly as dates.
function matchesSelection(localDate: string, selection: StatSelection): boolean {
  switch (selection.kind) {
    case "daily":
      return localDate === selection.date;
    case "weekly": {
      const end = addDays(selection.weekStart, 6);
      return localDate >= selection.weekStart && localDate <= end;
    }
    case "monthly":
      return localDate.slice(0, 7) === `${selection.year}-${pad2(selection.month)}`;
    case "yearly":
      return localDate.slice(0, 4) === String(selection.year);
    case "custom":
      return localDate >= selection.from && localDate <= selection.to;
    case "all":
      return true;
  }
}

function inSelection(events: StatEvent[], selection: StatSelection): StatEvent[] {
  return events.filter((e) => matchesSelection(resolvedLocalDate(e), selection));
}

// Earliest recorded local date across ALL events, for "منذ البداية" and for
// bounding date pickers — null when nothing has been recorded yet.
export function getEarliestLocalDate(): string | null {
  const events = load();
  if (events.length === 0) return null;
  let earliest = resolvedLocalDate(events[0]);
  for (const e of events) {
    const d = resolvedLocalDate(e);
    if (d < earliest) earliest = d;
  }
  return earliest;
}

// ---- aggregation ---------------------------------------------------------

export interface DhikrBreakdownEntry {
  dhikrId: string;
  total: number;
}

function repetitionBreakdown(events: RepetitionEvent[]): DhikrBreakdownEntry[] {
  const totals = new Map<string, number>();
  for (const e of events) totals.set(e.dhikrId, (totals.get(e.dhikrId) ?? 0) + 1);
  return Array.from(totals, ([dhikrId, total]) => ({ dhikrId, total }));
}

export interface WirdStats {
  daysCompleted: number;
  perDhikr: DhikrBreakdownEntry[];
}

// Morning / Evening: the headline is DISTINCT DEVICE-LOCAL CALENDAR DAYS
// with a wird-complete event in range — not a raw tap/completion count, and
// never awarded for a partial Wird — per spec ("Number of days on which the
// COMPLETE Wird was completed").
export function getWirdDayStats(category: WrittenAdhkarCategoryKey, selection: StatSelection): WirdStats {
  const events = inSelection(load(), selection);
  const days = new Set(
    events.filter((e): e is WirdCompleteEvent => e.kind === "wird-complete" && e.category === category).map(resolvedLocalDate),
  );
  const reps = events.filter(
    (e): e is RepetitionEvent => e.kind === "repetition" && e.source === "written" && e.category === category,
  );
  return { daysCompleted: days.size, perDhikr: repetitionBreakdown(reps) };
}

export interface PrayerStats {
  sessionsCompleted: number;
  perDhikr: DhikrBreakdownEntry[];
}

// Prayer: the headline is a raw completed-session COUNT (the user may
// finish this wird more than once a day, once per prayer) — never an
// assumption that all five daily prayers were completed. The current
// Written Adhkar data model has a single flat "prayer" category (no
// separate Fajr/Dhuhr/Asr/Maghrib/Isha lists) — if that structure is added
// later, this is the one place a per-prayer breakdown would be threaded in.
export function getPrayerStats(selection: StatSelection): PrayerStats {
  const events = inSelection(load(), selection);
  const sessionsCompleted = events.filter((e) => e.kind === "wird-complete" && e.category === "prayer").length;
  const reps = events.filter(
    (e): e is RepetitionEvent => e.kind === "repetition" && e.source === "written" && e.category === "prayer",
  );
  return { sessionsCompleted, perDhikr: repetitionBreakdown(reps) };
}

export interface TasbeehStats {
  total: number;
  perDhikr: DhikrBreakdownEntry[];
}

export function getTasbeehStats(selection: StatSelection): TasbeehStats {
  const events = inSelection(load(), selection);
  const reps = events.filter((e): e is RepetitionEvent => e.kind === "repetition" && e.source === "tasbeeh");
  return { total: reps.length, perDhikr: repetitionBreakdown(reps) };
}
