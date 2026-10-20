// Searching the Qur'an by a word or a whole verse (the reader's index and its
// search panel, components/QuranReaderScreen.tsx). The text searched is
// Tanzil's Uthmani text (lib/quranText.ts) — never changed; only a COPY of
// each verse is normalised for matching.
//
// People type in the ordinary (imla'i) spelling, without vowel marks, while
// the Uthmani text writes many words differently: «ٱلصَّلَوٰةَ» is typed
// «الصلاة», «ٱلْعَٰلَمِينَ» «العالمين», «ٱلرَّحْمَٰنِ» «الرحمن». So every Uthmani
// word is normalised into a few spellings (see wordForms) and a typed word
// matches any of them. The marks are dropped, the alef and hamza forms are
// unified, and ى/ي and ة/ه are treated alike — on both sides, the same way.
// The basmala that Tanzil writes at the start of each surah's first verse is
// not searched as part of that verse (it is verse 1 only of al-Fatihah).
import { QURAN_VERSES, splitBasmala } from "./quranText";

/** Vowel marks, Qur'anic annotation signs and tatweel — never letters. */
const MARKS = /[ؐ-ًؚ-ٕٓ-ٟۖ-ۭـ]/g;

/** The shared letter normalisation, applied after the variant-specific rules below. */
function unify(s: string): string {
  return s
    .replace(/ٔ/g, "")
    .replace(MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ءا/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه");
}

/** What a person types, normalised the same way (and its spaces collapsed). */
export function normalizeQuery(query: string): string {
  return unify(query.replace(/ٰ/g, "ا")).replace(/[^ء-ي\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * The spellings an Uthmani word may be typed in:
 *  - without its superscript (dagger) alef: «ٱلرَّحْمَٰنِ» → الرحمن, «عَلَىٰ» → علي;
 *  - with it written out: «ٱلْعَٰلَمِينَ» → العالمين, «ٱلسَّمَٰوَٰتِ» → السماوات, and
 *    small waw/yeh as letters («إِبْرَٰهِـۧمَ» → ابراهيم), a hamza on a tatweel as alef
 *    («يَسْـَٔلُونَ» → يسالون);
 *  - with «وٰ» / «ىٰ» read as alef: «ٱلصَّلَوٰةَ» → الصلاه (typed الصلاة).
 */
export function wordForms(word: string): string[] {
  return [...new Set(spellings(word))].filter(Boolean);
}

function spellings(word: string): [string, string, string] {
  const plain = unify(word.replace(/ٰ/g, "").replace(/[ۥۦۧ]/g, ""));
  const spelled = (w: string) =>
    unify(
      w
        .replace(/ـٔ/g, "ا")
        .replace(/ۥ/g, "و")
        .replace(/[ۦۧ]/g, "ي")
        .replace(/ٰ/g, "ا"),
    );
  const written = spelled(word);
  const asAlef = spelled(word.replace(/[وى][ً-ْ]*ٰ/g, "ٰ"));
  return [plain, written, asAlef];
}

interface IndexedVerse {
  surah: number;
  ayah: number;
  /** The verse's words as shown (Uthmani, basmala excluded). */
  words: string[];
  /** Each word's spellings (wordForms). */
  forms: string[][];
  /** Each spelling of the whole verse, its spaces removed — for a phrase spaced differently. */
  joined: string[];
}

let index: IndexedVerse[] | null = null;
function verses(): IndexedVerse[] {
  if (index) return index;
  index = [];
  QURAN_VERSES.forEach((list, s) =>
    list.forEach((raw, a) => {
      const text = splitBasmala(s + 1, a + 1, raw)?.rest ?? raw;
      const words = text.split(" ").filter(Boolean);
      const forms = words.map(wordForms);
      const spelled = words.map(spellings);
      const joined = [0, 1, 2].map((v) => spelled.map((w) => w[v]).join(""));
      index!.push({ surah: s + 1, ayah: a + 1, words, forms, joined });
    }),
  );
  return index;
}

export interface QuranSearchHit {
  surah: number;
  ayah: number;
  /** The verse's words as shown (Uthmani), and which of them matched (empty when matched across a spacing difference). */
  words: string[];
  matched: number[];
}

/** The query words as a run of consecutive verse words: the first may end a word, the last begin one, a single word lie anywhere in one. */
function matchWords(forms: string[][], q: string[]): number[] | null {
  const n = q.length;
  for (let i = 0; i + n <= forms.length; i++) {
    let ok = true;
    for (let j = 0; j < n && ok; j++) {
      const w = q[j];
      const fits = (f: string) => (n === 1 ? f.includes(w) : j === 0 ? f.endsWith(w) : j === n - 1 ? f.startsWith(w) : f === w);
      ok = forms[i + j].some(fits);
    }
    if (ok) return Array.from({ length: n }, (_, j) => i + j);
  }
  return null;
}

/** Shortest query searched (normalised letters). */
export const QURAN_SEARCH_MIN = 2;

/**
 * Every verse containing the query (a word, part of one, a phrase or a whole
 * verse), in Mushaf order. Empty for a query shorter than QURAN_SEARCH_MIN.
 */
export function searchQuran(query: string): QuranSearchHit[] {
  const q = normalizeQuery(query);
  if (q.replace(/ /g, "").length < QURAN_SEARCH_MIN) return [];
  const qWords = q.split(" ");
  const qJoined = q.replace(/ /g, "");
  const hits: QuranSearchHit[] = [];
  for (const v of verses()) {
    const matched = matchWords(v.forms, qWords);
    if (matched) hits.push({ surah: v.surah, ayah: v.ayah, words: v.words, matched });
    else if (qWords.length > 1 && v.joined.some((j) => j.includes(qJoined))) hits.push({ surah: v.surah, ayah: v.ayah, words: v.words, matched: [] });
  }
  return hits;
}
