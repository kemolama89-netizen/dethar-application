// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { backOverlayCount, dismissTopBackOverlay, subscribeBackOverlays, useBackDismiss } from "./backOverlays";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let setters: Record<string, (v: boolean) => void> = {};
function Overlay({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  setters[name] = setOpen;
  useBackDismiss(open, onDismiss);
  return null;
}

let root: ReturnType<typeof createRoot> | null = null;
async function mount(overlays: { name: string; onDismiss: () => void }[]) {
  const container = document.createElement("div");
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <>
        {overlays.map((o) => (
          <Overlay key={o.name} {...o} />
        ))}
      </>,
    );
  });
}
const setOpen = (name: string, v: boolean) => act(async () => setters[name](v));

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  setters = {};
});

describe("backOverlays", () => {
  it("registers only while open; dismissing with nothing open does nothing", async () => {
    const dismiss = vi.fn();
    await mount([{ name: "a", onDismiss: dismiss }]);
    expect(backOverlayCount()).toBe(0);
    expect(dismissTopBackOverlay()).toBe(false);
    await setOpen("a", true);
    expect(backOverlayCount()).toBe(1);
    await setOpen("a", false);
    expect(backOverlayCount()).toBe(0);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("dismisses the topmost (most recently opened) overlay only", async () => {
    const a = vi.fn();
    const b = vi.fn();
    await mount([
      { name: "a", onDismiss: a },
      { name: "b", onDismiss: b },
    ]);
    await setOpen("a", true);
    await setOpen("b", true);
    expect(dismissTopBackOverlay()).toBe(true);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });

  it("calls the latest onDismiss without re-registering", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const container = document.createElement("div");
    root = createRoot(container);
    await act(async () => root!.render(<Overlay name="a" onDismiss={first} />));
    await setOpen("a", true);
    await act(async () => root!.render(<Overlay name="a" onDismiss={second} />));
    dismissTopBackOverlay();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("unregisters when the owning component unmounts while open (e.g. navigation)", async () => {
    await mount([{ name: "a", onDismiss: vi.fn() }]);
    await setOpen("a", true);
    expect(backOverlayCount()).toBe(1);
    await act(async () => root!.unmount());
    root = null;
    expect(backOverlayCount()).toBe(0);
  });

  it("notifies subscribers on open and close, and stops after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBackOverlays(listener);
    await mount([{ name: "a", onDismiss: vi.fn() }]);
    await setOpen("a", true);
    await setOpen("a", false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await setOpen("a", true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
