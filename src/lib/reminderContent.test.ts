// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { approveAllNewContentForTesting } from "./contentReview";
import { HADITHS } from "../data/hadith";
import { MISC_DUAS } from "../data/misc-library";
import { dhikrItems } from "../data/tasbeeh";
import { WAMDAT, getWamdaVerseText } from "../data/wamdat";
import { DHIKR_REFLECTIONS } from "../data/dhikrReflections";
import { ENRICHED_DUAS, ENRICHED_HADITHS, POEMS } from "../data/widgetContent";
import { REMINDER_CATEGORIES, evidenceForTheme, findReminderItem, reminderPool, suggestedBackground } from "./reminderContent";
import { BACKGROUNDS, autoBackgroundId, dayPeriodAt, isBackgroundId, seasonAt } from "./reminderBackgrounds";
import { coverPlacement } from "./cropPlacement";
import { DEFAULT_REMINDER_SETTINGS, hasAnyCategory, loadReminderSettings, saveReminderSettings } from "./reminderSettings";
import { nativeReminderItem } from "./remindersSync";

// These tests exercise the newly added content as it is once a reviewer approves it.
beforeAll(() => approveAllNewContentForTesting());

describe("reminder content — only verified content the app already has", () => {
  it("has every kind", () => {
    for (const c of REMINDER_CATEGORIES) expect(reminderPool().filter((i) => i.category === c).length).toBeGreaterThan(5);
  });

  it("every text is a shipped library's own, unchanged — the written library, the Hadith library, the Tasbeeh library, or the source-checked additions", () => {
    for (const item of reminderPool()) {
      const [, id] = item.id.split(":");
      const added =
        item.category === "dua" ? ENRICHED_DUAS.find((d) => d.id === id)?.textAr : item.category === "hadith" ? ENRICHED_HADITHS.find((h) => h.id === id)?.textAr : undefined;
      if (item.category === "dua") expect(added ?? MISC_DUAS.find((d) => d.id === id)?.text_ar).toBe(item.textAr);
      if (item.category === "hadith") expect(added ?? HADITHS.find((h) => String(h.id) === id)?.textAr).toBe(item.textAr);
      if (item.category === "virtue") expect(dhikrItems.find((d) => String(d.id) === id)?.dhikr_ar).toBe(item.textAr);
      if (item.category === "poetry") expect(POEMS.find((p) => p.id === id)?.verses.join("\n")).toBe(item.textAr);
      expect(item.sourceAr.length).toBeGreaterThan(0);
    }
  });

  it("leaves out the hadith whose grading is noted as disputed", () => {
    const disputed = HADITHS.filter((h) => h.gradeAr.includes("خلاف"));
    expect(disputed.length).toBeGreaterThan(0);
    for (const h of disputed) expect(findReminderItem(`hadith:${h.id}`)).toBeUndefined();
  });

  it("only cites virtues that have a source (no unsourced claims)", () => {
    for (const item of reminderPool().filter((i) => i.category === "virtue")) {
      expect(item.evidence?.ar.length).toBeGreaterThan(0);
      expect(item.evidence?.sourceAr.length).toBeGreaterThan(0);
    }
    expect(findReminderItem("virtue:13")).toBeUndefined(); // «الله أكبر» has no cited virtue in the library
  });

  it("every reflection's evidence resolves to shipped, verified text — Qur'an from the Wamdat data, virtues from the Tasbeeh library", () => {
    for (const r of Object.values(DHIKR_REFLECTIONS)) {
      const evidence = evidenceForTheme(r.theme);
      expect(evidence, r.theme).toBeDefined();
      if (r.evidence.kind === "quran") {
        const entry = WAMDAT.find((w) => w.id === (r.evidence as { wamdaId: number }).wamdaId)!;
        expect(evidence!.ar).toBe(getWamdaVerseText(entry));
        expect(evidence!.kind).toBe("quran");
      } else {
        expect(evidence!.kind).toBe("hadith");
        expect(evidence!.sourceAr.length).toBeGreaterThan(0);
      }
    }
  });

  it("reflections are never presented as narrations: no quotation marks or attribution formulas in them", () => {
    for (const r of Object.values(DHIKR_REFLECTIONS)) {
      for (const text of [r.reflection.ar, r.reflection.en]) {
        expect(text).not.toMatch(/[«»"“”]/);
        expect(text).not.toMatch(/قال رسول الله|قال النبي|the Prophet ﷺ said|said the Prophet/);
      }
    }
  });

  it("covers the requested dhikr themes, each with a background that exists", () => {
    for (const theme of ["hamd", "tasbih", "istighfar", "takbir", "salawat"] as const) expect(DHIKR_REFLECTIONS[theme]).toBeDefined();
    for (const r of Object.values(DHIKR_REFLECTIONS)) expect(r.background === "auto" || isBackgroundId(r.background), r.theme).toBe(true);
    expect(suggestedBackground(findReminderItem("virtue:9")!)).toBe("mosque-night"); // Salawat
  });

  it("native items carry the Arabic text untouched and the interface language's source", () => {
    const item = findReminderItem("virtue:8")!;
    const ar = nativeReminderItem(item, "ar");
    const en = nativeReminderItem(item, "en");
    expect(ar.text).toBe(item.textAr);
    expect(en.text).toBe(item.textAr);
    expect(ar.meaning).toBe("");
    expect(en.meaning).toBe(item.meaningEn);
    expect(ar.title).toBe("فضل الذكر");
    expect(en.title).toBe("Virtue of dhikr");
  });
});

describe("what the widget receives", () => {
  it("each item's comments in the interface language, with stable ids, and a title saying what the text is", () => {
    const dua = findReminderItem("dua:q-23-118")!;
    const ar = nativeReminderItem(dua, "ar");
    const en = nativeReminderItem(dua, "en");
    expect(ar.title).toBe("دعاء من القرآن");
    expect(en.title).toBe("Dua from the Qur'an");
    expect(ar.comments.map((c) => c.id)).toEqual(dua.comments.map((c) => c.id));
    expect(ar.comments[0].text).toBe(dua.comments[0].ar);
    expect(en.comments[0].text).toBe(dua.comments[0].en);
    expect(ar.text).toBe(en.text);
    const poem = nativeReminderItem(findReminderItem("poetry:shafii-afw")!, "ar");
    expect(poem.title).toBe("من الشعر");
    expect(poem.source).toBe("يُنسب إلى الإمام الشافعي");
  });
});

describe("reminder backgrounds", () => {
  it("has 16 automatic and 4 Islamic-inspired backgrounds", () => {
    expect(BACKGROUNDS.filter((b) => b.kind === "nature")).toHaveLength(16);
    expect(BACKGROUNDS.filter((b) => b.kind === "islamic")).toHaveLength(4);
  });

  it("follows the time of day, and the season only where reliable (mirrors the widget)", () => {
    expect(dayPeriodAt(new Date(2026, 9, 14, 5))).toBe("dawn");
    expect(dayPeriodAt(new Date(2026, 9, 14, 12))).toBe("day");
    expect(dayPeriodAt(new Date(2026, 9, 14, 17))).toBe("sunset");
    expect(dayPeriodAt(new Date(2026, 9, 14, 23))).toBe("night");
    expect(seasonAt(new Date(2026, 9, 14), 29.4)).toBe("autumn");
    expect(seasonAt(new Date(2026, 9, 14), -33.9)).toBe("spring");
    expect(seasonAt(new Date(2026, 9, 14), 3.1)).toBeNull();
    expect(seasonAt(new Date(2026, 9, 14), null)).toBeNull();
    expect(autoBackgroundId(new Date(2026, 0, 14, 12), 51.5)).toBe("day-winter");
    expect(autoBackgroundId(new Date(2026, 0, 14, 12), null)).toBe("day-spring");
  });
});

describe("the photo cropper's geometry", () => {
  it("always covers the frame, whatever the pan", () => {
    const p = coverPlacement(4000, 3000, 180, 320, 1, 9999, -9999);
    expect(p.w).toBeGreaterThanOrEqual(180);
    expect(p.h).toBeCloseTo(320);
    expect(p.left).toBeLessThanOrEqual(0);
    expect(p.left + p.w).toBeGreaterThanOrEqual(180);
    expect(p.top).toBeCloseTo(0);
  });

  it("zooming enlarges around the centre", () => {
    const a = coverPlacement(1000, 1000, 180, 320, 1, 0, 0);
    const b = coverPlacement(1000, 1000, 180, 320, 2, 0, 0);
    expect(b.w).toBeCloseTo(a.w * 2);
    expect(b.left + b.w / 2).toBeCloseTo(90);
  });
});

describe("reminder settings", () => {
  beforeEach(() => {
  localStorage.clear();
  approveAllNewContentForTesting();
});

  it("are off by default (never sent unasked) and persist", () => {
    expect(loadReminderSettings()).toEqual(DEFAULT_REMINDER_SETTINGS);
    saveReminderSettings({ ...DEFAULT_REMINDER_SETTINGS, enabled: true, notifications: false, intervalMinutes: 120 });
    expect(loadReminderSettings()).toMatchObject({ enabled: true, notifications: false, intervalMinutes: 120 });
  });

  it("never accept an interval shorter than an hour or an unknown background", () => {
    localStorage.setItem("dithar:reminders:v1", JSON.stringify({ intervalMinutes: 5, fixedBackground: "../x", backgroundMode: "weird" }));
    const s = loadReminderSettings();
    expect(s.intervalMinutes).toBe(180);
    expect(s.fixedBackground).toBe("mosque-night");
    expect(s.backgroundMode).toBe("auto");
  });

  it("require at least one content kind", () => {
    expect(hasAnyCategory(DEFAULT_REMINDER_SETTINGS)).toBe(true);
    expect(hasAnyCategory({ ...DEFAULT_REMINDER_SETTINGS, categories: { dua: false, hadith: false, virtue: false, poetry: false, lataif: false } })).toBe(false);
    expect(hasAnyCategory({ ...DEFAULT_REMINDER_SETTINGS, categories: { dua: false, hadith: false, virtue: false, poetry: true, lataif: false } })).toBe(true);
  });

  it("turn on a category added later (poetry) for settings saved before it existed", () => {
    localStorage.setItem("dithar:reminders:v1", JSON.stringify({ enabled: true, categories: { dua: true, hadith: false, virtue: true } }));
    expect(loadReminderSettings().categories).toEqual({ dua: true, hadith: false, virtue: true, poetry: true, lataif: true });
  });
});
