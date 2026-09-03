import { describe, expect, it } from "vitest";
import { INITIAL_MATCH_STATE, applyToken, contractWordSplits, expandFastSpeechMerges, matchNewTokens, normalizeArabicForMatch, safePrefixMatchLength, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";

describe("normalizeArabicForMatch", () => {
  it("strips tashkeel/diacritics", () => {
    expect(normalizeArabicForMatch("سُبْحَانَ اللَّهِ")).toBe(normalizeArabicForMatch("سبحان الله"));
  });

  it("normalizes hamza/alef forms (أ إ آ ٱ -> ا)", () => {
    expect(normalizeArabicForMatch("أحمد")).toBe(normalizeArabicForMatch("احمد"));
    expect(normalizeArabicForMatch("إله")).toBe(normalizeArabicForMatch("اله"));
    expect(normalizeArabicForMatch("آمين")).toBe(normalizeArabicForMatch("امين"));
  });

  it("normalizes alef maksura (ى -> ي)", () => {
    expect(normalizeArabicForMatch("على")).toBe(normalizeArabicForMatch("علي"));
  });

  it("normalizes ta marbuta consistently (ة -> ه)", () => {
    expect(normalizeArabicForMatch("رحمة")).toBe(normalizeArabicForMatch("رحمه"));
  });

  it("removes tatweel", () => {
    expect(normalizeArabicForMatch("سُــبْحَان")).toBe(normalizeArabicForMatch("سبحان"));
  });

  it("collapses irregular whitespace and ignores punctuation", () => {
    expect(normalizeArabicForMatch("سبحان   الله،  وبحمده")).toBe("سبحان الله وبحمده");
  });
});

describe("tokenize", () => {
  it("splits normalized text into word tokens", () => {
    expect(tokenize("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ")).toEqual(["سبحان", "الله", "وبحمده"]);
  });

  it("returns an empty array for empty/whitespace-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("expandFastSpeechMerges", () => {
  it("splits a token that exactly equals a fused concatenation of consecutive target words", () => {
    const target = ["سبحان", "الله"];
    expect(expandFastSpeechMerges(["سبحانالله"], target)).toEqual(["سبحان", "الله"]);
  });

  it("leaves an unrelated or wrong token untouched", () => {
    const target = ["سبحان", "الله"];
    expect(expandFastSpeechMerges(["مرحبا"], target)).toEqual(["مرحبا"]);
  });

  it("is a no-op for a single-word target", () => {
    expect(expandFastSpeechMerges(["احمد"], ["احمد"])).toEqual(["احمد"]);
  });
});

describe("contractWordSplits", () => {
  const LONG_TARGET = tokenize("سبحان الله وبحمده سبحان الله العظيم"); // 6 tokens
  it("contracts a split-off 'و' prefix back into the target's own token, for targets longer than 3", () => {
    expect(contractWordSplits(["سبحان", "الله", "و", "بحمده"], LONG_TARGET)).toEqual(["سبحان", "الله", "وبحمده"]);
  });

  it("is a no-op for targets of 3 tokens or fewer (protected short-dhikr path)", () => {
    const SHORT_TARGET = tokenize("سبحان الله وبحمده");
    const tokens = ["سبحان", "الله", "و", "بحمده"];
    expect(contractWordSplits(tokens, SHORT_TARGET)).toEqual(tokens);
  });
});

describe("applyToken / matchNewTokens — the utterance state machine", () => {
  const target = tokenize("سبحان الله");

  it("reaches a completed match exactly when the full target sequence is matched, never before", () => {
    let state: MatchState = INITIAL_MATCH_STATE;
    let step = applyToken(state, "سبحان", target);
    expect(step.completed).toBe(false);
    expect(step.state.progress).toBe(1);
    state = step.state;

    step = applyToken(state, "الله", target);
    expect(step.completed).toBe(true);
    expect(step.state.progress).toBe(0); // reset to a fresh attempt after consuming
  });

  it("never uses substring/includes semantics — an extra word after completion does not undo the match, and does not itself complete anything", () => {
    const { state, matchedCount } = matchNewTokens(INITIAL_MATCH_STATE, tokenize("سبحان الله وبحمده"), target);
    expect(matchedCount).toBe(1); // the completed "سبحان الله" is permanent
    expect(state.progress).toBe(0); // "وبحمده" matched nothing, abandoned
  });

  it("restarting with the target's own first word begins a fresh attempt, crediting each repetition separately", () => {
    const { matchedCount } = matchNewTokens(INITIAL_MATCH_STATE, tokenize("سبحان الله سبحان الله سبحان الله"), target);
    expect(matchedCount).toBe(3);
  });

  it("a wrong/unrelated word never completes anything", () => {
    const { matchedCount } = matchNewTokens(INITIAL_MATCH_STATE, tokenize("كلام غريب تماما"), target);
    expect(matchedCount).toBe(0);
  });

  it("a self-repeating target (its own first word recurs later in its own sequence) still matches the full sequence, not just up to the recurrence", () => {
    const selfRepeating = tokenize("سبحان الله وبحمده سبحان الله العظيم"); // target[3] === target[0]
    const { matchedCount, state } = matchNewTokens(INITIAL_MATCH_STATE, selfRepeating, selfRepeating);
    expect(matchedCount).toBe(1);
    expect(state.progress).toBe(0);
  });

  it("two full repetitions of a self-repeating target in one go both count", () => {
    const selfRepeating = tokenize("سبحان الله وبحمده سبحان الله العظيم");
    const twice = [...selfRepeating, ...selfRepeating];
    const { matchedCount } = matchNewTokens(INITIAL_MATCH_STATE, twice, selfRepeating);
    expect(matchedCount).toBe(2);
  });
});

describe("safePrefixMatchLength", () => {
  it("returns the full length when both arrays match completely", () => {
    expect(safePrefixMatchLength(["سبحان", "الله"], ["سبحان", "الله"])).toBe(2);
  });

  it("stops at the first genuine divergence", () => {
    expect(safePrefixMatchLength(["سبحان", "الله", "وبحمده"], ["سبحان", "الله", "غير"])).toBe(2);
  });

  it("is bounded by the shorter of the two arrays", () => {
    expect(safePrefixMatchLength(["سبحان"], ["سبحان", "الله"])).toBe(1);
    expect(safePrefixMatchLength(["سبحان", "الله"], ["سبحان"])).toBe(1);
  });

  it("returns 0 for a completely unrelated or empty reference", () => {
    expect(safePrefixMatchLength(["سبحان", "الله"], [])).toBe(0);
    expect(safePrefixMatchLength(["كلام"], ["سبحان"])).toBe(0);
  });
});
