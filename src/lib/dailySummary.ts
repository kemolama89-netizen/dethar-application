// The end-of-day Adhkar summary (Settings → ملخص نهاية اليوم): at the time
// the user chooses, one encouraging notification about what THEY recorded
// today — completed wirds, written-adhkar repetitions and Tasbeeh (manual,
// voice, Floating) — and, on a separate line, Audio Adhkar LISTENING
// (recordings heard to the end, recordings played in part, sessions, the
// real listening time, which dhikr). Listening is never counted as the user's own dhikr or turned into
// repetitions (stats.ts getDailyActivity / getDailyAudioActivity).
//
// The app's statistics live in the WebView's storage, which native code
// can't read while the app is closed — so JS pushes a small snapshot
// whenever it may have changed (launch, return to the app, leaving it,
// and right after a repetition is recorded): today's activity plus the
// previous days' totals for comparisons. Native composes the message at
// delivery time (DailySummary in ReminderLogic.kt), adding any Floating
// Tasbeeh taps still queued natively for today, and treats a missing or
// stale snapshot as "nothing recorded" — the wording says nothing was
// RECORDED, never that the user did nothing.
//
// Comparisons with earlier days appear only when there is enough history
// (DailySummary decides: a recorded yesterday, or at least 4 tracked days
// in the past week).
import { getDailyActivity, getDailyAudioActivity, getEarliestLocalDate, getNativeTakenIn, todayLocalDate, addDays } from "./stats";
import type { DailyActivity } from "./stats";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { dhikrItems } from "../data/tasbeeh";
import { isValidStartTime } from "./eveningAudioSettings";

export type SummaryContent = "combined" | "stats" | "motivational";

export interface DailySummarySettings {
  enabled: boolean;
  /** Local "HH:mm". */
  time: string;
  content: SummaryContent;
}

export const DEFAULT_SUMMARY_SETTINGS: DailySummarySettings = { enabled: false, time: "21:30", content: "combined" };

const KEY = "dithar:daily-summary:v1";
const listeners = new Set<() => void>();

export function subscribeSummarySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadSummarySettings(): DailySummarySettings {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = (raw ? JSON.parse(raw) : {}) as Partial<DailySummarySettings>;
    return {
      enabled: obj.enabled === true,
      time: typeof obj.time === "string" && isValidStartTime(obj.time) ? obj.time : DEFAULT_SUMMARY_SETTINGS.time,
      content: obj.content === "stats" || obj.content === "motivational" ? obj.content : "combined",
    };
  } catch {
    return { ...DEFAULT_SUMMARY_SETTINGS };
  }
}

export function saveSummarySettings(settings: DailySummarySettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Best effort.
  }
  for (const listener of [...listeners]) listener();
}

export interface SummarySnapshot {
  /** The local day `today` describes, "YYYY-MM-DD". */
  date: string;
  today: DailyActivity;
  /** The 7 days before `date`, oldest first — totals only. */
  history: { date: string; total: number }[];
  /** The first day anything was recorded, or null. */
  trackedSince: string | null;
  /** Audio Adhkar listening that day — reported separately, never as the user's repetitions. */
  audio: SummaryAudio;
  /**
   * What of native's own queues (Floating Tasbeeh taps, Audio Adhkar
   * completions) this snapshot already holds (stats.ts getNativeTakenIn):
   * native adds only what is still queued and NOT in here — never lost,
   * never counted twice.
   */
  taken: { floatingThrough: number | null; audioIds: string[] };
}

export interface SummaryAudio {
  completedPlays: number;
  /** Recordings that played part of the way (their time is in listenedMs; never a repetition). */
  stoppedEarlyPlays: number;
  sessions: number;
  playsWithoutSession: number;
  listenedMs: number;
  playsWithoutDuration: number;
  /** Up to five titles of what was heard, most-played first (in Arabic, as the lists show them). */
  titles: string[];
}

/** A heard dhikr's title: as the player recorded it, else looked up by its list and id; null when unknown. */
export function audioDhikrTitle(key: string, recorded?: string): string | null {
  if (recorded) return recorded;
  const [list, ...rest] = key.split(":");
  const id = rest.join(":");
  if (list === "morning" || list === "evening") {
    const item = writtenAdhkarItems[list]?.find((i) => i.id === id);
    return item ? (item.title_ar ?? item.text_ar.split(/\s+/).slice(0, 6).join(" ")) : null;
  }
  const tasbeeh = dhikrItems.find((d) => String(d.id) === id);
  return tasbeeh ? tasbeeh.dhikr_ar : null;
}

export function buildSummaryAudio(date: string): SummaryAudio {
  const a = getDailyAudioActivity(date);
  const titles = a.dhikr
    .map((d) => audioDhikrTitle(d.key, d.title))
    .filter((t): t is string => !!t)
    .slice(0, 5);
  return {
    completedPlays: a.completedPlays,
    stoppedEarlyPlays: a.stoppedEarlyPlays,
    sessions: a.sessions,
    playsWithoutSession: a.playsWithoutSession,
    listenedMs: a.listenedMs,
    playsWithoutDuration: a.playsWithoutDuration,
    titles,
  };
}

export function buildSummarySnapshot(date: string = todayLocalDate()): SummarySnapshot {
  const history = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(date, i - 7);
    return { date: day, total: getDailyActivity(day).total };
  });
  return { date, today: getDailyActivity(date), history, trackedSince: getEarliestLocalDate(), audio: buildSummaryAudio(date), taken: getNativeTakenIn(date) };
}
