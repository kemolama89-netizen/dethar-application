// Persisted settings for scheduled Audio Adhkar
// (Settings → إعدادات الأذكار الصوتية): Morning and Evening — each its own
// switch, daily start time and Quran reciter (a specific one, or a random
// one per dhikr) — and Miscellaneous — its own switch, daily window and
// interval (a preset or the user's own); plus, per section, which adhkar
// play. Every section is independent. Same
// localStorage conventions as the app's other settings; this is the JS
// source of truth, which audioAdhkarSchedules.ts pushes to the native
// Android scheduler.
//
// Evening keeps the storage it always had (eveningAudioSettings.ts), so an
// existing Evening schedule carries over unchanged.
import { getAvailableQuranReciters, getDefaultQuranReciter, getQuranReciterById } from "../data/quranReciters";
import type { QuranReciter } from "../data/quranReciters";
import { isValidStartTime, loadEveningAudioSettings, saveEveningAudioSettings, startTimeToMinutes } from "./eveningAudioSettings";
import { loadQuranReciterMode, loadSelectedQuranReciterId } from "./quranAudioPreferences";

export { isValidStartTime, startTimeToMinutes };

export type DailySection = "morning" | "evening";
export const DAILY_SECTIONS: readonly DailySection[] = ["morning", "evening"];

export interface DailyScheduleSettings {
  enabled: boolean;
  /** Local "HH:mm" (24h), or "" when not chosen yet. */
  startTime: string;
}

/** The preset intervals offered for Miscellaneous adhkar, in minutes; any whole number in range may be entered instead. */
export const MISC_INTERVAL_PRESETS = [2, 3, 5, 10, 60] as const;
/** A custom interval: whole minutes, at least 1, at most 12 hours. */
export const MISC_INTERVAL_MIN = 1;
export const MISC_INTERVAL_MAX = 720;

export interface MiscScheduleSettings {
  enabled: boolean;
  /** Local "HH:mm" — the window [startTime, endTime); it crosses midnight when endTime < startTime. */
  startTime: string;
  endTime: string;
  /** Minutes between two adhkar — a preset or a valid custom value (isMiscInterval). */
  intervalMinutes: number;
}

const MORNING_KEY = "dithar:audio-adhkar:morning:v1";
const MISC_KEY = "dithar:audio-adhkar:misc:v1";
const RECITERS_KEY = "dithar:audio-adhkar:reciters:v1";
const RANDOM_RECITER_KEY = "dithar:audio-adhkar:reciter-random:v1";
const SELECTION_KEY = "dithar:audio-adhkar:selection:v1";

const MASTER_KEY = "dithar:audio-adhkar:master:v1";

export const DEFAULT_MISC_SCHEDULE: MiscScheduleSettings = { enabled: false, startTime: "09:00", endTime: "21:00", intervalMinutes: 5 };

// An in-memory copy for when localStorage is missing or blocked — the
// settings then last for the session (same convention as quranAudioPreferences.ts).
const memory = new Map<string, Record<string, unknown>>();
// Keys whose latest save didn't reach localStorage (e.g. storage full):
// localStorage still holds the OLD value there, so reads must take the
// in-memory copy — or a section switched on would read back as off.
const unsaved = new Set<string>();

function read(key: string): Record<string, unknown> {
  if (unsaved.has(key)) return memory.get(key) ?? {};
  let raw: string | null;
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    raw = localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? {};
  }
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {}; // unreadable: the defaults
  }
}

/** Test seam: forget the in-memory copy. */
export function resetAudioAdhkarScheduleSettingsMemoryForTesting(): void {
  memory.clear();
  unsaved.clear();
  eveningUnsaved = null;
}

function write(key: string, value: Record<string, unknown> | DailyScheduleSettings | MiscScheduleSettings): void {
  memory.set(key, value as Record<string, unknown>);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    unsaved.delete(key);
  } catch {
    // Best-effort only — the in-memory copy already took effect, and read() uses it.
    unsaved.add(key);
  }
}

const time = (value: unknown, fallback: string) => (typeof value === "string" && isValidStartTime(value) ? value : fallback);

// Evening's own storage (eveningAudioSettings.ts) swallows a failed save: the
// value it couldn't store is kept here, so it reads back as saved (see `unsaved`).
let eveningUnsaved: DailyScheduleSettings | null = null;

export function loadDailySchedule(section: DailySection): DailyScheduleSettings {
  if (section === "evening") {
    if (eveningUnsaved) return { ...eveningUnsaved };
    const evening = loadEveningAudioSettings();
    return { enabled: evening.eveningAudioEnabled, startTime: evening.eveningAudioStartTime };
  }
  const obj = read(MORNING_KEY);
  return { enabled: obj.enabled === true, startTime: time(obj.startTime, "") };
}

export function saveDailySchedule(section: DailySection, settings: DailyScheduleSettings): void {
  if (section === "evening") {
    saveEveningAudioSettings({ eveningAudioEnabled: settings.enabled, eveningAudioStartTime: settings.startTime });
    const stored = loadEveningAudioSettings();
    const kept = stored.eveningAudioEnabled === settings.enabled && stored.eveningAudioStartTime === settings.startTime;
    eveningUnsaved = kept ? null : { ...settings };
  } else {
    write(MORNING_KEY, settings);
  }
}

export function isMiscInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MISC_INTERVAL_MIN && value <= MISC_INTERVAL_MAX;
}

/** Parses what the user typed as a custom interval; null when it isn't a whole number of minutes in range. */
export function parseMiscInterval(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return isMiscInterval(minutes) ? minutes : null;
}

export function loadMiscSchedule(): MiscScheduleSettings {
  const obj = read(MISC_KEY);
  return {
    enabled: obj.enabled === true,
    startTime: time(obj.startTime, DEFAULT_MISC_SCHEDULE.startTime),
    endTime: time(obj.endTime, DEFAULT_MISC_SCHEDULE.endTime),
    intervalMinutes: isMiscInterval(obj.intervalMinutes) ? obj.intervalMinutes : DEFAULT_MISC_SCHEDULE.intervalMinutes,
  };
}

export function saveMiscSchedule(settings: MiscScheduleSettings): void {
  write(MISC_KEY, settings);
}

/** A window needs two different times (equal start and end is no window). */
export function isValidMiscWindow(settings: Pick<MiscScheduleSettings, "startTime" | "endTime">): boolean {
  const start = startTimeToMinutes(settings.startTime);
  const end = startTimeToMinutes(settings.endTime);
  return start >= 0 && end >= 0 && start !== end;
}

/** Whether the window runs past midnight (e.g. 22:00 → 02:00). */
export function miscWindowCrossesMidnight(settings: Pick<MiscScheduleSettings, "startTime" | "endTime">): boolean {
  return isValidMiscWindow(settings) && startTimeToMinutes(settings.endTime) < startTimeToMinutes(settings.startTime);
}

/** A section's reciter: a specific reciter's id, or "random" — a random reciter for each dhikr. */
export type SectionReciterChoice = "random" | string;

/**
 * The reciter choice for a section's Quranic adhkar (Ayat al-Kursi, the
 * Quls). Before it was chosen here, both sections followed the app-wide
 * Quran reciter setting — so that is the default: its rotation → random,
 * else its reciter.
 */
export function loadSectionReciterChoice(section: DailySection): SectionReciterChoice {
  const stored = read(RECITERS_KEY)[section];
  if (stored === "random") return "random";
  if (typeof stored === "string" && getAvailableQuranReciters().some((r) => r.id === stored)) return stored;
  if (loadQuranReciterMode() === "rotation") return "random";
  const id = loadSelectedQuranReciterId();
  return getAvailableQuranReciters().some((r) => r.id === id) ? id : getDefaultQuranReciter().id;
}

export function saveSectionReciterChoice(section: DailySection, choice: SectionReciterChoice): void {
  write(RECITERS_KEY, { ...read(RECITERS_KEY), [section]: choice });
}

let random: () => number = Math.random;

/** Test seam: a deterministic source in place of Math.random. */
export function setSectionReciterRandomForTesting(source: (() => number) | null): void {
  random = source ?? Math.random;
}

/** A random reciter from `pool`, never `lastId` while there's another. */
function drawReciter(pool: QuranReciter[], lastId: string | null): QuranReciter {
  const choices = pool.length > 1 ? pool.filter((r) => r.id !== lastId) : pool;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

interface RandomState {
  last: string | null;
  next: string | null;
}

function loadRandomState(section: DailySection): RandomState {
  const obj = read(RANDOM_RECITER_KEY)[section] as Partial<RandomState> | undefined;
  const known = (id: unknown) => (typeof id === "string" && getAvailableQuranReciters().some((r) => r.id === id) ? id : null);
  return { last: known(obj?.last), next: known(obj?.next) };
}

function saveRandomState(section: DailySection, state: RandomState): void {
  write(RANDOM_RECITER_KEY, { ...read(RANDOM_RECITER_KEY), [section]: state });
}

/**
 * The reciter the section's next Quranic dhikr will use — without using it
 * up. In random mode that is drawn in advance (and saved), so what a card
 * shows is what plays.
 */
export function peekSectionReciter(section: DailySection): QuranReciter {
  const choice = loadSectionReciterChoice(section);
  if (choice !== "random") return getQuranReciterById(choice) ?? getDefaultQuranReciter();
  const pool = getAvailableQuranReciters();
  const state = loadRandomState(section);
  const drawn = pool.find((r) => r.id === state.next && (pool.length < 2 || r.id !== state.last));
  if (drawn) return drawn;
  const next = drawReciter(pool, state.last);
  saveRandomState(section, { ...state, next: next.id });
  return next;
}

/** The reciter for a Quranic dhikr starting now; in random mode it is used up and the next one is drawn. */
export function takeSectionReciter(section: DailySection): QuranReciter {
  const reciter = peekSectionReciter(section);
  if (loadSectionReciterChoice(section) === "random") {
    saveRandomState(section, { last: reciter.id, next: drawReciter(getAvailableQuranReciters(), reciter.id).id });
  }
  return reciter;
}

/** Adhkar the user left out of a section's automatic playback (by id; new adhkar are in by default). */
export type ScheduleSection = DailySection | "misc";

export function loadExcludedAdhkar(section: ScheduleSection): string[] {
  const ids = read(SELECTION_KEY)[section];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

export function saveExcludedAdhkar(section: ScheduleSection, ids: readonly string[]): void {
  write(SELECTION_KEY, { ...read(SELECTION_KEY), [section]: [...new Set(ids)] });
}

// ---- the Audio Adhkar master switch ---------------------------------------
// One switch over every scheduled section (the home screen's toggle beside
// "الصلاة القادمة" and Settings → إعدادات الأذكار الصوتية): off, nothing is
// scheduled or plays automatically, while each section keeps its own saved
// choices (switch, times, reciter, selection) for when it is turned back on.
// On by default, so schedules set up before it existed keep running.

const masterListeners = new Set<(enabled: boolean) => void>();

export function loadAudioAdhkarMasterEnabled(): boolean {
  return read(MASTER_KEY).enabled !== false;
}

export function saveAudioAdhkarMasterEnabled(enabled: boolean): void {
  write(MASTER_KEY, { enabled });
  for (const listener of [...masterListeners]) listener(enabled);
}

/** Told on every change — keeps the home toggle and the Settings switch in step. */
export function subscribeAudioAdhkarMaster(listener: (enabled: boolean) => void): () => void {
  masterListeners.add(listener);
  return () => masterListeners.delete(listener);
}

// ---- each section's status -------------------------------------------------
// ONE definition of a section's state, used by the settings list, the
// section page and the native sync alike — so they can never disagree (a
// section switched on without a start time used to read "on" on its page
// but "off" in the list, and went to native disabled with no explanation).

/** Why a section that is switched on can't be scheduled yet. */
export type SectionIssue = "noStartTime" | "invalidWindow";

export interface SectionStatus {
  /** The section's own switch — independent of the master switch. */
  enabled: boolean;
  /** Switched on and complete (a start time; for Misc a valid window): it is scheduled whenever the master switch is on. */
  ready: boolean;
  /** Switched on but not complete. */
  issue: SectionIssue | null;
}

export function loadSectionStatus(section: ScheduleSection): SectionStatus {
  if (section === "misc") {
    const misc = loadMiscSchedule();
    const issue = misc.enabled && !isValidMiscWindow(misc) ? "invalidWindow" : null;
    return { enabled: misc.enabled, ready: misc.enabled && issue === null, issue };
  }
  const daily = loadDailySchedule(section);
  const issue = daily.enabled && startTimeToMinutes(daily.startTime) < 0 ? "noStartTime" : null;
  return { enabled: daily.enabled, ready: daily.enabled && issue === null, issue };
}
