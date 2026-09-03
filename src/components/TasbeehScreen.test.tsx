// @vitest-environment jsdom
//
// Regression suite for the "Reset All" button added next to the existing
// per-Dhikr Reset button. Mounts the REAL TasbeehScreen component (plain
// react-dom/client + act, no testing-library — this project has none
// installed and these tests don't need one) under the same provider
// nesting App.tsx itself uses, so useLanguage()/useTheme()/usePalette()
// all resolve normally.
import { describe, expect, it, beforeEach } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TasbeehScreen } from "./TasbeehScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { dhikrItems, tasbeehLabels } from "../data/tasbeeh";
import { loadTasbeehCounters, saveTasbeehCounters } from "../lib/tasbeehCounters";

// Silences React's benign "not configured for act()" warning — this
// file's environment IS the test itself, driven entirely through act().
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = tasbeehLabels.ar; // LanguageProvider's own initial language

async function mountTasbeehScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <TasbeehScreen onNavigateHome={() => {}} onNavigateToWritten={() => {}} onNavigateToSettings={() => {}} />
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
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

// Selects a specific Dhikr by its own Arabic text (each dhikrItems entry's
// button in the horizontal selector renders `item.dhikr_ar` verbatim).
async function selectDhikr(container: HTMLElement, dhikrAr: string) {
  await click(findButtonByText(container, dhikrAr));
}

function displayedCount(container: HTMLElement): string | null {
  // The big circular tap target's own count span — the only element in
  // the selector-count area with digit-only text content at any given
  // time (bubbles/confetti render separately and are never plain digits).
  const candidates = Array.from(container.querySelectorAll("span")).filter((s) => /^\d+$/.test(s.textContent ?? ""));
  return candidates.length > 0 ? candidates[candidates.length - 1].textContent : null;
}

beforeEach(() => {
  localStorage.clear();
});

describe("TasbeehScreen — Reset All", () => {
  it("renders next to the existing per-Dhikr Reset button", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    // Both exist, and the individual Reset button is not the same element
    // as Reset All (distinct labels, per requirement 10 — consistent
    // styling, not merged into one control).
    const resetButton = findButtonByText(container, t.reset);
    const resetAllButton = findButtonByText(container, t.resetAll);
    expect(resetButton).not.toBe(resetAllButton);
    // Adjacent: siblings within the same immediate parent.
    expect(resetButton.parentElement).toBe(resetAllButton.parentElement);
    await unmount();
  });

  it("canceling the confirmation dialog resets nothing", async () => {
    const seeded = { [dhikrItems[0].id]: 7, [dhikrItems[1].id]: 3 };
    saveTasbeehCounters(seeded);
    const { container, unmount } = await mountTasbeehScreen();

    expect(displayedCount(container)).toBe("7"); // dhikrItems[0] is selected by default

    await click(findButtonByText(container, t.resetAll));
    // Dialog is open; nothing has changed yet.
    expect(displayedCount(container)).toBe("7");

    await click(findButtonByText(container, t.resetAllConfirmCancel));

    // Nothing changed: neither the live UI nor the persisted store.
    expect(displayedCount(container)).toBe("7");
    expect(loadTasbeehCounters()).toEqual(seeded);
    await selectDhikr(container, dhikrItems[1].dhikr_ar);
    expect(displayedCount(container)).toBe("3");

    await unmount();
  });

  it("confirming resets the currently selected Dhikr's counter to 0", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 12 });
    const { container, unmount } = await mountTasbeehScreen();

    expect(displayedCount(container)).toBe("12");
    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    expect(displayedCount(container)).toBe("0");
    expect(loadTasbeehCounters()[dhikrItems[0].id] ?? 0).toBe(0);
    await unmount();
  });

  it("reset-all zeroes EVERY Dhikr's counter, even ones with different nonzero counts, not just the selected one", async () => {
    const seeded = {
      [dhikrItems[0].id]: 20,
      [dhikrItems[1].id]: 5,
      [dhikrItems[2].id]: 45,
    };
    saveTasbeehCounters(seeded);
    const { container, unmount } = await mountTasbeehScreen();

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    const persisted = loadTasbeehCounters();
    for (const item of dhikrItems) {
      expect(persisted[item.id] ?? 0).toBe(0);
    }

    // Confirm the LIVE UI reflects it too for each of the seeded Dhikr,
    // not merely the persisted store.
    for (const id of Object.keys(seeded)) {
      const item = dhikrItems.find((d) => d.id === Number(id))!;
      await selectDhikr(container, item.dhikr_ar);
      expect(displayedCount(container)).toBe("0");
    }

    await unmount();
  });

  it("does not disable or otherwise modify Voice Tasbeeh's own enabled toggle", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 9 });
    const { container, unmount } = await mountTasbeehScreen();

    const voiceButton = findButtonByText(container, t.voiceTasbeeh);
    expect(voiceButton.getAttribute("aria-pressed")).toBe("false");
    await click(voiceButton);
    expect(voiceButton.getAttribute("aria-pressed")).toBe("true");

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    // Voice Tasbeeh's own enabled/disabled state is untouched by Reset All.
    expect(voiceButton.getAttribute("aria-pressed")).toBe("true");
    expect(displayedCount(container)).toBe("0");
    await unmount();
  });

  it("does not touch an unrelated per-Dhikr preference (the target-count input)", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 4 });
    const { container, unmount } = await mountTasbeehScreen();

    const targetInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    // React overrides the native `value` setter to track changes, so a
    // plain `targetInput.value = "33"` is invisible to it — the standard
    // workaround is invoking the native setter directly before dispatching
    // the `input` event React's onChange actually listens for.
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      nativeValueSetter.call(targetInput, "33");
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(targetInput.value).toBe("33");

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    // The target preference (not "progress/counts") is untouched.
    expect(targetInput.value).toBe("33");
    expect(displayedCount(container)).toBe("0");
    await unmount();
  });
});
