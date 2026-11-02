import { describe, expect, it } from "vitest";
import { nextPrayerCountdownText } from "./nextPrayerCountdownText";

const ar = (hours: number, minutes: number, seconds = 30) => nextPrayerCountdownText({ hours, minutes, seconds }, "ar");
const en = (hours: number, minutes: number, seconds = 30) => nextPrayerCountdownText({ hours, minutes, seconds }, "en");

describe("the Home countdown line", () => {
  it("Arabic follows the counted-noun forms", () => {
    expect(ar(1, 0)).toBe("بعد ساعة");
    expect(ar(2, 0)).toBe("بعد ساعتين");
    expect(ar(8, 0)).toBe("بعد 8 ساعات");
    expect(ar(11, 0)).toBe("بعد 11 ساعة");
    expect(ar(0, 1)).toBe("بعد دقيقة");
    expect(ar(0, 2)).toBe("بعد دقيقتين");
    expect(ar(0, 10)).toBe("بعد 10 دقائق");
    expect(ar(0, 51)).toBe("بعد 51 دقيقة");
    expect(ar(8, 49)).toBe("بعد 8 ساعات و49 دقيقة");
  });

  it("English follows singular and plural", () => {
    expect(en(1, 0)).toBe("in 1 hour");
    expect(en(8, 49)).toBe("in 8 hours and 49 minutes");
    expect(en(0, 1)).toBe("in 1 minute");
  });

  it("shows seconds only in the last minute, and nothing ticks before that", () => {
    expect(ar(0, 1, 59)).toBe("بعد دقيقة");
    expect(en(2, 5, 59)).toBe("in 2 hours and 5 minutes");
    expect(ar(0, 0, 45)).toBe("بعد 45 ثانية");
    expect(ar(0, 0, 5)).toBe("بعد 5 ثوانٍ");
    expect(en(0, 0, 45)).toBe("in 45 seconds");
    expect(en(0, 0, 1)).toBe("in 1 second");
  });

  it("at zero it says now", () => {
    expect(ar(0, 0, 0)).toBe("الآن");
    expect(en(0, 0, 0)).toBe("now");
  });
});
