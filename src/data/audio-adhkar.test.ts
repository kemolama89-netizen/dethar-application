import { describe, expect, it } from "vitest";
import { AUDIO_ADHKAR_CATEGORY_ORDER, AUDIO_MISC_CATEGORY_ORDER, audioAdhkarItems, audioMiscItems } from "./audio-adhkar";
import { writtenAdhkarItems } from "./written-adhkar";
import { MISC_CATEGORY_ORDER, MISC_DUAS } from "./misc-library";

const audioIds = () => [
  ...audioAdhkarItems.morning.map((i) => i.id),
  ...audioAdhkarItems.evening.map((i) => i.id),
  ...AUDIO_MISC_CATEGORY_ORDER.flatMap((key) => audioMiscItems(key).map((i) => i.id)),
];

describe("Audio Adhkar content mirrors Written Adhkar", () => {
  it("has exactly Morning, Evening and Various", () => {
    expect(AUDIO_ADHKAR_CATEGORY_ORDER).toEqual(["morning", "evening", "misc"]);
  });

  it("Morning is the very same Written Morning list — items, order, ids, text", () => {
    expect(audioAdhkarItems.morning).toBe(writtenAdhkarItems.morning);
    expect(audioAdhkarItems.morning.length).toBeGreaterThan(0);
  });

  it("Evening is the very same Written Evening list — items, order, ids, text", () => {
    expect(audioAdhkarItems.evening).toBe(writtenAdhkarItems.evening);
    expect(audioAdhkarItems.evening.length).toBeGreaterThan(0);
  });

  it("Various covers every Misc Library category, in the library's own display order", () => {
    expect([...AUDIO_MISC_CATEGORY_ORDER].sort()).toEqual([...MISC_CATEGORY_ORDER].sort());
    expect(AUDIO_MISC_CATEGORY_ORDER[0]).toBe("comprehensive");
    expect(AUDIO_MISC_CATEGORY_ORDER.at(-1)).toBe("authenticRare");
  });

  it("each Various category holds the same item objects, in the same order, as the Written Misc category", () => {
    for (const key of MISC_CATEGORY_ORDER) {
      const written = MISC_DUAS.filter((item) => item.categories.includes(key));
      const audio = audioMiscItems(key);
      expect(audio.length, key).toBe(written.length);
      audio.forEach((item, i) => expect(item, `${key}[${i}]`).toBe(written[i]));
    }
  });

  it("Various contains every Misc Library item, and nothing else", () => {
    const miscIds = new Set(AUDIO_MISC_CATEGORY_ORDER.flatMap((key) => audioMiscItems(key).map((i) => i.id)));
    expect(miscIds).toEqual(new Set(MISC_DUAS.map((i) => i.id)));
  });

  it("excludes Prayer Adhkar", () => {
    expect(AUDIO_ADHKAR_CATEGORY_ORDER).not.toContain("prayer");
    const ids = new Set(audioIds());
    for (const item of writtenAdhkarItems.prayer) expect(ids.has(item.id), item.id).toBe(false);
  });
});
