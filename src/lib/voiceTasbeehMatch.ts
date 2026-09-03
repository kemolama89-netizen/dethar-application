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

// Pure, disposable walk through `tokens` against `targetTokens`, starting
// from `startProgress`. This is re-run in FULL, from the last durable
// checkpoint, every single time the live segment's text changes — never
// incrementally patched. That is the entire mechanism that prevents a
// revised/corrected earlier word from leaving stale progress standing:
// there is no incremental state here for a revision to leave behind, since
// nothing is trusted here beyond this one call.
function replay(tokens: string[], targetTokens: string[], startProgress: number): ReplayResult {
  const N = targetTokens.length;
  let progress = startProgress;
  let noiseBudget = 1;
  const completions: number[] = [];
  const tokenOutcomes: TokenOutcome[] = [];

  let i = 0;
  while (i < tokens.length) {
    const w = tokens[i];
    const next = i + 1 < tokens.length ? tokens[i + 1] : null;
    let outcome: TokenOutcome;
    // How many raw tokens this step consumes — 2 only when a و/remainder
    // clitic split is recognized below, 1 in every other (unchanged) case.
    let consumed = 1;

    if (progress < N && tokensAreEquivalent(w, targetTokens[progress])) {
      // Expected next token of the current attempt (exact, or a curated
      // pronunciation/ASR variant of it).
      outcome = "match";
      progress += 1;
      noiseBudget = 1;
    } else if (progress < N && next !== null && isCliticSplitMatch(w, next, targetTokens[progress])) {
      // The expected next token, but split by the recognizer into "و" +
      // its remainder — treated as ONE logical match consuming both.
      outcome = "match";
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
      noiseBudget = 1;
    } else if (progress > 0 && next !== null && isCliticSplitMatch(w, next, targetTokens[0])) {
      // Same false-start/restart, but the target's own first word was
      // itself split into "و" + remainder.
      outcome = "restart";
      progress = 1;
      noiseBudget = 1;
      consumed = 2;
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
    }

    for (let k = 0; k < consumed; k++) tokenOutcomes.push(outcome);

    if (progress === N) {
      completions.push(i + consumed - 1);
      progress = 0;
      noiseBudget = 1;
    }

    i += consumed;
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
}

interface ReplayWindow {
  // The tokens to hand to replay() this event — either the tail after a
  // verified-intact resolvedPrefix, or (when that prefix no longer matches
  // the live transcript, i.e. a revision reshaped it) the segment's ENTIRE
  // current tokens, replayed fresh from the durable matchProgress. This is
  // the "re-align from the latest safe boundary" behavior: it never trusts
  // a stale numeric offset, so genuinely new content can never be silently
  // sliced away just because a revision changed the token count of
  // already-resolved content. The (rare, theoretical) cost is that a few
  // now-differently-recognized OLD tokens can re-enter replay in the
  // fallback case — harmless in practice, since replay's own match/reject
  // logic overwhelmingly rejects them (they don't spell out the target
  // again), and this project's own revision-handling tests below confirm it.
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
  matchProgressBefore: number;
  tokenOutcomes: readonly TokenOutcome[];
  completionLocalIndices: readonly number[];
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
  liveSegment: { id: number; resolvedPrefix: readonly string[]; lastTokens: readonly string[] } | null;
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
        ? { id: this.liveSegment.id, resolvedPrefix: this.liveSegment.resolvedPrefix, lastTokens: this.liveSegment.lastTokens }
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
      this.liveSegment = { id: update.segmentId, resolvedPrefix: [], lastTokens: [] };
    }
    const state = this.liveSegment;
    const observedLengthBefore = state.lastTokens.length;

    const tokens = tokenize(update.text);
    const { toReplay, excludedCount } = resolveReplayWindow(tokens, state.resolvedPrefix);
    const resolvedPrefixBefore = state.resolvedPrefix;
    const matchProgressBefore = this.matchProgress;
    const result = replay(toReplay, this.targetTokens, this.matchProgress);

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
      matchProgressBefore,
      tokenOutcomes: result.tokenOutcomes,
      completionLocalIndices: result.completions,
      matchProgressAfter: this.matchProgress,
      resolvedPrefixAfter: committed ? null : state.resolvedPrefix,
      committed,
      hadGenuineActivity,
    });

    return { completions: result.completions.length, hadGenuineActivity };
  }
}
