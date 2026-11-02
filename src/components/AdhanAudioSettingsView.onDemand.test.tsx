// @vitest-environment jsdom
// Settings → Adhan audio: the same options as ever, with Listen and Download
// beneath each voice, in the Android app and in the web app.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { AdhanAudioSettingsView } from "./AdhanAudioSettingsView";
import { fajrAdhanRecordings, regularAdhanRecordings, resetAdhanAudioSettingsMemoryForTesting, saveRegularAdhanChoice } from "../lib/adhanAudioSettings";
import { resetAdhanRotationMemoryForTesting } from "../lib/adhanVoiceRotation";
import { setAdhanAudioElementFactory } from "../lib/adhanAudio";
import type { AdhanAudioElement } from "../lib/adhanAudio";
import { setAdhanDownloadsForTesting } from "../lib/adhanDownloads";
import manifest from "../data/adhanDownloads.json";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let element: AdhanAudioElement;

const native = () => ({
  list: vi.fn(async () => ({ files: [{ id: "minshawi", path: "/data/adhan/minshawi.mp3" }] })),
  download: vi.fn(async () => ({ path: "/data/adhan/husary.mp3" })),
  cancel: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
});
const mount = () => act(async () => root.render(<LanguageProvider><AdhanAudioSettingsView onBack={() => {}} /></LanguageProvider>));
const click = (el: Element | null) => act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const q = (s: string) => container.querySelector(s);

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
  resetAdhanRotationMemoryForTesting();
  element = { src: "", currentTime: 0, play: vi.fn(), pause: vi.fn(), removeAttribute: vi.fn(), load: vi.fn(), onloadedmetadata: null, ontimeupdate: null, onplaying: null, onpause: null, onended: null, onerror: null };
  setAdhanAudioElementFactory(() => element);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  setAdhanDownloadsForTesting(null);
});

describe("Adhan audio settings with on-demand recordings", () => {
  it("offers every voice, with its own controls, and every existing option", async () => {
    setAdhanDownloadsForTesting(native());
    await mount();
    for (const r of [...regularAdhanRecordings(), ...fajrAdhanRecordings()]) expect(q(`[data-adhan-voice-controls='${r.id}']`), r.id).not.toBeNull();
    expect(container.querySelectorAll("[data-adhan-section='regular'] [data-adhan-listen]").length).toBe(regularAdhanRecordings().length);
    expect(q("[data-adhan-preview='regular']")).not.toBeNull();
    expect(q("[data-adhan-autoplay='fajr']")).not.toBeNull();
    expect(q("[data-adhan-day-times]")).not.toBeNull();
  });

  it("shows each voice's state: built in, downloaded, or to download with its size", async () => {
    setAdhanDownloadsForTesting(native());
    await mount();
    expect(q(`[data-adhan-voice-controls='${manifest.bundled.regular}']`)!.getAttribute("data-adhan-download-state")).toBe("built-in");
    expect(q("[data-adhan-voice-controls='minshawi']")!.getAttribute("data-adhan-download-state")).toBe("downloaded");
    expect(q("[data-adhan-download='husary']")!.textContent).toContain((manifest.files.husary.bytes / 1e6).toFixed(1));
  });

  it("streams a voice from its Listen button, without downloading it or choosing it", async () => {
    const fake = native();
    setAdhanDownloadsForTesting(fake);
    await mount();
    await click(q("[data-adhan-listen='husary']"));
    expect(element.src).toContain("github.io");
    expect(fake.download).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("dithar:adhan-audio:settings:v1") ?? "{}").regular?.recordingId).toBeUndefined();
  });

  it("downloads only the voice tapped", async () => {
    const fake = native();
    setAdhanDownloadsForTesting(fake);
    await mount();
    await click(q("[data-adhan-download='husary']"));
    expect(fake.download.mock.calls.length).toBe(1);
    expect(q("[data-adhan-voice-controls='husary']")!.getAttribute("data-adhan-download-state")).toBe("downloaded");
  });

  it("lets a downloaded voice be removed, unless it is the chosen one", async () => {
    setAdhanDownloadsForTesting(native());
    saveRegularAdhanChoice({ recordingId: "minshawi" });
    await mount();
    expect(q("[data-adhan-remove='minshawi']")).toBeNull();
  });

  it("says who plays until a chosen voice is on the phone", async () => {
    const fake = native();
    fake.download = vi.fn(() => new Promise(() => {}));
    setAdhanDownloadsForTesting(fake);
    saveRegularAdhanChoice({ recordingId: "husary" });
    await mount();
    expect(q("[data-adhan-section='regular'] [data-adhan-chosen-pending]")).not.toBeNull();
  });

});

describe("Adhan audio settings in the web app", () => {
  const web = () => {
    const fake = native();
    setAdhanDownloadsForTesting(fake, true);
    return fake;
  };

  it("offers Listen and Download for all 37 recordings: none is built in", async () => {
    web();
    await mount();
    const ids = new Set([...regularAdhanRecordings(), ...fajrAdhanRecordings()].map((r) => r.id));
    expect(ids.size).toBe(37);
    for (const id of ids) {
      expect(q(`[data-adhan-listen='${id}']`), id).not.toBeNull();
      expect(q(`[data-adhan-voice-controls='${id}']`)!.getAttribute("data-adhan-download-state")).not.toBe("built-in");
    }
    expect(q(`[data-adhan-download='${manifest.bundled.regular}']`)).not.toBeNull();
    expect(q("[data-adhan-on-demand-note]")!.textContent).toContain("المتصفح");
  });

  it("downloads nothing without a tap, also for the chosen voice", async () => {
    const fake = web();
    saveRegularAdhanChoice({ recordingId: "husary" });
    await mount();
    expect(fake.download).not.toHaveBeenCalled();
    expect(q("[data-adhan-chosen-pending]")).toBeNull();
  });

  it("listens from the site itself, not the Android app's host, and from the saved file once downloaded", async () => {
    web();
    await mount();
    await click(q("[data-adhan-listen='husary']"));
    expect(element.src).not.toContain("github.io");
    expect(element.src).toContain("audio/adhan/");
    await click(q("[data-adhan-listen='husary']"));
    await click(q("[data-adhan-listen='minshawi']"));
    expect(element.src).toContain("/data/adhan/minshawi.mp3");
  });

  it("lets the chosen voice's download be removed: it doesn't come back by itself", async () => {
    web();
    saveRegularAdhanChoice({ recordingId: "minshawi" });
    await mount();
    expect(q("[data-adhan-remove='minshawi']")).not.toBeNull();
  });
});
