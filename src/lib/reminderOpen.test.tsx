// @vitest-environment jsdom
// Tapping a reminder notification or the widget opens EXACTLY what it showed
// (lib/reminderOpen.ts): the same item by its stable id when the app's text
// is still the text that was drawn, else the drawn strings themselves —
// never another item, never a random or positional pick.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "./appearancePreferences";
import { SpiritualReminderView } from "../components/SpiritualReminderView";
import { reminderPool } from "./reminderContent";
import type { ReminderItem } from "./reminderContent";
import { nativeReminderItem } from "./remindersSync";
import { resolveOpenedReminder, sameWording } from "./reminderOpen";
import type { ShownReminder } from "./remindersNative";
import type { Language } from "../theme/LanguageContext";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** What native draws for an item (and sends back on a tap): the strings pushed by nativeReminderItem. */
function shownFor(item: ReminderItem, language: Language, commentIndex = 0): { commentId: string | null; shown: ShownReminder } {
  const n = nativeReminderItem(item, language);
  const comment = n.comments[commentIndex] ?? null;
  return {
    commentId: comment?.id ?? null,
    shown: { category: n.category, title: n.title, text: n.text, meaning: n.meaning, detail: n.detail ?? "", source: n.source, commentText: comment?.text ?? null },
  };
}

const subhanAllah = () => reminderPool().find((i) => i.category === "virtue" && i.textAr.startsWith("سُبْحَانَ اللَّهِ"))!;
const aHadith = () => reminderPool().find((i) => i.category === "hadith")!;

beforeEach(() => localStorage.clear());

describe("resolveOpenedReminder", () => {
  for (const language of ["ar", "en"] as const) {
    it(`every published item opens as itself, with the comment that was shown (${language})`, () => {
      const pool = reminderPool();
      expect(pool.length).toBeGreaterThan(100);
      for (const item of pool) {
        const { commentId, shown } = shownFor(item, language);
        const opened = resolveOpenedReminder(item.id, commentId, shown, language)!;
        expect(opened.from, item.id).toBe("library");
        expect(opened.item.id, item.id).toBe(item.id);
        expect(sameWording(opened.item.textAr, shown.text), item.id).toBe(true);
        expect(opened.comment?.id ?? null, item.id).toBe(commentId);
      }
    });
  }

  it("a «سبحان الله» notification opens that same dhikr, with its virtue and source", () => {
    const item = subhanAllah();
    expect(item).toBeDefined();
    const { commentId, shown } = shownFor(item, "ar");
    const opened = resolveOpenedReminder(item.id, commentId, shown, "ar")!;
    expect(opened.item.id).toBe(item.id);
    expect(opened.item.textAr).toBe(item.textAr);
    expect(opened.item.sourceAr).toBe(item.sourceAr);
    expect(opened.item.evidence?.ar).toBe(item.evidence?.ar);
  });

  it("a Hadith notification opens the same Hadith with its own text and source", () => {
    const item = aHadith();
    const { commentId, shown } = shownFor(item, "ar");
    const opened = resolveOpenedReminder(item.id, commentId, shown, "ar")!;
    expect(opened.item.id).toBe(item.id);
    expect(opened.item.textAr).toBe(item.textAr);
    expect(opened.item.sourceAr).toBe(item.sourceAr);
  });

  it("if the app's text for that id changed since it was shown (an update), the content as shown opens — not the new one", () => {
    const item = aHadith();
    const { commentId, shown } = shownFor(item, "ar");
    const older = { ...shown, text: "نصٌّ كما ظهر في الإشعار قبل التحديث", source: "مصدرٌ كما ظهر" };
    const opened = resolveOpenedReminder(item.id, commentId, older, "ar")!;
    expect(opened.from).toBe("as-shown");
    expect(opened.item.id).toBe(item.id);
    expect(opened.item.textAr).toBe(older.text);
    expect(opened.item.sourceAr).toBe(older.source);
    expect(opened.title).toBe(shown.title);
    expect(opened.comment?.ar ?? null).toBe(shown.commentText);
  });

  it("an id this version doesn't know still opens what was shown; with nothing shown, nothing opens", () => {
    const shown: ShownReminder = { category: "dua", title: "دعاء", text: "اللهم إني أسألك العافية", meaning: "", detail: "", source: "مصدر", commentText: null };
    expect(resolveOpenedReminder("dua:no-such-id", null, shown, "ar")).toMatchObject({ from: "as-shown", item: { id: "dua:no-such-id", textAr: shown.text, sourceAr: "مصدر" } });
    expect(resolveOpenedReminder("dua:no-such-id", null, undefined, "ar")).toBeNull();
  });

  it("ignores only the whitespace the widget adjusts — any letter or mark difference counts", () => {
    expect(sameWording("سُبْحَانَ اللَّهِ", "سُبْحَانَ اللَّهِ")).toBe(true);
    expect(sameWording("سُبْحَانَ اللَّهِ", "سُبْحَانَ اللَّهُ")).toBe(false);
  });
});

describe("the full-screen view opened from a tap", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const mount = (node: React.ReactNode) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
  };
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows the tapped Hadith's own text and source", () => {
    const item = aHadith();
    const { commentId, shown } = shownFor(item, "ar");
    mount(<SpiritualReminderView itemId={item.id} commentId={commentId} shownAs={shown} onClose={() => {}} />);
    expect(container.querySelector("[data-spiritual-reminder]")!.getAttribute("data-spiritual-reminder")).toBe(item.id);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(item.textAr);
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain(item.sourceAr);
  });

  it("shows the content as it was shown when the app's own text for that id differs", () => {
    const item = subhanAllah();
    const { shown } = shownFor(item, "ar");
    const older = { ...shown, text: "سُبْحَانَ اللَّهِ — كما ظهر", commentText: null };
    mount(<SpiritualReminderView itemId={item.id} shownAs={older} onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(older.text);
    expect(container.querySelector("[data-reminder-kind]")!.textContent).toBe(shown.title);
  });

  it("in English, shows the same item in English", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    const item = aHadith();
    const { commentId, shown } = shownFor(item, "en");
    mount(<SpiritualReminderView itemId={item.id} commentId={commentId} shownAs={shown} onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(item.textAr);
  });

  it("closes by itself only with the full-screen experience on; off, it waits for the user", () => {
    const item = aHadith();
    const { shown } = shownFor(item, "ar");
    mount(<SpiritualReminderView itemId={item.id} shownAs={shown} autoClose={false} onClose={() => {}} />);
    expect(container.querySelector("[aria-pressed='true'][aria-label]")).not.toBeNull();
  });
});
