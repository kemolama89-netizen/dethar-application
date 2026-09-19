// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useScreenNavigation } from "./useScreenNavigation";
import { useBackDismiss, backOverlayCount } from "./backOverlays";

const backListeners: Array<() => void> = [];
const removeHandle = vi.fn().mockResolvedValue(undefined);
vi.mock("@capacitor/app", () => ({
  App: {
    exitApp: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn(async (_name: string, fn: () => void) => {
      backListeners.push(fn);
      return { remove: removeHandle };
    }),
  },
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type S = "home" | "tasbeeh" | "written" | "written-search" | "written-reader" | "settings";
let nav: ReturnType<typeof useScreenNavigation<S>>;
let overlayOpen = false;
let setOverlayOpen: (v: boolean) => void = () => {};
let overlayClosed = 0;
function Probe() {
  nav = useScreenNavigation<S>("home");
  const [open, setOpen] = useState(false);
  overlayOpen = open;
  setOverlayOpen = setOpen;
  useBackDismiss(open, () => {
    overlayClosed += 1;
    setOpen(false);
  });
  return null;
}

let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;

async function mount() {
  container = document.createElement("div");
  root = createRoot(container);
  await act(async () => {
    root.render(<Probe />);
  });
}
async function go(s: S) {
  await act(async () => nav.navigate(s));
}
// A browser Back press: jsdom's history.back() is async and fires popstate.
async function browserBack() {
  await act(async () => {
    window.history.back();
    await new Promise((r) => setTimeout(r, 20));
  });
}
async function androidBack() {
  await act(async () => backListeners[backListeners.length - 1]());
}

beforeEach(() => {
  overlayClosed = 0;
  backListeners.length = 0;
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(CapacitorApp.exitApp).mockClear();
  vi.mocked(CapacitorApp.addListener).mockClear();
  removeHandle.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
});

describe("useScreenNavigation — stack rules", () => {
  it("starts on the root screen", async () => {
    await mount();
    expect(nav.screen).toBe("home");
  });

  it("navigating to the current screen is a no-op", async () => {
    await mount();
    await go("tasbeeh");
    const depth = window.history.length;
    await go("tasbeeh");
    expect(window.history.length).toBe(depth);
    expect(nav.screen).toBe("tasbeeh");
  });
});

describe("useScreenNavigation — Android back button (native)", () => {
  beforeEach(() => vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true));

  it("returns to the previous screen, step by step, and only exits from the root", async () => {
    await mount();
    await go("written");
    await go("written-reader");
    await androidBack();
    expect(nav.screen).toBe("written");
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    await androidBack();
    expect(nav.screen).toBe("home");
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    await androidBack();
    expect(CapacitorApp.exitApp).toHaveBeenCalledTimes(1);
  });

  it("goes back to the screen the user actually came from, not a fixed parent", async () => {
    await mount();
    await go("written");
    await go("written-search");
    await go("written-reader"); // a search result
    await androidBack();
    expect(nav.screen).toBe("written-search");
  });

  it("an on-screen jump to a screen already in the stack rewinds to it (no duplicates)", async () => {
    await mount();
    await go("written");
    await go("tasbeeh");
    await go("written"); // bottom-nav tap
    await androidBack();
    expect(nav.screen).toBe("home");
  });

  it("navigating Home clears the stack", async () => {
    await mount();
    await go("written");
    await go("written-reader");
    await go("home");
    await androidBack();
    expect(CapacitorApp.exitApp).toHaveBeenCalledTimes(1);
  });

  it("removes its listener on unmount (also under StrictMode-style remount)", async () => {
    await mount();
    await act(async () => root.unmount());
    expect(removeHandle).toHaveBeenCalled();
    root = createRoot(container);
    await act(async () => root.render(<Probe />));
  });

  it("does not use browser history on native", async () => {
    await mount();
    const before = window.history.length;
    await go("written");
    expect(window.history.length).toBe(before);
  });
});

describe("useScreenNavigation — browser back button", () => {
  it("walks back through the screens instead of leaving the page, and keeps a guard while deeper than root", async () => {
    await mount();
    const start = window.history.length;
    await go("written");
    await go("written-reader");
    expect(window.history.length).toBe(start + 1); // one guard, not one per screen

    await browserBack();
    expect(nav.screen).toBe("written");
    await browserBack();
    expect(nav.screen).toBe("home");
  });

  it("returning Home from a button removes the guard so the next Back is not swallowed silently", async () => {
    await mount();
    await go("settings");
    await go("home");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(nav.screen).toBe("home");
    // The swallowed popstate must not have moved the screen, and a later
    // in-app navigation + Back still works.
    await go("tasbeeh");
    await browserBack();
    expect(nav.screen).toBe("home");
  });

  it("never registers a Capacitor listener in the browser", async () => {
    await mount();
    expect(CapacitorApp.addListener).not.toHaveBeenCalled();
  });
});

const openOverlay = () => act(async () => setOverlayOpen(true));

describe("useScreenNavigation — open overlays are dismissed before navigating", () => {
  it("Android: Back closes the overlay first, then navigates, then exits — and an overlay on Home does not exit the app", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    await mount();
    await go("written");
    await openOverlay();
    await androidBack();
    expect(overlayClosed).toBe(1);
    expect(overlayOpen).toBe(false);
    expect(nav.screen).toBe("written"); // not navigated by that Back
    await androidBack();
    expect(nav.screen).toBe("home");

    await openOverlay(); // overlay on the root screen
    await androidBack();
    expect(overlayOpen).toBe(false);
    expect(CapacitorApp.exitApp).not.toHaveBeenCalled();
    await androidBack(); // Home, nothing open: exits, as before
    expect(CapacitorApp.exitApp).toHaveBeenCalledTimes(1);
  });

  it("Browser: Back closes the overlay first (at depth > 1 the stack is kept and the guard restored)", async () => {
    await mount();
    await go("written");
    await go("written-reader");
    await openOverlay();
    await browserBack();
    expect(overlayOpen).toBe(false);
    expect(nav.screen).toBe("written-reader");
    await browserBack();
    expect(nav.screen).toBe("written");
    await browserBack();
    expect(nav.screen).toBe("home");
  });

  it("Browser: an overlay open on the ROOT screen gets its own guard, so Back closes it instead of leaving the page", async () => {
    await mount();
    const pushState = vi.spyOn(window.history, "pushState");
    await openOverlay();
    expect(pushState).toHaveBeenCalledTimes(1); // the guard
    await browserBack();
    expect(overlayOpen).toBe(false);
    expect(nav.screen).toBe("home");
    expect(backOverlayCount()).toBe(0);
    pushState.mockRestore();
  });

  it("Browser: closing the overlay by its own controls drops the guard it needed", async () => {
    await mount();
    await openOverlay();
    await act(async () => setOverlayOpen(false));
    // React flushes the close (and the guard's history.back()) when act
    // exits, so the wait for its popstate has to come after it.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // The swallowed popstate didn't move anything, and Back still works normally afterwards.
    await go("tasbeeh");
    await browserBack();
    expect(nav.screen).toBe("home");
  });
});
