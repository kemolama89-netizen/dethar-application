// Persisted settings for scheduled Evening Audio Adhkar
// (Settings → إعدادات الأذكار الصوتية → أذكار المساء). Same localStorage
// pattern as the app's other settings (see prayerReminderSettings.ts).
// This is the JS source of truth; eveningAudioSchedule.ts pushes it to the
// native Android scheduler, which keeps its own copy only so the alarm can
// fire while the app isn't running.
const STORAGE_KEY = "dithar:audio-adhkar:evening:v1";

export interface EveningAudioSettings {
  eveningAudioEnabled: boolean;
  /** Local "HH:mm" (24h), or "" when not chosen yet. */
  eveningAudioStartTime: string;
}

const DEFAULT_SETTINGS: EveningAudioSettings = { eveningAudioEnabled: false, eveningAudioStartTime: "" };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidStartTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** "HH:mm" → minutes after local midnight, or -1 when unset/invalid. */
export function startTimeToMinutes(value: string): number {
  const m = TIME_RE.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

export function loadEveningAudioSettings(): EveningAudioSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SETTINGS };
    const obj = parsed as Partial<EveningAudioSettings>;
    return {
      eveningAudioEnabled: obj.eveningAudioEnabled === true,
      eveningAudioStartTime:
        typeof obj.eveningAudioStartTime === "string" && isValidStartTime(obj.eveningAudioStartTime) ? obj.eveningAudioStartTime : "",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveEveningAudioSettings(settings: EveningAudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only.
  }
}
