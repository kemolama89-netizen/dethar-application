// @vitest-environment jsdom
//
// The Tasbeeh screen's «أصوات التعرف على الذكر» / "Recognition Sounds"
// switch (lib/voiceTasbeehSounds.ts): it is saved across restarts, every
// native listening pass is told the current choice (VoiceRecognitionPlugin
// mutes the recognizer's own tones only when it is off), and Voice Tasbeeh
// recognizes and counts exactly the same in both states. Driven through
// the REAL TasbeehScreen and the native Android adapter, with only the
// Capacitor plugin itself replaced.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

type Listener = (data: Record<string, unknown>) => void;
const native = vi.hoisted(() => ({
  listeners: new Map<string, Set<(data: Record<string, unknown>) => void>>(),
  sessions: [] as { sessionId: string; language: string; recognitionSounds?: boolean }[],
}));

vi.mock("../lib/voiceRecognitionNative", () => ({
  isNativeVoiceRecognitionAvailable: () => true,
  VoiceRecognitionNative: {
    isAvailable: vi.fn().mockResolvedValue({ available: true }),
    startSession: vi.fn(async (options: { sessionId: string; language: string; recognitionSounds?: boolean }) => {
      native.sessions.push(options);
    }),
    stopSession: vi.fn().mockResolvedValue(undefined),
    abortSession: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn(async (event: string, fn: Listener) => {
      if (!native.listeners.has(event)) native.listeners.set(event, new Set());
      native.listeners.get(event)!.add(fn);
      return { remove: async () => void native.listeners.get(event)?.delete(fn) };
    }),
  },
}));

import { TasbeehScreen } from "./TasbeehScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { dhikrItems, tasbeehLabels } from "../data/tasbeeh";
import { loadTasbeehCounters } from "../lib/tasbeehCounters";
import { loadRecognitionSoundsEnabled } from "../lib/voiceTasbeehSounds";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = tasbeehLabels.ar;

function emit(event: string, data: Record<string, unknown>) {
  for (const fn of [...(native.listeners.get(event) ?? [])]) fn(data);
}

const flush = () => act(async () => {});

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <TasbeehScreen onNavigateHome={() => {}} onNavigateToWritten={() => {}} onNavigateToSettings={() => {}} onNavigateToAudio={() => {}} />
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
  return {
    container,
    switchEl: () => container.querySelector<HTMLButtonElement>("[data-recognition-sounds]")!,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

async function click(el: HTMLElement) {
  await act(async () => el.click());
}

/** The current native pass recognizes `text` (final), then ends — as Android does after each phrase. */
async function recognize(text: string) {
  const { sessionId } = native.sessions[native.sessions.length - 1];
  await act(async () => {
    emit("sessionStart", { sessionId });
    emit("result", { sessionId, text, isFinal: true });
    emit("sessionEnd", { sessionId });
  });
  await flush();
}

beforeEach(() => {
  localStorage.clear();
  native.listeners.clear();
  native.sessions.length = 0;
});

describe("Recognition Sounds (Voice Tasbeeh feedback tones only)", () => {
  it("is labelled, off by default as before, and its choice survives a restart", async () => {
    const screen = await mount();
    const sw = screen.switchEl();
    expect(sw.textContent).toContain("أصوات التعرف على الذكر");
    expect(sw.getAttribute("role")).toBe("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    await click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(loadRecognitionSoundsEnabled()).toBe(true);
    await screen.unmount();

    const again = await mount();
    expect(again.switchEl().getAttribute("aria-checked")).toBe("true");
    await again.unmount();
  });

  it("keeps the choice across a switch to English and back (one setting, not per language)", async () => {
    const ar = await mount();
    await click(ar.switchEl());
    expect(ar.switchEl().getAttribute("aria-checked")).toBe("true");
    await ar.unmount();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    const en = await mount();
    expect(en.switchEl().textContent).toContain("Recognition Sounds");
    expect(en.switchEl().getAttribute("aria-checked")).toBe("true");
    await click(en.switchEl());
    await en.unmount();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    const back = await mount();
    expect(back.switchEl().getAttribute("aria-checked")).toBe("false");
    await back.unmount();
  });

  it("tells each native listening pass the current choice, and counting works the same in both states", async () => {
    const screen = await mount();
    const target = dhikrItems[0];
    const voiceButton = [...screen.container.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === t.voiceTasbeehAria)!;
    await click(voiceButton);
    await flush();
    expect(native.sessions.length).toBe(1);
    // Off (the default): the plugin is asked to mute the recognizer's tones.
    expect(native.sessions[0].recognitionSounds).toBe(false);

    await recognize(target.dhikr_ar);
    expect(loadTasbeehCounters()[target.id]).toBe(1);

    // Switched on mid-session: the pass already listening finishes (and
    // counts) as it was; every pass from the next one is told "on".
    await click(screen.switchEl());
    await recognize(target.dhikr_ar);
    expect(loadTasbeehCounters()[target.id]).toBe(2);
    expect(native.sessions[native.sessions.length - 1].recognitionSounds).toBe(true);
    await recognize(target.dhikr_ar);
    expect(loadTasbeehCounters()[target.id]).toBe(3);

    // And off again.
    await click(screen.switchEl());
    await recognize(target.dhikr_ar);
    expect(loadTasbeehCounters()[target.id]).toBe(4);
    expect(native.sessions[native.sessions.length - 1].recognitionSounds).toBe(false);
    await screen.unmount();
  });
});
