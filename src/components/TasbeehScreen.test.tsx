// @vitest-environment jsdom
//
// Regression suite for the "Reset All" button added next to the existing
// per-Dhikr Reset button. Mounts the REAL TasbeehScreen component (plain
// react-dom/client + act, no testing-library — this project has none
// installed and these tests don't need one) under the same provider
// nesting App.tsx itself uses, so useLanguage()/useTheme()/usePalette()
// all resolve normally.
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TasbeehScreen } from "./TasbeehScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { dhikrItems, tasbeehLabels } from "../data/tasbeeh";
import { loadTasbeehCounters, saveTasbeehCounters } from "../lib/tasbeehCounters";
import { getTasbeehStats, clearAllStats } from "../lib/stats";

// Silences React's benign "not configured for act()" warning — this
// file's environment IS the test itself, driven entirely through act().
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = tasbeehLabels.ar; // LanguageProvider's own initial language

async function mountTasbeehScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>
            <TasbeehScreen onNavigateHome={() => {}} onNavigateToWritten={() => {}} onNavigateToSettings={() => {}} />
          </PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text));
  if (!button) throw new Error(`No button found with text "${text}"`);
  return button as HTMLButtonElement;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

// Selects a specific Dhikr by its own Arabic text (each dhikrItems entry's
// button in the horizontal selector renders `item.dhikr_ar` verbatim).
async function selectDhikr(container: HTMLElement, dhikrAr: string) {
  await click(findButtonByText(container, dhikrAr));
}

function displayedCount(container: HTMLElement): string | null {
  // The big circular tap target's own count span — the only element in
  // the selector-count area with digit-only text content at any given
  // time (bubbles/confetti render separately and are never plain digits).
  const candidates = Array.from(container.querySelectorAll("span")).filter((s) => /^\d+$/.test(s.textContent ?? ""));
  return candidates.length > 0 ? candidates[candidates.length - 1].textContent : null;
}

beforeEach(() => {
  localStorage.clear();
  // stats.ts keeps a module-level in-memory cache that localStorage.clear()
  // alone doesn't reset — see stats.test.ts's own note on this.
  clearAllStats();
});

describe("TasbeehScreen — Reset All", () => {
  it("renders next to the existing per-Dhikr Reset button", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    // Both exist, and the individual Reset button is not the same element
    // as Reset All (distinct labels, per requirement 10 — consistent
    // styling, not merged into one control).
    const resetButton = findButtonByText(container, t.reset);
    const resetAllButton = findButtonByText(container, t.resetAll);
    expect(resetButton).not.toBe(resetAllButton);
    // Adjacent: siblings within the same immediate parent.
    expect(resetButton.parentElement).toBe(resetAllButton.parentElement);
    await unmount();
  });

  it("canceling the confirmation dialog resets nothing", async () => {
    const seeded = { [dhikrItems[0].id]: 7, [dhikrItems[1].id]: 3 };
    saveTasbeehCounters(seeded);
    const { container, unmount } = await mountTasbeehScreen();

    expect(displayedCount(container)).toBe("7"); // dhikrItems[0] is selected by default

    await click(findButtonByText(container, t.resetAll));
    // Dialog is open; nothing has changed yet.
    expect(displayedCount(container)).toBe("7");

    await click(findButtonByText(container, t.resetAllConfirmCancel));

    // Nothing changed: neither the live UI nor the persisted store.
    expect(displayedCount(container)).toBe("7");
    expect(loadTasbeehCounters()).toEqual(seeded);
    await selectDhikr(container, dhikrItems[1].dhikr_ar);
    expect(displayedCount(container)).toBe("3");

    await unmount();
  });

  it("confirming resets the currently selected Dhikr's counter to 0", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 12 });
    const { container, unmount } = await mountTasbeehScreen();

    expect(displayedCount(container)).toBe("12");
    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    expect(displayedCount(container)).toBe("0");
    expect(loadTasbeehCounters()[dhikrItems[0].id] ?? 0).toBe(0);
    await unmount();
  });

  it("reset-all zeroes EVERY Dhikr's counter, even ones with different nonzero counts, not just the selected one", async () => {
    const seeded = {
      [dhikrItems[0].id]: 20,
      [dhikrItems[1].id]: 5,
      [dhikrItems[2].id]: 45,
    };
    saveTasbeehCounters(seeded);
    const { container, unmount } = await mountTasbeehScreen();

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    const persisted = loadTasbeehCounters();
    for (const item of dhikrItems) {
      expect(persisted[item.id] ?? 0).toBe(0);
    }

    // Confirm the LIVE UI reflects it too for each of the seeded Dhikr,
    // not merely the persisted store.
    for (const id of Object.keys(seeded)) {
      const item = dhikrItems.find((d) => d.id === Number(id))!;
      await selectDhikr(container, item.dhikr_ar);
      expect(displayedCount(container)).toBe("0");
    }

    await unmount();
  });

  it("does not disable or otherwise modify Voice Tasbeeh's own enabled toggle", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 9 });
    const { container, unmount } = await mountTasbeehScreen();

    const voiceButton = findButtonByText(container, t.voiceTasbeeh);
    expect(voiceButton.getAttribute("aria-pressed")).toBe("false");
    await click(voiceButton);
    expect(voiceButton.getAttribute("aria-pressed")).toBe("true");

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    // Voice Tasbeeh's own enabled/disabled state is untouched by Reset All.
    expect(voiceButton.getAttribute("aria-pressed")).toBe("true");
    expect(displayedCount(container)).toBe("0");
    await unmount();
  });

  it("does not touch an unrelated per-Dhikr preference (the target-count input)", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 4 });
    const { container, unmount } = await mountTasbeehScreen();

    const targetInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    // React overrides the native `value` setter to track changes, so a
    // plain `targetInput.value = "33"` is invisible to it — the standard
    // workaround is invoking the native setter directly before dispatching
    // the `input` event React's onChange actually listens for.
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      nativeValueSetter.call(targetInput, "33");
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(targetInput.value).toBe("33");

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    // The target preference (not "progress/counts") is untouched.
    expect(targetInput.value).toBe("33");
    expect(displayedCount(container)).toBe("0");
    await unmount();
  });
});

// Minimal fake SpeechRecognition — just enough to drive one target-switch
// completion-crediting scenario end-to-end through the REAL useVoiceTasbeeh
// hook and the REAL TasbeehScreen consumer. Deliberately not shared with
// useVoiceTasbeeh.live.test.ts's own (more elaborate) fixture — a much
// smaller, purpose-built one for this file's own narrower need.
interface FakeVoiceResult extends Array<{ transcript: string }> {
  isFinal: boolean;
}
class FakeVoiceRecognition extends EventTarget {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  started = false;
  private queuedFinalResult: string | null = null;

  start() {
    this.started = true;
    FakeVoiceRecognition.instances.push(this);
  }

  // Arms a final result this instance delivers as part of its OWN stop() —
  // before onend — mirroring the real stop()-based target-switch fix this
  // scenario exercises (a trailing, fully valid completion for the OLD
  // target, delivered right as the switch to a new one begins).
  queueFinalResultOnStop(text: string) {
    this.queuedFinalResult = text;
  }

  stop() {
    if (this.queuedFinalResult !== null) {
      const text = this.queuedFinalResult;
      this.queuedFinalResult = null;
      const results: FakeVoiceResult[] = [Object.assign([{ transcript: text }], { isFinal: true })];
      this.onresult?.({ resultIndex: 0, results });
    }
    this.finish();
  }

  abort() {
    this.finish();
  }

  private finish() {
    if (!this.started) return;
    this.started = false;
    this.onend?.(new Event("end"));
  }

  fireStart() {
    this.onstart?.(new Event("start"));
  }

  static instances: FakeVoiceRecognition[] = [];
  static reset() {
    FakeVoiceRecognition.instances = [];
  }
}

describe("TasbeehScreen — Voice Tasbeeh completion crediting (target-switch trailing completion)", () => {
  beforeEach(() => {
    FakeVoiceRecognition.reset();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeVoiceRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("E. a trailing completion delivered while switching dhikr is credited to the OLD dhikr's persisted count, leaves the NEW dhikr's count untouched, and preserves every other dhikr's existing saved count", async () => {
    const oldItem = dhikrItems[0];
    const newItem = dhikrItems[1];
    const untouchedItem = dhikrItems[2];
    saveTasbeehCounters({ [oldItem.id]: 3, [untouchedItem.id]: 7 });

    const { container, unmount } = await mountTasbeehScreen();
    // oldItem is selected by default (dhikrItems[0]).
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });
    // A fully valid trailing completion of the OLD (currently selected)
    // dhikr, armed to be delivered by ITS OWN stop() — i.e. exactly when
    // the upcoming switch tears it down.
    FakeVoiceRecognition.instances[0].queueFinalResultOnStop(oldItem.dhikr_ar);

    // Switch to a different dhikr BEFORE the trailing completion above has
    // been delivered — this is what triggers instance[0].stop().
    await selectDhikr(container, newItem.dhikr_ar);

    const counters = loadTasbeehCounters();
    expect(counters[oldItem.id]).toBe(4); // 3 + the trailing completion
    expect(counters[newItem.id] ?? 0).toBe(0); // must NOT have inherited the +1
    expect(counters[untouchedItem.id]).toBe(7); // unrelated saved count, untouched

    // The screen is now showing the NEW dhikr — its displayed count must
    // be 0, not a premature 1 from the old dhikr's trailing completion.
    expect(displayedCount(container)).toBe("0");

    await unmount();
  });
});

// Regression coverage for the stats-persistence latency optimization
// (recordTasbeehRepetitions batching a burst's writes into one — see
// applyVoiceRepetitions in TasbeehScreen.tsx and recordTasbeehRepetitions's
// own doc comment in stats.ts). None of these change the matching engine —
// they exercise the REAL useVoiceTasbeeh hook + REAL matcher through
// TasbeehScreen, same as the crediting suite above, and assert both the
// displayed/persisted COUNT and the persisted STATS LOG stay correct.
const ALL_TIME = { kind: "all" } as const;

function fireFinalResult(instance: FakeVoiceRecognition, resultIndex: number, text: string) {
  const results = [Object.assign([{ transcript: text }], { isFinal: true })];
  instance.onresult?.({ resultIndex, results });
}

describe("TasbeehScreen — Voice Tasbeeh latency optimization (stats write batching)", () => {
  beforeEach(() => {
    FakeVoiceRecognition.reset();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeVoiceRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("rapid genuine repetitions delivered in a single recognition result all count, and are all recorded to stats", async () => {
    const item = dhikrItems[0]; // "سُبْحَانَ اللَّهِ" — a plain 2-token dhikr
    const { container, unmount } = await mountTasbeehScreen();
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });

    // One final result whose transcript is the dhikr recited three times in
    // a row, unbroken — the shape a fast reciter's single continuous
    // native segment takes. The matcher must find all three completions
    // (see voiceTasbeehMatch.ts's replay()), and applyVoiceRepetitions must
    // credit and record all three, not just one.
    const burstText = `${item.dhikr_ar} ${item.dhikr_ar} ${item.dhikr_ar}`;
    await act(async () => {
      fireFinalResult(FakeVoiceRecognition.instances[0], 0, burstText);
    });

    expect(displayedCount(container)).toBe("3");
    expect(loadTasbeehCounters()[item.id]).toBe(3);
    const stats = getTasbeehStats(ALL_TIME);
    expect(stats.total).toBe(3);
    expect(stats.perDhikr).toEqual([{ dhikrId: String(item.id), total: 3 }]);

    await unmount();
  });

  it("a replayed/resent final result for the same recognition segment never double-counts (exactly-once) or double-records to stats", async () => {
    const item = dhikrItems[0];
    const { container, unmount } = await mountTasbeehScreen();
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });

    await act(async () => {
      fireFinalResult(FakeVoiceRecognition.instances[0], 0, item.dhikr_ar);
    });
    expect(displayedCount(container)).toBe("1");

    // The exact same segmentId (0) resending the exact same already-final
    // content — a real, observed SpeechRecognition replay pattern (see
    // voiceTasbeehMatch.ts's class-level comment). Must be a pure no-op.
    await act(async () => {
      fireFinalResult(FakeVoiceRecognition.instances[0], 0, item.dhikr_ar);
    });

    expect(displayedCount(container)).toBe("1");
    expect(loadTasbeehCounters()[item.id]).toBe(1);
    const stats = getTasbeehStats(ALL_TIME);
    expect(stats.total).toBe(1);

    await unmount();
  });

  it("target switching still records stats to the dhikr the matcher actually credited, never the newly-selected one", async () => {
    const oldItem = dhikrItems[0];
    const newItem = dhikrItems[1];
    const { container, unmount } = await mountTasbeehScreen();
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });
    FakeVoiceRecognition.instances[0].queueFinalResultOnStop(oldItem.dhikr_ar);

    await selectDhikr(container, newItem.dhikr_ar);

    const stats = getTasbeehStats(ALL_TIME);
    expect(stats.total).toBe(1);
    expect(stats.perDhikr).toEqual([{ dhikrId: String(oldItem.id), total: 1 }]);

    await unmount();
  });
});
