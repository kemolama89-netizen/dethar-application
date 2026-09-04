// @vitest-environment jsdom
//
// Lifecycle tests for the useVoiceTasbeeh hook, driven through a small
// fake SpeechRecognition (built fresh for this task — not reused from any
// prior implementation). Mounts the REAL hook via plain react-dom/client +
// act (this project has no testing-library installed), matching the
// pattern already used by TasbeehScreen.test.tsx.
//
// Matching correctness itself is covered exhaustively by
// voiceTasbeehMatch.test.ts against the pure engine; these tests are
// scoped to what only the hook is responsible for: starting/restarting
// native recognition, not restarting on target switch, error/lifecycle
// status transitions, and the 60-second watchdog.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useVoiceTasbeeh, type VoiceTasbeehStatus, RECOGNIZER_STALL_THRESHOLD_MS } from "./useVoiceTasbeeh";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface FakeResult extends Array<{ transcript: string }> {
  isFinal: boolean;
}

function makeResult(text: string, isFinal: boolean): FakeResult {
  const arr = [{ transcript: text }] as FakeResult;
  arr.isFinal = isFinal;
  return arr;
}

class FakeSpeechRecognition extends EventTarget {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: Event) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;

  started = false;
  aborted = false;

  start() {
    this.started = true;
    FakeSpeechRecognition.instances.push(this);
  }

  stop() {
    this.finish();
  }

  abort() {
    this.aborted = true;
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

  // segmentId mirrors SpeechRecognitionEvent.resultIndex — the array is
  // padded with unread filler entries below it, matching the real API's
  // "results is the full cumulative array, resultIndex is where the new
  // content starts" shape, since useVoiceTasbeeh loops from resultIndex.
  fireResult(segmentId: number, text: string, isFinal: boolean) {
    const results: FakeResult[] = [];
    for (let i = 0; i < segmentId; i++) results.push(makeResult("", true));
    results.push(makeResult(text, isFinal));
    this.onresult?.({ resultIndex: segmentId, results });
  }

  fireError(error: string) {
    this.onerror?.({ error });
  }

  // Simulates the browser ending the session on its own (NOT via our own
  // stop()/abort()) — e.g. a natural continuous-mode session boundary.
  fireBrowserForcedEnd() {
    this.started = false;
    this.onend?.(new Event("end"));
  }

  static instances: FakeSpeechRecognition[] = [];
  static reset() {
    FakeSpeechRecognition.instances = [];
  }
}

let latestResult: { status: VoiceTasbeehStatus; justMatched: boolean } | null = null;
let matchLog: number[] = [];
let idleTimeoutCount = 0;

function Harness({ enabled, targetPhrase }: { enabled: boolean; targetPhrase: string }) {
  const result = useVoiceTasbeeh({
    enabled,
    targetPhrase,
    onMatch: (times) => {
      matchLog.push(times);
    },
    onIdleTimeout: () => {
      idleTimeoutCount += 1;
    },
  });
  useEffect(() => {
    latestResult = result;
  });
  return null;
}

async function mount(props: { enabled: boolean; targetPhrase: string }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(Harness, props));
  });
  return {
    rerender: async (next: typeof props) => {
      await act(async () => {
        root.render(React.createElement(Harness, next));
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

beforeEach(() => {
  FakeSpeechRecognition.reset();
  matchLog = [];
  idleTimeoutCount = 0;
  latestResult = null;
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSpeechRecognition;
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

describe("useVoiceTasbeeh lifecycle", () => {
  it("starts one recognition instance and transitions to listening", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    expect(latestResult?.status).toBe("requesting");
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    expect(latestResult?.status).toBe("listening");
    await unmount();
  });

  it("calls onMatch and pulses justMatched when the engine reports a completion", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله", true);
    });
    expect(matchLog).toEqual([1]);
    expect(latestResult?.justMatched).toBe(true);
    await unmount();
  });

  it("switching target transparently refreshes to a fresh recognition instance for the new target", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: true, targetPhrase: "الله اكبر" });
    // A brand-new native instance for the new target — the old one is
    // aborted (superseded), not reused; the session itself never
    // surfaces this as a user-visible restart (no UI change, no separate
    // "idle" status in between).
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    expect(latestResult?.status).toBe("listening");
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireResult(0, "الله اكبر", true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });

  it("a late event from the superseded (old) recognizer instance after a target switch is ignored — it cannot alter matcher state or increment the counter", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: true, targetPhrase: "الله اكبر" });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    // The OLD, superseded instance fires late — as if it had somehow
    // completed the OLD target, or is delivering a revision of content
    // it saw before being aborted. Neither may reach the matcher/counter.
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله", true);
    });
    expect(matchLog).toEqual([]);
    // The NEW instance's own, genuinely fresh phrase still counts normally.
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireResult(0, "الله اكبر", true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });

  it("two complete new-target phrases spoken rapidly right after a switch both count, with no throttle", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: true, targetPhrase: "الله اكبر" });
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireResult(0, "الله اكبر الله اكبر", true);
    });
    expect(matchLog).toEqual([2]);
    await unmount();
  });

  it("restarts transparently when the browser ends the session on its own", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireBrowserForcedEnd();
    });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    await unmount();
  });

  it("does not restart after an explicit disable", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: false, targetPhrase: "سبحان الله" });
    expect(latestResult?.status).toBe("idle");
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    await unmount();
  });

  it("reflects a permission-denied error and does not restart", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireError("not-allowed");
      FakeSpeechRecognition.instances[0].fireBrowserForcedEnd();
    });
    expect(latestResult?.status).toBe("denied");
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    await unmount();
  });

  it("reports unsupported when no SpeechRecognition constructor exists", async () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    expect(latestResult?.status).toBe("unsupported");
    expect(FakeSpeechRecognition.instances.length).toBe(0);
    await unmount();
  });
});

describe("useVoiceTasbeeh 60s inactivity watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops and calls onIdleTimeout after 60s with no genuine activity", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(idleTimeoutCount).toBe(1);
    expect(latestResult?.status).toBe("idle");
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);
    await unmount();
  });

  it("does not time out while genuine activity keeps occurring", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    // Gaps deliberately kept under RECOGNIZER_STALL_THRESHOLD_MS (see the
    // dedicated recognizer-health describe block below) so this test
    // exercises only the 60s user-inactivity signal in isolation — a
    // 30s+ gap with zero events would also, correctly, trigger a health
    // restart, which is a separate mechanism this test isn't about.
    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await act(async () => {
        FakeSpeechRecognition.instances[0].fireResult(i, "سبحان", false);
      });
    }
    expect(idleTimeoutCount).toBe(0);
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    await unmount();
  });

  it("does not treat duplicate/replayed transcript output as activity that prevents the timeout", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان", false);
    });
    // repeatedly re-emit the SAME unchanged interim content, well past 60s
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      await act(async () => {
        FakeSpeechRecognition.instances[0].fireResult(0, "سبحان", false);
      });
    }
    expect(idleTimeoutCount).toBe(1);
    await unmount();
  });
});

describe("useVoiceTasbeeh end-to-end regressions (real device capture: RLM corruption + revision under switch)", () => {
  const RLM = "‏";

  it("completes a long target spanning three native resultIndex values, with a leading U+200F on a later segment's own first token", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده الله اكبر" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله", true);
    });
    expect(matchLog).toEqual([]);
    await act(async () => {
      // A later native result's transcript, exactly as captured from the
      // real device, glued directly onto its own first word.
      FakeSpeechRecognition.instances[0].fireResult(1, `${RLM}وبحمده`, true);
    });
    expect(matchLog).toEqual([]);
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(2, `${RLM}الله اكبر`, true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });

  it("a revision fired on the superseded instance after a switch is ignored; the fresh instance's own new target still completes", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله", false); // partial old target, pre-switch
    });
    await rerender({ enabled: true, targetPhrase: "الحمد لله رب العالمين" });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    await act(async () => {
      // A late revision fired on the now-superseded OLD instance — as if
      // the browser were still trying to re-segment content it saw
      // before being aborted. This must be completely inert: the
      // instance-identity guard rejects it before it ever reaches the
      // matcher.
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحانالله الحمد لله رب العالمين", true);
    });
    expect(matchLog).toEqual([]);
    // The fresh instance's OWN result, for the new target, still
    // completes normally — nothing about the refresh weakens matching.
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireResult(0, "الحمد لله رب العالمين", true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });
});

describe("safer recovery model — hook-level: A -> B -> A refreshes the recognizer each switch but never cross-contaminates progress", () => {
  it("each switch gets its own fresh instance across A -> B -> A, and a genuine fresh recitation of A still counts exactly once", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "واحد اثنان ثلاثة اربعة" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: true, targetPhrase: "الحمد لله" });
    await rerender({ enabled: true, targetPhrase: "واحد اثنان ثلاثة اربعة" });
    // Initial + 2 switches = 3 instances; each switch supersedes the last.
    expect(FakeSpeechRecognition.instances.length).toBe(3);
    await act(async () => {
      FakeSpeechRecognition.instances[2].fireStart();
    });
    await act(async () => {
      FakeSpeechRecognition.instances[2].fireResult(0, "واحد اثنان ثلاثة اربعة", true);
    });
    expect(matchLog).toEqual([1]);
    expect(FakeSpeechRecognition.instances.length).toBe(3);
    await unmount();
  });
});

describe("useVoiceTasbeeh recognizer-health watchdog (separate from the 60s user-inactivity watchdog)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // A. A normal long-dhikr pause, shorter than the health threshold, must
  // never trigger a restart.
  it("does not restart for a pause shorter than the health threshold", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان", false);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECOGNIZER_STALL_THRESHOLD_MS - 1_000);
    });
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله وبحمده", true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });

  // B. A true silent recognizer stall beyond the threshold triggers
  // exactly one recovery restart.
  it("recovers with exactly one restart after a true silent stall beyond the threshold", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    expect(FakeSpeechRecognition.instances.length).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECOGNIZER_STALL_THRESHOLD_MS + 1_000);
    });

    expect(FakeSpeechRecognition.instances.length).toBe(2);
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);

    // Exactly one — a further short advance (well under another full
    // threshold window) must not produce a second restart.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    await unmount();
  });

  // C. A target-switch refresh is independent of, and never confused
  // with, the health-restart mechanism: it produces exactly one fresh
  // instance right away (not gated by the stall threshold), and the
  // freshly-refreshed instance still gets its own full health grace
  // period rather than immediately looking stalled.
  it("refreshes exactly once on a target switch, independent of the health watchdog, and the fresh instance gets its own grace period", async () => {
    const { rerender, unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    await rerender({ enabled: true, targetPhrase: "الله اكبر" });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    // A further switch shortly after must not ALSO trigger a spurious
    // health-restart on top of its own refresh.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    await unmount();
  });

  // D. 60s of genuine user inactivity is a normal, full shutdown — never
  // the health-recovery restart path. Isolated from the health signal
  // entirely: the recognizer keeps producing events throughout (so it is
  // never "stalled" — no restart is ever warranted), but none of them
  // engage the target, so genuine user/dhikr activity never occurs.
  it("60s of user inactivity performs a normal shutdown, not a health recovery restart", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    // Off-target speech, well within the health threshold each time —
    // the recognizer is demonstrably alive and healthy the whole way
    // through, yet still accumulates 60s of pure user inactivity.
    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await act(async () => {
        FakeSpeechRecognition.instances[0].fireResult(i, "محمد رسول", true);
      });
    }
    expect(idleTimeoutCount).toBe(1);
    expect(latestResult?.status).toBe("idle");
    // A full shutdown, not a restart: still exactly one instance
    // throughout, aborted once by the shutdown path, never restarted —
    // and nothing further happens afterward even if more time passes.
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    expect(FakeSpeechRecognition.instances[0].aborted).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECOGNIZER_STALL_THRESHOLD_MS + 1_000);
    });
    expect(FakeSpeechRecognition.instances.length).toBe(1);
    expect(idleTimeoutCount).toBe(1);
    await unmount();
  });

  // E. A health recovery in the middle of a long dhikr preserves progress
  // — the dhikr can still complete afterwards.
  it("preserves matchProgress across a health restart mid-long-dhikr", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله وبحمده" });
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireStart();
    });
    // First two of three words, FINALIZED (isFinal: true) so progress is
    // durably committed to matchProgress — not merely the transient,
    // disposable progress a still-interim result would leave behind (see
    // VoiceTasbeehMatcher.processSegment: only a completion or a
    // finalized segment ever updates matchProgress durably).
    await act(async () => {
      FakeSpeechRecognition.instances[0].fireResult(0, "سبحان الله", true);
    });
    expect(matchLog).toEqual([]);

    // The recognizer then goes completely silent past the stall
    // threshold — a health restart occurs.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECOGNIZER_STALL_THRESHOLD_MS + 1_000);
    });
    expect(FakeSpeechRecognition.instances.length).toBe(2);

    // The fresh instance starts...
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireStart();
    });
    // ...and the FINAL word alone (a brand-new segment on the new
    // instance) completes the dhikr — proving the first two words'
    // progress survived the restart.
    await act(async () => {
      FakeSpeechRecognition.instances[1].fireResult(0, "وبحمده", true);
    });
    expect(matchLog).toEqual([1]);
    await unmount();
  });

  // F. A recognizer that keeps stalling, restart after restart, never
  // produces a restart storm — each stall yields exactly one restart, at
  // the threshold's own cadence, not faster.
  it("does not produce a restart storm under repeated recognizer stalls", async () => {
    const { unmount } = await mount({ enabled: true, targetPhrase: "سبحان الله" });

    for (let round = 0; round < 3; round++) {
      await act(async () => {
        FakeSpeechRecognition.instances[FakeSpeechRecognition.instances.length - 1].fireStart();
      });
      const countBefore = FakeSpeechRecognition.instances.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RECOGNIZER_STALL_THRESHOLD_MS + 1_000);
      });
      expect(FakeSpeechRecognition.instances.length).toBe(countBefore + 1);
    }

    expect(FakeSpeechRecognition.instances.length).toBe(4);
    expect(idleTimeoutCount).toBe(0); // never escalated to a full shutdown
    await unmount();
  });
});
