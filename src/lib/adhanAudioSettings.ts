// Persisted Adhan audio choices — one for the regular adhan (Dhuhr, Asr,
// Maghrib, Isha) and one for Fajr. The two are fully independent: separate
// recording, separate mode, validated separately, and every update touches
// only its own half. Own storage key, separate from every other feature
// (Quran reciter, Audio Adhkar, reminders), with the same conventions as
// quranAudioPreferences.ts: every read/write wrapped so a blocked or full
// localStorage never throws into the UI, every read validated against the
// recordings registry, and an in-memory mirror for when storage is missing.
//
// This only stores the user's choice. Playing the adhan at prayer time is
// NOT implemented here (no notification/scheduling work in this feature).
import { adhanRecordings, getAdhanRecordingById } from "../data/adhanRecordings";
import type { AdhanRecording } from "../data/adhanRecordings";

export const ADHAN_AUDIO_STORAGE_KEY = "dithar:adhan-audio:settings:v1";

export type RegularAdhanMode = "full" | "takbeer";
export type FajrAdhanMode = "full" | "takbeer" | "fajrPhrase";
export type AdhanMode = FajrAdhanMode;

export interface RegularAdhanChoice {
  recordingId: string;
  mode: RegularAdhanMode;
}

export interface FajrAdhanChoice {
  recordingId: string;
  mode: FajrAdhanMode;
}

export interface AdhanAudioSettings {
  regular: RegularAdhanChoice;
  fajr: FajrAdhanChoice;
}

export const REGULAR_ADHAN_MODES: readonly RegularAdhanMode[] = ["full", "takbeer"];
export const FAJR_ADHAN_MODES: readonly FajrAdhanMode[] = ["full", "takbeer", "fajrPhrase"];

export const DEFAULT_REGULAR_RECORDING_ID = "alafasy-kuwait";
export const DEFAULT_FAJR_RECORDING_ID = "alafasy-fajr-hijaz";

/** Recordings offered for the regular adhan: only those without «الصلاة خير من النوم». */
export function regularAdhanRecordings(): AdhanRecording[] {
  return adhanRecordings.filter((r) => r.kind === "regular");
}

/** Recordings offered for Fajr: full Fajr adhans plus the phrase-only excerpt. */
export function fajrAdhanRecordings(): AdhanRecording[] {
  return adhanRecordings.filter((r) => r.kind === "fajr" || r.kind === "fajr-excerpt");
}

/** The modes a recording can actually play — only those it has a measured segment for. */
export function supportedModes(recording: AdhanRecording, allowed: readonly AdhanMode[]): AdhanMode[] {
  return allowed.filter((mode) => recording.segments[mode] !== null);
}

function isRegularRecordingId(id: unknown): id is string {
  return typeof id === "string" && getAdhanRecordingById(id)?.kind === "regular";
}

function isFajrRecordingId(id: unknown): id is string {
  const kind = typeof id === "string" ? getAdhanRecordingById(id)?.kind : undefined;
  return kind === "fajr" || kind === "fajr-excerpt";
}

/** Coerces any stored value to a valid regular choice; unrelated to the Fajr half. */
export function normalizeRegularChoice(value: unknown): RegularAdhanChoice {
  const obj = (value && typeof value === "object" ? value : {}) as Partial<RegularAdhanChoice>;
  const recordingId = isRegularRecordingId(obj.recordingId) ? obj.recordingId : DEFAULT_REGULAR_RECORDING_ID;
  const modes = supportedModes(getAdhanRecordingById(recordingId)!, REGULAR_ADHAN_MODES) as RegularAdhanMode[];
  const mode = modes.includes(obj.mode as RegularAdhanMode) ? (obj.mode as RegularAdhanMode) : modes[0];
  return { recordingId, mode };
}

/** Coerces any stored value to a valid Fajr choice; unrelated to the regular half. */
export function normalizeFajrChoice(value: unknown): FajrAdhanChoice {
  const obj = (value && typeof value === "object" ? value : {}) as Partial<FajrAdhanChoice>;
  const recordingId = isFajrRecordingId(obj.recordingId) ? obj.recordingId : DEFAULT_FAJR_RECORDING_ID;
  const modes = supportedModes(getAdhanRecordingById(recordingId)!, FAJR_ADHAN_MODES);
  const mode = modes.includes(obj.mode as FajrAdhanMode) ? (obj.mode as FajrAdhanMode) : modes[0];
  return { recordingId, mode };
}

let memory: AdhanAudioSettings | null = null;

export function loadAdhanAudioSettings(): AdhanAudioSettings {
  let parsed: unknown = memory;
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(ADHAN_AUDIO_STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = memory;
  }
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<AdhanAudioSettings>;
  return { regular: normalizeRegularChoice(obj.regular), fajr: normalizeFajrChoice(obj.fajr) };
}

function save(settings: AdhanAudioSettings): void {
  memory = settings;
  try {
    localStorage.setItem(ADHAN_AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only — the in-memory copy already took effect.
  }
}

/** Updates ONLY the regular adhan choice; the Fajr choice is read back and kept as is. */
export function saveRegularAdhanChoice(choice: Partial<RegularAdhanChoice>): AdhanAudioSettings {
  const current = loadAdhanAudioSettings();
  const next = { ...current, regular: normalizeRegularChoice({ ...current.regular, ...choice }) };
  save(next);
  return next;
}

/** Updates ONLY the Fajr choice; the regular choice is read back and kept as is. */
export function saveFajrAdhanChoice(choice: Partial<FajrAdhanChoice>): AdhanAudioSettings {
  const current = loadAdhanAudioSettings();
  const next = { ...current, fajr: normalizeFajrChoice({ ...current.fajr, ...choice }) };
  save(next);
  return next;
}

/** Test seam: forget the in-memory mirror. */
export function resetAdhanAudioSettingsMemoryForTesting(): void {
  memory = null;
}
