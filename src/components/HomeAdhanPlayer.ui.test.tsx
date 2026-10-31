// @vitest-environment jsdom
// The Home screen player while the scheduled adhan plays: the same panel as
// a dhikr, labelled «الأذان», with the muezzin, its real state (playing /
// paused / waiting for the audio), and controls that act on the adhan only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const native = vi.hoisted(() => ({
  pauseAdhan: vi.fn(() => Promise.resolve()),
  resumeAdhan: vi.fn(() => Promise.resolve()),
  stopAdhan: vi.fn(() => Promise.resolve()),
  pause: vi.fn(() => Promise.resolve()),
  stop: vi.fn(() => Promise.resolve()),
  getAdhanProgress: vi.fn(() => Promise.resolve({ active: true, positionMs: 30_000, durationMs: 180_000, loading: false })),
  log: vi.fn(() => Promise.resolve()),
}));
vi.mock("../lib/audioAdhkarNative", async (orig) => ({ ...(await orig<object>()), AudioAdhkarNative: native, isAudioAdhkarNativeAvailable: () => true }));

import { HomeAudioPlayer } from "./HomeAudioPlayer";
import { LanguageProvider } from "../theme/LanguageContext";
import { applyNativeAdhanState, resetAdhanPlaybackForTesting } from "../lib/adhanPlayback";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
// The panel is a lazy chunk (it brings the now-playing panel module): wait for it, then for its first progress read.
const settle = async () => {
  for (let i = 0; i < 200 && container.querySelector("[data-home-player]")?.textContent === "…"; i++) await act(async () => new Promise((r) => setTimeout(r, 10)));
  for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
};

beforeEach(async () => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<LanguageProvider><HomeAudioPlayer /></LanguageProvider>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  resetAdhanPlaybackForTesting();
  vi.clearAllMocks();
});

const card = () => container.querySelector<HTMLElement>("[data-home-player]")!;

describe("Home player — the adhan", () => {
  it("shows «الأذان», the muezzin and the real progress while it plays, then returns to idle when it ends", async () => {
    expect(card().dataset.homePlayer).toBe("empty");
    act(() => applyNativeAdhanState({ active: true, status: "playing", title: "الظهر", voice: "v", muezzin: "مشاري العفاسي" }));
    await settle();
    expect(card().dataset.homePlayer).toBe("adhan-playing");
    expect(container.querySelector("[data-now-playing-title]")!.textContent).toBe("الأذان");
    expect(container.querySelector("[data-adhan-muezzin]")!.textContent).toContain("مشاري العفاسي");
    expect(container.querySelector("[data-elapsed]")!.textContent).toBe("00:30");
    expect(container.querySelector("[data-duration]")!.textContent).toBe("03:00");
    act(() => applyNativeAdhanState(null));
    await settle();
    expect(card().dataset.homePlayer).toBe("empty");
  });

  it("says when it is waiting for the audio, and its controls reach the adhan only", async () => {
    act(() => applyNativeAdhanState({ active: true, status: "waiting", title: "", voice: "", muezzin: "" }));
    await settle();
    expect(container.querySelector("[data-adhan-note='waiting']")).not.toBeNull();
    expect(container.querySelector("[data-adhan-muezzin]")).toBeNull(); // unknown muezzin: never guessed
    await act(async () => container.querySelector<HTMLButtonElement>("[data-home-player-toggle='resume']")!.click());
    expect(native.resumeAdhan).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector<HTMLButtonElement>("[data-home-player-toggle='pause']")!.click());
    expect(native.pauseAdhan).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector<HTMLButtonElement>("[data-home-player-stop]")!.click());
    expect(native.stopAdhan).toHaveBeenCalledTimes(1);
    expect(native.pause).not.toHaveBeenCalled();
    expect(native.stop).not.toHaveBeenCalled();
  });
});
