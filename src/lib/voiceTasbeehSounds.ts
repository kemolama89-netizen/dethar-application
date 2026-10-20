// The Tasbeeh screen's «أصوات التعرف على الذكر» / "Recognition Sounds"
// switch — Voice Tasbeeh's feedback sounds only.
//
// Those sounds (the tone as listening starts, and the ones after a
// recognized phrase, silence/no-speech, or unrecognized speech) are not
// played by DITHAR: Android's speech-recognition service plays them on its
// own every time a listening pass starts or ends. The only way an app can
// quieten them is to mute an output stream while Voice Tasbeeh is
// listening (VoiceRecognitionPlugin.kt): "off" mutes system sounds, and
// media only while no other app is playing — never notifications or the
// ringer (RecognitionSoundsPolicy.kt). "On" leaves every stream alone. Listening, recognition and counting are the
// same either way; nothing else in DITHAR reads this setting.
//
// Off by default: that is how Voice Tasbeeh already behaved (it always
// muted the tones). Same storage conventions as tasbeehSelection.ts.
const KEY = "dithar:tasbeeh:recognitionSounds:v1";

export function loadRecognitionSoundsEnabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function saveRecognitionSoundsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // Kept for this session only.
  }
}
