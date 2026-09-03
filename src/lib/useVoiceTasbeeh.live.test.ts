// @vitest-environment jsdom
//
// NEW, focused behavioral regression suite for the rebuilt Voice Tasbeeh
// engine (see useVoiceTasbeeh.ts's own "STATE MODEL" doc). Deliberately
// NOT a port of the old 255-test suite — that suite tested the REMOVED
// architecture's own internals (checkpoint boundaries, historical
// overlap, structural commit, target-switch index floors) directly; this
// suite tests only OBSERVABLE behavior through the real hook, driven by
// a mock SpeechRecognition, matching real documented browser behavior
// (cumulative/interim results, revisions, duplicate re-emissions,
// onend/restart, result indices restarting from 0 on every recognition
// run).
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useVoiceTasbeeh } from "./useVoiceTasbeeh";

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
  private accumulatedResults: MockResult[] = [];
  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
  start() {
    this.started = true;
    this.sessionsStarted += 1;
    this.accumulatedResults = []; // a fresh session renumbers indices from 0, like a real browser
    queueMicrotask(() => this.onstart?.({}));
  }
  stop() {
    this.started = false;
  }
  abort() {
    this.started = false;
  }
  fireResult(index: number, result: MockResult) {
    this.accumulatedResults[index] = result;
    const resultsArray = this.accumulatedResults as unknown as { length: number; [i: number]: MockResult };
    this.onresult?.({ resultIndex: index, results: resultsArray });
  }
  fireEnd() {
    this.started = false;
    this.onend?.({});
  }
  fireError(error: string) {
    this.onerror?.({ error });
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
  status: () => string;
  setTarget: (target: string) => Promise<void>;
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

describe("useVoiceTasbeeh (rebuilt engine)", () => {
  const SHORT = "سبحان الله"; // 2 tokens
  const LONG = "سبحان الله وبحمده سبحان الله العظيم"; // 6 tokens, target[3]===target[0]

  // A -----------------------------------------------------------------
  it("A: one correctly spoken short dhikr counts exactly once", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // B -----------------------------------------------------------------
  it("B: 20 genuine repetitions of 'سبحان الله' -> 20", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    for (let i = 0; i < 20; i++) {
      words.push("سبحان");
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
      words.push("الله");
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    }
    expect(h.net()).toBe(20);
    await h.unmount();
  });

  // C -----------------------------------------------------------------
  it("C: 50 genuine repetitions of 'سبحان الله' -> 50", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const words: string[] = [];
    for (let i = 0; i < 50; i++) {
      words.push("سبحان");
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
      words.push("الله");
      await act(async () => {
        h.recognition.fireResult(0, new MockResult(words.join(" "), 0.9, false));
      });
    }
    expect(h.net()).toBe(50);
    await h.unmount();
  });

  // D -----------------------------------------------------------------
  it("D: a cumulative transcript containing exactly N complete repetitions in one event counts exactly N, never more", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const threeReps = Array(3).fill(SHORT).join(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(threeReps, 0.9, true));
    });
    expect(h.net()).toBe(3);
    await h.unmount();
  });

  // E -----------------------------------------------------------------
  it("E: the same result re-emitted as final (identical content) does not count twice", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, false));
    });
    expect(h.net()).toBe(1);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.95, true)); // identical text, just now final
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // F -----------------------------------------------------------------
  it("F: an interim transcript revised from one form to another (not a clean append) does not double-count", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    // Revision: the recognizer reshapes its own guess for the same word.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحا", 0.9, false));
    });
    // Then corrects itself and completes the phrase.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // G -----------------------------------------------------------------
  it("G: a wrong/unrelated phrase never counts", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("كلام غريب تماما لا علاقة له", 0.9, true));
    });
    expect(h.net()).toBe(0);
    await h.unmount();
  });

  // H -----------------------------------------------------------------
  it("H: minor Arabic orthographic differences (tashkeel/hamza forms) between the stored target and the live transcript still count", async () => {
    const h = await mountVoiceTasbeeh("سُبْحَانَ اللَّهِ"); // full tashkeel, as stored in the library
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان الله", 0.9, true)); // bare transcript, as a recognizer actually reports it
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // I -----------------------------------------------------------------
  it("I: a long dhikr with a natural pause mid-utterance (same still-open segment) still counts correctly", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" ");
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(words.slice(0, 3).join(" "), 0.9, false)); // first half only
    });
    expect(h.net()).toBe(0);
    // ... a realistic breathing pause, no events at all ...
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true)); // completes the same segment
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // J -----------------------------------------------------------------
  it("J: a long dhikr with a normal recognition revision (a dropped 'و' prefix corrected on a later event) still counts correctly", async () => {
    const h = await mountVoiceTasbeeh(LONG);
    const words = LONG.split(" "); // [...,"سبحان","الله","العظيم"] with "وبحمده" at index 2
    const dropped = [...words];
    dropped[2] = "بحمده"; // "وبحمده" heard without its "و"
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(dropped.join(" "), 0.9, false));
    });
    // Recognizer revises and gets the "و" right this time.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(LONG, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.unmount();
  });

  // K -----------------------------------------------------------------
  it("K: switching target does not restart SpeechRecognition", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
    });
    expect(h.net()).toBe(1);
    await h.setTarget("سبحان الله وبحمده");
    expect(h.recognition.sessionsStarted).toBe(1); // no restart happened
    await act(async () => {
      h.recognition.fireResult(1, new MockResult("سبحان الله وبحمده", 0.9, true));
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  // L -----------------------------------------------------------------
  it("L: switching between two dhikrs sharing 'سبحان الله' does not let old content contaminate the new target", async () => {
    const A = SHORT;
    const C = "سبحان الله وبحمده"; // shares A's own words as its own prefix
    const h = await mountVoiceTasbeeh(A);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(A, 0.9, true)); // A completes and this segment finalizes
    });
    expect(h.net()).toBe(1);

    await h.setTarget(C);
    // A fresh segment coincidentally starts with C's own opening words
    // (because they're literally the same words as A) but never
    // completes C.
    await act(async () => {
      h.recognition.fireResult(1, new MockResult(A, 0.9, true));
    });
    expect(h.net()).toBe(1); // must not satisfy C

    await act(async () => {
      h.recognition.fireResult(2, new MockResult(C, 0.9, true)); // genuinely complete C
    });
    expect(h.net()).toBe(2);
    await h.unmount();
  });

  // M -----------------------------------------------------------------
  it("M: the same open result index survives a target switch, and new speech for the new target still counts", async () => {
    const A = SHORT;
    const B = "الحمد لله";
    const h = await mountVoiceTasbeeh(A);
    // Index 0 left open (interim, not final) with a stray word.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
    });
    expect(h.net()).toBe(0);

    await h.setTarget(B);

    // The SAME index continues (no restart), with the pre-switch stray
    // word still present, plus B's own words genuinely appended after
    // the switch.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(`سبحان ${B}`, 0.9, true));
    });
    expect(h.net()).toBe(1); // only the genuine post-switch B counts
    expect(h.recognition.sessionsStarted).toBe(1);
    await h.unmount();
  });

  // N -----------------------------------------------------------------
  it("N: onend followed by an automatic restart continues the session without duplicate counts", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
    });
    expect(h.net()).toBe(1);

    await restartSession(h);
    expect(h.recognition.sessionsStarted).toBe(2); // confirms an actual restart happened

    // New session's indices restart from 0.
    await act(async () => {
      h.recognition.fireResult(0, new MockResult(SHORT, 0.9, true));
    });
    expect(h.net()).toBe(2); // a genuine second recitation, not a duplicate of the first
    await h.unmount();
  });

  it("N (retry): a start() that throws (InvalidStateError-shaped race) retries automatically and still resumes listening", async () => {
    const h = await mountVoiceTasbeeh(SHORT);
    const originalStart = h.recognition.start.bind(h.recognition);
    let throwOnce = true;
    h.recognition.start = () => {
      if (throwOnce) {
        throwOnce = false;
        throw new Error("InvalidStateError");
      }
      originalStart();
    };

    await restartSession(h);
    // The first retry attempt throws; the loop retries once more.
    await act(async () => {
      await sleep(PAST_RESTART_DELAY_MS);
    });
    expect(h.status()).toBe("listening");
    await h.unmount();
  });

  // O -----------------------------------------------------------------
  it("O: 60 seconds of genuine inactivity stops the session and returns to idle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false));
      });
      expect(h.status()).toBe("listening");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60001);
      });

      expect(h.status()).toBe("idle");
      expect(h.recognition.started).toBe(false);
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("O (reset): genuine new activity resets the 60-second timer, so the session survives past what would have been the timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const h = await mountVoiceTasbeeh(SHORT);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50000);
      });
      await act(async () => {
        h.recognition.fireResult(0, new MockResult("سبحان", 0.9, false)); // genuine activity resets the clock
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50000); // 100s total, but only 50s since the last activity
      });
      expect(h.status()).toBe("listening");
      await h.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
