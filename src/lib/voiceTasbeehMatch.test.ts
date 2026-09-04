import { describe, expect, it } from "vitest";
import { VoiceTasbeehMatcher } from "./voiceTasbeehMatch";
import { tokenize, tokensAreEquivalent } from "./voiceTasbeehNormalize";
import tasbeehLibraryJson from "../data/tasbeeh-library.json";

describe("baseline counting", () => {
  it("counts a single spoken repetition", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("counts 20 genuine repetitions across 20 separate final segments", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const r = m.processSegment({ segmentId: i, text: "سبحان الله", isFinal: true });
      total += r.completions;
    }
    expect(total).toBe(20);
  });

  it("counts every genuine repetition in one long, rapidly-spoken run", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const phrase = Array(20).fill("سبحان الله").join(" ");
    const r = m.processSegment({ segmentId: 1, text: phrase, isFinal: true });
    expect(r.completions).toBe(20);
  });

  it("counts two repetitions arriving in a single batch", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله سبحان الله", isFinal: true });
    expect(r.completions).toBe(2);
  });

  it("does not count a wrong phrase", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "الحمد لله", isFinal: true });
    expect(r.completions).toBe(0);
  });
});

describe("long target / partial speech", () => {
  it("does not count when only the first part of a long target is spoken", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("counts once the full long target is spoken", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("preserves progress across a natural pause within the same growing segment", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    // ...natural pause: no recognition events fire at all...
    r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("preserves progress across a pause that spans a segment boundary", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 2, text: "وبحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("never rounds a stalled partial attempt up to a completion", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    // simulate the session simply ending here (e.g. a 60s timeout) with
    // no further speech — resetAll must not retroactively grant a count.
    m.resetAll();
    expect(r.completions).toBe(0);
  });
});

describe("issue-1 regression: a revision of an earlier word must not leave stale progress standing", () => {
  it("does not let a revision that changes the earlier word retroactively complete the repetition", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    // ASR revises the FIRST word to something that no longer matches at
    // all, while extending with the correct final word.
    r = m.processSegment({ segmentId: 1, text: "صباح الله وبحمده", isFinal: false });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 1, text: "صباح الله وبحمده", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("still completes when a revision genuinely extends the correct earlier words", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: false });
    expect(r.completions).toBe(1);
  });

  it("an already-emitted completion is not affected by a later revision of its own already-resolved span", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(1);
    // the recognizer revises the SAME segment's already-locked text —
    // nothing left to replay, nothing changes.
    r = m.processSegment({ segmentId: 1, text: "صباح الله", isFinal: false });
    expect(r.completions).toBe(0);
  });
});

describe("vocabulary-aware noise tolerance", () => {
  it("tolerates a single short stray word that is not part of the target's own vocabulary", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان يا الله وبحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("does not tolerate a second consecutive stray word (noise budget exhausted)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان يا لي الله وبحمده", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("never silently discards a real target word encountered out of sequence, even though it is short", () => {
    const m = new VoiceTasbeehMatcher();
    // A truncated item-6-style target containing genuine short words.
    m.setTarget("لا اله الا الله وحده لا شريك له");
    // "له" — one of the target's own (short) words — is spoken one token
    // too early, right after "الله". It must register as a mismatch
    // (resetting progress), not be quietly skipped as noise.
    const r = m.processSegment({ segmentId: 1, text: "لا اله الا الله له وحده لا شريك له", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("completes normally when the target's own short words are spoken in their correct positions", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("لا اله الا الله وحده لا شريك له");
    const r = m.processSegment({ segmentId: 1, text: "لا اله الا الله وحده لا شريك له", isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("curated fuzzy tolerance", () => {
  it("tolerates a curated same-word ASR letter substitution (same length, confusable letters)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "صبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("does not cross-match two real, differently-meaning same-length library words (كبيرا vs كثيرا)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("كبيرا");
    const r = m.processSegment({ segmentId: 1, text: "كثيرا", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not cross-match بالله and والله (same length, letter pair not curated)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("بالله");
    const r = m.processSegment({ segmentId: 1, text: "والله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not fuzzy-match across different lengths (اله vs الله)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله");
    const r = m.processSegment({ segmentId: 1, text: "اله", isFinal: true });
    expect(r.completions).toBe(0);
  });
});

describe("interim/final/duplicate/replay handling", () => {
  it("counts once despite several interim revisions before finalizing", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 1, text: "سب", isFinal: false });
    m.processSegment({ segmentId: 1, text: "سبحا", isFinal: false });
    m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false });
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("does not double count a duplicate/replayed final transcript", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
    r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not double count an unchanged interim re-emission", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("target switching", () => {
  it("switches without needing a new segment and matches the new target immediately", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.setTarget("الله اكبر");
    const r = m.processSegment({ segmentId: 1, text: "الله اكبر", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("discards the old target's partial progress on switch", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false }); // 2/3 toward old target
    m.setTarget("الحمد لله");
    const r = m.processSegment({ segmentId: 2, text: "لله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not let content spoken before the switch satisfy the new target, even on the same growing segment", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false }); // non-completing, transient
    m.setTarget("سبحان الله"); // new target happens to equal what was already (transiently) said
    // the SAME segment keeps growing post-switch, but only content
    // extracted AFTER the switch boundary is fresh
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("a continuing result at the same segment id is still processed correctly after a switch", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(1); // old target completes before the switch
    m.setTarget("الحمد لله");
    r = m.processSegment({ segmentId: 1, text: "سبحان الله الحمد لله", isFinal: true });
    expect(r.completions).toBe(1); // new target's own words, spoken after, complete once
  });

  it("does not restart recognition state — repeated switches never cross-contaminate progress", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.setTarget("الله اكبر");
    m.setTarget("الحمد لله");
    const r = m.processSegment({ segmentId: 1, text: "الحمد لله", isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("inactivity activity signal (drives the 60s watchdog; the timer itself lives in useVoiceTasbeeh)", () => {
  it("flags activity for a genuine new attempt", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false });
    expect(r.hadGenuineActivity).toBe(true);
  });

  it("does not flag activity for a duplicate/replayed identical transcript", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false });
    const r = m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false });
    expect(r.hadGenuineActivity).toBe(false);
  });

  it("does not flag activity for genuinely new but clearly off-target speech", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "محمد رسول", isFinal: false });
    expect(r.hadGenuineActivity).toBe(false);
  });

  it("flags activity for a tolerated stray token even though it doesn't itself advance the match", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false });
    const r = m.processSegment({ segmentId: 1, text: "سبحان يا", isFinal: false });
    expect(r.hadGenuineActivity).toBe(true);
  });

  it("does not flag activity when nothing new was said at all", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "", isFinal: false });
    expect(r.hadGenuineActivity).toBe(false);
  });
});

describe("real device capture regressions — RLM-corrupted transcripts", () => {
  const RLM = "‏";

  it("completes a target whose first token is RLM-corrupted, in a single segment", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: `${RLM}سبحان الله وبحمده`, isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("completes a 5-token target split across three segments, each new segment's own first token RLM-corrupted", () => {
    // T1 T2 -> result 1; T3 -> result 2; T4 T5 -> result 3, exactly the
    // shape required: matchProgress 0 -> 2 -> 3 -> 5 -> exactly one count,
    // with natural pauses between events and a fresh leading RLM on every
    // new segment's own first word (proven real behavior: the real device
    // capture showed the corruption on the raw string of every sampled
    // result, not just the very first one of a session).
    const m = new VoiceTasbeehMatcher();
    const target = "سبحان الله وبحمده الله اكبر"; // 5 tokens: T1..T5
    m.setTarget(target);

    let r = m.processSegment({ segmentId: 1, text: `${RLM}سبحان الله`, isFinal: true }); // T1 T2
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 2, text: `${RLM}وبحمده`, isFinal: true }); // T3
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 3, text: `${RLM}الله اكبر`, isFinal: true }); // T4 T5
    expect(r.completions).toBe(1);
  });

  it("does not stall forever on a long single-recitation target with a corrupted first token — recovers via later segments", () => {
    // The exact reported failure shape: one continuous long dhikr, no
    // repeated occurrence of the target's own first word anywhere else in
    // the utterance to fall back on — must still complete once, driven
    // purely by the fix stripping the corruption before matching, not by
    // any restart-recovery mechanism.
    const m = new VoiceTasbeehMatcher();
    const target = "سبحان الله وبحمده سبحانك اللهم";
    m.setTarget(target);
    let r = m.processSegment({ segmentId: 1, text: `${RLM}سبحان الله وبحمده`, isFinal: true });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 2, text: `${RLM}سبحانك اللهم`, isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("real device capture regressions — revision that shrinks/re-segments a still-live result", () => {
  it("still processes genuinely new post-revision speech after a dramatic shrink on the same live result (37 -> 21 -> 1 tokens, modeled on the real capture)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    // A long, mostly-irrelevant interim hypothesis (37 tokens) that the
    // recognizer later collapses down to a much shorter, re-segmented one
    // (21, then 1) — the real capture showed exactly this magnitude of
    // in-place revision on a single still-live resultIndex. The genuinely
    // new, correct target speech arrives only in the final, short form.
    let r = m.processSegment({ segmentId: 0, text: Array(37).fill("كلمة").join(" "), isFinal: false });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 0, text: Array(21).fill("كلمة").join(" "), isFinal: false });
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: true }); // collapses to the real target, 1 token
    expect(r.completions).toBe(1);
  });

  it("still processes genuinely new post-completion speech after a dramatic revision-shrink of the same live result", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله"); // 2-token target, so a completion establishes a non-empty resolvedPrefix
    let r = m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: false }); // 1st repetition completes
    expect(r.completions).toBe(1);
    // The recognizer then wildly re-segments the SAME live result into a
    // long, unrelated-looking hypothesis...
    r = m.processSegment({ segmentId: 0, text: Array(37).fill("كلمة").join(" "), isFinal: false });
    expect(r.completions).toBe(0);
    // ...then collapses it again, this time to the 2nd genuine repetition.
    r = m.processSegment({ segmentId: 0, text: "سبحان الله سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("does not lose new post-switch speech when a revision shrinks the pre-switch prefix's own token count", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده"); // old target, 3 tokens
    // Old target's first two words spoken, still interim (non-completing).
    let r = m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: false });
    expect(r.completions).toBe(0);
    m.setTarget("الحمد لله رب العالمين"); // switch to a new, unrelated 4-token target
    // The SAME live result is later revised: the recognizer now hears the
    // pre-switch span as a SINGLE re-segmented word ("سبحانالله", 1 token
    // where there used to be 2) while the user has already gone on to
    // speak the entire new target. A plain token-count offset (old
    // behavior: resolvedUpTo=2) would slice this 5-token array at index 2
    // and silently drop "الحمد" (the new target's own first word).
    r = m.processSegment({
      segmentId: 0,
      text: "سبحانالله الحمد لله رب العالمين",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });
});

describe("target switching — extended real-world scenarios", () => {
  it("A -> B, then immediately speak B, in the very next event", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false }); // partial A
    m.setTarget("الحمد لله");
    const r = m.processSegment({ segmentId: 0, text: "سبحان الحمد لله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("A -> B, wait (no events), then speak B", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false });
    m.setTarget("الحمد لله");
    // ...natural pause, no recognition events fire at all...
    const r = m.processSegment({ segmentId: 1, text: "الحمد لله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("A -> B -> A, B never spoken, a genuinely fresh recitation of A after switching back still matches", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false }); // partial A, pre-switch — never counted
    m.setTarget("الحمد لله");
    m.setTarget("سبحان الله");
    // The user genuinely re-recites A from its own first word after
    // switching back — this must complete using only that fresh content,
    // not the excluded pre-switch "سبحان" (consistent with the existing
    // "content spoken before the switch [never satisfies] the new target"
    // guarantee, which applies just as much to switching back to the same
    // target as to switching to a different one).
    const r = m.processSegment({ segmentId: 0, text: "سبحان سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("A -> B -> C -> A, only the final target's own words spoken", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.setTarget("الحمد لله");
    m.setTarget("الله اكبر");
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("switch during an actively-growing interim result, followed by a revision of that same result", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    let r = m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false }); // growing, non-completing
    expect(r.completions).toBe(0);
    m.setTarget("الله اكبر");
    // The recognizer revises the whole still-live result, re-segmenting
    // the pre-switch word and appending the new target's own words.
    r = m.processSegment({ segmentId: 0, text: "سبحانا الله اكبر", isFinal: false });
    expect(r.completions).toBe(1);
  });

  it("switch after a final result on the prior segment", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: true }); // completes old target
    m.setTarget("الحمد لله");
    const r = m.processSegment({ segmentId: 1, text: "الحمد لله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("rapid multiple switches with no speech in between never leave stale progress", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.setTarget("الحمد لله");
    m.setTarget("الله اكبر");
    m.setTarget("لا اله الا الله");
    m.setTarget("سبحان الله");
    m.setTarget("الحمد لله");
    const r = m.processSegment({ segmentId: 0, text: "الحمد لله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("invariant: the first genuinely new spoken token after a switch is evaluated against the new target, even mid-segment with no resultIndex change", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false });
    m.setTarget("الله اكبر");
    // Same segment id, same still-interim result — the very next word
    // spoken is the new target's own first word.
    const r = m.processSegment({ segmentId: 0, text: "سبحان الله اكبر", isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("safer recovery model: a substantial mismatch terminates the attempt; only a fresh targetTokens[0] starts a new one", () => {
  // Symbolic A/B/C/D/X letters, each a distinct, ordinary-length (>2 char)
  // Arabic word so none of them can slip through the short-token noise
  // budget and none are fuzzy-equivalent to one another (verified: no two
  // differ by exactly one letter). Standing in for the abstract letters in
  // the accepted recovery-model spec, not real dhikr text.
  const A = "واحد";
  const B = "اثنان";
  const C = "ثلاثة";
  const D = "اربعة";
  const E = "خمسة";
  const X = "غريب";
  const TARGET_ABCD = [A, B, C, D].join(" ");

  it("1. A B X C D -> 0 (a mismatch mid-sequence is not bridged; C D alone never completes)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({ segmentId: 1, text: [A, B, X, C, D].join(" "), isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("2. A B X A B C D -> 1 (the rejected attempt is abandoned; the fresh A that follows starts a genuine one)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({ segmentId: 1, text: [A, B, X, A, B, C, D].join(" "), isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("3. X A B C D -> 1 (a leading stray token before the real attempt doesn't prevent it)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({ segmentId: 1, text: [X, A, B, C, D].join(" "), isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("4. X C D -> 0 (no A/B were ever spoken; C D alone is not a partial match of anything)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({ segmentId: 1, text: [X, C, D].join(" "), isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("5. concrete example: target 'سبحان الله وبحمده', transcript 'سبحان الله صباح وبحمده' -> 0 (never skip a wrong word to bridge to the last target word)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله صباح وبحمده", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("6. short -> long target switch where old-target residue precedes the new target's own speech in the same growing segment -> new target still counts", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله"); // short old target
    m.processSegment({ segmentId: 0, text: "سبحان", isFinal: false }); // old-target residue, never completes
    m.setTarget("الحمد لله رب العالمين"); // long new target
    const r = m.processSegment({ segmentId: 0, text: "سبحان الحمد لله رب العالمين", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("7. A -> B -> A, purely at the matcher level, produces exactly one count for a genuinely fresh recitation of A", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    m.setTarget("الحمد لله");
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({ segmentId: 0, text: TARGET_ABCD, isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("8. long target spanning multiple resultIndex values with a mismatch in the middle -> no false count", () => {
    const m = new VoiceTasbeehMatcher();
    const target = [A, B, C, D, E].join(" ");
    m.setTarget(target);
    let r = m.processSegment({ segmentId: 1, text: [A, B].join(" "), isFinal: true }); // A B on segment 1
    expect(r.completions).toBe(0);
    r = m.processSegment({ segmentId: 2, text: [X, C, D, E].join(" "), isFinal: true }); // stray, then the rest
    expect(r.completions).toBe(0);
  });

  it("9. repeated genuine long target after a rejected attempt -> exactly one count per genuine repetition", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(TARGET_ABCD);
    const r = m.processSegment({
      segmentId: 1,
      text: [A, B, X, A, B, C, D, A, B, C, D].join(" "), // one rejected partial, then two genuine repetitions
      isFinal: true,
    });
    expect(r.completions).toBe(2);
  });
});

describe("content update: item 9 salawat now stores 'صلي' (content fix, not a matcher special case)", () => {
  // Sourced directly from the real library data (src/data/tasbeeh-library.json,
  // item id 9) rather than retyped here, so this test tracks whatever the
  // actual stored/displayed content is rather than a copy that could drift.
  const item9 = (tasbeehLibraryJson as { items: { id: number; dhikr_ar: string }[] }).items.find((i) => i.id === 9)!;

  it("the stored content is the updated phrase (صلي, not صل)", () => {
    expect(tokenize(item9.dhikr_ar)).toEqual(["اللهم", "صلي", "وسلم", "وبارك", "علي", "سيدنا", "محمد"]);
  });

  it("the exact stored phrase counts", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(item9.dhikr_ar);
    const r = m.processSegment({ segmentId: 1, text: item9.dhikr_ar, isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("the old 'صل' (without ي) wording now matches too — via the GENERIC trailing weak-letter rule in tokensAreEquivalent, not a special case for this phrase", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(item9.dhikr_ar);
    const r = m.processSegment({ segmentId: 1, text: "اللهم صل وسلم وبارك على سيدنا محمد", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("missing 'وبارك' does not count", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(item9.dhikr_ar);
    const r = m.processSegment({ segmentId: 1, text: "اللهم صلي وسلم على سيدنا محمد", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("missing 'وسلم' does not count", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(item9.dhikr_ar);
    const r = m.processSegment({ segmentId: 1, text: "اللهم صلي وبارك على سيدنا محمد", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("a partial phrase (first part only) does not count", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget(item9.dhikr_ar);
    const r = m.processSegment({ segmentId: 1, text: "اللهم صلي وسلم", isFinal: true });
    expect(r.completions).toBe(0);
  });
});

describe("generic Arabic clitic-segmentation tolerance (و split from its word by ASR)", () => {
  it("1. والله split as و الله", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والله");
    const r = m.processSegment({ segmentId: 1, text: "و الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("2. والحمد split as و الحمد", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والحمد");
    const r = m.processSegment({ segmentId: 1, text: "و الحمد", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("3. وبحمده split as و بحمده", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("وبحمده");
    const r = m.processSegment({ segmentId: 1, text: "و بحمده", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("4. multiple split clitics in one long dhikr", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله والحمد لله ولا اله الا الله والله اكبر");
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله و الحمد لله ولا اله الا الله و الله اكبر",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });

  it("5. split clitic at the final target token", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله اكبر والله");
    const r = m.processSegment({ segmentId: 1, text: "الله اكبر و الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("6. split clitic in the middle of a long target", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله والحمد لله اكبر");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله و الحمد لله اكبر", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("7. an unrelated word between و and the remainder must NOT match", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والله");
    const r = m.processSegment({ segmentId: 1, text: "و صباح الله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("7b. the same, embedded in a full long target — must not complete", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله والحمد لله ولا اله الا الله والله اكبر");
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله والحمد لله ولا اله الا الله و صباح الله اكبر",
      isFinal: true,
    });
    expect(r.completions).toBe(0);
  });

  it("8. a short target containing a word beginning with و", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والله أكبر");
    const r = m.processSegment({ segmentId: 1, text: "و الله أكبر", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("9. a long target arriving across multiple recognition updates, split clitic in the final update", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله والحمد لله ولا اله الا الله والله اكبر");
    const steps = [
      "سبحان الله والحمد لله ولا اله الا الله",
      "سبحان الله والحمد لله ولا اله الا الله و",
      "سبحان الله والحمد لله ولا اله الا الله و الله",
      "سبحان الله والحمد لله ولا اله الا الله و الله اكبر",
    ];
    let total = 0;
    for (let i = 0; i < steps.length; i++) {
      total += m.processSegment({ segmentId: 0, text: steps[i], isFinal: i === steps.length - 1 }).completions;
    }
    expect(total).toBe(1);
  });

  it("10. rapid repeated completion via clitic split — exactly one count per genuine repetition", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والله");
    const r = m.processSegment({ segmentId: 1, text: "و الله و الله", isFinal: true });
    expect(r.completions).toBe(2);
  });

  it("does not weaken content validation: a materially missing word still yields 0 even with a و split present", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله والحمد لله ولا اله الا الله والله اكبر");
    // والحمد is entirely missing, not merely split.
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله لله ولا اله الا الله و الله اكبر",
      isFinal: true,
    });
    expect(r.completions).toBe(0);
  });

  it("LIVE TRACE regression: real device capture — target #5 spoken with والله split as و الله", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ");
    // Exact normalized token sequence from the captured iPad trace:
    // ["سبحان","الله","والحمد","لله","ولا","اله","الا","الله","و","الله","اكبر"]
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله والحمد لله ولا اله الا الله و الله اكبر",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });

  it("library-wide: every و-prefixed token in the real library still completes when ASR splits it", () => {
    const items = (tasbeehLibraryJson as { items: { dhikr_ar: string }[] }).items;
    for (const item of items) {
      const tokens = tokenize(item.dhikr_ar);
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i][0] !== "و" || tokens[i].length < 2) continue;
        const spokenTokens = [...tokens.slice(0, i), "و", tokens[i].slice(1), ...tokens.slice(i + 1)];
        const m = new VoiceTasbeehMatcher();
        m.setTarget(item.dhikr_ar);
        const r = m.processSegment({ segmentId: 1, text: spokenTokens.join(" "), isFinal: true });
        expect(r.completions).toBe(1);
      }
    }
  });
});

describe("generic ASR-truncation tolerance (any word, any position in the phrase — not fuzzy matching)", () => {
  // Real device captures proved a SpeechRecognition failure mode that can
  // happen anywhere in a phrase, not only its last word, and that the
  // browser sometimes NEVER corrects in any later revision: it stops
  // transcribing a word partway through even though the user pronounced
  // it completely. These tests use the user's own reported shapes
  // directly rather than a synthetic stand-in.

  it("A) truncated token in the MIDDLE of the phrase still counts (وبحمده -> وبحمد)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده سبحان الله العظيم");
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله وبحمد سبحان الله العظيم",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });

  it("B) truncated token near the end still counts (ارحمني -> ارحمن)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("اللهم ارحمني");
    const r = m.processSegment({ segmentId: 1, text: "اللهم ارحمن", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("C) truncated token earlier in a long phrase, with every later token correct, still counts (وحده -> وحد)", () => {
    const m = new VoiceTasbeehMatcher();
    const target = "لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير";
    m.setTarget(target);
    const r = m.processSegment({
      segmentId: 1,
      text: "لا اله الا الله وحد لا شريك له له الملك وله الحمد وهو على كل شيء قدير",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });

  it("still counts once the corrected form arrives instead, exactly as before this change", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله قدير");
    const r = m.processSegment({ segmentId: 1, text: "الله قدير", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("D) a genuinely different word (same length, not a prefix) is rejected, not tolerated", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله اكبر كبيرا والحمد لله كثيرا وسبحان الله بكرة واصيلا");
    const r = m.processSegment({
      segmentId: 1,
      text: "الله اكبر كبيرا والحمد لله كثيرا وسبحان الله وقال واصيلا",
      isFinal: true,
    });
    expect(r.completions).toBe(0);
  });

  it("E) a genuinely different word (قدير -> قديم) is rejected, not tolerated", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله قدير");
    const r = m.processSegment({ segmentId: 1, text: "الله قديم", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not tolerate a materially SHORTER phrase (a genuinely missing word is still rejected, not treated as truncation)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده سبحان الله العظيم");
    // "وبحمده" is entirely absent here, not merely truncated.
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله سبحان الله العظيم", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not treat a real, different word already used elsewhere in the SAME target as a truncation of a longer target word (اللهم -> الله)", () => {
    const m = new VoiceTasbeehMatcher();
    // "الله" already appears on its own, earlier in this exact target —
    // accepting it as a truncation of "اللهم" here would let a genuine,
    // different, real word silently satisfy the phrase.
    m.setTarget("سبحان الله والحمد لله ولا اله الا الله اللهم اغفر لي");
    const r = m.processSegment({
      segmentId: 1,
      text: "سبحان الله والحمد لله ولا اله الا الله الله اغفر لي",
      isFinal: true,
    });
    expect(r.completions).toBe(0);
  });

  it("F) a duplicate replay of an already-counted truncation-completed repetition never double counts", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله قدير");
    let r = m.processSegment({ segmentId: 1, text: "الله قدي", isFinal: true });
    expect(r.completions).toBe(1); // counted immediately — no waiting for a correction
    // the browser resends the exact same already-committed final segment
    r = m.processSegment({ segmentId: 1, text: "الله قدي", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("G) rapid genuine repetitions, one of them truncated, all still count with no throttle", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله قدير");
    const r = m.processSegment({
      segmentId: 1,
      text: "الله قدير الله قدي الله قدير الله قدير",
      isFinal: true,
    });
    expect(r.completions).toBe(4);
  });

  it("H) target switch: a truncated form of the OLD target's own trailing word cannot satisfy the NEW target", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("الله قدير"); // old target
    m.processSegment({ segmentId: 1, text: "الله قد", isFinal: false }); // partial/truncated old-target speech, pre-switch
    m.setTarget("سبحان الله"); // switch to an unrelated new target
    const r = m.processSegment({ segmentId: 1, text: "الله قد سبحان الله", isFinal: true });
    expect(r.completions).toBe(1); // only the genuine post-switch "سبحان الله" counts
  });

  it("I) existing clitic-split behavior (و + الله for والله) is unaffected by the new tolerance", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("والله");
    const r = m.processSegment({ segmentId: 1, text: "و الله", isFinal: true });
    expect(r.completions).toBe(1);
  });
});

describe("duplicate-completion guard (fallback replay must never re-emit already-delivered completions)", () => {
  // Mirrors the exact real device capture shape: an irrelevant "filler"
  // span precedes the real target's own repetitions (there: the OLD
  // target's own content, locked in via setTarget's forced resolvedPrefix
  // extension — see setTarget). Several genuine repetitions of the new
  // target complete and are delivered via ordinary (non-fallback) interim
  // events, each properly excluded from future replay via resolvedPrefix.
  // A later isFinal event then revises a token STRICTLY INSIDE the filler
  // span only — never touching any of the already-completed repetitions'
  // own tokens — which is exactly enough to fail resolveReplayWindow's
  // prefixIntact check and force the full-fallback replay path, without
  // structurally destroying any repetition. That fallback re-derives the
  // same repetitions from scratch; deliveredCompletionCount is what stops
  // them from being reported a second time.

  // Returns the SUM of `.completions` across all 3 interim calls it makes
  // (not just the last one) — each repetition below is delivered by a
  // SEPARATE processSegment call, so the caller must accumulate across
  // all of them, exactly like useVoiceTasbeeh.ts's onresult handler does.
  function primeThreeGenuineCompletions(m: VoiceTasbeehMatcher): number {
    m.setTarget("مرحبا بالعالم"); // irrelevant filler target
    m.processSegment({ segmentId: 1, text: "مرحبا بالعالم", isFinal: false }); // filler's own completion — irrelevant, must not leak into the real target's count
    m.setTarget("سبحان الله"); // switch — matchProgress AND deliveredCompletionCount both reset here
    let total = 0;
    total += m.processSegment({ segmentId: 1, text: "مرحبا بالعالم سبحان الله", isFinal: false }).completions;
    total += m.processSegment({ segmentId: 1, text: "مرحبا بالعالم سبحان الله سبحان الله", isFinal: false })
      .completions;
    total += m.processSegment({
      segmentId: 1,
      text: "مرحبا بالعالم سبحان الله سبحان الله سبحان الله",
      isFinal: false,
    }).completions;
    return total;
  }

  it("A) three completions delivered via interim events, then a final revision inside the locked (filler) span => total stays 3, not 6", () => {
    const m = new VoiceTasbeehMatcher();
    let total = primeThreeGenuineCompletions(m);
    expect(total).toBe(3); // the 3 interim deliveries alone, before any final event

    // Revises ONLY the filler's first word ("مرحبا" -> "اهلا") — every one
    // of the 3 real repetitions' own tokens is byte-identical to what was
    // already delivered.
    const rFinal = m.processSegment({
      segmentId: 1,
      text: "اهلا بالعالم سبحان الله سبحان الله سبحان الله",
      isFinal: true,
    });
    total += rFinal.completions;
    expect(rFinal.completions).toBe(0); // all 3 were already delivered — nothing new to emit
    expect(total).toBe(3); // NOT 6
  });

  it("B) the same already-committed final segment resent a second time still contributes nothing further", () => {
    const m = new VoiceTasbeehMatcher();
    let total = primeThreeGenuineCompletions(m);
    total += m.processSegment({
      segmentId: 1,
      text: "اهلا بالعالم سبحان الله سبحان الله سبحان الله",
      isFinal: true,
    }).completions;
    // the browser resends the exact same already-committed final segment 1
    total += m.processSegment({
      segmentId: 1,
      text: "اهلا بالعالم سبحان الله سبحان الله سبحان الله",
      isFinal: true,
    }).completions;
    expect(total).toBe(3);
  });

  it("C) two old completions delivered via interim events, plus one genuinely new one appearing only in the final fallback replay => the final emits exactly the new one", () => {
    const m = new VoiceTasbeehMatcher();
    let total = 0;
    m.setTarget("مرحبا بالعالم");
    m.processSegment({ segmentId: 1, text: "مرحبا بالعالم", isFinal: false });
    m.setTarget("سبحان الله");
    total += m.processSegment({ segmentId: 1, text: "مرحبا بالعالم سبحان الله", isFinal: false }).completions;
    total += m.processSegment({ segmentId: 1, text: "مرحبا بالعالم سبحان الله سبحان الله", isFinal: false })
      .completions;
    expect(total).toBe(2); // only 2 delivered so far — the 3rd repetition below has not been spoken/processed yet

    // Final revision: same filler-token fix as before, but this time the
    // ground-truth text ALSO contains a genuinely new 3rd repetition that
    // was never processed by any prior event.
    const rFinal = m.processSegment({
      segmentId: 1,
      text: "اهلا بالعالم سبحان الله سبحان الله سبحان الله",
      isFinal: true,
    });
    expect(rFinal.completions).toBe(1); // exactly the new one — not the 2 already-delivered ones, not 3
    total += rFinal.completions;
    expect(total).toBe(3);
  });

  it("D) rapid genuine repetitions in one continuous run are all counted, with no throttle/cooldown suppressing them", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    // 50 repetitions spoken/recognized in a single burst — no fallback
    // involved at all (nothing was ever locked yet), so this exercises the
    // ordinary path and confirms the new bookkeeping adds no throttling of
    // any kind to genuine rapid speech.
    const phrase = Array(50).fill("سبحان الله").join(" ");
    const r = m.processSegment({ segmentId: 1, text: phrase, isFinal: true });
    expect(r.completions).toBe(50);
  });

  it("E) ordinary single-completion behavior is unaffected", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(1);
  });

  it("a target switch resets the delivered-completion count, so a stale count from the OLD target cannot suppress the NEW target's own first completion", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده سبحان الله العظيم"); // 6-token target, one completion delivered
    const r1 = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده سبحان الله العظيم", isFinal: false });
    expect(r1.completions).toBe(1);
    m.setTarget("سبحان الله"); // switch to a short new target on the SAME live segment
    const r2 = m.processSegment({
      segmentId: 1,
      text: "سبحان الله وبحمده سبحان الله العظيم سبحان الله",
      isFinal: true,
    });
    expect(r2.completions).toBe(1); // the new target's own single completion must not be swallowed
  });
});

describe("postSwitchFloor: a target switch's own boundary survives a fallback replay", () => {
  it("B) content spoken before the switch cannot, by itself, complete the new target", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله العظيم"); // old target, 3 tokens
    // Partial old-target speech — "سبحان الله" happens to be the ENTIRE
    // new target's own wording, verbatim.
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    m.setTarget("سبحان الله"); // switch — new target's own words already sit in resolvedPrefix/preSwitchSnapshot
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("C) old transcript re-derived by a fallback replay after a switch contributes 0 new completions, while a genuinely new post-switch repetition still counts exactly once", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله العظيم"); // old target A
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false }); // partial A, pre-switch
    m.setTarget("سبحان الله"); // switch to B — B's own words equal A's pre-switch prefix verbatim
    // Genuinely NEW, post-switch content: "يا" (noise) then a full, clean
    // repetition of B ("سبحان الله").
    let r = m.processSegment({ segmentId: 1, text: "سبحان الله يا سبحان الله", isFinal: false });
    expect(r.completions).toBe(1); // the one genuine post-switch repetition, delivered immediately
    // A later revision DROPS "يا" entirely (ASR revising its own
    // hypothesis) — this invalidates resolvedPrefix's byte-for-byte
    // check (the token count shrinks), forcing a full fallback replay
    // that re-walks the ENTIRE current transcript, INCLUDING the
    // pre-switch "سبحان الله", from scratch.
    r = m.processSegment({ segmentId: 1, text: "سبحان الله سبحان الله", isFinal: true });
    // Without postSwitchFloor, this fallback would structurally find TWO
    // completions (the pre-switch "سبحان الله" at the very start, plus
    // the genuine post-switch one) and — even after the existing
    // deliveredCompletionCount dedup guard — would wrongly emit the
    // pre-switch one as if it were "the new one". With the fix, the
    // pre-switch-derived completion is discarded at the source, so only
    // the already-delivered genuine one remains, which the dedup guard
    // correctly reports as already-seen: 0 further increments.
    expect(r.completions).toBe(0);
  });

  it("a still-open (not yet complete) attempt that began on pre-switch content must not durably carry its progress into a later event", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله العظيم"); // old target
    m.processSegment({ segmentId: 1, text: "سبحان", isFinal: false }); // partial old-target speech
    m.setTarget("سبحان الله"); // switch — new target's own first word equals this pre-switch content
    // Final event whose fallback replay walk would otherwise carry
    // "سبحان" (pre-switch) as 1/2 progress toward the new target.
    const r = m.processSegment({ segmentId: 1, text: "سبحان يا", isFinal: true });
    expect(r.completions).toBe(0);
    // The corrected word alone, on a fresh segment, must NOT complete
    // the target — proving matchProgress was reset to 0, not carried in
    // as 1 (tainted) from the pre-switch "سبحان".
    const r2 = m.processSegment({ segmentId: 2, text: "الله", isFinal: true });
    expect(r2.completions).toBe(0);
  });

  it("does not affect the ordinary (non-fallback) path at all — the existing exclusion test's shape still holds", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده");
    m.processSegment({ segmentId: 1, text: "سبحان الله", isFinal: false });
    m.setTarget("سبحان الله");
    const r = m.processSegment({ segmentId: 1, text: "سبحان الله وبحمده", isFinal: true });
    expect(r.completions).toBe(0);
  });

  it("does not lose new post-switch speech when a revision shrinks the pre-switch span's own token count (regression: an index-based floor failed this)", () => {
    const m = new VoiceTasbeehMatcher();
    m.setTarget("سبحان الله وبحمده"); // old target, 3 tokens
    m.processSegment({ segmentId: 0, text: "سبحان الله", isFinal: false });
    m.setTarget("الحمد لله رب العالمين"); // switch to a new, unrelated 4-token target
    // The pre-switch span itself gets fused into a single re-segmented
    // token ("سبحانالله") while the user has already spoken the entire
    // new target — the post-switch floor must shrink right along with
    // it, not swallow "الحمد" (the new target's own first word) as if it
    // were still pre-switch content.
    const r = m.processSegment({
      segmentId: 0,
      text: "سبحانالله الحمد لله رب العالمين",
      isFinal: true,
    });
    expect(r.completions).toBe(1);
  });
});

describe("library audit — real dhikr data (regression guard for the curated fuzzy table)", () => {
  const items = (tasbeehLibraryJson as { items: { dhikr_ar: string }[] }).items;

  it("sanity: the audited library still has the expected item count", () => {
    expect(items.length).toBe(16);
  });

  it("never treats two distinct real library tokens as fuzzy-equivalent", () => {
    const distinct = new Set<string>();
    for (const item of items) {
      for (const tok of tokenize(item.dhikr_ar)) distinct.add(tok);
    }
    const tokens = Array.from(distinct);
    const collisions: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokensAreEquivalent(tokens[i], tokens[j])) {
          collisions.push(`${tokens[i]} <-> ${tokens[j]}`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  it("every full library item is recognized as exactly one completion of itself", () => {
    for (const item of items) {
      const m = new VoiceTasbeehMatcher();
      m.setTarget(item.dhikr_ar);
      const r = m.processSegment({ segmentId: 1, text: item.dhikr_ar, isFinal: true });
      expect(r.completions).toBe(1);
    }
  });
});
