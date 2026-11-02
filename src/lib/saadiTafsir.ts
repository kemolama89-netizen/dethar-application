// Tafsir al-Sa'di for every verse, from Itqan's package (src/data/tafsir/saadi-itqan,
// imported by scripts/tafsir/import-itqan-saadi.py, verified there against Tanzil).
// Offline: the files ship with the app, one chunk per surah, loaded only when opened.
//
// The licence allows no derivatives and this is a Tafsir, so nothing here changes a
// word. parseSaadiText only divides a verse's text for layout: its pieces, joined
// again with their note markers, are the source's characters exactly (a test checks
// this for all 6,236 verses). The book's quoted Qur'an keeps its { } and its spelling.
import { isValidVerse, surahMeta } from "./quranMeta";

const FILES = import.meta.glob<{ default: SaadiSurah }>("../data/tafsir/saadi-itqan/surah-*.json");

export interface SaadiSurah {
  surah: number;
  ayat: { ayah: number; text: string }[];
}

export type SaadiRun =
  | { kind: "text"; text: string }
  /** {…} in the source: the Qur'an as the book quotes it, braces included. */
  | { kind: "quote"; text: string }
  /** {12} in the source: the book's own start of its comment on verse 12. */
  | { kind: "marker"; text: string; verse: number }
  /** ¬…¥ in the source: an editor's note, shown apart. */
  | { kind: "note"; index: number; closed: boolean }
  /** A ¥ with no ¬ before it (a slip in the source, in 3 verses): kept in the data, not drawn. */
  | { kind: "stray"; text: string };

export interface SaadiParagraph {
  runs: SaadiRun[];
  /** The Qur'an heading the book prints before its comment. */
  heading: boolean;
}

export interface SaadiParsed {
  paragraphs: SaadiParagraph[];
  notes: string[];
  /** Verse numbers in the book's Qur'an heading here: more than one when it prints them together. */
  headingVerses: number[];
  /** Verses this text starts a comment on: [] when the book has no comment on the verse. */
  commentVerses: number[];
}

const NOTE_OPEN = "¬";
const NOTE_CLOSE = "¥";

export function parseSaadiText(text: string): SaadiParsed {
  const paragraphs: SaadiParagraph[] = [{ runs: [], heading: false }];
  const notes: string[] = [];
  const push = (run: SaadiRun) => paragraphs[paragraphs.length - 1].runs.push(run);
  let buffer = "";
  let inQuote = false;
  const flush = () => {
    if (buffer) push({ kind: inQuote ? "quote" : "text", text: buffer });
    buffer = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === NOTE_OPEN) {
      flush();
      const end = text.indexOf(NOTE_CLOSE, i + 1);
      const nextOpen = text.indexOf(NOTE_OPEN, i + 1);
      const closed = end !== -1 && (nextOpen === -1 || end < nextOpen);
      const stop = closed ? end : nextOpen !== -1 ? nextOpen : text.length;
      notes.push(text.slice(i + 1, stop));
      push({ kind: "note", index: notes.length - 1, closed });
      i = closed ? stop : stop - 1;
    } else if (ch === NOTE_CLOSE) {
      flush();
      push({ kind: "stray", text: ch });
    } else if (ch === "\n") {
      flush();
      inQuote = false;
      paragraphs.push({ runs: [], heading: false });
    } else if (ch === "{") {
      const marker = /^\{(\d+)\}/.exec(text.slice(i, i + 12));
      flush();
      if (marker) {
        push({ kind: "marker", text: marker[0], verse: Number(marker[1]) });
        i += marker[0].length - 1;
      } else {
        inQuote = true;
        buffer = ch;
      }
    } else if (ch === "}" && inQuote) {
      buffer += ch;
      flush();
      inQuote = false;
    } else {
      buffer += ch;
    }
  }
  flush();
  const headingVerses: number[] = [];
  const commentVerses: number[] = [];
  for (const p of paragraphs) {
    const numbers = p.runs.flatMap((r) => (r.kind === "quote" ? [...r.text.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])) : []));
    p.heading = numbers.length > 0;
    for (const n of numbers) if (!headingVerses.includes(n)) headingVerses.push(n);
    for (const r of p.runs) if (r.kind === "marker" && !commentVerses.includes(r.verse)) commentVerses.push(r.verse);
  }
  return { paragraphs: paragraphs.filter((p) => p.runs.length > 0), notes, headingVerses, commentVerses };
}

/** A parse joined back into the source's characters: what the test holds it to. */
export function joinSaadiParsed(parsed: SaadiParsed): string {
  return parsed.paragraphs
    .map((p) =>
      p.runs
        .map((r) => (r.kind === "note" ? `${NOTE_OPEN}${parsed.notes[r.index]}${r.closed ? NOTE_CLOSE : ""}` : r.text))
        .join(""),
    )
    .join("\n");
}

const cache = new Map<number, Promise<SaadiSurah | null>>();

export function loadSaadiSurah(surah: number): Promise<SaadiSurah | null> {
  let entry = cache.get(surah);
  if (!entry) {
    const load = FILES[`../data/tafsir/saadi-itqan/surah-${surah}.json`];
    entry = load
      ? load().then(
          (m) => m.default,
          () => {
            cache.delete(surah);
            return null;
          },
        )
      : Promise.resolve(null);
    cache.set(surah, entry);
  }
  return entry;
}

export type SaadiVerse =
  | {
      status: "found";
      text: string;
      parsed: SaadiParsed;
      /** The run of verses the book's heading gives together with this one: [] when it gives this verse alone. */
      together: number[];
    }
  | { status: "invalid" }
  | { status: "load-failed" };

/**
 * The consecutive verses printed with this one under a single heading. Separate headings
 * in one place (13:25, 13:26) aren't that, and neither is a heading citing a verse from
 * elsewhere with its number (25:9 cites verse 1).
 */
export function headingRun(parsed: SaadiParsed, ayah: number): number[] {
  for (const p of parsed.paragraphs) {
    if (!p.heading) continue;
    const numbers = p.runs.flatMap((r) => (r.kind === "quote" ? [...r.text.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])) : []));
    if (!numbers.includes(ayah)) continue;
    let from = ayah;
    let to = ayah;
    while (numbers.includes(from - 1)) from--;
    while (numbers.includes(to + 1)) to++;
    if (from !== to) return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }
  return [];
}

export async function getSaadiVerse(surah: number, ayah: number): Promise<SaadiVerse> {
  if (!isValidVerse(surah, ayah)) return { status: "invalid" };
  const data = await loadSaadiSurah(surah);
  const row = data?.ayat.find((a) => a.ayah === ayah);
  if (!row) return { status: "load-failed" };
  const parsed = parseSaadiText(row.text);
  // A verse printed under the previous verse's heading belongs to that same run.
  let together = headingRun(parsed, ayah);
  if (together.length === 0) {
    const before = data?.ayat.find((a) => a.ayah === ayah - 1);
    const run = before ? headingRun(parseSaadiText(before.text), ayah - 1) : [];
    if (run.includes(ayah)) together = run;
  }
  return { status: "found", text: row.text, parsed, together };
}

/** The neighbouring verse in Qur'an order, across surahs; null at either end. */
export function neighbourVerse(surah: number, ayah: number, step: 1 | -1): { surah: number; ayah: number } | null {
  const count = surahMeta(surah)?.ayahCount ?? 0;
  const next = ayah + step;
  if (next >= 1 && next <= count) return { surah, ayah: next };
  const other = surah + step;
  const meta = surahMeta(other);
  if (!meta) return null;
  return { surah: other, ayah: step === 1 ? 1 : meta.ayahCount };
}

/** Test seam. */
export function resetSaadiCacheForTesting(): void {
  cache.clear();
}
