// @vitest-environment jsdom
// HONOR/Huawei: their "App launch" manager held a scheduled Misc alarm after
// DITHAR was swiped from Recents (a real HONOR trace). The settings point
// there — only on those phones, only for an enabled section, until dismissed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const native = vi.hoisted(() => ({
  managed: true,
  plugin: {
    getDiagnostics: vi.fn(),
    openBackgroundLaunchSettings: vi.fn(async () => {}),
    requestPermissions: vi.fn(async () => ({})),
  },
}));
vi.mock("../lib/audioAdhkarNative", () => ({ AudioAdhkarNative: native.plugin, isAudioAdhkarNativeAvailable: () => true }));
vi.mock("../lib/audioAdhkarSchedules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/audioAdhkarSchedules")>()),
  syncAudioAdhkarSchedules: vi.fn(async () => ({ available: false })),
}));

import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { saveMiscSchedule, loadMiscSchedule } from "../lib/audioAdhkarScheduleSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

async function mount() {
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <AudioAdhkarSettingsView onBack={() => {}} />
      </LanguageProvider>,
    );
  });
}

async function openMisc() {
  await act(async () => {
    container.querySelector('[data-audio-schedule-row="misc"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const hint = () => container.querySelector("[data-background-launch-hint]");

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  native.managed = true;
  native.plugin.getDiagnostics.mockImplementation(async () => ({
    events: [],
    exactAlarms: true,
    notifications: true,
    ignoringBatteryOptimizations: true,
    standbyBucket: 5,
    scheduledAt: 0,
    backgroundLaunchManaged: native.managed,
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("HONOR/Huawei background-launch hint", () => {
  it("shows for an enabled section on HONOR/Huawei and opens the App launch page", async () => {
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: true });
    await mount();
    await openMisc();
    expect(hint()?.textContent).toContain("تشغيل التطبيقات");
    await act(async () => {
      [...hint()!.querySelectorAll("button")][0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(native.plugin.openBackgroundLaunchSettings).toHaveBeenCalledTimes(1);
  });

  it("is not shown on other phones, or while the section is off", async () => {
    native.managed = false;
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: true });
    await mount();
    await openMisc();
    expect(hint()).toBeNull();
    act(() => root.unmount());

    native.managed = true;
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: false });
    await mount();
    await openMisc();
    expect(hint()).toBeNull();
  });

  it("stays hidden once dismissed, across restarts", async () => {
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: true });
    await mount();
    await openMisc();
    await act(async () => {
      hint()!.querySelector("[data-dismiss-hint]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(hint()).toBeNull();
    act(() => root.unmount());
    await mount();
    await openMisc();
    expect(hint()).toBeNull();
  });
});
