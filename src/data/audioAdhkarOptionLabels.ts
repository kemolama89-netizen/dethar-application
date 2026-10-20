// How an Audio Adhkar option is NAMED in the settings checklists, in the
// interface language. Selections are always saved by the dhikr's stable id
// (written-adhkar id, or "tasbeeh-<n>" for Various), never by this text — so
// switching the language changes only what is shown, never what is
// selected or scheduled.
//
// English names come from fields the content already has (Morning/Evening
// `title_en`, Various transliteration + `text_en` meaning); nothing is
// translated here. The Arabic dhikr wording itself is never altered.
import { writtenAdhkarItems } from "./written-adhkar";
import { AUDIO_VARIOUS_ITEMS } from "./audio-adhkar";
import { getSpokenText } from "../lib/morningEveningAudio";
import type { Language } from "../theme/LanguageContext";

export type AudioOptionSection = "morning" | "evening" | "misc";

export interface AudioOptionLabel {
  title: string;
  /** A second, quieter line (the English meaning of a Various dhikr). */
  subtitle?: string;
}

export function audioAdhkarOptionLabel(section: AudioOptionSection, id: string, language: Language): AudioOptionLabel | null {
  if (section === "misc") {
    const item = AUDIO_VARIOUS_ITEMS.find((i) => i.id === id);
    if (!item) return null;
    if (language === "en" && item.transliteration_en) return { title: item.transliteration_en, subtitle: item.text_en || undefined };
    return { title: item.text_ar };
  }
  const item = writtenAdhkarItems[section].find((i) => i.id === id);
  if (!item) return null;
  if (language === "en") {
    const title = item.title_en || item.text_en;
    if (title) return { title };
  }
  return { title: item.title_ar ?? getSpokenText(item.text_ar) };
}
