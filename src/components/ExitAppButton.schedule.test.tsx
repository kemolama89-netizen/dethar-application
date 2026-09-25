// @vitest-environment jsdom
//
// Exit means "close DITHAR" — never "cancel future Evening Audio". The
// button only calls Capacitor's App.exitApp() (which on Android only
// finishes the Activity); it must never touch the Evening schedule.
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const mocks = vi.hoisted(() => ({
  exitApp: vi.fn(async () => {}),
  audio: { setEveningSchedule: vi.fn(), stop: vi.fn(), pause: vi.fn() },
}));
vi.mock("@capacitor/app", () => ({ App: { exitApp: mocks.exitApp, addListener: vi.fn(async () => ({ remove: async () => {} })) } }));
vi.mock("@capacitor/core", async (orig) => ({
  ...(await orig<typeof import("@capacitor/core")>()),
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
}));
vi.mock("../lib/audioAdhkarNative", () => ({ AudioAdhkarNative: mocks.audio, isAudioAdhkarNativeAvailable: () => true }));

import { ExitAppButton } from "./ExitAppButton";
import { LanguageProvider } from "../theme/LanguageContext";
import { exitAppLabels } from "../data/exitApp";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Exit button vs. the Evening Audio schedule", () => {
  it("exits without cancelling, stopping or re-registering Evening Audio", async () => {
    localStorage.clear();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <LanguageProvider>
          <ExitAppButton />
        </LanguageProvider>,
      ),
    );
    const click = async (el: Element) => act(async () => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await click(container.querySelector(`button[aria-label="${exitAppLabels.ar.buttonAria}"]`)!);
    const confirm = [...container.querySelectorAll("[role=dialog] button")].at(-1)!;
    await click(confirm);

    expect(mocks.exitApp).toHaveBeenCalledTimes(1);
    expect(mocks.audio.setEveningSchedule).not.toHaveBeenCalled();
    expect(mocks.audio.stop).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
