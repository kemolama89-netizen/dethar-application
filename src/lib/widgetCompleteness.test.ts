// What the home-screen widget is offered must read as whole, calm Arabic:
// no line able to start with a bare «،», no dhikr virtue shown without its
// virtue, no text with known wording slips — and nothing in the religious
// wording itself is ever changed to get there.
import { describe, expect, it } from "vitest";
import { bindDetachedMarks, tidyArabicSpacing } from "./arabicTypography";
import { reminderCandidates, reminderPool } from "./reminderContent";
import { WIDGET_MAX_TEXT_CHARS, WIDGET_WORDING_REVIEW, isWidgetItem, widgetDetail } from "./widgetFeed";
import { nativeReminderItem } from "./remindersSync";
import { dhikrItems } from "../data/tasbeeh";
import { HADITHS } from "../data/hadith";

const strip = (s: string) => s.replace(/\s+/g, "");

describe("tidyArabicSpacing", () => {
  it("removes a space before a comma or closing mark, and after an opening one", () => {
    expect(tidyArabicSpacing("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ")).toBe("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ");
    expect(tidyArabicSpacing("قال: « ذكر الله » .")).toBe("قال: «ذكر الله».");
  });
  it("changes whitespace only — every letter, diacritic and mark stays, and poem lines stay apart", () => {
    const text = "اللَّهُ أَكْبَرُ كَبِيرًا ، وَالْحَمْدُ لِلَّهِ كَثِيرًا  ،\nوَسُبْحَانَ اللَّهِ بُكْرَةً وَأَصِيلاً.";
    const tidy = tidyArabicSpacing(text);
    expect(strip(tidy)).toBe(strip(text));
    expect(tidy.split("\n")).toHaveLength(2);
  });
  it("leaves a Qur'anic pause mark after its space alone (the widget filter decides about those)", () => {
    expect(tidyArabicSpacing("ٱلْقَيُّومُ ۚ لَا")).toBe("ٱلْقَيُّومُ ۚ لَا");
  });
});

describe("the widget's content", () => {
  const pool = reminderPool();

  it("never offers a text, source or comment where a line could start with a bare punctuation mark", () => {
    for (const language of ["ar", "en"] as const) {
      for (const item of pool.filter((i) => isWidgetItem(i, language))) {
        const native = nativeReminderItem(item, language);
        for (const text of [native.text, native.detail ?? "", ...native.comments.filter((c) => c.widget).map((c) => c.text)]) {
          expect(text, item.id).not.toMatch(/[ \t][،؛:.؟!»]/);
        }
      }
    }
  });

  it("never leaves a dash, slash or Qur'anic bracket alone between ordinary spaces, where a line could start or end with it", () => {
    for (const language of ["ar", "en"] as const) {
      for (const item of pool.filter((i) => isWidgetItem(i, language))) {
        const native = nativeReminderItem(item, language);
        const strings = [native.title, native.text, native.meaning, native.source, native.detail ?? "", ...native.comments.filter((c) => c.widget).map((c) => c.text)];
        for (const text of strings) {
          for (const token of text.split(/[ \t\n]+/).filter(Boolean)) expect(token, `${item.id}: ${text}`).not.toMatch(/^[—–\-/*،؛:.؟!»]+$/);
          expect(text, item.id).not.toMatch(/﴿[ \t]|[ \t]﴾/);
        }
      }
    }
  });

  it("binds a mark only with a no-break space — what is drawn reads the same", () => {
    expect(bindDetachedMarks("صحيح البخاري / صحيح مسلم — صحيح")).toBe("صحيح البخاري\u00A0/ صحيح مسلم\u00A0— صحيح");
    expect(bindDetachedMarks("﴿ رَبَّنَا آتِنَا ﴾")).toBe("﴿\u00A0رَبَّنَا آتِنَا\u00A0﴾");
    // A narrator's parenthetical doubt («-أو تملأ-») is part of the Hadith and is attached to its words: untouched.
    expect(bindDetachedMarks("تملآن -أو تملأ- ما بين")).toBe("تملآن -أو تملأ- ما بين");
  });

  it("keeps every Hadith and dhikr wording letter for letter (only spacing may differ)", () => {
    for (const item of reminderCandidates()) {
      if (item.category === "virtue") {
        const source = dhikrItems.find((d) => `virtue:${d.id}` === item.id)!;
        expect(strip(item.textAr)).toBe(strip(source.dhikr_ar));
      }
      if (item.category === "hadith") {
        const source = HADITHS.find((h) => `hadith:${h.id}` === item.id);
        if (source) expect(strip(item.textAr)).toBe(strip(source.textAr));
      }
    }
  });

  it("shows a dhikr virtue only together with its virtue, short enough to read at a glance", () => {
    const virtues = pool.filter((i) => i.category === "virtue");
    expect(virtues.length).toBeGreaterThan(0);
    for (const language of ["ar", "en"] as const) {
      for (const item of virtues.filter((i) => isWidgetItem(i, language))) {
        const detail = widgetDetail(item, language);
        expect(detail.length, item.id).toBeGreaterThan(0);
        expect(detail.length, item.id).toBeLessThanOrEqual(WIDGET_MAX_TEXT_CHARS);
        expect(nativeReminderItem(item, language).detail).toBe(bindDetachedMarks(tidyArabicSpacing(detail)));
      }
    }
    // Some virtues do reach the widget.
    expect(virtues.some((i) => isWidgetItem(i, "ar"))).toBe(true);
  });

  it("carries the two verified corrections, letter for letter as their sources, and offers them to the widget again", () => {
    const text = (id: number) => dhikrItems.find((d) => d.id === id)!.dhikr_ar;
    // Sahih al-Bukhari 6403 / Sahih Muslim 2691
    expect(text(6)).toBe("لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ");
    // Sahih Muslim 2137
    expect(text(11)).toBe("سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ");
    for (const id of ["virtue:6", "virtue:11"]) {
      const item = pool.find((i) => i.id === id);
      if (item) expect(isWidgetItem(item, "ar"), id).toBe(true);
    }
    // Unverifiable against its cited source: kept exactly as it was.
    expect(text(9)).toBe("الْلَّهُم صَلِّي وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد");
  });

  it("holds back the dhikr texts whose wording awaits correction", () => {
    for (const id of Object.keys(WIDGET_WORDING_REVIEW)) {
      const item = pool.find((i) => i.id === id);
      if (item) expect(isWidgetItem(item, "ar")).toBe(false);
    }
  });

  it("no other item carries a detail line", () => {
    for (const item of pool.filter((i) => i.category !== "virtue")) expect(widgetDetail(item, "ar")).toBe("");
  });

  it("DITHAR's reflections don't quote a Hadith in part as if whole", () => {
    const h184 = HADITHS.find((h) => h.id === 184);
    expect(h184?.reflectionAr).not.toContain("ويل له، ويل له");
  });
});
