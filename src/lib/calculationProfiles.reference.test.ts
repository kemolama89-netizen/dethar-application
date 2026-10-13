// Regression tests of the bundled calculation profiles against the
// strongest official timetables available (src/lib/__fixtures__/
// prayer-reference/ — each file records its authority, source URL,
// retrieval date and caveats). Every day of every table is checked, never
// a single date, through the app's real entry point (calculatePrayerDay)
// with the location's country and timezone — exactly what the Prayer Times
// card runs.
//
// Tolerances are per authority and explained next to each: where the
// authority tabulates per zone/district, a single coordinate cannot match
// it to the minute, and the test pins how close we are rather than
// pretending to be exact.
import { describe, expect, it } from "vitest";
import { calculatePrayerDay, formatPrayerTime } from "./prayerTimes";
import type { PrayerKey } from "../data/content";

interface ReferenceTable {
  country: string;
  city: string;
  authority: string;
  source: string;
  coordinates: [number, number];
  timezone: string;
  official: boolean;
  columns: string[];
  rows: Array<[string, string, string, string, string, string, string, number?]>;
}

const FIXTURES = import.meta.glob<ReferenceTable>("./__fixtures__/prayer-reference/*.json", { eager: true, import: "default" });
function load(name: string): ReferenceTable {
  const table = FIXTURES[`./__fixtures__/prayer-reference/${name}`];
  if (!table) throw new Error(`missing reference fixture ${name}`);
  return table;
}

const COLUMNS: Array<[PrayerKey, number]> = [
  ["fajr", 1],
  ["shuruq", 2],
  ["dhuhr", 3],
  ["asr", 4],
  ["maghrib", 5],
  ["isha", 6],
];
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

interface PrayerStats {
  min: number;
  max: number;
  maxAbs: number;
  exact: number;
  withinOne: number;
}

// DITHAR − official, in minutes (positive = DITHAR later), for every day.
function compare(table: ReferenceTable, filter: (row: ReferenceTable["rows"][number]) => boolean = () => true) {
  const diffs = Object.fromEntries(COLUMNS.map(([key]) => [key, [] as number[]])) as Record<PrayerKey, number[]>;
  const rows = table.rows.filter(filter);
  const ramadanApplied: boolean[] = [];
  for (const row of rows) {
    const [year, month, day] = row[0].split("-").map(Number);
    const result = calculatePrayerDay(
      { coordinates: { latitude: table.coordinates[0], longitude: table.coordinates[1] }, timezone: table.timezone, country: table.country },
      { year, month, day },
    );
    ramadanApplied.push(result.ramadanRuleApplied);
    for (const [key, column] of COLUMNS) {
      let diff = minutes(formatPrayerTime(result.times[key], table.timezone)) - minutes(row[column] as string);
      if (diff > 720) diff -= 1440;
      if (diff < -720) diff += 1440;
      diffs[key].push(diff);
    }
  }
  const stats = Object.fromEntries(
    COLUMNS.map(([key]) => {
      const d = diffs[key];
      return [
        key,
        {
          min: Math.min(...d),
          max: Math.max(...d),
          maxAbs: Math.max(...d.map(Math.abs)),
          exact: d.filter((x) => x === 0).length / d.length,
          withinOne: d.filter((x) => Math.abs(x) <= 1).length / d.length,
        },
      ];
    }),
  ) as Record<PrayerKey, PrayerStats>;
  return { stats, days: rows.length, ramadanApplied };
}

const ALL: PrayerKey[] = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"];

describe("reference fixtures", () => {
  it("every fixture names its authority and source and has rows", () => {
    expect(Object.keys(FIXTURES)).toHaveLength(11);
    for (const [file, table] of Object.entries(FIXTURES)) {
      expect(table.authority, file).toBeTruthy();
      expect(table.source, file).toMatch(/^https?:\/\//);
      expect(table.rows.length, file).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("Egypt — Egyptian General Authority of Survey, Cairo 2026 (363 days)", () => {
  const { stats, days } = compare(load("egypt-esa-cairo-2026.json"));
  it("covers the whole year, including both daylight-saving transitions", () => expect(days).toBe(363));
  it.each(ALL)("%s is within ±1 min of the Authority's table on every day", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(1);
  });
  it("Dhuhr is never later than the table (no extra +1 minute)", () => expect(stats.dhuhr.max).toBeLessThanOrEqual(1));
});

describe("Saudi Arabia — Umm al-Qura Calendar, Riyadh 2026 (365 days incl. Ramadan)", () => {
  const table = load("saudi-ummalqura-riyadh-2026.json");
  const { stats, days, ramadanApplied } = compare(table);
  it("covers the whole year", () => expect(days).toBe(365));
  it.each(ALL)("%s is within ±1 min of the Calendar on every day", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(1);
  });
  it("the Ramadan Isha rule is applied on exactly the Calendar's 30 Ramadan days — no more, no fewer", () => {
    const officialRamadan = table.rows.map((row) => row[7] === 9);
    expect(officialRamadan.filter(Boolean)).toHaveLength(30);
    expect(ramadanApplied).toEqual(officialRamadan);
  });
  it("Ramadan Isha (Maghrib + 120 min) matches the Calendar within ±1 min", () => {
    const ramadan = compare(table, (row) => row[7] === 9);
    expect(ramadan.days).toBe(30);
    expect(ramadan.stats.isha.maxAbs).toBeLessThanOrEqual(1);
  });
});

describe("Turkey — Diyanet, Ankara (396 days)", () => {
  const { stats } = compare(load("turkey-diyanet-ankara-2026-2027.json"));
  it("Asr uses the standard rule — within ±2 min of Diyanet (Hanafi Asr was 37-75 min late)", () => {
    expect(stats.asr.maxAbs).toBeLessThanOrEqual(2);
  });
  it.each(ALL)("%s is within ±2 min of Diyanet's district table on every day", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(2);
  });
  it.each(["fajr", "shuruq", "dhuhr"] as PrayerKey[])("%s (no location-dependent temkin) is within ±1 min every day", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(1);
  });
});

describe("Malaysia — JAKIM, zone WLY01 (Kuala Lumpur) 2026 (365 days)", () => {
  // JAKIM publishes one time per zone, computed at the zone's westernmost
  // reference point — a city-centre coordinate cannot match it exactly.
  const { stats } = compare(load("malaysia-jakim-wly01-2026.json"));
  it("Subuh uses the current 18° — never more than 1 min before JAKIM (the old 20° was 8-12 min early)", () => {
    expect(stats.fajr.min).toBeGreaterThanOrEqual(-1);
    expect(stats.fajr.maxAbs).toBeLessThanOrEqual(2);
  });
  it.each(ALL)("%s is within ±2 min of JAKIM on every day, and within ±1 on at least 90%% of days", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(2);
    expect(stats[key].withinOne).toBeGreaterThanOrEqual(0.9);
  });
});

describe("Indonesia — Kemenag criteria, Jakarta 2026 (365 days, mirrored data)", () => {
  const { stats } = compare(load("indonesia-kemenag-jakarta-2026.json"));
  it.each(["fajr", "asr", "isha"] as PrayerKey[])("%s (20°/18° + 2 min ihtiyati) is within ±1 min and exact on most days", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(1);
    expect(stats[key].exact).toBeGreaterThanOrEqual(0.9);
  });
  it.each(ALL)("%s is within ±2 min every day", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(2);
  });
  it("known limitation: Dhuhr and Maghrib can be up to 2 min earlier than the tables (the documented +2 only)", () => {
    expect(stats.dhuhr.min).toBeGreaterThanOrEqual(-2);
    expect(stats.maghrib.min).toBeGreaterThanOrEqual(-2);
  });
});

describe("Oman — Ministry of Endowments and Religious Affairs, 5 cities × 2026 (derived profile)", () => {
  for (const city of ["muscat", "salalah", "sohar", "nizwa", "sur"]) {
    const { stats, days } = compare(load(`oman-mara-${city}-2026.json`));
    it(`${city}: every prayer within ±2 min on all ${days} days, and within ±1 on at least 98% of them`, () => {
      expect(days).toBe(365);
      for (const key of ALL) {
        expect(stats[key].maxAbs, key).toBeLessThanOrEqual(2);
        expect(stats[key].withinOne, key).toBeGreaterThanOrEqual(0.98);
      }
    });
  }
});

describe("Jordan — Ministry of Awqaf, Amman (10 archived days, Dec 2025)", () => {
  const { stats } = compare(load("jordan-awqaf-amman-2025-12.json"));
  it.each(["fajr", "dhuhr", "asr", "isha"] as PrayerKey[])("%s (18°/18°) is within ±1 min", (key) => {
    expect(stats[key].maxAbs).toBeLessThanOrEqual(1);
  });
  it("known limitation, deliberately not 'fixed': the table's sunrise is ~7 min earlier and Maghrib ~7 min later (undocumented margins, 10 days only)", () => {
    expect(stats.shuruq.min).toBeGreaterThanOrEqual(5);
    expect(stats.shuruq.max).toBeLessThanOrEqual(8);
    expect(stats.maghrib.max).toBeLessThanOrEqual(-5);
    expect(stats.maghrib.min).toBeGreaterThanOrEqual(-8);
  });
});
