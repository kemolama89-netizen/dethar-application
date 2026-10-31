import { describe, expect, it } from "vitest";
import {
  audioDurationMs,
  buildDailySlots,
  dailyWindowFor,
  itemDurationMs,
  planStartInWindow,
  sessionDurationMs,
  sessionEndMs,
  zonedInstant,
} from "./dailyAzkarWindows";
import type { NativePlaylistItem } from "./audioAdhkarNative";
import { calculatePrayerDay, KUWAIT_CITY_COORDINATES } from "./prayerTimes";
import type { PrayerLocation } from "./prayerTimes";
import { REPETITION_PAUSE_MS } from "./audioAdhkarPlayback";
import { buildDailyAudioPlaylist, buildMiscAudioPlaylist } from "./audioAdhkarSchedules";
import { saveSectionReciterChoice } from "./audioAdhkarScheduleSettings";

const MIN = 60_000;
const kuwait: PrayerLocation = { coordinates: KUWAIT_CITY_COORDINATES, timezone: "Asia/Kuwait", country: "KW" };
const day = { year: 2026, month: 10, day: 13 };

function item(id: string, files: Record<string, number>, repetitions = 1, extra: Partial<NativePlaylistItem> = {}): NativePlaylistItem & { files: Record<string, number> } {
  const paths = Object.keys(files);
  return { dhikrId: id, title: id, text: id, assetPaths: paths, repeatAssetPaths: paths, repeatStartMillis: 0, rotation: [], repetitions, files, ...extra };
}

function durations(...items: { files: Record<string, number> }[]) {
  const all = Object.assign({}, ...items.map((i) => i.files)) as Record<string, number>;
  return (path: string) => all[path];
}

describe("the daily windows come from the day's prayer times", () => {
  const { times } = calculatePrayerDay(kuwait, day);

  it("Morning: 30 minutes after Fajr until 30 minutes before Dhuhr", () => {
    expect(dailyWindowFor("morning", day, kuwait)).toEqual({ start: times.fajr.getTime() + 30 * MIN, end: times.dhuhr.getTime() - 30 * MIN });
  });

  it("Evening: 30 minutes after Asr until the location's midnight", () => {
    const window = dailyWindowFor("evening", day, kuwait)!;
    expect(window.start).toBe(times.asr.getTime() + 30 * MIN);
    // Kuwait is UTC+3 all year: midnight of the 14th is 21:00 UTC on the 13th.
    expect(window.end).toBe(Date.UTC(2026, 9, 13, 21, 0));
  });

  it("zonedInstant is the wall-clock time at the location, also across a DST change", () => {
    expect(zonedInstant(day, 7 * 60 + 15, "Asia/Kuwait")).toBe(Date.UTC(2026, 9, 13, 4, 15));
    // Berlin: CEST (UTC+2) until 25 Oct 2026, CET (UTC+1) after.
    expect(zonedInstant({ year: 2026, month: 10, day: 24 }, 8 * 60, "Europe/Berlin")).toBe(Date.UTC(2026, 9, 24, 6, 0));
    expect(zonedInstant({ year: 2026, month: 10, day: 26 }, 8 * 60, "Europe/Berlin")).toBe(Date.UTC(2026, 9, 26, 7, 0));
  });
});

describe("session duration", () => {
  it("adds every repetition and the silence between playbacks — never after the last", () => {
    const a = item("a", { "public/a.mp3": 10_000 }, 3);
    const b = item("b", { "public/b.mp3": 4_000 }, 1);
    expect(sessionDurationMs([a, b], durations(a, b))).toBe(3 * 10_000 + 4_000 + 3 * REPETITION_PAUSE_MS);
  });

  it("later repetitions play the repeat files from repeatStartMillis (a basmala only once)", () => {
    const q = item("q", { "public/basmala.mp3": 5_000, "public/ayah.mp3": 20_000 }, 3, {
      assetPaths: ["public/basmala.mp3", "public/ayah.mp3"],
      repeatAssetPaths: ["public/ayah.mp3"],
    });
    expect(itemDurationMs(q, durations(q))).toBe(25_000 + 2 * 20_000);
    const inFile = item("k", { "public/k.mp3": 30_000 }, 2, { repeatStartMillis: 6_000 });
    expect(itemDurationMs(inFile, durations(inFile))).toBe(30_000 + 24_000);
  });

  it("with random rotation, plans for the longest reciter", () => {
    const short = { assetPaths: ["public/s.mp3"], repeatAssetPaths: ["public/s.mp3"], repeatStartMillis: 0 };
    const long = { assetPaths: ["public/l.mp3"], repeatAssetPaths: ["public/l.mp3"], repeatStartMillis: 0 };
    const q = item("q", { "public/s.mp3": 10_000, "public/l.mp3": 15_000 }, 2, { rotation: [short, long] });
    expect(itemDurationMs(q, durations(q))).toBe(30_000);
  });

  it("is unknown (null) when a file wasn't measured — never guessed", () => {
    expect(sessionDurationMs([item("x", { "public/missing.mp3": 1 })], () => undefined)).toBeNull();
  });

  it("every bundled file the scheduled sessions can play has a measured duration", () => {
    for (const reciter of ["random"]) {
      saveSectionReciterChoice("morning", reciter);
      saveSectionReciterChoice("evening", reciter);
    }
    const playlists = [buildDailyAudioPlaylist("morning", { all: true }), buildDailyAudioPlaylist("evening", { all: true }), buildMiscAudioPlaylist({ all: true })];
    const paths = playlists.flat().flatMap((i) => [...i.assetPaths, ...i.repeatAssetPaths, ...i.rotation.flatMap((r) => [...r.assetPaths, ...r.repeatAssetPaths])]);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => audioDurationMs(p) === undefined)).toEqual([]);
    expect(sessionDurationMs(playlists[0])).toBeGreaterThan(0);
  });
});

describe("the start inside the window", () => {
  const window = { start: Date.UTC(2026, 9, 13, 3, 0), end: Date.UTC(2026, 9, 13, 8, 0) };

  it("keeps the preferred time when the session fits there", () => {
    expect(planStartInWindow(window, window.start + 60 * MIN, 30 * MIN)).toBe(window.start + 60 * MIN);
  });

  it("too late to finish: moves to the latest time that still finishes in the window", () => {
    expect(planStartInWindow(window, window.end - 10 * MIN, 30 * MIN)).toBe(window.end - 30 * MIN);
  });

  it("before the window: moves to the window's start; after it: back inside", () => {
    expect(planStartInWindow(window, window.start - 90 * MIN, 30 * MIN)).toBe(window.start);
    expect(planStartInWindow(window, window.end + 60 * MIN, 30 * MIN)).toBe(window.end - 30 * MIN);
  });

  it("a session longer than the window gets no start at all", () => {
    expect(planStartInWindow(window, window.start, 6 * 60 * MIN)).toBeNull();
  });

  it("counts the adhan pause it would have to wait out, and never starts inside one", () => {
    const pause = [[window.start + 120 * MIN, window.start + 150 * MIN] as const];
    // Preferred inside the pause → the nearest free minute (just before it, if the session fits around it).
    const at = planStartInWindow(window, window.start + 130 * MIN, 20 * MIN, pause, 2 * MIN)!;
    expect(at < pause[0][0] || at >= pause[0][1]).toBe(true);
    // A session crossing the pause ends 30 min + the redone dhikr later.
    expect(sessionEndMs(window.start + 110 * MIN, 20 * MIN, pause, 2 * MIN)).toBe(window.start + 150 * MIN + 10 * MIN + 2 * MIN);
    // Near the window's end the pause makes it too long: it moves earlier.
    const late = [[window.end - 40 * MIN, window.end - 10 * MIN] as const];
    const start = planStartInWindow(window, window.end - 45 * MIN, 20 * MIN, late, 0)!;
    expect(sessionEndMs(start, 20 * MIN, late, 0)).toBeLessThanOrEqual(window.end);
    // 10 min before the pause, 30 min of pause, the last 10 min: ends exactly at the window end.
    expect(start).toBe(window.end - 50 * MIN);
  });

  it("an unknown duration is only kept inside the window", () => {
    expect(planStartInWindow(window, window.end + MIN, null)).toBe(window.end - MIN);
  });
});

describe("one slot per day, inside that day's window", () => {
  const a = item("a", { "public/a.mp3": 10 * MIN });
  const base = { section: "morning" as const, playlist: [a], location: kuwait, adhanWindows: [], durationOf: durations(a) };

  it("plans each day's session at the user's start time, in its own day's window", () => {
    const now = new Date(Date.UTC(2026, 9, 12, 21, 0)); // midnight in Kuwait
    const slots = buildDailySlots({ ...base, startMinutes: 7 * 60, now, days: 3 });
    expect(slots).toHaveLength(3);
    slots.forEach((slot, i) => {
      expect(slot.at).toBe(zonedInstant({ year: 2026, month: 10, day: 13 + i }, 7 * 60, "Asia/Kuwait"));
      expect(slot.at).toBeGreaterThanOrEqual(slot.start);
      expect(slot.at + 10 * MIN).toBeLessThanOrEqual(slot.end);
    });
  });

  it("a start time after the window moves back into the same day's window — never to the next day", () => {
    const now = new Date(Date.UTC(2026, 9, 12, 21, 0));
    const [today] = buildDailySlots({ ...base, startMinutes: 13 * 60, now, days: 1 });
    expect(today.at).toBe(today.end - 10 * MIN);
    expect(new Date(today.at).getUTCDate()).toBe(13);
  });

  it("a window already over today is left out; a day where the session can't fit has none", () => {
    const afterMorning = new Date(Date.UTC(2026, 9, 13, 10, 0)); // 13:00 in Kuwait
    const slots = buildDailySlots({ ...base, startMinutes: 7 * 60, now: afterMorning, days: 2 });
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toBeGreaterThan(afterMorning.getTime());
    const huge = item("h", { "public/h.mp3": 12 * 60 * MIN });
    expect(buildDailySlots({ ...base, playlist: [huge], durationOf: durations(huge), startMinutes: 7 * 60, now: afterMorning, days: 3 })).toEqual([]);
  });

  it("nothing is planned without a start time or without adhkar", () => {
    const now = new Date(Date.UTC(2026, 9, 12, 21, 0));
    expect(buildDailySlots({ ...base, startMinutes: -1, now })).toEqual([]);
    expect(buildDailySlots({ ...base, playlist: [], startMinutes: 7 * 60, now })).toEqual([]);
  });

  it("Evening never runs past midnight", () => {
    const now = new Date(Date.UTC(2026, 9, 12, 21, 0));
    const [slot] = buildDailySlots({ ...base, section: "evening", startMinutes: 23 * 60 + 55, now, days: 1 });
    expect(slot.end).toBe(Date.UTC(2026, 9, 13, 21, 0));
    expect(slot.at + 10 * MIN).toBeLessThanOrEqual(slot.end);
  });
});
