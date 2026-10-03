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
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsScreen } from "./SettingsScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { QuranReciterProvider } from "../theme/QuranReciterContext";
import { settingsLabels } from "../data/settings";
import { dismissTopBackOverlay, backOverlayCount } from "../lib/backOverlays";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = settingsLabels.ar; // LanguageProvider's own initial language

async function mountSettingsScreen(onNavigateToAudio: () => void = () => {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <QuranReciterProvider>
              <SettingsScreen
                onNavigateHome={() => {}}
                onNavigateToTasbeeh={() => {}}
                onNavigateToWritten={() => {}}
                onNavigateToAudio={onNavigateToAudio}
              />
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

describe("SettingsScreen — bottom navigation", () => {
  it("the Audio Adhkar tab opens Audio Adhkar directly", async () => {
    const onNavigateToAudio = vi.fn();
    const { container, unmount } = await mountSettingsScreen(onNavigateToAudio);
    const tab = Array.from(container.querySelectorAll("nav button")).find((b) => b.textContent?.includes("الأذكار المسموعة"))!;
    await act(async () => (tab as HTMLButtonElement).click());
    expect(onNavigateToAudio).toHaveBeenCalledTimes(1);
    await unmount();
  });
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

// Prayer times are chosen automatically from the location's country
// (calculationProfiles.ts): Settings no longer offers any calculation-method,
// madhab or minute control.
describe("SettingsScreen — no prayer-calculation controls", () => {
  it("the main menu has no calculation-method or madhab entry", async () => {
    const { container, unmount } = await mountSettingsScreen();
    const text = container.textContent ?? "";
    for (const removed of ["طريقة الحساب", "المذهب", "Calculation Method", "Madhab"]) expect(text).not.toContain(removed);
    // The location entry — which drives the automatic profile — is still there.
    expect(() => findButtonByText(container, t.locationRow)).not.toThrow();
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
