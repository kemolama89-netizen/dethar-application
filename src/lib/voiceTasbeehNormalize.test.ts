import { describe, expect, it } from "vitest";
import { normalizeToken, tokenize, tokensAreEquivalent } from "./voiceTasbeehNormalize";

// The exact corruption shape captured from a real device: Chrome's
// SpeechRecognition result glues a U+200F RIGHT-TO-LEFT MARK directly onto
// the first word of the transcript, with no separating whitespace —
// confirmed by inspecting the raw codepoints of a real captured transcript
// (debug-logs/dfdfdf.utf8.txt): the first three codepoints were
// [0x200f, 0x633, 0x628] i.e. "‏سبحان". This constant is that exact
// shape, not an approximation.
const RLM = "‏";

describe("bidi/formatting control character stripping (real device capture)", () => {
  it("strips a leading U+200F RIGHT-TO-LEFT MARK glued onto a word", () => {
    expect(normalizeToken(`${RLM}سبحان`)).toBe(normalizeToken("سبحان"));
  });

  it("tokenizes an RLM-prefixed transcript identically to the clean transcript", () => {
    expect(tokenize(`${RLM}سبحان الله`)).toEqual(tokenize("سبحان الله"));
  });

  it("makes an RLM-corrupted first token equivalent to the clean target token", () => {
    const spoken = tokenize(`${RLM}سبحان الله`);
    const target = tokenize("سبحان الله");
    expect(tokensAreEquivalent(spoken[0], target[0])).toBe(true);
  });

  it("strips U+200E LEFT-TO-RIGHT MARK the same way", () => {
    expect(normalizeToken("‎سبحان")).toBe(normalizeToken("سبحان"));
  });

  it("strips U+061C ARABIC LETTER MARK", () => {
    expect(normalizeToken("؜سبحان")).toBe(normalizeToken("سبحان"));
  });

  it("strips embedding/override/isolate bidi controls (U+202A-U+202E, U+2066-U+2069)", () => {
    for (const ch of ["‪", "‫", "‬", "‭", "‮", "⁦", "⁧", "⁨", "⁩"]) {
      expect(normalizeToken(`${ch}الله`)).toBe(normalizeToken("الله"));
    }
  });

  it("does not touch ordinary Arabic letters/diacritics — normalization is otherwise unchanged", () => {
    expect(normalizeToken("سُبْحَانَ")).toBe(normalizeToken("سبحان"));
    expect(tokenize("سُبْحَانَ الْلَّهِ")).toEqual(tokenize("سبحان الله"));
  });
});

describe("generic trailing weak-letter (حروف العلة) elision/retention tolerance", () => {
  it("صل and صلي are equivalent, in both directions — the defective-verb apocopation case", () => {
    expect(tokensAreEquivalent("صل", "صلي")).toBe(true);
    expect(tokensAreEquivalent("صلي", "صل")).toBe(true);
  });

  it("still requires an EXACT prefix — an unrelated same-length-delta pair is not equivalent", () => {
    // "صار" is a genuinely different word from "صل", not a weak-letter
    // variant of it — the shorter is not a prefix of the longer at all.
    expect(tokensAreEquivalent("صل", "صار")).toBe(false);
  });

  it("does not tolerate a trailing letter outside the closed weak-letter set", () => {
    // Same shape as صل/صلي (2 chars -> 3 chars, exact prefix) but the added
    // letter (ن) is not a weak letter — must stay a real content difference.
    expect(tokensAreEquivalent("صل", "صلن")).toBe(false);
  });

  it("does not tolerate a length difference greater than one", () => {
    expect(tokensAreEquivalent("صل", "صليل")).toBe(false);
  });

  it("does not let a bare single letter become a word via a trailing weak letter", () => {
    expect(tokensAreEquivalent("ل", "لا")).toBe(false);
  });

  it("does not weaken the missing-word case: a word from a different position is not bridged by this rule", () => {
    // Guards against the exact adversarial shape the product rule forbids:
    // a totally different, unrelated target word must never be treated as
    // a weak-letter variant just because lengths happen to differ by one.
    expect(tokensAreEquivalent("وبارك", "وسلم")).toBe(false);
  });
});
