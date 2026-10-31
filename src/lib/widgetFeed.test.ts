import { describe, expect, it } from "vitest";
import { GENERIC_DUA_COMMENT_ID, WIDGET_EXCLUDED_HADITHS, WIDGET_MAX_TEXT_CHARS, QURANIC_PORTIONS, isWidgetComment, isWidgetItem, widgetQuranText, widgetTextProblem } from "./widgetFeed";
import { reminderCandidates, reminderPool } from "./reminderContent";
import { nativeReminderItem } from "./remindersSync";
import { QURAN_VERSES } from "./quranText";
import type { ReminderItem } from "./reminderContent";

// A Hadith verified with its English (lib/religiousAudit.ts), so only the rule under test decides.
const item = (over: Partial<ReminderItem>): ReminderItem => ({
  id: "hadith:bukhari-6116",
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

// Everything but the Qur'anic brackets (and their no-break spaces) or braces: what must never change.
const wording = (s: string) => s.replace(/﴿ | ﴾|[{}]/gu, "");

describe("widgetQuranText (Qur'anic text on the widget)", () => {
  const NB = " ";
  const w = (kind: ReminderItem["kind"], text: string, id = "x") => widgetQuranText({ id, kind }, text);

  it("puts a whole verse in the Qur'anic brackets ﴿ … ﴾, the verse itself unchanged", () => {
    expect(w("lataif", "فَاصْبِرْ صَبْرًا جَمِيلًا")).toBe(`﴿${NB}فَاصْبِرْ صَبْرًا جَمِيلًا${NB}﴾`);
    expect(w("quran", "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ")).toBe(`﴿${NB}وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ${NB}﴾`);
  });
  it("keeps a dua's closing full stop (after the bracket), and a verse already in brackets as it is", () => {
    expect(w("quran-dua", "رَبِّ زِدْنِي عِلْمًا.")).toBe(`﴿${NB}رَبِّ زِدْنِي عِلْمًا${NB}﴾.`);
    expect(w("quran-dua", `﴿${NB}رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ${NB}﴾`)).toBe(`﴿${NB}رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ${NB}﴾`);
  });
  it("in a dua with wording of its own, brackets only the Qur'anic portion", () => {
    const id = "dua:inna-lillahi-wa-inna-ilayhi-rajiun";
    expect(QURANIC_PORTIONS[id]).toEqual(["إنا لله وإنا إليه راجعون"]);
    expect(w("dua", "إنا لله وإنا إليه راجعون، اللهم أجرني في مصيبتي واخلف لي خيرًا منها.", id)).toBe(`﴿${NB}إنا لله وإنا إليه راجعون${NB}﴾، اللهم أجرني في مصيبتي واخلف لي خيرًا منها.`);
  });
  it("puts a Qur'anic quotation marked inside a Hadith in the brackets, and leaves other texts alone", () => {
    expect(w("hadith", "«لا أقول {الم} حرف»")).toBe(`«لا أقول ﴿${NB}الم${NB}﴾ حرف»`);
    expect(w("hadith", "«الكلمة الطيبة صدقة»")).toBe("«الكلمة الطيبة صدقة»");
    expect(w("dua", "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ.")).toBe("اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ.");
    expect(w("virtue", "لَا إِلَهَ إِلَّا اللَّهُ")).toBe("لَا إِلَهَ إِلَّا اللَّهُ");
  });
});

describe("every Qur'anic text the widget draws (both interfaces)", () => {
  // The Qur'an as a letter skeleton (src/data/quran — Tanzil Uthmani): no vowels or marks, the alef and
  // hamza forms dropped, so the Uthmani and the common spellings of the same words compare equal
  // (ٱلصَّلَوٰةَ = الصَّلَاةَ). A text "is in the Qur'an" when its skeleton is inside one verse or runs on
  // from one into the next.
  const skeleton = (t: string) =>
    t
      .replace(/وٰ/gu, "ا")
      .replace(/[ً-ٰٟۖ-ۭـ]/gu, "")
      .replace(/[إأآٱ]/gu, "ا")
      .replace(/ى/gu, "ي")
      .replace(/ة/gu, "ه")
      .replace(/ؤ/gu, "و")
      .replace(/ئ/gu, "ي")
      .replace(/[^ء-ي]/gu, "")
      .replace(/[اء]/gu, "");
  const QURAN = QURAN_VERSES.map((surah) => surah.map(skeleton).join("")).join("|");
  const inQuran = (t: string) => skeleton(t).length > 0 && QURAN.includes(skeleton(t));
  const BRACKETED = /﴿ ([^﴾]*) ﴾/gu;
  const QURAN_KINDS = new Set(["quran-dua", "quran", "lataif"]);
  /**
   * Reviewed: wording shared with a verse that is NOT a quotation of it — five or more words in a row
   * in a Prophetic text or a dhikr formula. They stay without brackets.
   */
  const WIDGET_NOT_QURAN_QUOTES: Record<string, string> = {
    "hadith:102": "«من صلى قبل طلوع الشمس وقبل غروبها» (Muslim 634) — the Prophet's words, not Taha 130",
    "virtue:6": "the tahlil «لا إله إلا الله وحده لا شريك له، له الملك وله الحمد…» — a Prophetic dhikr",
  };
  const items = (["ar", "en"] as const).flatMap((language) => reminderPool().map((i) => ({ i, n: nativeReminderItem(i, language), language }))).filter(({ n }) => n.widget !== false);

  it("wraps every whole-verse item — Qur'anic duas, verses and the Lataif — and each is a verse, unchanged", () => {
    const quranic = items.filter(({ i }) => QURAN_KINDS.has(i.kind));
    expect(quranic.length).toBeGreaterThanOrEqual(74); // 21 Qur'anic duas + 16 Lataif verses, in each language
    for (const { i, n } of quranic) {
      const drawn = n.widgetText || n.text;
      expect(drawn, i.id).toMatch(/^﴿ [^﴾]+ ﴾[.۔]?$/u);
      expect(wording(drawn), i.id).toBe(wording(n.text));
      expect(inQuran(drawn), i.id).toBe(true);
    }
  });

  it("brackets the Qur'anic portion of every dua that quotes a verse, and only that portion", () => {
    for (const [id, portions] of Object.entries(QURANIC_PORTIONS)) {
      const shown = items.filter(({ i }) => i.id === id);
      expect(shown.length, id).toBe(2); // on the widget in both languages
      for (const { n } of shown) {
        for (const portion of portions) {
          expect(inQuran(portion), portion).toBe(true);
          expect(n.widgetText).toContain(`﴿ ${portion} ﴾`);
        }
        expect(wording(n.widgetText!)).toBe(wording(n.text));
      }
    }
  });

  it("puts nothing but Qur'an in the brackets, and only around the Arabic text", () => {
    for (const { i, n } of items) {
      const drawn = n.widgetText || n.text;
      expect(wording(drawn), i.id).toBe(wording(n.text)); // only brackets added
      for (const [, quoted] of drawn.matchAll(BRACKETED)) expect(inQuran(quoted), `${i.id}: ${quoted}`).toBe(true);
      expect(drawn, i.id).not.toMatch(/[{}]/u);
      // Translations, sources, the virtue line and DITHAR's comments: never bracketed.
      for (const other of [n.meaning, n.source, n.detail ?? "", ...n.comments.map((c) => c.text)]) expect(other, i.id).not.toMatch(/﴿ | ﴾/u);
      // Notifications and the opened reminder keep the text as it was.
      expect(n.text, i.id).toBe(n.text.trim());
    }
  });

  it("leaves no Qur'anic quotation unbracketed: five words in a row from a verse are bracketed or reviewed", () => {
    const unreviewed: string[] = [];
    for (const { i, n } of items) {
      if (QURAN_KINDS.has(i.kind) || i.id in WIDGET_NOT_QURAN_QUOTES) continue;
      for (const text of [n.widgetText || n.text, n.detail ?? "", ...n.comments.filter((c) => c.widget !== false).map((c) => c.text)]) {
        const words = text.replace(BRACKETED, " | ").split(/\s+/u).filter((x) => skeleton(x) || x === "|");
        for (let k = 0; k + 5 <= words.length; k++) {
          const run = words.slice(k, k + 5);
          if (!run.includes("|") && inQuran(run.join(" "))) unreviewed.push(`${i.id}: ${run.join(" ")}`);
        }
      }
    }
    expect(unreviewed).toEqual([]);
    // The reviewed ones really are on the widget (so the list stays current).
    for (const id of Object.keys(WIDGET_NOT_QURAN_QUOTES)) expect(items.some(({ i }) => i.id === id), id).toBe(true);
  });
});
