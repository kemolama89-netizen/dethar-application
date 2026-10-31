// @vitest-environment jsdom
// The reader's page-turn sound: the bundled recording (public/audio/ui/page-turn.m4a),
// decoded once, its landing timed to the page's, and never two rustles stacked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Node's own modules, as lib/mushafAssets.test.ts loads them (the app's types don't include Node's).
const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));
import { PAGE_TURN_LANDING_S, PAGE_TURN_SOUND_URL, playPageTurnSound, preparePageTurnSound, resetPageTurnSoundForTesting } from "./pageTurnSound";

interface FakeSource {
  buffer: unknown;
  started: { at: number; offset: number } | null;
  stoppedAt: number | null;
  onended: (() => void) | null;
  gain: FakeGain;
}
interface FakeGain {
  value: number;
  ramps: { to: number; at: number }[];
}

let sources: FakeSource[] = [];
let decodes = 0;
let fetches = 0;
let state: "running" | "suspended" = "suspended";
let suspends = 0;

function stubAudio() {
  sources = [];
  decodes = 0;
  fetches = 0;
  state = "suspended";
  suspends = 0;
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 10;
      destination = {};
      get state() {
        return state;
      }
      resume = async () => void (state = "running");
      suspend = async () => {
        suspends += 1;
        state = "suspended";
      };
      decodeAudioData = async () => {
        decodes += 1;
        return { duration: 0.8 };
      };
      createGain = () => {
        const g: FakeGain = { value: 0, ramps: [] };
        return {
          gain: {
            get value() {
              return g.value;
            },
            setValueAtTime: (v: number) => void (g.value = v),
            cancelScheduledValues() {},
            linearRampToValueAtTime: (to: number, at: number) => void g.ramps.push({ to, at }),
          },
          connect() {},
          _g: g,
        };
      };
      createBufferSource = () => {
        const s: FakeSource = { buffer: null, started: null, stoppedAt: null, onended: null, gain: { value: 0, ramps: [] } };
        sources.push(s);
        return {
          set buffer(b: unknown) {
            s.buffer = b;
          },
          set onended(f: () => void) {
            s.onended = f;
          },
          connect: (gain: { _g: FakeGain }) => void (s.gain = gain._g),
          start: (at: number, offset = 0) => void (s.started = { at, offset }),
          stop: (at: number) => void (s.stoppedAt = at),
        };
      };
    },
  );
  vi.stubGlobal("fetch", async (url: string) => {
    fetches += 1;
    expect(url).toBe(PAGE_TURN_SOUND_URL);
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) };
  });
}

beforeEach(() => {
  resetPageTurnSoundForTesting();
  stubAudio();
});
afterEach(() => {
  resetPageTurnSoundForTesting();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the page-turn recording", () => {
  it("is the bundled public-domain recording, documented with its source and licence", async () => {
    const { readFileSync, statSync } = await nodeModule("fs");
    const { createHash } = await nodeModule("crypto");
    const file = "public/audio/ui/page-turn.m4a";
    expect(PAGE_TURN_SOUND_URL.endsWith("audio/ui/page-turn.m4a")).toBe(true);
    expect(statSync(file).size).toBeLessThan(40_000); // short and small
    expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe("f20183357e33bdf43af19f72538b9ce9145a67a860560b2b771215b2781496b1");
    const readme = readFileSync("public/audio/ui/README.md", "utf8");
    expect(readme).toContain("Public domain");
    expect(readme).toContain("commons.wikimedia.org/wiki/File:Turning_a_page.ogg");
    expect(readme).toContain("planish");
  });

  it("is fetched and decoded once, however many pages turn", async () => {
    await preparePageTurnSound();
    for (let i = 0; i < 5; i++) playPageTurnSound();
    await preparePageTurnSound();
    expect(fetches).toBe(1);
    expect(decodes).toBe(1);
    expect(sources).toHaveLength(5);
  });

  it("starts at once, its landing timed to the page's: a whole turn from the start, a shorter one entered later, an instant change at the landing", async () => {
    await preparePageTurnSound();
    playPageTurnSound(400);
    expect(sources[0].started).toEqual({ at: 10, offset: 0 });
    playPageTurnSound(150);
    expect(sources[1].started!.offset).toBeCloseTo(PAGE_TURN_LANDING_S - 0.15, 5);
    playPageTurnSound(0);
    expect(sources[2].started!.offset).toBeCloseTo(PAGE_TURN_LANDING_S, 5);
    // A turn longer than the lead-in still starts the clip at its beginning (never a gap, never sped up).
    playPageTurnSound(900);
    expect(sources[3].started!.offset).toBe(0);
    // The context is woken for the sound.
    expect(state).toBe("running");
  });

  it("turning again while it sounds fades the previous rustle out quickly instead of stacking two", async () => {
    await preparePageTurnSound();
    playPageTurnSound();
    playPageTurnSound();
    const [first, second] = sources;
    expect(first.gain.ramps).toEqual([{ to: 0, at: 10.025 }]);
    expect(first.stoppedAt).toBeCloseTo(10.035, 5);
    expect(second.stoppedAt).toBeNull();
    expect(second.gain.value).toBe(0.5);
  });

  it("lets the audio output go between turns (the context is suspended once the sound is over)", async () => {
    vi.useFakeTimers();
    await preparePageTurnSound();
    playPageTurnSound();
    sources[0].onended?.();
    vi.advanceTimersByTime(800 + 1500 + 10);
    expect(suspends).toBe(1);
    expect(state).toBe("suspended");
  });

  it("the very first turn sounds if the recording is ready almost at once, and stays silent rather than lag the page", async () => {
    playPageTurnSound(400);
    await preparePageTurnSound();
    await Promise.resolve();
    expect(sources).toHaveLength(1);

    resetPageTurnSoundForTesting();
    stubAudio();
    let release: (v: unknown) => void = () => {};
    vi.stubGlobal("fetch", () => new Promise((r) => (release = r)));
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    playPageTurnSound(400);
    now.mockReturnValue(1_400); // the recording only arrives 400 ms later
    release({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) });
    await preparePageTurnSound();
    await Promise.resolve();
    expect(sources).toHaveLength(0);
  });

  it("without Web Audio, an <audio> element plays the same recording", () => {
    vi.stubGlobal("AudioContext", undefined);
    const play = vi.fn(async () => {});
    vi.stubGlobal(
      "Audio",
      class {
        src: string;
        currentTime = 5;
        volume = 1;
        preload = "";
        constructor(src: string) {
          this.src = src;
        }
        play = play;
      },
    );
    expect(playPageTurnSound()).toBe(true);
    expect(playPageTurnSound()).toBe(true);
    expect(play).toHaveBeenCalledTimes(2);
  });
});
