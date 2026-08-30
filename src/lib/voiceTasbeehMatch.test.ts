import { describe, expect, it } from "vitest";
import { INITIAL_MATCH_STATE, applyToken, normalizeArabicForMatch, replayTokens, tokenize } from "./voiceTasbeehMatch";
import type { MatchState } from "./voiceTasbeehMatch";

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
    this.committedState = this.pendingEndState;
    this.committedTotal = this.inFlightTotal;
    this.highestCommittedIndex = Math.max(this.highestCommittedIndex, this.inFlightIndex);
    this.inFlightIndex = null;
    this.inFlightTokens = null;
  }

  /** Feeds one SpeechRecognition result (interim or final) for segment `index`. */
  emit(index: number, transcript: string, isFinal: boolean) {
    if (index <= this.highestCommittedIndex) return;
    const currentTokens = tokenize(transcript);

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
