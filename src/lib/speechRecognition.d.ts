// Ambient types for the Web Speech API's `SpeechRecognition` constructor
// itself. TypeScript's own lib.dom.d.ts (see node_modules/typescript/lib)
// already ships the supporting event/result types
// (SpeechRecognitionEvent/SpeechRecognitionErrorEvent/SpeechRecognitionResult/
// SpeechRecognitionResultList/SpeechRecognitionAlternative/
// SpeechRecognitionErrorCode) — verified present — but NOT the recognizer
// class/constructor or the `window.SpeechRecognition` /
// `window.webkitSpeechRecognition` globals, since the API itself is still a
// WHATWG/W3C draft rather than a finished standard. This file adds only
// what's missing, reusing every type lib.dom.d.ts already defines rather
// than redeclaring them.
export {};

declare global {
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    // TEMPORARY — added 2026-09-18 alongside useVoiceTasbeeh.ts's pipeline
    // diagnostic to investigate the "mic works, nothing counts" APK report.
    // Optional (mock recognizers in tests need not implement them) and
    // read-only from this hook's perspective — remove alongside that
    // diagnostic once the pipeline issue is confirmed.
    onaudiostart?: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart?: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend?: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudioend?: ((this: SpeechRecognition, ev: Event) => void) | null;
    onnomatch?: ((this: SpeechRecognition, ev: Event) => void) | null;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }

  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
