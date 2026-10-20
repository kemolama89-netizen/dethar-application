// Scheduled Audio Adhkar — the JS half, for all three sections:
//  - Morning and Evening: every SELECTED dhikr of the list that has its own
//    audio (a recording, or for a Quranic dhikr its bundled per-ayah
//    recitation by the section's reciter — a specific one, or in random
//    mode every available one, native picking per dhikr), in order, each
//    with its written repetition count — one session from the start time.
//  - Misc: the selected Audio "Various" recordings, one per interval tick
//    inside the daily window, cycling in order.
// A section with nothing selected schedules nothing, and with the master
// switch off (audioAdhkarScheduleSettings.ts) no section schedules anything.
// Plus the adhan windows (adhanSuppression.ts): nothing plays from each
// adhan for 30 minutes.
//
// All of it is handed to the native Android scheduler (AudioAdhkarPlugin),
// which then owns timing and background playback; its playback state comes
// back through applyNativePlaybackState into the one playback state.
//
// Web/iOS: there is no background scheduler, so nothing is scheduled.
import { startAdhanPlaybackSync } from "./adhanPlayback";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { getMorningEveningAudioSource, getSpokenText } from "./morningEveningAudio";
import { bundledQuranAudio } from "./quranAudio";
import { getAvailableQuranReciters } from "../data/quranReciters";
import { applyNativePlaybackState, audioRepetitionTotal, getAudioAdhkarSource } from "./audioAdhkarPlayer";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativePlaylistItem, NativeRecitation, NativeScheduleResult, NativeSection } from "./audioAdhkarNative";
import {
  loadAudioAdhkarMasterEnabled,
  loadDailySchedule,
  loadExcludedAdhkar,
  loadMiscSchedule,
  loadSectionReciterChoice,
  loadSectionStatus,
  peekSectionReciter,
  saveAudioAdhkarMasterEnabled,
  startTimeToMinutes,
} from "./audioAdhkarScheduleSettings";
import type { DailySection } from "./audioAdhkarScheduleSettings";
import { buildAdhanWindows, currentPrayerLocation } from "./adhanSuppression";
import { buildDailySlots } from "./dailyAzkarWindows";
import { syncAudioVolumesToNative } from "./audioVolumeSettings";
import { subscribeLocationChanges } from "./locationSettings";
import { trackNativeSync } from "./appExit";
import { commitAudioCompletions, commitAudioListening, commitCompletedSessions } from "./audioAdhkarCounts";
import { loadLanguagePreference } from "./appearancePreferences";
import { nativeRecitation, nativeVariousItem, nativeWrittenAudio } from "./audioAdhkarNativeItems";
import { loadDailyDayTimes, subscribeWeeklySchedule, weeklyDayStarts } from "./weeklySchedule";
import { loadReminderSound } from "./adhkarReminderSounds";
import { buildOccasionPush } from "./islamicOccasions";

/**
 * What `item` plays, as APK asset paths: its generated recording, or —
 * Quranic — the bundled recitation (the reciter's own basmala + ayahs) of
 * the section's reciter; in random mode also every available reciter's,
 * in a fixed order, for native to pick one per dhikr. Null when it has no
 * bundled audio.
 */
function playlistAudio(section: DailySection, item: WrittenAdhkarItem): (NativeRecitation & { rotation: NativeRecitation[] }) | null {
  const files = nativeWrittenAudio(section, item, peekSectionReciter(section));
  if (!files) return null;
  const source = getMorningEveningAudioSource(section, item);
  if (source?.kind !== "quran" || loadSectionReciterChoice(section) !== "random") return { ...files, rotation: [] };
  const reciters = getAvailableQuranReciters();
  const rotation = reciters.map((r) => bundledQuranAudio(source.ref, r));
  if (rotation.some((a) => a === null)) return null;
  return { ...files, rotation: rotation.map((a, i) => nativeRecitation(a!, reciters[i])) };
}

/**
 * A Morning/Evening session's playlist: every dhikr of the list that has
 * its own audio, in order — all of it bundled with the app, never a
 * network URL — each its written repetition count. Only the selected ones
 * unless `all` (the settings checklist lists every one).
 */
export function buildDailyAudioPlaylist(section: DailySection, { all = false } = {}): NativePlaylistItem[] {
  const excluded = new Set(all ? [] : loadExcludedAdhkar(section));
  return writtenAdhkarItems[section].flatMap((item) => {
    if (excluded.has(item.id)) return [];
    if (!getAudioAdhkarSource(section, item)) return [];
    const files = playlistAudio(section, item);
    if (!files) return [];
    return [
      {
        dhikrId: item.id,
        title: item.title_ar ?? getSpokenText(item.text_ar),
        text: getSpokenText(item.text_ar),
        ...files,
        repetitions: audioRepetitionTotal(item),
      },
    ];
  });
}

export function buildEveningAudioPlaylist(): NativePlaylistItem[] {
  return buildDailyAudioPlaylist("evening");
}

/** Misc: each selected Audio "Various" dhikr with a recording (every one if `all`), in list order, played once per tick. */
export function buildMiscAudioPlaylist({ all = false } = {}): NativePlaylistItem[] {
  const excluded = new Set(all ? [] : loadExcludedAdhkar("misc"));
  return AUDIO_VARIOUS_ITEMS.flatMap((item) => {
    const native = excluded.has(item.id) ? null : nativeVariousItem(item);
    return native ? [native] : [];
  });
}

export type AudioAdhkarScheduleResult =
  | { available: false }
  | ({ available: true; exact: boolean } & Record<NativeSection, NativeScheduleResult>);

/**
 * Pushes every section's settings + playlist and the adhan windows to
 * native, which arms (replacing any previous) or cancels each section's
 * alarms. Idempotent — safe on every launch, resume and settings change.
 */
export function syncAudioAdhkarSchedules(now: Date = new Date()): Promise<AudioAdhkarScheduleResult> {
  // Tracked so exiting the app waits for it to reach native (lib/appExit.ts).
  return trackNativeSync(syncNow(now));
}

async function syncNow(now: Date): Promise<AudioAdhkarScheduleResult> {
  if (!isAudioAdhkarNativeAvailable()) return { available: false };
  const adhanWindows = buildAdhanWindows(now);
  const location = currentPrayerLocation();
  // A section goes to native enabled when it is ready (loadSectionStatus — the same status the settings show).
  // Its sessions: one per day, inside that day's prayer-time window, only where it fits (dailyAzkarWindows.ts).
  const daily = (section: DailySection) => {
    const startMinutes = startTimeToMinutes(loadDailySchedule(section).startTime);
    const enabled = loadSectionStatus(section).ready;
    const playlist = enabled ? buildDailyAudioPlaylist(section) : [];
    // Per-day start times ("customize by day"), when the user set any.
    const dayStartMinutes = loadDailyDayTimes(section).map(startTimeToMinutes);
    const slots = buildDailySlots({ section, startMinutes, dayStartMinutes, playlist, location, adhanWindows, now });
    return { enabled, startMinutes, playlist, slots: slots.map((s) => [s.start, s.at, s.end] as const), reminderSound: loadReminderSound(section) };
  };
  const misc = loadMiscSchedule();
  const miscEnabled = loadSectionStatus("misc").ready;
  const sections = {
    morning: daily("morning"),
    evening: daily("evening"),
    misc: {
      enabled: miscEnabled,
      startMinutes: startTimeToMinutes(misc.startTime),
      endMinutes: startTimeToMinutes(misc.endTime),
      intervalMinutes: misc.intervalMinutes,
      playlist: miscEnabled ? buildMiscAudioPlaylist() : [],
      // The language of the "paused for prayer / resumed" notifications.
      language: loadLanguagePreference(),
      // Nothing recurring starts before each weekday's start time (the weekly schedule).
      dayStartMinutes: weeklyDayStarts(),
      // Fridays and Islamic occasions play their own dhikr; the normal rotation resumes after.
      ...buildOccasionPush(now),
    },
  };
  const result = await AudioAdhkarNative.setSchedules({
    ...(loadAudioAdhkarMasterEnabled() ? sections : masterOff(sections)),
    adhanWindows,
    language: loadLanguagePreference(),
  });
  return { available: true, ...result };
}

/**
 * The master switch is off: every section — whichever exist — goes to
 * native disabled with nothing to play, so native cancels all its alarms
 * (playback, warning, prayer-pause notice, resume) and re-arms none after
 * a reboot. Only what is sent changes; each section's saved settings stay.
 */
type ScheduledSection = { enabled: boolean; playlist: NativePlaylistItem[] };

function masterOff<T extends Record<string, ScheduledSection>>(sections: T): T {
  const off: Record<string, ScheduledSection> = {};
  for (const [key, section] of Object.entries(sections)) off[key] = { ...section, enabled: false, playlist: [] };
  return off as T;
}

/**
 * The Audio Adhkar master switch (home toggle, Settings): saves it, re-syncs
 * every schedule, and — turning off — stops a scheduled session that is
 * playing (never a «استماع» one the user started, never the adhan) and
 * clears its pending notices. Turning on restores every section from its
 * saved settings; a sync always replaces, so nothing is armed twice.
 */
export async function setAudioAdhkarMasterEnabled(enabled: boolean, now: Date = new Date()): Promise<AudioAdhkarScheduleResult> {
  saveAudioAdhkarMasterEnabled(enabled);
  const result = await syncAudioAdhkarSchedules(now);
  if (!enabled && isAudioAdhkarNativeAvailable()) await trackNativeSync(AudioAdhkarNative.stopScheduled()).catch(() => {});
  return result;
}

/**
 * Takes in every repetition the background player completed (into the
 * per-dhikr counters and Statistics, each once), then acknowledges them so
 * native forgets them. If the app dies before acknowledging, the next
 * drain re-reads them and the ids keep them from counting twice.
 */
export async function drainNativeCompletions(): Promise<number> {
  if (!isAudioAdhkarNativeAvailable()) return 0;
  const { completions } = await AudioAdhkarNative.getCompletions();
  if (completions.length === 0) return 0;
  // Listening that stopped before the end shares the queue: it adds listening time, never a repetition.
  const listened = completions.filter((c) => c.kind === "listening");
  const sessions = completions.filter((c) => c.kind === "session");
  const completed = completions.filter((c) => c.kind === undefined);
  const added = commitAudioCompletions(
    completed.map((c) => ({ id: c.id, collection: c.collection, dhikrId: c.dhikrId, at: c.at, timeZone: c.timeZone, sessionId: c.sessionId, durationMs: c.durationMs, title: c.title })),
  );
  commitAudioListening(
    listened.map((c) => ({ id: c.id, collection: c.collection, dhikrId: c.dhikrId, at: c.at, timeZone: c.timeZone, listenedMs: c.listenedMs ?? 0, sessionId: c.sessionId, title: c.title })),
  );
  // Whole Morning/Evening sessions heard to their end: completed sessions, never repetitions.
  commitCompletedSessions(
    sessions.flatMap((c) => (c.collection === "morning" || c.collection === "evening" ? [{ id: c.id, collection: c.collection, at: c.at, timeZone: c.timeZone }] : [])),
  );
  await AudioAdhkarNative.acknowledgeCompletions({ ids: completions.map((c) => c.id) });
  return added;
}

async function refreshNativePlaybackState() {
  const { state } = await AudioAdhkarNative.getPlaybackState();
  applyNativePlaybackState(state);
}

/**
 * Once per app launch: re-arms every schedule from saved settings with
 * fresh adhan windows, keeps them fresh (on every return to the app, and
 * when the location changes — new prayer times), keeps the playback state
 * in step with the native player, and takes in the repetitions it
 * completed (at launch, on return, and live as they happen). No-op off Android.
 */
export function startAudioAdhkarNativeSync(): () => void {
  if (!isAudioAdhkarNativeAvailable()) return () => {};
  const resync = () => void syncAudioAdhkarSchedules().catch(() => {});
  const drain = () => void drainNativeCompletions().catch(() => {});
  // The adhan, shown by the Home screen player (lib/adhanPlayback.ts).
  const adhan = startAdhanPlaybackSync();
  const handles: Promise<PluginListenerHandle>[] = [
    AudioAdhkarNative.addListener("playbackState", ({ state }) => applyNativePlaybackState(state)),
    AudioAdhkarNative.addListener("completions", drain),
    App.addListener("resume", () => {
      resync();
      drain();
      void refreshNativePlaybackState().catch(() => {});
      adhan.refresh();
    }),
  ];
  const unsubscribeLocation = subscribeLocationChanges(resync);
  const unsubscribeWeekly = subscribeWeeklySchedule(resync);
  // The app's volume levels (Settings → إعدادات الصوت), once per launch — every change is pushed as it is made.
  void syncAudioVolumesToNative();
  resync();
  drain();
  void refreshNativePlaybackState().catch(() => {});
  return () => {
    adhan.stop();
    unsubscribeLocation();
    unsubscribeWeekly();
    for (const handle of handles) void handle.then((h) => h.remove());
  };
}
