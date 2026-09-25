// @vitest-environment jsdom
//
// Regression coverage for the Floating Tasbeeh Settings entry point.
// Mounts the REAL SettingsScreen (same plain react-dom/client + act
// pattern as TasbeehScreen.test.tsx, no testing-library). This file
// intentionally does NOT mock @capacitor/core — running under plain jsdom
// (this project's real test environment, not a native shell),
// Capacitor.isNativePlatform() genuinely returns false, so
// isFloatingTasbeehAvailable() is false and the view falls back to the
// "coming soon" card exactly as an iOS or plain-web user would see it.
import { describe, expect, it, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsScreen } from "./SettingsScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { QuranReciterProvider } from "../theme/QuranReciterContext";
import { settingsLabels, calculationMethodLabels, madhabLabels } from "../data/settings";
import { loadCalculationOverrides } from "../lib/calculationSettings";
import { dismissTopBackOverlay, backOverlayCount } from "../lib/backOverlays";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = settingsLabels.ar; // LanguageProvider's own initial language

async function mountSettingsScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <QuranReciterProvider>
              <SettingsScreen onNavigateHome={() => {}} onNavigateToTasbeeh={() => {}} onNavigateToWritten={() => {}} />
            </QuranReciterProvider>
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

beforeEach(() => {
  localStorage.clear();
});

describe("SettingsScreen — Floating Tasbeeh entry", () => {
  it("renders a Floating Tasbeeh row on the main menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    expect(() => findButtonByText(container, t.floatingTasbeehRow)).not.toThrow();
    await unmount();
  });

  it("falls back to the 'coming soon' status card on a platform with no native bridge (this test's real jsdom environment)", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.floatingTasbeehRow));

    expect(container.textContent).toContain(t.floatingTasbeehComingSoonTitle);
    expect(container.textContent).toContain(t.floatingTasbeehComingSoonBody);
    // No enable/disable toggle should ever appear where there is nothing
    // native for it to control.
    expect(() => findButtonByText(container, t.floatingTasbeehEnableLabel)).toThrow();

    await unmount();
  });

  it("back button returns to the main Settings menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.floatingTasbeehRow));
    expect(container.textContent).toContain(t.floatingTasbeehPageTitle);

    const backButton = container.querySelector(`button[aria-label="${t.back}"]`) as HTMLButtonElement;
    await click(backButton);
    expect(() => findButtonByText(container, t.floatingTasbeehRow)).not.toThrow();

    await unmount();
  });
});

describe("SettingsScreen — Reminders (notifications) entry", () => {
  it("renders a Reminders row on the main menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    expect(() => findButtonByText(container, t.notificationsRow)).not.toThrow();
    await unmount();
  });

  it("the toggle is real (not gated behind platform availability) — a preference can be set even before a native plugin exists", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.notificationsRow));

    expect(container.textContent).toContain(t.notificationsDisabledStatus);
    expect(container.textContent).toContain(t.notificationsUnavailableNote);

    await click(findButtonByText(container, t.notificationsEnableLabel));
    expect(container.textContent).toContain(t.notificationsEnabledStatus);

    await unmount();
  });

  it("the enabled preference persists across remounts", async () => {
    const first = await mountSettingsScreen();
    await click(findButtonByText(first.container, t.notificationsRow));
    await click(findButtonByText(first.container, t.notificationsEnableLabel));
    await first.unmount();

    const second = await mountSettingsScreen();
    await click(findButtonByText(second.container, t.notificationsRow));
    expect(second.container.textContent).toContain(t.notificationsEnabledStatus);
    await second.unmount();
  });

  it("shows a reminder-time picker only once enabled", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.notificationsRow));

    expect(container.querySelector("#notification-reminder-time")).toBeNull();
    await click(findButtonByText(container, t.notificationsEnableLabel));
    expect(container.querySelector("#notification-reminder-time")).not.toBeNull();

    await unmount();
  });

  it("back button returns to the main Settings menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.notificationsRow));
    expect(container.textContent).toContain(t.notificationsPageTitle);

    const backButton = container.querySelector(`button[aria-label="${t.back}"]`) as HTMLButtonElement;
    await click(backButton);
    expect(() => findButtonByText(container, t.notificationsRow)).not.toThrow();

    await unmount();
  });
});

// Step 6 of the global hybrid prayer-time architecture: the Settings UI for
// the calculation-method/madhab override. No localStorage location override
// is set up in any of these tests, so resolveActiveLocationRecord() falls
// through to the Kuwait fallback (countryCode "KW") — the automatic method
// row's own resolved-value hint is asserted against that, exactly what a
// fresh install would show.
describe("SettingsScreen — Calculation Method entry (Step 6)", () => {
  const automaticMethodRowLabel = `${t.calculationAutomaticLabel} — ${t.calculationAutomaticResolvedHint(calculationMethodLabels.Kuwait.ar)}`;

  it("renders a Calculation Method row on the main menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    expect(() => findButtonByText(container, t.calculationRow)).not.toThrow();
    await unmount();
  });

  it("opens the page with both the Method and Madhab sections, Automatic selected by default in each", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));

    expect(container.textContent).toContain(t.calculationPageTitle);
    expect(container.textContent).toContain(t.calculationMethodSectionTitle);
    expect(container.textContent).toContain(t.calculationMadhabSectionTitle);
    expect(container.textContent).toContain(calculationMethodLabels.Egyptian.ar); // every supported method is listed
    expect(container.textContent).toContain(madhabLabels.hanafi.ar);

    // Two "Automatic" rows exist (Method + Madhab) — both start selected
    // since no override has ever been set.
    const automaticButtons = Array.from(container.querySelectorAll("button")).filter((b) =>
      b.textContent?.includes(t.calculationAutomaticLabel),
    );
    expect(automaticButtons).toHaveLength(2);
    for (const b of automaticButtons) expect(b.getAttribute("aria-pressed")).toBe("true");

    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
    await unmount();
  });

  it("the Automatic method row shows what it currently resolves to (Kuwait, the default fallback location)", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));
    expect(() => findButtonByText(container, automaticMethodRowLabel)).not.toThrow();
    await unmount();
  });

  it("selecting an explicit method marks it selected, deselects Automatic, and persists — without touching the madhab override", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));

    await click(findButtonByText(container, calculationMethodLabels.Egyptian.ar));
    expect(findButtonByText(container, calculationMethodLabels.Egyptian.ar).getAttribute("aria-pressed")).toBe("true");
    expect(findButtonByText(container, automaticMethodRowLabel).getAttribute("aria-pressed")).toBe("false");
    expect(loadCalculationOverrides()).toEqual({ method: "Egyptian", madhab: undefined });

    await unmount();
  });

  it("selecting a madhab persists independently of the method override — both can be set at once", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));

    await click(findButtonByText(container, calculationMethodLabels.Turkey.ar));
    await click(findButtonByText(container, madhabLabels.hanafi.ar));

    expect(findButtonByText(container, madhabLabels.hanafi.ar).getAttribute("aria-pressed")).toBe("true");
    expect(loadCalculationOverrides()).toEqual({ method: "Turkey", madhab: "hanafi" });

    await unmount();
  });

  it("re-selecting Automatic clears the method override back to null", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));

    await click(findButtonByText(container, calculationMethodLabels.Qatar.ar));
    expect(loadCalculationOverrides().method).toBe("Qatar");

    await click(findButtonByText(container, automaticMethodRowLabel));
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
    expect(findButtonByText(container, automaticMethodRowLabel).getAttribute("aria-pressed")).toBe("true");

    await unmount();
  });

  it("both overrides persist across remounts", async () => {
    const first = await mountSettingsScreen();
    await click(findButtonByText(first.container, t.calculationRow));
    await click(findButtonByText(first.container, calculationMethodLabels.Dubai.ar));
    await click(findButtonByText(first.container, madhabLabels.hanafi.ar));
    await first.unmount();

    const second = await mountSettingsScreen();
    await click(findButtonByText(second.container, t.calculationRow));
    expect(findButtonByText(second.container, calculationMethodLabels.Dubai.ar).getAttribute("aria-pressed")).toBe("true");
    expect(findButtonByText(second.container, madhabLabels.hanafi.ar).getAttribute("aria-pressed")).toBe("true");
    await second.unmount();
  });

  it("back button returns to the main Settings menu", async () => {
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.calculationRow));
    expect(container.textContent).toContain(t.calculationPageTitle);

    const backButton = container.querySelector(`button[aria-label="${t.back}"]`) as HTMLButtonElement;
    await click(backButton);
    expect(() => findButtonByText(container, t.calculationRow)).not.toThrow();

    await unmount();
  });
});

describe("SettingsScreen — system Back with the Statistics-reset confirmation open", () => {
  it("cancels the confirmation without deleting anything", async () => {
    localStorage.setItem("dithar:stats:events:v1", JSON.stringify([]));
    const { container, unmount } = await mountSettingsScreen();
    await click(findButtonByText(container, t.statisticsRow));
    expect(backOverlayCount()).toBe(0);
    await click(findButtonByText(container, t.resetStatisticsRow));
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(backOverlayCount()).toBe(1);

    await act(async () => {
      expect(dismissTopBackOverlay()).toBe(true);
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(backOverlayCount()).toBe(0);
    expect(localStorage.getItem("dithar:stats:events:v1")).toBe("[]");
    await unmount();
  });
});
