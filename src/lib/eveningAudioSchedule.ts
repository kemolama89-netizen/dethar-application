// Scheduled Evening Audio Adhkar — the JS half.
//
// Builds the Evening playlist from the existing audio mapping (only dhikr
// with their own audio — a recording, or for a Quranic dhikr its bundled
// per-ayah recitation — in Evening order, each with its written
// repetition count) and hands it, with the user's settings, to the native
// Android scheduler (AudioAdhkarPlugin). Native then owns timing and
// background playback; its playback state comes back through
// applyNativePlaybackState into the one playback state.
//
// Web/iOS: there is no background scheduler, so nothing is scheduled.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { getMorningEveningAudioSource, getSpokenText } from "./morningEveningAudio";
import { bundledQuranAudio } from "./quranAudio";
import type { BundledQuranAudio } from "./quranAudio";
import { loadQuranReciterMode } from "./quranAudioPreferences";
import { getQuranRotationReciters, peekQuranReciterForPlayback } from "./quranReciterSelection";
import { applyNativePlaybackState, audioRepetitionTotal, getAudioAdhkarSource } from "./audioAdhkarPlayer";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativePlaylistItem, NativeRecitation } from "./audioAdhkarNative";
import { loadEveningAudioSettings, startTimeToMinutes } from "./eveningAudioSettings";
import type { EveningAudioSettings } from "./eveningAudioSettings";

/** Where Capacitor packages the built web app (dist/ → assets/public/) inside the APK. */
const APK_WEB_ASSETS_DIR = "public/";

const inApk = (paths: readonly string[]) => paths.map((p) => `${APK_WEB_ASSETS_DIR}${p}`);

function recitation(audio: BundledQuranAudio): NativeRecitation {
  return {
    assetPaths: inApk(audio.paths),
    repeatAssetPaths: inApk(audio.repeat?.paths ?? audio.paths),
    repeatStartMillis: Math.round((audio.repeat?.startAt ?? 0) * 1000),
  };
}

/**
 * What `item` plays, as APK asset paths: its generated recording, or —
 * Quranic — the bundled recitation (the reciter's own basmala + ayahs) of
 * the reciter it would use, plus every rotation reciter's in rotation
 * mode. Null when it has no bundled audio.
 */
function playlistAudio(item: WrittenAdhkarItem): (NativeRecitation & { rotation: NativeRecitation[] }) | null {
  const source = getMorningEveningAudioSource("evening", item);
  if (!source) return null;
  if (source.kind === "generated") {
    const paths = inApk([source.path]);
    return { assetPaths: paths, repeatAssetPaths: paths, repeatStartMillis: 0, rotation: [] };
  }
  const audio = bundledQuranAudio(source.ref, peekQuranReciterForPlayback());
  if (!audio) return null;
  if (loadQuranReciterMode() !== "rotation") return { ...recitation(audio), rotation: [] };
  const rotation = getQuranRotationReciters().map((r) => bundledQuranAudio(source.ref, r));
  if (rotation.some((a) => a === null)) return null;
  return { ...recitation(audio), rotation: rotation.map((a) => recitation(a!)) };
}

/**
 * The scheduled Evening playlist: every Evening dhikr that has its own
 * audio, in order — all of it bundled with the app, never a network URL.
 * A dhikr without a fixed count joins only once the user has chosen its
 * count — its repetitions are never assumed.
 */
export function buildEveningAudioPlaylist(): NativePlaylistItem[] {
  return writtenAdhkarItems.evening.flatMap((item) => {
    if (!getAudioAdhkarSource("evening", item)) return [];
    const files = playlistAudio(item);
    if (!files) return [];
    const repetitions = audioRepetitionTotal(item);
    if (repetitions === null) return [];
    return [
      {
        dhikrId: item.id,
        title: item.title_ar ?? getSpokenText(item.text_ar),
        text: getSpokenText(item.text_ar),
        ...files,
        repetitions,
      },
    ];
  });
}

export type EveningScheduleResult =
  | { available: false }
  | { available: true; scheduledAt: number | null; exact: boolean };

/**
 * Pushes the settings + playlist to native, which arms (replacing any
 * previous) or cancels the single daily alarm. Idempotent.
 */
export async function syncEveningAudioSchedule(settings: EveningAudioSettings = loadEveningAudioSettings()): Promise<EveningScheduleResult> {
  if (!isAudioAdhkarNativeAvailable()) return { available: false };
  const startMinutes = startTimeToMinutes(settings.eveningAudioStartTime);
  const enabled = settings.eveningAudioEnabled && startMinutes >= 0;
  const result = await AudioAdhkarNative.setEveningSchedule({
    enabled,
    startMinutes,
    playlist: enabled ? buildEveningAudioPlaylist() : [],
  });
  return { available: true, scheduledAt: result.scheduledAt, exact: result.exact };
}

async function refreshNativePlaybackState() {
  const { state } = await AudioAdhkarNative.getPlaybackState();
  applyNativePlaybackState(state);
}

/**
 * Once per app launch: re-arms the schedule from saved settings and keeps
 * the playback state in step with the native player (live events, plus a
 * catch-up read whenever the app returns to the foreground). No-op off
 * Android.
 */
export function startEveningAudioNativeSync(): () => void {
  if (!isAudioAdhkarNativeAvailable()) return () => {};
  const handles: Promise<PluginListenerHandle>[] = [
    AudioAdhkarNative.addListener("playbackState", ({ state }) => applyNativePlaybackState(state)),
    App.addListener("resume", () => void refreshNativePlaybackState().catch(() => {})),
  ];
  void syncEveningAudioSchedule().catch(() => {});
  void refreshNativePlaybackState().catch(() => {});
  return () => {
    for (const handle of handles) void handle.then((h) => h.remove());
  };
}
