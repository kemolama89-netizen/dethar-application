// Scheduled Evening Audio Adhkar — the JS half.
//
// Builds the Evening playlist from the existing audio mapping (only dhikr
// with their own recording, in Evening order, each with its written
// repetition count) and hands it, with the user's settings, to the native
// Android scheduler (AudioAdhkarPlugin). Native then owns timing and
// background playback; its playback state comes back through
// applyNativePlaybackState into the one playback state.
//
// Web/iOS: there is no background scheduler, so nothing is scheduled.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { getMorningEveningAudioSource, getSpokenText } from "./morningEveningAudio";
import { applyNativePlaybackState, audioRepetitionTotal, getAudioAdhkarSource } from "./audioAdhkarPlayer";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { NativePlaylistItem } from "./audioAdhkarNative";
import { loadEveningAudioSettings, startTimeToMinutes } from "./eveningAudioSettings";
import type { EveningAudioSettings } from "./eveningAudioSettings";

/** Where Capacitor packages the built web app (dist/ → assets/public/) inside the APK. */
const APK_WEB_ASSETS_DIR = "public/";

/** The scheduled Evening playlist: every Evening dhikr that has its own recording, in order. */
export function buildEveningAudioPlaylist(): NativePlaylistItem[] {
  return writtenAdhkarItems.evening.flatMap((item) => {
    const source = getAudioAdhkarSource("evening", item) && getMorningEveningAudioSource("evening", item);
    if (!source || source.kind !== "generated") return [];
    return [
      {
        dhikrId: item.id,
        title: item.title_ar ?? getSpokenText(item.text_ar),
        text: getSpokenText(item.text_ar),
        assetPath: `${APK_WEB_ASSETS_DIR}${source.path}`,
        repetitions: audioRepetitionTotal(item) ?? 1,
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
