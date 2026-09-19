import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Mirrors android/.../voicerecognition/VoiceRecognitionPlugin.kt's event
// shapes exactly — see that file for what each native method/event
// actually does. This is the ONLY seam between the web app and the
// native Android speech-recognition layer; nothing outside
// nativeSpeechRecognitionAdapter.ts should talk to this plugin directly
// (that adapter is what useVoiceTasbeeh.ts actually consumes, via the
// same ambient `SpeechRecognition` interface the browser's
// webkitSpeechRecognition satisfies — see that file for why).
export interface VoiceRecognitionSessionEvent {
  sessionId: string;
}

export interface VoiceRecognitionResultEvent {
  sessionId: string;
  text: string;
  isFinal: boolean;
}

export interface VoiceRecognitionErrorEvent {
  sessionId: string;
  code: string;
  // TEMPORARY DIAGNOSTIC field — added 2026-09-19 alongside
  // VoiceRecognitionPlugin.kt's own onError diagnostic logging, to
  // investigate the "onstart=0 onerror=1610" APK report. Carries the RAW
  // Android SpeechRecognizer.ERROR_* int/name that `code` above
  // deliberately collapses away (see that file's mapErrorCode). Optional —
  // absent on the JS-side-only "service-not-allowed" rejection path in
  // nativeSpeechRecognitionAdapter.ts, which never reaches the native
  // plugin's onError at all.
  message?: string;
}

export interface VoiceRecognitionNativePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  startSession(options: { sessionId: string; language: string }): Promise<void>;
  stopSession(): Promise<void>;
  abortSession(): Promise<void>;
  addListener(
    eventName: "sessionStart",
    listenerFunc: (data: VoiceRecognitionSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "speechStart",
    listenerFunc: (data: VoiceRecognitionSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "speechEnd",
    listenerFunc: (data: VoiceRecognitionSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(eventName: "result", listenerFunc: (data: VoiceRecognitionResultEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "error", listenerFunc: (data: VoiceRecognitionErrorEvent) => void): Promise<PluginListenerHandle>;
  addListener(
    eventName: "sessionEnd",
    listenerFunc: (data: VoiceRecognitionSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const VoiceRecognitionNative = registerPlugin<VoiceRecognitionNativePlugin>("VoiceRecognition");

// Only Android has a native VoiceRecognition implementation (see the
// plugin's own doc comment for why: embedded WebView's SpeechRecognition
// accepts a session but never engages its backend). The web/browser build
// (dev server, GitHub Pages) and any future iOS build have no such
// bridge — nativeSpeechRecognitionAdapter.ts guards on this before ever
// touching VoiceRecognitionNative, so those platforms keep using the
// existing browser webkitSpeechRecognition path unchanged.
export function isNativeVoiceRecognitionAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
