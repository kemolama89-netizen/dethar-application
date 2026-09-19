// @vitest-environment jsdom
//
// Coverage for the JS half of Floating Tasbeeh's selected-dhikr sync and
// open-route requests (see floatingTasbeehSync.ts). Kept in its own file —
// floatingTasbeehSync.test.ts has a test that depends on the ORDER of
// addListener calls, which extra listeners registered there would shift.
//
// What this file protects:
//   - the in-app screen can read what the bubble is counting, and only ever
//     accepts an id that really exists in the master dhikr library.
//   - an in-app selection is pushed to native; a floating-menu pick reaches
//     subscribers; unsubscribing (even before the listener handle resolves,
//     as under React StrictMode) never leaks a listener.
//   - the "الإعدادات" menu row's route is pulled and CLEARED exactly once
//     per request, from start / foreground / native event, and every piece
//     is a complete no-op on web/iOS.
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
  registerPlugin: vi.fn(() => ({})),
}));

vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn() },
}));

vi.mock("./floatingTasbeehBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./floatingTasbeehBridge")>();
  return {
    ...actual,
    FloatingTasbeeh: {
      getSelectedDhikr: vi.fn(),
      setSelectedDhikr: vi.fn(),
      consumeOpenRoute: vi.fn(),
      syncLiveCount: vi.fn(),
      addListener: vi.fn(),
    },
  };
});

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  pushFloatingSelectedDhikr,
  readFloatingSelectedDhikr,
  startFloatingOpenRouteRequests,
  subscribeFloatingSelectedDhikr,
} from "./floatingTasbeehSync";
import { FloatingTasbeeh } from "./floatingTasbeehBridge";
import { dhikrItems } from "../data/tasbeeh";

const validId = dhikrItems[2]!.id;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

let removeSpy: ReturnType<typeof vi.fn<() => Promise<void>>>;

// addListener is overloaded per event name, which vitest's mock typing can't
// narrow — this looks a handler up by event name with a plain signature.
function listenerFor(mock: unknown, eventName: string): (arg?: never) => void {
  const calls = (mock as { mock: { calls: [string, (arg?: never) => void][] } }).mock.calls;
  const found = calls.find(([name]) => name === eventName);
  if (!found) throw new Error(`no ${eventName} listener registered`);
  return found[1];
}

beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
  removeSpy = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockReset();
  vi.mocked(FloatingTasbeeh.setSelectedDhikr).mockReset().mockResolvedValue(undefined);
  vi.mocked(FloatingTasbeeh.consumeOpenRoute).mockReset().mockResolvedValue({ route: null });
  vi.mocked(FloatingTasbeeh.syncLiveCount).mockReset();
  vi.mocked(FloatingTasbeeh.addListener).mockReset().mockResolvedValue({ remove: removeSpy });
  vi.mocked(App.addListener).mockReset().mockResolvedValue({ remove: removeSpy });
});

describe("readFloatingSelectedDhikr", () => {
  it("returns the id native is counting when it exists in the master library", async () => {
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: validId });
    expect(await readFloatingSelectedDhikr()).toBe(validId);
  });

  it("returns null for an id that is not in the master library", async () => {
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockResolvedValue({ dhikrId: 99999 });
    expect(await readFloatingSelectedDhikr()).toBeNull();
  });

  it("returns null (never throws) when the bridge rejects", async () => {
    vi.mocked(FloatingTasbeeh.getSelectedDhikr).mockRejectedValue(new Error("boom"));
    expect(await readFloatingSelectedDhikr()).toBeNull();
  });

  it("never touches the bridge on web/iOS", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(await readFloatingSelectedDhikr()).toBeNull();
    expect(FloatingTasbeeh.getSelectedDhikr).not.toHaveBeenCalled();
  });
});

describe("pushFloatingSelectedDhikr", () => {
  it("tells native the new selection — and only the selection, never a counter", () => {
    pushFloatingSelectedDhikr(validId);
    expect(FloatingTasbeeh.setSelectedDhikr).toHaveBeenCalledWith({ dhikrId: validId });
    expect(FloatingTasbeeh.syncLiveCount).not.toHaveBeenCalled();
  });

  it("swallows a rejected bridge call", async () => {
    vi.mocked(FloatingTasbeeh.setSelectedDhikr).mockRejectedValue(new Error("boom"));
    expect(() => pushFloatingSelectedDhikr(validId)).not.toThrow();
    await flush();
  });

  it("is a no-op on web/iOS", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    pushFloatingSelectedDhikr(validId);
    expect(FloatingTasbeeh.setSelectedDhikr).not.toHaveBeenCalled();
  });
});

describe("subscribeFloatingSelectedDhikr", () => {
  function nativeFires(dhikrId: number) {
    (listenerFor(FloatingTasbeeh.addListener, "selectedDhikrChanged") as unknown as (e: { dhikrId: number }) => void)({ dhikrId });
  }

  it("forwards a floating-menu pick, ignoring ids outside the master library", async () => {
    const listener = vi.fn();
    subscribeFloatingSelectedDhikr(listener);
    await flush();
    nativeFires(validId);
    nativeFires(99999);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(validId);
  });

  it("removes the native listener on unsubscribe", async () => {
    const unsubscribe = subscribeFloatingSelectedDhikr(vi.fn());
    await flush();
    unsubscribe();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("removes the listener even when unsubscribed before its handle resolved (StrictMode)", async () => {
    const unsubscribe = subscribeFloatingSelectedDhikr(vi.fn());
    unsubscribe();
    await flush();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("registers nothing on web/iOS", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    subscribeFloatingSelectedDhikr(vi.fn())();
    expect(FloatingTasbeeh.addListener).not.toHaveBeenCalled();
  });
});

describe("startFloatingOpenRouteRequests", () => {
  it("navigates to the pending route found at startup", async () => {
    vi.mocked(FloatingTasbeeh.consumeOpenRoute).mockResolvedValue({ route: "settings" });
    const onRoute = vi.fn();
    startFloatingOpenRouteRequests(onRoute);
    await flush();
    expect(onRoute).toHaveBeenCalledExactlyOnceWith("settings");
  });

  it("does nothing when no route is pending", async () => {
    const onRoute = vi.fn();
    startFloatingOpenRouteRequests(onRoute);
    await flush();
    expect(onRoute).not.toHaveBeenCalled();
  });

  it("pulls again when native reports a request (openRouteRequested), and on foreground", async () => {
    const onRoute = vi.fn();
    startFloatingOpenRouteRequests(onRoute);
    await flush();
    expect(FloatingTasbeeh.consumeOpenRoute).toHaveBeenCalledTimes(1);

    vi.mocked(FloatingTasbeeh.consumeOpenRoute).mockResolvedValueOnce({ route: "settings" });
    listenerFor(FloatingTasbeeh.addListener, "openRouteRequested")();
    await flush();
    expect(onRoute).toHaveBeenCalledExactlyOnceWith("settings");

    const appState = listenerFor(App.addListener, "appStateChange") as unknown as (s: { isActive: boolean }) => void;
    appState({ isActive: false });
    await flush();
    expect(FloatingTasbeeh.consumeOpenRoute).toHaveBeenCalledTimes(2); // inactive: no pull
    appState({ isActive: true });
    await flush();
    expect(FloatingTasbeeh.consumeOpenRoute).toHaveBeenCalledTimes(3);
    // consumeOpenRoute clears native-side, so a foreground pull with nothing
    // pending must NOT re-navigate.
    expect(onRoute).toHaveBeenCalledTimes(1);
  });

  it("stops navigating and removes both listeners on unsubscribe", async () => {
    const onRoute = vi.fn();
    const stop = startFloatingOpenRouteRequests(onRoute);
    await flush();
    stop();
    expect(removeSpy).toHaveBeenCalledTimes(2);

    vi.mocked(FloatingTasbeeh.consumeOpenRoute).mockResolvedValue({ route: "settings" });
    listenerFor(FloatingTasbeeh.addListener, "openRouteRequested")();
    await flush();
    expect(onRoute).not.toHaveBeenCalled();
  });

  it("is a no-op on web/iOS", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    startFloatingOpenRouteRequests(vi.fn())();
    await flush();
    expect(FloatingTasbeeh.consumeOpenRoute).not.toHaveBeenCalled();
    expect(App.addListener).not.toHaveBeenCalled();
  });
});
