// Rotating adhan voices — optional, separately for the regular adhan and
// for Fajr. When rotation is on, each scheduled adhan uses a RANDOM included
// voice that can play that section's chosen mode — never the same voice as
// the previous adhan whenever two or more are included; when it's off, the
// section's own chosen voice plays, exactly as before. Builds on adhanAudioSettings.ts (voice/mode per section) and
// never changes it.
//
// Two storage keys, same conventions as adhanAudioSettings.ts (guarded
// localStorage, validated reads, in-memory mirror):
//   - preferences: rotation on/off + the voices the user EXCLUDED (so a
//     recording added later joins the rotation by default);
//   - state: the last voice played (adhan or Settings preview — never
//     repeated next), the voice already drawn for the next one (what
//     "Next adhan" shows), and which voice the last prayer occurrence got.
//
// A Settings preview counts as a play: startAdhanPreview() plays the drawn
// voice and draws a fresh one, so every preview — and the adhan after it —
// gets a new random voice, and a page refresh only restores that state.
//
// takeNextAdhanVoice() is the single entry point for whatever plays the
// adhan at prayer time — this app has no such scheduler yet (see
// notificationService.ts), so nothing calls it today. It is idempotent per
// occurrence: asking twice for the same prayer returns the same voice and
// never draws twice, so a re-run can't produce two different adhans for
// one prayer.
import { getAdhanRecordingById } from "../data/adhanRecordings";
import type { AdhanRecording } from "../data/adhanRecordings";
import { fajrAdhanRecordings, loadAdhanAudioSettings, regularAdhanRecordings } from "./adhanAudioSettings";
import type { AdhanMode } from "./adhanAudioSettings";

export const ADHAN_ROTATION_PREFS_KEY = "dithar:adhan-audio:rotation:v1";
export const ADHAN_ROTATION_STATE_KEY = "dithar:adhan-audio:rotation-state:v1";

export type AdhanSection = "regular" | "fajr";

export interface AdhanRotationPrefs {
  enabled: boolean;
  /** Recording ids left out of the rotation. */
  excluded: string[];
}

export type AdhanRotationSettings = Record<AdhanSection, AdhanRotationPrefs>;

interface RotationCursor {
  /** The voice played last — by a scheduled adhan or a preview. */
  lastVoiceId: string | null;
  /** Drawn in advance for the next play; redrawn if it stops being eligible. */
  nextVoiceId: string | null;
  /**
   * The voice the latest scheduled adhan got, keyed by its occurrence (e.g.
   * "2026-10-10:dhuhr"). Previews never touch it, so asking again for that
   * prayer always gets the same voice.
   */
  occurrence: { key: string; voiceId: string } | null;
  /** The time of the latest adhan the Android alarm played that this state already took in (0 = none). */
  nativeAt: number;
}

type RotationState = Record<AdhanSection, RotationCursor>;

function sectionRecordings(which: AdhanSection): AdhanRecording[] {
  return which === "regular" ? regularAdhanRecordings() : fajrAdhanRecordings();
}

// --- storage --------------------------------------------------------------

const memory: { prefs: unknown; state: unknown } = { prefs: null, state: null };

function read(key: string, fallback: unknown): unknown {
  try {
    if (typeof localStorage === "undefined") throw new Error("no storage");
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort only — the in-memory copy already took effect.
  }
}

function normalizePrefs(which: AdhanSection, value: unknown): AdhanRotationPrefs {
  const obj = (value && typeof value === "object" ? value : {}) as Partial<AdhanRotationPrefs>;
  const valid = new Set(sectionRecordings(which).map((r) => r.id));
  const excluded = Array.isArray(obj.excluded) ? [...new Set(obj.excluded.filter((id): id is string => typeof id === "string" && valid.has(id)))] : [];
  return { enabled: obj.enabled === true, excluded };
}

function normalizeCursor(which: AdhanSection, value: unknown): RotationCursor {
  const obj = (value && typeof value === "object" ? value : {}) as Partial<RotationCursor>;
  const isKnown = (id: unknown): id is string => typeof id === "string" && sectionRecordings(which).some((r) => r.id === id);
  const occ = (obj.occurrence && typeof obj.occurrence === "object" ? obj.occurrence : {}) as Partial<{ key: unknown; voiceId: unknown }>;
  return {
    lastVoiceId: isKnown(obj.lastVoiceId) ? obj.lastVoiceId : null,
    nextVoiceId: isKnown(obj.nextVoiceId) ? obj.nextVoiceId : null,
    occurrence: typeof occ.key === "string" && isKnown(occ.voiceId) ? { key: occ.key, voiceId: occ.voiceId } : null,
    nativeAt: typeof obj.nativeAt === "number" && Number.isFinite(obj.nativeAt) ? obj.nativeAt : 0,
  };
}

export function loadAdhanRotationSettings(): AdhanRotationSettings {
  const obj = (read(ADHAN_ROTATION_PREFS_KEY, memory.prefs) ?? memory.prefs ?? {}) as Partial<Record<AdhanSection, unknown>>;
  return { regular: normalizePrefs("regular", obj.regular), fajr: normalizePrefs("fajr", obj.fajr) };
}

function loadState(): RotationState {
  const obj = (read(ADHAN_ROTATION_STATE_KEY, memory.state) ?? memory.state ?? {}) as Partial<Record<AdhanSection, unknown>>;
  return { regular: normalizeCursor("regular", obj.regular), fajr: normalizeCursor("fajr", obj.fajr) };
}

function savePrefs(settings: AdhanRotationSettings): void {
  memory.prefs = settings;
  write(ADHAN_ROTATION_PREFS_KEY, settings);
}

function saveState(state: RotationState): void {
  memory.state = state;
  write(ADHAN_ROTATION_STATE_KEY, state);
}

// --- preferences ----------------------------------------------------------

/** Turns rotation on/off for ONE section; the other section is kept as is. */
export function setAdhanRotationEnabled(which: AdhanSection, enabled: boolean): AdhanRotationSettings {
  const current = loadAdhanRotationSettings();
  const next = { ...current, [which]: { ...current[which], enabled } };
  savePrefs(next);
  return next;
}

/**
 * Includes or excludes one voice in ONE section's rotation. Refuses (returns
 * the settings unchanged) to exclude the last voice that can still play the
 * section's current mode, so the rotation can never end up empty.
 */
export function setAdhanVoiceIncluded(which: AdhanSection, recordingId: string, included: boolean): AdhanRotationSettings {
  const current = loadAdhanRotationSettings();
  if (!sectionRecordings(which).some((r) => r.id === recordingId)) return current;
  const excluded = new Set(current[which].excluded);
  if (included) {
    excluded.delete(recordingId);
  } else {
    const remaining = rotationVoices(which, current).filter((r) => r.id !== recordingId);
    if (remaining.length === 0) return current;
    excluded.add(recordingId);
  }
  const next = { ...current, [which]: { ...current[which], excluded: [...excluded] } };
  savePrefs(next);
  return next;
}

/** The voices a section's rotation can use for its current mode, in registry order. */
export function rotationVoices(which: AdhanSection, rotation: AdhanRotationSettings = loadAdhanRotationSettings()): AdhanRecording[] {
  const mode = loadAdhanAudioSettings()[which].mode;
  const excluded = new Set(rotation[which].excluded);
  return sectionRecordings(which).filter((r) => !excluded.has(r.id) && r.segments[mode] !== null);
}

/** Voices offered as rotation rows: every section voice that can play the current mode. */
export function rotationCandidates(which: AdhanSection): AdhanRecording[] {
  const mode = loadAdhanAudioSettings()[which].mode;
  return sectionRecordings(which).filter((r) => r.segments[mode] !== null);
}

// --- selection ------------------------------------------------------------

export interface AdhanVoiceChoice {
  recording: AdhanRecording;
  mode: AdhanMode;
}

function chosen(which: AdhanSection): AdhanVoiceChoice {
  const { recordingId, mode } = loadAdhanAudioSettings()[which];
  return { recording: getAdhanRecordingById(recordingId)!, mode };
}

let random: () => number = Math.random;

/** Test seam: a deterministic source in place of Math.random. */
export function setAdhanRotationRandomForTesting(source: (() => number) | null): void {
  random = source ?? Math.random;
}

/** A random voice from `voices`, never `lastVoiceId` when there's any other choice. */
function draw(voices: AdhanRecording[], lastVoiceId: string | null): AdhanRecording {
  const pool = voices.length > 1 ? voices.filter((r) => r.id !== lastVoiceId) : voices;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/**
 * The voice the next adhan will use: the one already drawn while it's still
 * eligible, otherwise a fresh draw (saved, so peek and take always agree).
 * null when rotation is off or nothing is eligible.
 */
function upcoming(which: AdhanSection): { voice: AdhanRecording; state: RotationState } | null {
  const rotation = loadAdhanRotationSettings();
  if (!rotation[which].enabled) return null;
  const voices = rotationVoices(which, rotation);
  if (voices.length === 0) return null;
  const state = loadState();
  const { lastVoiceId, nextVoiceId } = state[which];
  const drawn = voices.find((r) => r.id === nextVoiceId && (voices.length === 1 || r.id !== lastVoiceId));
  if (drawn) return { voice: drawn, state };
  const voice = draw(voices, lastVoiceId);
  const next = { ...state, [which]: { ...state[which], nextVoiceId: voice.id } };
  saveState(next);
  return { voice, state: next };
}

/** What the next scheduled adhan of this section will use — never consumes it. */
export function peekNextAdhanVoice(which: AdhanSection): AdhanVoiceChoice {
  const base = chosen(which);
  return { recording: upcoming(which)?.voice ?? base.recording, mode: base.mode };
}

/**
 * The voice for ONE scheduled adhan. `occurrenceKey` identifies that
 * prayer occurrence (e.g. "2026-10-10:dhuhr"); calling again with the same
 * key returns the same voice without drawing again. Rotation off (or
 * nothing eligible) → the section's chosen voice, rotation untouched.
 */
export function takeNextAdhanVoice(which: AdhanSection, occurrenceKey: string): AdhanVoiceChoice {
  const base = chosen(which);
  const rotation = loadAdhanRotationSettings();
  if (!rotation[which].enabled) return base;
  const voices = rotationVoices(which, rotation);
  const { occurrence } = loadState()[which];
  if (occurrence?.key === occurrenceKey) {
    const same = voices.find((r) => r.id === occurrence.voiceId);
    if (same) return { recording: same, mode: base.mode };
  }
  const voice = consumeUpcoming(which, voices, { key: occurrenceKey });
  return voice ? { recording: voice, mode: base.mode } : base;
}

/**
 * The voice for ONE Settings preview: with rotation on, the drawn next voice
 * — which this uses up, drawing a fresh one (never the same voice again
 * while there's another choice). Rotation off → the chosen voice, nothing
 * stored. Never changes which voice a past prayer occurrence got.
 */
export function startAdhanPreview(which: AdhanSection): AdhanVoiceChoice {
  const base = chosen(which);
  const rotation = loadAdhanRotationSettings();
  if (!rotation[which].enabled) return base;
  const voice = consumeUpcoming(which, rotationVoices(which, rotation), null);
  return voice ? { recording: voice, mode: base.mode } : base;
}

/** Plays the upcoming voice: it becomes the last one, and a new next is drawn. */
function consumeUpcoming(which: AdhanSection, voices: AdhanRecording[], occurrence: { key: string } | null): AdhanRecording | null {
  const up = upcoming(which);
  if (!up) return null;
  const voice = up.voice;
  const cursor = up.state[which];
  saveState({
    ...up.state,
    [which]: {
      lastVoiceId: voice.id,
      nextVoiceId: draw(voices, voice.id).id,
      occurrence: occurrence ? { key: occurrence.key, voiceId: voice.id } : cursor.occurrence,
      nativeAt: cursor.nativeAt,
    },
  });
  return voice;
}

/**
 * Identifies the voice currently announced as next ("<last>><next>"), so the
 * Android alarm plays it once only — see AdhanPlan in PrayerNotificationLogic.kt.
 * Peek first: it draws the next voice when none is drawn yet.
 */
export function adhanNextToken(which: AdhanSection): string {
  peekNextAdhanVoice(which);
  const { lastVoiceId, nextVoiceId } = loadState()[which];
  return `${lastVoiceId ?? ""}>${nextVoiceId ?? ""}`;
}

/**
 * Takes in an adhan the Android alarm played while the app wasn't asking
 * (the app was closed): it becomes the last voice — so the next one is
 * never the same — and a new next voice is drawn if needed. Each native
 * play is taken in once ([at] newer than the last one seen).
 */
export function recordNativeAdhanPlay(which: AdhanSection, voiceId: string, at: number): void {
  const state = loadState();
  const cursor = state[which];
  if (!(at > cursor.nativeAt) || !sectionRecordings(which).some((r) => r.id === voiceId)) return;
  const voices = rotationVoices(which);
  const nextOk = voices.some((r) => r.id === cursor.nextVoiceId) && cursor.nextVoiceId !== voiceId;
  saveState({
    ...state,
    [which]: {
      ...cursor,
      lastVoiceId: voiceId,
      nextVoiceId: nextOk || voices.length === 0 ? cursor.nextVoiceId : draw(voices, voiceId).id,
      nativeAt: at,
    },
  });
}

/** Test seam: forget the in-memory mirrors. */
export function resetAdhanRotationMemoryForTesting(): void {
  memory.prefs = null;
  memory.state = null;
}
