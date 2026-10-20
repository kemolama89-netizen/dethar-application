// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { loadEveningAudioSettings } from "../lib/eveningAudioSettings";
import { loadDailySchedule, loadExcludedAdhkar, loadMiscSchedule, loadSectionReciterChoice } from "../lib/audioAdhkarScheduleSettings";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { audioAdhkarSettingsLabels } from "../data/audioAdhkarSettingsLabels";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function mount() {
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <AudioAdhkarSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  mount();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Unmount and mount again: only localStorage survives — an app restart for this view. */
function restart() {
  act(() => root.unmount());
  mount();
}

const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const row = (section: "morning" | "evening" | "misc") => container.querySelector(`[data-audio-schedule-row="${section}"]`) as HTMLButtonElement;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const setInput = async (selector: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const choose = async (selector: string, value: string) => {
  const select = container.querySelector<HTMLSelectElement>(selector)!;
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("Settings → إعدادات الأذكار الصوتية", () => {
  it("has three separate sections: Morning, Evening and Miscellaneous", () => {
    expect(container.textContent).toContain("إعدادات الأذكار الصوتية");
    expect(row("morning").textContent).toContain("أذكار الصباح");
    expect(row("evening").textContent).toContain("أذكار المساء");
    expect(row("misc").textContent).toContain("الأذكار المتنوعة");
    for (const section of ["morning", "evening", "misc"] as const) expect(row(section).textContent).toContain("متوقفة");
  });

  it("Evening: enables, sets the start time, chooses a reciter — all persist, and Morning is untouched", async () => {
    await click(row("evening"));
    await click(button("تفعيل"));
    await setInput("#evening-audio-start-time", "22:12");
    await choose("#evening-audio-reciter", "husary-murattal");
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    expect(loadSectionReciterChoice("evening")).toBe("husary-murattal");
    expect(loadDailySchedule("morning")).toEqual({ enabled: false, startTime: "" });
    expect(loadSectionReciterChoice("morning")).not.toBe("husary-murattal");
  });

  it("Morning has its own switch, time and reciter", async () => {
    await click(row("morning"));
    expect(container.querySelector("[data-audio-schedule-section='morning']")).not.toBeNull();
    await click(button("تفعيل"));
    await setInput("#morning-audio-start-time", "05:15");
    await choose("#morning-audio-reciter", "minshawi-murattal");
    expect(loadDailySchedule("morning")).toEqual({ enabled: true, startTime: "05:15" });
    expect(loadSectionReciterChoice("morning")).toBe("minshawi-murattal");
    expect(loadDailySchedule("evening")).toEqual({ enabled: false, startTime: "" });
    // The reciter list: random rotation first, then every available reciter — no "follow the main setting".
    const options = [...container.querySelectorAll<HTMLOptionElement>("#morning-audio-reciter option")];
    expect(options[0].value).toBe("random");
    expect(options[0].textContent).toBe("تناوب عشوائي بين القرّاء");
    expect(options.some((o) => o.value === "")).toBe(false);
    expect(options).toHaveLength(11);
    await choose("#morning-audio-reciter", "random");
    expect(loadSectionReciterChoice("morning")).toBe("random");
    expect(loadSectionReciterChoice("evening")).not.toBe("random");
  });

  it("Misc: start/end time and every interval (2, 3, 5, 10 minutes, 1 hour, or another) persist", async () => {
    await click(row("misc"));
    const intervals = [...container.querySelectorAll<HTMLOptionElement>("#misc-audio-interval option")].map((o) => [o.value, o.textContent]);
    expect(intervals).toEqual([
      ["2", "دقيقتان"],
      ["3", "3 دقائق"],
      ["5", "5 دقائق"],
      ["10", "10 دقائق"],
      ["60", "ساعة"],
      ["custom", "مدة أخرى…"],
    ]);
    await click(button("تفعيل"));
    await setInput("#misc-audio-start-time", "09:00");
    await setInput("#misc-audio-end-time", "21:00");
    await choose("#misc-audio-interval", "60");
    expect(loadMiscSchedule()).toEqual({ enabled: true, startTime: "09:00", endTime: "21:00", intervalMinutes: 60 });
    expect(loadDailySchedule("morning").enabled).toBe(false);
    expect(loadEveningAudioSettings().eveningAudioEnabled).toBe(false);
  });

  it("Misc: says when the window crosses midnight, and refuses an empty window", async () => {
    await click(row("misc"));
    await setInput("#misc-audio-start-time", "22:00");
    await setInput("#misc-audio-end-time", "02:00");
    expect(container.textContent).toContain("تمتد الفترة بعد منتصف الليل");
    await setInput("#misc-audio-end-time", "22:00");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("اختر وقتين مختلفين للبداية والنهاية.");
  });

  it("every section explains the adhan pause and, on the web, that scheduling is Android-only", async () => {
    for (const section of ["morning", "evening", "misc"] as const) {
      await click(row(section));
      expect(container.querySelector("[data-adhan-pause-note]")!.textContent).toContain("30 دقيقة");
      expect(container.textContent).toContain("متاحان في تطبيق أندرويد فقط");
      await click(container.querySelector('button[aria-label="رجوع"]')!);
    }
  });

  it("Misc: a custom interval is validated — saved when valid, refused with a clear message otherwise", async () => {
    await click(row("misc"));
    await choose("#misc-audio-interval", "custom");
    expect(container.querySelector("#misc-audio-custom-interval")).not.toBeNull();
    await setInput("#misc-audio-custom-interval", "17");
    expect(loadMiscSchedule().intervalMinutes).toBe(17);
    expect(container.querySelector("[data-interval-error]")).toBeNull();
    for (const bad of ["0", "-3", "2.5", "1000", ""]) {
      await setInput("#misc-audio-custom-interval", bad);
      expect(container.querySelector("[data-interval-error]")!.textContent, bad).toBe("أدخل عددًا صحيحًا من الدقائق بين 1 و720.");
      expect(loadMiscSchedule().intervalMinutes, bad).toBe(17); // the last valid one stays
    }
    // A saved custom interval reopens as "custom" with its value.
    await setInput("#misc-audio-custom-interval", "45");
    restart();
    await click(row("misc"));
    expect(container.querySelector<HTMLSelectElement>("#misc-audio-interval")!.value).toBe("custom");
    expect(container.querySelector<HTMLInputElement>("#misc-audio-custom-interval")!.value).toBe("45");
    // Back to a preset.
    await choose("#misc-audio-interval", "10");
    expect(loadMiscSchedule().intervalMinutes).toBe(10);
    expect(container.querySelector("#misc-audio-custom-interval")).toBeNull();
  });

  it("each section has a checklist of its adhkar, in order, all selected by default", async () => {
    await click(row("evening"));
    const boxes = [...container.querySelectorAll<HTMLInputElement>("[data-adhkar-checklist='evening'] input[type=checkbox]")];
    expect(boxes.length).toBe(22);
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(boxes[0].getAttribute("data-adhkar-id")).toBe("morning_001");
    expect(boxes[0].closest("label")!.textContent).toBe("آية الكرسي");
    await click(container.querySelector('button[aria-label="رجوع"]')!);
    await click(row("misc"));
    expect(container.querySelectorAll("[data-adhkar-checklist='misc'] input[type=checkbox]")).toHaveLength(15);
    expect(container.textContent).toContain("من 15 أذكار مختارة");
  });

  it("unchecking leaves a dhikr out; Deselect all leaves none and says nothing will play; Select all restores", async () => {
    await click(row("morning"));
    const box = (id: string) => container.querySelector<HTMLInputElement>(`[data-adhkar-checklist='morning'] input[data-adhkar-id="${id}"]`)!;
    await click(box("morning_003"));
    expect(loadExcludedAdhkar("morning")).toEqual(["morning_003"]);
    expect(box("morning_003").checked).toBe(false);
    expect(container.querySelector("[data-none-selected]")).toBeNull();

    await click(container.querySelector("[data-adhkar-checklist='morning'] [data-deselect-all]")!);
    expect(container.querySelector("[data-none-selected]")!.textContent).toBe("لم تختر أي ذكر، فلن يُشغَّل شيء في هذا القسم.");
    expect([...container.querySelectorAll<HTMLInputElement>("[data-adhkar-checklist='morning'] input")].some((b) => b.checked)).toBe(false);
    // Evening's selection is untouched.
    expect(loadExcludedAdhkar("evening")).toEqual([]);

    await click(container.querySelector("[data-adhkar-checklist='morning'] [data-select-all]")!);
    expect(loadExcludedAdhkar("morning")).toEqual([]);
    expect(container.querySelector("[data-none-selected]")).toBeNull();
  });

  it("the selection survives an app restart", async () => {
    await click(row("misc"));
    await click(container.querySelector("[data-adhkar-checklist='misc'] input[data-adhkar-id='tasbeeh-2']")!);
    restart();
    await click(row("misc"));
    expect(container.querySelector<HTMLInputElement>("[data-adhkar-checklist='misc'] input[data-adhkar-id='tasbeeh-2']")!.checked).toBe(false);
    expect(container.querySelector<HTMLInputElement>("[data-adhkar-checklist='misc'] input[data-adhkar-id='tasbeeh-3']")!.checked).toBe(true);
  });

  it("keeps every setting after an app restart, and the list shows each section's status", async () => {
    await click(row("morning"));
    await click(button("تفعيل"));
    await setInput("#morning-audio-start-time", "05:15");
    await click(container.querySelector('button[aria-label="رجوع"]')!);
    await click(row("misc"));
    await click(button("تفعيل"));
    await choose("#misc-audio-interval", "3");
    restart();
    expect(row("morning").textContent).toContain("مفعّلة");
    expect(row("evening").textContent).toContain("متوقفة");
    expect(row("misc").textContent).toMatch(/مفعّلة — .+ · كل 3 دقائق/);
    await click(row("morning"));
    expect(container.querySelector<HTMLInputElement>("#morning-audio-start-time")!.value).toBe("05:15");
  });

  it("is fully localized: the English page has the same sections and controls", () => {
    act(() => root.unmount());
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount();
    const en = audioAdhkarSettingsLabels.en;
    expect(row("morning").textContent).toContain(en.morning);
    expect(row("evening").textContent).toContain(en.evening);
    expect(row("misc").textContent).toContain(en.misc);
    expect(Object.keys(audioAdhkarSettingsLabels.en).sort()).toEqual(Object.keys(audioAdhkarSettingsLabels.ar).sort());
  });

  it("names the options in English in English mode — Various included — while selections stay keyed by id", async () => {
    // A selection made in Arabic …
    await click(row("misc"));
    await click(container.querySelector("[data-adhkar-checklist='misc'] input[data-adhkar-id='tasbeeh-2']")!);
    const misc = () => container.querySelector("[data-adhkar-checklist='misc']")!;
    expect(misc().textContent).toContain("سُبْحَانَ اللَّهِ");
    // … survives switching the interface to English, which shows English names.
    act(() => root.unmount());
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount();
    await click(row("misc"));
    expect(misc().textContent).toContain("Subḥāna Allāh");
    expect(misc().textContent).toContain("Glory be to Allah.");
    expect(misc().textContent).not.toContain("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ");
    expect(container.querySelector<HTMLInputElement>("[data-adhkar-checklist='misc'] input[data-adhkar-id='tasbeeh-2']")!.checked).toBe(false);
    expect(loadExcludedAdhkar("misc")).toEqual(["tasbeeh-2"]);
    await click(container.querySelector('button[aria-label="Back"]')!);
    await click(row("morning"));
    const morning = container.querySelector("[data-adhkar-checklist='morning']")!;
    expect(morning.textContent).toContain("Ayat al-Kursi");
    expect(morning.textContent).not.toMatch(/[\u0600-\u06FF]/);
  });
});
