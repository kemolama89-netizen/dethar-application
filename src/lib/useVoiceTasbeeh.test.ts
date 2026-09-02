import { describe, expect, it } from "vitest";
import { isSpuriousAndroidDuplicateFinal } from "./useVoiceTasbeeh";

// Pure unit tests for the Android-only duplicate-final detector — see its
// own doc comment in useVoiceTasbeeh.ts for the root cause this addresses:
// Android Chrome emulates `continuous` recognition by silently restarting
// its native recognizer between segments (Chromium issue 40324711), which
// can re-fire the SAME just-recognized utterance as a brand-new `isFinal`
// result under a fresh index — the actual mechanism behind a single spoken
// "سبحان الله" sometimes being counted 2, 3, or more times. No DOM/browser
// needed here: this predicate is plain boolean logic over already-read
// values, exercised directly.
describe("isSpuriousAndroidDuplicateFinal", () => {
  it("flags a final result with confidence exactly 0 on Android", () => {
    expect(isSpuriousAndroidDuplicateFinal(true, { isFinal: true, confidence: 0 })).toBe(true);
  });

  it("does NOT flag a final result with nonzero confidence on Android", () => {
    expect(isSpuriousAndroidDuplicateFinal(true, { isFinal: true, confidence: 0.87 })).toBe(false);
  });

  it("does NOT flag an interim (non-final) result with confidence 0 on Android — that's routine, not a duplicate signal", () => {
    expect(isSpuriousAndroidDuplicateFinal(true, { isFinal: false, confidence: 0 })).toBe(false);
  });

  it("NEVER flags anything off Android, even a final result with confidence 0 — desktop confidence is unreliable and must not be treated as a duplicate signal", () => {
    expect(isSpuriousAndroidDuplicateFinal(false, { isFinal: true, confidence: 0 })).toBe(false);
  });

  it("does NOT flag a final result with undefined confidence (some implementations never report it) on Android", () => {
    expect(isSpuriousAndroidDuplicateFinal(true, { isFinal: true, confidence: undefined })).toBe(false);
  });
});
