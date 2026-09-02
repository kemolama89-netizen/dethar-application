import { describe, expect, it } from "vitest";
import { INITIAL_MATCH_STATE, applyToken, commonPrefixLength, contractWordSplits, expandFastSpeechMerges, historicalOverlapLength, normalizeArabicForMatch, replayTokens, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";
import { isSpuriousAndroidDuplicateFinal } from "./useVoiceTasbeeh";

// ---------------------------------------------------------------------
// Part 1 — normalization / tokenization, exercised directly.
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// Part 2 — the token-by-token utterance state machine, exercised directly.
// ---------------------------------------------------------------------

describe("applyToken / replayTokens", () => {
  const target = tokenize("سبحان الله");

  it("reaches VALID exactly when the complete target sequence is matched, never before", () => {
    let state: MatchState = INITIAL_MATCH_STATE;
    let step = applyToken(state, "سبحان", target);
    expect(step.state.status).toBe("pending");
    expect(step.delta).toBe(0);
    state = step.state;

    step = applyToken(state, "الله", target);
    expect(step.state.status).toBe("valid");
    expect(step.delta).toBe(1);
  });

  it("never uses substring/includes/startsWith semantics — an extra word after completion invalidates and rolls back", () => {
    const { state, netDelta } = replayTokens(INITIAL_MATCH_STATE, tokenize("سبحان الله وبحمده"), target);
    expect(state.status).toBe("invalid");
    expect(netDelta).toBe(0); // +1 for completing, -1 for the rollback -> net 0
  });

  it("restarting with the target's own first word consumes a VALID utterance and begins a fresh one, without double-crediting", () => {
    const { netDelta } = replayTokens(INITIAL_MATCH_STATE, tokenize("سبحان الله سبحان الله سبحان الله"), target);
    expect(netDelta).toBe(3);
  });
});

// ---------------------------------------------------------------------
// Part 3 — full counting simulation, mirroring useVoiceTasbeeh.ts's exact
// checkpoint + in-flight-replay + commit algorithm (calling the SAME
// exported functions the hook itself calls), so these tests exercise the
// real counting behavior without needing React/DOM/a live microphone.
// ---------------------------------------------------------------------

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

class VoiceTasbeehSimulator {
  private targetTokens: string[];
  private committedState: MatchState = INITIAL_MATCH_STATE;
  private committedTotal = 0;
  private highestCommittedIndex = -1;
  private inFlightIndex: number | null = null;
  private inFlightTokens: string[] | null = null;
  private inFlightTotal = 0;
  private pendingEndState: MatchState = INITIAL_MATCH_STATE;

  /** Net repetitions credited so far (after any rollbacks) — mirrors the visible Tasbeeh counter. */
  counter = 0;

  constructor(targetPhrase: string) {
    this.targetTokens = tokenize(targetPhrase);
  }

  /** Change the selected Dhikr mid-session, exactly like useVoiceTasbeeh's target-change effect: full reset, no counter change. */
  changeTarget(targetPhrase: string) {
    this.targetTokens = tokenize(targetPhrase);
    this.committedState = INITIAL_MATCH_STATE;
    this.committedTotal = 0;
    this.highestCommittedIndex = -1;
    this.inFlightIndex = null;
    this.inFlightTokens = null;
    this.inFlightTotal = 0;
  }

  private commitInFlight() {
    if (this.inFlightIndex === null) return;
    // Mirrors useVoiceTasbeeh.ts's own commitInFlight() fix: once a
    // segment resolves as VALID (a complete target match) and commits,
    // the checkpoint carried into the NEXT segment resets to
    // INITIAL_MATCH_STATE instead of carrying "valid, at risk of
    // rollback" forward — see that file's own doc for why leaving it
    // "valid" let ANY later segment (including unrelated wrong speech)
    // retroactively roll back an already-credited repetition.
    this.committedState = this.pendingEndState.status === "valid" ? INITIAL_MATCH_STATE : this.pendingEndState;
    this.committedTotal = this.inFlightTotal;
    this.highestCommittedIndex = Math.max(this.highestCommittedIndex, this.inFlightIndex);
    this.inFlightIndex = null;
    this.inFlightTokens = null;
  }

  /** Feeds one SpeechRecognition result (interim or final) for segment `index`. */
  emit(index: number, transcript: string, isFinal: boolean) {
    if (index <= this.highestCommittedIndex) return;
    // Mirrors useVoiceTasbeeh.ts's own onresult handler: contract any
    // word-split, THEN expand any fast-speech word-merge, BEFORE matching
    // — see contractWordSplits' and expandFastSpeechMerges' own docs for why.
    const currentTokens = expandFastSpeechMerges(contractWordSplits(tokenize(transcript), this.targetTokens), this.targetTokens);

    if (this.inFlightIndex !== index) {
      this.commitInFlight();
      this.inFlightIndex = index;
      this.inFlightTokens = null;
      this.inFlightTotal = this.committedTotal;
    }

    if (this.inFlightTokens && arraysEqual(this.inFlightTokens, currentTokens)) {
      if (isFinal) this.commitInFlight();
      return;
    }

    const { state, netDelta } = replayTokens(this.committedState, currentTokens, this.targetTokens);
    const replayTotal = this.committedTotal + netDelta;
    this.counter += replayTotal - this.inFlightTotal;

    this.inFlightTokens = currentTokens;
    this.inFlightTotal = replayTotal;
    this.pendingEndState = state;

    if (isFinal) this.commitInFlight();
  }
}

const SHORT_TARGET = "سُبْحَانَ اللَّهِ"; // real dhikr #1, with tashkeel, as it's actually stored/selected
const THREE_TARGET = "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"; // real dhikr #2, 3 tokens — the protected "excellent" baseline this task must not regress
const THREE_SPOKEN = "سبحان الله وبحمده"; // as SpeechRecognition would actually transcribe it
const MEDIUM_TARGET = "لَا إِلَهَ إِلَّا اللَّهُ"; // 4 tokens — a real, commonly-recited standalone dhikr
const MEDIUM_SPOKEN = "لا اله الا الله"; // as SpeechRecognition would actually transcribe it
const LONG_TARGET = "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ"; // real dhikr #5 (6 tokens)
// Real dhikr #6 — 13 normalized tokens, well within the "4-10+ words" range
// this task specifically asks long-dhikr tests to exercise. Carries
// tashkeel, an internal comma, and a trailing full stop, exactly as
// stored in src/data/tasbeeh-library.json.
const VERY_LONG_TARGET = "لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلُّ شَيْءِ قَدِيرِ.";
const VERY_LONG_SPOKEN = "لا اله الا الله وحده لا شريك له له الملك وله الحمد وهو علي كل شيء قدير"; // as SpeechRecognition would actually transcribe it — no tashkeel, no punctuation

describe("Voice Tasbeeh counting — required scenarios", () => {
  it("1. short dhikr, spoken exactly -> +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);
  });

  it("2. short target, longer spoken phrase -> 0 net (speculative prefix rolled back)", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده", true);
    expect(sim.counter).toBe(0);
  });

  it("3. long dhikr, complete phrase in one result -> +1", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("4. long dhikr split across interim results -> +1", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده", false);
    sim.emit(0, "سبحان الله وبحمده سبحان", false);
    sim.emit(0, "سبحان الله وبحمده سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("5. same long dhikr repeated twice -> exactly +2", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    sim.emit(1, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(2);
  });

  it("6. tashkeel in the target but none in the transcript -> +1", () => {
    // LONG_TARGET already carries full tashkeel; the spoken transcript
    // (as SpeechRecognition would actually produce) never does.
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("7. normal SpeechRecognition spacing differences -> +1", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان   الله  وبحمده   سبحان الله  العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("8. wrong/short phrase then correct long dhikr quickly -> only +1, for the correct one", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "الحمد لله", true);
    sim.emit(1, "الله اكبر", true);
    sim.emit(2, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("9. five rapid correct repetitions -> exactly +5, never more", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    for (let rep = 0; rep < 5; rep++) {
      sim.emit(rep, "سبحان", false);
      sim.emit(rep, "سبحان الله", true);
    }
    expect(sim.counter).toBe(5);
  });

  it("10. changing the selected Dhikr mid-session discards old pending progress immediately", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    // Partway through the OLD target when the user switches.
    sim.emit(0, "سبحان", false);
    sim.changeTarget(LONG_TARGET);
    // The old partial word alone must not complete (or partially credit)
    // the NEW, longer target.
    sim.emit(1, "سبحان", false);
    expect(sim.counter).toBe(0);
    // The new target's own complete phrase still counts normally right after.
    sim.emit(1, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("does not count merely because the first 1-2 words of a long target appear", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(0);
    const sim2 = new VoiceTasbeehSimulator(LONG_TARGET);
    sim2.emit(0, "سبحان الله وبحمده", true);
    expect(sim2.counter).toBe(0);
  });

  it("duplicate interim/final re-emissions of the same text never double-count", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", false); // exact duplicate interim
    sim.emit(0, "سبحان الله", true); // final, same text
    sim.emit(0, "سبحان الله", true); // redundant duplicate final
    expect(sim.counter).toBe(1);
  });

  it("unrelated speech never counts", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "كلام غير مرتبط بالذكر المحدد اطلاقا", true);
    expect(sim.counter).toBe(0);
  });
});

// Explicit coverage for the real 3-word dhikr — the PROTECTED baseline
// this whole task must not regress ("2-word and 3-word adhkar: WORKING
// EXCELLENTLY"). Exercises the same required scenarios (correct normal
// speed, fast-speech word-merge, natural pause, wrong phrase, duplicate
// event, quick back-to-back repetition) that the longer-dhikr sections
// below exercise for 4/6/13-token targets, so a regression in the
// 3-word path specifically would be caught here rather than only being
// inferred from the 2-word tests.
describe("Voice Tasbeeh counting — three-word dhikr (3 tokens, protected baseline)", () => {
  it("normal-speed, one complete final result -> +1", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, THREE_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("built up via interim results before finalizing -> +1", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, THREE_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("fast-speech word-merge (first two words fused) -> +1", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "سبحانالله وبحمده", true);
    expect(sim.counter).toBe(1);
  });

  it("split across two separately-finalized segments (natural pause) -> +1", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(1, "وبحمده", true);
    expect(sim.counter).toBe(1);
  });

  it("wrong/unrelated phrase -> 0", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "الله اكبر", true);
    expect(sim.counter).toBe(0);
  });

  it("only the first two words -> 0 (not a complete match)", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(0);
  });

  it("duplicate interim/final re-emissions of the same text never double-count", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, THREE_SPOKEN, false);
    sim.emit(0, THREE_SPOKEN, false); // exact duplicate interim
    sim.emit(0, THREE_SPOKEN, true); // final, same text
    sim.emit(0, THREE_SPOKEN, true); // redundant duplicate final
    expect(sim.counter).toBe(1);
  });

  it("quick back-to-back repetition within one recognized segment -> +2", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, `${THREE_SPOKEN} ${THREE_SPOKEN}`, true);
    expect(sim.counter).toBe(2);
  });

  it("wrong speech, then the three-word dhikr immediately after -> +1", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, "الحمد لله", true);
    sim.emit(1, THREE_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("VALID -> wrong speech -> VALID nets +2, not +1 (wrongful-rollback guarantee also holds at 3 tokens)", () => {
    const sim = new VoiceTasbeehSimulator(THREE_TARGET);
    sim.emit(0, THREE_SPOKEN, true);
    expect(sim.counter).toBe(1);
    sim.emit(1, "كلام غريب تماما لا علاقة له", true);
    expect(sim.counter).toBe(1);
    sim.emit(2, THREE_SPOKEN, true);
    expect(sim.counter).toBe(2);
  });
});

// Explicit coverage for a MEDIUM-length dhikr (4 tokens) — distinct from
// both SHORT_TARGET (2 tokens) and LONG_TARGET (6 tokens) — at normal
// speaking speed and with a natural breathing pause between clauses.
describe("Voice Tasbeeh counting — medium dhikr (4 tokens)", () => {
  it("medium dhikr at normal speed, one complete final result -> +1", () => {
    const sim = new VoiceTasbeehSimulator(MEDIUM_TARGET);
    sim.emit(0, MEDIUM_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("medium dhikr with a natural pause, split across two separately-finalized segments -> +1", () => {
    const sim = new VoiceTasbeehSimulator(MEDIUM_TARGET);
    const words = MEDIUM_SPOKEN.split(" ");
    sim.emit(0, words.slice(0, 2).join(" "), true); // "لا اله" — first clause, then a breath
    sim.emit(1, words.slice(2).join(" "), true); // "الا الله" — completes it
    expect(sim.counter).toBe(1);
  });

  it("medium dhikr, quick back-to-back repetition within one recognized segment -> +2", () => {
    const sim = new VoiceTasbeehSimulator(MEDIUM_TARGET);
    sim.emit(0, `${MEDIUM_SPOKEN} ${MEDIUM_SPOKEN}`, true);
    expect(sim.counter).toBe(2);
  });

  it("wrong speech, then the medium dhikr immediately after -> +1", () => {
    const sim = new VoiceTasbeehSimulator(MEDIUM_TARGET);
    sim.emit(0, "الحمد لله", true);
    sim.emit(1, MEDIUM_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("only the first two words of the medium dhikr -> 0", () => {
    const sim = new VoiceTasbeehSimulator(MEDIUM_TARGET);
    sim.emit(0, MEDIUM_SPOKEN.split(" ").slice(0, 2).join(" "), true);
    expect(sim.counter).toBe(0);
  });
});

// Explicit coverage for a short dhikr spoken as a quick, immediate
// repetition with NO gap at all — both words of both repetitions land in
// a single recognized segment, which is exactly how a fast/confident
// speaker's short dhikr is often transcribed.
describe("Voice Tasbeeh counting — short dhikr, quick repetition", () => {
  it("short dhikr, quick back-to-back repetition within one recognized segment -> +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله سبحان الله", true);
    expect(sim.counter).toBe(2);
  });

  it("short dhikr, three quick back-to-back repetitions within one recognized segment -> +3", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله سبحان الله سبحان الله", true);
    expect(sim.counter).toBe(3);
  });
});

// The same required scenarios, repeated against a genuinely long (13
// normalized tokens) real dhikr — the task explicitly calls for coverage
// with "4-10+ Arabic words", which LONG_TARGET's 6 tokens only just
// clears.
describe("Voice Tasbeeh counting — very long dhikr (13 tokens)", () => {
  it("exact match in one final result -> +1", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    sim.emit(0, VERY_LONG_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("split across many interim updates, never finalized until the end -> +1", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    const words = VERY_LONG_SPOKEN.split(" ");
    for (let n = 1; n < words.length; n++) {
      sim.emit(0, words.slice(0, n).join(" "), false);
    }
    sim.emit(0, VERY_LONG_SPOKEN, true);
    expect(sim.counter).toBe(1);
  });

  it("split across multiple separately-finalized segments (a natural pause) -> +1", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    const words = VERY_LONG_SPOKEN.split(" ");
    sim.emit(0, words.slice(0, 6).join(" "), true); // first clause finalizes early (breath)
    sim.emit(1, words.slice(6).join(" "), true); // continuation completes it
    expect(sim.counter).toBe(1);
  });

  it("repeated twice -> exactly +2", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    sim.emit(0, VERY_LONG_SPOKEN, true);
    sim.emit(1, VERY_LONG_SPOKEN, true);
    expect(sim.counter).toBe(2);
  });

  it("repeated rapidly (back-to-back, no gap) -> exact count, never collapsed or inflated", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    for (let rep = 0; rep < 3; rep++) {
      sim.emit(rep, VERY_LONG_SPOKEN, true);
    }
    expect(sim.counter).toBe(3);
  });

  it("only the first two words -> 0", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    sim.emit(0, VERY_LONG_SPOKEN.split(" ").slice(0, 2).join(" "), true);
    expect(sim.counter).toBe(0);
  });

  it("wrong dhikr, then immediately the correct long dhikr -> only +1, with no dependency on elapsed time", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    sim.emit(0, "سبحان الله", true); // unrelated/too-short, must not count
    sim.emit(1, VERY_LONG_SPOKEN, true); // correct one, immediately after
    expect(sim.counter).toBe(1);
  });

  it("punctuation and irregular whitespace in the SPOKEN transcript still match", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    const words = VERY_LONG_SPOKEN.split(" ");
    const withNoise = `${words.slice(0, 6).join("   ")}،  ${words.slice(6).join("  ")}.`;
    sim.emit(0, withNoise, true);
    expect(sim.counter).toBe(1);
  });

  it("interim -> refined interim -> final all for the same utterance -> exactly one count", () => {
    const sim = new VoiceTasbeehSimulator(VERY_LONG_TARGET);
    const words = VERY_LONG_SPOKEN.split(" ");
    sim.emit(0, words.slice(0, 4).join(" "), false); // interim
    sim.emit(0, words.slice(0, 9).join(" "), false); // refined interim
    sim.emit(0, VERY_LONG_SPOKEN, false); // complete, still interim
    sim.emit(0, VERY_LONG_SPOKEN, true); // final, identical text
    expect(sim.counter).toBe(1);
  });
});

// ---------------------------------------------------------------------
// Regression tests for the over-counting bug: a single spoken repetition
// (especially a short dhikr like "سبحان الله") was sometimes credited 2,
// 3, or more times. Root cause, confirmed via randomized fuzzing of the
// counting algorithm against thousands of plausible SpeechRecognition
// event streams (the synchronous replay/commit/dedup logic itself proved
// sound under every spec-compliant stream tried): Android Chrome has no
// native OS-level support for `continuous` recognition, so it emulates it
// by silently restarting its underlying native recognizer between
// segments (Chromium issue 40324711). A documented, reproducible side
// effect of that silent restart is the SAME just-recognized utterance
// occasionally reappearing as a brand-new, already-`isFinal` result under
// a FRESH index — content-for-content indistinguishable from a genuine
// second repetition. The fix (`isSpuriousAndroidDuplicateFinal` in
// useVoiceTasbeeh.ts) uses the one verified signal for this specific
// glitch: on Android only, such a spurious duplicate final reports
// confidence exactly 0, while a genuine final is always > 0.
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — over-counting regressions", () => {
  it("1. one short dhikr utterance -> exactly +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);
  });

  it("2. the same final transcript emitted multiple times for the same segment -> +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(0, "سبحان الله", true); // re-emitted, unchanged
    sim.emit(0, "سبحان الله", true); // re-emitted again, unchanged
    expect(sim.counter).toBe(1);
  });

  it("3. interim -> final refinement of the same utterance -> +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false); // interim
    sim.emit(0, "سبحان الله", false); // interim, now complete
    sim.emit(0, "سبحان الله", true); // final refinement, identical text
    expect(sim.counter).toBe(1);
  });

  it("4. five rapid short repetitions -> exactly +5, never +10 or more", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    for (let rep = 0; rep < 5; rep++) {
      sim.emit(rep, "سبحان", false);
      sim.emit(rep, "سبحان الله", false);
      sim.emit(rep, "سبحان الله", true);
    }
    expect(sim.counter).toBe(5);
  });

  it("5. repeated transcript updates within one utterance never produce a duplicate count", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);
  });

  it("6. long dhikr split across interim updates -> exactly +1", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده", false);
    sim.emit(0, "سبحان الله وبحمده سبحان", false);
    sim.emit(0, "سبحان الله وبحمده سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("7. a wrong/longer dhikr when the short dhikr is selected -> 0", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده", true);
    expect(sim.counter).toBe(0);
  });

  it("8. a wrong dhikr followed immediately by the correct dhikr -> exactly +1 for the correct one", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "الله اكبر", true); // wrong, must not count
    sim.emit(1, "سبحان الله", true); // correct, immediately after
    expect(sim.counter).toBe(1);
  });

  it("9. [root-cause reproduction] Android silently re-firing the SAME utterance as a duplicate final under a new index -> only +1, not +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    // Real utterance: "سبحان الله", spoken once, correctly recognized and
    // finalized at index 0.
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);

    // Android's `continuous`-mode emulation silently restarts its native
    // recognizer and re-fires the SAME utterance as a brand-new `isFinal`
    // result under index 1 — identical content, but confidence 0 (the
    // verified signature of this exact glitch). The real onresult handler
    // checks isSpuriousAndroidDuplicateFinal BEFORE ever calling into the
    // counting engine, so a flagged result never reaches emit() at all —
    // reproduced here the same way.
    const phantom = { isFinal: true, confidence: 0 };
    if (!isSpuriousAndroidDuplicateFinal(true, phantom)) {
      sim.emit(1, "سبحان الله", true);
    }
    expect(sim.counter).toBe(1);
  });

  it("10. [contrast] the SAME event shape on a NON-Android platform is never suppressed by the Android check — desktop relies on the ordinary counting engine instead", () => {
    // This isn't asking desktop to solve the Android glitch (it doesn't
    // have it) — it's confirming the Android-only guard never activates
    // off-Android, since confidence 0 is common there for genuine finals.
    expect(isSpuriousAndroidDuplicateFinal(false, { isFinal: true, confidence: 0 })).toBe(false);
  });

  it("11. a genuine second repetition on Android (nonzero confidence) still counts normally -> +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    const genuine = { isFinal: true, confidence: 0.92 };
    if (!isSpuriousAndroidDuplicateFinal(true, genuine)) {
      sim.emit(1, "سبحان الله", true);
    }
    expect(sim.counter).toBe(2);
  });
});

// ---------------------------------------------------------------------
// Regression tests for the wrongful-rollback bug: VALID "سبحان الله" ->
// INVALID (wrong/unrelated) speech -> VALID "سبحان الله" was netting +1
// instead of +2. Root cause: commitInFlight() carried a VALID
// (committed, already-credited) utterance's match-state forward as the
// baseline for the NEXT segment unconditionally. Since applyToken's own
// VALID-status branch treats anything other than the target's first word
// as proof the just-finished utterance "was only a prefix of something
// longer" and rolls its credit back, ANY later segment — even completely
// unrelated wrong speech that doesn't even start with the target's first
// word — was retroactively erasing the ALREADY-credited previous
// repetition, not merely failing to add a new one. Reproduced here
// directly against VoiceTasbeehSimulator (the same checkpoint/commit
// algorithm useVoiceTasbeeh.ts itself runs), with no timers involved.
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — wrongful-rollback-after-wrong-speech regressions", () => {
  it("VALID -> INVALID (wrong speech) -> VALID must net +2, not +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1); // sanity: the first repetition is credited
    sim.emit(1, "كلام غريب تماما لا علاقة له", true); // wrong speech
    expect(sim.counter).toBe(1); // must NOT roll back the already-credited repetition
    sim.emit(2, "سبحان الله", true);
    expect(sim.counter).toBe(2); // the second genuine repetition must still be credited
  });

  it("V -> I -> V -> I -> V must net +3", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(1, "كلام غير مرتبط", true);
    sim.emit(2, "سبحان الله", true);
    sim.emit(3, "شيء آخر تماما", true);
    sim.emit(4, "سبحان الله", true);
    expect(sim.counter).toBe(3);
  });

  it('"سبحان الله" -> "الحمد لله" -> "سبحان الله" must net +2', () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(1, "الحمد لله", true);
    sim.emit(2, "سبحان الله", true);
    expect(sim.counter).toBe(2);
  });

  it("wrong speech BEFORE any valid dhikr -> +1 for the one genuine repetition that follows", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "كلام غريب تماما", true);
    expect(sim.counter).toBe(0);
    sim.emit(1, "سبحان الله", true);
    expect(sim.counter).toBe(1);
  });

  it("natural rapid repetition (no wrong speech in between) still nets +2 — unaffected by this fix", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(1, "سبحان الله", true);
    expect(sim.counter).toBe(2);
  });

  it("wrong-dhikr rejection WITHIN one still-growing segment is unaffected: short target, longer single-segment utterance -> 0", () => {
    // This is the case this fix must NOT touch: "سبحان الله وبحمده"
    // arriving as ONE continuously-growing segment (never split into
    // separate finalized segments) must still correctly reject, exactly
    // as before — that risk comes from replaying THIS segment's own
    // growing token list against the FIXED baseline from before it began,
    // never from what the baseline itself carries in.
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false);
    sim.emit(0, "سبحان الله", false);
    sim.emit(0, "سبحان الله وبحمده", true);
    expect(sim.counter).toBe(0);
  });

  it("VALID -> INVALID -> VALID also holds for the long dhikr", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
    sim.emit(1, "كلام غريب تماما لا علاقة له", true);
    expect(sim.counter).toBe(1);
    sim.emit(2, "سبحان الله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(2);
  });
});

// ---------------------------------------------------------------------
// Regression tests for fast-speech word-merge tolerance. Root cause: at
// natural/fast speaking speed, the hamzat al-waṣl on "الله" elides in
// connected Arabic speech (standard tajwīd, not an ASR quirk), so
// "سبحان" and "الله" are often reported by the recognizer as ONE fused
// token ("سبحانالله") instead of two separate words — the exact-match
// token-by-token matcher could never match that fused token against
// either target word, so the utterance stayed INVALID and never counted.
// expandFastSpeechMerges (voiceTasbeehMatch.ts) splits a transcript
// token back apart ONLY when it's the EXACT concatenation of consecutive
// target words — never a substring/fuzzy match — so wrong or merely-
// similar speech stays rejected exactly as before.
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — fast-speech word-merge regressions", () => {
  it("correct short dhikr, normal-speed transcript (clean word separation) -> +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);
  });

  it("correct short dhikr, fast-speech transcript variation (words fused into one token) -> +1", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحانالله", true);
    expect(sim.counter).toBe(1);
  });

  it("wrong similar phrase (not an exact concatenation of the target's own words) -> 0", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان له", true); // resembles the target but is NOT "سبحان" + "الله"
    expect(sim.counter).toBe(0);
  });

  it("wrong phrase entirely, even one that could itself fuse under fast speech -> 0", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "الحمدلله", true); // fused "الحمد"+"لله" — no relation to the SELECTED target's words
    expect(sim.counter).toBe(0);
  });

  it("one utterance, interim (unmerged) then final (fused) -> +1, not +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان", false); // interim: recognizer hasn't decided yet
    sim.emit(0, "سبحانالله", true); // final: settles as the fused fast-speech form
    expect(sim.counter).toBe(1);
  });

  it("duplicated final of the fused fast-speech form -> +1, not +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحانالله", true);
    sim.emit(0, "سبحانالله", true); // re-emitted, unchanged
    expect(sim.counter).toBe(1);
  });

  it("two genuine repetitions, both spoken fast (fused) -> +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحانالله", true);
    sim.emit(1, "سبحانالله", true);
    expect(sim.counter).toBe(2);
  });

  it("VALID (fast/fused) -> WRONG -> VALID (fast/fused) -> +2 — the previous fix's guarantee still holds with fast speech", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحانالله", true);
    expect(sim.counter).toBe(1);
    sim.emit(1, "كلام غريب تماما لا علاقة له", true);
    expect(sim.counter).toBe(1);
    sim.emit(2, "سبحانالله", true);
    expect(sim.counter).toBe(2);
  });

  it("mixed pace: first repetition slow/clear, second repetition fast/fused -> +2", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحان الله", true);
    sim.emit(1, "سبحانالله", true);
    expect(sim.counter).toBe(2);
  });

  it("a fast-speech merge of only the first two words of the LONG dhikr still requires the rest to complete it -> +1, never early", () => {
    const sim = new VoiceTasbeehSimulator(LONG_TARGET);
    // "سبحان الله" fused, but "وبحمده سبحان الله العظيم" still needed.
    sim.emit(0, "سبحانالله", false);
    expect(sim.counter).toBe(0);
    sim.emit(0, "سبحانالله وبحمده سبحان الله العظيم", true);
    expect(sim.counter).toBe(1);
  });

  it("short target selected, but the long dhikr's fast-fused first two words alone must NOT count as the short dhikr", () => {
    const sim = new VoiceTasbeehSimulator(SHORT_TARGET);
    sim.emit(0, "سبحانالله وبحمده", true); // extends past the short target -> reject
    expect(sim.counter).toBe(0);
  });
});

// ---------------------------------------------------------------------
// Regression tests for the three EXACT real dhikr reported to consistently
// fail at normal speaking speed after manual browser testing, even though
// the pure matching engine already reached a complete match for every
// plausible interim/final/pause/fusion event stream tried against them —
// see contractWordSplits' own doc in voiceTasbeehMatch.ts for the root
// cause found: one or more "و"-prefixed words (attached in writing, never
// a separate word) reported by the recognizer as their own separate
// leading token instead of staying fused with the word they prefix — the
// mirror image of the fast-speech-merge fusion problem above, gated to
// targets longer than 3 tokens so it can never affect the protected
// 2-3 word path.
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — real-world long-dhikr regressions (word-split tolerance)", () => {
  const SALAWAT_TARGET = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد"; // real dhikr #9, 7 tokens
  const TAHLEEL_TARGET = "سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ"; // real dhikr #11, 10 tokens

  describe('"سبحان الله وبحمده سبحان الله العظيم" (real dhikr #5, LONG_TARGET)', () => {
    it("clean, fully-fused transcript -> +1", () => {
      const sim = new VoiceTasbeehSimulator(LONG_TARGET);
      sim.emit(0, "سبحان الله وبحمده سبحان الله العظيم", true);
      expect(sim.counter).toBe(1);
    });

    it("the attached 'و' of 'وبحمده' reported as its own leading token -> still +1", () => {
      const sim = new VoiceTasbeehSimulator(LONG_TARGET);
      sim.emit(0, "سبحان الله و بحمده سبحان الله العظيم", true);
      expect(sim.counter).toBe(1);
    });

    it("word-split combined with a fast-speech fusion elsewhere in the SAME utterance -> +1", () => {
      const sim = new VoiceTasbeehSimulator(LONG_TARGET);
      sim.emit(0, "سبحانالله و بحمده سبحان الله العظيم", true);
      expect(sim.counter).toBe(1);
    });

    it("wrong/unrelated phrase against this target -> 0", () => {
      const sim = new VoiceTasbeehSimulator(LONG_TARGET);
      sim.emit(0, "كلام غير مرتبط بالذكر المحدد اطلاقا", true);
      expect(sim.counter).toBe(0);
    });
  });

  describe('"اللهم صل وسلم وبارك على سيدنا محمد" (real dhikr #9)', () => {
    it("clean transcript -> +1", () => {
      const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
      sim.emit(0, "اللهم صل وسلم وبارك علي سيدنا محمد", true);
      expect(sim.counter).toBe(1);
    });

    it("BOTH attached 'و' prefixes ('وسلم' and 'وبارك') reported as separate leading tokens -> still +1", () => {
      const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
      sim.emit(0, "اللهم صل و سلم و بارك علي سيدنا محمد", true);
      expect(sim.counter).toBe(1);
    });

    it("split across a natural pause, WITH a word-split on the resumed segment -> +1", () => {
      const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
      sim.emit(0, "اللهم صل", true);
      sim.emit(1, "و سلم و بارك علي سيدنا محمد", true);
      expect(sim.counter).toBe(1);
    });

    it("wrong/unrelated phrase against this target -> 0", () => {
      const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
      sim.emit(0, "سبحان الله وبحمده", true);
      expect(sim.counter).toBe(0);
    });

    it("only the first three words -> 0 (not a complete match)", () => {
      const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
      sim.emit(0, "اللهم صل و سلم", true);
      expect(sim.counter).toBe(0);
    });
  });

  describe('"سبحان الله والحمد لله ولا إله إلا الله والله أكبر" (real dhikr #11)', () => {
    it("clean transcript -> +1", () => {
      const sim = new VoiceTasbeehSimulator(TAHLEEL_TARGET);
      sim.emit(0, "سبحان الله والحمد لله ولا اله الا الله والله اكبر", true);
      expect(sim.counter).toBe(1);
    });

    it("ALL THREE attached 'و' prefixes ('والحمد', 'ولا', 'والله') reported as separate leading tokens -> still +1", () => {
      const sim = new VoiceTasbeehSimulator(TAHLEEL_TARGET);
      sim.emit(0, "سبحان الله و الحمد لله و لا اله الا الله و الله اكبر", true);
      expect(sim.counter).toBe(1);
    });

    it("split across the target's own comma-marked clause boundaries, each clause word-split -> +1", () => {
      const sim = new VoiceTasbeehSimulator(TAHLEEL_TARGET);
      sim.emit(0, "سبحان الله", true);
      sim.emit(1, "و الحمد لله", true);
      sim.emit(2, "و لا اله الا الله", true);
      sim.emit(3, "و الله اكبر", true);
      expect(sim.counter).toBe(1);
    });

    it("wrong/unrelated phrase against this target -> 0", () => {
      const sim = new VoiceTasbeehSimulator(TAHLEEL_TARGET);
      sim.emit(0, "الحمد لله رب العالمين", true);
      expect(sim.counter).toBe(0);
    });

    it("repeated twice, each with a word-split -> exactly +2", () => {
      const sim = new VoiceTasbeehSimulator(TAHLEEL_TARGET);
      sim.emit(0, "سبحان الله و الحمد لله و لا اله الا الله و الله اكبر", true);
      sim.emit(1, "سبحان الله و الحمد لله و لا اله الا الله و الله اكبر", true);
      expect(sim.counter).toBe(2);
    });
  });

  it("contractWordSplits is a structural no-op for a 2-word target (protected short-dhikr path)", () => {
    expect(contractWordSplits(["سبحان", "و", "الله"], tokenize(SHORT_TARGET))).toEqual(["سبحان", "و", "الله"]);
  });

  it("contractWordSplits is a structural no-op for the protected 3-word target", () => {
    const three = tokenize("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ");
    expect(contractWordSplits(["سبحان", "الله", "و", "بحمده"], three)).toEqual(["سبحان", "الله", "و", "بحمده"]);
  });
});

// ---------------------------------------------------------------------
// Regression tests for the ARABIC_TOKEN_VARIANTS pronunciation/
// transcription equivalence table (applyToken/tokensEquivalent in
// voiceTasbeehMatch.ts). Root cause, confirmed from a REAL captured iPad
// Safari transcript of "اللهم صل وسلم وبارك على سيدنا محمد" (not
// assumed): Safari's on-device Arabic recognizer transcribed the
// imperative "صَلِّ" as "صلي" — a genuine extra letter, not a diacritic
// or a hamza/alef/yeh spelling variant normalizeArabicForMatch already
// handles — so strict token equality rejected an otherwise perfectly
// recognized, high-confidence (0.966) complete recitation of the target
// phrase. The apparent second mismatch, "على" vs "علي", was checked
// directly (tokenizing both target and transcript and diffing
// token-by-token) and found to already be resolved by the EXISTING
// ى -> ي normalization rule — no change was needed or made for it.
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — Arabic pronunciation/transcription equivalence (صل/صلي)", () => {
  const SALAWAT_TARGET = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد";
  // The EXACT transcript captured from a real iPad Safari session
  // reciting this dhikr, final confidence 0.966 — not a hand-typed
  // approximation.
  const REAL_CAPTURED_TRANSCRIPT = "اللهم صلي وسلم وبارك على سيدنا محمد";

  it("A) the exact real captured transcript -> reaches VALID and commits exactly +1", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, REAL_CAPTURED_TRANSCRIPT, true);
    expect(sim.counter).toBe(1);
  });

  it("A) reproduces via direct applyToken replay, matching the real onresult:replay-outcome log shape", () => {
    const targetTokens = tokenize(SALAWAT_TARGET);
    const spokenTokens = expandFastSpeechMerges(contractWordSplits(tokenize(REAL_CAPTURED_TRANSCRIPT), targetTokens), targetTokens);
    expect(spokenTokens).toEqual(["اللهم", "صلي", "وسلم", "وبارك", "علي", "سيدنا", "محمد"]);
    const { state, netDelta } = replayTokens(INITIAL_MATCH_STATE, spokenTokens, targetTokens);
    expect(state.status).toBe("valid");
    expect(state.progress).toBe(7);
    expect(netDelta).toBe(1);
  });

  it("B) the already-working long dhikr (لا إله إلا الله وحده...) is completely unaffected -> still +1", () => {
    const target = "لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلُّ شَيْءِ قَدِيرِ";
    const spoken = "لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير";
    const sim = new VoiceTasbeehSimulator(target);
    sim.emit(0, spoken, true);
    expect(sim.counter).toBe(1);
  });

  it("C) a genuinely wrong word in place of 'صل'/'صلي' must stay invalid, not be accepted by the equivalence table", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, "اللهم ضرب وسلم وبارك علي سيدنا محمد", true);
    expect(sim.counter).toBe(0);
  });

  it("C) a wrong word EARLY (before 'صل') still correctly rejects, unrelated to this table", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, "كلام غريب صل وسلم وبارك علي سيدنا محمد", true);
    expect(sim.counter).toBe(0);
  });

  it("does not weaken rejection: 'صلي' alone, without the rest of the phrase, must not complete a SHORT/THREE-word target", () => {
    const sim = new VoiceTasbeehSimulator("سُبْحَانَ اللَّهِ");
    sim.emit(0, "صلي", true);
    expect(sim.counter).toBe(0);
  });

  it("the equivalence table does not create a false match for an unrelated target that merely CONTAINS 'صل'-like text", () => {
    // Sanity: selecting a target that has NOTHING to do with the Salawat
    // phrase must not be satisfied by "صلي" appearing in speech.
    const sim = new VoiceTasbeehSimulator("الْحَمْدُ لِلَّهِ");
    sim.emit(0, "صلي", true);
    expect(sim.counter).toBe(0);
  });

  it("duplicate/spurious final re-emission of the real transcript still doesn't double-count", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, REAL_CAPTURED_TRANSCRIPT, true);
    sim.emit(0, REAL_CAPTURED_TRANSCRIPT, true); // re-emitted, unchanged
    expect(sim.counter).toBe(1);
  });

  it("repeated twice (two genuine repetitions, both using the ASR variant spelling) -> exactly +2", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, REAL_CAPTURED_TRANSCRIPT, true);
    sim.emit(1, REAL_CAPTURED_TRANSCRIPT, true);
    expect(sim.counter).toBe(2);
  });

  it("VALID -> wrong speech -> VALID (real transcript) still nets +2, not +1 — wrongful-rollback guarantee unaffected", () => {
    const sim = new VoiceTasbeehSimulator(SALAWAT_TARGET);
    sim.emit(0, REAL_CAPTURED_TRANSCRIPT, true);
    expect(sim.counter).toBe(1);
    sim.emit(1, "كلام غريب تماما لا علاقة له", true);
    expect(sim.counter).toBe(1);
    sim.emit(2, REAL_CAPTURED_TRANSCRIPT, true);
    expect(sim.counter).toBe(2);
  });

  it("the protected 2-word target's own exact-match behavior is byte-identical, unaffected by the new equivalence table", () => {
    const sim = new VoiceTasbeehSimulator("سُبْحَانَ اللَّهِ");
    sim.emit(0, "سبحان الله", true);
    expect(sim.counter).toBe(1);
    const sim2 = new VoiceTasbeehSimulator("سُبْحَانَ اللَّهِ");
    sim2.emit(0, "كلام غريب", true);
    expect(sim2.counter).toBe(0);
  });

  it("the protected 3-word target's own exact-match behavior is byte-identical, unaffected by the new equivalence table", () => {
    const sim = new VoiceTasbeehSimulator("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ");
    sim.emit(0, "سبحان الله وبحمده", true);
    expect(sim.counter).toBe(1);
  });
});

// ---------------------------------------------------------------------
// Regression tests for the ACCEPTED-REPETITION rollback fix in
// applyToken's VALID branch (voiceTasbeehMatch.ts). Root cause: once a
// repetition reached VALID (credited, onMatch fired, visible +1), ANY
// further token that wasn't the target's own first word rolled it back
// (-1) — even when that token arrived in a LATER onresult event for the
// SAME still-open segment (not yet isFinal), which is exactly what
// happens when a recognizer briefly appends a stray trailing
// fragment/artifact after a complete, correct recitation. Fix: for
// targets LONGER than 3 tokens, reaching VALID is now immediate and
// PERMANENT — a trailing token that isn't a fresh repetition's own first
// word can no longer erase that credit (delta 0, not -1). The protected
// 2-3 word path is deliberately excluded and keeps rolling back exactly
// as before, since a short target is far more likely to be a genuine
// prefix of a different, longer dhikr the user actually intends.
//
// Uses the five EXACT dhikr named in this task's test matrix:
//   A) سبحان الله (2 tokens, protected — must still roll back)
//   B) سبحان الله وبحمده سبحان الله العظيم (6 tokens)
//   C) لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير (17 tokens)
//   D) اللهم صل وسلم وبارك على سيدنا محمد (7 tokens)
//   E) سبحان الله والحمد لله ولا إله إلا الله والله أكبر (10 tokens)
// ---------------------------------------------------------------------
describe("Voice Tasbeeh counting — accepted-repetition survives a later noisy/extra token (targets > 3 tokens)", () => {
  const A_TARGET = "سُبْحَانَ اللَّهِ";
  const A_SPOKEN = "سبحان الله";
  const B_TARGET = "سبحان الله وبحمده سبحان الله العظيم";
  const B_SPOKEN = "سبحان الله وبحمده سبحان الله العظيم";
  const C_TARGET = "لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير";
  const C_SPOKEN = "لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير";
  const D_TARGET = "اللهم صل وسلم وبارك على سيدنا محمد";
  const D_SPOKEN = "اللهم صل وسلم وبارك على سيدنا محمد";
  const E_TARGET = "سبحان الله والحمد لله ولا إله إلا الله والله أكبر";
  const E_SPOKEN = "سبحان الله والحمد لله ولا إله إلا الله والله أكبر";

  it("A) protected 2-word target: complete recitation + extra trailing word in the SAME segment -> STILL rolls back to 0 (unchanged)", () => {
    const sim = new VoiceTasbeehSimulator(A_TARGET);
    sim.emit(0, A_SPOKEN, false); // interim: reaches VALID, +1 momentarily
    expect(sim.counter).toBe(1);
    sim.emit(0, `${A_SPOKEN} وبحمده`, true); // SAME segment revised with an extra word
    expect(sim.counter).toBe(0); // must still roll back — protected behavior
  });

  it.each([
    ["B", B_TARGET, B_SPOKEN],
    ["C", C_TARGET, C_SPOKEN],
    ["D", D_TARGET, D_SPOKEN],
    ["E", E_TARGET, E_SPOKEN],
  ])("%s) complete recitation + extra/noisy trailing word in the SAME segment -> credit SURVIVES (+1, not rolled back)", (_label, target, spoken) => {
    const sim = new VoiceTasbeehSimulator(target);
    sim.emit(0, spoken, false); // interim: reaches VALID, +1
    expect(sim.counter).toBe(1);
    // A later revision of the SAME still-open segment appends a stray
    // trailing fragment — exactly the reported bug scenario.
    sim.emit(0, `${spoken} امم`, false);
    expect(sim.counter).toBe(1); // credit must survive
    // The segment then finalizes with that same noisy tail.
    sim.emit(0, `${spoken} امم`, true);
    expect(sim.counter).toBe(1); // still must not be rolled back
  });

  it.each([
    ["B", B_TARGET, B_SPOKEN],
    ["C", C_TARGET, C_SPOKEN],
    ["D", D_TARGET, D_SPOKEN],
    ["E", E_TARGET, E_SPOKEN],
  ])("%s) after the protected credit survives noise, a GENUINE second repetition still counts normally -> +2 (no double-counting introduced)", (_label, target, spoken) => {
    const sim = new VoiceTasbeehSimulator(target);
    sim.emit(0, spoken, false);
    sim.emit(0, `${spoken} امم`, true); // noise, credit protected, still +1
    expect(sim.counter).toBe(1);
    sim.emit(1, spoken, true); // a genuinely new repetition, fresh index
    expect(sim.counter).toBe(2);
  });

  it.each([
    ["B", B_TARGET],
    ["C", C_TARGET],
    ["D", D_TARGET],
    ["E", E_TARGET],
  ])("%s) an incomplete recitation (never reaches the end) still correctly stays 0 — protection only applies AFTER genuine completion", (_label, target) => {
    const words = tokenize(target);
    const incomplete = words.slice(0, Math.max(1, words.length - 2)).join(" ");
    const sim = new VoiceTasbeehSimulator(target);
    sim.emit(0, incomplete, true);
    expect(sim.counter).toBe(0);
  });

  it.each([
    ["B", B_TARGET],
    ["C", C_TARGET],
    ["D", D_TARGET],
    ["E", E_TARGET],
  ])("%s) a genuinely different/unrelated phrase still correctly stays 0 — protection does not weaken wrong-dhikr rejection", (_label, target) => {
    const sim = new VoiceTasbeehSimulator(target);
    sim.emit(0, "كلام غير مرتبط بالذكر المحدد اطلاقا تماما", true);
    expect(sim.counter).toBe(0);
  });
});

// ---------------------------------------------------------------------
// Direct unit coverage for commonPrefixLength (used by useVoiceTasbeeh.ts
// to locate a still-open segment's already-committed prefix by CONTENT
// rather than a stale stored length). Two properties are exercised:
//
// 1. STABILITY: when the committed span is genuinely unchanged, the
//    function returns exactly `committedTokens.length` regardless of how
//    much internal repetition the committed content happens to contain —
//    this is what keeps a real captured device transcript (where several
//    repetition attempts can land within ONE recognition event) from
//    being misread as drift.
// 2. SELF-REPEATING-TARGET HARDENING: once a genuine mismatch has
//    already been found, the function refuses to let a coincidental
//    recurrence of the committed span's own first token run the match
//    PAST where a fresh repetition could genuinely have begun — see its
//    own doc in voiceTasbeehMatch.ts for the full argument (every
//    instance of this failure is structurally a comparison of the
//    target's own first word against itself at a later position).
// ---------------------------------------------------------------------
describe("commonPrefixLength", () => {
  it("returns the full committed length when nothing has drifted (stable case)", () => {
    const committed = ["سبحان", "الله", "والحمد", "لله"];
    const current = [...committed, "سبحان", "الله"]; // committed span unchanged, plus new content after it
    expect(commonPrefixLength(current, committed)).toBe(4);
  });

  it("stops at the first genuine mismatch when the target has no internal repetition (no guard needed)", () => {
    const committed = ["سبحان", "الله", "والحمد", "لله", "ولا", "اله", "الا", "الله", "والله", "اكبر"];
    const shrunk = [committed[0], committed[1], committed[2], committed[3], committed[4], committed[5], "الله" /* "الا" dropped */];
    const current = [...shrunk, ...committed]; // shrunk rep1 + a full genuine rep2
    // True boundary is 6 (shrunk only has 6 genuinely-still-matching tokens); no recurrence
    // of the restart marker ("سبحان") exists within that range, so the plain mismatch alone suffices.
    expect(commonPrefixLength(current, committed)).toBe(6);
  });

  it("STABILITY: a committed span that legitimately contains the target's first word MORE THAN ONCE (e.g. a failed attempt followed by the real completion, captured together in one event) is trusted in full when nothing later changes", () => {
    // Mirrors the real captured device transcript (debug-logs/dfdfdf.txt): the committed
    // snapshot itself already contains "سبحان" twice, with zero drift anywhere.
    const committed = ["سبحان", "الله", "شيء", "سبحان", "الله", "والحمد", "لله", "ولا", "اله", "الا", "الله", "والله", "اكبر"];
    const current = [...committed, "اللهم"]; // pure append, nothing before it changed at all
    expect(commonPrefixLength(current, committed)).toBe(committed.length);
  });

  it("HARDENING: once real drift is found, a coincidental recurrence of the restart marker caps the result instead of crossing into the next repetition's own tokens", () => {
    // real dhikr #5: "سبحان الله وبحمده سبحان الله العظيم" — target[3] === target[0].
    const committed = ["سبحان", "الله", "وبحمده", "سبحان", "الله", "العظيم"];
    const shrunkRep1 = committed.slice(0, 3); // drop the last 3 words
    const rep2 = committed; // a full, genuine second repetition
    const current = [...shrunkRep1, ...rep2];
    // An UNGUARDED scan would keep matching through the coincidental "سبحان","الله"
    // recurrence at positions 3-4 and only stop at position 5 — this asserts the
    // hardened function instead stops at the TRUE boundary (3).
    expect(commonPrefixLength(current, committed)).toBe(3);
  });

  it("HARDENING: a coincidental recurrence within the still-genuinely-matching run is also capped conservatively (safe under-shoot, not the tightest possible boundary)", () => {
    // shrunkRep1 keeps 4 of committed's own tokens (sوبحان,الله,وبحمده,سبحان)
    // — position 3 here is STILL genuinely unrevised committed content, not
    // yet drifted; the true divergence only starts at position 4, where
    // rep2's own opening begins. The guard conservatively caps at the
    // EARLIEST restart-marker recurrence (position 3) rather than the
    // tightest true boundary (4) — safe (proven end-to-end: replaying the
    // extra token from a fresh checkpoint just triggers one harmless,
    // self-correcting restart attempt before the genuine completion), just
    // not maximally tight. See voiceTasbeehMatch.ts's own doc: the function
    // only guarantees an equal-or-shorter result than the true boundary,
    // not the exact true boundary itself.
    const committed = ["سبحان", "الله", "وبحمده", "سبحان", "الله", "العظيم"];
    const shrunkRep1 = committed.slice(0, 4);
    const rep2 = committed;
    const current = [...shrunkRep1, ...rep2];
    expect(commonPrefixLength(current, committed)).toBe(3);
  });

  it("returns 0 for a completely unrelated currentTokens array", () => {
    const committed = ["سبحان", "الله", "وبحمده", "سبحان", "الله", "العظيم"];
    const current = ["كلام", "غير", "مرتبط"];
    expect(commonPrefixLength(current, committed)).toBe(0);
  });

  it("returns 0 when committedTokens is empty (nothing ever committed yet)", () => {
    expect(commonPrefixLength(["سبحان", "الله"], [])).toBe(0);
  });
});

describe("historicalOverlapLength", () => {
  it("matches for as long as the two sequences agree, unlike commonPrefixLength's self-repeat hardening", () => {
    // A self-repeating 2-token target's own history and a shorter new
    // segment are BOTH just "سبحان","الله" alternating — commonPrefixLength
    // would back off to 2 the instant currentTokens runs shorter than
    // historicalTokens (see its own "genuine divergence" branch); this
    // function has no such hardening and matches the full overlap.
    const historical = ["سبحان", "الله", "سبحان", "الله", "سبحان", "الله"]; // 3 reps of history
    const current = ["سبحان", "الله", "سبحان", "الله"]; // a shorter new segment, same pattern
    expect(historicalOverlapLength(current, historical)).toBe(4); // fully consumes currentTokens
  });

  it("stops at the first genuine divergence", () => {
    const historical = ["سبحان", "الله", "سبحان", "الله"];
    const current = ["سبحان", "الله", "وبحمده"];
    expect(historicalOverlapLength(current, historical)).toBe(2);
  });

  it("returns 0 for completely unrelated content", () => {
    expect(historicalOverlapLength(["كلام", "غريب"], ["سبحان", "الله"])).toBe(0);
  });

  it("returns 0 when historicalTokens is empty (nothing committed yet)", () => {
    expect(historicalOverlapLength(["سبحان", "الله"], [])).toBe(0);
  });

  it("bounded by the shorter of the two arrays", () => {
    expect(historicalOverlapLength(["سبحان"], ["سبحان", "الله", "سبحان", "الله"])).toBe(1);
  });
});
