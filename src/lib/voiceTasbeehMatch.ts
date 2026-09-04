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
      // and LiveSegmentState.preSwitchSnapshot) — so a tainted completion
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

interface LiveSegmentState {
  id: number;
  // The actual tokens (content, not merely a count) of this segment
  // already spent on an EMITTED completion or excluded by a target switch
  // — permanently excluded from future replay of this segment. Verified
  // against the live transcript's own current tokens on every event (see
  // resolveReplayWindow below) rather than trusted as a fixed offset: real
  // SpeechRecognition interim results can revise/re-segment an already-
  // reported span (observed on the real device capture shrinking a single
  // still-live result from 37 tokens to 1), so a plain token-COUNT offset
  // can silently misalign and either drop genuinely new post-switch/post-
  // completion speech or evaluate it against the wrong slice. Content-based
  // verification makes that misalignment self-correcting instead.
  resolvedPrefix: string[];
  // The full tokenization of this segment's text as of the last event —
  // used to (a) detect genuinely new content for the inactivity-watchdog
  // signal, never for counting, and (b) let a target switch lock out
  // "everything observed so far" as real content (see setTarget).
  lastTokens: string[];
  // How many completions have already been returned to the caller for the
  // CURRENT target, within this live segment (reset to 0 in setTarget —
  // see there). This is the authoritative "already delivered" boundary
  // for the resolveReplayWindow FALLBACK case: when a late ASR revision
  // changes a token inside the already-locked resolvedPrefix, replay() is
  // re-run over the segment's ENTIRE current tokens from progress 0 (see
  // ReplayWindow's own doc comment) — which necessarily re-derives every
  // completion ever found in that span, including ones an earlier event
  // already reported. Without this counter that structurally-correct
  // re-derivation would be handed to the caller a second time, double-
  // counting a repetition the user only said once (proven on a real
  // device capture: 3 genuine completions delivered via interim events,
  // then re-derived and re-reported a second time when the final event's
  // fallback replay ran). It never influences matching itself — replay()'s
  // strict rules are completely untouched — only how many of a replay
  // pass's completions are genuinely new versus already-reported.
  deliveredCompletionCount: number;
  // Frozen snapshot of lastTokens taken at the moment of the most recent
  // target switch (see setTarget) — empty for a brand-new live segment
  // (a segment that's never been seen before is chronologically all
  // post-switch by construction, so there's nothing to snapshot). Used
  // ONLY via computePreSwitchFloor below, every event, to derive how much
  // of the CURRENT tokens still plausibly represents that pre-switch
  // content — a plain stored INDEX would not survive a later revision
  // reshaping/re-segmenting that exact span (proven necessary by this
  // file's own "does not lose new post-switch speech when a revision
  // shrinks the pre-switch prefix's own token count" regression test —
  // an index-based first attempt at this exact guard failed it). Storing
  // the content itself and re-deriving the boundary fresh each time,
  // the same way resolveReplayWindow re-verifies resolvedPrefix, makes a
  // revision of the pre-switch span self-correcting instead of stale.
  // resolvedPrefix's own exclusion already keeps pre-switch content out
  // of the ORDINARY (non-fallback) replay path; this closes the SAME
  // guarantee for the FALLBACK path (see ReplayWindow), which replays
  // the segment's entire token history from scratch and would otherwise
  // have no way to tell pre-switch tokens apart from genuinely new ones
  // (proven exposure on a real device capture: a fallback replay
  // re-walked content from three targets ago against the current one —
  // it happened to find no false completion only because the words
  // didn't spell out the current target, not because anything prevented
  // it structurally).
  preSwitchSnapshot: string[];
}

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
  // LiveSegmentState.deliveredCompletionCount, which is what keeps that
  // re-derivation from being reported to the caller twice.
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
  // when a fallback replay re-derived completions an earlier event for
  // this same live segment already reported (see
  // LiveSegmentState.deliveredCompletionCount).
  completionsEmitted: number;
  matchProgressAfter: number;
  resolvedPrefixAfter: readonly string[] | null;
  committed: boolean;
  hadGenuineActivity: boolean;
}

// Read-only point-in-time view of the matcher's own state, for logging
// around setTarget (target-switch diagnostics) without exposing any
// mutable reference to internal state.
export interface MatcherSnapshot {
  targetTokens: readonly string[];
  matchProgress: number;
  liveSegment: {
    id: number;
    resolvedPrefix: readonly string[];
    lastTokens: readonly string[];
    preSwitchSnapshot: readonly string[];
  } | null;
  committedSegmentCount: number;
}

// The core Voice Tasbeeh matching/extraction engine. Deliberately has no
// knowledge of SpeechRecognition itself — it only consumes small,
// normalized SegmentUpdate values (see useVoiceTasbeeh.ts for the browser
// event adapter), so it is fully testable without any browser/DOM mocking.
export class VoiceTasbeehMatcher {
  private targetTokens: string[] = [];
  private matchProgress = 0;
  private liveSegment: LiveSegmentState | null = null;
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
      liveSegment: this.liveSegment
        ? {
            id: this.liveSegment.id,
            resolvedPrefix: this.liveSegment.resolvedPrefix,
            lastTokens: this.liveSegment.lastTokens,
            preSwitchSnapshot: this.liveSegment.preSwitchSnapshot,
          }
        : null,
      committedSegmentCount: this.committedIndices.size,
    };
  }

  setTarget(phrase: string): void {
    this.targetTokens = tokenize(phrase);
    this.matchProgress = 0;
    // liveSegment.id / committedIndices are deliberately left untouched:
    // switching targets must not restart recognition or discard raw
    // transport-dedup bookkeeping. But everything OBSERVED so far in the
    // current live segment — even the part that never completed anything
    // and was therefore still transient/replayable — must be locked out
    // of any future replay right now. Without this, a still-in-progress
    // (non-completing) attempt against the OLD target would remain in the
    // replay window and could get silently re-walked against the NEW
    // target on the next event, letting words spoken before the switch
    // satisfy it. Extending resolvedPrefix to the segment's last observed
    // tokens (real content, not just a count — see resolveReplayWindow)
    // closes that gap: only content that arrives AFTER this point is ever
    // evaluated against the new target, and that boundary self-corrects on
    // the next event even if the browser later revises this exact span.
    if (this.liveSegment !== null && this.liveSegment.lastTokens.length > this.liveSegment.resolvedPrefix.length) {
      this.liveSegment.resolvedPrefix = this.liveSegment.lastTokens.slice();
    }
    // deliveredCompletionCount is scoped to the CURRENT target (replay()
    // is always run against this.targetTokens, so a fallback replay's
    // completions count only ever reflects the target active right now) —
    // it must reset here for exactly the same reason matchProgress does
    // just above: a switch starts a genuinely fresh completion-counting
    // cycle. Leaving it un-reset would let a stale count from the OLD
    // target either wrongly suppress a genuinely new completion of the
    // NEW target (if the old count happened to be larger) or, more
    // rarely, let one slip through uncounted.
    // preSwitchSnapshot captures the boundary itself: everything observed
    // in this live segment UP TO this exact instant predates the target
    // now active, so it may never, by itself, satisfy that target — see
    // computePreSwitchFloor and LiveSegmentState's doc comment. Content
    // (not a count), captured fresh at every switch, so a later revision
    // that reshapes this exact span is self-correcting rather than stale.
    if (this.liveSegment !== null) {
      this.liveSegment.deliveredCompletionCount = 0;
      this.liveSegment.preSwitchSnapshot = this.liveSegment.lastTokens.slice();
    }
  }

  // Call when a NEW native SpeechRecognition session starts, including a
  // transparent restart after the browser drops the session on its own.
  // Clears per-native-session transport bookkeeping only. matchProgress is
  // deliberately left untouched — partial progress toward the current
  // target must survive an invisible restart.
  resetSession(): void {
    this.liveSegment = null;
    this.committedIndices = new Set();
  }

  // Full reset for an explicit disable or a 60-second inactivity timeout —
  // every session-scoped piece of matching state is cleared, so the next
  // activation starts genuinely fresh.
  resetAll(): void {
    this.matchProgress = 0;
    this.liveSegment = null;
    this.committedIndices = new Set();
  }

  processSegment(update: SegmentUpdate): ProcessResult {
    if (this.targetTokens.length === 0) {
      return { completions: 0, hadGenuineActivity: false };
    }
    if (this.committedIndices.has(update.segmentId)) {
      // Already finalized and locked — a resend of old/duplicate final
      // content is ignored outright.
      return { completions: 0, hadGenuineActivity: false };
    }

    if (this.liveSegment === null || this.liveSegment.id !== update.segmentId) {
      this.liveSegment = { id: update.segmentId, resolvedPrefix: [], lastTokens: [], deliveredCompletionCount: 0, preSwitchSnapshot: [] };
    }
    const state = this.liveSegment;
    const observedLengthBefore = state.lastTokens.length;

    const tokens = tokenize(update.text);
    const { toReplay, excludedCount } = resolveReplayWindow(tokens, state.resolvedPrefix);
    const resolvedPrefixBefore = state.resolvedPrefix;
    const matchProgressBefore = this.matchProgress;
    // Re-derived fresh from the frozen snapshot every event (not stored),
    // for exactly the reason resolveReplayWindow re-verifies resolvedPrefix
    // rather than trusting a stale offset — see computePreSwitchFloor.
    const postSwitchFloor = computePreSwitchFloor(tokens, state.preSwitchSnapshot);
    const result = replay(toReplay, this.targetTokens, this.matchProgress, excludedCount, postSwitchFloor);

    // Genuine activity: content beyond what's ever been observed before
    // for this segment, AND at least one of those newly-observed tokens
    // engaged the current target attempt (anything but reject). A pure
    // duplicate/replayed/unchanged event never reaches the length check;
    // continuous but clearly off-target speech reaches it but never
    // passes the outcome check.
    const newSinceObservedLocalIndex = Math.max(0, observedLengthBefore - excludedCount);
    const hadGenuineActivity =
      tokens.length > observedLengthBefore &&
      result.tokenOutcomes.slice(newSinceObservedLocalIndex).some((o) => o !== "reject");

    // Duplicate-completion guard (see LiveSegmentState.deliveredCompletionCount
    // above). `excludedCount < resolvedPrefixBefore.length` is exactly the
    // resolveReplayWindow FALLBACK signature — the only case where
    // `toReplay` can include territory an earlier event already replayed
    // and reported completions from. The ordinary (non-fallback) path's
    // `toReplay` never includes anything behind the lock boundary, so
    // every completion it finds is unconditionally new.
    const usedFallbackReplay = excludedCount < resolvedPrefixBefore.length;
    const completionsToEmit = usedFallbackReplay
      ? Math.max(0, result.completions.length - state.deliveredCompletionCount)
      : result.completions.length;
    state.deliveredCompletionCount = usedFallbackReplay
      ? Math.max(state.deliveredCompletionCount, result.completions.length)
      : state.deliveredCompletionCount + completionsToEmit;

    let committed = false;
    if (update.isFinal) {
      // Finalized text can never change again — persist its ending
      // progress durably and lock the whole segment out of any future
      // replay.
      this.matchProgress = result.endProgress;
      this.committedIndices.add(update.segmentId);
      this.liveSegment = null;
      committed = true;
    } else if (result.completions.length > 0) {
      // At least one repetition was emitted from this (still-interim)
      // text. Lock only up to the last completion — anything after it is
      // transient trailing progress toward the NEXT repetition and stays
      // replayable, not yet durable. Expressed as actual token CONTENT
      // (a slice of the current, just-tokenized text), not a count, so a
      // later revision of this exact span can be detected rather than
      // blindly trusted.
      const lastLocalIndex = result.completions[result.completions.length - 1];
      state.resolvedPrefix = tokens.slice(0, excludedCount + lastLocalIndex + 1);
      state.lastTokens = tokens;
      this.matchProgress = 0;
    } else {
      // No completion — this entire replay result is transient and is
      // discarded; matchProgress is left untouched so the same
      // not-yet-resolved tail is replayed fresh, from its current text,
      // on the next event.
      state.lastTokens = tokens;
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
      resolvedPrefixAfter: committed ? null : state.resolvedPrefix,
      committed,
      hadGenuineActivity,
    });

    return { completions: completionsToEmit, hadGenuineActivity };
  }
}
