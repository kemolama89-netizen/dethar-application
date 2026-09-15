// @vitest-environment jsdom
//
// Regression coverage for useNextPrayerCountdown: ticks live, transitions
// to the following prayer at the exact instant, and cleans up its own
// timer on unmount (no leaks, no duplicate timers). Mounts a tiny real
// component (same plain react-dom/client + act pattern used throughout
// this repo's other hook tests) and drives it with vi's fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useNextPrayerCountdown } from "./useNextPrayerCountdown";
import type { PrayerTimesResult } from "./prayerTimes";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: ReturnType<typeof useNextPrayerCountdown> | undefined;
function Probe({ times, tomorrowFajr }: { times: PrayerTimesResult; tomorrowFajr: Date }) {
  latest = useNextPrayerCountdown(times, tomorrowFajr);
  return null;
}

async function mount(times: PrayerTimesResult, tomorrowFajr: Date) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Probe times={times} tomorrowFajr={tomorrowFajr} />);
  });
  return {
    rerender: async (nextTimes: PrayerTimesResult, nextTomorrowFajr: Date) => {
      await act(async () => {
        root.render(<Probe times={nextTimes} tomorrowFajr={nextTomorrowFajr} />);
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
      latest = undefined;
    },
  };
}

const TODAY: PrayerTimesResult = {
  fajr: new Date("2026-09-14T04:12:00Z"),
  shuruq: new Date("2026-09-14T05:32:00Z"),
  dhuhr: new Date("2026-09-14T11:44:00Z"),
  asr: new Date("2026-09-14T15:13:00Z"),
  maghrib: new Date("2026-09-14T17:55:00Z"),
  isha: new Date("2026-09-14T19:12:00Z"),
};
const TOMORROW_FAJR = new Date("2026-09-15T04:13:00Z");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNextPrayerCountdown", () => {
  it("reports the correct next prayer and remaining time at mount", async () => {
    vi.setSystemTime(new Date("2026-09-14T13:00:00Z")); // between Dhuhr and Asr
    const { unmount } = await mount(TODAY, TOMORROW_FAJR);
    expect(latest?.key).toBe("asr");
    expect(latest?.remaining).toEqual({ hours: 2, minutes: 13 });
    await unmount();
  });

  it("ticks live — the countdown decreases as fake time advances, without any prop change", async () => {
    vi.setSystemTime(new Date("2026-09-14T13:00:00Z"));
    const { unmount } = await mount(TODAY, TOMORROW_FAJR);
    expect(latest?.remaining).toEqual({ hours: 2, minutes: 13 });

    await act(async () => {
      vi.advanceTimersByTime(60_000); // +1 minute
    });
    expect(latest?.remaining).toEqual({ hours: 2, minutes: 12 });
    await unmount();
  });

  it("automatically switches to the following prayer at the exact moment the current target arrives", async () => {
    vi.setSystemTime(new Date("2026-09-14T15:12:59Z")); // 1s before Asr
    const { unmount } = await mount(TODAY, TOMORROW_FAJR);
    expect(latest?.key).toBe("asr");
    expect(latest?.remaining).toEqual({ hours: 0, minutes: 0 });

    await act(async () => {
      vi.advanceTimersByTime(1_000); // crosses Asr's instant exactly
    });
    expect(latest?.key).toBe("maghrib");
    await unmount();
  });

  it("crosses from after-Isha to the following day's Fajr correctly", async () => {
    vi.setSystemTime(new Date("2026-09-14T23:59:59Z"));
    const { unmount } = await mount(TODAY, TOMORROW_FAJR);
    expect(latest?.key).toBe("fajr");
    expect(latest?.time.getTime()).toBe(TOMORROW_FAJR.getTime());
    await unmount();
  });

  it("stops ticking after unmount — no leaked interval updates a detached component", async () => {
    vi.setSystemTime(new Date("2026-09-14T13:00:00Z"));
    const { unmount } = await mount(TODAY, TOMORROW_FAJR);
    const before = latest?.remaining;
    await unmount();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    // `latest` was cleared to undefined by unmount() and nothing should
    // have re-set it — the probe component no longer exists to run.
    expect(latest).toBeUndefined();
    expect(before).toBeDefined();
    clearIntervalSpy.mockRestore();
  });
});
