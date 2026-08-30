// Lightweight Arabic phrase matching for Voice Tasbeeh — pure functions,
// no DOM/SpeechRecognition dependency, so they're trivial to reason about
// (and exercise) independently of the recognizer lifecycle in
// useVoiceTasbeeh.ts.
//
// The library's own dhikr_ar strings (src/data/tasbeeh-library.json) carry
// full tashkeel (e.g. "سُبْحَانَ اللَّهِ") for correct reading, but a speech
// recognizer's transcript never includes diacritics and commonly varies in
// alef/yeh/hamza spelling — so both the target phrase and the live
// transcript are normalized the same way before comparison. This never
// touches the stored dhikr text itself, only a throwaway copy used for
// matching. Every rule uses explicit \u code points (never a literal
// Arabic glyph as a regex range endpoint) so the exact set stays
// unambiguous to audit:
//   ً-ٟ, ٰ, ۖ-ۭ   tashkeel / Quranic annotation marks
//   ـ                                 tatweel (kashida)
//   آ أ إ ٱ -> ا   (آ أ إ ٱ) -> ا
//   ى -> ي                       ى -> ي
//   ؤ -> و                       ؤ -> و
//   ئ -> ي                       ئ -> ي
//   ة -> ه                       ة -> ه
//   ٠-٩, ۰-۹           Arabic-Indic digits (dropped)
//   ؀-ۿ                          the Arabic Unicode block (kept;
//                                          everything else — Latin, plain
//                                          digits, punctuation — dropped)
export function normalizeArabicForMatch(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩۰-۹]/g, "")
    .replace(/[،؛؟٪٫٬۔٭]/g, " ") // Arabic punctuation — sits INSIDE the
    // Arabic Unicode block, so the block-keep rule below cannot drop it on
    // its own; verified with a direct test (U+060C survived without this).
    .replace(/[^؀-ۿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Exported so useVoiceTasbeeh.ts can tokenize both the target phrase and
// each recognition segment's transcript the same way before feeding tokens
// into applyToken/replayTokens below.
export function tokenize(text: string): string[] {
  const normalized = normalizeArabicForMatch(text);
  return normalized.length ? normalized.split(" ") : [];
}

// ---------------------------------------------------------------------
// Utterance state machine — the counting core.
//
// A SpeechRecognition EVENT is not a spoken repetition. It is, at most,
// one more WORD (or a handful of words) toward or away from completing
// the selected Dhikr. This module never sees events, results, or
// transcripts at all — only a stream of individual normalized word
// TOKENS, fed in one at a time — because that is the only unit small
// enough to reason about exactly once each, which is what makes "one
// spoken repetition = exactly one count" enforceable by construction
// rather than by re-scanning a growing buffer and hoping a diff comes out
// right (the previous implementation's approach, and the source of the
// double/missed-counting bugs this rewrite replaces).
//
// Every "current attempt at saying the selected Dhikr" — one UTTERANCE —
// is exactly one of three states:
//   PENDING  — the tokens matched so far are a genuine PREFIX of the
//              target (0 or more words in, not yet complete). Nothing
//              has been counted for this utterance yet.
//   VALID    — the tokens matched so far are the target's COMPLETE,
//              exact word sequence. This is the moment +1 is credited.
//              A valid utterance stays "at risk" — the NEXT token still
//              decides whether it turns out to have only been a prefix
//              of something longer (see INVALID below) or is genuinely
//              done (see "consumed" below).
//   INVALID  — the tokens diverged from the target and can never
//              complete it. If this utterance had been VALID (already
//              credited), invalidating it means the phrase turned out to
//              continue into something else — its +1 is rolled back,
//              exactly once, right here.
//
// The only way out of VALID or INVALID is the target's OWN FIRST WORD
// appearing again: that is unambiguous proof a FRESH utterance has
// begun, so the old one is CONSUMED (its credit, if any, is permanent —
// no further token can ever roll it back) and a brand new utterance
// starts from that word. This is also how multiple repetitions packed
// into one recognition segment ("Subhan Allah Subhan Allah Subhan
// Allah") each get their own, separate +1: each is its own utterance,
// consumed the instant the next one's first word appears.
export type UtteranceStatus = "pending" | "valid" | "invalid";

export interface MatchState {
  /**
   * How many of the target's own tokens, in order, the CURRENT utterance
   * has matched so far. Only meaningful while `status` is "pending" (a
   * partial prefix, 0..targetLength-1) or "valid" (exactly
   * targetLength); always 0 while "invalid" — an invalid utterance
   * carries no progress, it's simply waiting to be consumed by the
   * target's first word appearing again.
   */
  progress: number;
  status: UtteranceStatus;
}

// The state before any token has ever been seen — a fresh, empty
// utterance, no progress yet. Also what a "settled" utterance resets to
// (see useVoiceTasbeeh's SETTLE_DELAY_MS): once a VALID utterance has
// gone uncontested long enough that nothing more will plausibly extend
// it, tracking resets to this WITHOUT touching whatever was already
// credited, so a later, unrelated word can never reach back and roll it
// back.
export const INITIAL_MATCH_STATE: MatchState = { progress: 0, status: "pending" };

export interface TokenStep {
  state: MatchState;
  /**
   * The counter change this SINGLE token causes: +1 the instant it
   * completes a fresh valid repetition, -1 the instant it proves a
   * previously-valid repetition was only a prefix of something longer,
   * 0 otherwise. Never anything but one of these three values — this
   * function processes exactly one token at a time, so "one utterance
   * produces one count" is a property of the function's own type
   * signature, not something a caller has to get right by careful
   * bookkeeping.
   */
  delta: -1 | 0 | 1;
}

// Advances `state` by exactly one new spoken word `token`. Pure and
// synchronous — no notion of recognition events, timers, or "final"
// results; see useVoiceTasbeeh for how a raw SpeechRecognition stream is
// turned into a sequence of calls to this function (and why a segment
// finalizing is NOT itself a signal used here).
export function applyToken(state: MatchState, token: string, targetTokens: string[]): TokenStep {
  const targetLen = targetTokens.length;
  if (targetLen === 0) return { state, delta: 0 };
  const firstWord = targetTokens[0];

  // The target's first word appearing is UNAMBIGUOUS proof a fresh
  // utterance is beginning right now, regardless of what the current
  // utterance's state was — CONSUME it (its credit, if any, is already
  // final and untouched) and start counting the new one from this token.
  const restart = (): TokenStep => {
    const progress = 1;
    const status: UtteranceStatus = progress === targetLen ? "valid" : "pending";
    return { state: { progress, status }, delta: status === "valid" ? 1 : 0 };
  };

  if (state.status === "valid") {
    // Anything other than a fresh restart proves this VALID utterance
    // was only the start of a longer/different phrase — e.g. target
    // "سبحان الله" followed by "وبحمده" — roll its credit back exactly
    // once, right here.
    return token === firstWord ? restart() : { state: { progress: 0, status: "invalid" }, delta: -1 };
  }

  if (state.status === "invalid") {
    // Already dead — nothing it ever accumulates here was credited, so
    // there is nothing to roll back; just keep waiting for a fresh start.
    return token === firstWord ? restart() : { state, delta: 0 };
  }

  // status === "pending": does this token extend the prefix correctly?
  if (token === targetTokens[state.progress]) {
    const progress = state.progress + 1;
    const status: UtteranceStatus = progress === targetLen ? "valid" : "pending";
    return { state: { progress, status }, delta: status === "valid" ? 1 : 0 };
  }
  // Breaks the prefix. Nothing was credited yet (still pending), so this
  // is INVALID with no rollback — unless the breaking token itself
  // happens to be the target's first word, in which case it's not really
  // "breaking" anything, it's simply a fresh utterance starting here.
  return token === firstWord ? restart() : { state: { progress: 0, status: "invalid" }, delta: 0 };
}

// Replays `tokens` through applyToken sequentially starting from `state`,
// returning the resulting state and the NET counter delta across all of
// them. useVoiceTasbeeh calls this with ONE recognition segment's CURRENT
// complete token snapshot every time that segment updates (interim or
// final) — always replayed fresh from a fixed checkpoint (the state as of
// the last segment that actually finalized), never by trying to compute
// "which tokens are new" from a possibly-revised previous snapshot. That
// checkpoint/replay split is what makes this robust to a real recognizer
// revising a segment's earlier words, shrinking it, or re-emitting it
// unchanged — every case is just "replay the CURRENT tokens from the same
// fixed starting point" and diff the resulting total against the LAST
// replay's total (see useVoiceTasbeeh) to know what to actually apply.
export function replayTokens(state: MatchState, tokens: string[], targetTokens: string[]): { state: MatchState; netDelta: number } {
  let current = state;
  let netDelta = 0;
  for (const token of tokens) {
    const step = applyToken(current, token, targetTokens);
    current = step.state;
    netDelta += step.delta;
  }
  return { state: current, netDelta };
}
