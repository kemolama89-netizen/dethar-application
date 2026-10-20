// The Qur'an verses and Tafsir passages DITHAR's reminders show (Wamdat
// Lataif, the al-Sa'di Lataif, the short verses, the Qur'anic duas), checked
// against their sources — not against values written by hand:
//   - __fixtures__/tanzil-simple-cited.txt: Tanzil's Simple text (verbatim
//     lines, with provenance) for every verse this content cites;
//   - __fixtures__/saadi-cited.json: al-Sa'di's commentary on the cited verses.
// It guards the 2026-10-17 audit: words split during data preparation
// («وَلَ كِنَّ» for «وَلَٰكِنَّ»), mistyped or wrong words («مَعِيشَةً» for
// «حَيَاةً»), wrong vowels («وَوَضِعَ» for «وَوُضِعَ»), and range markers left
// inside the shown verse («…} [الآية 62-63]») under a reference without its
// verse numbers.
import { describe, expect, it } from "vitest";
import tanzilRaw from "./__fixtures__/tanzil-simple-cited.txt?raw";
import saadi from "./__fixtures__/saadi-cited.json";
import { WAMDAT, WAMDA_NEEDS_VERIFICATION, getWamdaQuranRef, getWamdaVerseReference, getWamdaVerseText } from "../data/wamdat";
import type { WamdaEntry } from "../data/wamdat";
import { QURAN_LATAIF } from "../data/quranLataif";
import { DITHAR_WAMDAt_524_INSIGHT_EN } from "../../ASSETS/DITHAR_Wamdat_524_Insight_EN_FINAL_CHECKED";
import { WIDGET_VERSES } from "../data/widgetVerses";
import { surahNumberFromArabicName } from "../data/quranSurahs";
import { reminderCandidates, reminderPool } from "./reminderContent";
import { defaultReviewStatus } from "./contentReview";

const TANZIL = new Map<string, string>();
for (const line of tanzilRaw.split("\n")) {
  const [s, a, text] = line.split("|");
  if (text && /^\d+$/.test(s)) TANZIL.set(`${s}:${a}`, text);
}

/** Letters only: vowels and Qur'anic marks removed, alef forms and ى/ي unified — for word-for-word comparison. */
function letterWords(text: string): string[] {
  return text
    .normalize("NFC")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^ء-ي\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function cited(surah: number, from: number, to: number): string[] {
  const out: string[] = [];
  for (let a = from; a <= to; a++) {
    const text = TANZIL.get(`${surah}:${a}`);
    if (text === undefined) throw new Error(`fixture lacks ${surah}:${a}`);
    out.push(...text.split(" "));
  }
  return out;
}

function indexOf(seq: string[], hay: string[], from = 0): number {
  outer: for (let i = from; i + seq.length <= hay.length; i++) {
    for (let k = 0; k < seq.length; k++) if (hay[i + k] !== seq[k]) continue outer;
    return i;
  }
  return -1;
}

/** Each piece of [text] (split at «*» verse breaks and «...» elisions) occurs word for word, in order, in [passage]. */
function isVerbatimExcerpt(text: string, passage: string[]): boolean {
  const hay = passage.flatMap(letterWords);
  let pos = 0;
  for (const piece of text.split(/\*|\.\.\.|…/)) {
    const words = letterWords(piece);
    if (words.length === 0) continue;
    const i = indexOf(words, hay, pos);
    if (i < 0) return false;
    pos = i + words.length;
  }
  return true;
}

function wamdaPassage(entry: WamdaEntry): string[] {
  const ref = getWamdaQuranRef(entry);
  if (ref) return cited(ref.surah, ref.fromAyah, ref.toAyah);
  // Entries 1 and 2 state no verse numbers in the source: al-Fatihah as a whole.
  expect(entry.surah).toBe("الفاتحة");
  return cited(1, 1, 7);
}

const wamda = (id: number) => WAMDAT.find((e) => e.id === id)!;

describe("Qur'an verses shown in reminders, against Tanzil", () => {
  it("every Wamdat verse is its COMPLETE cited verse(s), word for word — the only exception is held back", () => {
    const failing = WAMDAT.filter((e) => {
      const passage = wamdaPassage(e).flatMap(letterWords);
      const shown = getWamdaVerseText(e).split(/\*|\.\.\.|…/).flatMap(letterWords);
      // Entries 1 and 2 quote al-Fatihah 1:2-5 and 1:5 without a marker: complete verses of it, in order.
      if (!getWamdaQuranRef(e)) return indexOf(shown, passage) < 0;
      return shown.join(" ") !== passage.join(" ");
    }).map((e) => e.id);
    expect(failing).toEqual([16]);
    expect(16 in WAMDA_NEEDS_VERIFICATION).toBe(true);
  });

  it("al-Qasas 28:79 is shown whole (it used to stop at «قَارُونُ», without «إِنَّهُ لَذُو حَظٍّ عَظِيمٍ»)", () => {
    const entry = wamda(252);
    expect(getWamdaVerseText(entry).normalize("NFC")).toBe(TANZIL.get("28:79")!.normalize("NFC"));
    expect(getWamdaVerseText(entry).normalize("NFC").endsWith("إِنَّهُ لَذُو حَظٍّ عَظِيمٍ".normalize("NFC"))).toBe(true);
    expect(getWamdaVerseReference(entry)).toBe("سورة القصص – الآية 79");
  });

  it("the 40 corrected verses are now exactly Tanzil's words, vowels included", () => {
    const FIXED = [18, 25, 27, 30, 31, 37, 47, 55, 58, 74, 106, 110, 117, 118, 122, 128, 142, 143, 144, 150, 160, 167, 176, 188, 205, 229, 239, 240, 250, 255, 270, 287, 321, 325, 352, 386, 410, 463, 468, 517];
    for (const id of FIXED) {
      const entry = wamda(id);
      const passage = wamdaPassage(entry).map((w) => w.normalize("NFC"));
      for (const piece of getWamdaVerseText(entry).split("*")) {
        const words = piece.trim().split(/\s+/).map((w) => w.normalize("NFC"));
        expect(indexOf(words, passage), `w${id}: «${piece.trim()}»`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("keeps the exact failing examples fixed", () => {
    const text = (id: number) => getWamdaVerseText(wamda(id)).normalize("NFC");
    const nfc = (s: string) => s.normalize("NFC");
    // Words split when the dagger alif was lost in data preparation.
    expect(text(250)).toContain(nfc("وَلَٰكِنَّ"));
    expect(text(250)).not.toContain(nfc("وَلَ كِنَّ"));
    expect(text(287)).toContain(nfc("أُولَٰئِكَ"));
    // Two words run together.
    expect(text(255)).toContain(nfc("وَيَعْفُو عَن"));
    // Wrong or mistyped words.
    expect(text(106)).toContain(nfc("حَيَاةً طَيِّبَةً"));
    expect(text(106)).not.toContain(nfc("مَعِيشَةً"));
    expect(text(142)).toContain(nfc("حَرَّمْنَا"));
    expect(text(27)).toContain(nfc("خَلْفِهِمْ"));
    // Wrong vowels.
    expect(text(128)).toContain(nfc("وَوُضِعَ"));
    expect(text(410)).toContain(nfc("السَّقْفُ"));
    expect(text(117)).toContain(nfc("وَالْبَصَرَ"));
    // A misquoted opening, restored as Tanzil has it.
    // A misquoted opening; the record now holds the whole verse, as Tanzil has it.
    expect(text(468)).toBe(TANZIL.get("64:9")!.normalize("NFC"));
  });

  it("shows no brace or marker inside a verse, and every stated verse number in its reference", () => {
    for (const e of WAMDAT) {
      expect(getWamdaVerseText(e), `w${e.id}`).not.toMatch(/[{}[\]]/);
      if (getWamdaQuranRef(e)) expect(getWamdaVerseReference(e), `w${e.id}`).toMatch(/الآي(ة|تان|ات) \d/);
    }
    expect(getWamdaVerseReference(wamda(66))).toBe("سورة يونس – الآيتان 62–63");
    expect(getWamdaVerseReference(wamda(494))).toBe("سورة البلد – الآيات 1–4");
    expect(getWamdaVerseReference(wamda(183))).toBe("سورة آل عمران – الآية 124");
    expect(getWamdaVerseText(wamda(494)).endsWith("كَبَدٍ")).toBe(true);
  });

  it("every word a Wamdat reflection quotes in «{…}» after the fixes is still Qur'anic wording (the three corrected quotes)", () => {
    expect(wamda(31).insightAr.normalize("NFC")).toContain("{" + "فَطَوَّعَتْ".normalize("NFC") + "}");
    expect(wamda(339).insightAr.normalize("NFC")).toContain("{" + "مِيثَاقِهِ".normalize("NFC") + "}");
    expect(wamda(383).insightAr.normalize("NFC")).toContain("{" + "لِيُثْبِتُوكَ".normalize("NFC") + "}");
  });

  it("the al-Sa'di Lataif verses and the short verses match Tanzil word for word", () => {
    for (const l of QURAN_LATAIF) expect(isVerbatimExcerpt(l.verseAr, cited(l.surah, l.ayahs[0], l.ayahs[l.ayahs.length - 1])), l.id).toBe(true);
    for (const v of WIDGET_VERSES) {
      const [s, a] = v.verseKey.split(":").map(Number);
      expect(isVerbatimExcerpt(v.textAr, cited(s, a, a)), v.id).toBe(true);
    }
  });

  it("every Qur'anic dua matches the verse its source line cites", () => {
    const duas = reminderCandidates().filter((i) => i.kind === "quran-dua");
    expect(duas.length).toBeGreaterThan(20);
    for (const d of duas) {
      const m = d.sourceAr.match(/سورة\s+([^،,]+)[،,]\s*(?:الآية|الآيتان|الآيات)\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
      expect(m, d.id).not.toBeNull();
      const surah = surahNumberFromArabicName(m![1].trim());
      expect(surah, d.id).toBeDefined();
      expect(isVerbatimExcerpt(d.textAr, cited(surah!, Number(m![2]), Number(m![3] ?? m![2]))), d.id).toBe(true);
    }
  });
});

describe("excerpts are labelled as excerpts", () => {
  it("an al-Sa'di Lataif verse that is part of its verse says «من …» in its reference", () => {
    const items = new Map(reminderCandidates().map((i) => [i.id, i]));
    for (const l of QURAN_LATAIF) {
      const item = items.get(`lataif:${l.id}`);
      if (!item) continue;
      const complete = letterWords(l.verseAr).join(" ") === cited(l.surah, l.ayahs[0], l.ayahs[l.ayahs.length - 1]).flatMap(letterWords).join(" ");
      expect(l.excerpt, l.id).toBe(!complete);
      expect(item.sourceAr.includes("— من "), l.id).toBe(!complete);
    }
  });
});

describe("Wamdat reflections are complete", () => {
  // Revised on purpose in the source-aligned working version (complete sentences, more cautious wording); all others are the audited master text.
  const REWRITTEN = [3, 4, 6, 8, 10, 12, 14, 15, 31, 35, 38, 40, 47, 62, 68, 89, 104, 124, 131, 206, 339, 383];
  const master = new Map(DITHAR_WAMDAt_524_INSIGHT_EN.map((e) => [e.id, e]));

  it("every reflection is the audited master text, or one of the deliberate rewrites — never a cut-down copy", () => {
    const differing = WAMDAT.filter((e) => e.insightAr !== master.get(e.id)!.insightAr).map((e) => e.id);
    expect(differing).toEqual(REWRITTEN);
    // The English is the master's rendering of that same Arabic — except where an earlier edit improved it:
    // 70 (an embedded Arabic term transliterated) and 117, 215, 298 (the placeholder "the Qur'anic expression" replaced by the phrase itself).
    const EN_IMPROVED = [70, 117, 215, 298];
    for (const e of WAMDAT) if (!REWRITTEN.includes(e.id) && !EN_IMPROVED.includes(e.id)) expect(e.insightEn, `w${e.id}`).toBe(master.get(e.id)!.insightEn);
  });

  it("no reflection has a word cut down to a fragment («المقارنات ال؛», «شرعياً و.»)", () => {
    const fragment = /(^|[\s(«{])(و|ب|ل|ف|ك|ال|وال|بال|لل)(?=[\s؛.،:)»}]|$)/;
    for (const e of WAMDAT) expect(e.insightAr, `w${e.id}`).not.toMatch(fragment);
    expect(wamda(252).insightAr).toContain("المقارنات المادية الاجتماعية؛ مشهد خروج قارون بكامل أبهته المادية");
  });
});

describe("Tafsir al-Sa'di passages, against the source", () => {
  it("every passage is a word-for-word excerpt of al-Sa'di's commentary on its cited verse (or the group it comments with)", () => {
    const texts = (saadi as { texts: Record<string, string> }).texts;
    for (const l of QURAN_LATAIF) {
      const [s, a] = l.tafsirRef.split(":").map(Number);
      const commentary: string[] = [];
      for (let x = Math.max(1, a - 6); x <= a; x++) if (texts[`${s}:${x}`]) commentary.push(texts[`${s}:${x}`]);
      expect(commentary.length, l.id).toBeGreaterThan(0);
      expect(isVerbatimExcerpt(l.tafsirAr, commentary.join(" ").split(/\s+/)), `${l.id}: ${l.tafsirAr}`).toBe(true);
    }
  });
});

describe("records whose verse, reference and reflection disagree", () => {
  it("are held for review and not shown", () => {
    expect(Object.keys(WAMDA_NEEDS_VERIFICATION).map(Number).sort((a, b) => a - b)).toEqual([16, 183, 232]);
    const shown = new Set(reminderPool().map((i) => i.id));
    for (const id of [16, 183, 232]) {
      expect(defaultReviewStatus(`lataif:w${id}`)).toBe("needs-verification");
      expect(shown.has(`lataif:w${id}`)).toBe(false);
    }
    // Every other Wamdat entry keeps its previous default.
    expect(defaultReviewStatus("lataif:w106")).toBe("approved");
  });
});
