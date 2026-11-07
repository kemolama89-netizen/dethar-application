// @vitest-environment jsdom
// The Qur'an Journey's daily notification: what it invites to (today's page until it is read,
// then tomorrow's), missed days, round renewal, its text, and what is pushed to native.
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ calls: [] as unknown[], available: true }));
vi.mock("./quranJourneyNative", () => ({
  isJourneyNativeAvailable: () => native.available,
  QuranJourneyNative: {
    setJourneyNotice: async (options: unknown) => {
      native.calls.push(options);
      return { nextAt: null };
    },
  },
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: async () => ({ remove: async () => {} }) } }));

import { JOURNEY_PAGES, dailyAssignment, loadJourney, orderInsights, recordDailyInsightViewed } from "./quranJourney";
import type { InsightId, JourneyState } from "./quranJourney";
import { buildJourneyNotice, journeyNoticeText, loadJourneyNotifySettings, nextLocalDate, saveJourneyNotifySettings, startJourneyNotifySync, syncJourneyNotice } from "./quranJourneyNotify";
import { todayLocalDate } from "./stats";

const KEY = "dithar:quran-journey:v1";
const fake = async (page: number): Promise<InsightId[]> => orderInsights(page, [`2:${page}`, `3:${page}`, `4:${page}`]);
const day = (n: number) => {
  const d = new Date(2026, 0, 1 + n, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const roundsVisits = () => loadJourney()!.rounds.flatMap((r) => r.visits);

async function read(n: number) {
  const s = await dailyAssignment(day(n), fake);
  if (s.kind !== "assigned") throw new Error("not assigned");
  expect(recordDailyInsightViewed(s.assignment, new Date(2026, 0, 1 + n, 12))).toBe(true);
  return s.assignment;
}

beforeEach(() => {
  localStorage.clear();
  native.calls = [];
  native.available = true;
});

describe("what the notification invites to", () => {
  it("is today's page while it is unread, and building it counts nothing", async () => {
    const notice = await buildJourneyNotice("ar", day(0), fake);
    expect(notice).toMatchObject({ fromDate: day(0), page: 1, round: 1 });
    expect(notice!.insight).toBe((await fake(1))[0]);
    expect(roundsVisits()).toEqual([]);
  });

  it("moves to tomorrow's page once today's insight is read (nothing more today)", async () => {
    await read(0);
    const notice = await buildJourneyNotice("ar", day(0), fake);
    expect(notice).toMatchObject({ fromDate: day(1), page: 2, round: 1 });
    // Tomorrow's assignment is exactly what was announced.
    const tomorrow = await dailyAssignment(day(1), fake);
    expect(tomorrow).toMatchObject({ kind: "assigned", assignment: { page: 2, insight: notice!.insight } });
  });

  it("keeps the same page through missed days: none is skipped", async () => {
    await read(0);
    for (const n of [1, 2, 5, 9]) {
      const notice = await buildJourneyNotice("ar", day(n), fake);
      expect(notice).toMatchObject({ fromDate: day(n), page: 2 });
    }
    expect(roundsVisits().map((v) => v.page)).toEqual([1]);
    expect((await read(10)).page).toBe(2);
    expect(await buildJourneyNotice("ar", day(10), fake)).toMatchObject({ fromDate: day(11), page: 3 });
  });

  it("after page 604, invites to page 1 of a new round, with an insight that page hasn't had", async () => {
    const visits = [];
    for (let p = 1; p < JOURNEY_PAGES; p++) visits.push({ page: p, insight: (await fake(p))[0], localDate: "2025-01-01", ts: p });
    const state: JourneyState = { v: 1, rounds: [{ n: 1, startedOn: "2024-01-01", visits }] };
    localStorage.setItem(KEY, JSON.stringify(state));
    const last = await read(0);
    expect(last.page).toBe(JOURNEY_PAGES);
    expect(loadJourney()!.rounds[0].completedOn).toBe(day(0));
    const notice = await buildJourneyNotice("ar", day(0), fake);
    expect(notice).toMatchObject({ fromDate: day(1), page: 1, round: 2 });
    expect(notice!.insight).not.toBe((await fake(1))[0]);
    expect((await fake(1)).includes(notice!.insight)).toBe(true);
    const next = await read(1);
    expect(next).toMatchObject({ round: 2, page: 1, insight: notice!.insight });
  });

  it("is nothing when the record can't be read", async () => {
    localStorage.setItem(KEY, "{broken");
    expect(await buildJourneyNotice("ar", day(0), fake)).toBeNull();
  });
});

describe("its text", () => {
  it("names the page and the verse, in the interface language, and quotes no Tafsir", () => {
    const a = { localDate: day(0), round: 1, page: 12, insight: "2:77" };
    expect(journeyNoticeText(a, "ar")).toEqual({ title: "رحلة القرآن: الصفحة ١٢ من ٦٠٤", body: "فائدة اليوم من تفسير السعدي على سورة البقرة، الآية ٧٧. اضغط لقراءتها." });
    expect(journeyNoticeText(a, "en").title).toBe("Qur'an Journey: page 12 of 604");
    expect(journeyNoticeText(a, "en").body).toContain("verse 77");
  });
});

describe("dates and settings", () => {
  it("steps to the next local day across month and year ends", () => {
    expect(nextLocalDate("2026-01-31")).toBe("2026-02-01");
    expect(nextLocalDate("2026-12-31")).toBe("2027-01-01");
    expect(nextLocalDate("2028-02-28")).toBe("2028-02-29");
  });

  it("is off by default at 08:00, and keeps a valid chosen time", () => {
    expect(loadJourneyNotifySettings()).toEqual({ enabled: false, time: "08:00" });
    saveJourneyNotifySettings({ enabled: true, time: "21:15" });
    expect(loadJourneyNotifySettings()).toEqual({ enabled: true, time: "21:15" });
    localStorage.setItem("dithar:quran-journey:notify:v1", JSON.stringify({ enabled: true, time: "99:99" }));
    expect(loadJourneyNotifySettings().time).toBe("08:00");
  });
});

describe("what native is given", () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));
  type Call = { enabled: boolean; minutes: number; notice?: { fromDate: string; page: number } };
  const last = () => native.calls[native.calls.length - 1] as Call;

  it("off: no notice, and nothing assigned", async () => {
    await syncJourneyNotice();
    expect(last()).toEqual({ enabled: false, minutes: 480, language: "ar" });
    expect(loadJourney()!.today).toBeUndefined();
  });

  it("on: the time in minutes and today's notice; a page read re-sends tomorrow's", async () => {
    saveJourneyNotifySettings({ enabled: true, time: "06:30" });
    const stop = startJourneyNotifySync();
    for (let i = 0; i < 400 && !last()?.notice; i++) await settle();
    expect(last()).toMatchObject({ enabled: true, minutes: 390, notice: { fromDate: todayLocalDate(), page: 1 } });
    const today = loadJourney()!.today!;
    expect(recordDailyInsightViewed(today)).toBe(true);
    for (let i = 0; i < 400 && last().notice?.page !== 2; i++) await settle();
    expect(last().notice).toMatchObject({ fromDate: nextLocalDate(todayLocalDate()), page: 2 });
    stop();
  });

  it("does nothing on the web", async () => {
    native.available = false;
    saveJourneyNotifySettings({ enabled: true, time: "06:30" });
    await syncJourneyNotice();
    expect(native.calls).toEqual([]);
  });
});
