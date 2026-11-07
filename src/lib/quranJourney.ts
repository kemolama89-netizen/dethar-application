// The Qur'an Journey: one Mushaf page a day, met through one of al-Sa'di's own comments
// on a verse of that page (lib/saadiTafsir.ts), shown in Basa'ir.
//
//  - A round is the 604 pages in order. The day's page is the round's next unexplored
//    page, and it is explored only when the user opens the day's insight and it stays on
//    screen (recordDailyInsightViewed): being assigned, or reading the same Tafsir freely
//    in Basa'ir, never counts. One page a day: after it is explored, the next waits for
//    the next local day.
//  - After page 604 the round is complete; the next day starts a new round, and every
//    earlier round stays, with each page's insight and date.
//  - An insight is al-Sa'di's whole comment on one verse, exactly as stored: nothing is
//    split, joined or reworded. Only a verse of the page itself is ever chosen for it.
//    Rows that aren't an insight are left out (isEligibleInsight): «لم يفسرها الشيخ»,
//    a bare cross-reference, or under ELIGIBLE_MIN_CHARS.
//  - Each page's eligible insights have one fixed order (the same on every device, and
//    unchanged for the others if one is added or removed). A round takes the first one
//    this page hasn't had yet; once all have been used, the one used least, longest ago.
//  - The day's assignment is saved, so it stays the same all day, across restarts.
//  - Kept apart from the Adhkar and Tasbeeh statistics (lib/stats.ts): its own storage,
//    which "Delete statistics history" doesn't touch.
import { pageVerses, TOTAL_PAGES } from "./quranMeta";
import { getSaadiVerse, loadSaadiSurah, parseSaadiText } from "./saadiTafsir";
import { saadiTextForCard } from "./tafsirShare";
import { matchesSelection, type StatSelection } from "./stats";

export const JOURNEY_PAGES = TOTAL_PAGES;
/** How long the day's insight stays on screen before its page counts as explored. */
export const DAILY_VIEW_MS = 3000;
const STORAGE_KEY = "dithar:quran-journey:v1";

/** "surah:ayah" of the verse whose comment is the insight. */
export type InsightId = string;

export interface PageVisit {
  page: number;
  insight: InsightId;
  /** Device-local date it was explored, "YYYY-MM-DD". */
  localDate: string;
  ts: number;
}

export interface JourneyRound {
  /** 1, 2, … */
  n: number;
  startedOn: string;
  completedOn?: string;
  /** In the order explored. A page appears at most once. */
  visits: PageVisit[];
}

export interface DailyAssignment {
  localDate: string;
  round: number;
  page: number;
  insight: InsightId;
}

export interface JourneyState {
  v: 1;
  rounds: JourneyRound[];
  today?: DailyAssignment;
}

export const emptyJourney = (): JourneyState => ({ v: 1, rounds: [] });

// ---- which comments are insights ------------------------------------------

/** Shorter than this, a comment is a passing gloss that doesn't stand alone (e.g. «فثبتوا وصبروا لقتال عدوهم»). */
export const ELIGIBLE_MIN_CHARS = 80;
const HARAKAT = /[ً-ْٰـ]/g;
const NOT_EXPLAINED = /لم يفسر/;
const REFERRAL = /تقدم تفسير|سبق تفسير|تقدم الكلام|مر تفسير|تقدم نظيرها|تقدم مثلها/;

/** Whether al-Sa'di's text on a verse (its stored text) is an insight of its own. */
export function isEligibleInsight(stored: string, ayah: number): boolean {
  const card = saadiTextForCard(parseSaadiText(stored), ayah)
    .replace(/\{\d+(-\d+)?\}/g, "")
    .trim();
  const bare = card.replace(HARAKAT, "");
  if (NOT_EXPLAINED.test(bare) && bare.length < 120) return false;
  if (REFERRAL.test(bare) && bare.length < 160) return false;
  return card.length >= ELIGIBLE_MIN_CHARS;
}

/** The page's eligible insights (from its own verses only), in their fixed order. Loads the surahs it needs. */
export async function eligibleInsights(page: number): Promise<InsightId[]> {
  const verses = pageVerses(page);
  const ids: InsightId[] = [];
  for (const [surah, ayah] of verses) {
    const data = await loadSaadiSurah(surah);
    const row = data?.ayat.find((a) => a.ayah === ayah);
    if (row && isEligibleInsight(row.text, ayah)) ids.push(`${surah}:${ayah}`);
  }
  // A page with no comment long enough still has its verses' comments: never another page's.
  if (ids.length === 0) {
    for (const [surah, ayah] of verses) {
      const v = await getSaadiVerse(surah, ayah);
      if (v.status === "found" && v.text.trim()) ids.push(`${surah}:${ayah}`);
    }
  }
  return orderInsights(page, ids);
}

/** FNV-1a: a small, stable hash, the same in every engine. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** The page's fixed order: by a hash of page and verse, so it doesn't follow verse order and doesn't move when another verse joins or leaves. */
export function orderInsights(page: number, ids: readonly InsightId[]): InsightId[] {
  return [...ids].sort((a, b) => hash(`${page}|${a}`) - hash(`${page}|${b}`) || (a < b ? -1 : 1));
}

// ---- choosing the day's page and insight ------------------------------------

/** Every earlier use of an insight on this page, across all rounds. */
function pageHistory(state: JourneyState, page: number): PageVisit[] {
  return state.rounds.flatMap((r) => r.visits.filter((v) => v.page === page));
}

/**
 * The insight for [page]: the first in its order this page hasn't had; once all have been
 * used, the one used fewest times, then the one used longest ago. Only ever one of [eligible].
 */
export function chooseInsight(state: JourneyState, page: number, eligible: readonly InsightId[]): InsightId | null {
  if (eligible.length === 0) return null;
  const history = pageHistory(state, page);
  const uses = new Map<InsightId, { count: number; last: number }>();
  for (const v of history) {
    const u = uses.get(v.insight) ?? { count: 0, last: 0 };
    uses.set(v.insight, { count: u.count + 1, last: Math.max(u.last, v.ts) });
  }
  const fresh = eligible.find((id) => !uses.has(id));
  if (fresh) return fresh;
  return [...eligible].sort((a, b) => uses.get(a)!.count - uses.get(b)!.count || uses.get(a)!.last - uses.get(b)!.last)[0];
}

/** The round the journey is in on [localDate] (a new one after a completed round), without changing [state]. */
function roundFor(state: JourneyState, localDate: string): JourneyRound {
  const last = state.rounds[state.rounds.length - 1];
  if (last && !last.completedOn) return last;
  return { n: (last?.n ?? 0) + 1, startedOn: localDate, visits: [] };
}

/** The round's next unexplored page (the lowest), or null when all 604 are explored. */
export function nextPage(round: JourneyRound): number | null {
  const done = new Set(round.visits.map((v) => v.page));
  for (let p = 1; p <= JOURNEY_PAGES; p++) if (!done.has(p)) return p;
  return null;
}

export type DailyStatus =
  | { kind: "assigned"; assignment: DailyAssignment; explored: boolean }
  /** Storage can't be read: nothing is assigned rather than risk counting wrongly. */
  | { kind: "unavailable" };

/**
 * The day's assignment, made once per local day and saved. A page explored today stays
 * today's (explored: true); the next page waits for tomorrow. A completed round gives way
 * to a new one on the next day.
 */
export async function dailyAssignment(localDate: string, eligibleFor: (page: number) => Promise<InsightId[]> = eligibleInsights): Promise<DailyStatus> {
  const state = loadJourney();
  if (!state) return { kind: "unavailable" };
  if (state.today?.localDate === localDate) {
    const t = state.today;
    const round = state.rounds.find((r) => r.n === t.round);
    return { kind: "assigned", assignment: t, explored: Boolean(round?.visits.some((v) => v.page === t.page)) };
  }
  const round = roundFor(state, localDate);
  // A round completed today: today stays its last page, explored. (Only reached if the saved assignment was lost.)
  const exploredToday = state.rounds.flatMap((r) => r.visits.map((v) => ({ r, v }))).find(({ v }) => v.localDate === localDate);
  if (exploredToday) {
    const assignment = { localDate, round: exploredToday.r.n, page: exploredToday.v.page, insight: exploredToday.v.insight };
    saveJourney({ ...state, today: assignment });
    return { kind: "assigned", assignment, explored: true };
  }
  const page = nextPage(round);
  if (page === null) return { kind: "unavailable" }; // Not reachable: a full round is completed.
  const insight = chooseInsight(state, page, await eligibleFor(page));
  if (!insight) return { kind: "unavailable" };
  const assignment: DailyAssignment = { localDate, round: round.n, page, insight };
  // Re-read: another screen may have written while the surahs loaded.
  const latest = loadJourney() ?? state;
  if (latest.today?.localDate === localDate) return dailyAssignment(localDate, eligibleFor);
  saveJourney({ ...latest, today: assignment });
  return { kind: "assigned", assignment, explored: false };
}

/**
 * What the daily notification invites to (lib/quranJourneyNotify.ts): today's assignment while
 * it is unexplored; once it is explored, the assignment [nextDate] will get — computed exactly
 * as dailyAssignment will make it then (nothing else can change the record before), but not
 * saved. Missed days change nothing: an unexplored page stays the one invited to. Null when
 * storage can't be read.
 */
export async function upcomingAssignment(localDate: string, nextDate: string, eligibleFor: (page: number) => Promise<InsightId[]> = eligibleInsights): Promise<DailyAssignment | null> {
  const status = await dailyAssignment(localDate, eligibleFor);
  if (status.kind !== "assigned") return null;
  if (!status.explored) return status.assignment;
  const state = loadJourney();
  if (!state) return null;
  const round = roundFor(state, nextDate);
  const page = nextPage(round);
  if (page === null) return null;
  const insight = chooseInsight(state, page, await eligibleFor(page));
  return insight ? { localDate: nextDate, round: round.n, page, insight } : null;
}

/**
 * The day's insight was opened and stayed on screen: its page is explored in its round,
 * once. Anything else — another day's assignment, a page already explored in this round,
 * a second call — changes nothing. Returns whether it counted.
 */
export function recordDailyInsightViewed(assignment: DailyAssignment, now: Date = new Date()): boolean {
  const state = loadJourney();
  if (!state || state.today?.localDate !== assignment.localDate || state.today.page !== assignment.page || state.today.insight !== assignment.insight) return false;
  return saveJourney(applyView(state, assignment, now.getTime())) !== null;
}

/** Pure: [state] with [assignment]'s page explored — unchanged when it already is. */
export function applyView(state: JourneyState, assignment: DailyAssignment, ts: number): JourneyState {
  const rounds = state.rounds.map((r) => ({ ...r, visits: [...r.visits] }));
  let round = rounds.find((r) => r.n === assignment.round);
  if (!round) {
    const last = rounds[rounds.length - 1];
    if (last && !last.completedOn) return state; // Only the round after a completed one may start.
    round = { n: assignment.round, startedOn: assignment.localDate, visits: [] };
    rounds.push(round);
  }
  if (round.completedOn || round.visits.some((v) => v.page === assignment.page)) return state;
  round.visits.push({ page: assignment.page, insight: assignment.insight, localDate: assignment.localDate, ts });
  if (round.visits.length >= JOURNEY_PAGES) round.completedOn = assignment.localDate;
  return { ...state, rounds };
}

// ---- storage -----------------------------------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^\d{1,3}:\d{1,3}$/;
const validPage = (p: unknown): p is number => Number.isInteger(p) && (p as number) >= 1 && (p as number) <= JOURNEY_PAGES;

/** Reads what's stored, keeping every valid record (an invalid one is dropped, never the whole journey). Null when storage can't be read. */
export function loadJourney(): JourneyState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return emptyJourney();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // Unreadable: never overwritten by a fresh start.
  }
  const value = parsed as Partial<JourneyState> | null;
  if (!value || !Array.isArray(value.rounds)) return null;
  const rounds: JourneyRound[] = [];
  for (const r of value.rounds as Partial<JourneyRound>[]) {
    if (!r || !Number.isInteger(r.n) || typeof r.startedOn !== "string" || !DATE.test(r.startedOn) || !Array.isArray(r.visits)) continue;
    const seen = new Set<number>();
    const visits = (r.visits as Partial<PageVisit>[]).filter((v): v is PageVisit => {
      const ok = !!v && validPage(v.page) && typeof v.insight === "string" && ID.test(v.insight) && typeof v.localDate === "string" && DATE.test(v.localDate) && typeof v.ts === "number" && !seen.has(v.page);
      if (ok) seen.add(v.page as number);
      return ok;
    });
    rounds.push({ n: r.n as number, startedOn: r.startedOn, ...(typeof r.completedOn === "string" && DATE.test(r.completedOn) ? { completedOn: r.completedOn } : {}), visits });
  }
  rounds.sort((a, b) => a.n - b.n);
  const t = value.today;
  const today = t && typeof t.localDate === "string" && DATE.test(t.localDate) && Number.isInteger(t.round) && validPage(t.page) && typeof t.insight === "string" && ID.test(t.insight) ? t : undefined;
  return { v: 1, rounds, ...(today ? { today } : {}) };
}

const listeners = new Set<() => void>();

/** Saves; returns the state saved, or null when storage refused it. */
function saveJourney(state: JourneyState): JourneyState | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return null;
  }
  for (const l of [...listeners]) l();
  return state;
}

/** For screens showing the journey: called after every change. */
export function subscribeJourney(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- what Statistics shows -------------------------------------------------------

export interface JourneyStats {
  /** The round in progress (or the last, completed one when the next hasn't started yet). */
  round: { n: number; explored: number; percent: number; startedOn: string; completedOn?: string } | null;
  /** Pages explored (= insights viewed) in [selection], across rounds. */
  viewedInSelection: number;
  /** Every insight ever viewed, counting a repeat once. */
  distinctInsights: number;
  totalViews: number;
  rounds: { n: number; explored: number; startedOn: string; completedOn?: string }[];
  /** Pages explored per calendar year, newest first. */
  years: { year: number; explored: number }[];
  /** Every page explored, newest first. */
  history: (PageVisit & { round: number })[];
}

export function journeyStats(state: JourneyState, selection: StatSelection): JourneyStats {
  const all = state.rounds.flatMap((r) => r.visits.map((v) => ({ ...v, round: r.n })));
  const last = state.rounds[state.rounds.length - 1];
  const years = new Map<number, number>();
  for (const v of all) years.set(Number(v.localDate.slice(0, 4)), (years.get(Number(v.localDate.slice(0, 4))) ?? 0) + 1);
  return {
    round: last ? { n: last.n, explored: last.visits.length, percent: Math.floor((last.visits.length / JOURNEY_PAGES) * 1000) / 10, startedOn: last.startedOn, ...(last.completedOn ? { completedOn: last.completedOn } : {}) } : null,
    viewedInSelection: all.filter((v) => matchesSelection(v.localDate, selection)).length,
    distinctInsights: new Set(all.map((v) => v.insight)).size,
    totalViews: all.length,
    rounds: state.rounds.map((r) => ({ n: r.n, explored: r.visits.length, startedOn: r.startedOn, ...(r.completedOn ? { completedOn: r.completedOn } : {}) })),
    years: [...years].sort((a, b) => b[0] - a[0]).map(([year, explored]) => ({ year, explored })),
    history: all.sort((a, b) => b.ts - a.ts),
  };
}
