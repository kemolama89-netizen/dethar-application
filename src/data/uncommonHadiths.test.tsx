// @vitest-environment jsdom
// The 50 uncommon hadiths (2026-11-07): loaded into the existing Hadith library, in the widget's and
// reminders' rotation, shown and shared like every other hadith — and never a duplicate.
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ENRICHED_HADITHS, NO_ENGLISH, PUBLISHED_EN_BUKHARI, PUBLISHED_EN_MUSLIM } from "./widgetContent";
import { HADITHS } from "./hadith";
import { RELIGIOUS_AUDIT } from "./religiousAudit";
import { findReminderItem, reminderRotationPool } from "../lib/reminderContent";
import { isWidgetItem } from "../lib/widgetFeed";
import { nativeReminderItem } from "../lib/remindersSync";
import { reminderShareContent } from "../lib/reminderShare";
import { resolveOpenedReminder } from "../lib/reminderOpen";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { SpiritualReminderView } from "../components/SpiritualReminderView";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The 2026-11-07 hadith-api batch (the Open Hadith Data batch is matnOnly, tested on its own).
const batch = ENRICHED_HADITHS.filter((h) => h.textOnly && !h.matnOnly);
const ids = batch.map((h) => `hadith:${h.id}`);
/** Letters only, to compare wording across spellings and vowel marks. */
const letters = (s: string) =>
  s.replace(/[ً-ْٰـ]/g, "").replace(/[ٱأإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي\s]/g, " ").replace(/\s+/g, " ").trim();
const quoted = (text: string) => letters([...text.matchAll(/«([^»]+)»/g)].map((m) => m[1]).join(" ") || text);

describe("the uncommon hadiths in the library", () => {
  it("are 50, with unique ids, from the six books' editions, each with its reference, grade and link", () => {
    expect(batch).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
    for (const h of batch) {
      expect(["bukhari", "muslim", "tirmidhi", "abudawud", "ibnmajah"]).toContain(h.id.split("-")[0]);
      expect(h.referenceAr, h.id).toMatch(/\d/);
      expect(["صحيح", "حسن", "حسن صحيح", "صحيح متفق عليه"], h.id).toContain(h.gradeAr);
      expect(h.url, h.id).toMatch(/^https:\/\/sunnah\.com\//);
      expect(h.narratorAr.trim(), h.id).not.toBe("");
      expect(h.comments, h.id).toEqual([]);
    }
  });

  it("the Sunan's grades are al-Albani's, as the dataset lists them; al-Bukhari's and Muslim's their own", () => {
    for (const h of batch) {
      const book = h.id.split("-")[0];
      if (book === "bukhari" || book === "muslim") expect(["البخاري", "مسلم", "البخاري ومسلم"], h.id).toContain(h.gradingSourceAr);
      else {
        expect(h.gradingSourceAr, h.id).toBe("الألباني");
        expect(h.review.note, h.id).toMatch(/Al-Albani: (Sahih|Hasan)/);
        expect(h.review.note, h.id).not.toMatch(/Daif|Fabricated|Munkar/i);
      }
    }
  });

  it("English only as a published translation of a whole al-Bukhari or Muslim narration; else Arabic only", () => {
    for (const h of batch) {
      const book = h.id.split("-")[0];
      if (h.meaningEn) {
        expect(h.translation, h.id).toBe(book === "bukhari" ? PUBLISHED_EN_BUKHARI : PUBLISHED_EN_MUSLIM);
        expect(h.referenceAr, h.id).not.toContain("طرفٌ من الحديث");
        expect(RELIGIOUS_AUDIT[`hadith:${h.id}`]).toBe("ar+en");
      } else {
        expect(h.translation, h.id).toBe(NO_ENGLISH);
        expect(RELIGIOUS_AUDIT[`hadith:${h.id}`]).toBe("ar");
      }
    }
  });

  it("none repeats a hadith DITHAR already has, or another in the batch", () => {
    const others = [...ENRICHED_HADITHS.filter((h) => !h.textOnly || h.matnOnly).map((h) => quoted(h.textAr)), ...HADITHS.map((h) => quoted(h.textAr))];
    const mine = batch.map((h) => quoted(h.textAr).slice(0, 40));
    expect(new Set(mine).size).toBe(50);
    for (const [i, key] of mine.entries()) for (const other of others) expect(other.includes(key), batch[i].id).toBe(false);
  });
});

describe("in the existing rotation, display and sharing", () => {
  it("all 50 are published and rotate with the reminders (and the widget where they fit)", () => {
    const pool = new Set(reminderRotationPool().map((i) => i.id));
    for (const id of ids) expect(pool.has(id), id).toBe(true);
    const onWidget = ids.filter((id) => isWidgetItem(findReminderItem(id)!, "ar"));
    // The widget draws at most 190 characters: the longer narrations rotate in reminders and the full view.
    expect(onWidget.length).toBe(40);
    for (const id of ids.filter((x) => !onWidget.includes(x))) expect(findReminderItem(id)!.textAr.length, id).toBeGreaterThan(190);
  });

  it("native receives each exactly as stored, with its source", () => {
    const item = findReminderItem("hadith:muslim-2702")!;
    const native = nativeReminderItem(item, "ar");
    expect(native.title).toBe("حديث نبوي");
    expect(native.source).toContain("مسلم 2702");
    expect(native.comments).toEqual([]);
  });

  it("a tap on it opens it as shown", () => {
    const item = findReminderItem("hadith:abudawud-4918")!;
    const n = nativeReminderItem(item, "ar");
    const opened = resolveOpenedReminder(item.id, null, { category: n.category, title: n.title, text: n.text, meaning: n.meaning, detail: "", source: n.source, commentText: null }, "ar");
    expect(opened).toMatchObject({ from: "library", item: { id: "hadith:abudawud-4918" } });
  });

  it("shares with its reference, in each language its audit allows", () => {
    const ar = reminderShareContent(findReminderItem("hadith:muslim-542")!, undefined, "ar");
    expect(ar.textAr).toContain("إن عدو الله إبليس جاء بشهاب من نار");
    expect(ar.reference).toContain("مسلم 542");
    const en = reminderShareContent(findReminderItem("hadith:bukhari-6133")!, undefined, "en");
    expect(en.meaningEn).toContain("A believer is not stung twice");
    // Arabic only: no English line to share.
    expect(reminderShareContent(findReminderItem("hadith:tirmidhi-2010")!, undefined, "en").meaningEn).toBeUndefined();
  });

  let root: ReturnType<typeof createRoot> | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(() => {
    const r = root;
    if (r) act(() => r.unmount());
    container?.remove();
    root = undefined;
  });

  it("the reminder card shows its text, source and grade, and offers sharing as an image", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    container = document.createElement("div");
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    act(() => r.render(<LanguageProvider><SpiritualReminderView itemId="hadith:ibnmajah-4216" onClose={() => {}} /></LanguageProvider>));
    expect(container.querySelector("[data-reminder-text]")!.textContent).toContain("كل مخموم القلب صدوق اللسان");
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain("ابن ماجه 4216");
    await act(async () => (container!.querySelector("[data-reminder-share]") as HTMLElement).click());
    expect(document.querySelector("[data-share-option='image']")).not.toBeNull();
  });
});
