// @vitest-environment jsdom
// Component coverage for this round of improvements: the full-screen
// reflection, the reminders/weekly/summary settings pages, the occasions
// card, Daily Picks, and the written Misc card without a microphone-like
// "Listen" button.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { RemindersSettingsView } from "./RemindersSettingsView";
import { WeeklyScheduleView } from "./WeeklyScheduleView";
import { DailySummarySettingsView } from "./DailySummarySettingsView";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { MiscDuaCard } from "./MiscDuaCard";
import { ResumeAdhkarBanner } from "./ResumeAdhkarBanner";
import { MISC_DUAS } from "../data/misc-library";
import { loadHolidayStart, loadWeeklySchedule } from "../lib/weeklySchedule";
import { loadReminderSettings } from "../lib/reminderSettings";
import { loadSummarySettings } from "../lib/dailySummary";
import { loadOccasionSettings } from "../lib/islamicOccasions";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function mount(node: ReactNode) {
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
}

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

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

describe("the full-screen spiritual reminder", () => {
  it("overlays the Arabic text on a full-screen background, with evidence and reflection under separate labels", () => {
    mount(<SpiritualReminderView itemId="virtue:9" onClose={() => {}} />);
    const view = container.querySelector<HTMLElement>("[data-spiritual-reminder='virtue:9']")!;
    expect(view.style.backgroundImage).toContain("backgrounds/mosque-night.jpg");
    expect(view.querySelector("[data-reminder-text]")!.textContent).toContain("صَلِّي");
    expect(view.querySelector("[data-reminder-evidence]")!.textContent).toContain("من السنة");
    const reflection = view.querySelector("[data-reminder-reflection]")!;
    expect(reflection.textContent).toContain("تأمّل");
    expect(reflection.textContent).toContain("وليست نصًّا مأثورًا");
  });

  it("closes itself after 30 seconds, and the timer can be paused", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    mount(<SpiritualReminderView itemId="virtue:8" onClose={onClose} />);
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await click(container.querySelector("button[aria-pressed]")!); // pause
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onClose).not.toHaveBeenCalled();
    await click(container.querySelector("button[aria-pressed]")!); // continue
    await act(async () => {
      vi.advanceTimersByTime(21_000);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a Qur'anic evidence under the Qur'an label (duas)", () => {
    mount(<SpiritualReminderView itemId="dua:dua-al-karb" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-evidence='quran']")!.textContent).toContain("من القرآن الكريم");
  });

  it("is in English, with the English meaning, in English mode — the Arabic text unchanged", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount(<SpiritualReminderView itemId="virtue:8" onClose={() => {}} />);
    expect(container.textContent).toContain("Reflection");
    expect(container.textContent).toContain("Praise be to Allah.");
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe("الْحَمْدُ لِلَّهِ");
  });
});

describe("Settings → Reminders & widget", () => {
  it("is off by default; enabling, choosing kinds and the interval persist", async () => {
    mount(<RemindersSettingsView onBack={() => {}} />);
    expect(loadReminderSettings().enabled).toBe(false);
    await click(container.querySelector("[data-reminders-master] [role=switch]")!);
    expect(loadReminderSettings().enabled).toBe(true);
    await click(container.querySelector("[data-category='hadith']")!);
    expect(loadReminderSettings().categories.hadith).toBe(false);
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>("#reminder-interval")!;
      select.value = "240";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(loadReminderSettings().intervalMinutes).toBe(240);
  });

  it("keeps at least one content kind on", async () => {
    mount(<RemindersSettingsView onBack={() => {}} />);
    await click(container.querySelector("[data-category='dua']")!);
    await click(container.querySelector("[data-category='hadith']")!);
    await click(container.querySelector("[data-category='poetry']")!);
    await click(container.querySelector("[data-category='lataif']")!);
    await click(container.querySelector("[data-category='virtue']")!);
    expect(loadReminderSettings().categories).toEqual({ dua: false, hadith: false, virtue: true, poetry: false, lataif: false });
  });

  it("chooses a fixed background, explains the widget apart from notifications, and previews full screen", async () => {
    mount(<RemindersSettingsView onBack={() => {}} />);
    const radios = container.querySelectorAll<HTMLInputElement>("input[name='reminder-background']");
    await click(radios[1]);
    await click(container.querySelector("[data-background='arches-dusk']")!);
    expect(loadReminderSettings()).toMatchObject({ backgroundMode: "fixed", fixedBackground: "arches-dusk" });
    expect(container.querySelector("[data-widget-info]")!.textContent).toContain("منفصل عن الإشعارات");
    await click(container.querySelector("[data-preview-item]")!);
    expect(container.querySelector("[data-spiritual-reminder]")).not.toBeNull();
  });
});

describe("Settings → Weekly schedule", () => {
  it("shows only the holiday start settings — no per-weekday times", () => {
    mount(<WeeklyScheduleView onBack={() => {}} />);
    expect(container.querySelector("[data-holiday-start]")).not.toBeNull();
    expect(container.querySelector("[data-weekly-switch]")).toBeNull();
    expect(container.querySelector("[data-weekday]")).toBeNull();
    expect(container.querySelectorAll("input[type='time']")).toHaveLength(1);
    expect(container.textContent).not.toContain("بلا تقييد");
  });
  it("sets the holiday days and one start time for them, independently of the weekly times", async () => {
    mount(<WeeklyScheduleView onBack={() => {}} />);
    const card = container.querySelector("[data-holiday-start]")!;
    expect(card.textContent).toContain("وقت بدء أيام الإجازة");
    // Off by default, with Friday and Saturday preselected.
    expect(loadHolidayStart()).toEqual({ enabled: false, days: [5, 6], time: "12:00" });
    expect(card.querySelector("[data-holiday-day='5']")!.getAttribute("aria-pressed")).toBe("true");
    await click(card.querySelector("[data-holiday-switch]")!);
    await click(card.querySelector("[data-holiday-day='6']")!); // Saturday off
    await click(card.querySelector("[data-holiday-day='4']")!); // Thursday on
    await setInput("#holiday-start-time", "11:00");
    expect(loadHolidayStart()).toEqual({ enabled: true, days: [4, 5], time: "11:00" });
    expect(loadWeeklySchedule().enabled).toBe(false);
  });
});

describe("Settings → End-of-day summary", () => {
  it("enables, sets the time and content, and shows today's recorded activity", async () => {
    mount(<DailySummarySettingsView onBack={() => {}} />);
    expect(container.querySelector("[data-summary-today]")!.textContent).toContain("لم يُسجَّل شيء اليوم بعد");
    await click(container.querySelector("[data-summary-switch]")!);
    await setInput("#summary-time", "22:00");
    expect(loadSummarySettings()).toMatchObject({ enabled: true, time: "22:00" });
  });

  it("a day with only Audio Adhkar listening (stopped part-way) never says nothing was recorded", async () => {
    const { recordAudioListening, todayLocalDate } = await import("../lib/stats");
    recordAudioListening([
      { category: "morning", dhikrId: "1", eventId: "e1", part: 0, occurredAt: { ts: Date.now(), localDate: todayLocalDate(), localTime: "08:00", timeZone: "UTC" }, listenedMs: 95_000 },
    ]);
    mount(<DailySummarySettingsView onBack={() => {}} />);
    const today = container.querySelector("[data-summary-today]")!.textContent!;
    expect(today).not.toContain("لم يُسجَّل شيء اليوم بعد");
    expect(today).toContain("لم تُسجَّل بعدُ قراءةٌ في الأذكار المكتوبة ولا تسبيح");
    // Its listening time, kept apart from repetitions.
    expect(container.querySelector("[data-summary-listening]")!.textContent).toContain("دقيقتان");
  });

  it("a day with recorded adhkar shows them, never the empty status beside them", async () => {
    const { clearAllStats, recordTasbeehRepetitions, recordWirdComplete } = await import("../lib/stats");
    clearAllStats();
    recordWirdComplete("morning");
    recordTasbeehRepetitions(1, 33);
    mount(<DailySummarySettingsView onBack={() => {}} />);
    const status = container.querySelector("[data-summary-status]")!;
    expect(status.getAttribute("data-summary-status")).toBe("recorded");
    expect(status.textContent).toContain("أذكار الصباح ✓");
    expect(status.textContent).toContain("التسبيح 33");
    expect(container.querySelector("[data-summary-today]")!.textContent).not.toContain("لم يُسجَّل شيء اليوم بعد");
    clearAllStats();
  });

  it("unreadable statistics are reported as unreadable — never as nothing recorded", async () => {
    const { clearAllStats } = await import("../lib/stats");
    localStorage.setItem("dithar:stats:events:v1", "{not json");
    // Drops the in-memory log, as another tab writing it would: the next read loads the broken text.
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    mount(<DailySummarySettingsView onBack={() => {}} />);
    const today = container.querySelector("[data-summary-today]")!.textContent!;
    expect(container.querySelector("[data-summary-status]")!.getAttribute("data-summary-status")).toBe("unavailable");
    expect(today).toContain("تعذّرت قراءة سجلّ اليوم");
    expect(today).not.toContain("لم يُسجَّل شيء اليوم بعد");
    expect(today).not.toContain("لم يُستمع اليوم إلى أي تسجيل بعد");
    clearAllStats();
  });
});

describe("Audio Adhkar settings → Miscellaneous: Fridays and occasions", () => {
  it("shows the occasions card with its evidence and can be switched off", async () => {
    mount(<AudioAdhkarSettingsView onBack={() => {}} />);
    await click(container.querySelector("[data-audio-schedule-row='misc']")!);
    const card = container.querySelector("[data-occasions]")!;
    expect(card.textContent).toContain("الصلاة على النبي ﷺ فقط");
    expect(card.textContent).toContain("أبو داود 1047");
    await click(card.querySelector("[data-occasions-switch]")!);
    expect(loadOccasionSettings().enabled).toBe(false);
  });

  it("Morning has a per-day time list and a reminder sound", async () => {
    mount(<AudioAdhkarSettingsView onBack={() => {}} />);
    await click(container.querySelector("[data-audio-schedule-row='morning']")!);
    expect(container.querySelector("[data-day-times='morning']")).not.toBeNull();
    expect(container.querySelector<HTMLSelectElement>("#morning-reminder-sound")!.value).toBe("birdsong");
  });
});

describe("written Misc cards", () => {
  it("have no microphone-like Listen button — copy, share and favourite remain", () => {
    mount(<MiscDuaCard item={MISC_DUAS[0]} isFavorite={false} onToggleFavorite={() => {}} onShowMeaning={() => {}} />);
    const labels = [...container.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(labels).not.toContain("استماع");
    expect(labels).toEqual(expect.arrayContaining(["نسخ النص", "إضافة إلى المفضلة"]));
    expect(container.querySelectorAll("button")).toHaveLength(3);
  });
});

describe("the Resume Adhkar banner", () => {
  it("renders nothing on the web (no scheduled sessions to interrupt)", () => {
    mount(<ResumeAdhkarBanner />);
    expect(container.querySelector("[data-resume-adhkar]")).toBeNull();
  });
});
