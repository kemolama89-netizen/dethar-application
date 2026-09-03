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
