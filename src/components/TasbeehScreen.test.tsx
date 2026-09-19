// @vitest-environment jsdom
//
// Regression suite for the "Reset All" button added next to the existing
// per-Dhikr Reset button. Mounts the REAL TasbeehScreen component (plain
// react-dom/client + act, no testing-library — this project has none
// installed and these tests don't need one) under the same provider
// nesting App.tsx itself uses, so useLanguage()/useTheme()/usePalette()
// all resolve normally.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TasbeehScreen } from "./TasbeehScreen";
import { LanguageProvider } from "../theme/LanguageContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { PaletteProvider } from "../theme/PaletteContext";
import { dhikrItems, tasbeehLabels } from "../data/tasbeeh";
import { loadTasbeehCounters, saveTasbeehCounters } from "../lib/tasbeehCounters";
import { getTasbeehStats, clearAllStats } from "../lib/stats";
import { dismissTopBackOverlay, backOverlayCount } from "../lib/backOverlays";

// Floating Tasbeeh <-> Statistics live sync coverage (see
// tasbeehCommit.ts's syncLiveCountToNative and this file's own
// handleReset/handleResetAll). isFloatingTasbeehAvailable is forced true
// here — real (unmocked) it's false in this jsdom environment, which is
// already what every OTHER test in this file implicitly relies on to keep
// these native calls as inert no-ops; only the dedicated describe block
// below actually asserts on them.
vi.mock("../lib/floatingTasbeehBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/floatingTasbeehBridge")>();
  return {
    ...actual,
    isFloatingTasbeehAvailable: vi.fn(() => true),
    FloatingTasbeeh: {
      ...actual.FloatingTasbeeh,
      syncLiveCount: vi.fn().mockResolvedValue(undefined),
      resetAllLiveCounts: vi.fn().mockResolvedValue(undefined),
      // Mocked (not left as the real proxy) so tests can assert Reset
      // never touches the persisted Floating Tasbeeh enabled state — see
      // "TasbeehScreen — Floating Tasbeeh live sync"'s own dedicated tests.
      setEnabled: vi.fn().mockResolvedValue(undefined),
      // Selected-dhikr sync (see floatingTasbeehSync.ts) — defaults to the
      // first dhikr, i.e. "the bubble is on the same dhikr the screen
      // starts on", so every test that doesn't care stays unaffected.
      getSelectedDhikr: vi.fn().mockResolvedValue({ dhikrId: 1 }),
      setSelectedDhikr: vi.fn().mockResolvedValue(undefined),
      addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    },
  };
});
import { FloatingTasbeeh } from "../lib/floatingTasbeehBridge";

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
  vi.mocked(FloatingTasbeeh.syncLiveCount).mockClear();
  vi.mocked(FloatingTasbeeh.resetAllLiveCounts).mockClear();
  vi.mocked(FloatingTasbeeh.setEnabled).mockClear();
  vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockClear().mockResolvedValue({ dhikrId: dhikrItems[0].id });
  vi.mocked(FloatingTasbeeh.setSelectedDhikr).mockClear();
  vi.mocked(FloatingTasbeeh.addListener).mockClear();
});

// Regression coverage for the shared counting-core refactor (handleTap now
// calls commitManualTasbeehRepetition instead of two separate inline
// calls) — no prior test in this file actually clicked the main circle, so
// this is the concrete proof manual tapping still works exactly as before:
// immediate UI increment, persisted counter, and exactly one Statistics
// event tagged source "tasbeeh".
describe("TasbeehScreen — manual tap (shared counting-core refactor)", () => {
  it("a single tap on the main circle increments the displayed count, persists the counter, and records exactly one Statistics event", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    expect(displayedCount(container)).toBe("0");

    const tapButton = container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement;
    await click(tapButton);

    expect(displayedCount(container)).toBe("1");
    expect(loadTasbeehCounters()[dhikrItems[0].id]).toBe(1);
    const stats = getTasbeehStats({ kind: "all" });
    expect(stats.total).toBe(1);
    expect(stats.perDhikr).toEqual([{ dhikrId: String(dhikrItems[0].id), total: 1 }]);

    await unmount();
  });
});

describe("TasbeehScreen — Floating Tasbeeh live sync", () => {
  it("a manual tap pushes the SAME updated count to native via syncLiveCount", async () => {
    const { container, unmount } = await mountTasbeehScreen();

    const tapButton = container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement;
    await click(tapButton);

    expect(FloatingTasbeeh.syncLiveCount).toHaveBeenCalledWith({ dhikrId: dhikrItems[0].id, count: 1 });
    await unmount();
  });

  it("resetting one Dhikr immediately zeroes its native live count", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 7 });
    const { container, unmount } = await mountTasbeehScreen();

    await click(findButtonByText(container, t.reset));

    expect(FloatingTasbeeh.syncLiveCount).toHaveBeenCalledWith({ dhikrId: dhikrItems[0].id, count: 0 });
    await unmount();
  });

  it("Reset All calls resetAllLiveCounts once, zeroing every dhikr's native live count at once", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 4, [dhikrItems[1].id]: 9 });
    const { container, unmount } = await mountTasbeehScreen();

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    expect(FloatingTasbeeh.resetAllLiveCounts).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("a Floating Tasbeeh tap reconciled while this screen is already mounted updates the displayed count immediately — no remount, no polling", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    expect(displayedCount(container)).toBe("0");

    // Simulates exactly what reconcileFloatingTasbeeh does the instant
    // native's "pendingEventsChanged" event fires: it calls
    // saveTasbeehCounters with the freshly-committed counters — the SAME
    // single choke point every handler in this file already writes
    // through (see tasbeehCounters.ts's subscribeTasbeehCounters).
    await act(async () => {
      saveTasbeehCounters({ [dhikrItems[0].id]: 10 });
    });

    expect(displayedCount(container)).toBe("10");
    await unmount();
  });

  it("unsubscribes on unmount — a later external counters write never touches an unmounted screen", async () => {
    const { unmount } = await mountTasbeehScreen();
    await unmount();

    // Only asserting this doesn't throw / isn't silently expected to
    // update anything — there's nothing left mounted to observe.
    expect(() => saveTasbeehCounters({ [dhikrItems[0].id]: 3 })).not.toThrow();
  });

  it("Reset One never touches historical Statistics or the persisted Floating Tasbeeh enabled state", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 37 });
    // Seed real Statistics history the same way a genuine prior session
    // would have — via the actual Shared Counting Core, not a hand-written
    // fixture — so "unchanged" is checked against real recorded events.
    const { container, unmount } = await mountTasbeehScreen();
    const tapButton = container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement;
    await click(tapButton); // 38, one real Statistics event recorded
    const statsBeforeReset = getTasbeehStats(ALL_TIME).total;

    await click(findButtonByText(container, t.reset));

    expect(getTasbeehStats(ALL_TIME).total).toBe(statsBeforeReset); // untouched by Reset
    expect(FloatingTasbeeh.setEnabled).not.toHaveBeenCalled();

    await unmount();
  });

  it("Reset All never touches historical Statistics or the persisted Floating Tasbeeh enabled state", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 4, [dhikrItems[1].id]: 9 });
    const { container, unmount } = await mountTasbeehScreen();
    const tapButton = container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement;
    await click(tapButton); // one real Statistics event recorded
    const statsBeforeReset = getTasbeehStats(ALL_TIME).total;

    await click(findButtonByText(container, t.resetAll));
    await click(findButtonByText(container, t.resetAllConfirmConfirm));

    expect(getTasbeehStats(ALL_TIME).total).toBe(statsBeforeReset); // untouched by Reset All
    expect(FloatingTasbeeh.setEnabled).not.toHaveBeenCalled();

    await unmount();
  });

  it("clearing Statistics never touches the live counters — Main and Floating stay in sync with whatever they already were", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 12 });
    const { container, unmount } = await mountTasbeehScreen();
    await selectDhikr(container, dhikrItems[0].dhikr_ar);
    expect(displayedCount(container)).toBe("12");

    // The exact operation SettingsScreen's "Delete Statistics history"
    // performs — see tasbeehCounters.ts's own "RESET COUNTER ≠ DELETE
    // STATISTICS" invariant, unchanged by this feature.
    clearAllStats();

    expect(displayedCount(container)).toBe("12"); // unaffected — nothing to "reflect", counters never changed
    expect(loadTasbeehCounters()[dhikrItems[0].id]).toBe(12);

    await unmount();
  });
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

// Selected-dhikr sync between the Floating Tasbeeh bubble and this screen
// (see floatingTasbeehSync.ts). Native holds the source of truth; this
// screen adopts it on mount, follows a floating-menu pick live, and pushes
// its own selection back. Counts are deliberately NOT part of this — they
// already share one store (tasbeehCounters.ts).
describe("TasbeehScreen — selected dhikr sync with Floating Tasbeeh", () => {
  const isSelected = (container: HTMLElement, dhikrAr: string) =>
    findButtonByText(container, dhikrAr).getAttribute("aria-pressed") === "true";

  it("adopts the dhikr the floating bubble is currently counting when it mounts", async () => {
    const chosen = dhikrItems[2];
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: chosen.id });
    const { container, unmount } = await mountTasbeehScreen();
    expect(isSelected(container, chosen.dhikr_ar)).toBe(true);
    expect(isSelected(container, dhikrItems[0].dhikr_ar)).toBe(false);
    await unmount();
  });

  it("shows the persisted count of the adopted dhikr — the same counter store the bubble writes", async () => {
    const chosen = dhikrItems[1];
    localStorage.setItem("dithar:tasbeeh:counters:v1", JSON.stringify({ [chosen.id]: 10 }));
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: chosen.id });
    const { container, unmount } = await mountTasbeehScreen();
    expect(displayedCount(container)).toBe("10");
    await unmount();
  });

  it("follows a floating-menu pick made while the screen is open", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    const calls = vi.mocked(FloatingTasbeeh.addListener).mock.calls as unknown as [string, (e: { dhikrId: number }) => void][];
    const handler = calls.find(([n]) => n === "selectedDhikrChanged")![1];
    const picked = dhikrItems[3];
    await act(async () => {
      handler({ dhikrId: picked.id });
    });
    expect(isSelected(container, picked.dhikr_ar)).toBe(true);
    // A pick from native must never echo back to native (no feedback loop).
    expect(FloatingTasbeeh.setSelectedDhikr).not.toHaveBeenCalled();
    await unmount();
  });

  it("pushes an in-app selection to the floating bubble", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    await selectDhikr(container, dhikrItems[1].dhikr_ar);
    expect(FloatingTasbeeh.setSelectedDhikr).toHaveBeenCalledExactlyOnceWith({ dhikrId: dhikrItems[1].id });
    await unmount();
  });

  it("does not let a late native read overwrite a dhikr the user already picked here", async () => {
    let resolveRead!: (v: { dhikrId: number }) => void;
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockReturnValue(new Promise((r) => (resolveRead = r)));
    const { container, unmount } = await mountTasbeehScreen();
    await selectDhikr(container, dhikrItems[1].dhikr_ar);
    await act(async () => {
      resolveRead({ dhikrId: dhikrItems[4].id });
    });
    expect(isSelected(container, dhikrItems[1].dhikr_ar)).toBe(true);
    expect(isSelected(container, dhikrItems[4].dhikr_ar)).toBe(false);
    await unmount();
  });
});

// Restart/navigation persistence of the screen's own selections (see
// src/lib/tasbeehSelection.ts): which dhikr is selected and each dhikr's
// target used to reset to dhikr #1 / blank whenever the screen remounted.
// "Restart" is simulated the way the counter tests do it — unmount, then
// mount a fresh instance against the same localStorage.
describe("TasbeehScreen — selected dhikr and target persistence", () => {
  const isSelected = (container: HTMLElement, dhikrAr: string) =>
    findButtonByText(container, dhikrAr).getAttribute("aria-pressed") === "true";
  const targetField = (container: HTMLElement) => container.querySelector('input[type="text"]') as HTMLInputElement;
  // The file-level mock always answers "the bubble is on dhikr 1". On a real
  // device native holds whatever the app last pushed (selectDhikr ->
  // pushFloatingSelectedDhikr), so behave like that here: a restart then
  // sees native and the saved selection agree, which is the normal case.
  beforeEach(() => {
    let nativeSelected: number = dhikrItems[0].id;
    vi.mocked(FloatingTasbeeh.setSelectedDhikr).mockImplementation(async ({ dhikrId }) => {
      nativeSelected = dhikrId;
    });
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockImplementation(async () => ({ dhikrId: nativeSelected }));
  });
  async function typeTarget(container: HTMLElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(targetField(container), value);
      targetField(container).dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("a first launch (nothing saved) still starts on the first dhikr with no target", async () => {
    const { container, unmount } = await mountTasbeehScreen();
    expect(isSelected(container, dhikrItems[0].dhikr_ar)).toBe(true);
    expect(targetField(container).value).toBe("");
    await unmount();
  });

  it("reopens on the dhikr that was selected, not item 1", async () => {
    const first = await mountTasbeehScreen();
    await selectDhikr(first.container, dhikrItems[3].dhikr_ar);
    await first.unmount();

    const second = await mountTasbeehScreen();
    expect(isSelected(second.container, dhikrItems[3].dhikr_ar)).toBe(true);
    expect(isSelected(second.container, dhikrItems[0].dhikr_ar)).toBe(false);
    await second.unmount();
  });

  it("keeps each dhikr's own target across a remount, and the selected dhikr with it", async () => {
    const first = await mountTasbeehScreen();
    await typeTarget(first.container, "33");
    await selectDhikr(first.container, dhikrItems[2].dhikr_ar);
    await typeTarget(first.container, "100");
    await first.unmount();

    const second = await mountTasbeehScreen();
    expect(isSelected(second.container, dhikrItems[2].dhikr_ar)).toBe(true);
    expect(targetField(second.container).value).toBe("100");
    await selectDhikr(second.container, dhikrItems[0].dhikr_ar);
    expect(targetField(second.container).value).toBe("33");
    await second.unmount();
  });

  it("clearing a target persists as cleared", async () => {
    const first = await mountTasbeehScreen();
    await typeTarget(first.container, "33");
    await typeTarget(first.container, "");
    await first.unmount();

    const second = await mountTasbeehScreen();
    expect(targetField(second.container).value).toBe("");
    await second.unmount();
  });

  it("Reset and Reset All zero counts but keep the selected dhikr and its target", async () => {
    const first = await mountTasbeehScreen();
    await selectDhikr(first.container, dhikrItems[1].dhikr_ar);
    await typeTarget(first.container, "50");
    await click(first.container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement);
    await click(findButtonByText(first.container, t.resetAll));
    await click(findButtonByText(first.container, t.resetAllConfirmConfirm));
    expect(loadTasbeehCounters()).toEqual({});
    await first.unmount();

    const second = await mountTasbeehScreen();
    expect(isSelected(second.container, dhikrItems[1].dhikr_ar)).toBe(true);
    expect(targetField(second.container).value).toBe("50");
    await second.unmount();
  });

  it("ignores a saved selection/target that no longer matches the library or is corrupt", async () => {
    localStorage.setItem("dithar:tasbeeh:selectedDhikr:v1", "9999");
    localStorage.setItem("dithar:tasbeeh:targets:v1", "{not json");
    const { container, unmount } = await mountTasbeehScreen();
    expect(isSelected(container, dhikrItems[0].dhikr_ar)).toBe(true);
    expect(targetField(container).value).toBe("");
    await unmount();
  });

  it("persists a dhikr adopted from the floating bubble so a restart keeps it", async () => {
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: dhikrItems[4].id });
    const first = await mountTasbeehScreen();
    expect(isSelected(first.container, dhikrItems[4].dhikr_ar)).toBe(true);
    await first.unmount();

    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: dhikrItems[4].id });
    const second = await mountTasbeehScreen();
    expect(isSelected(second.container, dhikrItems[4].dhikr_ar)).toBe(true);
    await second.unmount();
  });
});

// Celebration state across navigation. The voice path celebrates on
// `count >= target`, so a dhikr already past its target used to re-celebrate
// on its first voice completion after every remount (the "already
// celebrated" marker was component-local and lost). Marker is now persisted.
describe("TasbeehScreen — celebration state survives navigation", () => {
  const CELEBRATED_KEY = "dithar:tasbeeh:celebrated:v1";
  const confettiCount = (container: HTMLElement) => container.querySelectorAll(".dithar-confetti").length;
  const targetField = (container: HTMLElement) => container.querySelector('input[type="text"]') as HTMLInputElement;
  const tapButton = (container: HTMLElement) => container.querySelector(`button[aria-label="${t.incrementAria}"]`) as HTMLButtonElement;
  async function typeTarget(container: HTMLElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(targetField(container), value);
      targetField(container).dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  beforeEach(() => {
    FakeVoiceRecognition.reset();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeVoiceRecognition;
  });
  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("reaching a target by tapping records the celebration, and Reset / a changed target clear it", async () => {
    const id = dhikrItems[0].id;
    const { container, unmount } = await mountTasbeehScreen();
    await typeTarget(container, "2");
    await click(tapButton(container));
    expect(JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? "{}")).toEqual({});
    // Pacing ignores an immediate second tap; seed the count so the next tap reaches the target.
    await unmount();
    saveTasbeehCounters({ [id]: 1 });
    const again = await mountTasbeehScreen();
    await click(tapButton(again.container));
    expect(confettiCount(again.container)).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem(CELEBRATED_KEY)!)).toEqual({ [id]: 2 });

    await typeTarget(again.container, "5");
    expect(JSON.parse(localStorage.getItem(CELEBRATED_KEY)!)).toEqual({});
    await again.unmount();
  });

  it("does not re-celebrate a target on a voice completion after leaving and returning to the screen", async () => {
    const item = dhikrItems[0];
    const other = dhikrItems[1];
    // 1st visit: already at the target and already celebrated for it.
    saveTasbeehCounters({ [item.id]: 5 });
    localStorage.setItem("dithar:tasbeeh:targets:v1", JSON.stringify({ [item.id]: "3" }));
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify({ [item.id]: 3 }));

    const { container, unmount } = await mountTasbeehScreen();
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });
    FakeVoiceRecognition.instances[0].queueFinalResultOnStop(item.dhikr_ar);
    await selectDhikr(container, other.dhikr_ar);

    // The completion was credited (count went past the target) ...
    expect(loadTasbeehCounters()[item.id]).toBeGreaterThan(5);
    // ... without replaying the celebration.
    expect(confettiCount(container)).toBe(0);
    await unmount();
  });

  it("control: the same voice completion DOES celebrate when that target has not been celebrated yet", async () => {
    const item = dhikrItems[0];
    const other = dhikrItems[1];
    saveTasbeehCounters({ [item.id]: 5 });
    localStorage.setItem("dithar:tasbeeh:targets:v1", JSON.stringify({ [item.id]: "3" }));

    const { container, unmount } = await mountTasbeehScreen();
    await click(findButtonByText(container, t.voiceTasbeeh));
    await act(async () => {
      FakeVoiceRecognition.instances[0].fireStart();
    });
    FakeVoiceRecognition.instances[0].queueFinalResultOnStop(item.dhikr_ar);
    await selectDhikr(container, other.dhikr_ar);

    expect(confettiCount(container)).toBeGreaterThan(0);
    await unmount();
  });
});

describe("TasbeehScreen — system Back with the Reset All dialog open", () => {
  it("cancels the confirmation without resetting anything, and unregisters when the screen unmounts", async () => {
    saveTasbeehCounters({ [dhikrItems[0].id]: 12 });
    const { container, unmount } = await mountTasbeehScreen();
    expect(backOverlayCount()).toBe(0);
    await click(findButtonByText(container, t.resetAll));
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(backOverlayCount()).toBe(1);

    await act(async () => {
      expect(dismissTopBackOverlay()).toBe(true);
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(loadTasbeehCounters()[dhikrItems[0].id]).toBe(12);
    expect(FloatingTasbeeh.resetAllLiveCounts).not.toHaveBeenCalled();

    // Left open while navigating away: no stale entry is left behind.
    await click(findButtonByText(container, t.resetAll));
    expect(backOverlayCount()).toBe(1);
    await unmount();
    expect(backOverlayCount()).toBe(0);
  });
});
