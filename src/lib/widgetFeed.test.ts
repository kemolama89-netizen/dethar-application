import { describe, expect, it } from "vitest";
import { GENERIC_DUA_COMMENT_ID, WIDGET_EXCLUDED_HADITHS, WIDGET_MAX_TEXT_CHARS, isWidgetComment, isWidgetItem, widgetTextProblem } from "./widgetFeed";
import { reminderCandidates } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";

const item = (over: Partial<ReminderItem>): ReminderItem => ({
  id: "hadith:x",
  category: "hadith",
  kind: "hadith",
  textAr: "«الكلمة الطيبة صدقة»",
  meaningEn: "A good word is charity.",
  sourceAr: "متفق عليه",
  comments: [],
  theme: "hadith",
  ...over,
});

describe("widgetTextProblem", () => {
  it("accepts ordinary vowelled Arabic and the ornate Qur'anic brackets", () => {
    expect(widgetTextProblem("﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً ﴾")).toBeNull();
    expect(widgetTextProblem("«إنما الأعمال بالنيات»")).toBeNull();
  });
  it("rejects a pause mark standing alone after a space (drawn on a dotted circle)", () => {
    expect(widgetTextProblem("رَحْمَةِ اللَّهِ \u06DA إِنَّ اللَّهَ")).toBe("detached-mark");
  });
  it("rejects a stray closing brace left from a verse range", () => {
    expect(widgetTextProblem("وَكَانُوا يَتَّقُونَ} [الآية 62-63]")).toBe("unbalanced-bracket");
  });
  it("rejects presentation-form ligatures and invisible direction marks", () => {
    expect(widgetTextProblem("قال \uFDFA")).toBe("fragile-character");
    expect(widgetTextProblem("نص \u200F")).toBe("fragile-character");
  });
});

describe("isWidgetItem", () => {
  it("keeps a short, clean item", () => {
    expect(isWidgetItem(item({}), "ar")).toBe(true);
    expect(isWidgetItem(item({}), "en")).toBe(true);
  });
  it("leaves out Wamdat verse fragments", () => {
    expect(isWidgetItem(item({ id: "lataif:w12", category: "lataif", kind: "lataif" }), "ar")).toBe(false);
  });
  it("leaves out texts too long to read at a glance — it never shortens them", () => {
    expect(isWidgetItem(item({ textAr: "ا".repeat(WIDGET_MAX_TEXT_CHARS + 1) }), "ar")).toBe(false);
  });
  it("leaves out an item without an English meaning in English only", () => {
    expect(isWidgetItem(item({ meaningEn: undefined }), "ar")).toBe(true);
    expect(isWidgetItem(item({ meaningEn: undefined }), "en")).toBe(false);
  });
  it("leaves out the listed Hadiths", () => {
    for (const id of Object.keys(WIDGET_EXCLUDED_HADITHS)) expect(isWidgetItem(item({ id }), "ar")).toBe(false);
  });
  it("every listed Hadith exists, so the list can't silently go stale", () => {
    const ids = new Set(reminderCandidates().map((i) => i.id));
    for (const id of Object.keys(WIDGET_EXCLUDED_HADITHS)) expect(ids.has(id), id).toBe(true);
  });
  it("every candidate the widget may show is free of rendering hazards", () => {
    for (const i of reminderCandidates().filter((c) => isWidgetItem(c, "ar"))) expect(widgetTextProblem(i.textAr), i.id).toBeNull();
  });
});

describe("isWidgetComment", () => {
  it("drops the generic dua line repeated under every dua", () => {
    expect(isWidgetComment({ id: GENERIC_DUA_COMMENT_ID, style: "reflection", ar: "نص", en: "text" }, "ar")).toBe(false);
  });
  it("drops long comments, per language", () => {
    const c = { id: "c", style: "reflection" as const, ar: "قصير", en: "x".repeat(200) };
    expect(isWidgetComment(c, "ar")).toBe(true);
    expect(isWidgetComment(c, "en")).toBe(false);
  });
});
