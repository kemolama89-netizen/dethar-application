// @vitest-environment jsdom
// The Audio Adhkar master switch end to end, as on the phone: the home
// toggle, the Settings master, each section's status AND what is actually
// scheduled natively must agree — with Morning on (06:00), Evening off and
// Misc on, through master ON → OFF → ON.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

type Sent = Record<"morning" | "evening" | "misc", { enabled: boolean; playlist: unknown[] }> & { adhanWindows: unknown[] };

const native = vi.hoisted(() => ({
  plugin: {
    setSchedules: vi.fn(async (o: Record<"morning" | "evening" | "misc", { enabled: boolean }>) => ({
      morning: { scheduledAt: o.morning.enabled ? 1 : null, warningAt: null },
      evening: { scheduledAt: o.evening.enabled ? 2 : null, warningAt: null },
      misc: { scheduledAt: o.misc.enabled ? 3 : null, warningAt: null },
      exact: true,
    })),
    stopScheduled: vi.fn(async () => {}),
    getDiagnostics: vi.fn(async () => ({ events: [], exactAlarms: true, notifications: true, ignoringBatteryOptimizations: true, standbyBucket: 10, scheduledAt: 0 })),
    getPlaybackState: vi.fn(async () => ({ state: null })),
    getCompletions: vi.fn(async () => ({ completions: [] })),
    acknowledgeCompletions: vi.fn(async () => {}),
    requestPermissions: vi.fn(async () => ({})),
    log: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}));
vi.mock("../lib/audioAdhkarNative", () => ({ AudioAdhkarNative: native.plugin, isAudioAdhkarNativeAvailable: () => true }));

import { PrayerTimesPanel } from "./PrayerTimesPanel";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { saveManualLocation } from "../lib/locationSettings";
import { loadDailySchedule, loadMiscSchedule, saveDailySchedule, saveMiscSchedule } from "../lib/audioAdhkarScheduleSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KUWAIT = { source: "manual" as const, latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" };
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

const settle = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await settle();
};
const homeToggle = () => container.querySelector('[data-home] [data-switch="audio-adhkar"]')!;
const settingsMaster = () => container.querySelector("[data-settings] [data-master-switch]")!;
const status = (section: "morning" | "evening" | "misc") => container.querySelector(`[data-audio-schedule-row="${section}"]`)!.textContent!;
const masterCard = () => container.querySelector("[data-audio-adhkar-master]")!.textContent!;
const sent = () => native.plugin.setSchedules.mock.calls.at(-1)![0] as unknown as Sent;

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  saveManualLocation(KUWAIT);
  saveDailySchedule("morning", { enabled: true, startTime: "06:00" });
  saveDailySchedule("evening", { enabled: false, startTime: "17:00" });
  saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 10 });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <div data-home="">
          <PrayerTimesPanel date={new Date("2026-10-10T06:00:00Z")} />
        </div>
        <div data-settings="">
          <AudioAdhkarSettingsView onBack={() => {}} />
        </div>
      </LanguageProvider>,
    );
  });
  await settle();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Audio Adhkar master ON → OFF → ON, with Morning on, Evening off, Misc on", () => {
  it("ON: both switches on; each section shows its own saved state", () => {
    expect(homeToggle().getAttribute("aria-checked")).toBe("true");
    expect(settingsMaster().getAttribute("aria-checked")).toBe("true");
    expect(status("morning")).toContain("مفعّلة — 6:00");
    expect(status("evening")).toContain("متوقفة");
    expect(status("misc")).toContain("مفعّلة");
    expect(status("misc")).not.toContain("متوقفة");
  });

  it("ON: exactly the enabled sections are scheduled, by their saved settings", async () => {
    await click(settingsMaster()); // off
    await click(settingsMaster()); // on again — the sync the switch sends
    expect(sent().morning.enabled).toBe(true);
    expect(sent().morning.playlist.length).toBeGreaterThan(0);
    expect(sent().evening.enabled).toBe(false);
    expect(sent().misc.enabled).toBe(true);
    expect(sent().misc.playlist.length).toBeGreaterThan(0);
  });

  it("OFF from home: Settings clearly says off, nothing is scheduled, playback stops — section settings untouched", async () => {
    await click(homeToggle());
    expect(homeToggle().getAttribute("aria-checked")).toBe("false");
    expect(settingsMaster().getAttribute("aria-checked")).toBe("false");
    expect(masterCard()).toContain("متوقفة الآن");
    for (const s of ["morning", "evening", "misc"] as const) expect(sent()[s].enabled, s).toBe(false);
    expect(native.plugin.stopScheduled).toHaveBeenCalledTimes(1);
    expect(sent().adhanWindows.length).toBeGreaterThan(0); // the 30-minute adhan pause stays
    // Each section keeps — and still shows — its own choice.
    expect(loadDailySchedule("morning")).toEqual({ enabled: true, startTime: "06:00" });
    expect(loadDailySchedule("evening")).toEqual({ enabled: false, startTime: "17:00" });
    expect(loadMiscSchedule()).toMatchObject({ enabled: true, intervalMinutes: 10 });
    expect(status("morning")).toContain("مفعّلة");
    expect(status("evening")).toContain("متوقفة");
  });

  it("ON again from home: the enabled sections come back, the disabled one stays off — the same as before", async () => {
    await click(settingsMaster());
    await click(settingsMaster());
    const before = sent();
    await click(homeToggle()); // off
    await click(homeToggle()); // on
    expect(homeToggle().getAttribute("aria-checked")).toBe("true");
    expect(settingsMaster().getAttribute("aria-checked")).toBe("true");
    expect(sent()).toEqual(before);
    expect(status("morning")).toContain("مفعّلة — 6:00");
    expect(status("evening")).toContain("متوقفة");
    expect(native.plugin.stopScheduled).toHaveBeenCalledTimes(2); // only for the two OFFs
  });
});
