// What sharing a reminder item carries (components/SpiritualReminderView.tsx
// and FavoritesView.tsx): the same texts the full-screen view shows, in the
// same order and under the same labels — the main text and its source, then
// the verified evidence (a verse's tafsir or Lataif insight, a Hadith from
// the Sunnah, a verse from the Qur'an) with its own source, then DITHAR's
// reflection with its "not a narrated text" note. Nothing is shortened.
import { reminderLabels } from "../data/reminderLabels";
import type { EditorialComment } from "../data/widgetContent";
import type { ReminderItem } from "./reminderContent";
import type { ShareableContent, ShareSection } from "./shareContent";

/** The labelled sections shown beneath [item]'s main text, with [comment] (the DITHAR comment shown with it). */
export function reminderShareSections(
  item: ReminderItem | undefined,
  comment: { ar: string; en: string } | EditorialComment | undefined,
  language: "ar" | "en",
): ShareSection[] {
  const t = reminderLabels[language];
  const isEn = language === "en";
  const sections: ShareSection[] = [];
  const evidence = item?.evidence;
  if (item && evidence) {
    const text = isEn && evidence.en ? evidence.en : evidence.ar;
    if (item.category === "virtue") {
      // The view shows a dhikr's virtue under «من السنة»; its source is the item's own source line, already shared.
      sections.push({ label: t.sunnahLabel, text });
    } else {
      const label = evidence.kind === "quran" ? t.quranLabel : evidence.kind === "tafsir" ? t.tafsirLabel : evidence.kind === "insight" ? t.insightLabel : t.sunnahLabel;
      const source = isEn ? (evidence.sourceEn ?? evidence.sourceAr) : evidence.sourceAr;
      sections.push({ label, text, source: source || undefined });
    }
  }
  const commentText = comment ? comment[language] : undefined;
  const reflection = item?.reflection?.[language];
  const reflectionText = [commentText, reflection].filter((s): s is string => Boolean(s?.trim())).join("\n\n");
  if (reflectionText) sections.push({ label: t.commentLabel, text: reflectionText, note: t.reflectionNote });
  return sections;
}

/** The complete shareable content of [item] as the full-screen view shows it. */
export function reminderShareContent(
  item: ReminderItem,
  comment: EditorialComment | undefined,
  language: "ar" | "en",
  extra: Pick<ShareableContent, "kindLabel" | "background"> = {},
): ShareableContent {
  const source = language === "en" ? item.sourceEn : item.sourceAr;
  return {
    ...extra,
    textAr: item.textAr,
    meaningEn: item.meaningEn,
    reference: source || undefined,
    isPoetry: item.category === "poetry",
    sections: reminderShareSections(item, comment, language),
  };
}
