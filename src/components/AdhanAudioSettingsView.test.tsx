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
import { loadAdhanRotationSettings, resetAdhanRotationMemoryForTesting, setAdhanVoiceIncluded } from "../lib/adhanVoiceRotation";
import { fajrAdhanRecordings, loadAdhanAutoPlay, regularAdhanRecordings, resetAdhanAudioSettingsMemoryForTesting as resetSettingsMemory } from "../lib/adhanAudioSettings";

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
  resetAdhanRotationMemoryForTesting();
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
// Exact label match — some voice names contain others (e.g. «مشاري العفاسي»).
const voiceRow = (which: "regular" | "fajr", name: string) =>
  [...section(which).querySelectorAll("[data-adhan-voices] button")].find((b) => b.textContent === name) as HTMLButtonElement;
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

  it("turns rotation on for one section only, switching its voice list to include/exclude rows", async () => {
    const voices = (which: "regular" | "fajr") => section(which).querySelector("[data-adhan-voices]")!;
    expect(voices("regular").getAttribute("data-adhan-voices")).toBe("single");
    await click(buttonIn(section("regular"), "تنويع المؤذنين"));
    expect(voices("regular").getAttribute("data-adhan-voices")).toBe("rotation");
    expect(voices("fajr").getAttribute("data-adhan-voices")).toBe("single");
    const next = section("regular").textContent!.match(/الأذان القادم: (.+?)استماع/)?.[1];
    expect(regularAdhanRecordings().map((r) => r.name.ar)).toContain(next);
    // Every regular voice starts included.
    const rows = [...voices("regular").querySelectorAll("button")];
    expect(rows).toHaveLength(regularAdhanRecordings().length);
    expect(rows.every((b) => b.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(loadAdhanRotationSettings()).toEqual({ regular: { enabled: true, excluded: [] }, fajr: { enabled: false, excluded: [] } });
  });

  it("excludes and re-includes voices, and never lets the last one go", async () => {
    await click(buttonIn(section("regular"), "تنويع المؤذنين"));
    await click(voiceRow("regular", "محمد رفعت"));
    expect(loadAdhanRotationSettings().regular.excluded).toEqual(["refaat"]);
    expect(voiceRow("regular", "محمد رفعت").getAttribute("aria-pressed")).toBe("false");
    await click(voiceRow("regular", "محمد رفعت"));
    expect(loadAdhanRotationSettings().regular.excluded).toEqual([]);

    for (const r of regularAdhanRecordings()) if (r.id !== "husary") await click(voiceRow("regular", r.name.ar));
    expect(section("regular").textContent).toContain("الأذان القادم: محمود خليل الحصري");
    await click(voiceRow("regular", "محمود خليل الحصري"));
    expect(voiceRow("regular", "محمود خليل الحصري").getAttribute("aria-pressed")).toBe("true");
    expect(section("regular").querySelector('[role="status"]')!.textContent).toBe("يجب إبقاء صوت واحد على الأقل.");
  });

  it("previews the voice the next adhan will use while rotating", async () => {
    await click(buttonIn(section("regular"), "تنويع المؤذنين"));
    await click(voiceRow("regular", "مشاري العفاسي — الكويت"));
    const next = section("regular").textContent!.match(/الأذان القادم: ([^]+?)(?:استماع|إيقاف)/)?.[1];
    expect(next).toBeDefined();
    await click(container.querySelector('[data-adhan-preview="regular"]')!);
    const id = regularAdhanRecordings().find((r) => r.name.ar === next!.trim())!.id;
    expect(getActiveAudio()?.key).toBe(`adhan:${id}:full`);
  });

  describe("rotating preview", () => {
    const recordingsFor = (which: "regular" | "fajr") => (which === "regular" ? regularAdhanRecordings() : fajrAdhanRecordings());
    /** The rotation line: ["next" | "now", voice id]. */
    const line = (which: "regular" | "fajr") => {
      const m = section(which).textContent!.match(/(الأذان القادم|يُشغَّل الآن): (.+?)(?:استماع|إيقاف)/)!;
      return [m[1] === "الأذان القادم" ? "next" : "now", recordingsFor(which).find((r) => r.name.ar === m[2])!.id] as const;
    };
    const preview = (which: "regular" | "fajr") => click(container.querySelector(`[data-adhan-preview="${which}"]`)!);
    const finishPlayback = () => act(async () => el.onended?.());
    const refresh = () => {
      act(() => root.unmount());
      resetSettingsMemory();
      resetAdhanRotationMemoryForTesting();
      root = createRoot(container);
      act(() =>
        root.render(
          <LanguageProvider>
            <AdhanAudioSettingsView onBack={() => {}} />
          </LanguageProvider>,
        ),
      );
    };

    it("plays a new random voice on every preview, and shows the next one once playback ends", async () => {
      await click(buttonIn(section("regular"), "تنويع المؤذنين"));
      const played: string[] = [];
      for (let i = 0; i < 25; i++) {
        const [, shown] = line("regular");
        await preview("regular");
        expect(getActiveAudio()?.key).toBe(`adhan:${shown}:full`);
        expect(line("regular")).toEqual(["now", shown]);
        await finishPlayback();
        expect(getActiveAudio()).toBeNull();
        const [state, next] = line("regular");
        expect(state).toBe("next");
        expect(next).not.toBe(shown);
        played.push(shown);
      }
      for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
      expect(new Set(played).size).toBeGreaterThan(2);
    });

    it("stopping a preview early still moves on to a new voice", async () => {
      await click(buttonIn(section("regular"), "تنويع المؤذنين"));
      const [, first] = line("regular");
      await preview("regular");
      await preview("regular"); // Stop
      expect(getActiveAudio()).toBeNull();
      const [state, next] = line("regular");
      expect(state).toBe("next");
      expect(next).not.toBe(first);
      await preview("regular");
      expect(getActiveAudio()?.key).toBe(`adhan:${next}:full`);
    });

    it("a refresh restores the settings and the upcoming voice without locking the rotation", async () => {
      await click(buttonIn(section("regular"), "تنويع المؤذنين"));
      await preview("regular");
      await finishPlayback();
      const [, upcoming] = line("regular");
      refresh();
      expect(section("regular").querySelector("[data-adhan-voices]")!.getAttribute("data-adhan-voices")).toBe("rotation");
      expect(line("regular")).toEqual(["next", upcoming]);
      await preview("regular");
      expect(getActiveAudio()?.key).toBe(`adhan:${upcoming}:full`);
      await finishPlayback();
      refresh();
      expect(line("regular")[1]).not.toBe(upcoming);
    });

    it("keeps Regular and Fajr rotations independent and never previews an excluded voice", async () => {
      await click(buttonIn(section("regular"), "تنويع المؤذنين"));
      await click(buttonIn(section("fajr"), "تنويع المؤذنين"));
      act(() => {
        setAdhanVoiceIncluded("regular", "refaat", false);
      });
      refresh();
      const [, fajrNext] = line("fajr");
      for (let i = 0; i < 20; i++) {
        await preview("regular");
        expect(getActiveAudio()?.key).not.toBe("adhan:refaat:full");
        await finishPlayback();
      }
      expect(line("fajr")).toEqual(["next", fajrNext]);
      await preview("fajr");
      expect(getActiveAudio()?.key).toBe(`adhan:${fajrNext}:full`);
    });
  });

  it("has a 'play the adhan at prayer time' switch per section, off by default and independent", async () => {
    const autoRow = (which: "regular" | "fajr") => section(which).querySelector("[data-adhan-autoplay] button") as HTMLButtonElement;
    expect(autoRow("regular").textContent).toContain("تشغيل الأذان عند دخول الوقت");
    expect(autoRow("regular").getAttribute("aria-pressed")).toBe("false");
    await click(autoRow("regular"));
    expect(loadAdhanAutoPlay()).toEqual({ regular: true, fajr: false });
    expect(autoRow("regular").getAttribute("aria-pressed")).toBe("true");
    expect(section("regular").textContent).toContain("بمستوى صوت الوسائط");
    await click(autoRow("fajr"));
    await click(autoRow("regular"));
    expect(loadAdhanAutoPlay()).toEqual({ regular: false, fajr: true });
  });
});

