// @vitest-environment jsdom
//
// Regression coverage for InsightCard's Hadith "Show More" control: ONE
// button (never a second, separate "Read More"), whose visibility depends
// on whether detail data exists — not on Hadith text length (see
// getHadithDetailFields in src/data/hadith.ts) — and which OPENS THE
// SHARED FULL-CONTENT OVERLAY (ContentModal, via `onReadMore`) rather than
// expanding inline. This card itself never renders the detail rows or a
// "Show Less" state — see ContentModal.test.tsx for the overlay's own
// content. Mounts the REAL component (same plain react-dom/client + act
// pattern as SettingsScreen.test.tsx, no testing-library).
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { InsightCard } from "./InsightCard";
import { ThemeProvider } from "../theme/ThemeContext";
import { LanguageProvider } from "../theme/LanguageContext";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// CardMotif (rendered inside InsightCard) reads the men/women identity via
// useTheme, which itself needs LanguageProvider — same nesting App.tsx
// always mounts this component inside.
async function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>{node}</ThemeProvider>
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

function allButtonTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("button")).map((b) => b.textContent ?? "");
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

const baseProps = {
  variant: "hadith" as const,
  icon: <span />,
  title: "Prophetic Hadith",
  attribution: "The Messenger of Allah ﷺ said:",
  readMoreLabel: "Show More",
};

describe("InsightCard — Hadith card: single 'Show More' control opens the shared overlay", () => {
  it("shows Show More for a VERY SHORT body when details exist — not gated by text length", async () => {
    const { container, unmount } = await mount(
      <InsightCard {...baseProps} body="Short." details={[{ label: "Source", value: "Sahih al-Bukhari" }]} />,
    );
    expect(() => findButtonByText(container, "Show More")).not.toThrow();
    await unmount();
  });

  it("shows no control at all when details is an empty array and text isn't clamped", async () => {
    const { container, unmount } = await mount(<InsightCard {...baseProps} body="Short." details={[]} />);
    expect(allButtonTexts(container).some((t) => t.includes("Show More"))).toBe(false);
    await unmount();
  });

  it("there is only ONE button — never a separate Read More alongside Show More", async () => {
    const { container, unmount } = await mount(
      <InsightCard
        {...baseProps}
        body="A somewhat longer Hadith body that could plausibly overflow a two-line clamp on a narrow card."
        details={[{ label: "Source", value: "Sahih al-Bukhari" }]}
      />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("Show More");
    expect(allButtonTexts(container).some((t) => t.includes("Read more") || t.includes("Read More"))).toBe(false);
    await unmount();
  });

  it("clicking Show More calls onReadMore (opens the shared overlay) — this card never renders the details itself", async () => {
    const onReadMore = vi.fn();
    const { container, unmount } = await mount(
      <InsightCard
        {...baseProps}
        body="Short."
        details={[
          { label: "Source", value: "Sahih al-Bukhari" },
          { label: "Grade", value: "Sahih" },
        ]}
        onReadMore={onReadMore}
      />,
    );

    expect(container.querySelector("dl")).toBeNull();
    const toggle = findButtonByText(container, "Show More");

    await click(toggle);
    expect(onReadMore).toHaveBeenCalledTimes(1);
    // The card itself never expands inline — no dl, no "Show Less" state.
    expect(container.querySelector("dl")).toBeNull();
    expect(container.textContent).not.toContain("Sahih al-Bukhari");
    expect(allButtonTexts(container).some((t) => t.includes("Show Less"))).toBe(false);

    await unmount();
  });

  it("Quran card (citation, no `details`) is unaffected: plain citation line plus its own Read more button", async () => {
    const onReadMore = vi.fn();
    const { container, unmount } = await mount(
      <InsightCard
        variant="quran"
        icon={<span />}
        title="Quranic Insight"
        body="Short."
        citation="Tafsir Ibn Kathir"
        readMoreLabel="Read more"
        onReadMore={onReadMore}
      />,
    );
    expect(container.textContent).toContain("Tafsir Ibn Kathir");
    expect(container.querySelector("dl")).toBeNull();
    expect(allButtonTexts(container).some((t) => t.includes("Show More"))).toBe(false);
    await unmount();
  });
});
