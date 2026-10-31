// @vitest-environment jsdom
//
// The Prayer Times card's reminder toggle — the master switch of prayer
// notifications and the adhan. What switching does (permission, sync,
// stopping the adhan) is setPrayerNotificationsEnabled's, covered by
// prayerNotifications.test.ts; here: the card calls it on an explicit tap
// only, shows the saved state, and follows Settings' master live.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { usePrayerReminder } from "./usePrayerReminder";
import type { PrayerTimesResult } from "./prayerTimes";
import { loadPrayerReminderSettings, savePrayerReminderSettings } from "./prayerReminderSettings";

const native = vi.hoisted(() => ({
  available: false,
  setEnabled: vi.fn<(enabled: boolean, language?: string) => Promise<null>>(),
}));
vi.mock("./prayerNotifications", async () => {
  const settings = await import("./prayerReminderSettings");
  native.setEnabled.mockImplementation(async (enabled) => {
    settings.savePrayerReminderSettings({ ...settings.loadPrayerReminderSettings(), enabled });
    return null;
  });
  return { isPrayerNotificationsAvailable: () => native.available, setPrayerNotificationsEnabled: native.setEnabled };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TIMES: PrayerTimesResult = {
  fajr: new Date("2026-09-14T01:12:00Z"),
  shuruq: new Date("2026-09-14T02:32:00Z"),
  dhuhr: new Date("2026-09-14T08:44:00Z"),
  asr: new Date("2026-09-14T12:13:00Z"),
  maghrib: new Date("2026-09-14T14:55:00Z"),
  isha: new Date("2026-09-14T16:12:00Z"),
};

let latest: ReturnType<typeof usePrayerReminder> | undefined;
function Probe({ language }: { language: "ar" | "en" }) {
  latest = usePrayerReminder(TIMES, "Asia/Kuwait", language);
  return null;
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
async function mount(language: "ar" | "en" = "ar") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Probe language={language} />));
}
async function unmount() {
  await act(async () => root.unmount());
  container.remove();
}
const toggle = () => act(async () => latest!.toggle());

beforeEach(() => {
  localStorage.clear();
  native.available = false;
  native.setEnabled.mockClear();
});
afterEach(async () => {
  if (root) await unmount().catch(() => {});
});

const ALL_ON = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

describe("usePrayerReminder — the master switch", () => {
  it("starts off; mounting never switches anything", async () => {
    await mount();
    expect(latest!.enabled).toBe(false);
    expect(native.setEnabled).not.toHaveBeenCalled();
  });

  it("enabling switches the master on once, in the interface language, and persists", async () => {
    await mount("en");
    await toggle();
    expect(latest!.enabled).toBe(true);
    expect(loadPrayerReminderSettings().enabled).toBe(true);
    expect(native.setEnabled).toHaveBeenCalledTimes(1);
    expect(native.setEnabled).toHaveBeenCalledWith(true, "en");
  });

  it("disabling switches it off and persists", async () => {
    savePrayerReminderSettings({ enabled: true, prayers: ALL_ON });
    await mount();
    await toggle();
    expect(latest!.enabled).toBe(false);
    expect(native.setEnabled).toHaveBeenCalledWith(false, "ar");
    expect(loadPrayerReminderSettings().enabled).toBe(false);
  });

  it("follows Settings' master switch live (the same saved setting)", async () => {
    await mount();
    await act(async () => savePrayerReminderSettings({ enabled: true, prayers: ALL_ON }));
    expect(latest!.enabled).toBe(true);
    await act(async () => savePrayerReminderSettings({ enabled: false, prayers: ALL_ON }));
    expect(latest!.enabled).toBe(false);
    expect(native.setEnabled).not.toHaveBeenCalled();
  });

  it("an app restart reads the saved switch and never switches on its own", async () => {
    savePrayerReminderSettings({ enabled: true, prayers: ALL_ON });
    await mount();
    expect(latest!.enabled).toBe(true);
    expect(native.setEnabled).not.toHaveBeenCalled();
  });

  it("reports availability (the Android app only)", async () => {
    await mount();
    expect(latest!.available).toBe(false);
    await unmount();
    native.available = true;
    await mount();
    expect(latest!.available).toBe(true);
  });
});
