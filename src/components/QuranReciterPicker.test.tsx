// @vitest-environment jsdom
// The reciter page (Settings → الأذكار الصوتية → الصباح/المساء → قارئ الآيات القرآنية): every reciter,
// a sample beneath each, and Download with its progress, Cancel, Retry and Remove — al-Husary built
// into the Android app; downloads saved in the browser in the web app.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { QuranReciterPicker } from "./QuranReciterPicker";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { getAvailableQuranReciters } from "../data/quranReciters";
import manifest from "../data/quranAudioDownloads.json";
import type { QuranAudioDownloadsPlugin } from "../lib/quranAudioDownloads";
import { setQuranAudioDownloadsForTesting } from "../lib/quranAudioDownloads";
import type { SectionReciterChoice } from "../lib/audioAdhkarScheduleSettings";
import { loadSectionReciterChoice } from "../lib/audioAdhkarScheduleSettings";
import type { AudioElementLike } from "../lib/audioEngine";
import { getActiveAudio, setAudioElementFactory, stopAudio } from "../lib/audioEngine";
import { audioAdhkarPlayback } from "../lib/audioAdhkarPlayback";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const MINSHAWI = "minshawi-murattal";
const minshawiFiles = Object.keys((manifest.reciters as Record<string, { files: Record<string, unknown> }>)[MINSHAWI].files);

function fake(onDisk: string[] = []) {
  const disk = new Set(onDisk);
  let gate: { resolve: () => void; reject: (e: Error) => void } | null = null;
  let failNext: string | null = null;
  const plugin: QuranAudioDownloadsPlugin = {
    list: vi.fn(async () => ({ files: [...disk].map((key) => ({ reciter: key.split("/")[0], file: key.split("/")[1], path: `/data/${key}` })) })),
    download: vi.fn(async ({ reciter, file }) => {
      if (failNext) {
        const code = failNext;
        failNext = null;
        throw new Error(code);
      }
      if (file === "112001.mp3") await new Promise<void>((resolve, reject) => (gate = { resolve, reject }));
      disk.add(`${reciter}/${file}`);
      return { path: `/data/${reciter}/${file}` };
    }),
    cancel: vi.fn(async () => {
      gate?.reject(new Error("cancelled"));
      gate = null;
    }),
    remove: vi.fn(async ({ reciter }) => {
      for (const k of [...disk]) if (k.startsWith(`${reciter}/`)) disk.delete(k);
    }),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  };
  return { plugin, release: () => gate?.resolve(), failNext: (c: string) => (failNext = c), held: () => gate !== null };
}

const played: string[] = [];
class FakeAudio implements AudioElementLike {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    played.push(this.src);
  }
  pause() {}
  removeAttribute() {}
  load() {}
}

const settle = (ms = 5) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 300 && !ok(); i++) await settle();
  expect(ok()).toBe(true);
};
const q = (s: string) => container.querySelector(s);
const click = (el: Element | null) => act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
/** The page with its own choice, as the section's screen holds it. */
function Page({ initial }: { initial: SectionReciterChoice }) {
  const [choice, setChoice] = useState<SectionReciterChoice>(initial);
  return <QuranReciterPicker title="قارئ الآيات القرآنية" choice={choice} onChoose={setChoice} onBack={() => {}} />;
}
const mount = async (initial: SectionReciterChoice = "husary-murattal") => {
  await act(async () => root.render(<LanguageProvider><Page initial={initial} /></LanguageProvider>));
  await settle(20);
};
const state = (id: string) => q(`[data-quran-reciter-controls='${id}']`)!.getAttribute("data-quran-download-state");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
  played.length = 0;
  const audio = new FakeAudio();
  setAudioElementFactory(() => audio);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  stopAudio();
  audioAdhkarPlayback.stop();
  setQuranAudioDownloadsForTesting(null);
});

describe("the reciter page in the Android app", () => {
  it("lists random rotation and every reciter, each with Listen; al-Husary built in, the others to download with their size", async () => {
    setQuranAudioDownloadsForTesting(fake().plugin);
    await mount();
    expect([...container.querySelectorAll("[data-quran-reciter-option]")].map((o) => o.getAttribute("data-quran-reciter-option"))).toEqual(["random", ...getAvailableQuranReciters().map((r) => r.id)]);
    for (const r of getAvailableQuranReciters()) expect(q(`[data-quran-listen='${r.id}']`), r.id).not.toBeNull();
    expect(state("husary-murattal")).toBe("built-in");
    expect(q("[data-quran-download='husary-murattal']")).toBeNull();
    expect(q(`[data-quran-download='${MINSHAWI}']`)!.textContent).toBe("تنزيل · 2.2 م.ب");
    expect(q("[data-quran-on-demand-note]")!.textContent).toContain("محمود خليل الحصري مضمَّن في التطبيق");
  });

  it("plays a short sample online without downloading, and says it streams while it plays", async () => {
    const f = fake();
    setQuranAudioDownloadsForTesting(f.plugin);
    await mount();
    await click(q(`[data-quran-listen='${MINSHAWI}']`));
    expect(getActiveAudio()).toEqual({ channel: "preview", key: `quran-sample:${MINSHAWI}` });
    expect(played[0]).toBe(`https://kemolama89-netizen.github.io/dethar-application/audio/quran/${MINSHAWI}/basmala.mp3`);
    expect(q(`[data-quran-listen='${MINSHAWI}']`)!.textContent).toBe("إيقاف");
    expect(q("[data-quran-sample-online]")).not.toBeNull();
    expect(f.plugin.download).not.toHaveBeenCalled();
    await click(q(`[data-quran-listen='${MINSHAWI}']`));
    expect(getActiveAudio()).toBeNull();
  });

  it("downloads with progress and Cancel; a cancelled download continues, and the reciter can then be chosen", async () => {
    const f = fake();
    setQuranAudioDownloadsForTesting(f.plugin);
    await mount();
    await click(q(`[data-quran-download='${MINSHAWI}']`));
    await until(() => f.held());
    expect(state(MINSHAWI)).toBe("downloading");
    expect(q(`[data-quran-progress='${MINSHAWI}']`)!.textContent).toMatch(/^جارٍ التنزيل \d+٪ · [\d.]+ من 2\.2 م\.ب$/);
    await click(q(`[data-quran-cancel='${MINSHAWI}']`));
    await until(() => state(MINSHAWI) === "partial");
    await click(q(`[data-quran-resume='${MINSHAWI}']`));
    await until(() => f.held());
    f.release();
    await until(() => state(MINSHAWI) === "downloaded");
    expect(q(`[data-quran-downloaded='${MINSHAWI}']`)!.textContent).toBe("على الجهاز");
    await click(q(`[data-quran-reciter-option='${MINSHAWI}'] > button`));
    expect(q(`[data-quran-reciter-option='${MINSHAWI}'] > button`)!.getAttribute("aria-pressed")).toBe("true");
    expect(q("[data-quran-chosen-pending]")).toBeNull();
  });

  it("explains a failure and offers to try again", async () => {
    const f = fake();
    setQuranAudioDownloadsForTesting(f.plugin);
    await mount();
    f.failNext("offline");
    await click(q(`[data-quran-download='${MINSHAWI}']`));
    await until(() => state(MINSHAWI) === "failed");
    expect(q("[data-quran-failure='offline']")!.textContent).toContain("انقطاع الاتصال");
    expect(q(`[data-quran-retry='${MINSHAWI}']`)).not.toBeNull();
  });

  it("names who plays meanwhile under a chosen reciter who isn't downloaded", async () => {
    setQuranAudioDownloadsForTesting(fake().plugin);
    await mount(MINSHAWI);
    expect(q("[data-quran-chosen-pending]")!.textContent).toBe("تُتلى الآيات بصوت محمود خليل الحصري حتى يكتمل تنزيل محمد صديق المنشاوي.");
  });

  it("removes a downloaded reciter — but not while Audio Adhkar is playing", async () => {
    const f = fake(minshawiFiles.map((file) => `${MINSHAWI}/${file}`));
    setQuranAudioDownloadsForTesting(f.plugin);
    await mount();
    expect(state(MINSHAWI)).toBe("downloaded");
    act(() => audioAdhkarPlayback.startDhikr({ collection: "evening", itemId: "morning_001" }, 1));
    expect((q(`[data-quran-remove='${MINSHAWI}']`) as HTMLButtonElement).disabled).toBe(true);
    expect(q("[data-quran-remove-blocked]")).not.toBeNull();
    act(() => audioAdhkarPlayback.stop());
    await click(q(`[data-quran-remove='${MINSHAWI}']`));
    await until(() => state(MINSHAWI) === "none");
    expect(f.plugin.remove).toHaveBeenCalledWith({ reciter: MINSHAWI });
  });
});

describe("the reciter page in the web app", () => {
  it("offers Download for every reciter (saved in this browser), al-Husary too", async () => {
    setQuranAudioDownloadsForTesting(fake().plugin, true);
    await mount();
    for (const r of getAvailableQuranReciters()) expect(q(`[data-quran-download='${r.id}']`), r.id).not.toBeNull();
    expect(q("[data-quran-on-demand-note]")!.textContent).toContain("يُحفظ في هذا المتصفح");
    expect(q("[data-quran-chosen-pending]")).toBeNull();
  });
});

describe("reached from the section's screen", () => {
  it("Evening's reciter row names the reciter and opens the page; a choice there is the section's", async () => {
    setQuranAudioDownloadsForTesting(fake().plugin, true);
    await act(async () => root.render(<LanguageProvider><AudioAdhkarSettingsView onBack={() => {}} /></LanguageProvider>));
    await click(q("[data-audio-schedule-row='evening']"));
    expect(q("[data-section-reciter='evening'] [data-section-reciter-value]")!.textContent).toBe("محمود خليل الحصري");
    await click(q("[data-section-reciter='evening']"));
    await settle(20);
    expect(q("[data-quran-reciter-picker]")).not.toBeNull();
    await click(q(`[data-quran-reciter-option='${MINSHAWI}'] > button`));
    expect(loadSectionReciterChoice("evening")).toBe(MINSHAWI);
    await click(q("[data-quran-reciter-picker] .dithar-sticky-header button"));
    expect(q("[data-quran-reciter-picker]")).toBeNull();
    expect(q("[data-section-reciter='evening'] [data-section-reciter-value]")!.textContent).toBe("محمد صديق المنشاوي");
  });
});
