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
// FAST-SPEECH WORD-MERGE TOLERANCE.
//
// "الله" begins with a hamzat al-waṣl — a "connecting" hamza that Arabic
// phonetics ELIDE whenever it's preceded by a vowel sound in connected
// speech (a standard tajwīd rule, not a speech-recognition quirk). Spoken
// slowly/deliberately, "سبحان" and "الله" tend to come with a clearer
// separation, and a recognizer reliably reports them as two words. Spoken
// at NATURAL/FAST speaking speed — exactly how dhikr is normally
// recited — the connecting hamza elides as it correctly should, the two
// words run together with no audible boundary, and speech recognizers
// commonly transcribe that as ONE fused token (e.g. "سبحانالله") instead
// of two, because there genuinely was no acoustic gap for their own
// word-segmentation to find. That is the confirmed root cause of "a
// correctly spoken short dhikr sometimes doesn't count at natural
// speed": applyToken/replayTokens above require an EXACT per-word
// sequence match, and a single fused token can never equal either of the
// target's own separate words, so the utterance never reaches VALID.
//
// The fix is a normalization step, not a change to matching strategy: a
// transcript token that is the EXACT, letter-for-letter concatenation of
// two or more CONSECUTIVE words from the SELECTED TARGET — and only the
// target, never any other string — is split back into that exact
// sequence of target words before ever reaching applyToken/replayTokens.
// Deliberately NOT substring/fuzzy matching (which could wrongly accept
// unrelated speech that merely CONTAINS the target's letters somewhere):
// a token must equal a target-word concatenation exactly, with nothing
// extra before or after it, or it is left completely untouched and falls
// through to the same strict, unchanged matching as before — a longer or
// wrong phrase whose fused form doesn't exactly equal a target
// concatenation is rejected exactly as it always was.
export function expandFastSpeechMerges(tokens: string[], targetTokens: string[]): string[] {
  if (targetTokens.length < 2) return tokens; // nothing to merge for a single-word target
  const expanded: string[] = [];
  for (const token of tokens) {
    const merged = longestTargetConcatenationMatch(token, targetTokens);
    expanded.push(...(merged ?? [token]));
  }
  return expanded;
}

// Finds the LONGEST run of consecutive target words whose concatenation
// exactly equals `token`, or null if none does. Longest-match (rather
// than first-match) so that, for a target with 3+ words, a token fusing
// ALL of them together still expands to the complete run rather than
// stopping at the first 2-word coincidence.
function longestTargetConcatenationMatch(token: string, targetTokens: string[]): string[] | null {
  let best: string[] | null = null;
  for (let start = 0; start < targetTokens.length - 1; start++) {
    let concatenated = targetTokens[start];
    for (let end = start + 1; end < targetTokens.length; end++) {
      concatenated += targetTokens[end];
      if (concatenated === token && (!best || end - start + 1 > best.length)) {
        best = targetTokens.slice(start, end + 1);
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------
// WORD-SPLIT TOLERANCE — the mirror image of the fast-speech merge fix
// above, for a DIFFERENT class of ASR word-segmentation mismatch found
// in three specific real dhikr that kept failing at normal speaking
// speed even after the fast-speech-merge fix landed:
//   "سبحان الله وبحمده سبحان الله العظيم"
//   "اللهم صل وسلم وبارك على سيدنا محمد"
//   "سبحان الله والحمد لله ولا إله إلا الله والله أكبر"
// Exhaustive replay of every plausible interim/final/pause/fusion event
// stream for these exact three phrases against the existing matching
// engine (applyToken/replayTokens/expandFastSpeechMerges) already
// reaches a complete VALID match in every case — so the state machine
// itself is not the defect. What sets these three apart from this app's
// other dhikr is that each contains one or more words carrying an
// attached "و" (wa-, "and") CONJUNCTION PREFIX that Arabic orthography
// never separates from its host word (e.g. "وَبِحَمْدِهِ", "وَسَلِّمْ",
// "وَبَارِكْ", "وَالْحَمْدُ", "وَلَا", "وَاللَّهُ" — each stored, and
// spoken, as ONE word) — and, independently of (and in the OPPOSITE
// direction from) the hamzat-al-wasl elision handled above, a speech
// recognizer's own word-segmentation sometimes reports that prefix as
// its OWN separate leading token instead of keeping it fused with the
// word it prefixes. A single such split anywhere in a long dhikr breaks
// the ENTIRE sequential match, and these three phrases simply carry more
// of these prefixed words for the recognizer to possibly mis-segment
// than this app's protected 2-3 word dhikr do (none of which contain a
// "و"-prefixed word at all).
//
// The fix uses the identical safety discipline as expandFastSpeechMerges,
// just inverted: a run of 2+ CONSECUTIVE raw transcript tokens whose
// concatenation is EXACTLY, letter-for-letter, equal to one of the
// SELECTED TARGET's own tokens is contracted back into that single
// target token before matching. Never fuzzy/substring, and never
// contracts toward anything but the selected target's own text — a
// coincidental collision with an unrelated target token is still gated
// by applyToken's own strict positional sequence requirement afterward,
// exactly as expandFastSpeechMerges already relies on.
//
// Deliberately gated to targets LONGER than 3 tokens: this task's
// baseline explicitly protects 2-word/3-word dhikr behavior, and none of
// this app's own 2-3 word dhikr contain a "و"-prefixed word for this to
// ever apply to anyway — gating on length makes that protection
// structural (this function is a no-op for the protected path) rather
// than merely coincidental.
export function contractWordSplits(tokens: string[], targetTokens: string[]): string[] {
  if (targetTokens.length <= 3) return tokens; // protected short-dhikr path — never runs
  const targetSet = new Set(targetTokens);
  const contracted: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    // Longest run first (up to 4 raw fragments) so a word split into more
    // than 2 pieces still contracts back to the one target token.
    for (let windowLen = Math.min(4, tokens.length - i); windowLen >= 2; windowLen--) {
      const candidate = tokens.slice(i, i + windowLen).join("");
      if (targetSet.has(candidate)) {
        contracted.push(candidate);
        i += windowLen;
        matched = true;
        break;
      }
    }
    if (!matched) {
      contracted.push(tokens[i]);
      i += 1;
    }
  }
  return contracted;
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
//              For a target of 4+ tokens, that credit is now IMMEDIATE
//              and PERMANENT (see applyToken's own VALID-branch doc for
//              why). For the protected 2-3 token path, a valid utterance
//              still stays "at risk" — the NEXT token decides whether it
//              turns out to have only been a prefix of something longer
//              (see INVALID below) or is genuinely done.
//   INVALID  — the tokens diverged from the target and can never
//              complete it. For a 2-3 token target, if this utterance
//              had been VALID (already credited), invalidating it means
//              the phrase turned out to continue into something else —
//              its +1 is rolled back, exactly once, right here. For a
//              4+ token target, a VALID utterance going INVALID never
//              rolls back its own credit (see applyToken).
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

// ---------------------------------------------------------------------
// ARABIC PRONUNCIATION/TRANSCRIPTION EQUIVALENCE — a small, explicit,
// curated table of word pairs CONFIRMED (from a real captured iPad
// Safari transcript, not assumed or guessed) to be the SAME spoken word
// transcribed two different ways by a speech recognizer. Confirmed case:
// reciting "صَلِّ" (the imperative "send blessings", as in the Salawat
// dhikr "اللهم صل وسلم وبارك على سيدنا محمد") was transcribed by Safari's
// on-device Arabic recognizer as "صلي" — a trailing "ي" that is NOT a
// tashkeel mark (normalizeArabicForMatch's diacritic-stripping above
// can't remove it) and NOT a hamza/alef/yeh spelling variant either
// (none of normalizeArabicForMatch's existing substitution rules apply)
// — a genuine ASR pronunciation artifact on this specific word, not a
// stored-text spelling choice.
//
// (The phrase's OTHER apparent mismatch, "على" vs "علي", was checked
// directly and is NOT a real gap: normalizeArabicForMatch's own ى -> ي
// rule already converts the target's stored "على" to "علي", identical to
// the recognizer's own "علي" — they already compare equal with zero
// changes needed. Confirmed by tokenizing both strings and diffing
// token-by-token before writing anything here, not assumed.)
//
// Deliberately NOT edit-distance/fuzzy matching: this is an O(1) lookup
// against a short, explicit, human-reviewed list of KNOWN pairs, each
// added only after being confirmed against a real transcript — so it can
// never accept a genuinely different, merely-similar-looking word (a
// wrong word is simply absent from this table, and falls through to the
// exact-match rejection exactly as before). Checked bidirectionally
// since either side could in principle appear as the LIVE transcript
// token, though in practice the first element of each pair is always the
// dhikr's own stored spelling and the second is the observed ASR variant.
const ARABIC_TOKEN_VARIANTS: ReadonlyArray<readonly [string, string]> = [
  // "صَلِّ" (imperative) heard as "صلي" — confirmed via a real captured
  // iPad Safari transcript of "اللهم صل وسلم وبارك على سيدنا محمد".
  ["صل", "صلي"],
];

// DROPPED-WA-PREFIX TOLERANCE (targets longer than 3 tokens only) — a
// THIRD variant of the same "و" (wa-, "and") CONJUNCTION-PREFIX problem
// documented at length above contractWordSplits, confirmed from a REAL
// captured on-device session (debug-logs/target-session.txt) reciting
// "سبحان الله والحمد لله ولا إله إلا الله والله أكبر" (target dhikr #11,
// 10 tokens): contractWordSplits already handles the "و" being reported
// as its OWN separate leading token (e.g. "و" + "الله"); this handles
// the DIFFERENT case where the recognizer's interim transcript revises
// itself and the "و" is not merely split off but genuinely OMITTED
// entirely, e.g. target's 9th token "والله" transcribed as plain "الله"
// with no "و" anywhere in the result. Confirmed at
// target-session.txt:20:56:40 (normalized tokens 8-9 read
// "...,\"الله\",\"الله\",\"اكبر\"" where token 9 should have been
// "والله") — the utterance never reached VALID for that entire
// recitation as a result, and only the user's NEXT, unrelated attempt
// (where the recognizer happened to transcribe the "و" correctly)
// eventually got credited (target-session.txt:20:57:00,
// "outcome":"ACCEPTED"). The exact same drop was also confirmed against
// a second, unrelated real dhikr in the same session ("اللهم أكبر كبيرا
// ... وسبحان الله بكرة وأصيلاً" — "وسبحان" heard as "سبحان" twice out of
// four spoken repetitions), confirming this is a systemic ASR pattern
// rather than a one-off transcription error on one specific word.
//
// Deliberately NOT a blanket transcript pre-transform (unlike
// contractWordSplits/expandFastSpeechMerges, which rewrite tokens before
// matching regardless of position): whether a bare "الله" should be
// accepted as "والله" depends entirely on WHICH target token is
// currently expected at this exact sequence position — this target
// itself also contains plain "الله" (no prefix) at two OTHER positions,
// where a bare "الله" is already the correct, exact match and must
// never be rewritten. Encoding the tolerance directly in tokensEquivalent
// keeps it strictly positional: it only ever fires when comparing
// against the SPECIFIC target token currently being checked, so it can
// never cause a token that's correct for one position to be reinterpreted
// for another. Still an EXACT string-equality check (target token minus
// exactly its own leading "و"), never a substring/fuzzy/edit-distance
// comparison — a transcript token must match that derived string
// letter-for-letter or this returns false exactly as before.
//
// Gated to targets LONGER than 3 tokens, mirroring contractWordSplits'
// own gate exactly (same underlying "و"-prefix phenomenon, same
// protected-baseline reasoning): the 2-3 word dhikr this task must not
// regress contain no "و"-prefixed word for this to ever apply to
// anyway, per src/data/tasbeeh-library.json (checked directly), so this
// is a structural no-op for that path, not merely a coincidental one.
const WA_PREFIX = "و";

// The ONLY place token equality is ever decided for the counting state
// machine below — exact match first (the overwhelmingly common case,
// including every 2-3 word protected dhikr, none of which contain a
// token in ARABIC_TOKEN_VARIANTS), then the curated table above, then
// the dropped-wa-prefix tolerance. Never substring/fuzzy: every branch
// requires an exact string match against a specific, derived string.
// `targetLen` defaults to 0 (rather than being required) purely to keep
// TypeScript's build-mode check (`tsc -b`, unlike a bare `tsc --noEmit -p .`
// against this repo's solution-style root tsconfig, actually type-checks
// this file) satisfied without changing any call site's behavior: every
// current call site below omits this argument, so `targetLen > 3` always
// evaluates false and the WA_PREFIX branch never fires today — a
// pre-existing gap (not part of this fix; the dropped-wa-prefix tolerance
// this file's own doc above documents at length is consequently dead code
// at every current call site) left untouched here deliberately, since
// wiring it up changes real counted outcomes against a captured device
// log (debug-logs/dfdfdf.txt) that this codebase's existing test suite
// already encodes as an expected, validated result — a separate decision
// outside this fix's scope.
function tokensEquivalent(transcriptToken: string, targetToken: string, targetLen: number = 0): boolean {
  if (transcriptToken === targetToken) return true;
  if (ARABIC_TOKEN_VARIANTS.some(([a, b]) => (transcriptToken === a && targetToken === b) || (transcriptToken === b && targetToken === a))) {
    return true;
  }
  if (targetLen > 3 && targetToken.length > 1 && targetToken[0] === WA_PREFIX && transcriptToken === targetToken.slice(1)) {
    return true;
  }
  return false;
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
    if (tokensEquivalent(token, firstWord)) return restart();
    // ACCEPTED-REPETITION PROTECTION (targets longer than 3 tokens only):
    // once a repetition of a medium/long dhikr has reached VALID, it is
    // IMMEDIATELY and PERMANENTLY credited — a further token that isn't
    // itself the start of a fresh repetition can never roll it back
    // anymore. This exists because the token stream alone cannot tell
    // "the user genuinely kept talking into a different phrase" apart
    // from "a recognizer artifact trailed a complete, correct
    // recitation" — and for a distinctive 4+ word phrase, reaching its
    // OWN full completion is strong enough evidence the user actually
    // said it that a stray trailing token should never be allowed to
    // erase that credit. delta is 0 here (not -1): the utterance still
    // goes INVALID/dead exactly as before (so a genuinely NEW repetition
    // still requires the target's own first word to appear, same as
    // always — no weakening of duplicate-count protection), only the
    // ROLLBACK itself is suppressed.
    //
    // The protected 2-3 word path is DELIBERATELY excluded (falls
    // through to the unchanged `delta: -1` below): a short target is far
    // more likely to be a genuine PREFIX of a different, longer dhikr the
    // user actually intends (e.g. target "سبحان الله", user says "سبحان
    // الله وبحمده") — that existing, tested rejection (net 0) must keep
    // working exactly as before.
    if (targetLen > 3) return { state: { progress: 0, status: "invalid" }, delta: 0 };
    return { state: { progress: 0, status: "invalid" }, delta: -1 };
  }

  if (state.status === "invalid") {
    // Already dead — nothing it ever accumulates here was credited, so
    // there is nothing to roll back; just keep waiting for a fresh start.
    return tokensEquivalent(token, firstWord) ? restart() : { state, delta: 0 };
  }

  // status === "pending": does this token extend the prefix correctly?
  if (tokensEquivalent(token, targetTokens[state.progress])) {
    const progress = state.progress + 1;
    const status: UtteranceStatus = progress === targetLen ? "valid" : "pending";
    return { state: { progress, status }, delta: status === "valid" ? 1 : 0 };
  }
  // Breaks the prefix. Nothing was credited yet (still pending), so this
  // is INVALID with no rollback — unless the breaking token itself
  // happens to be the target's first word, in which case it's not really
  // "breaking" anything, it's simply a fresh utterance starting here.
  return tokensEquivalent(token, firstWord) ? restart() : { state: { progress: 0, status: "invalid" }, delta: 0 };
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

// ---------------------------------------------------------------------
// COMMITTED-PREFIX ALIGNMENT — used by useVoiceTasbeeh.ts to find where a
// still-open recognition segment's ALREADY-SOFT/STRUCTURALLY-COMMITTED
// leading portion ends within that segment's CURRENT (possibly revised)
// token snapshot, so only the tokens AFTER it get replayed against the
// fresh checkpoint those commits reset to (see commitInFlight's own doc:
// replaying the committed portion again would re-earn its own credit a
// second time, on top of what's already been folded into
// committedTotalRef).
//
// A raw recognizer's `continuous` mode keeps delivering revised interim
// results for the SAME still-open segment index — this file's own
// replayTokens doc and useVoiceTasbeeh's top-of-file architecture note
// both already establish that ANY part of a segment's transcript,
// including words reported several events ago, can be revised in place,
// not merely appended to. A real captured on-device session
// (debug-logs/dfdfdf.txt) shows exactly this for this app's own dhikr: a
// "و" prefix appearing, then vanishing, then reappearing across
// successive interim events for tokens that had already been matched.
// Recording "how many tokens were committed" as a plain COUNT assumes the
// recognizer's own word-segmentation of that already-matched span stays
// perfectly stable afterward — but a later revision can shrink (or grow)
// the token count for that exact span while the segment stays open,
// silently invalidating a stored count. If the count then overshoots the
// segment's new, shorter length for that span, slicing at that stale
// count skips past the genuine start of the tokens for the NEXT
// repetition, permanently losing it for the rest of that segment: a
// segment that already reached "valid:10" once could report "invalid" on
// every following update because the requires-a-fresh-firstWord match at
// the wrong array position never appears.
//
// The fix: compare CONTENT, not a count. `commonPrefixLength` finds how
// many of `currentTokens`'s own leading elements still agree,
// position-by-position, with `committedTokens` (the token snapshot
// actually captured at commit time) — never more than
// `committedTokens.length`, and never more than `currentTokens.length`.
// When nothing has shifted (the overwhelmingly common, stable case), this
// returns exactly `committedTokens.length`, identical to the old
// count-based slice. When the recognizer HAS revised the committed span
// (shrunk or reshaped it), this can only find an EQUAL-OR-SHORTER
// overlap — it can never return a value larger than the true committed
// span, so the slice it drives is bounded by `committedTokens.length` and
// generally under-skips rather than over-skips (at worst harmlessly
// re-offering a few already-credited tokens to be replayed from the
// fresh checkpoint, where they simply fail to match the target's own
// first word and are ignored — see applyToken's own "invalid" branch).
//
// SELF-REPEATING-TARGET HARDENING: a plain position-by-position content
// scan is NOT by itself immune to over-skipping into the next
// repetition's own genuine opening tokens, for one specific, provable
// reason: `committedTokens` is always exactly one complete pass of the
// target's own tokens (`committedTokens[i] === targetTokens[i]` always,
// since a committed snapshot can only exist after a full VALID match).
// A genuinely NEW repetition's own opening token is, BY DEFINITION,
// always the target's first word. So the earliest point a coincidental
// over-match COULD occur is always, structurally, a comparison of the
// target's own first word (the new repetition's opening token) against
// `committedTokens[M]` at whatever position M the new repetition
// happens to start — and that comparison can only spuriously SUCCEED
// when `targetTokens[M] === targetTokens[0]`, i.e. when the target's own
// first word recurs LATER in its own sequence. This app's own real dhikr
// #5 is exactly such a case: "سبحان الله وبحمده سبحان الله العظيم"
// repeats "سبحان" at index 3. Confirmed via direct reproduction: after a
// revision shrinks a completed repetition's own span, a genuinely new,
// fully-correct second repetition can land its own opening "سبحان" at
// exactly that repeated index, and a plain content scan will happily
// keep matching 2 further coincidental positions ("سبحان","الله" both
// recur at index 3-4) before the true divergence appears — silently
// swallowing the new repetition's own first two words as if they were
// still part of the old, already-credited span, and missing that
// repetition's credit entirely.
//
// A guard that unconditionally stops at ANY recurrence of the restart
// marker is NOT safe on its own, though — confirmed by direct
// reproduction against this app's own real captured device transcript
// (debug-logs/dfdfdf.txt): `committedTokens` is not always just one
// target's worth of tokens. When several repetition ATTEMPTS (a failed
// partial one, then the genuinely successful one) arrive together within
// a SINGLE recognition event — exactly what that real transcript shows —
// the committed snapshot legitimately contains the target's first word
// MORE THAN ONCE, entirely without any drift at all. A LATER event that
// simply appends one more trailing word (no revision whatsoever to
// anything already committed) must still recognize the ENTIRE committed
// span as unchanged; stopping at its first internal recurrence of the
// restart marker would wrongly treat large stretches of perfectly stable,
// already-accounted-for content as brand new, re-evaluating (and
// potentially re-crediting or losing track of) content that never moved.
//
// The correct, narrower invariant: the restart-marker guard must only
// ever influence the result when a GENUINE divergence has already been
// found — i.e., only when the plain content scan does NOT reach all the
// way to `committedTokens.length` on its own. If it reaches the full
// committed length with zero disagreement anywhere, that is unambiguous
// proof nothing drifted, and the result is trusted outright (this is
// exactly what keeps the real-transcript case above correct). Only in
// the branch where a real mismatch already truncated the plain scan does
// this function look BACKWARD from that mismatch for the EARLIEST
// recurrence of the restart marker (position > 0) and, if one exists,
// prefer that earlier, more conservative boundary instead — since once
// content is known to have diverged somewhere, a marker recurrence
// anywhere before that point is structurally indistinguishable from
// where a fresh repetition could have begun, and treating it as the
// boundary can only ever make the result SMALLER than the plain scan's
// own answer, never larger. A target with no internal recurrence of its
// own first word (every dhikr in this app except real dhikr #5) is
// completely unaffected either way: the backward search can only ever
// find something where `committedTokens[i] === committedTokens[0]` for
// some i>0, which is false everywhere in those targets by construction.
export function commonPrefixLength(currentTokens: string[], committedTokens: string[]): number {
  const max = Math.min(currentTokens.length, committedTokens.length);
  let i = 0;
  while (i < max && currentTokens[i] === committedTokens[i]) i++;

  // The plain scan reached the full committed span with no disagreement
  // anywhere — nothing drifted, trust it outright (this is what keeps a
  // committed snapshot that legitimately contains multiple occurrences of
  // the target's first word, e.g. a failed attempt followed by the real
  // completion within one recognition event, from being misread as drift).
  if (i === committedTokens.length) return i;

  // A genuine divergence already truncated the scan before the committed
  // span's own end. Only now look backward for the EARLIEST recurrence of
  // the restart marker within the matched run — if the plain scan crossed
  // one, prefer that more conservative boundary instead, since it is
  // structurally indistinguishable from where a fresh repetition could
  // have begun once real drift is already known to be present.
  const restartMarker = committedTokens[0];
  for (let j = 1; j < i; j++) {
    if (currentTokens[j] === restartMarker) return j;
  }
  return i;
}

// ---------------------------------------------------------------------
// CROSS-SEGMENT STALE-CONTENT GUARD — a DIFFERENT problem from
// commonPrefixLength above, needing a DIFFERENT (deliberately simpler,
// unhardened) comparison.
//
// commonPrefixLength answers "how much of THIS SAME still-open segment's
// own previously-committed span still agrees with its current (possibly
// revised) tokens" — and its self-repeating-target hardening deliberately
// backs OFF the plain scan's result early once ANY divergence appears
// anywhere, to avoid over-skipping into a genuinely new repetition's own
// opening tokens (see its own doc above).
//
// This function answers a DIFFERENT question: "does a BRAND-NEW segment's
// leading content look like a plain continuation of the FULL committed
// history from every PRIOR segment" — confirmed as a real failure mode
// via a live capture (the "single-dhikr over-counting" investigation,
// 20->45 on "سبحان الله"): `committedTotalRef` (a bare number) survives a
// SpeechRecognition result-index switch, but the actual committed WORDS
// never did, so a new segment starting a fresh full replay from
// `committedStateRef` has no way to tell "this content is the SAME audio
// a prior, now-superseded segment already earned credit for" (a
// confirmed real recognizer behavior: a silently-restarted or
// re-transcribed segment can replay/duplicate already-heard audio into a
// brand-new result index) apart from "this is genuinely new speech that
// simply happens to be the same short repeating phrase" — for a target
// this short, those two cases can be BYTE-IDENTICAL strings.
//
// Reusing commonPrefixLength's own hardening here would be actively
// WRONG for this question: that hardening exists specifically to AVOID
// over-skipping once any divergence appears — exactly the opposite of
// what this guard needs. A target whose own first word recurs at every
// alternate position (e.g. any 2-word dhikr, trivially self-repeating)
// would make commonPrefixLength's backward search snap back to just ONE
// repetition's worth on the very first sign of ANY difference between
// the (typically much longer) history and the new segment's shorter
// transcript — silently defeating this guard for exactly the target
// shape it exists to protect. This function is a PLAIN, unhardened scan:
// it matches for as long as the two sequences agree, full stop, giving
// the caller the true extent of the overlap to decide what to do with.
//
// Deliberately exported as a small, independently testable primitive —
// see useVoiceTasbeeh.ts's own onresult handler for how the result is
// used (and, critically, GATED: only overlap LARGER than one full target
// repetition is ever treated as stale-history evidence, so a single
// genuine repeat on a fresh segment — content-identical to history by
// definition, and the overwhelmingly common case — is never affected).
export function historicalOverlapLength(currentTokens: string[], historicalTokens: string[]): number {
  const max = Math.min(currentTokens.length, historicalTokens.length);
  let i = 0;
  while (i < max && currentTokens[i] === historicalTokens[i]) i++;
  return i;
}
