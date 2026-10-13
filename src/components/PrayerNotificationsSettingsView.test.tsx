// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PrayerNotificationsSettingsView } from "./PrayerNotificationsSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { loadPrayerReminderSettings } from "../lib/prayerReminderSettings";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { prayerNotificationLabels } from "../data/prayerNotificationLabels";
import { saveManualLocation } from "../lib/locationSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function mount() {
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <PrayerNotificationsSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
}
beforeEach(() => {
  localStorage.clear();
  saveManualLocation({ source: "manual", latitude: 29.3759, longitude: 47.9774, timezone: "Asia/Kuwait", countryCode: "KW", cityNameAr: "الكويت", cityNameEn: "Kuwait" });
  container = document.createElement("div");
  document.body.appendChild(container);
  mount();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const master = () => container.querySelector("[data-master]") as HTMLButtonElement;
const prayerSwitch = (p: string) => container.querySelector(`#prayer-notify-${p}`) as HTMLButtonElement;

describe("Settings → تنبيهات الصلاة", () => {
  it("has a master switch and one switch per prayer — the five, never Shuruq", () => {
    expect(container.textContent).toContain("تنبيهات أوقات الصلاة");
    expect(master().getAttribute("aria-pressed")).toBe("false");
    const rows = [...container.querySelectorAll("[data-prayer-row]")].map((r) => r.getAttribute("data-prayer-row"));
    expect(rows).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
    expect(container.textContent).not.toContain("الشروق");
    for (const p of rows) expect(prayerSwitch(p!).getAttribute("aria-checked")).toBe("true");
  });

  it("the master switch and each prayer's switch persist independently", async () => {
    await click(master());
    expect(loadPrayerReminderSettings().enabled).toBe(true);
    await click(prayerSwitch("asr"));
    expect(loadPrayerReminderSettings().prayers).toEqual({ fajr: true, dhuhr: true, asr: false, maghrib: true, isha: true });
    expect(prayerSwitch("asr").getAttribute("aria-checked")).toBe("false");
    await click(master());
    expect(loadPrayerReminderSettings()).toEqual({ enabled: false, prayers: { fajr: true, dhuhr: true, asr: false, maghrib: true, isha: true } });
  });

  it("says so when every prayer is switched off", async () => {
    for (const p of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) await click(prayerSwitch(p));
    expect(container.textContent).toContain("لم تختر أي صلاة، فلن يصلك أي تنبيه.");
  });

  it("keeps the choices after an app restart", async () => {
    await click(master());
    await click(prayerSwitch("fajr"));
    act(() => root.unmount());
    mount();
    expect(master().getAttribute("aria-pressed")).toBe("true");
    expect(prayerSwitch("fajr").getAttribute("aria-checked")).toBe("false");
    expect(prayerSwitch("dhuhr").getAttribute("aria-checked")).toBe("true");
  });

  it("explains the source, where to turn on the adhan, and (on the web) that it's Android-only", () => {
    expect(container.textContent).toContain("تُحسب الأوقات من مواقيت الصلاة في التطبيق");
    expect(container.textContent).toContain("فعّل «تشغيل الأذان عند دخول الوقت» في صوت الأذان");
    expect(container.textContent).toContain("متاحة في تطبيق أندرويد فقط");
  });

  it("warns that nothing is scheduled while the location is unknown", async () => {
    saveManualLocation(null);
    act(() => root.unmount());
    mount();
    await click(master());
    expect(container.textContent).toContain("لم يُحدَّد موقعك بعد");
  });

  it("is fully localized in English with the same structure", () => {
    act(() => root.unmount());
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount();
    expect(container.textContent).toContain(prayerNotificationLabels.en.master);
    expect(container.textContent).toContain("Fajr");
    expect(Object.keys(prayerNotificationLabels.en).sort()).toEqual(Object.keys(prayerNotificationLabels.ar).sort());
  });
});
