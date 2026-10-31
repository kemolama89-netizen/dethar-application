import { describe, expect, it } from "vitest";
import { AUDIO_ADHKAR_CATEGORY_ORDER, AUDIO_VARIOUS_ITEMS, AUDIO_VARIOUS_RECORDINGS, audioAdhkarItems } from "./audio-adhkar";
import { writtenAdhkarItems } from "./written-adhkar";
import { MISC_CATEGORY_ORDER, MISC_DUAS } from "./misc-library";
import { dhikrItems, sourceAr } from "./tasbeeh";

const audioIds = () => [
  ...audioAdhkarItems.morning.map((i) => i.id),
  ...audioAdhkarItems.evening.map((i) => i.id),
  ...AUDIO_VARIOUS_ITEMS.map((i) => i.id),
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

  it("Various holds every Tasbeeh dhikr except the standalone «الله أكبر», in the Tasbeeh order, with its exact text and citation", () => {
    const expected = dhikrItems.filter((d) => d.id !== 13);
    expect(AUDIO_VARIOUS_ITEMS).toHaveLength(dhikrItems.length - 1);
    AUDIO_VARIOUS_ITEMS.forEach((item, i) => {
      const d = expected[i];
      expect(item).toEqual({
        id: `tasbeeh-${d.id}`,
        text_ar: d.dhikr_ar,
        text_en: d.dhikr_en,
        transliteration_en: d.transliteration_en,
        virtue_ar: d.virtue_ar,
        virtue_en: d.virtue_en,
        source_ar: sourceAr[d.id],
        source_en: d.source,
        ...(AUDIO_VARIOUS_RECORDINGS[d.id] ? { audio: AUDIO_VARIOUS_RECORDINGS[d.id] } : {}),
      });
    });
  });

  it("Various ids are unique and never collide with a Morning/Evening id", () => {
    const various = AUDIO_VARIOUS_ITEMS.map((i) => i.id);
    expect(new Set(various).size).toBe(various.length);
    const written = new Set([...audioAdhkarItems.morning, ...audioAdhkarItems.evening].map((i) => i.id));
    for (const id of various) expect(written.has(id), id).toBe(false);
  });

  it("leaves Written's Misc Library intact", () => {
    expect(MISC_DUAS.length).toBeGreaterThan(0);
    expect(MISC_CATEGORY_ORDER.length).toBeGreaterThan(0);
  });

  it("excludes Prayer Adhkar", () => {
    expect(AUDIO_ADHKAR_CATEGORY_ORDER).not.toContain("prayer");
    const ids = new Set(audioIds());
    for (const item of writtenAdhkarItems.prayer) expect(ids.has(item.id), item.id).toBe(false);
  });

  it("drops only the standalone «الله أكبر» from Various; Tasbeeh still has it", () => {
    const allahuAkbar = dhikrItems.find((d) => d.id === 13)!;
    expect(allahuAkbar.dhikr_en).toBe("Allah is the Greatest.");
    expect(AUDIO_VARIOUS_ITEMS.some((i) => i.id === "tasbeeh-13" || i.text_ar === allahuAkbar.dhikr_ar)).toBe(false);
    // Longer dhikr that merely contain «الله أكبر» stay.
    for (const id of [11, 14, 16]) expect(AUDIO_VARIOUS_ITEMS.some((i) => i.id === `tasbeeh-${id}`), String(id)).toBe(true);
  });

  describe("Various recordings", () => {
    const azkarFiles = new Set(Object.keys(import.meta.glob("/public/audio/audio-azkar/*")));

    it("has a recording for every Various dhikr", () => {
      expect(AUDIO_VARIOUS_ITEMS.filter((i) => !i.audio).map((i) => i.id)).toEqual([]);
      expect(Object.keys(AUDIO_VARIOUS_RECORDINGS).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16]);
    });

    it("links tasbeeh_14.mp3 to «…والله أكبر، اللهم اغفر لي، اللهم ارحمني، اللهم ارزقني»", () => {
      const item = AUDIO_VARIOUS_ITEMS.find((i) => i.id === "tasbeeh-14")!;
      expect(item.text_ar).toBe(dhikrItems.find((d) => d.id === 14)!.dhikr_ar);
      expect(item.audio).toBe("audio/audio-azkar/tasbeeh_14.mp3");
    });

    it("gives each dhikr its own bundled local MP3 (one file per dhikr, all present in public/)", () => {
      const paths = Object.values(AUDIO_VARIOUS_RECORDINGS);
      expect(new Set(paths).size).toBe(paths.length);
      for (const [id, path] of Object.entries(AUDIO_VARIOUS_RECORDINGS)) {
        expect(path, id).toBe(`audio/audio-azkar/tasbeeh_${id.padStart(2, "0")}.mp3`);
        expect(azkarFiles.has(`/public/${path}`), path).toBe(true);
      }
    });

    it("leaves the unmatched «يا حي يا قيوم» file unused", () => {
      expect(azkarFiles.has("/public/audio/audio-azkar/ياحي ياقيوم.mp3")).toBe(true);
      expect(Object.values(AUDIO_VARIOUS_RECORDINGS).some((p) => p.includes("ياحي"))).toBe(false);
    });

    it("never gives the excluded standalone «الله أكبر» a place or a recording", () => {
      expect(AUDIO_VARIOUS_RECORDINGS[13]).toBeUndefined();
      expect(AUDIO_VARIOUS_ITEMS.some((i) => i.id === "tasbeeh-13")).toBe(false);
    });
  });
});
