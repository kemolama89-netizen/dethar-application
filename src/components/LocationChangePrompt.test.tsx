// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LocationChangePrompt } from "./LocationChangePrompt";
import { DraggableMeaningCard } from "./MeaningPopover";
import { backOverlayCount, dismissTopBackOverlay } from "../lib/backOverlays";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      document.body.removeChild(container);
    },
  };
}

const promptProps = { title: "t", body: "b", confirmLabel: "yes", declineLabel: "no" };

describe("LocationChangePrompt — system Back", () => {
  it("counts as Decline (never Confirm) and is registered only while open", async () => {
    const onConfirm = vi.fn();
    const onDecline = vi.fn();
    const closed = await mount(<LocationChangePrompt {...promptProps} open={false} onConfirm={onConfirm} onDecline={onDecline} />);
    expect(backOverlayCount()).toBe(0);
    await closed.unmount();

    const { unmount } = await mount(<LocationChangePrompt {...promptProps} open onConfirm={onConfirm} onDecline={onDecline} />);
    expect(backOverlayCount()).toBe(1);
    dismissTopBackOverlay();
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await unmount();
    expect(backOverlayCount()).toBe(0);
  });
});

describe("DraggableMeaningCard — system Back", () => {
  it("is registered while mounted, Back calls onClose, and it unregisters on unmount", async () => {
    const cardEl = document.createElement("div");
    const list = document.createElement("div");
    list.className = "list";
    list.appendChild(cardEl);
    document.body.appendChild(list);
    const onClose = vi.fn();
    const { unmount } = await mount(
      <DraggableMeaningCard cardEl={cardEl} listSelector=".list" onClose={onClose} ariaLabel="m" closeAria="close" header={<span>h</span>}>
        <p>body</p>
      </DraggableMeaningCard>,
    );
    expect(backOverlayCount()).toBe(1);
    dismissTopBackOverlay();
    expect(onClose).toHaveBeenCalledTimes(1);
    await unmount();
    document.body.removeChild(list);
    expect(backOverlayCount()).toBe(0);
  });
});
