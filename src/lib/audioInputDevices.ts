// Audio-input DETECTION for Voice Tasbeeh — deliberately isolated from
// src/lib/useVoiceTasbeeh.ts and src/lib/voiceTasbeehMatch.ts, which this
// file neither imports nor is imported by. Nothing here feeds into
// recognition/matching in any way; see useVoiceTasbeeh.ts's own
// "MICROPHONE GAIN / QUIET-SPEECH SENSITIVITY" comment for the underlying
// reason: the Web Speech API's `SpeechRecognition.start()` takes no
// arguments at all — no deviceId, no MediaStream — so there is NO way for
// this app (or any web page) to route a chosen input device INTO
// recognition. Whatever the OS/browser currently treats as its default
// audio input is simply what SpeechRecognition uses, always, regardless
// of anything below.
//
// What IS genuinely possible, and all this file does: use
// `navigator.mediaDevices` (a completely separate API from
// SpeechRecognition) to list the audio input devices the browser can see,
// and to confirm whether a specific one is currently reachable. This lets
// the UI show the user "yes, your headset is connected" and explain the
// real, indirect mechanism (set it as the OS/browser's default input) —
// never a fake "select and it just works" control for something the
// platform doesn't support.

/** Feature-detects whether device enumeration is available at all. */
export function isAudioInputEnumerationSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.enumerateDevices === "function"
  );
}

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
  /**
   * Best-effort guess only, from the device's OS/browser-assigned label —
   * there is no standardized "this is a headset" flag anywhere in the
   * MediaDevices API, and labels are free-text, often localized, and vary
   * by platform. A device NOT matching any of these keywords is treated
   * as "not obviously external", not necessarily "definitely built-in".
   */
  likelyExternal: boolean;
}

const EXTERNAL_LABEL_KEYWORDS = [
  "airpods",
  "bluetooth",
  "headset",
  "headphone",
  "earbud",
  "earphone",
  "wireless",
  "usb",
  "beats",
  "buds",
  "hands-free",
  "handsfree",
];

function classifyLikelyExternal(label: string): boolean {
  const lower = label.toLowerCase();
  return EXTERNAL_LABEL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Lists currently visible audio input devices. Device `label`s are only
 * populated once microphone permission has been granted at least once in
 * this origin (a browser privacy measure, not a bug here) — callers
 * should only invoke this after Voice Tasbeeh has already been enabled at
 * least once, so permission is already settled and no separate/earlier
 * prompt is triggered by this call itself (`enumerateDevices()` never
 * prompts on its own either way).
 */
export async function listAudioInputDevices(): Promise<AudioInputDeviceInfo[]> {
  if (!isAudioInputEnumerationSupported()) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d): d is MediaDeviceInfo => d.kind === "audioinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label,
        likelyExternal: classifyLikelyExternal(d.label),
      }));
  } catch {
    // Best-effort only — never let a device-listing failure affect
    // anything else on this screen.
    return [];
  }
}

/**
 * Confirms whether a specific audio input device (or, with no deviceId,
 * "whatever the current default is") is currently reachable, by briefly
 * opening and immediately closing a real MediaStream from it. This is
 * PURELY a diagnostic/confirmation probe — its result is never connected
 * to SpeechRecognition in any way (there is no API to do so). Since
 * microphone permission is already granted by the time this is ever
 * called (Voice Tasbeeh must already be active), this does not prompt the
 * user again.
 */
export async function probeAudioInputDevice(deviceId?: string): Promise<{ reachable: boolean; label: string | null }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { reachable: false, label: null };
  }
  try {
    const constraints: MediaStreamConstraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getAudioTracks()[0];
    const label = track?.label ?? null;
    for (const t of stream.getTracks()) t.stop();
    return { reachable: true, label };
  } catch {
    return { reachable: false, label: null };
  }
}
