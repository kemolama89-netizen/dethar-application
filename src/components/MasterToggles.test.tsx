// @vitest-environment jsdom
// The two master switches as the user sees them: the home card's prayer
// reminder toggle and its Audio Adhkar toggle (beside "الصلاة القادمة"),
// each kept in step with its Settings master — and never with the other.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { PrayerTimesPanel } from "./PrayerTimesPanel";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { PrayerNotificationsSettingsView } from "./PrayerNotificationsSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { saveManualLocation } from "../lib/locationSettings";
import { loadAudioAdhkarMasterEnabled } from "../lib/audioAdhkarScheduleSettings";
import { loadPrayerReminderSettings } from "../lib/prayerReminderSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = new Date("2026-10-10T06:00:00Z");
const KUWAIT = { source: "manual" as const, latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" };

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

async function mount(settings: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <div data-home="">
          <PrayerTimesPanel date={DATE} />
        </div>
        <div data-settings="">{settings}</div>
      </LanguageProvider>,
    );
  });
}

const homeSwitch = (name: string) => container.querySelector<HTMLButtonElement>(`[data-home] [data-switch="${name}"]`)!;
const audioSettingsSwitch = () => container.querySelector<HTMLButtonElement>("[data-settings] [data-master-switch]")!;
const prayerSettingsMaster = () => container.querySelector<HTMLButtonElement>("[data-settings] [data-master]")!;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  // The home toggle loads the scheduling module lazily.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  localStorage.clear();
  saveManualLocation(KUWAIT);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("the home Audio Adhkar toggle", () => {
  const togglesRow = () => container.querySelector<HTMLElement>("[data-home] [data-toggles-row]")!;
  const headingRow = (heading: string) => [...container.querySelectorAll<HTMLElement>("[data-home] div")].find((d) => d.children.length === 2 && d.firstElementChild?.textContent?.startsWith(heading))!;

  it("shares one row with the prayer reminder, right above 'الصلاة القادمة' — on by default, labelled in Arabic", async () => {
    await mount(null);
    const toggle = homeSwitch("audio-adhkar");
    expect(toggle.getAttribute("role")).toBe("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("الأذكار الصوتية التلقائية");
    const row = togglesRow();
    expect(row.contains(toggle)).toBe(true);
    expect(row.contains(homeSwitch("prayer-notifications"))).toBe(true);
    expect(row.textContent).not.toContain("الصلاة القادمة");
    // The heading row comes right after it (the reminder is off, so no note in between) and is unchanged.
    expect(row.nextElementSibling).toBe(headingRow("الصلاة القادمة"));
  });

  it("the two toggles sit at opposite ends (justify-between): Audio Adhkar at the start edge, the reminder at the end edge", async () => {
    await mount(null);
    const row = togglesRow();
    expect(row.className).toContain("justify-between");
    expect(row.children).toHaveLength(2);
    // Start edge (right in Arabic): Audio Adhkar, its switch outermost; end edge: the reminder, its switch outermost.
    expect(row.firstElementChild!.contains(homeSwitch("audio-adhkar"))).toBe(true);
    expect(row.firstElementChild!.firstElementChild).toBe(homeSwitch("audio-adhkar"));
    expect(row.lastElementChild!.contains(homeSwitch("prayer-notifications"))).toBe(true);
    expect(row.lastElementChild!.lastElementChild).toBe(homeSwitch("prayer-notifications"));
    expect(homeSwitch("audio-adhkar").className).toBe(homeSwitch("prayer-notifications").className);
  });

  it("is labelled in English too, in the same row above 'Next Prayer'", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    await mount(null);
    expect(homeSwitch("audio-adhkar").getAttribute("aria-label")).toBe("Automatic Audio Adhkar");
    expect(togglesRow().firstElementChild!.textContent).toBe("Automatic Audio Adhkar");
    expect(togglesRow().nextElementSibling).toBe(headingRow("Next Prayer"));
  });

  it("and Settings' master follow each other, and the choice persists", async () => {
    await mount(<AudioAdhkarSettingsView onBack={() => {}} />);
    await click(homeSwitch("audio-adhkar"));
    expect(homeSwitch("audio-adhkar").getAttribute("aria-checked")).toBe("false");
    expect(audioSettingsSwitch().getAttribute("aria-checked")).toBe("false");
    expect(container.querySelector("[data-settings]")!.textContent).toContain("إعدادات كل قسم محفوظة");
    expect(loadAudioAdhkarMasterEnabled()).toBe(false);

    await click(audioSettingsSwitch());
    expect(audioSettingsSwitch().getAttribute("aria-checked")).toBe("true");
    expect(homeSwitch("audio-adhkar").getAttribute("aria-checked")).toBe("true");
    expect(loadAudioAdhkarMasterEnabled()).toBe(true);
  });

  it("never moves the prayer reminder switch", async () => {
    await mount(null);
    const before = homeSwitch("prayer-notifications").getAttribute("aria-checked");
    await click(homeSwitch("audio-adhkar"));
    expect(homeSwitch("prayer-notifications").getAttribute("aria-checked")).toBe(before);
    expect(loadPrayerReminderSettings().enabled).toBe(false);
  });
});

describe("the home prayer reminder toggle", () => {
  it("and Settings → Prayer Notifications' master follow each other, independent of Audio Adhkar", async () => {
    await mount(<PrayerNotificationsSettingsView onBack={() => {}} />);
    expect(prayerSettingsMaster().getAttribute("aria-pressed")).toBe("false");
    await click(homeSwitch("prayer-notifications"));
    expect(homeSwitch("prayer-notifications").getAttribute("aria-checked")).toBe("true");
    expect(prayerSettingsMaster().getAttribute("aria-pressed")).toBe("true");

    await click(prayerSettingsMaster());
    expect(homeSwitch("prayer-notifications").getAttribute("aria-checked")).toBe("false");
    expect(loadPrayerReminderSettings().enabled).toBe(false);
    expect(homeSwitch("audio-adhkar").getAttribute("aria-checked")).toBe("true");
    expect(loadAudioAdhkarMasterEnabled()).toBe(true);
  });

  it("Settings says the master also covers the adhan", async () => {
    await mount(<PrayerNotificationsSettingsView onBack={() => {}} />);
    expect(container.querySelector("[data-master-hint]")!.textContent).toContain("الأذان");
  });
});
