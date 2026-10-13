// What a dhikr plays on Android, as the native player's playlist items
// (APK asset paths — always bundled files, never a network URL). Shared by
// the scheduled sessions (audioAdhkarSchedules.ts) and the in-app «استماع»
// playback, which on Android is played by the same native foreground
// service (audioAdhkarPlayer.ts) so it keeps playing with the screen off.
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import type { AudioVariousItem } from "../data/audio-adhkar";
import type { QuranReciter } from "../data/quranReciters";
import { getMorningEveningAudioSource, getSpokenText } from "./morningEveningAudio";
import { bundledQuranAudio } from "./quranAudio";
import type { BundledQuranAudio } from "./quranAudio";
import type { DailySection } from "./audioAdhkarScheduleSettings";
import type { NativePlaylistItem, NativeRecitation } from "./audioAdhkarNative";
import { loadLanguagePreference } from "./appearancePreferences";

/** Where Capacitor packages the built web app (dist/ → assets/public/) inside the APK. */
const APK_WEB_ASSETS_DIR = "public/";

const inApk = (paths: readonly string[]) => paths.map((p) => `${APK_WEB_ASSETS_DIR}${p}`);

/** A bundled recitation as native plays it, naming `reciter` (in the app's language) so the player can show who is heard. */
export function nativeRecitation(audio: BundledQuranAudio, reciter?: QuranReciter): NativeRecitation {
  const recitation: NativeRecitation = {
    assetPaths: inApk(audio.paths),
    repeatAssetPaths: inApk(audio.repeat?.paths ?? audio.paths),
    repeatStartMillis: Math.round((audio.repeat?.startAt ?? 0) * 1000),
  };
  if (reciter) recitation.reciterName = reciter.name[loadLanguagePreference()];
  return recitation;
}

/**
 * The files `item` plays: its generated recording, or — Quranic — the
 * bundled recitation (the reciter's own basmala + ayahs) by `reciter`.
 * Null when it has no bundled audio.
 */
export function nativeWrittenAudio(section: DailySection, item: WrittenAdhkarItem, reciter: QuranReciter): NativeRecitation | null {
  const source = getMorningEveningAudioSource(section, item);
  if (!source) return null;
  if (source.kind === "generated") {
    const paths = inApk([source.path]);
    return { assetPaths: paths, repeatAssetPaths: paths, repeatStartMillis: 0 };
  }
  const audio = bundledQuranAudio(source.ref, reciter);
  return audio ? nativeRecitation(audio, reciter) : null;
}

/** One Morning/Evening dhikr as the native player plays it, by one fixed reciter. */
export function nativeWrittenItem(section: DailySection, item: WrittenAdhkarItem, reciter: QuranReciter, repetitions: number): NativePlaylistItem | null {
  const files = nativeWrittenAudio(section, item, reciter);
  if (!files) return null;
  return { dhikrId: item.id, title: item.title_ar ?? getSpokenText(item.text_ar), text: getSpokenText(item.text_ar), ...files, rotation: [], repetitions };
}

/** One Various dhikr (its recording, once), or null when it has none. */
export function nativeVariousItem(item: AudioVariousItem): NativePlaylistItem | null {
  if (!item.audio) return null;
  const paths = inApk([item.audio]);
  return { dhikrId: item.id, title: item.text_ar, text: item.text_ar, assetPaths: paths, repeatAssetPaths: paths, repeatStartMillis: 0, rotation: [], repetitions: 1 };
}
