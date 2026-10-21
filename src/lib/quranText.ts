// The Qur'an text for the reader, from Tanzil's Uthmani text stored verbatim
// in src/data/quran/tanzil-quran-uthmani.txt (see the README there). Only
// the reader imports this module, so the ~1.3 MB text is a separate chunk,
// loaded with the reader and bundled with the app (works offline).
//
// The text is never changed: each verse is the exact characters after
// "surah|ayah|" on its line. Tanzil's copyright notice (the "#" lines at the
// end of the file) is read from the same file and shown in the reader.
import quranRaw from "../data/quran/tanzil-quran-uthmani.txt?raw";
import { SURAH_META, pageVerses } from "./quranMeta";

export interface QuranParse {
  /** VERSES[surah - 1][ayah - 1] */
  verses: string[][];
  notice: string;
  problems: string[];
}

export function parseQuranText(raw: string): QuranParse {
  const verses: string[][] = [];
  const problems: string[] = [];
  const noticeLines: string[] = [];
  let prev: [number, number] = [1, 0];
  for (const line of raw.split("\n")) {
    if (line.startsWith("#")) {
      noticeLines.push(line.replace(/^#\s?/, ""));
      continue;
    }
    if (line.trim() === "") continue;
    const m = /^(\d+)\|(\d+)\|(.+)$/.exec(line);
    if (!m) {
      problems.push(`unreadable line: ${line.slice(0, 30)}`);
      continue;
    }
    const surah = Number(m[1]);
    const ayah = Number(m[2]);
    const sameSurah = surah === prev[0] && ayah === prev[1] + 1;
    const nextSurah = surah === prev[0] + 1 && ayah === 1;
    if (!sameSurah && !nextSurah) problems.push(`out of order at ${surah}:${ayah}`);
    if (m[3].trim() === "") problems.push(`empty verse ${surah}:${ayah}`);
    (verses[surah - 1] ??= []).push(m[3]);
    prev = [surah, ayah];
  }
  const notice = noticeLines
    .join("\n")
    .replace(/^[=\s]+|[=\s]+$/g, "")
    .trim();
  return { verses, notice, problems };
}

const parsed = parseQuranText(quranRaw);

/** Checks the text against Tanzil's own metadata: 114 surahs, each with its verse count. */
export function quranTextProblems(p: QuranParse = parsed): string[] {
  const problems = [...p.problems];
  if (p.verses.length !== 114) problems.push(`${p.verses.length} surahs`);
  SURAH_META.forEach((meta, i) => {
    const n = p.verses[i]?.length ?? 0;
    if (n !== meta.ayahCount) problems.push(`surah ${meta.number}: ${n} verses, metadata says ${meta.ayahCount}`);
  });
  return problems;
}

export const QURAN_VERSES: readonly (readonly string[])[] = parsed.verses;
/** Tanzil's copyright notice, exactly as in the file (shown in the reader). */
export const TANZIL_NOTICE = parsed.notice;
// Note: in this Tanzil text the basmala opens verse 1 of every surah that
// has one (it IS verse 1 of al-Fatihah; at-Tawbah has none) — see
// splitBasmala below for how the reader lays it out.

// In the printed Mushaf the basmala heading each surah (except al-Fatihah,
// where it is verse 1, and at-Tawbah, which has none) stands on its own line
// above verse 1. Tanzil writes it at the start of verse 1's text, so the
// reader shows that same leading text on a line of its own — the characters
// are only split for display, never changed: basmala + rest === the verse.
// It is recognised by comparing verse 1's first four words with al-Fatihah
// 1:1 (the basmala itself), ignoring shadda marks: in 95 and 97 the file
// writes بِّسْمِ, with the shadda of the preceding text. Anything else is
// left as one piece.
const withoutShadda = (s: string) => s.replace(/\u0651/g, "");
const BASMALA = withoutShadda(parsed.verses[0]?.[0] ?? "");

export function splitBasmala(surah: number, ayah: number, text: string): { basmala: string; rest: string } | null {
  if (ayah !== 1 || surah === 1 || surah === 9 || !BASMALA) return null;
  const words = text.split(" ");
  if (words.length <= 4 || withoutShadda(words.slice(0, 4).join(" ")) !== BASMALA) return null;
  const basmala = words.slice(0, 4).join(" ") + " ";
  return { basmala, rest: text.slice(basmala.length) };
}

/** A word as written — not a standalone annotation sign (a pause or sajdah mark, ۞). */
const HAS_LETTER = /[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FC]/;

/**
 * The first `count` words a Mushaf page begins with — the reader's catchword
 * under the page before it, so an imam can go on reciting while turning the
 * page. Read from that page's own verses (lib/quranMeta.ts pageVerses, the
 * 1441H print's page starts) in Tanzil's text, never estimated: its first
 * verse's first words, and — when that verse is shorter (e.g. «الٓمٓ») — the
 * next verse's on the same page. The basmala heading a surah is not part of
 * its verse 1 (splitBasmala). Empty for a page that doesn't exist.
 */
export function pageOpeningWords(page: number, count = 2): string[] {
  const words: string[] = [];
  for (const [surah, ayah] of pageVerses(page)) {
    const raw = QURAN_VERSES[surah - 1]?.[ayah - 1] ?? "";
    const text = splitBasmala(surah, ayah, raw)?.rest ?? raw;
    for (const w of text.split(" ")) {
      if (!HAS_LETTER.test(w)) continue;
      words.push(w);
      if (words.length === count) return words;
    }
  }
  return words;
}
