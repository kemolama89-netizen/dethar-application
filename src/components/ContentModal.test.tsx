// @vitest-environment jsdom
//
// Regression coverage for ContentModal's shared full-content overlay,
// specifically the `details` rows added for the Hadith card's takhrij/
// metadata (Source, Hadith No., Grade, Grading Source, Narrator) — the
// SAME overlay component already used by the Quranic Insight card's "Read
// more" (which never passes `details`). Mounts the REAL component (same
// plain react-dom/client + act pattern as InsightCard.test.tsx).
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ContentModal } from "./ContentModal";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
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

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

const baseProps = {
  open: true,
  closeLabel: "Close",
  icon: <span />,
  title: "Prophetic Hadith",
  attribution: "The Messenger of Allah ﷺ said:",
  body: "Actions are but by intentions.",
};

describe("ContentModal", () => {
  it("renders nothing when closed", async () => {
    const { container, unmount } = await mount(<ContentModal {...baseProps} open={false} onClose={() => {}} />);
    expect(container.textContent).toBe("");
    await unmount();
  });

  it("shows the full, untruncated body and every detail row when open", async () => {
    const { container, unmount } = await mount(
      <ContentModal
        {...baseProps}
        onClose={() => {}}
        details={[
          { label: "Source", value: "Sahih al-Bukhari" },
          { label: "Grade", value: "Sahih, agreed upon" },
          { label: "Grading Source", value: "Al-Bukhari and Muslim" },
          { label: "Narrator", value: "Umar ibn al-Khattab" },
        ]}
      />,
    );
    expect(container.textContent).toContain("Actions are but by intentions.");
    const dl = container.querySelector("dl");
    expect(dl).not.toBeNull();
    expect(dl!.textContent).toContain("Source");
    expect(dl!.textContent).toContain("Sahih al-Bukhari");
    expect(dl!.textContent).toContain("Grading Source");
    expect(dl!.textContent).toContain("Al-Bukhari and Muslim");
    expect(dl!.textContent).toContain("Narrator");
    expect(dl!.textContent).toContain("Umar ibn al-Khattab");
    await unmount();
  });

  it("renders no dl when details is omitted (Quranic Insight usage)", async () => {
    const { container, unmount } = await mount(
      <ContentModal {...baseProps} onClose={() => {}} citation="Tafsir Ibn Kathir" />,
    );
    expect(container.querySelector("dl")).toBeNull();
    expect(container.textContent).toContain("Tafsir Ibn Kathir");
    await unmount();
  });

  it("the X close button calls onClose", async () => {
    const onClose = vi.fn();
    const { container, unmount } = await mount(<ContentModal {...baseProps} onClose={onClose} />);
    const closeBtn = container.querySelector('button[aria-label="Close"]');
    expect(closeBtn).not.toBeNull();
    await click(closeBtn as HTMLButtonElement);
    expect(onClose).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("clicking the dimmed backdrop also calls onClose, but clicking inside the card does not", async () => {
    const onClose = vi.fn();
    const { container, unmount } = await mount(<ContentModal {...baseProps} onClose={onClose} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    await click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;
    await click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    await unmount();
  });
});
