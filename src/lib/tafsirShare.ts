// Sharing a verse together with its Tafsir al-Sa'di from Basa'ir
// (components/basair/TafsirReadingView.tsx), through the same share sheet and
// image card as every other share (lib/shareContent.ts, lib/shareImage.ts).
//
// Nothing here writes or changes a word:
//  - the verse is Tanzil's marked text, exactly as the Mushaf shares it
//    (lib/quranShareText.ts), drawn in the bundled Qur'anic font on the image,
//    which is the portrait Tafsir card (lib/shareImageTafsir.ts);
//  - the Tafsir is al-Sa'di's text exactly as the screen shows it: every
//    paragraph, with its quoted Qur'an, braces and verse markers. The editor's
//    footnotes (¬…¥ in the source), which the screen sets apart under their own
//    heading, are left out, and so is a stray ¥ the screen doesn't draw — so the
//    shared Tafsir is al-Sa'di's own words, character for character
//    (tafsirShare.test.ts checks this for all 6,236 verses).
import type { ShareableContent } from "./shareContent";
import type { SaadiParsed } from "./saadiTafsir";

const shownText = (paragraphs: SaadiParsed["paragraphs"]) =>
  paragraphs
    .map((p) =>
      p.runs
        .map((r) => (r.kind === "text" || r.kind === "quote" || r.kind === "marker" ? r.text : ""))
        .join(""),
    )
    .filter((line) => line.trim().length > 0)
    .join("\n");

/** Al-Sa'di's text for one verse as shown, without the editor's footnotes. */
export function saadiTextForSharing(parsed: SaadiParsed): string {
  return shownText(parsed.paragraphs);
}

/** The verse numbers a heading paragraph quotes, from the (n) in its quoted Qur'an. */
const headingVerses = (p: SaadiParsed["paragraphs"][number]) =>
  p.runs.flatMap((r) => (r.kind === "quote" ? [...r.text.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1])) : []));

/**
 * The Tafsir as the card draws it under the verse: without the book's heading paragraph
 * that is only a quotation of this very verse (the card already shows the verse, in the Mushaf's
 * text). Every other paragraph is kept whole and in order: a heading that also quotes other
 * verses or has the book's own words around it stays, and when the heading is all the book
 * gives, it stays too.
 */
export function saadiTextForCard(parsed: SaadiParsed, ayah: number): string {
  const text = shownText(paragraphsUnderVerse(parsed, ayah));
  return text.trim() ? text : saadiTextForSharing(parsed);
}

/**
 * al-Sa'di's paragraphs as shown under the verse itself (the share card, the Tafsir booklet over the
 * Mushaf): every paragraph whole and in order, except the book's heading that is only a quotation of
 * this very verse — the verse is already there, in the Mushaf's text. When that heading is all the
 * book gives, it stays.
 */
export function paragraphsUnderVerse(parsed: SaadiParsed, ayah: number): SaadiParsed["paragraphs"] {
  const rest = parsed.paragraphs.filter((p) => {
    if (!p.heading) return true;
    const verses = headingVerses(p);
    // Only the quotation itself, with the editor's brackets and full stop: any words of the book's own
    // around it («قوله تعالى:») keep the whole paragraph.
    const quotationOnly = p.runs.every((r) => r.kind === "quote" || r.kind === "note" || r.kind === "stray" || /^[\s.[\]]*$/.test(r.text));
    return !(quotationOnly && verses.length === 1 && verses[0] === ayah);
  });
  return shownText(rest).trim() ? rest : parsed.paragraphs;
}

export interface TafsirShareLabels {
  kind: string;
  /** e.g. «سورة البقرة · الآية ٢» */
  reference: string;
  tafsirLabel: string;
  /** The book and its author, as the screen's source footer gives them. */
  source: string;
}

/** The share: the verse (with its end sign on the image), its reference, and the Tafsir under its own label and source. */
export function tafsirShareContent(
  verse: { surah: number; ayah: number; text: string },
  tafsir: string,
  labels: TafsirShareLabels,
  /** The Tafsir as the card draws it (saadiTextForCard), when it differs. */
  cardTafsir?: string,
): ShareableContent {
  return {
    kindLabel: labels.kind,
    textAr: verse.text,
    reference: labels.reference,
    quranVerse: { ayah: verse.ayah },
    sections: [{ label: labels.tafsirLabel, text: tafsir, source: labels.source, ...(cardTafsir && cardTafsir !== tafsir ? { imageText: cardTafsir } : {}) }],
    tafsirCard: true,
  };
}
