// @vitest-environment jsdom
// DITHAR's dua reflections: varied, short, original — and shown in turn
// under every dua instead of the one line that used to repeat.
import { beforeEach, describe, expect, it } from "vitest";
import { DUA_REFLECTIONS } from "./duaReflections";
import { DHIKR_REFLECTIONS } from "./dhikrReflections";
import { reminderPool } from "../lib/reminderContent";
import { isWidgetComment, widgetTextProblem, WIDGET_MAX_COMMENT_CHARS } from "../lib/widgetFeed";
import { pickComment } from "../lib/contentRotation";
import { nativeReminderItem } from "../lib/remindersSync";

const OLD_LINE = DHIKR_REFLECTIONS.dua.reflection.ar;
const firstWords = (text: string, n: number) => text.replace(/[،؛:.]/g, " ").split(/\s+/).filter(Boolean).slice(0, n).join(" ");

beforeEach(() => localStorage.clear());

describe("the reflections themselves", () => {
  it("are at least 30, each distinct, in Arabic and English", () => {
    expect(DUA_REFLECTIONS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(DUA_REFLECTIONS.map((r) => r.id)).size).toBe(DUA_REFLECTIONS.length);
    expect(new Set(DUA_REFLECTIONS.map((r) => r.ar)).size).toBe(DUA_REFLECTIONS.length);
    expect(new Set(DUA_REFLECTIONS.map((r) => r.en)).size).toBe(DUA_REFLECTIONS.length);
    for (const r of DUA_REFLECTIONS) {
      expect(r.ar.trim().length, r.id).toBeGreaterThan(15);
      expect(r.en.trim().length, r.id).toBeGreaterThan(15);
      expect(/[؀-ۿ]/.test(r.ar), r.id).toBe(true);
    }
  });

  it("are short enough for a widget line in both languages, and render safely there", () => {
    for (const r of DUA_REFLECTIONS) {
      expect(r.ar.length, r.id).toBeLessThanOrEqual(WIDGET_MAX_COMMENT_CHARS);
      expect(r.en.length, r.id).toBeLessThanOrEqual(WIDGET_MAX_COMMENT_CHARS);
      expect(widgetTextProblem(r.ar), r.id).toBeNull();
      expect(isWidgetComment(r, "ar") && isWidgetComment(r, "en"), r.id).toBe(true);
    }
  });

  it("vary in wording: no two open the same way, and several kinds of comment are used", () => {
    const openings = DUA_REFLECTIONS.map((r) => firstWords(r.ar, 3));
    expect(new Set(openings).size).toBe(openings.length);
    expect(new Set(DUA_REFLECTIONS.map((r) => r.style)).size).toBeGreaterThanOrEqual(4);
  });

  it("cover the intended themes", () => {
    const all = DUA_REFLECTIONS.map((r) => r.ar).join(" ");
    for (const word of ["الأمل", "التوكّل", "ضعفه", "اصبر", "شكر", "استغفار", "همّك", "تكرار", "قريب|يقترب"]) expect(new RegExp(word).test(all), word).toBe(true);
  });

  it("are DITHAR's own words: no verse, Hadith, attribution, quotation or promise", () => {
    const forbidden = [/﴿|﴾/, /«|»|"/, /قال\s|رواه|حديث|الآية|تعالى|ﷺ|صلى الله عليه|رضي الله/, /سيستجيب|يستجيب لك|(^|\s)(وعد|وعده|يعدك)(\s|$)|مضمون|حتمًا/, /\bwill answer\b|\bpromise|\bguarantee|\bProphet\b|\bnarrat/i];
    for (const r of DUA_REFLECTIONS) for (const re of forbidden) expect(re.test(r.ar) || re.test(r.en), `${r.id} ${re}`).toBe(false);
  });

  it("the line that used to repeat is not among them", () => {
    expect(DUA_REFLECTIONS.some((r) => r.ar === OLD_LINE || OLD_LINE.startsWith(r.ar))).toBe(false);
  });
});

describe("under every dua", () => {
  const duas = () => reminderPool().filter((i) => i.category === "dua");

  it("every published dua offers the reflections — and never the old repeated line", () => {
    expect(duas().length).toBeGreaterThan(10);
    for (const dua of duas()) {
      const ids = dua.comments.map((c) => c.id);
      for (const r of DUA_REFLECTIONS) expect(ids, dua.id).toContain(r.id);
      expect(dua.comments.some((c) => c.id === "theme:dua:legacy" || c.ar === OLD_LINE), dua.id).toBe(false);
    }
  });

  it("the widget receives them as widget comments, in both languages", () => {
    for (const language of ["ar", "en"] as const) {
      const dua = nativeReminderItem(duas()[0], language);
      const widgetIds = dua.comments.filter((c) => c.widget).map((c) => c.id);
      expect(widgetIds.filter((id) => id.startsWith("dua-reflection:"))).toHaveLength(DUA_REFLECTIONS.length);
    }
  });

  it("rotate: consecutive duas never show the same reflection, and all are shown before any repeats", () => {
    const pool = duas();
    let recent: string[] = [];
    const shown: string[] = [];
    for (let i = 0; i < DUA_REFLECTIONS.length * 3; i++) {
      const dua = pool[i % pool.length];
      const comment = pickComment(dua.comments, recent)!;
      shown.push(comment.id);
      recent = [...recent.filter((id) => id !== comment.id), comment.id];
    }
    for (let i = 1; i < shown.length; i++) expect(shown[i], `update ${i}`).not.toBe(shown[i - 1]);
    expect(new Set(shown.slice(0, DUA_REFLECTIONS.length)).size).toBe(DUA_REFLECTIONS.length);
  });

  it("the choice is stable: the same history gives the same reflection", () => {
    const dua = duas()[0];
    const recent = DUA_REFLECTIONS.slice(0, 5).map((r) => r.id);
    expect(pickComment(dua.comments, recent)!.id).toBe(pickComment(dua.comments, recent)!.id);
  });
});
