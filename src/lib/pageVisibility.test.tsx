// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { isPageVisible, subscribePageVisibility } from "./pageVisibility";
import { useNextPrayerCountdown } from "./useNextPrayerCountdown";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.dispatchEvent(new Event("resume"));
  vi.useRealTimers();
});

describe("UI clocks pause while DITHAR is in the background", () => {
  it("follows Capacitor's pause/resume document events", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribePageVisibility(() => seen.push(isPageVisible()));
    document.dispatchEvent(new Event("pause"));
    expect(isPageVisible()).toBe(false);
    document.dispatchEvent(new Event("resume"));
    expect(isPageVisible()).toBe(true);
    expect(seen).toEqual([false, true]);
    unsubscribe();
  });

  it("the next-prayer countdown stops re-rendering while hidden and catches up when shown", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T08:00:00Z"));
    let renders = 0;
    function Probe() {
      renders++;
      const next = useNextPrayerCountdown(
        { fajr: new Date("2026-10-13T01:30:00Z"), shuruq: new Date("2026-10-13T02:50:00Z"), dhuhr: new Date("2026-10-13T08:40:00Z"), asr: new Date("2026-10-13T12:00:00Z"), maghrib: new Date("2026-10-13T14:40:00Z"), isha: new Date("2026-10-13T16:00:00Z") },
        new Date("2026-10-14T01:30:00Z"),
      );
      return <span>{next.remaining.minutes}</span>;
    }
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    await act(async () => vi.advanceTimersByTime(3_000));
    const visibleRenders = renders;
    expect(visibleRenders).toBeGreaterThan(1); // it ticks while shown

    await act(async () => document.dispatchEvent(new Event("pause")));
    const atPause = renders;
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(renders).toBe(atPause); // no ticks in the background
    expect(container.textContent).toBe("39"); // still 08:00:03's 39:57

    await act(async () => document.dispatchEvent(new Event("resume")));
    expect(container.textContent).toBe("38"); // caught up at once: 08:01:03 → 08:40 is 38:57
    await act(async () => root.unmount());
  });
});
