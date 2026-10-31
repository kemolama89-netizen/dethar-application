// @vitest-environment jsdom
// Every Qur'anic verse DITHAR shows full screen is in the Qur'anic brackets
// ﴿ … ﴾ — the same rule as the widget (lib/quranBrackets.ts), in both
// interfaces. Regression: the full-screen Quranic Insight showed al-Baqarah
// 2:274 (a Wamada) and Fussilat 41:34 (an al-Sa'di Latifa) without them,
// while the widget already had them. The verse itself is never changed.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import tanzilRaw from "../lib/__fixtures__/tanzil-simple-cited.txt?raw";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { FavoritesView } from "./FavoritesView";
import { addFavorite, favoriteFromItem } from "../lib/favorites";
import { findReminderItem, reminderPool } from "../lib/reminderContent";
import { quotedQuranInBrackets, withQuranBrackets } from "../lib/quranBrackets";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NB = " ";
const verse = (key: string) => tanzilRaw.split("\n").find((l) => l.startsWith(`${key.replace(":", "|")}|`))!.split("|")[2];
const bracketed = (v: string) => `﴿${NB}${v}${NB}﴾`;
const stripBrackets = (s: string) => s.replace(/﴿ | ﴾/gu, "");

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function mount(node: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** The two verses of the bug report: the Wamada on al-Baqarah 2:274 and al-Sa'di's Latifa on Fussilat 41:34. */
const CASES = [
  { id: "lataif:w6", key: "2:274" },
  { id: "lataif:q41-34", key: "41:34" },
] as const;

describe("full-screen Quranic Insight (SpiritualReminderView)", () => {
  for (const language of ["ar", "en"] as const) {
    for (const { id, key } of CASES) {
      it(`shows ${key} (${id}) in ﴿ … ﴾, the verse exactly as Tanzil has it — ${language} interface`, () => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        const item = findReminderItem(id)!;
        expect(item.category).toBe("lataif");
        mount(<SpiritualReminderView itemId={id} onClose={() => {}} />);
        const shown = container.querySelector("[data-reminder-text]")!.textContent!;
        expect(shown.normalize("NFC")).toBe(bracketed(verse(key)).normalize("NFC"));
        expect(stripBrackets(shown)).toBe(item.textAr); // the stored verse, untouched
        expect(container.querySelector("[data-reminder-kind]")!.textContent).toBe(language === "ar" ? "لطيفة قرآنية" : "Quranic Lataif");
        // The reference is shown as it was (a Wamada has no English one, so none in English).
        const source = language === "ar" ? item.sourceAr : item.sourceEn;
        if (source) expect(container.querySelector("[data-reminder-source]")!.textContent).toContain(source);
        // A translation is never bracketed.
        if (language === "en" && item.meaningEn) expect(container.textContent).toContain(item.meaningEn);
        expect(container.querySelector("p.italic")?.textContent ?? "").not.toMatch(/[﴾﴿]/u);
      });
    }
  }

  it("shows the Qur'anic words an Arabic explanation quotes in ﴿ … ﴾ instead of braces, its own words unchanged", () => {
    const item = reminderPool().find((i) => i.evidence?.kind === "insight" && /\{[^}]+\}/u.test(i.evidence.ar))!;
    mount(<SpiritualReminderView itemId={item.id} onClose={() => {}} />);
    const evidence = container.querySelector("[data-reminder-evidence='insight']")!.textContent!;
    expect(evidence).toContain(quotedQuranInBrackets(item.evidence!.ar));
    expect(evidence).not.toMatch(/[{}]/u);
  });

  it("leaves a Hadith and an ordinary dua as they are, and brackets only a dua's Qur'anic portion", () => {
    const hadith = reminderPool().find((i) => i.kind === "hadith" && !i.textAr.includes("{"))!;
    mount(<SpiritualReminderView itemId={hadith.id} onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(hadith.textAr);
    act(() => root.unmount());
    container.remove();
    mount(<SpiritualReminderView itemId="dua:allahumma-inni-asaluka-alhuda" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(findReminderItem("dua:allahumma-inni-asaluka-alhuda")!.textAr);
    act(() => root.unmount());
    container.remove();
    mount(<SpiritualReminderView itemId="dua:inna-lillahi-wa-inna-ilayhi-rajiun" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(`﴿${NB}إنا لله وإنا إليه راجعون${NB}﴾، اللهم أجرني في مصيبتي واخلف لي خيرًا منها.`);
  });

  it("opened from the widget (exactly what it showed), the verse is still in ﴿ … ﴾", () => {
    const item = findReminderItem("lataif:q41-34")!;
    mount(
      <SpiritualReminderView
        itemId={item.id}
        commentId={null}
        shownAs={{ category: "lataif", title: "لطيفة قرآنية", text: item.textAr, meaning: "", detail: "", source: item.sourceAr, commentText: null }}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector("[data-reminder-text]")!.textContent!.normalize("NFC")).toBe(bracketed(verse("41:34")).normalize("NFC"));
  });

  it("every published Qur'anic verse item renders bracketed in the shared rule, and no other item gains brackets", () => {
    for (const i of reminderPool()) {
      const shown = withQuranBrackets(i, i.textAr);
      expect(stripBrackets(shown).replace(/[{}]/gu, ""), i.id).toBe(i.textAr.replace(/[{}]/gu, ""));
      // (Two Qur'anic duas are stored already in ﴿ … ﴾, with plain spaces: shown as they are.)
      if (i.kind === "lataif" || i.kind === "quran" || i.kind === "quran-dua") expect(shown, i.id).toMatch(/^﴿[  ][^﴾]+[  ]﴾[.۔]?$/u);
      else if (i.kind === "hadith" || i.kind === "virtue" || i.kind === "poetry") expect(shown.replace(/﴿ [^﴾{}]* ﴾/gu, "")).not.toMatch(/[﴾﴿]/u);
    }
  });
});

describe("Favorites", () => {
  it("shows a saved Qur'anic verse in ﴿ … ﴾ — Fussilat 41:34", () => {
    addFavorite(favoriteFromItem(findReminderItem("lataif:q41-34")!, undefined, "app"));
    mount(<FavoritesView onBack={() => {}} />);
    expect(container.textContent!.normalize("NFC")).toContain(bracketed(verse("41:34")).normalize("NFC"));
  });
});
