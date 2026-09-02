// @vitest-environment jsdom
//
// LIVE regression suite — unlike voiceTasbeehMatch.test.ts's pure
// algorithmic simulator (which mirrors the counting algorithm but never
// touches React), these tests render the REAL useVoiceTasbeeh hook into a
// REAL React tree via react-dom/client, driven by a mock SpeechRecognition
// that reproduces actual documented/observed browser behavior: result
// indices restart from 0 on every recognition session, and a session ends
// and auto-restarts on its own (silence, or Safari's much more eager
// per-utterance session endings — see useVoiceTasbeeh.ts's own platform
// notes). This exercises the real React effect/closure lifecycle
// (including a StrictMode double-mount/unmount cycle below), not just the
// matching algorithm in isolation — the actual production over-counting
// bug reproduced here came from a gap in THIS lifecycle (resetAll()
// unconditionally discarding session continuity across a restart), not
// from the matching engine, which is why the pure simulator's tests never
// caught it.
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useVoiceTasbeeh } from "./useVoiceTasbeeh";
import { tokenize } from "./voiceTasbeehMatch";

// Silences React's benign (but noisy) "not configured for act()" warning —
// this file's environment IS the test itself, driven entirely through
// act(), so the warning has nothing to report.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class MockAlternative {
  transcript: string;
  confidence: number;
  constructor(transcript: string, confidence: number) {
    this.transcript = transcript;
    this.confidence = confidence;
  }
}

class MockResult extends Array<MockAlternative> {
  isFinal: boolean;
  constructor(transcript: string, confidence: number, isFinal: boolean) {
    super();
    this.push(new MockAlternative(transcript, confidence));
    this.isFinal = isFinal;
  }
}

// A faithful-enough stand-in for window.SpeechRecognition: tracks how many
// times start() has been called (a "session"), lets a test fire interim/
// final results and simulate the browser ending the session on its own
// (recognition.onend). Matches the REAL SpeechRecognitionResultList shape
// that useVoiceTasbeeh.ts's `for (let i = event.resultIndex; i <
// event.results.length; i++)` loop depends on: `results` is a CUMULATIVE,
// growing array (every earlier index stays present), and `resultIndex` is
// just the lowest index that changed in THIS event — never a length by
// itself. A per-session accumulator enforces that automatically so no
// individual test can accidentally build a malformed event.
class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: ((ev: unknown) => void) | null = null;
  onend: ((ev: unknown) => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  started = false;
  sessionsStarted = 0;
  /** Convenience auto-incrementing index for the harness's `say()` helper — resets every session, exactly like a real recognizer's own resultIndex numbering. */
  idx = 0;
  private accumulatedResults: MockResult[] = [];
  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
  start() {
    this.started = true;
    this.sessionsStarted += 1;
    this.accumulatedResults = []; // a fresh session renumbers indices from 0, like a real browser
    this.idx = 0;
    queueMicrotask(() => this.onstart?.({}));
  }
  stop() {
    this.started = false;
  }
  abort() {
    this.started = false;
  }
  /** Updates (or appends) result `index` in THIS session's cumulative results array and fires onresult. */
  fireResult(index: number, result: MockResult) {
    this.accumulatedResults[index] = result;
    const resultsArray = this.accumulatedResults as unknown as { length: number; [i: number]: MockResult };
    this.onresult?.({ resultIndex: index, results: resultsArray });
  }
  fireEnd() {
    this.started = false;
    this.onend?.({});
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// RESTART_DELAY_MS in useVoiceTasbeeh.ts is 300ms — this must exceed it.
const PAST_RESTART_DELAY_MS = 360;

interface Harness {
  matches: number[];
  rollbacks: number[];
  recognition: MockSpeechRecognition;
  root: ReturnType<typeof createRoot>;
  container: HTMLDivElement;
  net: () => number;
  /** The hook's CURRENT `status` return value, as of the last render. */
  status: () => string;
  /** Re-renders with a NEW selected dhikr — exactly what TasbeehScreen does when the user picks a different dhikr, WITHOUT unmounting/remounting the hook or touching the recognition instance. */
  setTarget: (target: string) => Promise<void>;
  /** Fires one `isFinal` result for whatever's CURRENTLY selected, at the next index in the CURRENT session (auto-incrementing, resets on restart). */
  say: (text: string, confidence?: number) => Promise<void>;
  unmount: () => Promise<void>;
}

async function mountVoiceTasbeeh(targetPhrase: string): Promise<Harness> {
  (globalThis as unknown as { window: { SpeechRecognition: unknown } }).window.SpeechRecognition = MockSpeechRecognition;
  (globalThis as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
  MockSpeechRecognition.instances = [];

  const matches: number[] = [];
  const rollbacks: number[] = [];
  let currentTarget = targetPhrase;
  let latestStatus = "idle";

  function TestHarness({ target }: { target: string }) {
    const { status } = useVoiceTasbeeh({
      enabled: true,
      targetPhrase: target,
      onMatch: (times) => matches.push(times),
      onRollback: (times) => rollbacks.push(times),
    });
    React.useEffect(() => {
      latestStatus = status;
    }, [status]);
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(TestHarness, { target: currentTarget }));
  });
  await act(async () => {
    await sleep(10); // let the queued onstart microtask flush
  });

  const recognition = MockSpeechRecognition.instances[0];
  return {
    matches,
    rollbacks,
    recognition,
    root,
    container,
    net: () => matches.reduce((a, b) => a + b, 0) - rollbacks.reduce((a, b) => a + b, 0),
    status: () => latestStatus,
    setTarget: async (target: string) => {
      currentTarget = target;
      await act(async () => {
        root.render(React.createElement(TestHarness, { target: currentTarget }));
      });
    },
    say: async (text: string, confidence = 0.9) => {
      const idx = recognition.idx++;
      await act(async () => {
        recognition.fireResult(idx, new MockResult(text, confidence, true));
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

async function restartSession(h: Harness) {
  await act(async () => {
    h.recognition.fireEnd();
  });
  await act(async () => {
    await sleep(PAST_RESTART_DELAY_MS);
  });
}

describe("useVoiceTasbeeh — LIVE cross-session duplicate regression suite", () => {
  it("baseline: one utterance, single session, normal interim->final buildup -> +1", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("RETIRED HEURISTIC, now fixed: a genuine repetition arriving as the restarted session's FIRST result, with NO interim buildup, must still count +2 (not be suppressed as a suspected echo)", async () => {
    // This file previously asserted the OPPOSITE of what's tested here —
    // a fix (since removed) treated an already-final, no-interim-buildup
    // first result of a freshly-restarted session as a "suspected echo"
    // of whatever had just been committed, and suppressed it. That
    // assumption (genuine speech always shows progressive interim
    // buildup) was never confirmed against real browser behavior and was
    // DISPROVEN by direct reproduction: a short dhikr spoken at natural,
    // confident speed can legitimately arrive as a single already-final
    // result with no separate interim step (see this file's lifecycle
    // regression suite below for the full reproduction of the resulting
    // real production bug — a genuine utterance right after ANY session
    // restart could be silently swallowed). The heuristic has been
    // removed; this is now required, passing behavior.
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.91, true));
    });
    expect(h.net()).toBe(1);

    await restartSession(h);
    expect(h.recognition.sessionsStarted).toBe(2); // confirms an actual restart happened

    // New session's FIRST result: indices reset to 0, arrives ALREADY
    // final with zero interim buildup — a GENUINE repetition, not an echo.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.87, true));
    });

    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("duplicate final with a NEW resultIndex WITHIN THE SAME session (no restart) must still count as a genuine repetition -> +2", async () => {
    // This is the existing, already-required behavior this fix must NOT
    // regress: two separately-finalized segments in ONE continuous
    // session are indistinguishable from two genuine repetitions, and
    // MUST both count (see voiceTasbeehMatch.test.ts's own "same long
    // dhikr repeated twice" test for the pure-algorithm version of this).
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    await act(async () => {
      h.recognition.fireResult(1, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.recognition.sessionsStarted).toBe(1); // same session throughout
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("genuine second repetition immediately after a restart, built up progressively, still counts -> +2", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.net()).toBe(1);

    await restartSession(h);

    // The user genuinely repeats the dhikr right after the restart, this
    // time observed building up progressively (a real interim step
    // showing a PARTIAL prefix first). Whether or not a repetition shows
    // interim buildup is no longer load-bearing for counting it (see the
    // test above) — this case is exercised here anyway to confirm
    // interim-then-final progression still works exactly as it always did.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });

    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("unrelated speech as the first result of a new session doesn't count, and the genuine repetition right after it still does -> +1", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.net()).toBe(1);

    await restartSession(h);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult("الحمد لله", 0.9, true)); // unrelated
    });
    expect(h.net()).toBe(1); // still just the first repetition

    await act(async () => {
      h.recognition.fireResult(1, new MockResult("سبحان الله", 0.9, true)); // genuine second repetition
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("three restarts in a row, one genuine repetition each time -> exactly +3, no drift", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    for (let rep = 0; rep < 3; rep++) {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
      });
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
      });
      await restartSession(h);
    }
    expect(h.recognition.sessionsStarted).toBe(4); // 3 restarts + the initial start
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  it("long dhikr spoken once, entirely within one session, remains +1 (unaffected by the cross-session guard)", async () => {
    const LONG = "سبحان الله وبحمده سبحان الله العظيم";
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");
    for (let n = 1; n < words.length; n++) {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, n).join(" "), 0, false));
      });
    }
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("ONE physical utterance -> exactly ONE count, even across a barrage of interim/duplicate events for it within one session", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0, false)); // dup interim
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true)); // dup final, same index
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("React StrictMode-style double mount/unmount does not create a second live recognition instance or double-process events", async () => {
    (globalThis as unknown as { window: { SpeechRecognition: unknown } }).window.SpeechRecognition = MockSpeechRecognition;
    MockSpeechRecognition.instances = [];
    const matches: number[] = [];

    function TestHarness() {
      useVoiceTasbeeh({
        enabled: true,
        targetPhrase: "سبحان الله",
        onMatch: (times) => matches.push(times),
        onRollback: () => {},
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);

    // Simulate StrictMode's dev-only mount -> cleanup -> mount cycle
    // explicitly, rather than relying on <StrictMode> itself (which only
    // double-invokes in dev builds) — this proves the cleanup function
    // fully tears down the FIRST instance (nulls its handlers, aborts it)
    // before the second one is ever created, so a stray event delivered to
    // the first instance can never reach the matcher.
    const root1 = createRoot(container);
    await act(async () => {
      root1.render(React.createElement(TestHarness));
    });
    await act(async () => {
      root1.unmount();
    });

    const root2 = createRoot(container);
    await act(async () => {
      root2.render(React.createElement(TestHarness));
    });
    await act(async () => {
      await sleep(10);
    });

    expect(MockSpeechRecognition.instances.length).toBe(2); // one per mount, as expected
    const [stale, live] = MockSpeechRecognition.instances;
    expect(stale.onresult).toBeNull(); // torn down by the first unmount's cleanup

    // A stray event on the STALE instance (simulating a race with a real
    // browser recognizer that hadn't fully aborted yet) must be a no-op.
    stale.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    expect(matches).toEqual([]);

    await act(async () => {
      live.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    expect(matches).toEqual([1]);

    await act(async () => {
      root2.unmount();
    });
    document.body.removeChild(container);
  });

  it("REGRESSION: VALID 'سبحان الله' -> wrong speech -> VALID 'سبحان الله' nets +2, not +1 (wrongful-rollback bug)", async () => {
    // Directly exercises the REAL useVoiceTasbeeh.ts hook (not the pure
    // simulator in voiceTasbeehMatch.test.ts) for the exact reported
    // sequence: a segment that finalizes VALID, immediately followed by a
    // completely unrelated segment, immediately followed by the same
    // dhikr again — all within ONE continuous session (no restart
    // involved at all, ruling out the separate cross-session guard).
    const h = await mountVoiceTasbeeh("سبحان الله");

    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.net()).toBe(1);

    await act(async () => {
      h.recognition.fireResult(1, new MockResult("كلام غريب تماما لا علاقة له", 0.9, true));
    });
    expect(h.net()).toBe(1); // must NOT roll back the already-credited repetition

    await act(async () => {
      h.recognition.fireResult(2, new MockResult("سبحان الله", 0.9, true));
    });
    expect(h.net()).toBe(2); // the second genuine repetition must still be credited

    expect(h.recognition.sessionsStarted).toBe(1); // confirms this never touched the restart/session guard at all
    await h.unmount();
  });

  it("REGRESSION: fast-speech word-merge ('سبحانالله', hamzat al-wasl elision) still counts +1 against the REAL hook", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحانالله", 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("REGRESSION: fast-speech merge does not weaken wrong-dhikr rejection against the REAL hook", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحانالله وبحمده", 0.9, true)); // fused first two words, but extends further
    });
    expect(h.net()).toBe(0);
    await h.unmount();
  });

  it("REGRESSION: mixed pace (slow then fast) both count, VALID -> WRONG -> VALID still holds with a fast-fused second repetition", async () => {
    const h = await mountVoiceTasbeeh("سبحان الله");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true)); // slow/clear
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(1, new MockResult("كلام غريب تماما", 0.9, true)); // wrong speech
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(2, new MockResult("سبحانالله", 0.9, true)); // fast/fused
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Dhikr-selection lifecycle regression suite: "select A, count A, switch
// to B and count B, switch back to A — the FIRST valid A utterance after
// switching back must count +1 immediately."
//
// Root cause (confirmed by direct reproduction, NOT theorized): the
// cross-session "echo" guard removed above — which suppressed a freshly-
// restarted session's first result unless it showed progressive interim
// buildup — could silently swallow a GENUINE utterance any time it
// happened to arrive as a single already-final result right after ANY
// session restart (Chrome/Safari periodically end and auto-restart a
// "continuous" session on their own; Safari especially eagerly, per this
// file's own platform notes). Switching dhikr is a natural pause point
// where such a restart commonly lands, which is why the user's A -> B ->
// A repro consistently exposed it — but a focused reproduction below
// (using the SAME dhikr the whole time, never switching at all) proves
// the mechanism was never actually about dhikr-selection state: it was a
// restart/session-lifecycle bug, not a stale-selectedDhikr bug. The fix
// removed the flawed heuristic entirely (see the retired-heuristic test
// above); no dhikr-selection-specific code needed to change at all —
// `resetAll()` on a target change was already correctly wiping the
// matching checkpoint, and continues to.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — dhikr-selection lifecycle regression suite", () => {
  const A = "سبحان الله";
  const B = "الحمد لله";
  const WRONG = "كلام غريب تماما لا علاقة له";

  it("MOST IMPORTANT: select A, count A, switch to B and count B, switch back to A — the first valid A utterance counts +1 immediately", async () => {
    const h = await mountVoiceTasbeeh(A);
    await h.say(A);
    expect(h.net()).toBe(1);

    await h.setTarget(B);
    await h.say(B);
    expect(h.net()).toBe(2);

    await h.setTarget(A);
    await h.say(A); // must count immediately — no repeating required
    expect(h.net()).toBe(3);

    await h.unmount();
  });

  it("A -> speak A -> +1, B -> speak B -> +1, A -> speak A -> +1 (exact required sequence)", async () => {
    const h = await mountVoiceTasbeeh(A);
    await h.say(A);
    expect(h.net()).toBe(1);
    await h.setTarget(B);
    await h.say(B);
    expect(h.net()).toBe(2);
    await h.setTarget(A);
    await h.say(A);
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  it("A -> B -> A -> B -> A: each FIRST valid utterance after selecting the dhikr counts +1", async () => {
    const h = await mountVoiceTasbeeh(A);
    const sequence = [A, B, A, B, A];
    let expected = 0;
    for (const target of sequence) {
      await h.setTarget(target);
      await h.say(target);
      expected += 1;
      expect(h.net()).toBe(expected);
    }
    await h.unmount();
  });

  it("A -> B -> A, then wrong phrase -> 0, then A once -> +1", async () => {
    const h = await mountVoiceTasbeeh(A);
    await h.say(A);
    await h.setTarget(B);
    await h.say(B);
    await h.setTarget(A);
    expect(h.net()).toBe(2);
    await h.say(WRONG);
    expect(h.net()).toBe(2); // wrong speech never counts
    await h.say(A);
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  it("A -> B -> A rapid switching: only the CURRENTLY selected dhikr can ever be counted", async () => {
    const h = await mountVoiceTasbeeh(A);
    await h.say(A);
    expect(h.net()).toBe(1);
    // Rapid churn with no speech in between — must never itself count.
    for (const t of [B, A, B, A, B, A, B]) {
      await h.setTarget(t);
    }
    expect(h.net()).toBe(1);
    await h.setTarget(A);
    await h.say(B); // saying B's phrase while A is selected must NOT count
    expect(h.net()).toBe(1);
    await h.say(A); // only the CURRENTLY selected dhikr counts
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("LIFECYCLE FOCUS: onresult -> onend -> restart/session transition -> selectedDhikr change -> new result, with NO dhikr switch at all — isolates the bug to session restarts, not selection state", async () => {
    // Deliberately never switches dhikr, to prove the root cause was a
    // restart/session-lifecycle bug rather than anything keyed by the
    // selected dhikr.
    const h = await mountVoiceTasbeeh(A);
    await h.say(A); // onresult (interim-free, single final result)
    expect(h.net()).toBe(1);
    await restartSession(h); // onend -> restart_delay -> recognition.start() (new session)
    await h.say(A); // the SAME dhikr's next genuine utterance, first result of the new session
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("LIFECYCLE FOCUS: restart racing a dhikr switch (restart fired, THEN selectedDhikr changes before the restart timer elapses)", async () => {
    const h = await mountVoiceTasbeeh(A);
    await h.say(A);
    await h.setTarget(B);
    await h.say(B);
    expect(h.net()).toBe(2);
    // Fire the session end, then switch dhikr WHILE the restart timer is
    // still pending, then let it elapse.
    await act(async () => {
      h.recognition.fireEnd();
    });
    await h.setTarget(A);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260));
    });
    await h.say(A);
    expect(h.net()).toBe(3);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Real-elapsed-time coverage for the two "forget" windows in
// useVoiceTasbeeh.ts (VALID_SETTLE_DELAY_MS = 1500ms, and
// PENDING_ABANDON_DELAY_MS = 6000ms — mirrored here rather than imported,
// since they're deliberately not exported: only their externally-observable
// effect matters). Every other test in this file either never lets real
// time pass mid-utterance, or only advances past RESTART_DELAY_MS (300ms) —
// neither approach can prove a PENDING utterance's progress actually
// survives a multi-second natural breathing pause on the SAME still-open
// segment (as opposed to surviving via a segment-index switch, which
// commits regardless of any timer and would pass even without this fix).
// vi.useFakeTimers({ shouldAdvanceTime: true }) lets the mock's own
// queueMicrotask-based onstart flush and the harness's real-setTimeout
// `sleep()` still resolve normally (real wall-clock time keeps the fake
// clock ticking), while vi.advanceTimersByTimeAsync jumps the multi-second
// gaps instantly instead of making the test suite actually wait for them.
describe("useVoiceTasbeeh — real-time natural-pause / abandon-window behavior", () => {
  const MEDIUM_LONG = "سبحان الله وبحمده سبحان الله العظيم"; // 6 tokens
  const SHORT = "سبحان الله";
  const UNRELATED = "كلام غريب تماما لا علاقة له";

  it("a ~3s natural pause mid-utterance (same still-open segment, under the abandon window) does not lose progress -> +1", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(MEDIUM_LONG);
      const words = MEDIUM_LONG.split(" ");

      // First clause only, as an INTERIM (segment never finalizes here) —
      // the recognizer is still "listening" on this same result index.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0, false));
      });
      expect(h.net()).toBe(0);

      // A realistic breathing pause: well past VALID_SETTLE_DELAY_MS
      // (1500ms) but comfortably under PENDING_ABANDON_DELAY_MS (6000ms) —
      // exactly the window PENDING_ABANDON_DELAY_MS exists to protect, per
      // its own doc in useVoiceTasbeeh.ts.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // The user continues and finishes the SAME utterance; the recognizer
      // revises the SAME segment index to the complete phrase and finalizes.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(MEDIUM_LONG, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("exceeding the abandon window (~6.5s) on an incomplete recitation forgets that attempt — it never counts — without corrupting a fresh complete recitation right after", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(MEDIUM_LONG);
      const words = MEDIUM_LONG.split(" ");

      // First clause, interim, then the user genuinely trails off and never
      // returns to this same segment.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0, false));
      });
      expect(h.net()).toBe(0);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6500); // past PENDING_ABANDON_DELAY_MS
      });

      // The recognizer eventually finalizes that SAME (now-abandoned)
      // segment with only the forgotten continuation — must not complete
      // the dhikr, since the forgotten first clause is gone.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(3).join(" "), 0.9, true));
      });
      expect(h.net()).toBe(0);

      // A later, genuinely fresh, complete recitation still counts normally
      // — the abandonment must not leave any lingering corruption behind.
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(MEDIUM_LONG, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a VALID utterance that settles (~1.6s with no isFinal) locks in its credit and is no longer at risk of rollback from later unrelated speech", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      // Reaches VALID via an INTERIM result — never gets an isFinal flag at
      // all (a realistic case: the recognizer's endpoint detector is slow
      // to mark finality even though the words are already complete).
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
      });
      expect(h.net()).toBe(1);

      // Past VALID_SETTLE_DELAY_MS (1500ms) with nothing further on this
      // segment — the settle timer force-commits it.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Unrelated speech arrives afterward on a fresh segment — must NOT
      // roll back the already-settled credit.
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("REPRO: a second repetition continuing on the SAME still-open segment index after the settle timer fires must still count", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(MEDIUM_LONG);
      // Rep 1 completes as an INTERIM result on segment index 0 — the
      // recognizer has NOT finalized this segment yet (continuous mode,
      // still listening for more on the SAME index).
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(MEDIUM_LONG, 0.9, false));
      });
      expect(h.net()).toBe(1);

      // The user pauses briefly before starting the next repetition — past
      // VALID_SETTLE_DELAY_MS (1500ms), so the settle timer fires and locks
      // in rep 1's credit.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      expect(h.net()).toBe(1);

      // The user continues reciting — the recognizer's SAME segment index 0
      // (never finalized) grows to include rep 2's words as well, exactly
      // as continuous SpeechRecognition commonly behaves for a longer
      // utterance recited with a natural pause before repeating.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(`${MEDIUM_LONG} ${MEDIUM_LONG}`, 0.9, false));
      });
      expect(h.net()).toBe(2);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------
// Regression suite for the "counts once then stops" long-utterance
// lifecycle bug and the specific "اللهم صل وسلم وبارك على سيدنا محمد"
// phrase. Root cause: VALID_SETTLE_DELAY_MS / PENDING_ABANDON_DELAY_MS
// firing while a SpeechRecognition segment was STILL OPEN (not yet
// `isFinal`) used to call the same commitInFlight() a genuine segment
// boundary uses — which bumps highestCommittedIndexRef and retires the
// in-flight tracking for that index. Since `continuous` mode keeps
// listening on the SAME index rather than starting a new one, and a
// longer dhikr is far more likely than a short one to leave more than a
// natural pause before its next repetition begins, this reliably tripped
// for long dhikr: onresult's own `i <= highestCommittedIndexRef.current`
// guard then silently dropped every later update to that still-live
// segment, permanently stalling the counting pipeline until Voice
// Tasbeeh was toggled off/on (a fresh session hands out fresh indices).
// The fix (softCommitInFlight in useVoiceTasbeeh.ts) locks in the
// checkpoint the SAME way, but leaves the index's in-flight tracking
// alive with a token-offset marker, so later updates to that same index
// are replayed only from the NEW tokens onward instead of being dropped
// or re-credited.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — long-utterance lifecycle regression suite (counts-once-then-stops fix)", () => {
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // real dhikr #5, 6 tokens
  const SALAWAT = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد"; // real dhikr #9, 7 tokens
  const SALAWAT_SPOKEN = "اللهم صل وسلم وبارك علي سيدنا محمد";
  const SHORT = "سبحان الله";
  const UNRELATED = "كلام غريب تماما لا علاقة له";

  // A. Long dhikr -> valid final -> next identical long dhikr -> valid count again.
  it("A. long dhikr, valid FINAL, then a second identical long dhikr on a fresh index -> +2", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  // B. Long dhikr -> one successful count -> several subsequent repetitions
  // without toggling Voice Tasbeeh, each separated by a natural pause long
  // enough to trip the settle timer, all on the SAME still-open segment.
  it("B. FOUR repetitions in a row on the same still-open segment, each separated by a settle-timer-triggering pause -> +4, no toggle needed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(LONG);
      let spoken = "";
      for (let rep = 1; rep <= 4; rep++) {
        spoken = spoken ? `${spoken} ${LONG}` : LONG;
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(spoken, 0.9, false));
        });
        expect(h.net()).toBe(rep);
        // Past VALID_SETTLE_DELAY_MS (1500ms) — the settle timer fires and
        // locks in this repetition's credit while the segment stays open.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        expect(h.net()).toBe(rep); // still just settled, not lost or duplicated
      }
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  // C. Recognition/session restart between repetitions.
  it("C. a real session restart (onend/onstart) between repetitions continues from the correct checkpoint with no toggle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(LONG);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
      });
      expect(h.net()).toBe(1);

      // The browser ends this continuous session on its own (silence, or
      // Safari's eager per-utterance ending) and useVoiceTasbeeh's own
      // onend handler auto-restarts it — no `enabled` toggle involved.
      await act(async () => {
        h.recognition.fireEnd();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PAST_RESTART_DELAY_MS);
      });

      // The new session's indices restart from 0.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
      });
      expect(h.net()).toBe(2);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  // D. Interim -> final -> next utterance.
  it("D. interim buildup to VALID, then FINAL, then a genuinely new utterance on the next index -> +2", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");
    for (let n = 1; n < words.length; n++) {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, n).join(" "), 0.9, false));
      });
    }
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  // E. Natural pauses inside a long dhikr (mid-utterance PENDING pause),
  // immediately followed by a settle-triggering pause after completion,
  // immediately followed by a second full repetition — exercises BOTH
  // forget-timer branches back to back on the same still-open segment.
  it("E. a mid-utterance pause (PENDING_ABANDON window) followed by a post-completion pause (VALID_SETTLE window), then a second repetition -> +2", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(LONG);
      const words = LONG.split(" ");

      // First half of rep 1, then a realistic breathing pause well under
      // PENDING_ABANDON_DELAY_MS (6000ms).
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0, false));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Completes rep 1.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, false));
      });
      expect(h.net()).toBe(1);

      // Pause past VALID_SETTLE_DELAY_MS before starting rep 2.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // Rep 2, on the SAME still-open segment.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(`${LONG} ${LONG}`, 0.9, true));
      });
      expect(h.net()).toBe(2);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  // F. The exact phrase reported as still failing.
  describe('F. "اللهم صل وسلم وبارك على سيدنا محمد"', () => {
    it("realistic interim buildup with a settle-triggering pause before a second repetition -> +2, no toggle needed", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(SALAWAT);
        const words = SALAWAT_SPOKEN.split(" ");
        for (let n = 1; n <= words.length; n++) {
          await act(async () => {
            h.recognition.fireResult(0, new MockResult(words.slice(0, n).join(" "), 0.9, n === words.length));
          });
        }
        expect(h.net()).toBe(1);

        // A reflective pause before repeating — well past VALID_SETTLE_DELAY_MS.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        await act(async () => {
          h.recognition.fireResult(1, new MockResult(SALAWAT_SPOKEN, 0.9, true));
        });
        expect(h.net()).toBe(2);
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it("with 'وسلم'/'وبارك' reported as split leading tokens, and a settle pause, THREE repetitions in a row -> +3", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(SALAWAT);
        const split = "اللهم صل و سلم و بارك علي سيدنا محمد";
        for (let rep = 1; rep <= 3; rep++) {
          const idx = rep - 1;
          await act(async () => {
            h.recognition.fireResult(idx, new MockResult(split, 0.9, true));
          });
          expect(h.net()).toBe(rep);
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1600);
          });
        }
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it("wrong/unrelated phrase against this target never counts, even after a settle-window pause", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(SALAWAT);
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
        });
        expect(h.net()).toBe(0);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(6500);
        });
        expect(h.net()).toBe(0);
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // G. 1-3 word adhkar must pass EXACTLY as before — this fix must be a
  // no-op for the protected short-dhikr path.
  describe("G. protected short-dhikr path is unaffected", () => {
    it("2-word dhikr: normal correct utterance -> +1", async () => {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0, false));
      });
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });

    it("2-word dhikr: wrong utterance -> 0", async () => {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(0);
      await h.unmount();
    });

    it("2-word dhikr: VALID reached as interim, settle-timer fires while segment stays open, THEN a second repetition on the SAME index -> +2 (same lifecycle fix, still correct at 2 tokens)", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(SHORT);
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
        });
        expect(h.net()).toBe(1);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(`${SHORT} ${SHORT}`, 0.9, true));
        });
        expect(h.net()).toBe(2);
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it("3-word dhikr (protected baseline): normal utterance -> +1, wrong utterance -> 0", async () => {
      const THREE = "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ";
      const h = await mountVoiceTasbeeh(THREE);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان الله وبحمده", 0.9, true));
      });
      expect(h.net()).toBe(1);
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(1); // must not roll back
      await h.unmount();
    });
  });

  // H. Duplicate/spurious final events must still not double-count, even
  // combined with the settle-timer soft-commit path.
  describe("H. duplicate-count protection is unaffected", () => {
    it("Android spurious duplicate-final immediately after a settle-timer soft commit -> still +1", async () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Linux; Android 13)", configurable: true });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(SHORT);
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
        });
        expect(h.net()).toBe(1);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        // Android's silent internal-recognizer restart re-fires the SAME
        // utterance as a brand-new isFinal result with confidence 0.
        await act(async () => {
          h.recognition.fireResult(1, new MockResult(SHORT, 0, true));
        });
        expect(h.net()).toBe(1);
        await h.unmount();
      } finally {
        vi.useRealTimers();
        Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
      }
    });

    it("re-emitting the SAME unchanged transcript on the same still-open segment after the settle timer fires never double-counts", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(LONG);
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(LONG, 0.9, false));
        });
        expect(h.net()).toBe(1);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        // Recognizer re-emits the identical text once more (a common
        // real-world pattern), still not final.
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(LONG, 0.9, false));
        });
        expect(h.net()).toBe(1);
        // ...and again, now marked final.
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
        });
        expect(h.net()).toBe(1);
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it("five rapid repetitions across settle-timer boundaries -> exactly +5, never more", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const h = await mountVoiceTasbeeh(LONG);
        let spoken = "";
        for (let rep = 1; rep <= 5; rep++) {
          spoken = spoken ? `${spoken} ${LONG}` : LONG;
          await act(async () => {
            h.recognition.fireResult(0, new MockResult(spoken, 0.9, false));
          });
          expect(h.net()).toBe(rep);
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1600);
          });
        }
        expect(h.net()).toBe(5);
        await h.unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

// ---------------------------------------------------------------------
// Regression suite for the resetAll() conflation bug: session/index
// bookkeeping (highestCommittedIndexRef, in-flight tracking, the forget
// timer — must reset on every recognizer restart, since a fresh
// `recognition.start()` renumbers result indices from 0) and
// match-PROGRESS state for the currently selected target
// (committedStateRef/committedTotalRef — must NOT reset just because the
// underlying session restarted) used to be wiped together by one
// function. Safari/iPad ends `continuous` sessions far more eagerly than
// Chrome, often mid-phrase for anything longer than a short dhikr, so a
// long dhikr's genuinely in-progress recitation kept getting silently
// reset back to zero before it could ever reach VALID — confirmed via a
// direct reproduction: speaking half of a target, restarting the
// session, then speaking the rest netted 0 before this fix. The fix
// (resetSessionBookkeeping() in useVoiceTasbeeh.ts) splits the two
// concerns; the session-restart path now uses ONLY the bookkeeping reset,
// preserving the checkpoint commitInFlight() just folded the ending
// session's progress into.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — session-restart checkpoint preservation (resetSessionBookkeeping fix)", () => {
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // real dhikr #5, 6 tokens
  const SALAWAT = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد"; // real dhikr #9, 7 tokens
  const SALAWAT_SPOKEN = "اللهم صل وسلم وبارك علي سيدنا محمد";
  const SHORT = "سبحان الله";
  const UNRELATED = "كلام غريب تماما لا علاقة له";

  // A. Long utterance split across multiple recognition sessions.
  it("A. a long dhikr split across THREE separate recognition sessions still completes -> +1", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" "); // 6 words

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(0, 2).join(" "), 0.9, false)); // session 1: first 2 words
    });
    expect(h.net()).toBe(0);
    await restartSession(h);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(2, 4).join(" "), 0.9, false)); // session 2: next 2 words
    });
    expect(h.net()).toBe(0);
    await restartSession(h);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(4).join(" "), 0.9, true)); // session 3: final 2 words
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // B. Long utterance with a natural pause causing a session restart.
  it("B. a natural mid-utterance pause triggers a real session restart, and the dhikr still completes -> +1", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");

    // First half, then the user pauses to breathe — long enough that the
    // browser (Safari-style) decides the session has ended.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0.9, false));
    });
    expect(h.net()).toBe(0);
    await restartSession(h);

    // The user, unaware anything happened, simply continues.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(3).join(" "), 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // C. Repeated long dhikr without requiring the user to restart Voice Tasbeeh.
  it("C. THREE full repetitions of a long dhikr, each interrupted by its own session restart, all count -> +3, no toggle needed", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");

    for (let rep = 1; rep <= 3; rep++) {
      // Each repetition gets its own session restart mid-phrase, AND a
      // restart between repetitions too (a session that just finalized an
      // index never reuses it for the next utterance — the next
      // repetition's words arrive at a genuinely new index, which a
      // restart naturally provides here, matching Safari's own eagerness
      // to restart sessions between utterances as well as within one).
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0.9, false));
      });
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(3).join(" "), 0.9, true));
      });
      expect(h.net()).toBe(rep);
      await restartSession(h);
    }
    await h.unmount();
  });

  // D. The existing 1-3 word regression tests remain unchanged and
  // passing (verified by the full suite run — see below); these add
  // explicit direct coverage of THIS fix's exact scenario at 2 and 3
  // tokens, confirming the session-restart checkpoint fix is harmless
  // there and doesn't alter their outcome.
  describe("D. protected short-dhikr path across a session restart", () => {
    it("2-word dhikr split across a session restart still completes normally -> +1", async () => {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
      });
      expect(h.net()).toBe(0);
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });

    it("2-word dhikr: wrong utterance across a session restart still correctly stays 0", async () => {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(0);
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(0);
      await h.unmount();
    });

    it("3-word dhikr (protected baseline) split across a session restart still completes -> +1", async () => {
      const THREE = "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ";
      const h = await mountVoiceTasbeeh(THREE);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, false));
      });
      expect(h.net()).toBe(0);
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("وبحمده", 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });

    it("selecting a DIFFERENT target still fully discards the previous target's committed progress (intentional full reset, unaffected by this fix)", async () => {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false)); // partial progress on SHORT
      });
      expect(h.net()).toBe(0);
      await h.setTarget(UNRELATED); // switch to an unrelated target mid-utterance
      await act(async () => {
        h.recognition.fireResult(1, new MockResult("سبحان الله", 0.9, true)); // SHORT's own text, but wrong target now
      });
      expect(h.net()).toBe(0); // must not resurrect the old target's progress
      await h.unmount();
    });
  });

  // E. The exact phrase reported as still failing.
  describe('E. "اللهم صل وسلم وبارك على سيدنا محمد" across session restarts', () => {
    it("split across a session restart mid-phrase -> +1 (previously netted 0 before this fix)", async () => {
      const h = await mountVoiceTasbeeh(SALAWAT);
      const words = SALAWAT_SPOKEN.split(" ");

      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0.9, false));
      });
      expect(h.net()).toBe(0);
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(3).join(" "), 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });

    it("split across TWO session restarts (three sessions total) -> +1", async () => {
      const h = await mountVoiceTasbeeh(SALAWAT);
      const words = SALAWAT_SPOKEN.split(" "); // 7 words

      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(0, 2).join(" "), 0.9, false));
      });
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(2, 5).join(" "), 0.9, false));
      });
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.slice(5).join(" "), 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });

    it("TWO full repetitions, each split by its own session restart -> +2, no toggle needed", async () => {
      const h = await mountVoiceTasbeeh(SALAWAT);
      const words = SALAWAT_SPOKEN.split(" ");

      for (let rep = 1; rep <= 2; rep++) {
        // Restart both mid-phrase AND between repetitions — a session
        // that just finalized an index never reuses it for the next
        // utterance, so the next repetition needs a genuinely new index,
        // which a restart naturally provides here.
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(words.slice(0, 4).join(" "), 0.9, false));
        });
        await restartSession(h);
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(words.slice(4).join(" "), 0.9, true));
        });
        expect(h.net()).toBe(rep);
        await restartSession(h);
      }
      await h.unmount();
    });

    it("wrong/unrelated phrase against this target still stays 0 across a session restart", async () => {
      const h = await mountVoiceTasbeeh(SALAWAT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(0);
      await restartSession(h);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(UNRELATED, 0.9, true));
      });
      expect(h.net()).toBe(0);
      await h.unmount();
    });

    it("a complete, unsplit recitation still counts normally with no restart involved -> +1", async () => {
      const h = await mountVoiceTasbeeh(SALAWAT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SALAWAT_SPOKEN, 0.9, true));
      });
      expect(h.net()).toBe(1);
      await h.unmount();
    });
  });
});

// ---------------------------------------------------------------------
// Regression suite for the ACCEPTED-REPETITION rollback fix, exercised
// through the REAL useVoiceTasbeeh hook (not just the pure matching
// simulator) — this is what actually runs in the app. Root cause: once a
// repetition reached VALID (onMatch already fired, visible +1), any
// further token in the SAME still-open segment that wasn't the target's
// own first word rolled it back (-1), even for a recognizer artifact
// trailing a complete, correct recitation. Fix: for targets > 3 tokens,
// that credit is now immediate and permanent. The protected 2-3 word
// path is unaffected and must still roll back on a genuine extension.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — accepted-repetition protection (LIVE, via the real hook)", () => {
  const SHORT = "سبحان الله";
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // real dhikr #5, 6 tokens

  it("long dhikr: accepted via interim, then the SAME segment revises to add a trailing noisy word -> credit SURVIVES (+1, not rolled back)", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, false)); // interim: reaches VALID
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${LONG} امم`, 0.9, false)); // same segment, noisy tail
    });
    expect(h.net()).toBe(1); // must NOT roll back
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${LONG} امم`, 0.9, true)); // finalizes with the noise still there
    });
    expect(h.net()).toBe(1); // still must not roll back
    await h.unmount();
  });

  it("2-word dhikr (protected): accepted via interim, then the SAME segment extends into a genuinely different phrase -> STILL rolls back to 0", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${SHORT} وبحمده`, 0.9, true));
    });
    expect(h.net()).toBe(0); // must still roll back — unchanged protected behavior
    await h.unmount();
  });

  it("long dhikr: after surviving noise, a genuine second repetition on a fresh index still counts -> +2 (no double-counting introduced)", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${LONG} امم`, 0.9, true)); // complete + noise, one final result
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(LONG, 0.9, true)); // genuinely new repetition, fresh index
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite reproducing the EXACT real device failure captured in
// debug-logs/dfdfdf.txt for target "سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ،
// وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ" (10 tokens). The exact
// raw transcript strings below are copied verbatim from that log's own
// onresult:raw lines (including the leading U+200F right-to-left mark
// character the real recognizer emitted, harmlessly stripped by
// normalizeArabicForMatch same as any other non-Arabic character) — not
// invented or paraphrased. On the OLD build (no STRUCTURAL commit-on-
// accept), replaying these exact strings through the real hook rolls the
// credit back to 0 exactly as the captured log shows
// (counter:increment delta:-1 at 20:57:05.395). This suite proves the
// CURRENT hook — not just the pure replayTokens function — no longer
// reproduces that failure.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — real device log reproduction (debug-logs/dfdfdf.txt)", () => {
  const TARGET = "سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ";
  // Verbatim from the log's onresult:raw transcript field at 20:56:59.752,
  // 20:57:03.414, and 20:57:06.796 respectively — three separate onresult
  // events for the SAME still-open segment (index 0, isFinal:false
  // throughout), the recognizer appending one more natural word each time.
  const RAW_1 = "‏سبحان الله والحمد لله ولا إله إلا الله الله أكبر اللهم اغفر لي اللهم ارحمني اللهم ارزقني سبحان الله والحمد لله ولا إله إلا الله و الله أكبر";
  const RAW_2 = "‏سبحان الله والحمد لله ولا إله إلا الله الله أكبر اللهم اغفر لي اللهم ارحمني اللهم ارزقني سبحان الله والحمد لله ولا إله إلا الله و الله أكبر اللهم";
  const RAW_3 = "‏سبحان الله والحمد لله ولا إله إلا الله الله أكبر اللهم اغفر لي اللهم ارحمني اللهم ارزقني سبحان الله والحمد لله ولا إله إلا الله و الله أكبر اللهم اغفر";

  it("H1/H2/H4: exact real transcripts — the embedded completion nets +1 and SURVIVES every subsequent trailing-word revision (real bug: this used to roll back to 0)", async () => {
    const h = await mountVoiceTasbeeh(TARGET);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0, false)); // embedded completion reached
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_2, 0, false)); // +"اللهم" — this is EXACTLY what rolled back to 0 on the real device
    });
    expect(h.net()).toBe(1); // must survive
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_3, 0, false)); // +"اغفر" — further natural continuation
    });
    expect(h.net()).toBe(1); // must still survive
    await h.unmount();
  });

  it("H7: the segment eventually finalizing with the trailing continuation still present does not lose the credit", async () => {
    const h = await mountVoiceTasbeeh(TARGET);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_3, 0.9, true)); // finalizes with the continuation still appended
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("H3: repeated identical ASR result (duplicate re-emission of RAW_1) never double-counts", async () => {
    const h = await mountVoiceTasbeeh(TARGET);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0, false)); // exact duplicate re-emission
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0.9, true)); // duplicate again, now final
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("H10: a genuinely NEW repetition after this one, still within the same open segment, adds its own +1 -> net +2", async () => {
    const h = await mountVoiceTasbeeh(TARGET);
    const words = tokenize(TARGET); // سبحان الله والحمد لله ولا اله الا الله والله اكبر
    const spoken = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(RAW_1, 0, false)); // first repetition, embedded
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      // The user continues into a completely fresh second repetition,
      // still on the SAME still-open segment.
      h.recognition.fireResult(0, new MockResult(`${RAW_3} لي اللهم ارحمني اللهم ارزقني ${spoken}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("H9: ASR temporarily drops the 'و' prefix (invalid) then self-corrects to the full correct word (valid) — recovery is harmless and still reaches +1", async () => {
    const h = await mountVoiceTasbeeh(TARGET);
    const words = tokenize(TARGET);
    const withoutWaw = [...words.slice(0, 8), "الله", words[9]].join(" "); // "الله" instead of "والله" at position 8 — the exact real ASR artifact
    const corrected = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(withoutWaw, 0, false)); // transient invalid
    });
    expect(h.net()).toBe(0);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(corrected, 0.9, true)); // corrects itself, same segment
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("protected short dhikr (unaffected): the SAME 'accept then extend' shape still correctly rolls back to 0", async () => {
    const SHORT = "سبحان الله";
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${SHORT} وبحمده`, 0.9, true));
    });
    expect(h.net()).toBe(0); // unchanged, protected behavior
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite for the COMMITTED-PREFIX-DRIFT bug (commonPrefixLength
// fix in voiceTasbeehMatch.ts / useVoiceTasbeeh.ts). Root cause: once a
// repetition reaches VALID for a target longer than 3 tokens, structural
// commit-on-accept (and the settle/abandon forget-timers) immediately
// fold its credit into committedTotalRef and must stop the NEXT replay
// of this same still-open segment from re-matching (and re-crediting)
// the tokens that already earned it. The OLD implementation remembered
// only a plain COUNT of how many tokens to skip on the next replay. But a
// `continuous` recognizer can revise ANY part of a still-open segment's
// transcript, including words reported several events ago — this file's
// own top-of-file architecture note and voiceTasbeehMatch.ts's own
// replayTokens doc both already establish this, and a real captured
// on-device session (debug-logs/dfdfdf.txt) shows exactly this kind of
// revision happening to already-matched tokens for this app's own
// 10-token dhikr. If a later revision SHRINKS the recognizer's own
// word-count for that already-committed span, the stored count
// overshoots the segment's new, shorter length: slicing at that stale
// count skips past the genuine opening tokens of the NEXT repetition,
// which then never restarts (its target's own first word never arrives
// in the replayed tail) — permanently losing every further repetition
// for the rest of that segment. Confirmed via direct reproduction against
// the real hook before this fix (net stuck at 1 instead of 2). The fix
// (commonPrefixLength) compares the actual committed TOKENS against the
// segment's current tokens position-by-position instead of trusting a
// stored length, which can only find an equal-or-shorter overlap than the
// true committed span — never an overshoot — so it can, at worst,
// harmlessly re-offer a few already-credited tokens to the fresh
// checkpoint (where they simply fail to match the target's own first
// word), but can never skip into the next repetition's own genuine start.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — committed-prefix-drift regression (commonPrefixLength fix)", () => {
  const TAHLEEL = "سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ"; // real dhikr #11, 10 tokens
  const SALAWAT = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد"; // real dhikr #9, 7 tokens — the successful reference case
  const SALAWAT_SPOKEN = "اللهم صل وسلم وبارك علي سيدنا محمد";

  it("a shrinking mid-segment ASR revision of an already-committed repetition must not swallow the next repetition -> +2 (previously stuck at +1)", async () => {
    const words = tokenize(TAHLEEL); // سبحان الله والحمد لله ولا اله الا الله والله اكبر
    const h = await mountVoiceTasbeeh(TAHLEEL);

    // Rep 1, spoken correctly, reaches VALID via an INTERIM result — this
    // is what fires structural commit-on-accept and snapshots the
    // committed tokens (real dhikr recitations very often reach
    // completion before the recognizer ever marks a result final).
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.join(" "), 0, false));
    });
    expect(h.net()).toBe(1);

    // The SAME still-open segment's next revision "forgets" one
    // previously-transcribed word from rep 1's own already-committed span
    // (dropping "الا" entirely — a genuine ASR word-count revision, the
    // same class of mid-segment revision the real captured log shows for
    // this exact phrase), while genuinely continuing into a fresh,
    // complete second repetition right after.
    const shrunkRep1 = [...words.slice(0, 6), ...words.slice(7)].join(" "); // "الا" dropped
    const rep2 = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep1} ${rep2}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("THREE repetitions in a row, each preceded by a shrinking revision of the previous one's committed span, still count exactly -> +3", async () => {
    const words = tokenize(TAHLEEL);
    const shrunkRep = [...words.slice(0, 6), ...words.slice(7)].join(" ");
    const fullRep = words.join(" ");
    const h = await mountVoiceTasbeeh(TAHLEEL);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(fullRep, 0, false));
    });
    expect(h.net()).toBe(1);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep} ${fullRep}`, 0, false));
    });
    expect(h.net()).toBe(2);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep} ${fullRep} ${shrunkRep} ${fullRep}`, 0.9, true));
    });
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  it("a GROWING mid-segment revision (an extra stray word inserted into the already-committed span) still counts the next repetition normally -> +2", async () => {
    const words = tokenize(TAHLEEL);
    const h = await mountVoiceTasbeeh(TAHLEEL);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.join(" "), 0, false));
    });
    expect(h.net()).toBe(1);

    // The recognizer's revision inserts a stray extra "الله" into rep 1's
    // own already-committed span (the exact artifact named in the bug
    // report), then continues into a genuine second repetition.
    const grownRep1 = [...words.slice(0, 8), "الله", ...words.slice(8)].join(" ");
    const rep2 = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${grownRep1} ${rep2}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("does not weaken duplicate protection: an unchanged re-emission after a shrinking revision never double-counts", async () => {
    const words = tokenize(TAHLEEL);
    const shrunkRep1 = [...words.slice(0, 6), ...words.slice(7)].join(" ");
    const rep2 = words.join(" ");
    const h = await mountVoiceTasbeeh(TAHLEEL);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.join(" "), 0, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep1} ${rep2}`, 0.9, false));
    });
    expect(h.net()).toBe(2);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep1} ${rep2}`, 0.9, true)); // unchanged re-emission, now final
    });
    expect(h.net()).toBe(2); // must not double-count
    await h.unmount();
  });

  it("SALAWAT (the successful reference case) is completely unaffected by this fix: normal completion still +1", async () => {
    const h = await mountVoiceTasbeeh(SALAWAT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SALAWAT_SPOKEN, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("SALAWAT: two repetitions in the same still-open segment, with a settle-timer pause between them, still count -> +2", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SALAWAT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SALAWAT_SPOKEN, 0.9, false));
      });
      expect(h.net()).toBe(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600); // past VALID_SETTLE_DELAY_MS
      });
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(`${SALAWAT_SPOKEN} ${SALAWAT_SPOKEN}`, 0.9, true));
      });
      expect(h.net()).toBe(2);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("SALAWAT: a shrinking mid-segment revision of its own committed span (same class of drift) still allows a genuine second repetition -> +2", async () => {
    const words = tokenize(SALAWAT);
    const h = await mountVoiceTasbeeh(SALAWAT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SALAWAT_SPOKEN, 0, false));
    });
    expect(h.net()).toBe(1);

    const shrunkRep1 = [...words.slice(0, 2), ...words.slice(3)].join(" "); // drop "صل"
    const rep2 = SALAWAT_SPOKEN;
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep1} ${rep2}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite for the SELF-REPEATING-TARGET hardening in
// commonPrefixLength (voiceTasbeehMatch.ts). Root cause of the risk this
// closes: `LONG_TARGET` ("سبحان الله وبحمده سبحان الله العظيم", real
// dhikr #5) repeats its own first word "سبحان" at index 3. Since a
// committed snapshot is always exactly one full pass of the target,
// `committedTokens[3] === committedTokens[0]` for this specific target —
// so once a revision shrinks a completed repetition's own span, a
// genuinely new, fully-correct second repetition can land its own
// opening "سبحان" at exactly that repeated index, and an unguarded
// content scan would keep matching a few further coincidental positions
// before the true divergence appears, silently swallowing the new
// repetition's own opening tokens as if they were still the old,
// already-credited span — missing that repetition's credit entirely
// (confirmed via direct reproduction against this exact target before
// the hardening landed: net stuck at 1 instead of 2).
//
// This suite also re-confirms the hardening's OWN safety net: fixing
// this must not regress the real-device-log reproduction suite further
// up this file (debug-logs/dfdfdf.txt), whose committed snapshot
// legitimately contains "سبحان" more than once with zero drift at all —
// an earlier, over-eager version of this guard broke exactly that case
// (confirmed by direct reproduction, then fixed), so it is re-verified
// here as a standing regression test rather than relying only on the
// existing "H1/H2/H4" suite to catch a future re-regression.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — self-repeating-target hardening (commonPrefixLength Risk-A fix)", () => {
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // real dhikr #5, 6 tokens — target[3] === target[0]
  const TAHLEEL = "سُبْحَانَ الْلَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا الْلَّهُ، وَالْلَّهُ أَكْبَرُ"; // real dhikr #11, 10 tokens
  const SALAWAT = "الْلَّهُم صَلِّ وَسَلِم وَبَارِك عَلَى سَيِّدِنَا مُحَمَّد"; // real dhikr #9, 7 tokens — the successful reference case

  it("LONG_TARGET: a shrinking revision that lands exactly on the self-repeating boundary still counts the genuine second repetition -> +2 (previously stuck at +1)", async () => {
    const words = tokenize(LONG);
    const h = await mountVoiceTasbeeh(LONG);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.join(" "), 0, false));
    });
    expect(h.net()).toBe(1);

    // Drops the LAST 3 words of the committed repetition (leaving exactly
    // "سبحان الله وبحمده", 3 tokens) — the recognizer's revision, followed
    // immediately by a genuine, fully-correct second repetition. Because
    // target[3]==="سبحان"===target[0], an unguarded scan would coincidentally
    // keep matching 2 further positions ("سبحان","الله") into rep 2's own
    // opening before noticing the true divergence.
    const shrunkRep1 = words.slice(0, 3).join(" ");
    const rep2 = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${shrunkRep1} ${rep2}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("LONG_TARGET: the shrinking-drift pattern resolves correctly across THREE independent segments in a row, never stalling or drifting into a wrong count", async () => {
    // Each iteration gets its OWN fresh segment/index — the realistic
    // shape for repetitions separated by a natural pause — rather than
    // chaining multiple drift events within ONE never-finalizing segment,
    // which would also exercise applyToken's own restart semantics for
    // an INCOMPLETE partial attempt immediately followed by a full one on
    // a self-repeating target: a separate, pre-existing property of the
    // matching engine, unrelated to the commonPrefixLength hardening this
    // suite targets. Each segment independently reproduces the single-rep
    // drift scenario (interim completion, then a same-segment revision
    // that shrinks that completed span at the self-repeating boundary,
    // immediately followed by a genuine second repetition) — +2 net per
    // segment, so 3 segments must reach net +6, with no drift or stall
    // carrying over between segments.
    const words = tokenize(LONG);
    const shrunkRep1 = words.slice(0, 3).join(" ");
    const fullRep = words.join(" ");
    const h = await mountVoiceTasbeeh(LONG);

    for (let seg = 1; seg <= 3; seg++) {
      const idx = seg - 1; // each iteration is its own fresh segment/index
      await act(async () => {
        h.recognition.fireResult(idx, new MockResult(fullRep, 0, false));
      });
      expect(h.net()).toBe(seg * 2 - 1);
      // Same segment (same index), still open — the revision that shrinks
      // this segment's own already-committed span, then completes a
      // genuine second repetition within it.
      await act(async () => {
        h.recognition.fireResult(idx, new MockResult(`${shrunkRep1} ${fullRep}`, 0.9, true));
      });
      expect(h.net()).toBe(seg * 2);
    }
    await h.unmount();
  });

  it("LONG_TARGET: a growing revision (extra word inserted right at the self-repeating boundary) still counts the next repetition normally -> +2", async () => {
    const words = tokenize(LONG);
    const h = await mountVoiceTasbeeh(LONG);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.join(" "), 0, false));
    });
    expect(h.net()).toBe(1);

    // Inserts a stray extra "سبحان" right before the committed span's own
    // repeated "سبحان" at index 3 — the SAME self-repeating position, but
    // growing instead of shrinking.
    const grownRep1 = [...words.slice(0, 3), "سبحان", ...words.slice(3)].join(" ");
    const rep2 = words.join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${grownRep1} ${rep2}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("LONG_TARGET: unaffected in the stable (no-drift) case — clean back-to-back repetitions still count normally -> +2", async () => {
    const words = tokenize(LONG);
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${words.join(" ")} ${words.join(" ")}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  it("SALAWAT (the successful reference case) is unaffected: normal completion still +1, and a settle-window second repetition still +2", async () => {
    const h = await mountVoiceTasbeeh(SALAWAT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("اللهم صل وسلم وبارك علي سيدنا محمد", 0.9, true));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(1, new MockResult("اللهم صل وسلم وبارك علي سيدنا محمد", 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  // The original real-world failure case: the 10-token dhikr stalling
  // after the first or second repetition. TAHLEEL's own first word
  // ("سبحان") never recurs elsewhere in its 10-token sequence, so this
  // hardening is a structural no-op for it — re-verified here end-to-end,
  // continuing for a THIRD repetition, to directly cover the reported
  // "sometimes works once or twice, then stops" symptom.
  it("TAHLEEL (the originally reported 10-token stall case): three repetitions in a row, each with a realistic single-word drift, still count exactly -> +3, never stalling", async () => {
    const words = tokenize(TAHLEEL);
    const fullRep = words.join(" ");
    // The exact real ASR artifact from debug-logs/target-session.txt: the
    // "و" of "والله" (index 8) reported as its own separate leading token.
    const splitRep = [...words.slice(0, 8), "و", words[8].slice(1), words[9]].join(" ");
    const h = await mountVoiceTasbeeh(TAHLEEL);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(fullRep, 0, false));
    });
    expect(h.net()).toBe(1);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${fullRep} ${splitRep}`, 0, false));
    });
    expect(h.net()).toBe(2);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${fullRep} ${splitRep} ${fullRep}`, 0.9, true));
    });
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  // Re-confirms the hardening's own safety net (see this suite's own
  // top-of-block doc): a committed snapshot that legitimately contains
  // the target's first word more than once, with zero drift afterward,
  // must still be trusted in full. Mirrors the shape of the real captured
  // device transcript (debug-logs/dfdfdf.txt, exercised in the
  // "real device log reproduction" suite above) but constructed directly
  // against TAHLEEL to stand on its own as a regression test for the
  // over-eager first version of this guard (which broke exactly this).
  it("a committed snapshot containing the target's first word more than once (no drift) is still trusted in full — the H1/H2/H4 shape, standalone", async () => {
    const words = tokenize(TAHLEEL);
    const failedFirstAttempt = words.slice(0, 3).join(" "); // "سبحان الله والحمد" then trails off into something else
    const unrelatedFiller = "امم شيء غير مكتمل";
    const genuineCompletion = words.join(" ");
    const h = await mountVoiceTasbeeh(TAHLEEL);

    // Everything below arrives as ONE event (mirrors a real transcript
    // where a failed partial attempt and the real completion both land
    // within the same recognition result).
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${failedFirstAttempt} ${unrelatedFiller} ${genuineCompletion}`, 0, false));
    });
    expect(h.net()).toBe(1);

    // A later event simply appends one more trailing word — nothing
    // before it changes at all. The committed snapshot's own two "سبحان"
    // occurrences (the failed attempt's and the real completion's) must
    // not cause this stable append to be misread as drift.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${failedFirstAttempt} ${unrelatedFiller} ${genuineCompletion} اللهم`, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Voice inactivity timeout (60s) — see INACTIVITY_TIMEOUT_MS in
// useVoiceTasbeeh.ts. Distinct from VALID_SETTLE_DELAY_MS/
// PENDING_ABANDON_DELAY_MS (which only ever bound a single in-flight
// segment's bookkeeping): this is a SESSION-level guard that stops
// SpeechRecognition and releases the microphone entirely once there has
// been zero genuine recognized speech for the whole window, so a Voice
// Tasbeeh session can never keep the mic open forever after the user has
// stopped speaking (and stopped/walked away).
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — voice inactivity timeout (60s)", () => {
  const SHORT = "سبحان الله";

  it("60 seconds with zero recognized speech stops recognition, releases the mic, and returns the UI to idle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      expect(h.recognition.started).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      expect(h.recognition.started).toBe(false); // abort() was called
      expect(h.status()).toBe("idle");
      expect(h.net()).toBe(0);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("genuine speech activity resets the clock — no timeout while real speech keeps arriving", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);

      // 40s of silence...
      await act(async () => {
        await vi.advanceTimersByTimeAsync(40000);
      });
      expect(h.recognition.started).toBe(true);

      // ...then a genuine utterance resets the 60s clock...
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
      });
      expect(h.net()).toBe(1);

      // ...so another 40s (80s total, but only 40s since the last real
      // activity) must NOT time out.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(40000);
      });
      expect(h.recognition.started).toBe(true);
      expect(h.status()).not.toBe("idle");

      // The remaining 20s (60s since that last genuine activity) does.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
      });
      expect(h.recognition.started).toBe(false);
      expect(h.status()).toBe("idle");
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("repeated IDENTICAL (duplicate) interim results never reset the clock by themselves — the timeout still fires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
      });

      // Re-emit the SAME unchanged transcript every 10s for 50s — none of
      // these are genuine NEW activity (they hit the existing
      // "duplicate ignored: unchanged-transcript" path), so they must not
      // hold the timeout off.
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10000);
        });
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
        });
      }

      // 60s total since the ONE genuine event at t=0.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(h.recognition.started).toBe(false);
      expect(h.status()).toBe("idle");
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("the inactivity timeout's own cleanup never fires a spurious onMatch/onRollback — it cannot manufacture or erase a repetition", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
      });
      expect(h.net()).toBe(1);
      const matchCallsBefore = h.matches.length;
      const rollbackCallsBefore = h.rollbacks.length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });

      expect(h.matches.length).toBe(matchCallsBefore);
      expect(h.rollbacks.length).toBe(rollbackCallsBefore);
      expect(h.net()).toBe(1);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("unmounting clears the inactivity timer — no stray abort or status change fires after cleanup", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      await h.unmount();
      // If the inactivity timer weren't cleared on cleanup, this would
      // eventually try to abort()/setState against an unmounted instance.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(70000);
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------
// Single-commit guard — reproduces the exact reported log pattern:
//   repetition committed (reason: settle-timer-fired)
//   duplicate ignored (reason: unchanged-transcript)
//   repetition committed (reason: isFinal-unchanged-transcript)
// The COUNT was never wrong here (see the "H. duplicate-count protection"
// suite above, unchanged) — but commitInFlight used to log a second,
// redundant "repetition committed" for content a forget-timer had already
// folded into the checkpoint. This asserts the stronger, log-level
// invariant requirement 4 actually asks for: the exact same segment index
// can never be logged as committed more than once, no matter which call
// site (isFinal, a segment switch, a session restart, or the inactivity
// timeout above) gets there first.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — single-commit guard (no duplicate 'repetition committed' through different code paths)", () => {
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // >3 tokens — exercises the settle-timer/structural-commit path

  function committedIndices(logSpy: ReturnType<typeof vi.spyOn>) {
    return logSpy.mock.calls
      .filter((args) => args[0] === "[voice] repetition committed")
      .map((args) => (args[1] as { index: number }).index);
  }

  it("a settle-timer soft commit followed by a same-content isFinal re-emission logs the commit exactly once for that index", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const h = await mountVoiceTasbeeh(LONG);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, false));
      });
      expect(h.net()).toBe(1);

      // VALID_SETTLE_DELAY_MS fires -> soft-commit ("settle-timer-fired").
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      // The recognizer re-emits the identical transcript once more, now
      // marked final — the exact "duplicate ignored: unchanged-
      // transcript" -> "isFinal-unchanged-transcript" sequence reported.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
      });

      expect(h.net()).toBe(1); // never double-counted
      const indices = committedIndices(logSpy);
      expect(new Set(indices).size).toBe(indices.length); // index 0 never committed twice
      expect(indices.length).toBeGreaterThanOrEqual(1);
      expect(logSpy.mock.calls.some((args) => args[0] === "[voice] commit skipped — already settled")).toBe(true);
      await h.unmount();
    } finally {
      logSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("a settled segment retired via a genuinely NEW segment (index switch) is still never double-committed, and the new segment counts normally", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const h = await mountVoiceTasbeeh(LONG);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, false));
      });
      expect(h.net()).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600); // settle-timer-fired soft commit on index 0
      });

      // A genuinely NEW segment (fresh index) starts — commitInFlight
      // ("segment-switch") retires the OLD, already-settled index first.
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(LONG, 0.9, true));
      });

      expect(h.net()).toBe(2); // the new segment is a genuine second repetition
      const indices = committedIndices(logSpy);
      expect(new Set(indices).size).toBe(indices.length); // no index committed twice
      await h.unmount();
    } finally {
      logSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------
// Regression suite for the commit-vs-count invariant reported against a
// live device log for "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ
// الْعَظِيمِ" (real dhikr #5, 6 tokens — LONG below). The report showed
// "repetition committed" firing for isFinal on an INVALID transcript
// (["سبحان","وبحمده"]) and on a PENDING one (["سبحان"]), which read as
// though an incomplete attempt was being counted. It never actually was —
// the visible counter is driven exclusively by replayTokens/applyDelta
// reaching VALID (see applyDelta's call site in onresult), never by
// commitInFlight/softCommitInFlight, which only ever finalize the
// checkpoint used to replay the NEXT segment — but the log line's name
// didn't say so. The fix renames that non-valid case to "checkpoint
// carried forward" (commitLogEvent in useVoiceTasbeeh.ts); this suite
// proves the underlying COUNTING invariant the rename documents, cases
// A-F from the report, end to end through the real hook.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — commit-vs-count invariant (LONG dhikr #5)", () => {
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // real dhikr #5, 6 tokens

  it("A: a partial (1-of-6-token) transcript that finalizes via isFinal does not increment the counter", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, true)); // only the first word, already marked final
    });
    expect(h.net()).toBe(0);
    expect(h.matches).toEqual([]);
    await h.unmount();
  });

  it("B: an invalid transcript (breaks the target's own word order) that finalizes via isFinal does not increment the counter", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    // "سبحان" then "وبحمده" — skips "الله" at position 1, so this breaks
    // the prefix and lands INVALID (never credited) — exactly the
    // ["سبحان","وبحمده"] transcript from the report.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان وبحمده", 0.9, false));
    });
    // The SAME (unchanged) invalid transcript is re-emitted once more,
    // this time marked final — the exact "duplicate ignored: unchanged-
    // transcript" -> "isFinal-unchanged-transcript" sequence reported.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان وبحمده", 0.9, true));
    });
    expect(h.net()).toBe(0);
    expect(h.matches).toEqual([]);
    await h.unmount();
  });

  it("C: a genuinely complete 6-token repetition increments the counter by exactly one", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(1);
    expect(h.matches).toEqual([1]);
    await h.unmount();
  });

  it("D: after reaching VALID, the same still-open segment growing with the START of the next repetition does not roll back the completed one", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, false)); // interim reaches valid:6
    });
    expect(h.net()).toBe(1);
    // The browser keeps extending the SAME transcript with the next
    // repetition's opening word, still interim — exactly the
    // [...LONG,"سبح"] growth from the report.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${LONG} سبح`, 0.9, false));
    });
    expect(h.net()).toBe(1); // must NOT roll back the already-completed repetition
    await h.unmount();
  });

  it("E: a settle-timer soft commit and a later isFinal on the same segment cannot double-commit the same repetition", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(LONG);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, false)); // interim reaches valid:6
      });
      expect(h.net()).toBe(1);

      // VALID_SETTLE_DELAY_MS elapses with no further speech — the
      // settle timer soft-commits this segment's credit.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });
      expect(h.net()).toBe(1);

      // The SAME segment later finalizes (isFinal) with no new words —
      // this must be recognized as already-settled, not a second commit.
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
      });
      expect(h.net()).toBe(1); // still exactly one credited repetition
      expect(h.matches).toEqual([1]);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("F: a second valid repetition appended to the same continuously growing transcript is counted exactly once", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, false)); // rep 1 reaches valid:6, interim
    });
    expect(h.net()).toBe(1);
    // Same still-open segment grows to include a full second repetition.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${LONG} ${LONG}`, 0.9, true));
    });
    expect(h.net()).toBe(2);
    expect(h.matches).toEqual([1, 1]);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite for the TARGET-CHANGE STALE-INDEX FLOOR
// (highestSeenIndexRef in useVoiceTasbeeh.ts). Root cause: recognition
// keeps running continuously across a dhikr switch (by design — switching
// dhikr must not restart the mic), so a result index that was already
// accumulating words under the OLD target — finalized or still
// in-flight — can arrive AFTER the switch, carrying that OLD target's own
// cumulative transcript. The old `resetAll("target-changed")` reset
// highestCommittedIndexRef all the way to -1, so that stale index looked
// exactly like a brand-new segment to the NEW target's matcher and got
// tokenized/replayed against it. Several real adhkar share a literal
// prefix ("سبحان الله"), so a stale segment's tokens can look like
// genuine partial progress toward the new target purely by coincidence —
// up to and including completing it from a single, later, unrelated word
// (see the "FALSE-POSITIVE GUARD" case below for the exact mechanism).
// The fix passes the run's current high-water mark of every index ever
// seen (highestSeenIndexRef, updated unconditionally for every index
// onresult's loop touches) as the new floor on a target change, so any
// index at or below it is skipped via the EXISTING "stale result ignored"
// guard, before any tokenizing/replay/commit logic for the new target
// ever sees it.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — target-change stale-transcript regression suite (shared-prefix adhkar)", () => {
  const A = "سبحان الله"; // 2 tokens
  const B = "سبحان الله وبحمده سبحان الله العظيم"; // 6 tokens — shares the "سبحان الله" prefix with A
  const C = "سبحان الله وبحمده"; // 3 tokens — ALSO shares that same prefix

  it("REQUIRED SEQUENCE: stale in-flight results from Target A delivered after switching to Target B do not advance B, then a genuine B recitation still counts exactly once", async () => {
    const h = await mountVoiceTasbeeh(A);

    // 1-2: Target A recognized normally, via an INTERIM result on index 0
    // (continuous mode keeps this index open, not yet finalized).
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, false));
    });
    expect(h.net()).toBe(1);

    // 3: switch to Target B — the underlying recognizer keeps running,
    // completely unaware of the switch, on the SAME session/index.
    await h.setTarget(B);

    // 4: the recognizer, unaware of the switch, keeps delivering updates
    // to that SAME still-open index — first re-emitting the exact stale
    // "سبحان الله" transcript, then finalizing it.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.95, true));
    });

    // 5: none of that may advance B's progress or count anything new.
    expect(h.net()).toBe(1);
    expect(h.matches).toEqual([1]);

    // 6-7: a genuinely fresh, complete Target B recitation, on a NEW
    // index, still counts exactly once.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(B, 0.9, true));
    });
    expect(h.net()).toBe(2);
    expect(h.matches).toEqual([1, 1]);

    await h.unmount();
  });

  it("FALSE-POSITIVE GUARD: a stale Target-A segment finalizing right after switching to a 3-token Target C (also starting with \"سبحان الله\") must not let one later stray word complete C", async () => {
    const h = await mountVoiceTasbeeh(A);

    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, false));
    });
    expect(h.net()).toBe(1);

    await h.setTarget(C);

    // Stale finalization of the SAME index, still carrying Target A's own
    // text — which happens to equal C's own first two words exactly.
    // Without the fix, replaying this against C's matcher leaves a
    // phantom "2 of 3 words already matched" checkpoint, even though the
    // user never said a single word toward C yet.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.95, true));
    });
    expect(h.net()).toBe(1); // must not advance C's progress at all

    // A single, later, unrelated stray word arrives on a fresh index —
    // NOT a recitation of C. With the phantom checkpoint above, this
    // word alone happens to be C's own third and final word, which would
    // wrongly complete C from leftover Target-A content.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult("وبحمده", 0.9, true));
    });
    expect(h.net()).toBe(1); // must NOT complete C via leftover A progress

    // A genuine, complete recitation of C still counts normally.
    await act(async () => {
      h.recognition.fireResult(2, new MockResult(C, 0.9, true));
    });
    expect(h.net()).toBe(2);
    expect(h.matches).toEqual([1, 1]);

    await h.unmount();
  });

  it("REVERSE: stale in-flight results from Target B delivered after switching back to Target A do not advance A", async () => {
    const h = await mountVoiceTasbeeh(B);

    // Target B partially recited, still open (interim) on index 0 —
    // genuinely begins with "سبحان الله", same as Target A.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله وبحمده", 0.9, false));
    });
    expect(h.net()).toBe(0); // not yet complete for B

    await h.setTarget(A);

    // The recognizer finalizes that SAME stale segment after the switch.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله وبحمده", 0.95, true));
    });
    expect(h.net()).toBe(0); // must NOT retroactively complete A either

    // A genuine, fresh Target A recitation still counts normally.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(A, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("MULTI-ADHKAR CHURN: switching between three adhkar that all share \"سبحان الله\" never lets stale in-flight content from one contaminate the next", async () => {
    const h = await mountVoiceTasbeeh(A);

    // A recognized, still open.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, false));
    });
    expect(h.net()).toBe(1);

    await h.setTarget(C); // switch 1: A -> C
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.95, true)); // stale A finalizing under C
    });
    expect(h.net()).toBe(1);

    await h.setTarget(B); // switch 2: C -> B, with nothing genuinely said for C
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(C, 0.9, false)); // a stray, now-stale attempt at C, left open
    });
    expect(h.net()).toBe(1);

    await h.setTarget(A); // switch 3: B -> A
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(C, 0.95, true)); // that same stale segment finally finalizes, now under A
    });
    expect(h.net()).toBe(1); // must not complete A via C's leftover tokens

    // A genuine, fresh Target A recitation on a brand-new index still counts.
    await act(async () => {
      h.recognition.fireResult(2, new MockResult(A, 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite for the OPEN-INDEX TARGET-SWITCH BOUNDARY fix —
// confirmed on a real device: a result index can stay open (still
// receiving updates) ACROSS a dhikr switch, for many seconds, with the
// OLD floor-only guard treating that whole index as permanently stale —
// correctly rejecting pre-switch content, but ALSO silently discarding
// every word spoken toward the NEW target for as long as the recognizer
// kept extending that SAME index instead of starting a fresh one (the
// real log showed ~15 seconds and two consecutive target switches worth
// of genuine speech lost this way). Fix: capture the open index's exact
// token snapshot at the moment of the switch and seed the existing
// commonPrefixLength checkpoint with it, so only that specific pre-
// switch prefix is excluded — everything appended afterward is replayed
// normally against the new target.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — open-index target-switch boundary", () => {
  const A = "سبحان الله"; // 2 tokens
  const B = "الحمد لله"; // 2 tokens, unrelated content (isolates this suite from the shared-prefix suite above)

  it("A: SAME INDEX, OLD CONTENT ONLY -- re-emitting the unchanged pre-switch transcript on the still-open index must not count toward the new target", async () => {
    const h = await mountVoiceTasbeeh(A);
    // Index 0 left OPEN (interim, not final) at the moment of the switch.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    expect(h.net()).toBe(0);

    await h.setTarget(B);

    // The SAME index continues, re-emitting the exact same pre-switch
    // content (no new words at all).
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    expect(h.net()).toBe(0); // no count for B from purely pre-switch content
    await h.unmount();
  });

  it("B: SAME INDEX, NEW SUFFIX -- genuinely new tokens appended after the switch on the SAME index must count toward the new target", async () => {
    const h = await mountVoiceTasbeeh(A);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false)); // pre-switch: 1 stray token, index 0 stays open
    });
    expect(h.net()).toBe(0);

    await h.setTarget(B);

    // Same index (0) continues; the FULL new-target phrase is appended
    // after the pre-switch "سبحان".
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`سبحان ${B}`, 0.9, true));
    });
    expect(h.net()).toBe(1); // the genuinely new post-switch "الحمد لله" counts
    await h.unmount();
  });

  it("C: SAME INDEX, OLD PREFIX + NEW SUFFIX -- only the post-switch portion may ever contribute, never the pre-switch prefix", async () => {
    const h = await mountVoiceTasbeeh(A);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, false)); // pre-switch: a FULL "سبحان الله" left open (not final)
    });
    expect(h.net()).toBe(1); // credited under A while A is still selected

    await h.setTarget(B);

    // Same index continues: the pre-switch "سبحان الله" is still present
    // verbatim, with the genuine new-target phrase appended after it.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`${A} ${B}`, 0.9, true));
    });
    // The pre-switch "سبحان الله" must not ALSO be evaluated against B
    // (it isn't B's own words at all, so it would score nothing anyway —
    // the real assertion is that exactly one new B repetition lands).
    expect(h.net()).toBe(2); // 1 (A, pre-switch) + 1 (B, genuine post-switch)
    await h.unmount();
  });

  it("D: NEW INDEX AFTER SWITCH -- a genuinely fresh result index after the switch counts completely normally", async () => {
    const h = await mountVoiceTasbeeh(A);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false)); // left open pre-switch
    });
    expect(h.net()).toBe(0);

    await h.setTarget(B);

    // The recognizer rotates to a genuinely NEW index instead of
    // continuing index 0 -- ordinary, already-tested behavior, must
    // still work unaffected by this fix.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(B, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  it("E: RAPID MULTIPLE TARGET SWITCHES -- the same open index surviving several switches never lets stale content from an earlier target contaminate the current one, while genuine post-switch content keeps counting", async () => {
    const C = "سبحان الله وبحمده"; // 3 tokens, shares a prefix with A -- deliberately reused from the suite above
    const h = await mountVoiceTasbeeh(A);

    // Pre-switch-1: a stray "سبحان" left open on index 0.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    expect(h.net()).toBe(0);

    await h.setTarget(C); // switch 1: A -> C, index 0 still open

    // Same index continues: the stray "سبحان" (pre-switch-1) plus a
    // genuine partial start of C ("سبحان الله") -- not yet complete for C.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان سبحان الله", 0.9, false));
    });
    expect(h.net()).toBe(0); // C is 3 tokens; only 2 genuine tokens so far

    await h.setTarget(B); // switch 2: C -> B, index 0 STILL open, nothing ever completed C

    // Same index continues again: everything before this point (from A
    // AND from the incomplete C attempt) must be excluded; only a
    // genuinely new B phrase appended now may count.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`سبحان سبحان الله ${B}`, 0.9, true));
    });
    expect(h.net()).toBe(1); // exactly the one genuine B repetition, nothing from A or the abandoned C attempt
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Characterization suite for a reported "8 -> 17" over-counting failure
// on the SHORT (2-token) dhikr "سبحان الله", where a single, never-
// finalizing, continuously-growing recognition result (one result index,
// no session restart, no target switch) allegedly caused the counter to
// advance far beyond the number of genuinely completed repetitions.
//
// Investigation: this shape was reproduced directly against the exact
// growing-transcript patterns described (clean alternating growth, growth
// with a dangling extra "سبحان" between pairs exactly as reported, and
// growth interleaved with real VALID_SETTLE_DELAY_MS gaps) — in every
// case, `replayTokens`'s full-replay-from-checkpoint diffed against
// `inFlightTotalRef` (see onresult's `delta = replayTotal -
// inFlightTotalRef.current`) credited EXACTLY one repetition per genuine
// "سبحان"+"الله" pair present in the token stream, never more. This
// suite locks that invariant in as a permanent regression guard: if a
// future change to the checkpoint/replay logic ever lets a single
// growing segment re-credit content it already accounted for, one of
// these tests will fail.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — single-segment growth counting invariant (SHORT dhikr, reported 8->17 shape)", () => {
  const SHORT = "سبحان الله"; // 2 tokens — the exact reported target

  it("clean alternating growth: N genuine pairs appended one token at a time to ONE never-finalizing segment credits exactly N, never more", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async () => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    };
    const REPS = 20;
    for (let i = 0; i < REPS; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(REPS);
    await h.unmount();
  });

  it("EXACT reported log shape: a dangling extra \"سبحان\" between each pair (matching the pasted transcript growth verbatim) still credits exactly one repetition per genuine pair, discarding the dangling word", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async () => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    };
    words.push("سبحان", "الله");
    await fire(); // ["سبحان","الله"] -> valid:2, +1
    const CYCLES = 15;
    for (let i = 0; i < CYCLES; i++) {
      words.push("سبحان");
      await fire(); // dangling extra "سبحان" (reported pattern) -- must NOT be credited
      words.push("سبحان", "الله");
      await fire(); // completes the NEXT pair from the freshly-appended tokens, discarding the dangling one via restart()
    }
    expect(h.net()).toBe(1 + CYCLES); // one for the initial pair, one per cycle -- never more
    await h.unmount();
  });

  it("growth interleaved with real VALID_SETTLE_DELAY_MS gaps (settle timer fires mid-stream) still credits exactly one repetition per genuine pair", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      const words: string[] = [];
      const fire = async () => {
        await act(async () => {
          h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
        });
      };
      const REPS = 10;
      for (let i = 0; i < REPS; i++) {
        words.push("سبحان");
        await fire();
        words.push("الله");
        await fire();
        if (i % 2 === 1) {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1600); // past VALID_SETTLE_DELAY_MS -- settle-timer soft-commits mid-growth
          });
        }
      }
      expect(h.net()).toBe(REPS);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------
// Regression suite for the CROSS-SEGMENT STALE-CONTENT GUARD
// (historicalOverlapLength in voiceTasbeehMatch.ts) — root cause
// confirmed via a live capture on "سبحان الله": `committedTotalRef`
// survives a SpeechRecognition result-index switch as a bare NUMBER, but
// the actual committed WORDS never did, so a brand-new result index
// whose own transcript replays/duplicates already-counted audio (a
// confirmed real recognizer behavior, not hypothetical) got that content
// re-credited from scratch — the captured failure went 20->45 on a
// single 2-token dhikr, with the specific jump traced to one event:
// `resultIndex:1, checkpointBoundary:2, committedCount:29, delta:15 ->
// total:44`. Fix: reconstruct the full committed history on demand
// (`targetTokens` repeated `committedTotalRef.current` times — always
// exact, since a completed repetition's own tokens are by construction
// an exact copy of targetTokens) and exclude from replay whatever
// portion of a segment's CURRENT tokens is a plain, unhardened
// continuation of that history — but ONLY when the overlap exceeds ONE
// full repetition's worth, so a single genuine repeat on a fresh
// segment (content-identical to history by definition, and the
// overwhelmingly common real-world case) is never affected. Accepted
// trade-off, confirmed with the user: a genuinely fresh segment that
// happens to bundle 2+ repetitions whose content exactly matches an
// existing stretch of history will under-count rather than risk any
// amount of stale content ever being re-credited.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — cross-segment stale-content guard (reported 20->45 over-count)", () => {
  const SHORT = "سبحان الله";

  it("acceptance: 20 genuine repetitions in one continuously-growing segment count as exactly 20", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async () => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await h.unmount();
  });

  it("acceptance: 45 genuine repetitions in one continuously-growing segment count as exactly 45", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async () => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    };
    for (let i = 0; i < 45; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(45);
    await h.unmount();
  });

  it("REGRESSION (reported 20->45): a NEW result index whose transcript replays/duplicates already-committed history must not re-credit that content, even marked isFinal", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    // Build up 20 genuine repetitions in one continuously-growing segment
    // (index 0), exactly as the report's own acceptance test 1 describes.
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await fire(true); // finalize index 0 with its genuine 20-rep transcript

    // A NEW result index (1) arrives, marked final immediately — per the
    // real captured log, its own transcript is a cumulative/replayed dump
    // containing repetitions of the target, structurally indistinguishable
    // from a plain continuation of the ALREADY-committed history. Exactly
    // 20 repetitions here (matching index 0's own committed count) so the
    // ENTIRE dump falls within known history — anything a fresh segment
    // reproduces BEYOND the known committed count is, by the guard's own
    // design, credited as genuinely new (see the "genuinely NEW content
    // appended" test below for that half of the behavior).
    const echoed = Array(20).fill(SHORT).join(" ");
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(echoed, 0.9, true));
    });

    // Must NOT become 40 -- none of this content is genuinely new; it is
    // entirely indistinguishable from a replay of what index 0 already
    // earned credit for.
    expect(h.net()).toBe(20);
    await h.unmount();
  });

  it("CORRECTED (real-device follow-up, committedCount 27, 13 genuine reps): a NEW segment growing gradually, one word at a time, must count every genuine repetition normally, even though its content is byte-identical to history", async () => {
    // This test previously asserted the OPPOSITE of what's tested here —
    // it treated a gradually-built-up new segment (interim growth spread
    // across many separate events, never a single large jump) exactly
    // like the atomic 20->45 replay dump above, and required it to be
    // fully suppressed. A SECOND real-device capture disproved that: with
    // committedCount already at 27, a genuinely spoken run of 13 MORE
    // "سبحان الله" repetitions — confirmed clean and complete in the raw
    // transcript, arriving one or two tokens per event over ~16 real
    // seconds — was silently given delta:0 the entire time, because the
    // OLD guard re-evaluated the ENTIRE current segment against a
    // historical reconstruction on every single event, and for a 2-token
    // target genuine speech is always byte-identical to that
    // reconstruction. The fix (see useVoiceTasbeeh.ts's own CROSS-SEGMENT
    // STALE-CONTENT GUARD doc) only ever treats a SUDDEN, large
    // single-event jump as suspect — a slow, ordinary-ASR-granularity
    // buildup like this one is never affected, no matter how large the
    // segment eventually grows or how long it stays open. This is now
    // the required, passing behavior.
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await fire(true);

    // New index 1 grows GRADUALLY, exactly one word at a time (matching
    // the real capture's own shape), to 20 MORE genuine repetitions.
    const newWords: string[] = [];
    const fireNew = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(newWords.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      newWords.push("سبحان");
      await fireNew();
      newWords.push("الله");
      await fireNew();
    }
    await fireNew(true);

    expect(h.net()).toBe(40); // all 20 genuinely new repetitions must count
    await h.unmount();
  });

  it("genuinely NEW content appended after an echoed prefix on a fresh segment still counts the new part", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await fire(true);

    // New index 1: an echoed prefix (matching history) followed by 3
    // genuinely NEW repetitions the user actually just said.
    const echoedPrefix = Array(20).fill(SHORT).join(" ");
    const genuinelyNew = Array(3).fill(SHORT).join(" ");
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(`${echoedPrefix} ${genuinelyNew}`, 0.9, true));
    });

    expect(h.net()).toBe(23); // the echoed 20 are NOT re-credited, but the genuinely new 3 ARE
    await h.unmount();
  });
});

// ---------------------------------------------------------------------
// Regression suite for the SELF-RELEASING historical-zone fix — the
// real-device follow-up incident (committedCount 27, "سبحان الله",
// 13 genuine repetitions given delta:0 for ~16 seconds). Root cause: the
// PREVIOUS guard re-evaluated a segment's ENTIRE current content against
// a historical reconstruction sized by the full committedTotalRef.current
// on every single event — for a 2-token target, genuine speech is always
// byte-identical to that reconstruction, so once a still-open segment
// grew past one repetition, nothing it grew into afterward could ever be
// told apart from a replay again, no matter how long the user kept
// speaking. Fix: the guard now only ever engages against a SUDDEN,
// single-event jump larger than one repetition (the confirmed shape of
// the ORIGINAL 20->45 replay) — a slow, one-or-two-token-per-event
// buildup (the confirmed shape of BOTH real genuine speech and this
// second incident) is never subjected to it, regardless of how large the
// segment has grown overall.
// ---------------------------------------------------------------------
describe("useVoiceTasbeeh — self-releasing historical zone (real-device 27+13 under-count)", () => {
  const SHORT = "سبحان الله";
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // 6 tokens

  it("B: EXACT REPRODUCTION -- committedCount 27, then 13 genuine new repetitions arrive gradually on a fresh segment, all must count", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 27; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(27);
    await fire(true); // segment 0 finalizes cleanly, matching the real capture

    // Segment 1: 13 MORE genuine repetitions, one word per event -- the
    // exact shape confirmed in the real log (checkpointBoundary growing
    // by 1 token per event, all the way to 26 tokens / 13 reps).
    const newWords: string[] = [];
    const fireNew = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(newWords.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 13; i++) {
      newWords.push("سبحان");
      await fireNew();
      newWords.push("الله");
      await fireNew();
    }
    expect(h.net()).toBe(40); // 27 + all 13 genuine new repetitions
    await fireNew(true);
    expect(h.net()).toBe(40);
    await h.unmount();
  });

  it("C: exactly ONE genuine repetition after an atomic replay episode still counts", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await fire(true);

    // A single-event atomic replay dump (the ORIGINAL bug's own shape) --
    // must be fully suppressed.
    const echoed = Array(20).fill(SHORT).join(" ");
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(echoed, 0.9, false));
    });
    expect(h.net()).toBe(20);

    // Exactly one MORE genuine repetition, appended in its own event.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(`${echoed} ${SHORT}`, 0.9, true));
    });
    expect(h.net()).toBe(21);
    await h.unmount();
  });

  it("D: multiple genuine repetitions after a replay episode, arriving gradually, all continue counting", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    const fire = async (final = false) => {
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, final));
      });
    };
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await fire();
      words.push("الله");
      await fire();
    }
    expect(h.net()).toBe(20);
    await fire(true);

    // Atomic replay dump first (must be suppressed)...
    const base: string[] = Array(20).fill(SHORT).join(" ").split(" ");
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(base.join(" "), 0.9, false));
    });
    expect(h.net()).toBe(20);

    // ...then 5 MORE genuine repetitions, one word at a time.
    for (let i = 0; i < 5; i++) {
      base.push("سبحان");
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(base.join(" "), 0.9, false));
      });
      base.push("الله");
      await act(async () => {
        h.recognition.fireResult(1, new MockResult(base.join(" "), 0.9, false));
      });
    }
    expect(h.net()).toBe(25); // 20 + all 5 genuine new repetitions
    await h.unmount();
  });

  it("E: a longer (>3 token) target still suppresses an atomic replay AND still counts gradual genuine growth afterward", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");
    // Build committedCount to 5 via clean, separate segments.
    for (let seg = 0; seg < 5; seg++) {
      await act(async () => {
        h.recognition.fireResult(seg, new MockResult(LONG, 0.9, true));
      });
    }
    expect(h.net()).toBe(5);

    // Atomic replay dump of the full history on a fresh segment -- must
    // be suppressed (same protection as the 2-token case).
    const echoed = Array(5).fill(LONG).join(" ");
    await act(async () => {
      h.recognition.fireResult(5, new MockResult(echoed, 0.9, false));
    });
    expect(h.net()).toBe(5);

    // Genuine gradual growth afterward, one token at a time, must still count.
    const growing = echoed.split(" ");
    for (const w of words) {
      growing.push(w);
      await act(async () => {
        h.recognition.fireResult(5, new MockResult(growing.join(" "), 0.9, false));
      });
    }
    expect(h.net()).toBe(6); // one genuine additional repetition of LONG
    await h.unmount();
  });
});
