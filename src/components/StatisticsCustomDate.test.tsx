// @vitest-environment jsdom
//
// Regression coverage for the Statistics screen's Daily / Custom-range date
// pickers. The bug this protects against: each picker's `min`/`max` used to
// be derived from the OTHER picker and from the earliest recorded event, so
//   - with history starting today, every date field was locked to a single
//     day (no previous date could be chosen at all), and
//   - the "from" field could never move past the current "to" (and vice
//     versa): typing such a date left BOTH fields invalid and the report
//     empty — the selected date felt "stuck".
// Now both fields are bounded only by "not in the future", and the reported
// range is derived from whichever two dates are set, in either order (see
// resolveCustomRange in stats.ts). Mounts the REAL SettingsScreen, same
// plain react-dom/client + act pattern as SettingsScreen.test.tsx.
import { describe, expect, it, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsScreen } from "./SettingsScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { settingsLabels } from "../data/settings";
import { addDays, clearAllStats, recordFloatingTasbeehRepetition, todayLocalDate } from "../lib/stats";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = settingsLabels.ar; // LanguageProvider's own initial language
const TODAY = todayLocalDate();
const daysAgo = (n: number) => addDays(TODAY, -n);

function seed(localDate: string, times: number) {
  recordFloatingTasbeehRepetition(1, times, { ts: 1, localDate, localTime: "10:00:00", timeZone: "UTC" });
}

async function mountStatistics() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <SettingsScreen onNavigateHome={() => {}} onNavigateToTasbeeh={() => {}} onNavigateToWritten={() => {}} />
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
  await click(findButtonByText(container, t.statisticsRow));
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`No button found with text "${text}"`);
  return button as HTMLButtonElement;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

const dateInputs = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLInputElement>('input[type="date"]'));

// React tracks an input's value through its own setter hook, so a plain
// `input.value = x` would be swallowed — go through the native prototype
// setter and fire the real "input" event, exactly what a browser does when
// the user picks or types a date.
async function setDate(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const tasbeehTotalShown = (container: HTMLElement) => {
  const text = container.textContent ?? "";
  const match = text.match(/(\d[\d,]*)\s*ذكرًا/);
  return match ? Number(match[1].replace(/,/g, "")) : null;
};

beforeEach(() => {
  localStorage.clear();
  clearAllStats();
});

describe("Statistics — date picker bounds", () => {
  it("Daily is bounded only by today: never by the earliest recorded event", async () => {
    seed(TODAY, 1); // history starts today — used to lock the picker to a single day
    const { container, unmount } = await mountStatistics();
    const [daily] = dateInputs(container);
    expect(daily.min).toBe("");
    expect(daily.max).toBe(TODAY);
    await unmount();
  });

  it("Custom range fields are bounded only by today — not by each other, not by the earliest event", async () => {
    seed(TODAY, 1);
    const { container, unmount } = await mountStatistics();
    await click(findButtonByText(container, t.periodCustom));
    const [from, to] = dateInputs(container);
    expect([from.min, from.max]).toEqual(["", TODAY]);
    expect([to.min, to.max]).toEqual(["", TODAY]);

    await setDate(to, daysAgo(30));
    await setDate(from, daysAgo(40));
    // Moving one field must never change the other's bounds.
    expect([from.min, from.max]).toEqual(["", TODAY]);
    expect([to.min, to.max]).toEqual(["", TODAY]);
    await unmount();
  });
});

describe("Statistics — selecting and returning to specific dates", () => {
  it("Daily: any previous date can be selected, then another, then back — each shows that day's total", async () => {
    seed(daysAgo(5), 2);
    seed(daysAgo(3), 3);
    seed(TODAY, 1);
    const { container, unmount } = await mountStatistics();
    const [daily] = dateInputs(container);

    await setDate(daily, daysAgo(5));
    expect(daily.value).toBe(daysAgo(5));
    expect(tasbeehTotalShown(container)).toBe(2);

    await setDate(daily, daysAgo(3));
    expect(daily.value).toBe(daysAgo(3));
    expect(tasbeehTotalShown(container)).toBe(3);

    await setDate(daily, daysAgo(5)); // return to the earlier date
    expect(daily.value).toBe(daysAgo(5));
    expect(tasbeehTotalShown(container)).toBe(2);

    await setDate(daily, daysAgo(40)); // before any recorded event
    expect(daily.value).toBe(daysAgo(40));
    expect(tasbeehTotalShown(container)).toBe(0);
    await unmount();
  });

  it("Custom: moves between ranges in both directions, and the report follows every step", async () => {
    seed(daysAgo(5), 2);
    seed(daysAgo(3), 3);
    seed(daysAgo(1), 4);
    const { container, unmount } = await mountStatistics();
    await click(findButtonByText(container, t.periodCustom));
    const [from, to] = dateInputs(container);

    expect(tasbeehTotalShown(container)).toBe(9); // initial: earliest .. today

    await setDate(to, daysAgo(3));
    await setDate(from, daysAgo(5));
    expect(tasbeehTotalShown(container)).toBe(5);

    // Move to a LATER range than the current one — the step that used to be
    // blocked (from could not pass the current to).
    await setDate(from, daysAgo(1));
    await setDate(to, daysAgo(1));
    expect(from.value).toBe(daysAgo(1));
    expect(to.value).toBe(daysAgo(1));
    expect(tasbeehTotalShown(container)).toBe(4);

    // ...and back to an earlier one.
    await setDate(from, daysAgo(5));
    await setDate(to, daysAgo(5));
    expect(from.value).toBe(daysAgo(5));
    expect(to.value).toBe(daysAgo(5));
    expect(tasbeehTotalShown(container)).toBe(2);
    await unmount();
  });

  it("Custom: picking 'from' after 'to' reports the span between them (not an empty range) and leaves both fields as picked", async () => {
    seed(daysAgo(5), 2);
    seed(daysAgo(3), 3);
    seed(daysAgo(1), 4);
    const { container, unmount } = await mountStatistics();
    await click(findButtonByText(container, t.periodCustom));
    const [from, to] = dateInputs(container);

    await setDate(from, daysAgo(5));
    await setDate(to, daysAgo(3));
    await setDate(from, daysAgo(1)); // later than 'to'
    expect(from.value).toBe(daysAgo(1));
    expect(to.value).toBe(daysAgo(3));
    expect(tasbeehTotalShown(container)).toBe(7); // days -3 .. -1
    await unmount();
  });

  it("Custom: a future date is never reported past today", async () => {
    seed(daysAgo(1), 4);
    seed(TODAY, 1);
    const { container, unmount } = await mountStatistics();
    await click(findButtonByText(container, t.periodCustom));
    const [from, to] = dateInputs(container);
    await setDate(from, daysAgo(2));
    await setDate(to, addDays(TODAY, 5));
    expect(tasbeehTotalShown(container)).toBe(5);
    await unmount();
  });

  it("the picked custom dates survive switching to another period and back", async () => {
    seed(daysAgo(5), 2);
    seed(daysAgo(3), 3);
    const { container, unmount } = await mountStatistics();
    await click(findButtonByText(container, t.periodCustom));
    let [from, to] = dateInputs(container);
    await setDate(to, daysAgo(3));
    await setDate(from, daysAgo(5));

    await click(findButtonByText(container, t.periodDaily));
    await click(findButtonByText(container, t.periodCustom));
    [from, to] = dateInputs(container);
    expect(from.value).toBe(daysAgo(5));
    expect(to.value).toBe(daysAgo(3));
    expect(tasbeehTotalShown(container)).toBe(5);
    await unmount();
  });
});
