// @vitest-environment jsdom
// This round's screens: the Religious Content Review center, the startup
// Hadith overlay, the Home dashboard, the now-playing panel, the Lataif in
// the full-screen reflection, and the prayer countdown's progress.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

const progress = vi.hoisted(() => ({ value: null as null | { positionMs: number; durationMs: number | null; loading: boolean } }));
vi.mock("../lib/audioAdhkarPlayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/audioAdhkarPlayer")>()),
  readAudioAdhkarProgress: async () => progress.value,
}));

import { LanguageProvider } from "../theme/LanguageContext";
import { LANGUAGE_STORAGE_KEY } from "../lib/appearancePreferences";
import { ContentReviewView } from "./ContentReviewView";
import { POEMS } from "../data/widgetContent";
import { StartupHadithOverlay } from "./StartupHadithOverlay";
import { FADE_MS, MAX_VISIBLE_MS, MIN_VISIBLE_MS, dismissStartupOverlay, resetStartupOverlayForTesting } from "../lib/startupOverlay";
import { DailyProgressCard } from "./HomeDashboard";
import { NowPlayingPanel } from "./AudioAdhkarScreen";
import { PROGRESS_POLL_MS } from "../lib/useAudioAdhkarProgress";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { STARTUP_HADITH_REVIEW_ID, isPublished, resetContentReviewCacheForTesting, reviewStatusOf, setReview } from "../lib/contentReview";
import { clearAllStats, recordListenedSessions, recordWirdComplete, recordWrittenRepetition } from "../lib/stats";
import { commitAudioCompletions } from "../lib/audioAdhkarCounts";
import { getCountdownFraction, getPreviousPrayerTime } from "../lib/nextPrayer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function mount(node: ReactNode) {
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
}
beforeEach(() => {
  localStorage.clear();
  resetContentReviewCacheForTesting();
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
const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const choose = async (select: HTMLSelectElement, value: string) => {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("Religious Content Review", () => {
  it("lists the live content, filters it, and saves a decision that publishes the item", async () => {
    mount(<ContentReviewView onBack={() => {}} />);
    expect(container.textContent).toContain("مراجعة المحتوى الديني");
    await choose(container.querySelector<HTMLSelectElement>("[data-review-filter='type']")!, "poetry");
    expect(container.querySelector("[data-review-count]")!.getAttribute("data-review-count")).toBe(String(POEMS.length));
    await type(container.querySelector<HTMLInputElement>("[data-review-search]")!, "البوصيري");
    const card = container.querySelector("[data-review-item='poetry:busiri-nafs']")!;
    expect(card.querySelector("[data-review-status]")!.getAttribute("data-review-status")).toBe("pending");
    await click([...card.querySelectorAll("button")].find((b) => b.textContent === "التفاصيل")!);
    expect(card.querySelector("[data-review-details]")!.textContent).toContain("src/data/widgetContent.ts");
    expect(card.querySelector("[data-review-warnings]")!.textContent).toContain("يحتاج تحققًا علميًّا");
    await choose(card.querySelector<HTMLSelectElement>("[data-review-select]")!, "approved");
    await click(card.querySelector("[data-review-save]")!);
    expect(isPublished("poetry:busiri-nafs")).toBe(true);
    expect(card.querySelector("[data-review-status]")!.getAttribute("data-review-status")).toBe("approved");
  });

  it("applies one status to every item shown, after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mount(<ContentReviewView onBack={() => {}} />);
    await choose(container.querySelector<HTMLSelectElement>("[data-review-filter='type']")!, "poetry");
    await choose(container.querySelector<HTMLSelectElement>("[data-review-bulk-status]")!, "needs-verification");
    await click(container.querySelector("[data-review-bulk-apply]")!);
    expect(reviewStatusOf("poetry:labid-batil")).toBe("needs-verification");
    expect(reviewStatusOf("poetry:zuhayr-khaliqa")).toBe("needs-verification");
  });
});

describe("Religious Content Review — categories and one-tap decisions", () => {
  const card = (id: string) => container.querySelector(`[data-review-item='${id}']`)!;

  it("offers the six categories, and a category lists its items in full", async () => {
    mount(<ContentReviewView onBack={() => {}} />);
    const cats = [...container.querySelectorAll("[data-review-category]")].map((b) => b.getAttribute("data-review-category"));
    expect(cats).toEqual(["all", "quran", "tafsir-reflections", "hadith", "dua-adhkar", "poetry", "comments-translations"]);
    await click(container.querySelector("[data-review-category='quran']")!);
    await type(container.querySelector<HTMLInputElement>("[data-review-search]")!, "q33-41");
    const latifa = card("lataif:q33-41");
    // Shown in full at once: the verse, its place, the tafsir with its source and reference, and where it appears.
    const details = latifa.querySelector("[data-review-details]")!;
    expect(details.textContent).toContain("سورة الأحزاب، الآية 41–42");
    expect(details.textContent).toContain("التفسير العلمي");
    expect(details.textContent).toContain("تفسير السعدي");
    expect(details.textContent).toContain("33:41");
    expect(details.textContent).toContain("الودجت");
    // DITHAR's own reflections are inside it, apart from the tafsir, each with its own decision.
    const comments = latifa.querySelector("[data-review-comments='lataif:q33-41']")!;
    expect(comments.textContent).toContain("ليست تفسيرًا");
    expect(comments.querySelector("[data-review-comment='lataif:q33-41:c1']")).not.toBeNull();
  });

  it("approves, rejects or flags an item in one tap, persistently, and only approval publishes", async () => {
    mount(<ContentReviewView onBack={() => {}} />);
    await click(container.querySelector("[data-review-category='hadith']")!);
    await type(container.querySelector<HTMLInputElement>("[data-review-search]")!, "tirmidhi-3377");
    const item = card("hadith:tirmidhi-3377");
    expect(reviewStatusOf("hadith:tirmidhi-3377")).toBe("pending");
    expect(isPublished("hadith:tirmidhi-3377")).toBe(false);
    const actions = item.querySelector("[data-review-actions='hadith:tirmidhi-3377']")!;
    await click(actions.querySelector("[data-review-action='needs-verification']")!);
    expect(reviewStatusOf("hadith:tirmidhi-3377")).toBe("needs-verification");
    await click(actions.querySelector("[data-review-action='approved']")!);
    expect(isPublished("hadith:tirmidhi-3377")).toBe(true);
    // Its comment is decided separately, and stays unpublished until approved.
    const comment = item.querySelector("[data-review-actions='hadith:tirmidhi-3377:c1']")!;
    expect(isPublished("hadith:tirmidhi-3377:c1")).toBe(false);
    await click(comment.querySelector("[data-review-action='rejected']")!);
    expect(reviewStatusOf("hadith:tirmidhi-3377:c1")).toBe("rejected");
    // Saved on the device, apart from the text: a fresh read (as after a restart) still has them.
    resetContentReviewCacheForTesting();
    expect(reviewStatusOf("hadith:tirmidhi-3377")).toBe("approved");
    expect(reviewStatusOf("hadith:tirmidhi-3377:c1")).toBe("rejected");
  });
});

describe("launch intro (startup Hadith)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStartupOverlayForTesting();
  });

  // Its time starts after it is painted (two frames), and its text once the display font
  // is ready (immediately here: jsdom has no FontFaceSet).
  const flushFont = async () => {
    await act(async () => void vi.advanceTimersByTime(40));
    await act(async () => {});
  };

  it("covers the screen from its first paint, shows the Hadith, then leaves once the app is ready", async () => {
    mount(<StartupHadithOverlay appReady />);
    const intro = container.querySelector<HTMLElement>("[data-startup-overlay]")!;
    expect(intro.className).toContain("fixed inset-0"); // opaque and full screen: Home is never seen behind it
    expect(container.querySelector("[data-startup-text]")!.textContent).toContain("ذكر الله تعالى");
    await flushFont();
    expect(intro.className).toContain("is-text-ready");
    // Its minimum counts from the frame that shows the text (about two frames later).
    act(() => vi.advanceTimersByTime(MIN_VISIBLE_MS - 1));
    expect(container.querySelector("[data-startup-overlay='visible']")).not.toBeNull();
    act(() => vi.advanceTimersByTime(40));
    expect(container.querySelector("[data-startup-overlay='leaving']")).not.toBeNull();
    act(() => vi.advanceTimersByTime(FADE_MS));
    expect(container.querySelector("[data-startup-overlay]")).toBeNull();
  });

  it("tells App when its text is on screen (so Home mounts then), and at once when it isn't showing", async () => {
    const shown = vi.fn();
    mount(<StartupHadithOverlay appReady={false} onShown={shown} />);
    expect(shown).not.toHaveBeenCalled();
    await flushFont();
    act(() => vi.advanceTimersByTime(40));
    expect(shown).toHaveBeenCalled();
    act(() => root.unmount());
    const again = vi.fn();
    mount(<StartupHadithOverlay appReady={false} onShown={again} />); // already shown this launch
    expect(again).toHaveBeenCalled();
  });

  it("never stays longer than the cap, even if the app isn't ready", async () => {
    mount(<StartupHadithOverlay appReady={false} />);
    await flushFont();
    act(() => vi.advanceTimersByTime(MIN_VISIBLE_MS + 100));
    expect(container.querySelector("[data-startup-overlay='visible']")).not.toBeNull();
    act(() => vi.advanceTimersByTime(MAX_VISIBLE_MS));
    expect(container.querySelector("[data-startup-overlay='visible']")).toBeNull();
  });

  it("a tap, or a reminder opened from the widget, ends it at once", async () => {
    mount(<StartupHadithOverlay appReady />);
    await flushFont();
    act(() => container.querySelector<HTMLElement>("[data-startup-overlay]")!.click());
    expect(container.querySelector("[data-startup-overlay='leaving']")).not.toBeNull();
    act(() => root.unmount());
    resetStartupOverlayForTesting();
    mount(<StartupHadithOverlay appReady />);
    await flushFont();
    act(() => dismissStartupOverlay());
    expect(container.querySelector("[data-startup-overlay='leaving']")).not.toBeNull();
  });

  it("removes the static launch cover from index.html, whether or not it shows", () => {
    const cover = document.createElement("div");
    cover.id = "dithar-launch-cover";
    document.body.appendChild(cover);
    setReview(STARTUP_HADITH_REVIEW_ID, { status: "needs-verification" });
    mount(<StartupHadithOverlay appReady />);
    expect(document.getElementById("dithar-launch-cover")).toBeNull();
    setReview(STARTUP_HADITH_REVIEW_ID, { status: "approved" });
  });

  it("appears once per launch — a WebView reload in the same launch too — and not at all unless approved", () => {
    mount(<StartupHadithOverlay appReady />);
    act(() => root.unmount());
    mount(<StartupHadithOverlay appReady />);
    expect(container.querySelector("[data-startup-overlay]")).toBeNull();
    act(() => root.unmount());
    expect(sessionStorage.getItem("dithar:startup-intro-shown")).toBe("1");
    resetStartupOverlayForTesting();
    setReview(STARTUP_HADITH_REVIEW_ID, { status: "needs-verification" });
    mount(<StartupHadithOverlay appReady />);
    expect(container.querySelector("[data-startup-overlay]")).toBeNull();
  });
});

describe("Home dashboard", () => {
  it("shows today's real activity, keeps listening apart from repetitions, and updates as things are recorded", async () => {
    mount(<DailyProgressCard />);
    expect(container.querySelector("[data-home-wirds]")!.getAttribute("data-home-wirds")).toBe("0");
    expect(container.textContent).toContain("ابدأ بذكرٍ واحد");
    await act(async () => {
      recordWirdComplete("morning");
      recordWrittenRepetition("morning", "morning_001");
      commitAudioCompletions([{ id: "home:1", collection: "misc", dhikrId: "tasbeeh-1", sessionId: "s", durationMs: 4000 }]);
    });
    expect(container.querySelector("[data-home-wirds]")!.getAttribute("data-home-wirds")).toBe("1");
    expect(container.querySelector("[data-home-wird='morning']")!.hasAttribute("data-done")).toBe(true);
    expect(container.querySelector("[data-home-stat='written']")!.textContent).toContain("1");
    expect(container.querySelector("[data-home-stat='listening']")!.textContent).toContain("1");
    expect(container.querySelector("[data-home-stat='tasbeeh']")!.textContent).toContain("0");
  });

  it("labels the ring as completed Morning/Evening sessions, and says how each was completed", () => {
    clearAllStats();
    mount(<DailyProgressCard />);
    const ring = container.querySelector("[data-home-sessions-ring]")!;
    expect(ring.getAttribute("aria-label")).toBe("جلسات الأذكار المكتملة اليوم: 0 من 2");
    expect(container.textContent).toContain("جلسات الأذكار المكتملة اليوم");
    expect(container.textContent).toContain("أو بالاستماع إليها كاملةً");
    // Read Morning, then listen to Evening's whole session: 2 of 2, each with how it was completed.
    act(() => recordWirdComplete("morning"));
    act(() => void recordListenedSessions([{ category: "evening", eventId: "native-session-complete:evening:1" }]));
    expect(container.querySelector("[data-home-wirds]")!.getAttribute("data-home-wirds")).toBe("2");
    expect(container.querySelector("[data-home-wird='morning']")!.getAttribute("data-how")).toBe("read");
    expect(container.querySelector("[data-home-wird='evening']")!.getAttribute("data-how")).toBe("listened");
    expect(container.querySelector("[data-home-wird='evening']")!.textContent).toContain("(استماع)");
  });

  it("has no shortcut row: its destinations are all in the bottom navigation", () => {
    mount(<DailyProgressCard />);
    expect(container.querySelector("[data-home-shortcuts]")).toBeNull();
  });

  it("is in English with LTR labels in English mode", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    mount(<DailyProgressCard />);
    expect(container.textContent).toContain("Your dhikr today");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("now-playing panel", () => {
  const playback = { collection: "morning" as const, itemId: "morning_005", repetition: 2, total: 3, status: "playing" as const, reciter: "محمود خليل الحصري" };

  it("shows the title, repetition and reciter reported by the player, and the real position and length", async () => {
    progress.value = { positionMs: 15_000, durationMs: 60_000, loading: false };
    mount(<NowPlayingPanel title="سيد الاستغفار" playback={playback} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[data-now-playing-title]")!.textContent).toBe("سيد الاستغفار");
    expect(container.textContent).toContain("التكرار 2 من 3");
    expect(container.querySelector("[data-audio-reciter]")!.textContent).toContain("محمود خليل الحصري");
    expect(container.querySelector("[data-elapsed]")!.textContent).toBe("00:15");
    expect(container.querySelector("[data-duration]")!.textContent).toBe("01:00");
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("00:15 / 01:00");
    expect(container.querySelector("[role=progressbar]")!.getAttribute("data-progress")).toBe("0.25");
    expect(container.querySelector("[data-waveform]")!.getAttribute("data-waveform")).toBe("on");
  });

  it("never invents a length: unknown shows elapsed only; paused stops the waveform", async () => {
    progress.value = { positionMs: 3_000, durationMs: null, loading: false };
    mount(<NowPlayingPanel playback={{ ...playback, status: "paused", reciter: undefined }} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[data-duration]")!.textContent).toBe("--:--");
    expect(container.querySelector("[role=progressbar]")!.getAttribute("data-progress")).toBe("unknown");
    expect(container.querySelector("[data-waveform]")!.getAttribute("data-waveform")).toBe("off");
    expect(container.querySelector("[data-audio-reciter]")).toBeNull();
  });

  it("waits for slow metadata honestly, then shows the real length as soon as the file reports it", async () => {
    vi.useFakeTimers();
    progress.value = { positionMs: 0, durationMs: null, loading: true };
    mount(<NowPlayingPanel title="آية الكرسي" playback={playback} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("--:-- / --:--");
    expect(container.querySelector("[data-loading]")).not.toBeNull();
    expect(container.textContent).not.toContain("NaN");
    // The file's metadata arrives: the next reading (polled while playing) carries it.
    progress.value = { positionMs: 18_000, durationMs: 165_000, loading: false };
    await act(async () => {
      vi.advanceTimersByTime(PROGRESS_POLL_MS);
      await Promise.resolve();
    });
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("00:18 / 02:45");
    expect(container.querySelector("[data-loading]")).toBeNull();
  });

  it("a NaN duration from the player is shown as unknown, not as NaN", async () => {
    progress.value = { positionMs: 5_000, durationMs: NaN, loading: false };
    mount(<NowPlayingPanel playback={playback} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("00:05 / --:--");
    expect(container.querySelector("[role=progressbar]")!.getAttribute("data-progress")).toBe("unknown");
  });

  it("switching to another dhikr or repetition drops the previous position until the new one is read", async () => {
    progress.value = { positionMs: 40_000, durationMs: 60_000, loading: false };
    mount(<NowPlayingPanel title="الأول" playback={playback} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("00:40 / 01:00");
    progress.value = { positionMs: 1_000, durationMs: 20_000, loading: false };
    await act(async () => {
      root.render(
        <LanguageProvider>
          <NowPlayingPanel title="الثاني" playback={{ ...playback, itemId: "morning_006", repetition: 1 }} />
        </LanguageProvider>,
      );
      await Promise.resolve();
    });
    expect(container.querySelector("[data-now-playing-title]")!.textContent).toBe("الثاني");
    expect(container.querySelector("[data-playback-time]")!.textContent).toBe("00:01 / 00:20");
  });

  it("stops the waveform while the app is hidden or the player is scrolled off screen, and restarts it after", async () => {
    progress.value = { positionMs: 1_000, durationMs: 10_000, loading: false };
    let report: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          report = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    mount(<NowPlayingPanel playback={playback} />);
    await act(async () => {
      await Promise.resolve();
    });
    const wave = () => container.querySelector("[data-waveform]")!.getAttribute("data-waveform");
    expect(wave()).toBe("on");
    act(() => report!([{ isIntersecting: false }]));
    expect(wave()).toBe("off");
    act(() => report!([{ isIntersecting: true }]));
    expect(wave()).toBe("on");

    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(wave()).toBe("off");
    visibility.mockReturnValue("visible");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(wave()).toBe("on");
    visibility.mockRestore();
    act(() => root.unmount());
    expect(disconnect).toHaveBeenCalled();
    mount(<span />); // afterEach unmounts again
    vi.unstubAllGlobals();
  });
});

describe("Quranic Lataif in the full-screen reflection", () => {
  it("shows the verse, the verbatim tafsir under its own label, and DITHAR's comment separately (once approved)", () => {
    setReview("lataif:q33-41", { status: "approved" });
    setReview("lataif:q33-41:c1", { status: "approved" });
    mount(<SpiritualReminderView itemId="lataif:q33-41" onClose={() => {}} />);
    expect(container.querySelector("[data-reminder-kind]")!.textContent).toBe("لطيفة قرآنية");
    expect(container.querySelector("[data-reminder-evidence='tafsir']")!.textContent).toContain("من التفسير");
    expect(container.querySelector("[data-reminder-evidence='tafsir']")!.textContent).toContain("تفسير السعدي");
    expect(container.querySelector("[data-reminder-comment]")!.getAttribute("data-reminder-comment")).toBe("lataif:q33-41:c1");
  });
});

describe("prayer countdown progress", () => {
  const d = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 15, h, m));
  const times = { fajr: d(2), shuruq: d(3, 20), dhuhr: d(8, 40), asr: d(12), maghrib: d(14, 30), isha: d(16) } as never;

  it("measures from the actual previous prayer — before Fajr, yesterday's Isha", () => {
    expect(getPreviousPrayerTime(times, d(-8), d(10))).toEqual(d(8, 40));
    expect(getPreviousPrayerTime(times, d(-8), d(1))).toEqual(d(-8));
    expect(getCountdownFraction(d(8), d(12), d(10))).toBe(0.5);
    expect(getCountdownFraction(d(8), d(12), d(13))).toBe(1);
    expect(getCountdownFraction(d(8), d(8), d(8))).toBe(0);
  });
});
