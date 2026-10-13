// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ isNative: true, exitApp: vi.fn(async () => {}) }));
vi.mock("@capacitor/core", async (importOriginal) => {
  const real = await importOriginal<typeof import("@capacitor/core")>();
  return { ...real, Capacitor: { ...real.Capacitor, isNativePlatform: () => native.isNative } };
});
vi.mock("@capacitor/app", () => ({ App: { exitApp: native.exitApp } }));

import { exitAppSafely, trackNativeSync, whenNativeSyncsSettle } from "./appExit";

beforeEach(() => {
  native.isNative = true;
  native.exitApp.mockClear();
});

describe("exiting the app", () => {
  it("closes the UI right away when no schedule change is in flight", async () => {
    await exitAppSafely();
    expect(native.exitApp).toHaveBeenCalledTimes(1);
  });

  it("waits for a schedule sync still on its way to native, so a last-second change isn't lost", async () => {
    let finish!: () => void;
    const order: string[] = [];
    void trackNativeSync(new Promise<void>((r) => (finish = r))).then(() => order.push("synced"));
    native.exitApp.mockImplementation(async () => {
      order.push("exit");
    });
    const exiting = exitAppSafely();
    await Promise.resolve();
    expect(native.exitApp).not.toHaveBeenCalled();
    finish();
    await exiting;
    expect(order).toEqual(["synced", "exit"]);
  });

  it("never hangs: a stuck sync is given up on after the timeout", async () => {
    vi.useFakeTimers();
    void trackNativeSync(new Promise(() => {}));
    const settled = whenNativeSyncsSettle(2000).then(() => "settled");
    await vi.advanceTimersByTimeAsync(1999);
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled).toBe("settled");
    vi.useRealTimers();
  });

  it("a failed sync doesn't block exiting", async () => {
    void trackNativeSync(Promise.reject(new Error("bridge gone"))).catch(() => {});
    await exitAppSafely();
    expect(native.exitApp).toHaveBeenCalled();
  });

  it("does nothing on the web (there is no app to exit)", async () => {
    native.isNative = false;
    await exitAppSafely();
    expect(native.exitApp).not.toHaveBeenCalled();
  });

  it("the Exit button and Back-on-home both go through exitAppSafely — never a bare App.exitApp()", async () => {
    const sources = import.meta.glob<string>(["/src/components/ExitAppButton.tsx", "/src/lib/useScreenNavigation.ts"], { query: "?raw", import: "default", eager: true });
    for (const [path, text] of Object.entries(sources)) {
      expect(text, path).toContain("exitAppSafely()");
      expect(text, path).not.toMatch(/CapacitorApp\.exitApp\(\)/);
    }
  });
});
