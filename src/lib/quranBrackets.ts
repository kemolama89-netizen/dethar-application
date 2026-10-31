// DITHAR's one rule for showing Qur'anic text: every Qur'anic verse in the
// Qur'anic brackets ﴿ … ﴾ — on the home-screen widget (lib/widgetFeed.ts,
// lib/remindersSync.ts) and in the full-screen views (the reminder view
// components/SpiritualReminderView.tsx, Favorites). Display only: the stored
// text, notifications, sharing and the review tools keep the text as written.
import type { ReminderItem, ReminderKind } from "./reminderContent";

/** Items whose whole text is a Qur'anic verse: the Qur'an's own duas, the verses and the Lataif verses. */
const QURAN_KINDS: ReadonlySet<ReminderKind> = new Set(["quran-dua", "quran", "lataif"]);

/**
 * Duas whose wording quotes a verse alongside wording of their own: the
 * Qur'anic portion only, exactly as the dua writes it — only that portion is
 * put in the Qur'anic brackets. Every published dua and dhikr was checked
 * against the Qur'an (Tanzil); a shared phrase in a Prophetic formula is not
 * a quotation (e.g. «لا إله إلا الله» in دعاء الكرب, «من شر ما خلق» in
 * «أعوذ بكلمات الله التامات», «له الملك وله الحمد…» in the tahlil) — see
 * WIDGET_NOT_QURAN_QUOTES in widgetFeed.test.ts.
 */
export const QURANIC_PORTIONS: Readonly<Record<string, readonly string[]>> = {
  // al-Baqarah 156 — the words Allah commands at a calamity («فيقول ما أمره الله: إنا لله وإنا إليه راجعون…», Muslim 918).
  "dua:inna-lillahi-wa-inna-ilayhi-rajiun": ["إنا لله وإنا إليه راجعون"],
};
/** A Qur'anic quotation inside another text, in braces (e.g. «لا أقول {الم} حرف»). */
const BRACED_QUOTE = /\{\s*([^}]*?)\s*\}/gu;
/** The full stop some duas end with — DITHAR's punctuation, kept after the closing bracket. */
const TRAILING_STOP = /[.\u06D4]+$/u;
/** A verse in the Qur'anic brackets, held to them by no-break spaces as the texts already do («﴿ … ﴾»). */
export const inQuranBrackets = (verse: string) => `\uFD3F\u00A0${verse}\u00A0\uFD3E`;

/**
 * A reminder's Arabic text as DITHAR shows it — on the home-screen widget
 * and in every full-screen view: every Qur'anic verse in the Qur'anic
 * brackets ﴿ … ﴾, and nothing else — the verse's letters, diacritics and
 * punctuation the same, letter for letter.
 *  - A whole-verse item (a Qur'anic dua, a verse, a Lataif verse) is wrapped
 *    whole; a dua's closing full stop stays, after the bracket. One already
 *    in the brackets is left as it is.
 *  - In a dua that also has wording of its own, only its Qur'anic portion
 *    (QURANIC_PORTIONS).
 *  - A Qur'anic quotation marked in braces inside another text (a Hadith's
 *    «{الم}»); the rest of a Hadith, ordinary duas and adhkar are returned as
 *    they are.
 */
export function withQuranBrackets(item: Pick<ReminderItem, "id" | "kind">, text: string): string {
  if (QURAN_KINDS.has(item.kind)) {
    const verse = text.trim();
    if (verse.startsWith("\uFD3F")) return text;
    const stop = TRAILING_STOP.exec(verse)?.[0] ?? "";
    return `${inQuranBrackets(verse.slice(0, verse.length - stop.length).trimEnd())}${stop}`;
  }
  let out = quotedQuranInBrackets(text);
  for (const portion of QURANIC_PORTIONS[item.id] ?? []) {
    if (out.includes(portion) && !out.includes(inQuranBrackets(portion))) out = out.replace(portion, inQuranBrackets(portion));
  }
  return out;
}

/**
 * An explanation's or tafsir's Arabic (a Wamada insight, al-Sa'di): the
 * Qur'anic words it quotes in braces («{أَنطَقَنَا}؛ معناها…») in the
 * Qur'anic brackets instead; its own words are left as they are.
 */
export function quotedQuranInBrackets(text: string): string {
  return text.replace(BRACED_QUOTE, (_match, quote: string) => inQuranBrackets(quote));
}
