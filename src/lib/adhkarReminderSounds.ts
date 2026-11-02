// The calm sound of the one-minute reminder before Morning/Evening Adhkar
// (Settings → إعدادات الأذكار الصوتية → each section → صوت التنبيه):
// a natural morning sound for Morning, a real recording of a shallow river (or calm waves) for Evening,
// or none. A device that had the former "crickets" saved now gets the river
// (loadReminderSound and native's sanitize both fall back to the default). The files are license-free — see
// public/audio/reminders/README.md. Pushed to native with the schedules;
// Android plays it through a notification channel, so the phone's
// notification volume and Do Not Disturb always apply. The reminder itself
// is posted at most once per session (native shouldWarn + a fixed id).
import type { DailySection } from "./audioAdhkarScheduleSettings";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import { claimAudio, releaseAudio } from "./audioEngine";

export type ReminderSoundId = "birdsong" | "stream" | "river" | "waves";
export type ReminderSoundChoice = ReminderSoundId | "off";

/** The sounds offered per section, the default first. */
export const REMINDER_SOUNDS: Readonly<Record<DailySection, readonly ReminderSoundId[]>> = {
  morning: ["birdsong", "stream"],
  evening: ["river", "waves"],
};

const KEY = "dithar:audio-adhkar:reminder-sounds:v1";

function read(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function loadReminderSound(section: DailySection): ReminderSoundChoice {
  const value = read()[section];
  if (value === "off") return "off";
  return typeof value === "string" && (REMINDER_SOUNDS[section] as readonly string[]).includes(value) ? (value as ReminderSoundId) : REMINDER_SOUNDS[section][0];
}

export function saveReminderSound(section: DailySection, choice: ReminderSoundChoice): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [section]: choice }));
  } catch {
    // Best effort.
  }
}

/** Web preview path (public/); Android previews the very file its notification channel plays. */
export function reminderSoundUrl(id: ReminderSoundId): string {
  return `${import.meta.env.BASE_URL}audio/reminders/${id}.mp3`;
}

let webPreview: HTMLAudioElement | null = null;
const PREVIEW_OWNER = "reminder-sound";

export function stopReminderSoundPreview(): void {
  if (isAudioAdhkarNativeAvailable()) void AudioAdhkarNative.stopReminderSoundPreview().catch(() => {});
  if (webPreview) {
    webPreview.pause();
    webPreview = null;
  }
  releaseAudio(PREVIEW_OWNER);
}

/** Plays one sound once (replacing any preview). */
export function previewReminderSound(id: ReminderSoundId): void {
  stopReminderSoundPreview();
  if (isAudioAdhkarNativeAvailable()) {
    void AudioAdhkarNative.previewReminderSound({ sound: id }).catch(() => {});
    return;
  }
  if (typeof Audio === "undefined") return;
  claimAudio("preview", PREVIEW_OWNER, () => {
    webPreview?.pause();
    webPreview = null;
  });
  const audio = new Audio(reminderSoundUrl(id));
  webPreview = audio;
  audio.onended = () => {
    if (webPreview === audio) stopReminderSoundPreview();
  };
  void audio.play().catch(() => {
    if (webPreview === audio) webPreview = null;
  });
}
