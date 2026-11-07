// @vitest-environment jsdom
// Automatic dark mode by time: the look switches exactly at 18:30 and 05:30 — from one timer for the next
// switch, never a re-render of the whole app every minute, and nothing at all while the app is hidden.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LookProvider, useLook } from "./LookContext";
import { LOOK_STORAGE_KEY, msUntilNextLookChange } from "./looks";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const at = (h: number, m: number, s = 0) => new Date(2026, 10, 7, h, m, s);

describe("the next switch", () => {
  it("is 05:30 before dawn, 18:30 by day, tomorrow's 05:30 in the evening", () => {
    expect(msUntilNextLookChange(at(3, 0))).toBe(150 * 60_000);
    expect(msUntilNextLookChange(at(12, 0))).toBe(390 * 60_000);
    expect(msUntilNextLookChange(at(18, 29, 30))).toBe(30_000);
    expect(msUntilNextLookChange(at(18, 30))).toBe(11 * 60 * 60_000);
    expect(msUntilNextLookChange(at(23, 59))).toBe(331 * 60_000);
    // Never zero: a timer always moves on.
    expect(msUntilNextLookChange(at(5, 29, 59, ))).toBe(1_000);
  });
});

describe("the app's look, by time", () => {
  let container: HTMLDivElement;
  let root: Root;
  // Each render reports what it shows (a call, not a mutation of outer state).
  const onRender = vi.fn<(look: string) => void>();
  const seen = { get renders() { return onRender.mock.calls.length; }, get look() { return onRender.mock.calls.at(-1)?.[0] ?? ""; } };
  function Probe() {
    onRender(useLook().look);
    return null;
  }
  const setHidden = (hidden: boolean) =>
    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
      document.dispatchEvent(new Event("visibilitychange"));
    });

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ look: "classic", autoDark: "time" }));
    onRender.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await setHidden(false);
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("switches at 18:30 exactly, without re-rendering in between", async () => {
    vi.setSystemTime(at(17, 0));
    act(() => root.render(<LookProvider><Probe /></LookProvider>));
    expect(seen.look).toBe("classic");
    const before = seen.renders;
    // An hour of minutes passes: nothing re-renders (the old minute timer re-rendered the whole app 60 times).
    act(() => vi.advanceTimersByTime(60 * 60_000));
    expect(seen.renders).toBe(before);
    expect(seen.look).toBe("classic");
    act(() => vi.advanceTimersByTime(31 * 60_000));
    expect(seen.look).toBe("night");
    // …and at 05:30 it goes back.
    act(() => vi.advanceTimersByTime(11 * 60 * 60_000));
    expect(seen.look).toBe("classic");
  });

  it("does nothing while hidden, and is right at once when shown again", async () => {
    vi.setSystemTime(at(18, 0));
    act(() => root.render(<LookProvider><Probe /></LookProvider>));
    await setHidden(true);
    const before = seen.renders;
    act(() => vi.advanceTimersByTime(3 * 60 * 60_000)); // past 18:30 while hidden
    expect(seen.renders).toBe(before);
    expect(seen.look).toBe("classic");
    await setHidden(false);
    expect(seen.look).toBe("night");
  });
});
