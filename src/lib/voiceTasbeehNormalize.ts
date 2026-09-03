// Normalization + tokenization for Voice Tasbeeh matching. Pure text
// transforms only — no recognition/session/target logic lives here (see
// voiceTasbeehMatch.ts for that).
//
// Every rule below was chosen and then verified against the actual
// 16-item dhikr library (src/data/tasbeeh-library.json) rather than
// assumed — see voiceTasbeehMatch.test.ts's "library audit" tests, which
// re-run the same checks as a regression guard. Re-run those before
// extending CONFUSABLE_LETTER_PAIRS if the library ever changes.

// Harakat/tanween/shadda/sukun (U+0610-U+061A, U+064B-U+0652), superscript
// alef (U+0670), Quranic annotation marks (U+06D6-U+06ED), and tatweel
// (U+0640) — explicit code-point ranges (not literal combining characters,
// which are unreliable to eyeball correctly in source).
const TASHKEEL = /[\u0610-\u061A\u064B-\u0652\u0670\u06D6-\u06ED\u0640]/g;

// Orthographic equivalence folding — hamza/alef carriers, alef maqsura,
// ta marbuta, and hamza-on-waw/ya, all commonly interchanged by ASR and
// by ordinary handwriting/typing, folded to one canonical form purely for
// comparison purposes.
const ORTHOGRAPHIC_FOLD: Record<string, string> = {
  "\u0623": "\u0627", // أ -> ا
  "\u0625": "\u0627", // إ -> ا
  "\u0622": "\u0627", // آ -> ا
  "\u0671": "\u0627", // ٱ -> ا
  "\u0649": "\u064A", // ى -> ي
  "\u0629": "\u0647", // ة -> ه
  "\u0624": "\u0648", // ؤ -> و
  "\u0626": "\u064A", // ئ -> ي
};

const PUNCTUATION = /[\u060C,.\u061B;:!\u061F"'()[\]]/g;

// Zero-width bidi/formatting control characters — never spoken content,
// but proven (from a real device capture, see voiceTasbeehNormalize.test.ts)
// to arrive glued directly onto the FIRST word of a SpeechRecognition
// transcript with no separating whitespace (observed: U+200F RIGHT-TO-LEFT
// MARK prefixed onto 100% of sampled raw transcripts). Left unstripped,
// that corrupts exactly the first token of every transcript — it can never
// equal a clean target token again (different length, so even the
// same-length fuzzy tier in tokensAreEquivalent can't rescue it) — which is
// catastrophic for any target whose first word only appears once per
// attempt (i.e. any multi-word target spoken as a single recitation,
// especially one spanning multiple recognition segments/results, since
// each new native result gets its own fresh instance of this corruption).
// \p{Cf} (Unicode "Format" category) is the precise, well-defined class
// these belong to — U+200E/200F (LRM/RLM), U+061C (Arabic Letter Mark),
// U+200C/200D (ZWNJ/ZWJ), U+202A-202E (embedding/override controls), and
// U+2066-2069 (isolate controls) all fall under it — so this targets
// exactly "non-spoken formatting characters", not an arbitrary/broadened
// deletion of other Arabic normalization behavior, which is untouched.
const BIDI_FORMATTING = /\p{Cf}/gu;

export function normalizeToken(raw: string): string {
  let s = raw.normalize("NFC");
  s = s.replace(TASHKEEL, "");
  s = s.replace(BIDI_FORMATTING, "");
  s = Array.from(s)
    .map((ch) => ORTHOGRAPHIC_FOLD[ch] ?? ch)
    .join("");
  return s;
}

export function tokenize(phrase: string): string[] {
  const cleaned = phrase.normalize("NFC").replace(PUNCTUATION, " ");
  return cleaned
    .split(/\s+/)
    .map((w) => normalizeToken(w))
    .filter((w) => w.length > 0);
}

// Curated, phonetically-grounded Arabic ASR/pronunciation confusion
// pairs — deliberately a small named table, not a numeric edit-distance
// radius. Audited against the real dhikr library: no same-length,
// single-letter-difference pair among the library's own distinct tokens
// has its differing letter in this set, so this tolerance currently never
// creates a cross-word match in real data; it exists solely to absorb a
// genuine same-word ASR/pronunciation slip (e.g. a sīn/ṣād-type mishearing
// of the same word).
const CONFUSABLE_LETTER_PAIRS: ReadonlySet<string> = new Set([
  "\u0633:\u0635", // س:ص
  "\u0635:\u0633", // ص:س
  "\u0630:\u0632", // ذ:ز
  "\u0632:\u0630", // ز:ذ
  "\u0630:\u0638", // ذ:ظ
  "\u0638:\u0630", // ظ:ذ
  "\u062A:\u0637", // ت:ط
  "\u0637:\u062A", // ط:ت
  "\u0636:\u0638", // ض:ظ
  "\u0638:\u0636", // ظ:ض
]);

function singleLetterDiff(a: string, b: string): [string, string] | null {
  if (a.length !== b.length) return null;
  let diffIndex = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (diffIndex !== -1) return null; // more than one differing position
      diffIndex = i;
    }
  }
  if (diffIndex === -1) return null; // identical strings
  return [a[diffIndex], b[diffIndex]];
}

// A closed, small set of Arabic weak letters (حروف العلة) that a defective
// (ناقص) verb's jussive/imperative form regularly elides — e.g. صل
// (grammatically apocopated) vs. صلي (the fuller form natural speech and
// ASR commonly produce for the exact same spoken word; see item 9 of
// src/data/tasbeeh-library.json and voiceTasbeehMatch.test.ts's dedicated
// regression tests). This is deliberately NOT a general edit-distance/
// indel tolerance: it only ever fires for a SINGLE letter, drawn from this
// specific closed set, present at the very END of the longer token and
// nowhere else — never a substitution, never a letter from outside this
// set, never a mismatch anywhere but the trailing position. That keeps it
// far narrower than it might look: it cannot bridge two words that differ
// by an unrelated inserted/removed consonant, or one differing only in the
// middle, and it is verified (see the library-audit tests) to create no
// cross-word collision anywhere in the real dhikr library.
const WEAK_TRAILING_LETTERS: ReadonlySet<string> = new Set([
  "ي", // ي
  "و", // و
  "ا", // ا
]);

// True when `longer` is exactly `shorter` plus one trailing weak letter —
// i.e. `shorter` is a genuine, complete prefix of `longer` (every existing
// character identical, nothing swapped), and the one extra character
// belongs to the closed WEAK_TRAILING_LETTERS set. Order-independent
// (tokensAreEquivalent tries both directions), so it doesn't matter
// whether the target or the spoken word happens to be the elided form.
function isTrailingWeakLetterVariant(shorter: string, longer: string): boolean {
  if (longer.length !== shorter.length + 1) return false;
  if (shorter.length < 2) return false; // guards against a bare single letter "becoming" a word
  if (!longer.startsWith(shorter)) return false;
  return WEAK_TRAILING_LETTERS.has(longer[longer.length - 1]);
}

// Tier-1 (exact-after-normalization), tier-2 (curated same-length,
// single-letter substitution), or tier-3 (a single trailing weak-letter
// elision/retention — see isTrailingWeakLetterVariant) equivalence. Used
// ONLY to compare a spoken token against one SPECIFIC expected
// target-sequence position — never as a general/global similarity search
// over vocabulary. Tier-2 still excludes tokens under 4 normalized
// characters from SUBSTITUTION tolerance: the real library contains
// genuine 2-3 character content words (لا، له، لي، اله...), and a
// single-letter change on a word that short can trivially land on a
// different real word. Tier-3 is a narrower, structurally different
// phenomenon (an added/dropped LETTER at a fixed position, not a
// letter-for-letter swap anywhere), so it uses its own, separate minimum
// (shorter.length >= 2) rather than inheriting tier-2's threshold.
export function tokensAreEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length === b.length) {
    if (a.length < 4) return false;
    const diff = singleLetterDiff(a, b);
    if (!diff) return false;
    return CONFUSABLE_LETTER_PAIRS.has(`${diff[0]}:${diff[1]}`);
  }
  if (a.length === b.length + 1) return isTrailingWeakLetterVariant(b, a);
  if (b.length === a.length + 1) return isTrailingWeakLetterVariant(a, b);
  return false;
}
