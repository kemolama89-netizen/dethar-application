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
// Tasbeeh taps still queued natively for today. A day is "nothing recorded"
// only when that is verified (the day's snapshot says so, or the app wasn't
// opened that day); a snapshot marked "unavailable", an unreadable one, or
// none at all after the app was opened that day is reported as unknown —
// and the wording says nothing was RECORDED, never that the user did nothing.
//
// Comparisons with earlier days appear only when there is enough history
// (DailySummary decides: a recorded yesterday, or at least 4 tracked days
// in the past week).
//
// COUNTS = THE STATISTICS SCREEN'S: every number comes from the very
// functions Settings → الإحصائيات calls (stats.ts getWirdDayStats,
// getPrayerStats, getTasbeehStats) for its "daily" and "منذ البداية"
// periods (statisticsCounts) — so the summary can never disagree with it.
// In particular Tasbeeh includes the Audio Adhkar "Various" recordings
// heard to the end, exactly as that screen counts them, and written
// adhkar are the Morning, Evening and Prayer repetitions it lists.
import { getDailyActivity, getDailyAudioActivity, getEarliestLocalDate, getNativeTakenIn, getPrayerStats, getStatsReadStatus, getTasbeehStats, getWirdDayStats, todayLocalDate, addDays } from "./stats";
import type { DailyActivity, StatSelection } from "./stats";
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

/** One period's counts exactly as the Statistics screen reports them. */
export interface StatisticsCounts {
  /** Morning / Evening: distinct days the whole wird was completed (read, or heard to its end). */
  morningDays: number;
  eveningDays: number;
  prayerSessions: number;
  /** Manual, voice and Floating Tasbeeh, plus Audio "Various" recordings heard to the end. */
  tasbeeh: number;
  /** Written Morning, Evening and Prayer adhkar repetitions. */
  written: number;
}

const repetitions = (s: { perDhikr: { total: number }[] }) => s.perDhikr.reduce((n, e) => n + e.total, 0);

/** The Statistics screen's numbers for `selection` — the same functions, the same rules. */
export function statisticsCounts(selection: StatSelection): StatisticsCounts {
  const morning = getWirdDayStats("morning", selection);
  const evening = getWirdDayStats("evening", selection);
  const prayer = getPrayerStats(selection);
  return {
    morningDays: morning.daysCompleted,
    eveningDays: evening.daysCompleted,
    prayerSessions: prayer.sessionsCompleted,
    tasbeeh: getTasbeehStats(selection).total,
    written: repetitions(morning) + repetitions(evening) + repetitions(prayer),
  };
}

/** A local day's activity for the summary, from the Statistics screen's daily counts (DailyActivity's shape, which native reads). */
export function summaryDayActivity(date: string): DailyActivity {
  const c = statisticsCounts({ kind: "daily", date });
  return {
    date,
    writtenRepetitions: c.written,
    tasbeehRepetitions: c.tasbeeh,
    wirds: [...(c.morningDays > 0 ? (["morning"] as const) : []), ...(c.eveningDays > 0 ? (["evening"] as const) : [])],
    // How each wird was completed isn't a count; it is only shown in the app.
    wirdsHow: getDailyActivity(date).wirdsHow,
    prayerSessions: c.prayerSessions,
    total: c.written + c.tasbeeh,
  };
}

export interface SummarySnapshot {
  /** The local day `today` describes, "YYYY-MM-DD". */
  date: string;
  /**
   * "unavailable" when the statistics couldn't be read (stats.ts
   * getStatsReadStatus) or the snapshot couldn't be built: its zeros are
   * then unknown, never "nothing recorded" — native says so instead.
   */
  status: "ok" | "unavailable";
  today: DailyActivity;
  /** Everything recorded so far — the Statistics screen's «منذ البداية» period. */
  allTime: StatisticsCounts;
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

/**
 * What a day's records say, for every place that reports on the day (the
 * Settings preview here, the notification in ReminderLogic.kt) — one rule,
 * from the same counts, so a status line can never contradict the counts
 * shown with it:
 *  - "unavailable": the statistics couldn't be read — never "nothing recorded";
 *  - "recorded": the user's own adhkar (wirds, prayer sessions, repetitions);
 *  - "listening": only Audio Adhkar listening (its own line, never repetitions);
 *  - "empty": verifiably nothing.
 */
export type DayRecordStatus = "unavailable" | "recorded" | "listening" | "empty";

export function dayRecordStatus(today: DailyActivity, audio: Pick<SummaryAudio, "completedPlays" | "listenedMs">, readable: boolean): DayRecordStatus {
  if (!readable) return "unavailable";
  if (today.total > 0 || today.wirds.length > 0 || today.prayerSessions > 0) return "recorded";
  // As native's listeningLine: a play heard to the end, or measured listening time.
  if (audio.completedPlays > 0 || audio.listenedMs > 0) return "listening";
  return "empty";
}

export interface DayRecords {
  status: DayRecordStatus;
  today: DailyActivity;
  audio: SummaryAudio;
}

/** A local day's records and their status, all from one read of the statistics. */
export function readDayRecords(date: string): DayRecords {
  const today = summaryDayActivity(date);
  const audio = buildSummaryAudio(date);
  return { status: dayRecordStatus(today, audio, getStatsReadStatus() === "ok"), today, audio };
}

const emptyActivity = (date: string): DailyActivity => ({
  date,
  writtenRepetitions: 0,
  tasbeehRepetitions: 0,
  wirds: [],
  wirdsHow: { morning: [], evening: [] },
  prayerSessions: 0,
  total: 0,
});

/** The snapshot pushed when the real one couldn't be built: native reports the day as unknown. */
export function unavailableSummarySnapshot(date: string = todayLocalDate()): SummarySnapshot {
  return {
    date,
    status: "unavailable",
    today: emptyActivity(date),
    allTime: { morningDays: 0, eveningDays: 0, prayerSessions: 0, tasbeeh: 0, written: 0 },
    history: [],
    trackedSince: null,
    audio: { completedPlays: 0, stoppedEarlyPlays: 0, sessions: 0, playsWithoutSession: 0, listenedMs: 0, playsWithoutDuration: 0, titles: [] },
    taken: { floatingThrough: null, audioIds: [] },
  };
}

export function buildSummarySnapshot(date: string = todayLocalDate()): SummarySnapshot {
  if (getStatsReadStatus() !== "ok") return unavailableSummarySnapshot(date);
  const history = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(date, i - 7);
    return { date: day, total: summaryDayActivity(day).total };
  });
  return {
    date,
    status: "ok",
    today: summaryDayActivity(date),
    allTime: statisticsCounts({ kind: "all" }),
    history,
    trackedSince: getEarliestLocalDate(),
    audio: buildSummaryAudio(date),
    taken: getNativeTakenIn(date),
  };
}
