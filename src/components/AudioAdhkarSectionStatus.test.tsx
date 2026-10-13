// @vitest-environment jsdom
// Settings → إعدادات الأذكار الصوتية: each section's status in the list is its
// OWN state (loadSectionStatus — the same one its page and the native sync
// use), whatever the master switch, and a save that couldn't reach
// localStorage still reads back as saved.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import {
  loadDailySchedule,
  loadMiscSchedule,
  loadSectionStatus,
  resetAudioAdhkarScheduleSettingsMemoryForTesting,
  saveAudioAdhkarMasterEnabled,
  saveDailySchedule,
  saveMiscSchedule,
} from "../lib/audioAdhkarScheduleSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <AudioAdhkarSettingsView onBack={() => {}} />
      </LanguageProvider>,
    );
  });
}
const click = async (el: Element | null) => {
  await act(async () => {
    el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
const rowText = (section: "morning" | "evening" | "misc") => container.querySelector(`[data-audio-schedule-row="${section}"]`)!.textContent!;
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text)!;
const back = () => click(container.querySelector('button[aria-label="رجوع"]'));
const setTime = async (selector: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  localStorage.clear();
  resetAudioAdhkarScheduleSettingsMemoryForTesting();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root.unmount());
  container.remove();
});

describe("each section's status in the list", () => {
  it("master on and every section on: each shows its real status — never 'متوقفة'", async () => {
    saveAudioAdhkarMasterEnabled(true);
    saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
    saveDailySchedule("evening", { enabled: true, startTime: "17:15" });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 10 });
    await mount();
    for (const section of ["morning", "evening", "misc"] as const) {
      expect(rowText(section), section).toContain("مفعّلة");
      expect(rowText(section), section).not.toContain("متوقفة");
    }
    expect(rowText("morning")).toContain("5:30");
    expect(rowText("misc")).toContain("كل 10 دقائق");
  });

  it("switched on without a start time: the list says on (and why it can't play), exactly as the section page does", async () => {
    await mount();
    await click(container.querySelector('[data-audio-schedule-row="morning"]'));
    await click(button("تفعيل"));
    expect(container.textContent).toContain("مفعّلة"); // the page
    await back();
    expect(rowText("morning")).toContain("مفعّلة");
    expect(rowText("morning")).toContain("لم يُحدَّد وقت البدء");
    expect(rowText("morning")).not.toContain("متوقفة");
    // Choosing a time completes it.
    await click(container.querySelector('[data-audio-schedule-row="morning"]'));
    await setTime("#morning-audio-start-time", "06:00");
    await back();
    expect(rowText("morning")).toContain("6:00");
    expect(rowText("morning")).not.toContain("لم يُحدَّد");
  });

  it("a section that is off says 'متوقفة' whatever the master switch", async () => {
    saveAudioAdhkarMasterEnabled(true);
    await mount();
    for (const section of ["morning", "evening", "misc"] as const) expect(rowText(section), section).toContain("متوقفة");
  });

  it("the master switch never changes a section's own status or settings — off only dims the list", async () => {
    saveDailySchedule("evening", { enabled: true, startTime: "17:15" });
    await mount();
    const before = rowText("evening");
    await click(container.querySelector("[data-master-switch]"));
    expect(container.querySelector("[data-master-switch]")!.getAttribute("aria-checked")).toBe("false");
    expect(rowText("evening")).toBe(before);
    expect(loadDailySchedule("evening")).toEqual({ enabled: true, startTime: "17:15" });
    await click(container.querySelector("[data-master-switch]"));
    expect(rowText("evening")).toBe(before);
  });

  it("is in English too", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    saveDailySchedule("morning", { enabled: true, startTime: "" });
    await mount();
    expect(rowText("morning")).toContain("On — no start time yet");
    expect(rowText("evening")).toContain("Off");
  });
});

describe("a save that can't reach localStorage (storage full or blocked)", () => {
  const failAudioAdhkarWrites = () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith("dithar:audio-adhkar:")) throw new DOMException("quota", "QuotaExceededError");
      return real.call(this, key, value);
    });
  };

  it("still reads back as saved — the list and the page agree that the section is on", async () => {
    saveDailySchedule("morning", { enabled: false, startTime: "05:30" }); // stored before storage filled up
    failAudioAdhkarWrites();
    await mount();
    await click(container.querySelector('[data-audio-schedule-row="morning"]'));
    await click(button("تفعيل"));
    await back();
    expect(rowText("morning")).toContain("مفعّلة");
    expect(loadSectionStatus("morning")).toEqual({ enabled: true, ready: true, issue: null });
  });

  it("covers Evening's own storage and Misc too", () => {
    saveDailySchedule("evening", { enabled: false, startTime: "" });
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: false });
    failAudioAdhkarWrites();
    saveDailySchedule("evening", { enabled: true, startTime: "18:00" });
    saveMiscSchedule({ ...loadMiscSchedule(), enabled: true });
    expect(loadDailySchedule("evening")).toEqual({ enabled: true, startTime: "18:00" });
    expect(loadSectionStatus("misc").enabled).toBe(true);
  });

  it("once storage works again, the stored value is used", () => {
    failAudioAdhkarWrites();
    saveDailySchedule("morning", { enabled: true, startTime: "05:30" });
    vi.restoreAllMocks();
    saveDailySchedule("morning", { enabled: false, startTime: "05:30" });
    expect(JSON.parse(localStorage.getItem("dithar:audio-adhkar:morning:v1")!)).toEqual({ enabled: false, startTime: "05:30" });
    expect(loadDailySchedule("morning").enabled).toBe(false);
  });
});

describe("loadSectionStatus — the one definition", () => {
  it("own switch, completeness and the reason", () => {
    expect(loadSectionStatus("morning")).toEqual({ enabled: false, ready: false, issue: null });
    saveDailySchedule("morning", { enabled: true, startTime: "" });
    expect(loadSectionStatus("morning")).toEqual({ enabled: true, ready: false, issue: "noStartTime" });
    saveMiscSchedule({ enabled: true, startTime: "09:00", endTime: "09:00", intervalMinutes: 5 });
    expect(loadSectionStatus("misc")).toEqual({ enabled: true, ready: false, issue: "invalidWindow" });
    saveMiscSchedule({ enabled: false, startTime: "09:00", endTime: "09:00", intervalMinutes: 5 });
    expect(loadSectionStatus("misc")).toEqual({ enabled: false, ready: false, issue: null });
  });
});
