// @vitest-environment jsdom
// Settings → إعدادات الصوت: a «تجربة الصوت» button beside each volume slider
// plays that category's sample at the slider's current level; tapping it
// again stops it.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { AudioSettingsView } from "./AudioSettingsView";
import { previewingCategory, previewSampleFor, setPreviewElementFactory, stopVolumePreview } from "../lib/volumePreview";
import type { PreviewElement } from "../lib/volumePreview";
import { loadAudioVolumes, resetAudioVolumesForTesting, VOLUME_CATEGORIES } from "../lib/audioVolumeSettings";
import { claimAudio, stopAudio } from "../lib/audioEngine";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let elements: (PreviewElement & { playing: boolean })[] = [];

function fake() {
  const el = {
    src: "",
    volume: 1,
    currentTime: 0,
    playing: false,
    play() {
      el.playing = true;
    },
    pause() {
      el.playing = false;
    },
    removeAttribute(name: string) {
      if (name === "src") el.src = "";
    },
    load() {},
    onloadedmetadata: null,
    onended: null,
    onerror: null,
    ontimeupdate: null,
  };
  elements.push(el);
  return el;
}

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
};
const button = (category: string) => container.querySelector<HTMLButtonElement>(`[data-volume-test='${category}']`)!;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};
const setSlider = async (category: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(`#audio-volume-${category}`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
};

beforeEach(() => {
  localStorage.clear();
  resetAudioVolumesForTesting();
  stopAudio();
  elements = [];
  setPreviewElementFactory(fake);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <AudioSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  stopVolumePreview();
  stopAudio();
});

describe("Settings → Audio: Test audio", () => {
  it("has one Test button per volume slider", () => {
    for (const category of VOLUME_CATEGORIES) {
      expect(button(category)).not.toBeNull();
      expect(button(category).textContent).toContain("تجربة الصوت");
    }
  });

  it("plays the category's sample at the slider's level — after the slider was changed — and the button then stops it", async () => {
    await setSlider("adhan", "35");
    act(() => stopVolumePreview()); // the slider's own preview ends
    expect(loadAudioVolumes().adhan).toBe(35);
    await click(button("adhan"));
    const el = elements.at(-1)!;
    expect(el.playing).toBe(true);
    expect(el.src).toBe(previewSampleFor("adhan")!.url);
    expect(el.volume).toBeCloseTo(0.35);
    expect(button("adhan").getAttribute("aria-pressed")).toBe("true");
    expect(button("adhan").textContent).toContain("إيقاف التجربة");
    // Moving the slider meanwhile: louder at once, still playing.
    await setSlider("adhan", "80");
    expect(el.volume).toBeCloseTo(0.8);
    expect(el.playing).toBe(true);
    await click(button("adhan"));
    expect(el.playing).toBe(false);
    expect(previewingCategory()).toBeNull();
    expect(button("adhan").getAttribute("aria-pressed")).toBe("false");
  });

  it("leaving the screen stops and releases the preview", async () => {
    await click(button("morning"));
    const el = elements.at(-1)!;
    expect(el.playing).toBe(true);
    act(() => root.unmount());
    expect(el.playing).toBe(false);
    expect(el.src).toBe("");
    root = createRoot(container); // for afterEach
  });

  it("testing one category leaves every other level untouched", async () => {
    await setSlider("misc", "20");
    act(() => stopVolumePreview());
    await click(button("morning"));
    expect(elements.at(-1)!.volume).toBe(1);
    expect(loadAudioVolumes()).toEqual({ adhan: 100, morning: 100, evening: 100, misc: 20 });
  });

  it("says so instead of playing while other audio plays", async () => {
    act(() => claimAudio("adhkar", "real", () => {}));
    await click(button("evening"));
    expect(elements.filter((e) => e.playing)).toHaveLength(0);
    expect(container.querySelector("[data-volume-category='evening'] [role='status']")!.textContent).toContain("لا يمكن التجربة الآن");
  });
});
