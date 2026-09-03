// Lightweight Arabic phrase matching for Voice Tasbeeh — pure functions,
// no DOM/SpeechRecognition dependency, so they're trivial to reason about
// (and exercise) independently of the recognizer lifecycle in
// useVoiceTasbeeh.ts.
//
// REWRITE NOTE: this file replaces a prior implementation that grew a
// 3-state (pending/valid/invalid) utterance FSM, a rollback branch, a
// cross-segment "historical overlap" reconstruction, and several layers
// of checkpoint bookkeeping on top of it — all in response to a series
// of real-device bugs, several of which were caused by that machinery
// itself. This version keeps every genuinely evidence-based, narrow
// normalization/tokenization rule below (none of them were ever the
// source of a bug), but replaces the utterance state machine with the
// simplest model that still satisfies the two things actually proven
// necessary: (1) a completed repetition is consumed immediately and
// permanently — no rollback exists in this design at all, because a
// consumed token is never fed back into matching again (see
// useVoiceTasbeeh.ts's own checkpoint doc); (2) the target's own first
// word unambiguously starts a fresh attempt, so multiple repetitions in
// one recognizer segment ("Subhan Allah Subhan Allah") each still get
// their own count.

// The library's own dhikr_ar strings (src/data/tasbeeh-library.json) carry
// full tashkeel (e.g. "سُبْحَانَ اللَّهِ") for correct reading, but a speech
// recognizer's transcript never includes diacritics and commonly varies in
// alef/yeh/hamza spelling — so both the target phrase and the live
// transcript are normalized the same way before comparison. This never
// touches the stored dhikr text itself, only a throwaway copy used for
// matching. Every rule uses explicit \u code points (never a literal
// Arabic glyph as a regex range endpoint) so the exact set stays
// unambiguous to audit:
//   ً-ٟ, ٰ, ۖ-ۭ   tashkeel / tanween / Quranic annotation marks
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
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
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
// into applyToken/matchNewTokens below.
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
// at NATURAL/FAST speaking speed — exactly how dhikr is normally
// recited — the connecting hamza elides as it correctly should, and
// speech recognizers commonly transcribe two adjacent target words as
// ONE fused token (e.g. "سبحانالله") instead of two, because there
// genuinely was no acoustic gap for their own word-segmentation to find.
//
// The fix is a normalization step, not a change to matching strategy: a
// transcript token that is the EXACT, letter-for-letter concatenation of
// two or more CONSECUTIVE words from the SELECTED TARGET — and only the
// target, never any other string — is split back into that exact
// sequence of target words before ever reaching applyToken/matchNewTokens.
// Deliberately NOT substring/fuzzy matching: a token must equal a target-
// word concatenation exactly, with nothing extra before or after it, or
// it is left completely untouched.
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
// above, confirmed against real captured sessions reciting longer adhkar
// containing a "و" (wa-, "and") CONJUNCTION PREFIX that Arabic
// orthography never separates from its host word (e.g. "وَبِحَمْدِهِ",
// "وَسَلِّمْ", "وَبَارِكْ", "وَالْحَمْدُ", "وَلَا", "وَاللَّهُ" — each
// stored, and spoken, as ONE word), where a recognizer's own word-
// segmentation sometimes reports that prefix as its OWN separate leading
// token instead of keeping it fused with the word it prefixes.
//
// A run of 2+ CONSECUTIVE raw transcript tokens whose concatenation is
// EXACTLY, letter-for-letter, equal to one of the SELECTED TARGET's own
// tokens is contracted back into that single target token before
// matching. Never fuzzy/substring, and never contracts toward anything
// but the selected target's own text.
//
// Gated to targets LONGER than 3 tokens: none of this app's 2-3 word
// dhikr contain a "و"-prefixed word for this to ever apply to anyway, so
// this is a structural no-op for that protected path, not a coincidental
// one.
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
// ARABIC PRONUNCIATION/TRANSCRIPTION EQUIVALENCE — a small, explicit,
// curated table of word pairs CONFIRMED (from a real captured iPad
// Safari transcript, not assumed or guessed) to be the SAME spoken word
// transcribed two different ways by a speech recognizer. Confirmed case:
// reciting "صَلِّ" (the imperative "send blessings", as in the Salawat
// dhikr "اللهم صل وسلم وبارك على سيدنا محمد") was transcribed as "صلي" —
// a genuine ASR pronunciation artifact on this specific word, not a
// stored-text spelling choice normalizeArabicForMatch already handles.
//
// Deliberately NOT edit-distance/fuzzy matching: an O(1) lookup against a
// short, explicit, human-reviewed list of KNOWN pairs — a wrong word is
// simply absent from this table and falls through to exact-match
// rejection exactly as before.
const ARABIC_TOKEN_VARIANTS: ReadonlyArray<readonly [string, string]> = [["صل", "صلي"]];

// DROPPED-WA-PREFIX TOLERANCE (targets longer than 3 tokens only) — a
// THIRD variant of the same "و" conjunction-prefix problem above,
// confirmed from a real captured on-device session reciting "سبحان الله
// والحمد لله ولا إله إلا الله والله أكبر": the recognizer's interim
// transcript sometimes doesn't just SPLIT the "و" off (handled by
// contractWordSplits above) but OMITS it entirely, e.g. "والله"
// transcribed as plain "الله" with no "و" anywhere in the result.
//
// Deliberately NOT a blanket transcript pre-transform: whether a bare
// "الله" should be accepted as "والله" depends entirely on WHICH target
// token is currently expected at this exact sequence position (this
// target also contains plain "الله", unprefixed, at other positions,
// where a bare "الله" is already the correct match and must never be
// rewritten) — encoding the tolerance directly in tokensEquivalent keeps
// it strictly positional.
const WA_PREFIX = "و";

// The ONLY place token equality is ever decided — exact match first, then
// the curated variants table, then the dropped-wa-prefix tolerance
// (gated to targets longer than 3 tokens, mirroring contractWordSplits'
// own gate — the 2-3 word protected dhikr contain no "و"-prefixed word
// for this to ever apply to anyway).
function tokensEquivalent(transcriptToken: string, targetToken: string, targetLen: number): boolean {
  if (transcriptToken === targetToken) return true;
  if (ARABIC_TOKEN_VARIANTS.some(([a, b]) => (transcriptToken === a && targetToken === b) || (transcriptToken === b && targetToken === a))) {
    return true;
  }
  if (targetLen > 3 && targetToken.length > 1 && targetToken[0] === WA_PREFIX && transcriptToken === targetToken.slice(1)) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------
// UTTERANCE STATE — the counting core, deliberately reduced to the
// smallest model that's still correct.
//
// `progress` is the ONLY thing tracked: how many of the target's own
// tokens, in sequence, the CURRENT (not-yet-complete) attempt has
// matched — 0 means "no attempt in progress". There is no separate
// "invalid"/"rollback" state, because a completed attempt is consumed
// (see `completed` on TokenStep, and useVoiceTasbeeh.ts's checkpoint)
// and never fed back into this function again — so this function itself
// never needs to reconsider or undo a past decision.
export interface MatchState {
  progress: number;
}

export const INITIAL_MATCH_STATE: MatchState = { progress: 0 };

export interface TokenStep {
  state: MatchState;
  /** True exactly on the token that completes a full repetition — the
   * caller credits +1 and excludes every token up to and including this
   * one from ever being matched again (see useVoiceTasbeeh.ts). */
  completed: boolean;
}

// Advances `state` by exactly one new spoken word `token`. Pure and
// synchronous — no notion of recognition events, timers, or "final"
// results.
//
// Three cases, checked in order:
//   1. `token` continues the current attempt (matches the NEXT expected
//      target token) — advance progress; if that completes the target,
//      report `completed: true` and reset to a fresh attempt (progress
//      0) for whatever comes after. This also correctly handles a target
//      whose own first word recurs at a LATER position within itself
//      (e.g. "سبحان الله وبحمده سبحان الله العظيم"): since this check
//      runs FIRST, a genuine in-sequence continuation always wins over
//      the "restart" case below.
//   2. Otherwise, `token` is the target's OWN FIRST WORD — unambiguous
//      proof a fresh attempt is starting right now, regardless of
//      whatever the old one was (its own credit, if it completed one, is
//      already permanent and untouched — see point 1). Start over from
//      progress 1.
//   3. Otherwise, `token` doesn't extend or restart anything — the
//      current attempt is abandoned (back to progress 0, nothing
//      credited for it, nothing to undo since nothing WAS credited).
export function applyToken(state: MatchState, token: string, targetTokens: string[]): TokenStep {
  const targetLen = targetTokens.length;
  if (targetLen === 0) return { state, completed: false };
  const firstWord = targetTokens[0];

  if (tokensEquivalent(token, targetTokens[state.progress], targetLen)) {
    const progress = state.progress + 1;
    if (progress === targetLen) return { state: { progress: 0 }, completed: true };
    return { state: { progress }, completed: false };
  }
  if (tokensEquivalent(token, firstWord, targetLen)) {
    if (targetLen === 1) return { state: { progress: 0 }, completed: true };
    return { state: { progress: 1 }, completed: false };
  }
  return { state: { progress: 0 }, completed: false };
}

// Feeds `tokens` through applyToken sequentially from `state`, returning
// the resulting state and how many repetitions completed along the way.
// useVoiceTasbeeh.ts calls this with only the GENUINELY NEW portion of a
// segment's tokens each time (see its own checkpoint doc) — never the
// same token twice — so `matchedCount` is always the exact number of NEW
// repetitions this call discovered, safe to credit directly with no
// further diffing needed.
export function matchNewTokens(state: MatchState, tokens: string[], targetTokens: string[]): { state: MatchState; matchedCount: number } {
  let current = state;
  let matchedCount = 0;
  for (const token of tokens) {
    const step = applyToken(current, token, targetTokens);
    current = step.state;
    if (step.completed) matchedCount += 1;
  }
  return { state: current, matchedCount };
}

// ---------------------------------------------------------------------
// SAFE PREFIX MATCH — used by useVoiceTasbeeh.ts to find how much of a
// still-open segment's CURRENT (possibly revised) token snapshot still
// agrees, position-by-position, with a REFERENCE token snapshot (either
// "what's already been consumed by a completed match" or "what existed
// at the moment of a target switch") — never more than either array's
// own length, and only ever an EQUAL-OR-SHORTER overlap than the true
// match if content has drifted, never longer: a real recognizer can
// revise (shrink or reshape) an already-processed span later in the SAME
// still-open segment, and comparing actual CONTENT here (not a stored
// count) means a revision can only ever make this function under-trust
// the old boundary, never overshoot into content that was never actually
// confirmed.
//
// Deliberately simple — no special-casing for a target whose own first
// word recurs within itself. That narrower "self-repeating target"
// hardening existed in the prior implementation specifically to guard
// commonPrefixLength against over-matching into a NEXT repetition's own
// opening tokens; this design never needs that guard, because a
// completed repetition's tokens are excluded from all future matching
// the INSTANT they complete (see useVoiceTasbeeh.ts) — there is no
// longer a "committed span containing multiple repetitions" for a
// revision to drift across. The one disclosed residual limitation: if a
// recognizer revision reshapes a span that was consumed several
// repetitions ago in a way that changes its own token count, this
// function can only compare against what was true at consumption time —
// seeuseVoiceTasbeeh.ts's own doc for why this is an accepted trade-off.
export function safePrefixMatchLength(currentTokens: string[], referenceTokens: string[]): number {
  const max = Math.min(currentTokens.length, referenceTokens.length);
  let i = 0;
  while (i < max && currentTokens[i] === referenceTokens[i]) i++;
  return i;
}
