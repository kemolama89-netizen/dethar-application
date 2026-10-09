// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AdhanAudioSettingsView } from "./AdhanAudioSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { loadAdhanAudioSettings, resetAdhanAudioSettingsMemoryForTesting } from "../lib/adhanAudioSettings";
import type { AdhanAudioElement } from "../lib/adhanAudio";
import { setAdhanAudioElementFactory } from "../lib/adhanAudio";
import { getActiveAudio, stopAudio } from "../lib/audioEngine";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class FakeAdhanAudio implements AdhanAudioElement {
  src = "";
  currentTime = 0;
  onloadedmetadata: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {}
  pause() {}
  removeAttribute() {}
  load() {}
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let el: FakeAdhanAudio;

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
  el = new FakeAdhanAudio();
  setAdhanAudioElementFactory(() => el);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <AdhanAudioSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  stopAudio();
});

const section = (which: "regular" | "fajr") => container.querySelector(`[data-adhan-section="${which}"]`)!;
const buttonIn = (scope: Element, text: string) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("Settings → صوت الأذان", () => {
  it("shows independent regular and Fajr sections with the right modes", () => {
    expect(container.textContent).toContain("الأذان العادي");
    expect(container.textContent).toContain("أذان الفجر");
    expect(buttonIn(section("regular"), "«الصلاة خير من النوم» فقط")).toBeUndefined();
    expect(buttonIn(section("fajr"), "«الصلاة خير من النوم» فقط")).toBeDefined();
    expect(buttonIn(section("regular"), "محمد عمران — الفجر")).toBeUndefined();
    expect(buttonIn(section("fajr"), "محمد رفعت")).toBeUndefined();
  });

  it("changing the Fajr choice never changes the regular choice", async () => {
    await click(buttonIn(section("regular"), "محمد رفعت"));
    await click(buttonIn(section("regular"), "التكبير فقط"));
    await click(buttonIn(section("fajr"), "محمد عمران — الفجر"));
    await click(buttonIn(section("fajr"), "«الصلاة خير من النوم» فقط"));
    expect(loadAdhanAudioSettings()).toEqual({
      regular: { recordingId: "refaat", mode: "takbeer" },
      fajr: { recordingId: "omran-fajr", mode: "fajrPhrase" },
    });
  });

  it("offers only the phrase mode for the phrase-only excerpt", async () => {
    await click(buttonIn(section("fajr"), "مقطع «الصلاة خير من النوم»"));
    expect(buttonIn(section("fajr"), "الأذان كاملًا")).toBeUndefined();
    expect(loadAdhanAudioSettings().fajr.mode).toBe("fajrPhrase");
  });

  it("stops a running preview when that section's choice changes, but not the other section's", async () => {
    await click(container.querySelector('[data-adhan-preview="regular"]')!);
    expect(getActiveAudio()?.key).toBe("adhan:alafasy-kuwait:full");
    await click(buttonIn(section("fajr"), "محمد عمران — الفجر"));
    expect(getActiveAudio()?.key).toBe("adhan:alafasy-kuwait:full");
    await click(buttonIn(section("regular"), "التكبير فقط"));
    expect(getActiveAudio()).toBeNull();
    expect(container.querySelector('[data-adhan-preview="regular"]')!.getAttribute("aria-pressed")).toBe("false");
  });

  it("previews exactly the selected segment and stops it on leaving the page", async () => {
    await click(buttonIn(section("fajr"), "محمد عمران — الفجر"));
    await click(buttonIn(section("fajr"), "«الصلاة خير من النوم» فقط"));
    await click(container.querySelector('[data-adhan-preview="fajr"]')!);
    expect(getActiveAudio()).toEqual({ channel: "adhan", key: "adhan:omran-fajr:fajrPhrase" });
    await act(async () => el.onloadedmetadata?.());
    expect(el.currentTime).toBe(134.49);
    act(() => root.unmount());
    expect(getActiveAudio()).toBeNull();
    root = createRoot(container);
  });
});
