// @vitest-environment jsdom
// The 50 hadiths found in Open Hadith Data (2026-11-07): the source's matn exactly, with its metadata,
// no duplicate of any hadith DITHAR has (by meaning, not only wording), in the widget's rotation
// (whole, or as a verbatim preview when long), and shown and shared in full like every other hadith.
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ENRICHED_HADITHS, NO_ENGLISH } from "./widgetContent";
import { HADITHS } from "./hadith";
import { RELIGIOUS_AUDIT } from "./religiousAudit";
import { findReminderItem, reminderRotationPool } from "../lib/reminderContent";
import { isWidgetItem, WIDGET_MAX_TEXT_CHARS } from "../lib/widgetFeed";
import { nativeReminderItem } from "../lib/remindersSync";
import { reminderShareContent } from "../lib/reminderShare";
import { resolveOpenedReminder } from "../lib/reminderOpen";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { SpiritualReminderView } from "../components/SpiritualReminderView";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const batch = ENRICHED_HADITHS.filter((h) => h.matnOnly);
const ids = batch.map((h) => `hadith:${h.id}`);
const words = (s: string) =>
  new Set(
    s.replace(/[ً-ْٰـ]/g, "").replace(/[ٱأإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي\s]/g, " ").split(/\s+/).filter((w) => w.length > 2),
  );
/** Share of [a]'s words found in [b]: a high share means the same narration, whatever its wording. */
const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((w) => b.has(w)).length / Math.max(1, a.size);

describe("source and metadata", () => {
  it("are 50, unique, each with collection, number, chapter, narrator, grade and its own sunnah.com page", () => {
    expect(batch).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
    for (const h of batch) {
      const [book, number] = h.id.split("-");
      expect(["bukhari", "muslim", "abudawud", "nasai", "ibnmajah"], h.id).toContain(book);
      expect(h.url, h.id).toMatch(new RegExp(`^https://sunnah\\.com/${book}:${number}[a-z]?$`));
      expect(h.referenceAr, h.id).toContain(number);
      expect(h.sourceAr, h.id).toMatch(/^(صحيح|سنن) .+، .+/);
      expect(h.narratorAr.trim(), h.id).not.toBe("");
      expect(h.review.note, h.id).toMatch(/^Source: Open Hadith Data v1\.1\.0 \(/);
    }
  });

  it("grades: al-Bukhari's and Muslim's by the collection; the Sunan's by al-Albani, with no listed grader calling them weak", () => {
    for (const h of batch) {
      const book = h.id.split("-")[0];
      if (book === "bukhari" || book === "muslim") expect(["البخاري", "مسلم"]).toContain(h.gradingSourceAr);
      else {
        expect(h.gradingSourceAr, h.id).toBe("الألباني");
        expect(["صحيح", "حسن", "حسن صحيح"], h.id).toContain(h.gradeAr);
        expect(h.review.note, h.id).toMatch(/Al-Albani: (Sahih|Hasan)/);
        expect(h.review.note, h.id).not.toMatch(/Daif|Fabricated|Munkar|Maudu/i);
      }
    }
  });

  it("the text is the source's matn as given: vowelled, no framing or commentary added, no invisible marks", () => {
    for (const h of batch) {
      expect(h.textAr, h.id).toMatch(/[ً-ْ]/);
      expect(h.textAr, h.id).not.toMatch(/^عن /);
      expect(h.textAr, h.id).not.toMatch(/[‎‏]|^:/);
      expect(h.textAr, h.id).not.toMatch(/قَالَ أَبُو عِيسَى|هَذَا حَدِيثٌ|وَفِي رِوَايَةِ|حَدَّثَنَا/);
      expect(h.comments, h.id).toEqual([]);
    }
  });

  it("Arabic only — no unidentified translation — and audited in Arabic", () => {
    for (const h of batch) {
      expect(h.meaningEn, h.id).toBe("");
      expect(h.translation, h.id).toBe(NO_ENGLISH);
      expect(RELIGIOUS_AUDIT[`hadith:${h.id}`], h.id).toBe("ar");
    }
  });
});

describe("duplicates", () => {
  it("none is a hadith DITHAR already has, by meaning as well as wording, nor repeats another in the batch", () => {
    const others = [...ENRICHED_HADITHS.filter((h) => !h.matnOnly).map((h) => ({ id: h.id, w: words(h.textAr) })), ...HADITHS.map((h) => ({ id: `library:${h.id}`, w: words(h.textAr) }))];
    for (const h of batch) {
      const mine = words(h.textAr);
      for (const o of others) expect(overlap(mine, o.w), `${h.id} ~ ${o.id}`).toBeLessThan(0.6);
      for (const g of batch) if (g !== h) expect(overlap(mine, words(g.textAr)), `${h.id} ~ ${g.id}`).toBeLessThan(0.6);
    }
  });
});

describe("in the widget's and reminders' rotation", () => {
  it("all 50 rotate with the reminders", () => {
    const pool = new Set(reminderRotationPool().map((i) => i.id));
    for (const id of ids) expect(pool.has(id), id).toBe(true);
  });

  it("the widget draws each whole, or — when long — its own opening word for word, ending «…»", () => {
    let whole = 0, previewed = 0;
    for (const h of batch) {
      const item = findReminderItem(`hadith:${h.id}`)!;
      if (h.widgetPreviewAr) {
        expect(h.textAr.length, h.id).toBeGreaterThan(WIDGET_MAX_TEXT_CHARS);
        expect(h.widgetPreviewAr.endsWith(" …"), h.id).toBe(true);
        expect(h.textAr.startsWith(h.widgetPreviewAr.slice(0, -2).replace(/[ ،.]+$/, "")), h.id).toBe(true);
        expect(h.widgetPreviewAr.length, h.id).toBeLessThanOrEqual(WIDGET_MAX_TEXT_CHARS);
        expect(isWidgetItem(item, "ar"), h.id).toBe(true);
        previewed++;
      } else if (h.textAr.length <= WIDGET_MAX_TEXT_CHARS) {
        expect(isWidgetItem(item, "ar"), h.id).toBe(true);
        whole++;
      } else {
        // No clean cut (it would split a quotation): reminders and the full card only.
        expect(isWidgetItem(item, "ar"), h.id).toBe(false);
      }
    }
    expect(whole + previewed).toBe(47);
  });

  it("native: the widget is given the preview; the notification and a tap keep the whole text", () => {
    const item = findReminderItem("hadith:bukhari-3366")!;
    const n = nativeReminderItem(item, "ar");
    expect(n.widgetText!.endsWith("…")).toBe(true);
    expect(n.text.replace(/\s/g, "")).toBe(item.textAr.replace(/\s/g, ""));
    expect(n.source).toContain("الراوي: أبو ذر رضي الله عنه");
    const opened = resolveOpenedReminder(item.id, null, { category: n.category, title: n.title, text: n.text, meaning: n.meaning, detail: "", source: n.source, commentText: null }, "ar");
    expect(opened).toMatchObject({ from: "library", item: { id: "hadith:bukhari-3366" } });
  });

  it("the existing hadiths are unchanged: no preview, no narrator line added", () => {
    for (const h of ENRICHED_HADITHS.filter((x) => !x.matnOnly)) expect(h.widgetPreviewAr, h.id).toBeUndefined();
    expect(findReminderItem("hadith:muslim-2702")!.sourceAr.startsWith("الراوي")).toBe(false);
  });
});

describe("shown and shared in full", () => {
  it("shares the whole text with its source, narrator and grade", () => {
    const item = findReminderItem("hadith:bukhari-5823")!;
    const share = reminderShareContent(item, undefined, "ar");
    expect(share.textAr).toBe(item.textAr);
    expect(share.textAr).toContain("وَسَنَاهْ بِالْحَبَشِيَّةِ حَسَنٌ");
    expect(share.reference).toContain("الراوي: أم خالد بنت خالد");
    expect(share.reference).toContain("البخاري 5823");
  });

  let root: ReturnType<typeof createRoot> | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(() => {
    const r = root;
    if (r) act(() => r.unmount());
    container?.remove();
    root = undefined;
  });

  it("the card shows a long one whole, with its narrator and source, and offers sharing as an image", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    container = document.createElement("div");
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    act(() => r.render(<LanguageProvider><SpiritualReminderView itemId="hadith:abudawud-5111" onClose={() => {}} /></LanguageProvider>));
    const full = findReminderItem("hadith:abudawud-5111")!.textAr;
    expect(container.querySelector("[data-reminder-text]")!.textContent!.replace(/\s/g, "")).toBe(full.replace(/\s/g, ""));
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain("أبو داود 5111");
    await act(async () => (container!.querySelector("[data-reminder-share]") as HTMLElement).click());
    expect(document.querySelector("[data-share-option='image']")).not.toBeNull();
  });
});
