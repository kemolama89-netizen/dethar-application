import { describe, expect, it } from "vitest";
import { reminderCandidates, reminderPool } from "./reminderContent";
import { reminderShareContent } from "./reminderShare";
import { composeShareText } from "./shareContent";

describe("sharing a reminder item", () => {
  const pool = reminderPool();

  it("shares a Qur'anic verse with its complete tafsir and the tafsir's source", () => {
    const verse = reminderCandidates().find((i) => i.evidence?.kind === "tafsir");
    expect(verse).toBeDefined();
    const text = composeShareText(reminderShareContent(verse!, verse!.comments[0], "ar"), "ar");
    expect(text).toContain(verse!.textAr);
    expect(text).toContain(verse!.sourceAr);
    expect(text).toContain(`من التفسير:\n${verse!.evidence!.ar}`);
    expect(text).toContain(verse!.evidence!.sourceAr);
    if (verse!.comments[0]) expect(text).toContain(verse!.comments[0].ar);
  });

  it("shares a Lataif verse with its full insight", () => {
    const verse = pool.find((i) => i.evidence?.kind === "insight");
    expect(verse).toBeDefined();
    const text = composeShareText(reminderShareContent(verse!, undefined, "ar"), "ar");
    expect(text).toContain(verse!.evidence!.ar);
    expect(text).toContain(verse!.evidence!.sourceAr);
  });

  it("shares a Hadith with its source, grading and DITHAR's reflection, labelled as such", () => {
    const hadith = pool.find((i) => i.category === "hadith" && i.comments.length > 0);
    expect(hadith).toBeDefined();
    const comment = hadith!.comments[0];
    for (const language of ["ar", "en"] as const) {
      const text = composeShareText(reminderShareContent(hadith!, comment, language), language);
      expect(text).toContain(hadith!.textAr);
      expect(text).toContain(language === "en" ? (hadith!.sourceEn ?? hadith!.sourceAr) : hadith!.sourceAr);
      expect(text).toContain(comment[language]);
      expect(text).toContain(language === "en" ? "DITHAR Reflection" : "تأمّل دِثار");
    }
  });

  it("shares a dhikr virtue's evidence from the Sunnah and the theme's reflection", () => {
    const virtue = pool.find((i) => i.category === "virtue" && i.reflection);
    expect(virtue).toBeDefined();
    const text = composeShareText(reminderShareContent(virtue!, undefined, "ar"), "ar");
    expect(text).toContain(`من السنة:\n${virtue!.evidence!.ar}`);
    expect(text).toContain(virtue!.reflection!.ar);
  });

  it("keeps the photo background and kind label for the image", () => {
    const item = pool[0];
    const content = reminderShareContent(item, undefined, "ar", { kindLabel: "حديث", background: "/backgrounds/x.jpg" });
    expect(content.background).toBe("/backgrounds/x.jpg");
    expect(content.kindLabel).toBe("حديث");
  });
});
