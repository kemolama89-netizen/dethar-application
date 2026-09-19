import { VoiceRecognitionNative } from "./voiceRecognitionNative";
import type { PluginListenerHandle } from "@capacitor/core";

let nextSessionCounter = 1;

// Same minimal shape useVoiceTasbeeh.live.test.ts's own FakeResult already
// uses for its mock — a single-alternative result entry with an `isFinal`
// flag attached, indexable like the real SpeechRecognitionResultList the
// browser's onresult handler already knows how to read
// (`result[0]?.transcript`, `result.isFinal`).
interface FakeResult extends Array<{ transcript: string }> {
  isFinal: boolean;
}

function makeFakeResult(text: string, isFinal: boolean): FakeResult {
  const arr = [{ transcript: text }] as FakeResult;
  arr.isFinal = isFinal;
  return arr;
}

// Implements the SAME ambient `SpeechRecognition` interface
// (speechRecognition.d.ts) the browser's real webkitSpeechRecognition
// satisfies, backed by the native Android VoiceRecognition Capacitor
// plugin (voiceRecognitionNative.ts) instead. This is the ONLY seam
// useVoiceTasbeeh.ts needs — getSpeechRecognitionConstructor() there
// returns a constructor for THIS class instead of the browser's, only
// when running on native Android (see isNativeVoiceRecognitionAvailable).
// Every existing line of useVoiceTasbeeh.ts's lifecycle/watchdog/target-
// switch logic reads/writes only the properties this class also
// implements — none of it needs to know or care which implementation is
// behind `recognition` — so it is otherwise completely unchanged.
//
// One adapter instance == one native "session" (one Android
// SpeechRecognizer.startListening() pass), exactly mirroring how the
// browser's real API also gets a brand-new object per restart (see
// useVoiceTasbeeh.ts's own startInstance, which always does
// `new RecognitionCtor()` rather than reusing a stopped instance).
// `sessionId` is this instance's own single-use identity, minted at
// start() and echoed back on every native event; a native event whose
// `sessionId` doesn't match this instance's own is silently ignored — the
// same staleness-guard PATTERN useVoiceTasbeeh.ts's own
// `recognitionRef.current !== recognition` check already applies one
// level up, re-applied here so a callback from an already-superseded
// native session can never reach the wrong JS object either.
export class NativeAndroidSpeechRecognition extends EventTarget implements SpeechRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null = null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null = null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => void) | null = null;

  private sessionId: string | null = null;
  private handles: PluginListenerHandle[] = [];
  private started = false;

  start(): void {
    if (this.started) return; // defensive only — useVoiceTasbeeh.ts never calls start() twice on the same instance
    this.started = true;
    const sessionId = `native-${Date.now()}-${nextSessionCounter++}`;
    this.sessionId = sessionId;
    const isCurrent = () => this.sessionId === sessionId;

    void VoiceRecognitionNative.addListener("sessionStart", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      this.onstart?.call(this, new Event("start"));
      // Android has no separate "audio hardware engaged" callback distinct
      // from "ready for speech" — onReadyForSpeech (native sessionStart)
      // is the closest equivalent, so it also drives onaudiostart here.
      this.onaudiostart?.call(this, new Event("audiostart"));
    }).then((handle) => this.handles.push(handle));

    void VoiceRecognitionNative.addListener("speechStart", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      this.onspeechstart?.call(this, new Event("speechstart"));
    }).then((handle) => this.handles.push(handle));

    void VoiceRecognitionNative.addListener("speechEnd", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      this.onspeechend?.call(this, new Event("speechend"));
      // Same reasoning as onaudiostart above — Android has no distinct
      // audio-hardware-stopped callback separate from end-of-speech.
      this.onaudioend?.call(this, new Event("audioend"));
    }).then((handle) => this.handles.push(handle));

    void VoiceRecognitionNative.addListener("result", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      const results = [makeFakeResult(data.text, data.isFinal)];
      const event = { resultIndex: 0, results } as unknown as SpeechRecognitionEvent;
      this.onresult?.call(this, event);
    }).then((handle) => this.handles.push(handle));

    void VoiceRecognitionNative.addListener("error", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      // `message` is the spec's own SpeechRecognitionErrorEvent field
      // (see lib.dom.d.ts) — reused here, not invented, to round-trip
      // VoiceRecognitionPlugin.kt's raw Android error code/name through to
      // useVoiceTasbeeh.ts (surfaced in its dev-only debug log).
      const event = { error: data.code, message: data.message ?? "" } as unknown as SpeechRecognitionErrorEvent;
      this.onerror?.call(this, event);
    }).then((handle) => this.handles.push(handle));

    void VoiceRecognitionNative.addListener("sessionEnd", (data) => {
      if (data.sessionId !== sessionId || !isCurrent()) return;
      this.started = false;
      this.teardownListeners();
      this.onend?.call(this, new Event("end"));
    }).then((handle) => this.handles.push(handle));

    VoiceRecognitionNative.startSession({ sessionId, language: this.lang || "ar-SA" }).catch(() => {
      // A rejected native call — e.g. the OS-level microphone permission
      // dialog was declined, or the device has no bound
      // RecognitionService at all (see VoiceRecognitionPlugin.kt's own
      // two distinct rejection reasons). Either way this must still
      // surface through the SAME onerror -> onend path every other
      // failure mode already uses, never a silently swallowed rejection.
      // "service-not-allowed" is the Web Speech API's own designated code
      // for "the recognition service itself refused" — reused here
      // rather than invented, so useVoiceTasbeeh.ts's existing
      // not-allowed/service-not-allowed -> "denied" status mapping
      // applies unchanged.
      if (!isCurrent()) return;
      this.started = false;
      this.teardownListeners();
      this.onerror?.call(this, {
        error: "service-not-allowed",
        message: "startSession() promise rejected before reaching the native plugin's onError",
      } as unknown as SpeechRecognitionErrorEvent);
      this.onend?.call(this, new Event("end"));
    });
  }

  stop(): void {
    if (!this.started) return;
    // Graceful stop — Android finishes processing already-captured audio
    // and still delivers a final result/error (and thus sessionEnd) for
    // it asynchronously, exactly the same "let it finish before tearing
    // down" contract useVoiceTasbeeh.ts's target-switch logic already
    // relies on stop() (vs abort()) providing in the browser. No
    // synthesized onend here — the real one arrives via the sessionEnd
    // listener above once Android's own session genuinely concludes.
    void VoiceRecognitionNative.stopSession();
  }

  abort(): void {
    if (!this.started) {
      this.teardownListeners();
      return;
    }
    this.started = false;
    this.sessionId = null; // invalidate first, so a late genuine native event can't act on a session nothing cares about anymore
    this.teardownListeners();
    void VoiceRecognitionNative.abortSession();
    // The Web Speech API spec guarantees abort() is eventually followed
    // by `end` — useVoiceTasbeeh.ts's recognizer-health-stall watchdog
    // (RECOGNIZER_STALL_THRESHOLD_MS) depends on exactly this contract to
    // trigger its own restart-after-onend path. Android's
    // SpeechRecognizer.cancel() gives no equivalent guarantee (no further
    // RecognitionListener callback is promised once cancel() completes),
    // so this class synthesizes `end` itself, synchronously — matching
    // this project's own FakeSpeechRecognition test mock's
    // abort() -> finish() (synchronous onend) behavior exactly.
    this.onend?.call(this, new Event("end"));
  }

  private teardownListeners(): void {
    for (const handle of this.handles) void handle.remove();
    this.handles = [];
  }
}
