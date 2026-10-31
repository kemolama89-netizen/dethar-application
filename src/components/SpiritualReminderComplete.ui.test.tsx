// @vitest-environment jsdom
// The in-app full-screen reminder shows a Qur'anic Latifa COMPLETE: the whole
// verse as Tanzil has it (al-Qasas 28:79 used to stop at «قَارُونُ»), the whole
// reflection (it used to read «المقارنات ال؛ … أبهته ال.»), and a scroll area
// whose start stays reachable when the content is taller than the screen
// ("safe" centring — measured in a real browser on 2026-10-17: with plain
// centring the first lines of a long verse sat above the scroll area).
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import tanzilRaw from "../lib/__fixtures__/tanzil-simple-cited.txt?raw";
import { LanguageProvider } from "../theme/LanguageContext";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { WAMDAT } from "../data/wamdat";
import { quotedQuranInBrackets } from "../lib/quranBrackets";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const verse = (key: string) => tanzilRaw.split("\n").find((l) => l.startsWith(`${key.replace(":", "|")}|`))!.split("|")[2];

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("full-screen Latifa", () => {
  it("shows al-Qasas 28:79 whole, with its complete reflection, in a scroll area that starts at the top when it overflows", () => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<LanguageProvider><SpiritualReminderView itemId="lataif:w252" onClose={() => {}} /></LanguageProvider>));
    const text = container.querySelector("[data-reminder-text]")!;
    // The whole verse, in the Qur'anic brackets ﴿ … ﴾ (lib/quranBrackets.ts).
    expect(text.textContent!.normalize("NFC")).toBe(`\uFD3F\u00A0${verse("28:79")}\u00A0\uFD3E`.normalize("NFC"));
    expect(text.textContent!.normalize("NFC").endsWith("إِنَّهُ لَذُو حَظٍّ عَظِيمٍ\u00A0\uFD3E".normalize("NFC"))).toBe(true);
    const evidence = container.querySelector("[data-reminder-evidence]")!;
    // Its reflection whole — any Qur'anic words it quotes in ﴿ … ﴾ instead of braces.
    expect(evidence.textContent).toContain(quotedQuranInBrackets(WAMDAT.find((e) => e.id === 252)!.insightAr));
    expect(evidence.textContent).toContain("المقارنات المادية الاجتماعية");
    const scroller = text.closest(".overflow-y-auto")!;
    expect(scroller.className).toContain("justify-center-safe");
    expect(scroller.className).not.toMatch(/(^|\s)justify-center(\s|$)/);
  });
});
