import { tokenize, tokensAreEquivalent } from "./voiceTasbeehNormalize";

export type TokenOutcome = "match" | "restart" | "noise" | "reject";

interface ReplayResult {
  endProgress: number;
  // Local indices within the replayed token list where a repetition
  // completed (0-based position of the completing token).
  completions: number[];
  tokenOutcomes: TokenOutcome[];
}

// Arabic ASR sometimes recognizes a و-prefixed word — written, per standard
// orthography, as a single fused token ("والله", "والحمد", "وبحمده" — the
// target's own tokenization always keeps these fused, since tokenize()
// only splits on whitespace) — as TWO separate adjacent recognized words:
// a standalone "و" followed by the word's own remainder (observed live on
// a real device: target token "والله" arrived as ["و","الله"]). This is
// generic across ANY target token shaped like this, not curated per word —
// it requires the observed pair to be EXACTLY "و" followed by a token
// equivalent (same tolerance tier as any other comparison, via
// tokensAreEquivalent) to that expected target token's own remainder after
// its leading و, with the two observed tokens strictly adjacent. It is NOT
// "ignore و", "skip a token", or "accept a different word": a lone "و" not
// immediately followed by the correct remainder still falls through to the
// ordinary noise/reject handling below exactly as before (see the
// dedicated regression tests for the adversarial "و صباح الله" shape).
function isCliticSplitMatch(first: string, second: string, expectedTargetToken: string): boolean {
  if (first !== "و") return false;
  if (expectedTargetToken.length < 2 || expectedTargetToken[0] !== "و") return false;
  return tokensAreEquivalent(second, expectedTargetToken.slice(1));
}

// True when `spoken` is a straightforward, letter-for-letter-correct
// PREFIX of `expected` — every character already present in `spoken` is
// correct and in order, with one or more characters missing off the END.
// Models a generic SpeechRecognition failure mode (observed live, on more
// than one word, in more than one position of a phrase — see the callers
// below): the recognizer sometimes stops transcribing a word partway
// through — anywhere in the phrase, not only its last word — even though
// the user pronounced it completely and correctly, and the browser NEVER
// supplies the missing tail in any later revision. Deliberately NOT a
// general edit-distance/subsequence rule: a substitution, an insertion,
// or a mismatch anywhere but the trailing position is never tolerated —
// only "the recognizer ran out partway through, near the end, of this
// SPECIFIC word." The length-3 floor on `spoken` is set from the
// shortest real truncation observed live ("قدي" for "قدير") rather than
// an arbitrary round number — short enough to cover every known real
// case, no shorter, so a 1-2 character fragment can never itself count
// as "confirmed" evidence of a much longer word.
//
// This intentionally does NOT live in tokensAreEquivalent (see that
// file's own doc comment on why): a bare string-pair comparison cannot
// tell "قدي" (a genuine truncation of "قدير") apart from "الله" (a real,
// different, extremely common word that also happens to be a
// letter-for-letter prefix of "اللهم", a real library token) — the
// decision needs the surrounding TARGET SEQUENCE as context, which only
// callers with access to targetTokens (i.e. replay(), below) have.
function isAsrTruncatedForm(spoken: string, expected: string): boolean {
  return spoken.length >= 3 && spoken.length < expected.length && expected.startsWith(spoken);
}

// True when `expected` is a و-prefixed word (e.g. "والله", "وسبحان") and
// `spoken` is an exact match (same tolerance tier as any other comparison,
// via tokensAreEquivalent) for `expected` with that leading "و" removed.
// A distinct, generic SpeechRecognition failure mode from isCliticSplitMatch
// above: there, the leading و survives as its OWN separate recognized
// token ("و" + "الله"); here, it is dropped from the audio entirely — the
// recognizer never produces it in any form, in any later revision, for
// either token or word (observed live, on more than one و-prefixed word in
// more than one dhikr — see voice-tasbeeh-validation-report.md). This is a
// property of the EXPECTED TARGET TOKEN's own shape (does it start with
// و?), not any specific dhikr's wording, and requires an exact match to
// the remainder — never an approximate/fuzzy one.
function isDroppedWaClitic(spoken: string, expected: string): boolean {
  return expected.length > 1 && expected[0] === "و" && tokensAreEquivalent(spoken, expected.slice(1));
}

// The mirror image of isDroppedWaClitic: `spoken` carries a spurious LEADING
// "و" that `expected` (the target token at this position) does not have at
// all — e.g. target "بكرة" recognized as "وبكرة" (observed live — see
// voice-tasbeeh-validation-report.md). A likely coarticulation/liaison
// artifact from the preceding word's own ending, not a different word.
// Deliberately NOT a general/context-free normalization equivalence (i.e.
// does not live in tokensAreEquivalent): the real dhikr library contains
// pairs of genuinely different, adjacent tokens with exactly this same
// "و" + word shape and the same length delta (e.g. "الله" vs "والله" in
// item 10/13's own "...الا الله والله اكبر") — a blanket string-level
// equivalence would conflate them everywhere tokensAreEquivalent is
// consulted (restart-detection, noise/truncation anti-collision), not just
// at one intended position. Scoped here to replay()'s own per-position
// walk instead — exactly like isDroppedWaClitic — so it only ever
// substitutes for the ONE specific token currently expected, never
// generally declares the two words interchangeable.
function isInsertedWaClitic(spoken: string, expected: string): boolean {
  return spoken.length > 1 && spoken[0] === "و" && tokensAreEquivalent(spoken.slice(1), expected);
}

// Pure, disposable walk through `tokens` against `targetTokens`, starting
// from `startProgress`. This is re-run in FULL, from the last durable
// checkpoint, every single time the live segment's text changes — never
// incrementally patched. That is the entire mechanism that prevents a
// revised/corrected earlier word from leaving stale progress standing:
// there is no incremental state here for a revision to leave behind, since
// nothing is trusted here beyond this one call.
function replay(
  tokens: string[],
  targetTokens: string[],
  startProgress: number,
  absoluteOffset: number,
  postSwitchFloor: number,
): ReplayResult {
  const N = targetTokens.length;
  let progress = startProgress;
  let noiseBudget = 1;
  const completions: number[] = [];
  const tokenOutcomes: TokenOutcome[] = [];
  // Whether the CURRENTLY open attempt (progress > 0) began at a token
  // whose absolute position (absoluteOffset + its own local index) is
  // before postSwitchFloor — i.e. was spoken before the most recent
  // target switch (see computePreSwitchFloor). Meaningless
  // while progress === 0. A nonzero `startProgress` passed in from the
  // caller is always trusted as untainted: the only way matchProgress is
  // ever durably carried in nonzero is via a PRIOR isFinal commit that
  // itself already applied this exact floor check before being written
  // (see the end of this function and processSegment) — by induction, an
  // incoming nonzero startProgress can never already be tainted.
  let attemptTainted = false;

  let i = 0;
  while (i < tokens.length) {
    const w = tokens[i];
    const next = i + 1 < tokens.length ? tokens[i + 1] : null;
    let outcome: TokenOutcome;
    // How many raw tokens this step consumes — 2 only when a و/remainder
    // clitic split is recognized below, 1 in every other (unchanged) case.
    let consumed = 1;
    // Whether THIS token, if it turns out to start a fresh attempt below,
    // is itself pre-switch content. Computed once per token; only ever
    // consulted by a branch that establishes a NEW attempt start.
    const tokenIsPreSwitch = absoluteOffset + i < postSwitchFloor;

    if (progress < N && tokensAreEquivalent(w, targetTokens[progress])) {
      // Expected next token of the current attempt (exact, or a curated
      // pronunciation/ASR variant of it).
      outcome = "match";
      if (progress === 0) attemptTainted = tokenIsPreSwitch;
      progress += 1;
      noiseBudget = 1;
    } else if (progress < N && next !== null && isCliticSplitMatch(w, next, targetTokens[progress])) {
      // The expected next token, but split by the recognizer into "و" +
      // its remainder — treated as ONE logical match consuming both.
      outcome = "match";
      if (progress === 0) attemptTainted = tokenIsPreSwitch;
      progress += 1;
      noiseBudget = 1;
      consumed = 2;
    } else if (
      progress > 0 &&
      progress < N &&
      progress + 1 < N &&
      targetTokens[progress] === targetTokens[progress - 1] &&
      tokensAreEquivalent(w, targetTokens[progress + 1])
    ) {
      // Generic ASR degemination: the TARGET's own sequence repeats a
      // token immediately (targetTokens[progress-1] === targetTokens[progress]
      // — e.g. "... لا شريك له، له الملك ..." has "له" twice in a row) and
      // the recognizer has been observed, live, to collapse the spoken
      // repetition down to a single instance, going straight from the
      // first occurrence into whatever word actually follows the SECOND
      // one (observed live — see voice-tasbeeh-validation-report.md). This
      // is a property of the TARGET'S OWN token sequence (any dhikr whose
      // wording happens to repeat a word back-to-back is covered, not a
      // curated word list) — not fuzzy matching, since `w` must still be
      // an EXACT match (via tokensAreEquivalent) to the token that
      // genuinely follows the duplicate. The single spoken instance
      // already consumed by the PRIOR loop iteration (which is what put
      // `progress` here, one past the duplicate's first occurrence) is
      // treated as having satisfied both the duplicate slot and this new
      // word, so progress jumps by 2 rather than 1. Checked BEFORE the
      // restart branches below for the same reason the plain match/
      // clitic-split branches are: continuing the CURRENT attempt must
      // always be preferred over reinterpreting this token as a false
      // start whenever both readings are structurally possible (proven
      // necessary by an analogous collision on isDroppedWaClitic just
      // below — see that one's own regression coverage).
      outcome = "match";
      progress += 2;
      noiseBudget = 1;
    } else if (progress > 0 && progress < N && isDroppedWaClitic(w, targetTokens[progress])) {
      // Generic ASR leading-wa-clitic loss (see isDroppedWaClitic) — the
      // recognizer dropped a target token's leading "و" entirely, rather
      // than surfacing it as its own separate token (that case is already
      // handled above by isCliticSplitMatch). Observed live on more than
      // one و-prefixed word, in more than one dhikr, so this is keyed
      // purely off the expected TARGET token's own shape (does it start
      // with و?) — never a curated per-dhikr word list, and never an
      // approximate match: `w` must exactly equal the token's own
      // remainder after that leading و. Requires progress > 0 — i.e. this
      // only continues an ATTEMPT ALREADY IN PROGRESS, never starts one
      // cold: both real occurrences observed live happened well into an
      // otherwise-matching attempt (see voice-tasbeeh-validation-report.md),
      // and requiring that momentum is what keeps an isolated, unrelated
      // bare word elsewhere in ordinary speech from spuriously satisfying
      // a و-prefixed target token with no surrounding evidence at all
      // (see the dedicated "unrelated word between و and the remainder
      // must NOT match" regression test). Checked BEFORE the restart
      // branches below — NOT after, like isAsrTruncatedForm is — because
      // the dropped-و remainder can itself legitimately equal the
      // target's own first token (e.g. target "... ولا قوة ..." drops its
      // و to bare "لا", which is ALSO this target's literal first word);
      // continuing the current attempt must win that reading, or a
      // genuine mid-phrase drop gets misread as a false-start restart and
      // the rest of the attempt is lost (proven live — see the dedicated
      // library-wide regression test for this exact collision).
      outcome = "match";
      if (progress === 0) attemptTainted = tokenIsPreSwitch;
      progress += 1;
      noiseBudget = 1;
    } else if (progress > 0 && progress < N && isInsertedWaClitic(w, targetTokens[progress])) {
      // Generic ASR leading-wa-clitic INSERTION (see isInsertedWaClitic) —
      // the mirror image of the dropped-و case just above: here the
      // recognizer added a spurious leading "و" the target token doesn't
      // have at all, most likely a coarticulation artifact from the
      // preceding word's own ending rather than a different word (observed
      // live — see voice-tasbeeh-validation-report.md). Same progress > 0
      // requirement as the dropped-و case and for the same reason: this
      // must only ever continue an attempt already underway, never start
      // one cold, so an isolated و-prefixed word elsewhere in ordinary
      // speech can never spuriously satisfy an unprefixed target token
      // with no surrounding evidence. Checked BEFORE the restart branches
      // below for the same collision reason as the dropped-و case: the
      // inserted form could otherwise coincidentally read as a false-start
      // restart instead of a continuation.
      outcome = "match";
      if (progress === 0) attemptTainted = tokenIsPreSwitch;
      progress += 1;
      noiseBudget = 1;
    } else if (progress > 0 && tokensAreEquivalent(w, targetTokens[0])) {
      // Doesn't continue the current attempt, but IS the target's own
      // first word — a false start/restart, not noise. The token is
      // consumed as the first token of a fresh attempt rather than
      // dropped, so a genuine retry ("سبحان... سبحان الله") isn't lost.
      outcome = "restart";
      progress = 1;
      attemptTainted = tokenIsPreSwitch; // a restart is ALWAYS a fresh attempt start
      noiseBudget = 1;
    } else if (progress > 0 && next !== null && isCliticSplitMatch(w, next, targetTokens[0])) {
      // Same false-start/restart, but the target's own first word was
      // itself split into "و" + remainder.
      outcome = "restart";
      progress = 1;
      attemptTainted = tokenIsPreSwitch;
      noiseBudget = 1;
      consumed = 2;
    } else if (
      progress < N &&
      isAsrTruncatedForm(w, targetTokens[progress]) &&
      !targetTokens.some((t) => tokensAreEquivalent(w, t))
    ) {
      // Generic ASR-truncation match: `w` is a straightforward prefix of
      // the expected next token, missing only trailing characters (see
      // isAsrTruncatedForm) — AND `w`, taken as a complete word, does not
      // already equal some OTHER token anywhere in THIS target's own
      // sequence (the same anti-collision principle the noise-tolerance
      // branch below already applies, just checked against the full
      // vocabulary rather than only short filler words). That second
      // condition is what keeps this from ever mistaking one real target
      // word for a different one: a truncation candidate that is ALSO a
      // genuine, different word actually used elsewhere in this same
      // target (e.g. "الله" as a would-be truncation of "اللهم", when
      // "الله" already appears on its own elsewhere in the phrase) is
      // correctly left to fall through to the ordinary reject below
      // instead. Treated as a full, permanent match — progress advances
      // exactly as it would for an exact match — rather than a
      // provisional "wait and see": the browser may never supply the
      // missing characters in any later revision, and the surrounding
      // phrase already confirms the intended word.
      outcome = "match";
      if (progress === 0) attemptTainted = tokenIsPreSwitch;
      progress += 1;
      noiseBudget = 1;
    } else if (noiseBudget > 0 && w.length <= 2 && !targetTokens.includes(w)) {
      // Tolerated exactly once per attempt: short (<=2 normalized chars)
      // AND not equal to ANY token anywhere in the current target's own
      // sequence — so a real word belonging to this target, however
      // short, is never silently discarded (it would already have hit
      // the match/restart branches above, or a REJECT below if spoken
      // out of order). A lone "و" whose next token did NOT match any
      // expected remainder above falls through to here exactly as before.
      outcome = "noise";
      noiseBudget -= 1;
    } else {
      // A substantial word that doesn't belong to this attempt, or a
      // second stray token in a row with no budget left — the system
      // decides this utterance is no longer the selected dhikr.
      outcome = "reject";
      progress = 0;
      attemptTainted = false;
    }

    for (let k = 0; k < consumed; k++) tokenOutcomes.push(outcome);

    if (progress === N) {
      // A completion is only genuine if EVERY token of the attempt that
      // produced it — from its very first consumed token through this
      // one — was spoken at or after postSwitchFloor. An attempt that
      // began on pre-switch content must never be allowed to satisfy the
      // CURRENT target, no matter how many legitimately post-switch
      // tokens it went on to consume afterward (see computePreSwitchFloor
      // and VoiceTasbeehMatcher's own preSwitchSnapshot field below) — so a
      // tainted completion
      // is silently dropped here rather than pushed. Progress still resets
      // normally either way: dropping a tainted completion must never
      // corrupt the walk's ability to recognize the NEXT, genuinely
      // fresh attempt right after it.
      if (!attemptTainted) {
        completions.push(i + consumed - 1);
      }
      progress = 0;
      attemptTainted = false;
      noiseBudget = 1;
    }

    i += consumed;
  }

  // A still-open, not-yet-complete attempt must never durably carry
  // forward (via endProgress -> matchProgress, see processSegment) if it
  // began before the switch boundary — otherwise pre-switch words could
  // silently supply part of a completion that only finishes on a LATER,
  // genuinely post-switch event, which would be just as much a violation
  // as an outright tainted completion above.
  if (progress > 0 && attemptTainted) {
    progress = 0;
  }

  return { endProgress: progress, completions, tokenOutcomes };
}

// CROSS-SEGMENT DURABILITY (the exactly-once fix): resolvedPrefix,
// deliveredCompletionCount, and preSwitchSnapshot below all live directly on
// VoiceTasbeehMatcher itself — scoped to the CURRENT TARGET *and current
// native session* (see resetSession below), exactly like matchProgress
// already was scoped to the current target — rather than nested inside a
// per-segmentId object that got discarded the instant `update.segmentId`
// changed. That per-segmentId reset was the actual bug: a real device
// capture proved a SpeechRecognition implementation that re-delivers
// already-finalized content under a BRAND NEW, never-reused segmentId on
// almost every event, all within one unbroken native session (e.g.
// segmentId 3, 4, and 5 all reporting the byte-identical final text
// "سبحان الله" in a row, with no restart between them — not three
// repetitions, one). Because the old per-segment object was rebuilt from
// scratch on every new id, each of those re-deliveries looked like fresh,
// never-before-seen text and was replayed — and credited — all over again
// (a real session: ~7 genuine repetitions produced ~65 credited
// completions). Moving this state onto the matcher itself makes the exact
// same prefix-verify-then-replay-only-the-tail strategy that already worked
// WITHIN one segment's own interim revisions (see resolveReplayWindow just
// below) survive a segmentId change too, AS LONG AS the native session
// hasn't changed — a new id, by itself, is no longer treated as proof of
// new content; only content genuinely beyond resolvedPrefix ever reaches
// replay(). Content-for-content matches (the same tolerant comparison used
// everywhere else) against what THIS target has already had credited THIS
// SESSION are excluded; the moment new text extends past that point (as any
// additional genuine repetition must, in every real capture examined),
// replay() sees it and scores it normally. A genuinely independent
// repetition that happens to arrive byte-identical to already-credited text
// with no session boundary and no extension in between is — by
// construction — indistinguishable from the confirmed bug pattern from
// content alone; resetSession (see below) is what keeps that from being a
// permanent trap, by scoping the resend-memory to one native session rather
// than the whole target's lifetime, so a genuinely new recognition burst
// (a new native session) always gets a clean slate.
//
// A lightweight, genuinely PER-segmentId pair — currentSegmentId/lastTokens
// below — remains: it exists only to compute `hadGenuineActivity` (has
// speech continued since we last looked, for the 60s watchdog) freshly for
// whatever native segment is presently arriving, which is a different
// question from "how much of this target has been credited" and must reset
// on a genuinely new segmentId — an actual new segment starting short (a
// single fresh word) must never be compared against a much longer prior
// segment's own length and wrongly read as "no new activity".

// How much of `tokens`' own prefix still plausibly represents
// `preSwitchSnapshot`'s content — the longest run, starting at index 0,
// where each position tokensAreEquivalent-matches the frozen snapshot at
// the same position. Deliberately a PARTIAL/longest-prefix match (unlike
// resolveReplayWindow's all-or-nothing prefixIntact check): a revision
// can re-segment/shrink the pre-switch span itself (fusing two of its own
// words into one, say), and the boundary must shrink right along with it
// rather than either falsely including newly-arrived post-switch content
// as pre-switch, or refusing to recognize the shrunk span as pre-switch
// at all.
function computePreSwitchFloor(tokens: string[], preSwitchSnapshot: string[]): number {
  let k = 0;
  while (k < preSwitchSnapshot.length && k < tokens.length && tokensAreEquivalent(tokens[k], preSwitchSnapshot[k])) {
    k += 1;
  }
  return k;
}

interface ReplayWindow {
  // The tokens to hand to replay() this event — either the tail after a
  // verified-intact resolvedPrefix, or (when that prefix no longer matches
  // the live transcript, i.e. a revision reshaped it) the segment's ENTIRE
  // current tokens, replayed fresh from the durable matchProgress. This is
  // the "re-align from the latest safe boundary" behavior: it never trusts
  // a stale numeric offset, so genuinely new content can never be silently
  // sliced away just because a revision changed the token count of
  // already-resolved content. The cost: the fallback can re-derive
  // completions an earlier event already reported (proven on a real
  // device capture, not merely theoretical) — see
  // VoiceTasbeehMatcher's own deliveredCompletionCount field, which is what
  // keeps that re-derivation from being reported to the caller twice.
  toReplay: string[];
  // How many of the segment's current tokens were excluded from toReplay
  // (0 in the fallback case) — needed to translate a local completion
  // index back into a position in the full current token array.
  excludedCount: number;
}

// Verifies whether `resolvedPrefix` still appears, content-for-content, at
// the front of `tokens` (using the same tokensAreEquivalent tolerance
// replay() itself uses, so a tolerated ASR letter-substitution revision of
// an already-resolved word doesn't itself count as "changed"). Falls back
// to replaying everything from scratch the moment that's no longer true,
// rather than blindly slicing by the old prefix's length.
function resolveReplayWindow(tokens: string[], resolvedPrefix: string[]): ReplayWindow {
  const prefixIntact =
    tokens.length >= resolvedPrefix.length && resolvedPrefix.every((expected, idx) => tokensAreEquivalent(tokens[idx], expected));
  if (prefixIntact) {
    return { toReplay: tokens.slice(resolvedPrefix.length), excludedCount: resolvedPrefix.length };
  }
  return { toReplay: tokens.slice(0), excludedCount: 0 };
}

export interface SegmentUpdate {
  // Identifies which recognition result this update belongs to
  // (SpeechRecognitionEvent's resultIndex, in the real adapter). Used
  // only for transport-level dedup — never as the identity of a
  // repetition; a repetition's identity is purely "matchProgress reached
  // the target length" inside replay() above.
  segmentId: number;
  text: string;
  isFinal: boolean;
}

export interface ProcessResult {
  completions: number;
  hadGenuineActivity: boolean;
}

// DEV-ONLY diagnostic surface. Purely observational: nothing in this file
// reads its own debug output back, so wiring a callback (or not) can never
// change a single matching decision — every existing call site that
// constructs `new VoiceTasbeehMatcher()` with no argument (every test, and
// production when no debug consumer is wired up) behaves byte-for-byte as
// before. See useVoiceTasbeeh.ts for the dev-only consumer that turns this
// into console/log output; that file gates it behind import.meta.env.DEV,
// not this one, so this engine stays framework-agnostic and independently
// testable exactly as its existing doc comment describes.
export interface MatcherDebugEvent {
  segmentId: number;
  rawText: string;
  isFinal: boolean;
  targetTokens: readonly string[];
  tokens: string[];
  resolvedPrefixBefore: readonly string[];
  toReplay: readonly string[];
  excludedCount: number;
  postSwitchFloor: number;
  matchProgressBefore: number;
  tokenOutcomes: readonly TokenOutcome[];
  completionLocalIndices: readonly number[];
  // How many of completionLocalIndices were actually returned to the
  // caller this event — differs from completionLocalIndices.length only
  // when a fallback replay re-derived completions an earlier event already
  // reported for this same target (see VoiceTasbeehMatcher's own
  // deliveredCompletionCount field).
  completionsEmitted: number;
  matchProgressAfter: number;
  resolvedPrefixAfter: readonly string[];
  committed: boolean;
  hadGenuineActivity: boolean;
}

// Read-only point-in-time view of the matcher's own state, for logging
// around setTarget (target-switch diagnostics) without exposing any
// mutable reference to internal state.
export interface MatcherSnapshot {
  targetTokens: readonly string[];
  matchProgress: number;
  resolvedPrefix: readonly string[];
  preSwitchSnapshot: readonly string[];
  currentSegmentId: number | null;
  lastTokens: readonly string[];
  committedSegmentCount: number;
}

// The core Voice Tasbeeh matching/extraction engine. Deliberately has no
// knowledge of SpeechRecognition itself — it only consumes small,
// normalized SegmentUpdate values (see useVoiceTasbeeh.ts for the browser
// event adapter), so it is fully testable without any browser/DOM mocking.
export class VoiceTasbeehMatcher {
  private targetTokens: string[] = [];
  private matchProgress = 0;
  // Cross-segment, target-scoped durable state — see the large comment
  // above this class for why these three exist and why they must NOT be
  // reset merely because `SegmentUpdate.segmentId` changes (that reset was
  // the exactly-once bug this file was rewritten to fix).
  private resolvedPrefix: string[] = [];
  private deliveredCompletionCount = 0;
  private preSwitchSnapshot: string[] = [];
  // Per-segmentId bookkeeping — see the same comment above for why this
  // pair is deliberately kept SEPARATE from the three fields above and
  // does reset on a genuinely new segmentId.
  private currentSegmentId: number | null = null;
  private lastTokens: string[] = [];
  private committedIndices = new Set<number>();
  private onDebug?: (event: MatcherDebugEvent) => void;

  // Optional — omit entirely for production/tests with no observer wired
  // up (the overwhelmingly common case; every existing call site passes
  // nothing). See MatcherDebugEvent above.
  constructor(onDebug?: (event: MatcherDebugEvent) => void) {
    this.onDebug = onDebug;
  }

  getDebugSnapshot(): MatcherSnapshot {
    return {
      targetTokens: this.targetTokens,
      matchProgress: this.matchProgress,
      resolvedPrefix: this.resolvedPrefix,
      preSwitchSnapshot: this.preSwitchSnapshot,
      currentSegmentId: this.currentSegmentId,
      lastTokens: this.lastTokens,
      committedSegmentCount: this.committedIndices.size,
    };
  }

  setTarget(phrase: string): void {
    this.targetTokens = tokenize(phrase);
    this.matchProgress = 0;
    // currentSegmentId/committedIndices are deliberately left untouched:
    // switching targets must not restart recognition or discard raw
    // transport-dedup bookkeeping.
    //
    // resolvedPrefix is unconditionally CLEARED (not extended to the last
    // observed tokens, as an earlier version of this method did) — it is
    // scoped to "content already credited toward THIS target" (see the
    // class-level comment above), and once the target itself changes that
    // scope is gone: nothing has ever been credited toward the new target
    // yet. Extending it to old content was actively harmful whenever the
    // new target happens to share a literal leading prefix with words
    // already credited to the OLD target (a real, adjacent pair in this
    // app's own library: "سبحان الله" -> "سبحان الله وبحمده") — it made
    // resolveReplayWindow's prefixIntact check falsely succeed against that
    // stale content, silently excluding the new target's own first word(s)
    // from ever being replayed against it at all. Isolation from
    // genuinely pre-switch content is instead handled precisely, per-token,
    // by preSwitchSnapshot/computePreSwitchFloor/attemptTainted below and
    // in replay() — a still-open (non-completing) OLD attempt is already
    // fully covered there and needs no help from resolvedPrefix.
    this.resolvedPrefix = [];
    // deliveredCompletionCount is scoped to the CURRENT target (replay()
    // is always run against this.targetTokens, so a fallback replay's
    // completions count only ever reflects the target active right now) —
    // it must reset here for exactly the same reason matchProgress does
    // just above: a switch starts a genuinely fresh completion-counting
    // cycle. Leaving it un-reset would let a stale count from the OLD
    // target either wrongly suppress a genuinely new completion of the
    // NEW target (if the old count happened to be larger) or, more
    // rarely, let one slip through uncounted.
    this.deliveredCompletionCount = 0;
    // preSwitchSnapshot captures the boundary itself: everything observed
    // UP TO this exact instant predates the target now active, so it may
    // never, by itself, satisfy that target — see computePreSwitchFloor and
    // the class-level comment above. Content (not a count), captured fresh
    // at every switch, so a later revision that reshapes this exact span
    // (or a segmentId change carrying it forward, per the same fix) is
    // self-correcting rather than stale.
    this.preSwitchSnapshot = this.lastTokens.slice();
  }

  // Call when a NEW native SpeechRecognition session starts, including a
  // transparent restart after the browser drops the session on its own.
  //
  // matchProgress survives untouched, as it always has: partial progress
  // toward the current target must survive an invisible restart.
  //
  // resolvedPrefix/deliveredCompletionCount are, since this fix, DELIBERATELY
  // cleared here — this is what keeps the cross-segment fix general rather
  // than indistinguishable from suppressing a legitimate fresh repetition.
  // resolvedPrefix's whole purpose is catching a resend of content already
  // seen in THIS NATIVE SESSION's own growing result stream (the confirmed
  // real-device bug: segment 3/4/5 all resending "سبحان الله" — all inside
  // ONE unbroken session, no restart between them). A brand new native
  // session means the browser's result-array numbering AND content starts
  // over from nothing, unrelated to the old stream — so old resolvedPrefix
  // content can no longer mean "already resend-checked", only "coincidence
  // if it ever matches again". Clearing it here is what lets a genuinely
  // separate repetition — one that happens to arrive as its own freshly
  // finalized result in a new session, with byte-identical text to a
  // previous repetition, exactly the shape a real repeated dhikr takes —
  // still be credited, instead of forever silently swallowed by a match
  // against long-past, session-unrelated content (seeing the difference
  // between those two cases is impossible from content alone; a new native
  // session is the one honest, timing-free, non-fuzzy signal available that
  // "this is a new recognition stream", so it is what this reset keys off).
  //
  // preSwitchSnapshot is cleared here too, for the identical reason: it
  // exists to isolate a genuinely still-open OLD-target attempt from a NEW
  // target's segments while both are still arriving within the SAME native
  // session (the window between calling setTarget and the browser actually
  // finishing its stop()/restart) — see the "target switching" and
  // "postSwitchFloor" test suites, which all exercise exactly that window
  // (setTarget followed immediately by more segments, same session, no
  // resetSession call). Once a native session genuinely ends and a new one
  // starts, that window has definitively closed: the new session's own
  // audio buffer starts capturing fresh from this instant, so nothing it
  // reports can possibly be pre-switch content by construction — carrying
  // preSwitchSnapshot forward past this point would only risk the mirror
  // problem resolvedPrefix's own carry-forward caused above, tainting a
  // new target's genuine completion just because it happens to restate
  // words the old target also used.
  resetSession(): void {
    this.resolvedPrefix = [];
    this.deliveredCompletionCount = 0;
    this.preSwitchSnapshot = [];
    this.currentSegmentId = null;
    this.lastTokens = [];
    this.committedIndices = new Set();
  }

  // Full reset for an explicit disable or a 60-second inactivity timeout —
  // every piece of matching state is cleared, so the next activation
  // starts genuinely fresh.
  resetAll(): void {
    this.matchProgress = 0;
    this.resolvedPrefix = [];
    this.deliveredCompletionCount = 0;
    this.preSwitchSnapshot = [];
    this.currentSegmentId = null;
    this.lastTokens = [];
    this.committedIndices = new Set();
  }

  processSegment(update: SegmentUpdate): ProcessResult {
    if (this.targetTokens.length === 0) {
      return { completions: 0, hadGenuineActivity: false };
    }
    if (this.committedIndices.has(update.segmentId)) {
      // Already finalized and locked — a resend of the SAME exact
      // segmentId is ignored outright. (A resend of its CONTENT under a
      // DIFFERENT segmentId — the actual bug this file now fixes — is
      // instead handled below via resolvedPrefix, which is not keyed to
      // segmentId at all.)
      return { completions: 0, hadGenuineActivity: false };
    }

    // Purely for hadGenuineActivity below — see the class-level comment on
    // why this pair is kept separate from resolvedPrefix/etc. and DOES
    // reset on a genuinely new segmentId.
    if (this.currentSegmentId !== update.segmentId) {
      this.currentSegmentId = update.segmentId;
      this.lastTokens = [];
    }
    const observedLengthBefore = this.lastTokens.length;

    const tokens = tokenize(update.text);
    const { toReplay, excludedCount } = resolveReplayWindow(tokens, this.resolvedPrefix);
    const resolvedPrefixBefore = this.resolvedPrefix;
    const matchProgressBefore = this.matchProgress;
    // Re-derived fresh from the frozen snapshot every event (not stored),
    // for exactly the reason resolveReplayWindow re-verifies resolvedPrefix
    // rather than trusting a stale offset — see computePreSwitchFloor.
    const postSwitchFloor = computePreSwitchFloor(tokens, this.preSwitchSnapshot);
    const result = replay(toReplay, this.targetTokens, this.matchProgress, excludedCount, postSwitchFloor);

    // Genuine activity: content beyond what's ever been observed before
    // for THIS segmentId (see currentSegmentId/lastTokens above), AND at
    // least one of those newly-observed tokens engaged the current target
    // attempt (anything but reject). A pure duplicate/replayed/unchanged
    // event never reaches the length check; continuous but clearly
    // off-target speech reaches it but never passes the outcome check.
    const newSinceObservedLocalIndex = Math.max(0, observedLengthBefore - excludedCount);
    const hadGenuineActivity =
      tokens.length > observedLengthBefore &&
      result.tokenOutcomes.slice(newSinceObservedLocalIndex).some((o) => o !== "reject");

    // Duplicate-completion guard (see deliveredCompletionCount's own field
    // comment above). `excludedCount < resolvedPrefixBefore.length` is
    // exactly the resolveReplayWindow FALLBACK signature — the only case
    // where `toReplay` can include territory an earlier event already
    // replayed and reported completions from. The ordinary (non-fallback)
    // path's `toReplay` never includes anything behind the lock boundary,
    // so every completion it finds is unconditionally new.
    const usedFallbackReplay = excludedCount < resolvedPrefixBefore.length;
    const completionsToEmit = usedFallbackReplay
      ? Math.max(0, result.completions.length - this.deliveredCompletionCount)
      : result.completions.length;
    this.deliveredCompletionCount = usedFallbackReplay
      ? Math.max(this.deliveredCompletionCount, result.completions.length)
      : this.deliveredCompletionCount + completionsToEmit;

    if (result.completions.length > 0) {
      // At least one repetition was found in this replay. Lock resolvedPrefix
      // only up to the LAST completion — anything after it is transient
      // trailing progress toward the NEXT repetition and stays replayable,
      // not yet durable, exactly like matchProgress resetting to 0 just
      // below (see the "no completion" branch's own comment for how that
      // trailing content still gets replayed correctly later, whether the
      // next event carries the same segmentId or — the fix — a different
      // one). Expressed as actual token CONTENT (a slice of the current,
      // just-tokenized text), not a count, so a later revision — or a
      // completely different segmentId restating this same content, see
      // the class-level comment — can be detected rather than blindly
      // trusted.
      const lastLocalIndex = result.completions[result.completions.length - 1];
      this.resolvedPrefix = tokens.slice(0, excludedCount + lastLocalIndex + 1);
      this.matchProgress = 0;
    } else if (update.isFinal) {
      // Finalized with no completion this time — persist the trailing
      // progress durably (matchProgress), exactly as before. resolvedPrefix
      // is deliberately NOT extended to cover this trailing content: it
      // stays replayable (via toReplay) on the next event, whatever
      // segmentId that event carries, and replay()'s own idempotent
      // restart/match handling (matchProgress and the still-unresolved
      // tail agreeing on the same content) makes re-walking it safe rather
      // than a double-count — proven by this file's own regression tests
      // reproducing the exact real-device sequence this fix targets.
      this.matchProgress = result.endProgress;
    }
    // else: no completion, not final — matchProgress and resolvedPrefix are
    // both left untouched, so the same not-yet-resolved tail is replayed
    // fresh, from its current text, on the next event — unchanged from
    // before this fix.

    this.lastTokens = tokens;
    const committed = update.isFinal;
    if (committed) {
      this.committedIndices.add(update.segmentId);
    }

    this.onDebug?.({
      segmentId: update.segmentId,
      rawText: update.text,
      isFinal: update.isFinal,
      targetTokens: this.targetTokens,
      tokens,
      resolvedPrefixBefore,
      toReplay,
      excludedCount,
      postSwitchFloor,
      matchProgressBefore,
      tokenOutcomes: result.tokenOutcomes,
      completionLocalIndices: result.completions,
      completionsEmitted: completionsToEmit,
      matchProgressAfter: this.matchProgress,
      resolvedPrefixAfter: this.resolvedPrefix,
      committed,
      hadGenuineActivity,
    });

    return { completions: completionsToEmit, hadGenuineActivity };
  }
}
