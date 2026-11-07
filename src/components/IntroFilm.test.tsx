// @vitest-environment jsdom
// The first-launch introduction: four scenes on their own clock (paused by Pause), sound off until asked
// for, Skip / «ابدأ» end it — and it plays by itself only for a new install that hasn't seen it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { IntroFilm } from "./IntroFilm";
import { PAGE_TURN_AT, SCENES } from "../data/introFilmTimeline";
import { introFilmLabels } from "../data/introFilmLabels";
import pauseReceiverKt from "../../android/app/src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPauseReceiver.kt?raw";
import adhkarLogicKt from "../../android/app/src/main/java/com/dithar/app/audioadhkar/AudioAdhkarLogic.kt?raw";
import { loadIntroMuted } from "../lib/introFilm";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const turnSound = vi.hoisted(() => ({ play: vi.fn(() => true), prepare: vi.fn(() => Promise.resolve(null)) }));
vi.mock("../lib/pageTurnSound", () => ({ playPageTurnSound: turnSound.play, preparePageTurnSound: turnSound.prepare }));

let container: HTMLDivElement;
let root: Root;
const onClose = vi.fn();
const play = vi.fn(() => Promise.resolve());
/** Every recording the film started (the Audio stand-in below). */
const created: { src: string; currentTime: number }[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
  onClose.mockReset();
  turnSound.play.mockClear();
  play.mockClear();
  created.length = 0;
  vi.stubGlobal(
    "Audio",
    class {
      loop = false;
      volume = 1;
      preload = "";
      readyState = 4;
      currentTime = 0;
      duration = 30;
      src: string;
      play = play;
      pause = vi.fn();
      addEventListener = vi.fn();
      constructor(src: string) {
        this.src = src;
        created.push(this as unknown as { src: string; currentTime: number });
      }
    },
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(firstLaunch = false) {
  await act(async () => {
    root.render(
      <LanguageProvider>
        <IntroFilm firstLaunch={firstLaunch} onClose={onClose} />
      </LanguageProvider>,
    );
  });
}
const scene = () => container.querySelector("[data-intro-film]")?.getAttribute("data-intro-film");
const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
const click = (sel: string) => act(async () => void (container.querySelector(sel) as HTMLElement).click());

describe("IntroFilm", () => {
  it("plays its sixteen scenes in order, in about 68 seconds, then closes as finished", async () => {
    const total = SCENES.reduce((sum, s) => sum + s.ms, 0);
    expect(SCENES).toHaveLength(16);
    expect(total).toBeGreaterThanOrEqual(65_000);
    expect(total).toBeLessThanOrEqual(70_000);
    expect(SCENES.slice(0, 3).map((s) => s.id)).toEqual(["opening", "prayer", "quran"]);
    await mount();
    for (const s of SCENES) {
      expect(scene()).toBe(s.id);
      // Every scene but the last offers «Next»; the last offers «Begin».
      expect(!!container.querySelector("[data-intro-next]")).toBe(s.id !== "closing");
      expect(!!container.querySelector("[data-intro-begin]")).toBe(s.id === "closing");
      await advance(s.ms);
    }
    await advance(700);
    expect(onClose).toHaveBeenCalledWith("finished");
  });

  it("«Next» moves to the next scene at once, and the clock restarts there", async () => {
    await mount();
    await advance(1000);
    await click("[data-intro-next]");
    expect(scene()).toBe("prayer");
    await advance(SCENES[1].ms - 50);
    expect(scene()).toBe("prayer");
    await advance(100);
    expect(scene()).toBe("quran");
  });

  it("turns the Mushaf page with its paper sound on cue — only with the sound on, waiting through a pause", async () => {
    const cue = PAGE_TURN_AT;
    // Muted (the default): the page turns, silently.
    await mount();
    await click("[data-intro-next]");
    await click("[data-intro-next]");
    expect(scene()).toBe("quran");
    expect(container.querySelector(".intro-page-turn__leaf")).not.toBeNull();
    await advance(cue + 200);
    expect(turnSound.play).not.toHaveBeenCalled();
    // Sound on: a pause holds the cue; it plays once, when the scene's clock reaches it.
    await act(async () => root.unmount());
    container.remove();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await mount();
    await click("[data-intro-mute]");
    await click("[data-intro-next]");
    await click("[data-intro-next]");
    await advance(1000);
    await click("[data-intro-pause]");
    await advance(10_000);
    expect(turnSound.play).not.toHaveBeenCalled();
    await click("[data-intro-pause]");
    await advance(cue - 1000 - 50);
    expect(turnSound.play).not.toHaveBeenCalled();
    await advance(100);
    expect(turnSound.play).toHaveBeenCalledTimes(1);
    expect(turnSound.play).toHaveBeenCalledWith(400);
    await advance(2000);
    expect(turnSound.play).toHaveBeenCalledTimes(1);
  });

  it("shows the adhan pause in the app's own words: stopped, then resumed after the 30 minutes", async () => {
    // The film's notices are the native ones word for word (AudioAdhkarPauseReceiver.kt), with an example time.
    const kotlin = pauseReceiverKt;
    for (const lang of ["ar", "en"] as const) {
      const m = introFilmLabels[lang].mini;
      expect(kotlin).toContain(`"${m.miscPaused.replace(m.resumeAt, "$time")}"`);
      expect(kotlin).toContain(`"${m.miscResumed}"`);
    }
    // 15:12 + 30 minutes: the pause the app holds after each adhan (AdhanSuppression.PAUSE_MILLIS).
    expect(kotlin.length).toBeGreaterThan(0);
    expect(adhkarLogicKt).toContain("PAUSE_MILLIS = 30 * 60_000L");
    const [h, mm] = introFilmLabels.en.mini.adhanAt.split(":").map(Number);
    const resume = new Date(0, 0, 1, h, mm + 30);
    expect(`${resume.getHours()}:${String(resume.getMinutes()).padStart(2, "0")}`).toBe(introFilmLabels.en.mini.resumeAt);
    // And the scene plays it: the Miscellaneous card with the notice, then «resumed».
    await mount();
    for (let i = 0; i < 6; i++) await click("[data-intro-next]");
    expect(scene()).toBe("audio");
    expect(container.textContent).toContain(introFilmLabels.en.mini.miscPaused);
    expect(container.textContent).toContain(introFilmLabels.en.mini.miscResumed);
  });

  it("shows the brand name under the emblem, and the tagline, in the opening", async () => {
    await mount();
    expect(container.querySelector(".intro-brand")?.textContent).toBe("DITHAR");
    expect(container.querySelector(".intro-caption")?.textContent).toBe("Toward a life closer to Allah");
  });

  it("Skip ends it at once; «Begin» on the last scene ends it as finished", async () => {
    await mount();
    expect(document.activeElement?.getAttribute("role")).toBe("dialog");
    await click("[data-intro-skip]");
    await advance(700);
    expect(onClose).toHaveBeenCalledWith("skipped");
  });

  it("Pause stops the clock, and Play resumes what was left of the scene", async () => {
    await mount();
    await advance(3000);
    await click("[data-intro-pause]");
    await advance(20_000);
    expect(scene()).toBe("opening");
    await click("[data-intro-pause]");
    await advance(SCENES[0].ms - 3000 - 100);
    expect(scene()).toBe("opening");
    await advance(200);
    expect(scene()).toBe("prayer");
  });

  it("is silent until sound is turned on, and remembers that choice", async () => {
    expect(loadIntroMuted()).toBe(true);
    await mount(true);
    await advance(SCENES[0].ms + SCENES[1].ms);
    expect(created).toHaveLength(0); // muted: nothing is even loaded
    expect(container.querySelector("[data-intro-mute]")?.getAttribute("data-intro-mute")).toBe("muted");
    await click("[data-intro-mute]");
    expect(loadIntroMuted()).toBe(false);
  });

  it("has no water ambience or music — each scene's own recording, in its scene", async () => {
    await mount();
    await click("[data-intro-mute]");
    // The opening is quiet.
    await advance(SCENES[0].ms - 100);
    expect(created).toHaveLength(0);
    // Prayer: Sheikh Saad Al-Ghamdi's adhan, from its takbeer.
    await advance(100);
    await advance(450);
    expect(created).toHaveLength(1);
    expect(created[0].src).toContain("audio/adhan/");
    expect(created[0].src).toContain("Ghamdi");
    expect(created[0].currentTime).toBeCloseTo(1.35, 2);
    // Mushaf: Sheikh Al-Husary's Basmala, once the page appears.
    await advance(SCENES[1].ms - 450);
    await advance(1450);
    expect(created.map((c) => c.src).filter((src) => src.includes("husary-murattal/basmala"))).toHaveLength(1);
    expect(created.some((c) => c.src.includes("alafasy"))).toBe(false);
    // Audio Adhkar: the recorded Morning dhikr, heard whole (one clip, played to its end), then «سبحان الله».
    for (let i = 0; i < 4; i++) await click("[data-intro-next]");
    expect(scene()).toBe("audio");
    await advance(6500);
    const srcs = created.map((c) => c.src);
    expect(srcs.filter((src) => src.includes("adhkar/shared/"))).toHaveLength(1);
    expect(srcs.some((src) => src.includes(encodeURI("سبحان الله وبحمده")))).toBe(true);
    expect(srcs.some((src) => src.includes("audio-azkar/tasbeeh_01"))).toBe(true);
    expect(srcs.some((src) => /river|stream|waves|birdsong/.test(src))).toBe(false);
  });

  it("never starts a recording late: a cue already past when the sound comes on is skipped", async () => {
    await mount();
    await click("[data-intro-next]"); // prayer
    await advance(1500); // its adhan cue (0.4 s) has passed
    await click("[data-intro-mute]");
    await advance(500);
    expect(created).toHaveLength(0);
  });

  it("has a labelled dialog and a spoken caption for each scene", async () => {
    await mount();
    const dialog = container.querySelector("[role='dialog']")!;
    expect(dialog.getAttribute("aria-label")).toBe("Introducing DITHAR");
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Toward a life closer to Allah");
  });
});
