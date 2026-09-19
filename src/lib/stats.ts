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
// `source` is the seam for future growth: today "written" (the Written
// Adhkar reader), "tasbeeh" (the manual/Voice digital Tasbeeh), and
// "floating" (the Floating Tasbeeh quick-access counter — see
// recordFloatingTasbeehRepetition below) exist. A future Audio Adhkar
// feature adds "audio" as a new source value and its own aggregator
// function below — it can NEVER be mixed into the written/tasbeeh totals
// because every read path filters by `source` explicitly. "floating" is a
// deliberate EXCEPTION to that isolation: getTasbeehStats() below reads it
// alongside "tasbeeh" on purpose, so a repetition committed from outside
// the app still lands in the same Tasbeeh totals the user already sees,
// while remaining separately tagged in the raw event log for provenance.
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

export type StatSource = "written" | "tasbeeh" | "floating"; // future: "audio"

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

// Where the ORIGINAL stored text is copied (once) if load() ever has to
// discard or repair anything in it — see sanitizeStoredEvents. Nothing
// reads this key back automatically; it exists so that a repair can never
// be the thing that destroys the only copy of a user's history.
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`;

const LOCAL_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const STAT_SOURCES: readonly string[] = ["written", "tasbeeh", "floating"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Validates ONE stored entry and returns a well-formed StatEvent, or null
// if it can't be trusted at all. Repairs rather than rejects wherever the
// entry is still meaningful, so existing history survives:
//   - `localDate` missing/malformed (older data, or a hand-edited entry) is
//     re-derived from `ts` — exactly what resolvedLocalDate() below already
//     did lazily for entries without one;
//   - `localTime`/`timeZone` missing become "" (they're informational only —
//     no report reads them);
//   - a numeric `dhikrId` (any older writer) is stringified.
// Rejected: non-objects, a non-finite `ts`, an unknown `kind`, a repetition
// with an unknown `source` or no usable `dhikrId`, a wird-complete with no
// string `category`.
function sanitizeStoredEvent(value: unknown): StatEvent | null {
  if (!isRecord(value)) return null;
  const { ts, kind } = value;
  if (typeof ts !== "number" || !Number.isFinite(ts)) return null;

  const localDate =
    typeof value.localDate === "string" && LOCAL_DATE_SHAPE.test(value.localDate) ? value.localDate : localDateString(new Date(ts));
  const localTime = typeof value.localTime === "string" ? value.localTime : "";
  const timeZone = typeof value.timeZone === "string" ? value.timeZone : "";

  if (kind === "repetition") {
    if (typeof value.source !== "string" || !STAT_SOURCES.includes(value.source)) return null;
    const dhikrId =
      typeof value.dhikrId === "string" && value.dhikrId !== ""
        ? value.dhikrId
        : typeof value.dhikrId === "number" && Number.isFinite(value.dhikrId)
          ? String(value.dhikrId)
          : null;
    if (dhikrId === null) return null;
    const event: RepetitionEvent = { ts, localDate, localTime, timeZone, kind, source: value.source as StatSource, dhikrId };
    if (typeof value.category === "string") event.category = value.category as WrittenAdhkarCategoryKey;
    return event;
  }

  if (kind === "wird-complete") {
    if (typeof value.category !== "string") return null;
    return { ts, localDate, localTime, timeZone, kind, category: value.category as WrittenAdhkarCategoryKey };
  }

  return null;
}

// Turns whatever JSON.parse produced into a clean event list. `changed` is
// true whenever anything was dropped or the top-level shape itself was
// wrong — load() uses it to decide whether to preserve the original text.
function sanitizeStoredEvents(parsed: unknown): { events: StatEvent[]; changed: boolean } {
  if (!Array.isArray(parsed)) return { events: [], changed: true };
  const events: StatEvent[] = [];
  let changed = false;
  for (const entry of parsed) {
    const clean = sanitizeStoredEvent(entry);
    if (clean === null) changed = true;
    else events.push(clean);
  }
  return { events, changed };
}

// Copies the untouched original text aside, once. If a backup already
// exists it's kept as-is (never overwritten), so the FIRST unreadable
// snapshot — the one most likely to be the user's real history — is the one
// that's preserved. Best-effort: a full/blocked storage just skips it.
function backUpUnreadableStats(raw: string) {
  try {
    if (localStorage.getItem(CORRUPT_BACKUP_KEY) === null) localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
  } catch {
    // Nothing more to do.
  }
}

function load(): StatEvent[] {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      cache = [];
    } else {
      let parsed: unknown;
      let parseFailed = false;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parseFailed = true;
      }
      const { events, changed } = parseFailed ? { events: [], changed: true } : sanitizeStoredEvents(parsed);
      if (changed) backUpUnreadableStats(raw);
      cache = events;
    }
  } catch {
    // Storage unavailable (e.g. access blocked) — start clean rather than
    // throwing; stats are a nice-to-have, never load-bearing.
    cache = [];
  }
  return cache;
}

// Another tab/window of the same origin wrote (or cleared) the log: this
// tab's in-memory copy is now stale, and persisting it later would silently
// overwrite the other tab's events (last writer wins). Dropping the cache
// makes the next read/append re-load the current stored log instead. `key`
// is null when the whole storage area was cleared.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === STORAGE_KEY) cache = null;
  });
}

// Writes the whole in-memory log. Returns whether the write reached
// storage. A failed write (quota/blocked storage) never loses events from
// THIS session: they stay in `cache`, and because every later persist()
// re-serializes the entire cache, the next successful write includes them.
function persist(): boolean {
  if (!cache) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    return true;
  } catch {
    // Nothing to do — worship/recitation itself must never depend on this succeeding.
    return false;
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

// Same events, same order, same content as calling recordTasbeehRepetition()
// `times` times in a row — the only difference is a SINGLE persist() (one
// synchronous localStorage write of the whole event log) instead of one per
// repetition. This matters because persist() re-serializes the ENTIRE,
// ever-growing event history on every call (localStorage has no incremental
// append), and Voice Tasbeeh can credit more than one completed repetition
// from a single recognition result (rapid genuine repetitions, or a
// burst replayed after a recognizer restart) — see applyVoiceRepetitions in
// TasbeehScreen.tsx, the only caller. Doing that redundant full-log
// serialization/write `times` times in the same synchronous call, right
// before the UI can paint the updated count, is pure unnecessary work: the
// data recorded and its durability are byte-for-byte identical either way.
export function recordTasbeehRepetitions(dhikrId: number, times: number) {
  if (times <= 0) return;
  const events = load();
  for (let i = 0; i < times; i++) {
    events.push({ ...nowStamp(), kind: "repetition", source: "tasbeeh", dhikrId: String(dhikrId) });
  }
  persist();
}

// A repetition's device-local date/time/timezone, captured at the moment
// it actually happened. For Floating Tasbeeh specifically, that moment is
// the native tap itself — which can happen while this JS runtime isn't
// even running — not whenever reconciliation later gets around to
// committing it (see floatingTasbeehSync.ts). Structurally identical to
// nowStamp()'s own return shape, but recordFloatingTasbeehRepetition[s]
// below accept it explicitly rather than always deriving it internally.
export interface FloatingTasbeehOccurredAt {
  ts: number;
  localDate: string;
  localTime: string;
  timeZone: string;
}

// Floating Tasbeeh's own recording entry point — a deliberately SEPARATE
// function from recordTasbeehRepetitions above (never a `source` parameter
// threaded through it) so the manual/Voice Tasbeeh call sites and their
// existing behavior stay byte-for-byte unchanged. Tags every event
// `source: "floating"` rather than `"tasbeeh"` so the raw log always shows
// where a repetition actually came from, while getTasbeehStats() below
// still folds it into the same Tasbeeh totals the user already sees.
// `occurredAt` defaults to "now" (unchanged from Phase 1) — reconciliation
// always passes the tap's own captured stamp explicitly instead.
export function recordFloatingTasbeehRepetition(dhikrId: number, times: number, occurredAt?: FloatingTasbeehOccurredAt) {
  if (times <= 0) return;
  const events = load();
  const stamp = occurredAt ?? nowStamp();
  // An explicit `occurredAt` is a native tap's own captured moment — if the
  // log already holds a floating event for that exact tap, this call is a
  // replay of one that was already recorded (see floatingReplayKey), so it
  // records nothing. A "now" stamp is never a replay, so it isn't checked.
  if (occurredAt && floatingReplayKeys(events).has(floatingReplayKey(stamp, String(dhikrId)))) return;
  for (let i = 0; i < times; i++) {
    events.push({ ...stamp, kind: "repetition", source: "floating", dhikrId: String(dhikrId) });
  }
  persist();
}

// A floating tap is identified by the native moment it was accepted (`ts`,
// millisecond epoch, plus the local date/time stamped alongside it) and its
// dhikr. Native accepts at most one tap per
// pacing window (>= 500ms, and never closer than the 80ms duplicate guard),
// so two genuinely different taps can never share both values — which makes
// a repeat of the same pair a REPLAY of an already-recorded tap (a batch
// redelivered because the process died before native was told it was
// drained, or two overlapping reconciliation passes reading the same
// pending queue), not a new repetition.
function floatingReplayKey(at: FloatingTasbeehOccurredAt, dhikrId: string): string {
  return `${at.ts}|${at.localDate}|${at.localTime}|${dhikrId}`;
}

function floatingReplayKeys(events: StatEvent[]): Set<string> {
  const keys = new Set<string>();
  for (const e of events) {
    if (e.kind === "repetition" && e.source === "floating") keys.add(floatingReplayKey(e, e.dhikrId));
  }
  return keys;
}

export interface FloatingTasbeehBatchEntry {
  dhikrId: number;
  times: number;
  occurredAt: FloatingTasbeehOccurredAt;
}

// Batched sibling of recordFloatingTasbeehRepetition — same rationale as
// recordTasbeehRepetitions above (one persist() for the whole batch,
// rather than one full-log serialization per pending event), but each
// entry keeps its OWN occurredAt stamp rather than sharing one, since a
// reconciliation batch is typically many DIFFERENT taps made at different
// real moments while the app was closed (e.g. 50 offline floating taps
// across a day), unlike Voice Tasbeeh's single-moment burst.
//
// Replay-safe: an entry whose native tap (ts + dhikr, see floatingReplayKey)
// is already in the log — or repeated earlier in this same batch — is
// skipped, so redelivering a pending batch can never record the same tap
// twice in Statistics.
export function recordFloatingTasbeehRepetitions(entries: FloatingTasbeehBatchEntry[]) {
  const events = load();
  const seen = floatingReplayKeys(events);
  let wrote = false;
  for (const entry of entries) {
    if (entry.times <= 0) continue;
    const dhikrId = String(entry.dhikrId);
    const key = floatingReplayKey(entry.occurredAt, dhikrId);
    if (seen.has(key)) continue;
    seen.add(key);
    for (let i = 0; i < entry.times; i++) {
      events.push({ ...entry.occurredAt, kind: "repetition", source: "floating", dhikrId });
    }
    wrote = true;
  }
  if (wrote) persist();
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

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Turns the two raw date-picker values of a custom range into the inclusive
// range actually reported: each date is capped at [today] (statistics for
// the future are meaningless) and the pair is put in chronological order,
// so picking the "from" date after the "to" date (or vice versa) reports
// the span between them instead of an empty inverted range. A value that
// isn't a full "YYYY-MM-DD" falls back to [today]. Deliberately does NOT
// snap either picker's own value: a native date input reports partial
// values while a date is being typed (a year arrives digit by digit,
// e.g. "0002-…"), and rewriting the other field mid-typing would corrupt
// it — the raw values stay exactly as the user set them, and only this
// derived range is normalized. Plain string comparisons, no Date parsing,
// so there is no timezone-dependent off-by-one.
export function resolveCustomRange(a: string, b: string, today: string): { from: string; to: string } {
  const cap = (d: string) => (LOCAL_DATE_PATTERN.test(d) ? (d > today ? today : d) : today);
  const x = cap(a);
  const y = cap(b);
  return x <= y ? { from: x, to: y } : { from: y, to: x };
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
  // "tasbeeh" (manual + Voice) and "floating" (Floating Tasbeeh) are
  // reported as ONE unified total on purpose — see the StatSource doc
  // comment above. A user tapping the floating counter must see the exact
  // same running total as tapping inside the app, not a second, separate
  // number.
  const reps = events.filter(
    (e): e is RepetitionEvent => e.kind === "repetition" && (e.source === "tasbeeh" || e.source === "floating"),
  );
  return { total: reps.length, perDhikr: repetitionBreakdown(reps) };
}
