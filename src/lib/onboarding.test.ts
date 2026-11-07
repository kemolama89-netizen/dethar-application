// @vitest-environment jsdom
// The first-time tour's state: shown once to a new install, never automatically to someone who already
// used DITHAR, replayable; the section hints once each.
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
const load = () => import("./onboarding");

describe("who sees the tour", () => {
  it("a new install sees it once: finishing or skipping ends that", async () => {
    const m = await load();
    expect(m.loadOnboardingState()).toBe("pending");
    expect(m.shouldAutoShowTour()).toBe(true);
    m.saveOnboardingState("skipped");
    expect(m.shouldAutoShowTour()).toBe(false);
    m.saveOnboardingState("finished");
    expect(m.loadOnboardingState()).toBe("finished");
  });

  it.each(["dithar:daily-content:install-anchor:v1", "dithar:stats:events:v1", "dithar:quran:position:v1"])(
    "someone who already used DITHAR (%s) isn't shown it automatically — nor its hints",
    async (key) => {
      localStorage.setItem(key, "x");
      const m = await load();
      expect(m.loadOnboardingState()).toBe("existing-user");
      expect(m.shouldAutoShowTour()).toBe(false);
      expect(m.shouldShowHint("audio-play-all")).toBe(false);
      // The app writing its own records later doesn't turn a new install into an "existing user".
    },
  );

  it("records written by the app after it started don't change a new install", async () => {
    const m = await load();
    localStorage.setItem("dithar:daily-content:install-anchor:v1", "2026-11-07");
    expect(m.shouldAutoShowTour()).toBe(true);
  });
});

describe("replay and hints", () => {
  it("replay tells the app, and shows the section hints again", async () => {
    const m = await load();
    m.markHintSeen("audio-play-all");
    expect(m.shouldShowHint("audio-play-all")).toBe(false);
    let asked = 0;
    const stop = m.subscribeTourReplay(() => asked++);
    m.requestTourReplay();
    expect(asked).toBe(1);
    expect(m.shouldShowHint("audio-play-all")).toBe(true);
    stop();
  });

  it("each hint shows until it's acknowledged, independently", async () => {
    const m = await load();
    m.markHintSeen("quran-basair");
    expect(m.shouldShowHint("quran-basair")).toBe(false);
    expect(m.shouldShowHint("audio-play-all")).toBe(true);
  });
});
