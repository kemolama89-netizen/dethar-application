// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadEveningAudioSettings, saveEveningAudioSettings, startTimeToMinutes } from "./eveningAudioSettings";

beforeEach(() => localStorage.clear());

describe("Evening Audio settings persistence", () => {
  it("defaults to disabled with no start time", () => {
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: false, eveningAudioStartTime: "" });
  });

  it("persists enable/disable", () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "" });
    expect(loadEveningAudioSettings().eveningAudioEnabled).toBe(true);
    saveEveningAudioSettings({ eveningAudioEnabled: false, eveningAudioStartTime: "" });
    expect(loadEveningAudioSettings().eveningAudioEnabled).toBe(false);
  });

  it("persists the start time, and a new time replaces the old one", () => {
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:15" });
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: true, eveningAudioStartTime: "22:15" });
    saveEveningAudioSettings({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });
    expect(loadEveningAudioSettings().eveningAudioStartTime).toBe("22:12");
  });

  it("ignores corrupt or invalid stored data", () => {
    localStorage.setItem("dithar:audio-adhkar:evening:v1", "{not json");
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: false, eveningAudioStartTime: "" });
    localStorage.setItem("dithar:audio-adhkar:evening:v1", JSON.stringify({ eveningAudioEnabled: "yes", eveningAudioStartTime: "25:99" }));
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: false, eveningAudioStartTime: "" });
  });

  it("converts local HH:mm to minutes after midnight", () => {
    expect(startTimeToMinutes("22:12")).toBe(22 * 60 + 12);
    expect(startTimeToMinutes("00:00")).toBe(0);
    expect(startTimeToMinutes("")).toBe(-1);
  });
});
