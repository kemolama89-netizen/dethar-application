// Settings → إعدادات الصوت: the app's own volume for each kind of audio —
// the adhan, and each Audio Adhkar category (Morning, Evening, Various) —
// independent of each other and of the phone's media volume, which is
// never changed: each level is a gain applied by DITHAR's own players
// (the native Android player for scheduled/background playback and
// «استماع»; the in-app players on the web).
//
// Same localStorage conventions as the app's other settings, so a level
// survives restarts; on Android every change (and every launch) is also
// pushed to the native player, which keeps it in its own storage — so a
// session started by an alarm while the app is closed, or after a reboot,
// plays at the chosen level.
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import { trackNativeSync } from "./appExit";

export type VolumeCategory = "adhan" | "morning" | "evening" | "misc";
export const VOLUME_CATEGORIES: readonly VolumeCategory[] = ["adhan", "morning", "evening", "misc"];

/** Percent, 0–100. */
export type AudioVolumes = Record<VolumeCategory, number>;

export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;
export const VOLUME_STEP = 5;
export const DEFAULT_VOLUME = 100;
export const DEFAULT_VOLUMES: AudioVolumes = { adhan: DEFAULT_VOLUME, morning: DEFAULT_VOLUME, evening: DEFAULT_VOLUME, misc: DEFAULT_VOLUME };

const STORAGE_KEY = "dithar:audio-volumes:v1";

// The level in effect when localStorage is missing or a save fails (as in audioAdhkarScheduleSettings.ts).
let memory: AudioVolumes | null = null;
const listeners = new Set<(volumes: AudioVolumes) => void>();

function clamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, Math.round(value)));
}

export function loadAudioVolumes(): AudioVolumes {
  if (memory) return { ...memory };
  let stored: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") stored = parsed as Record<string, unknown>;
  } catch {
    // Unreadable or no storage: the defaults.
  }
  const volumes = { ...DEFAULT_VOLUMES };
  for (const category of VOLUME_CATEGORIES) volumes[category] = clamp(stored[category]) ?? DEFAULT_VOLUME;
  return volumes;
}

/** One category's level as a player gain, 0–1. */
export function volumeGain(category: VolumeCategory, volumes: AudioVolumes = loadAudioVolumes()): number {
  return volumes[category] / VOLUME_MAX;
}

export function saveAudioVolume(category: VolumeCategory, percent: number): AudioVolumes {
  const volumes = { ...loadAudioVolumes(), [category]: clamp(percent) ?? DEFAULT_VOLUME };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    memory = null;
  } catch {
    memory = volumes; // best-effort: kept for this session
  }
  for (const listener of [...listeners]) listener(volumes);
  void syncAudioVolumesToNative(volumes);
  return volumes;
}

export function subscribeAudioVolumes(listener: (volumes: AudioVolumes) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Android: hands the levels to the native player (stored there, applied at
 * once to whatever is playing, and to every later session). No-op elsewhere.
 */
export async function syncAudioVolumesToNative(volumes: AudioVolumes = loadAudioVolumes()): Promise<void> {
  if (!isAudioAdhkarNativeAvailable()) return;
  const gains = Object.fromEntries(VOLUME_CATEGORIES.map((c) => [c, volumeGain(c, volumes)])) as Record<VolumeCategory, number>;
  try {
    await trackNativeSync(AudioAdhkarNative.setVolumes(gains));
  } catch {
    // Best-effort: the next launch pushes the levels again.
  }
}

/** Test seam. */
export function resetAudioVolumesForTesting(): void {
  memory = null;
  listeners.clear();
}
