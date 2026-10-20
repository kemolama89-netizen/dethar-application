// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { OCCASION_DHIKR, OCCASION_KEYS, buildOccasionPush, hasUmmAlQura, hijriDateOf, hijriOccasion, loadOccasionSettings, occasionFor, saveOccasionSettings } from "./islamicOccasions";
import { adjustForHijri, loadHijriAdjustment, saveHijriAdjustment } from "./hijriAdjustment";

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);

describe("Islamic occasions for the recurring Misc dhikr", () => {
  beforeEach(() => localStorage.clear());

  it("this runtime has the Umm al-Qura calendar (the tests below depend on it)", () => {
    expect(hasUmmAlQura()).toBe(true);
  });

  it("every Friday is Salawat upon the Prophet ﷺ only", () => {
    expect(OCCASION_DHIKR.friday).toEqual(["tasbeeh-9"]);
    expect(AUDIO_VARIOUS_ITEMS.find((i) => i.id === "tasbeeh-9")!.text_ar).toContain("صَلِّي");
    expect(occasionFor(day(2026, 10, 16))).toBe("friday");
    expect(occasionFor(day(2026, 10, 15))).toBeNull(); // an ordinary Thursday
  });

  it("finds Arafah, Eid and the first days of Dhul-Hijjah from the Umm al-Qura date (1447 AH)", () => {
    expect(hijriDateOf(day(2026, 5, 26), 0)).toEqual({ year: 1447, month: 12, day: 9 });
    expect(occasionFor(day(2026, 5, 26), 0)).toBe("arafah");
    expect(occasionFor(day(2026, 5, 27), 0)).toBe("eid"); // 10 Dhul-Hijjah
    expect(occasionFor(day(2026, 5, 28), 0)).toBe("eid"); // tashreeq
    expect(occasionFor(day(2026, 5, 30), 0)).toBe("eid"); // 13 Dhul-Hijjah
    expect(occasionFor(day(2026, 5, 31), 0)).toBeNull(); // 14 Dhul-Hijjah — back to normal
    expect(occasionFor(day(2026, 5, 18), 0)).toBe("dhulhijjah"); // 1 Dhul-Hijjah
    expect(occasionFor(day(2026, 5, 25), 0)).toBe("dhulhijjah"); // 8 Dhul-Hijjah
  });

  it("Friday wins even when it is Eid (Eid al-Fitr 1447 fell on a Friday)", () => {
    expect(hijriOccasion(hijriDateOf(day(2026, 3, 20), 0))).toBe("eid");
    expect(occasionFor(day(2026, 3, 20), 0)).toBe("friday");
  });

  it("Ramadan keeps the normal rotation (no specific recorded dhikr with reliable evidence)", () => {
    expect(hijriDateOf(day(2026, 3, 1), 0)!.month).toBe(9);
    expect(occasionFor(day(2026, 3, 3), 0)).toBeNull(); // a Tuesday in Ramadan
  });

  it("a regional adjustment moves the Hijri date: one day behind Umm al-Qura makes Arafah a day later", () => {
    expect(occasionFor(day(2026, 5, 26), -1)).toBe("dhulhijjah");
    expect(occasionFor(day(2026, 5, 27), -1)).toBe("arafah");
    saveHijriAdjustment(-1);
    expect(loadHijriAdjustment()).toBe(-1);
    expect(occasionFor(day(2026, 5, 27))).toBe("arafah");
    saveHijriAdjustment(9);
    expect(loadHijriAdjustment()).toBe(2);
    expect(adjustForHijri(day(2026, 5, 27), 0).getDate()).toBe(27);
  });

  it("pushes local-day windows for the Hijri occasions only, and a playlist per occasion from existing recordings", () => {
    const push = buildOccasionPush(day(2026, 5, 20, 15), 14, { enabled: true }, 0);
    expect(push.occasionsEnabled).toBe(true);
    const keys = push.occasions.map(([, , key]) => key);
    expect(keys).not.toContain("friday");
    const arafah = push.occasions.find(([, , key]) => key === "arafah")!;
    expect(arafah[0]).toBe(new Date(2026, 4, 26).getTime());
    expect(arafah[1]).toBe(new Date(2026, 4, 27).getTime());
    for (const key of OCCASION_KEYS) {
      expect(push.occasionPlaylists[key].map((p) => p.dhikrId)).toEqual(OCCASION_DHIKR[key]);
      for (const item of push.occasionPlaylists[key]) expect(item.assetPaths[0]).toMatch(/^public\/audio\/audio-azkar\/tasbeeh_\d+\.mp3$/);
    }
  });

  it("switched off: no occasion windows (native then skips Friday too)", () => {
    saveOccasionSettings({ enabled: false });
    expect(loadOccasionSettings().enabled).toBe(false);
    const push = buildOccasionPush(day(2026, 5, 20), 14);
    expect(push.occasionsEnabled).toBe(false);
    expect(push.occasions).toEqual([]);
  });

  it("is on by default", () => {
    expect(loadOccasionSettings().enabled).toBe(true);
  });
});
