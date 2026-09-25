import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import type { QuranReciter } from "../data/quranReciters";
import { getDefaultQuranReciter } from "../data/quranReciters";
import { GENERATED_MORNING_EVENING_AUDIO_IDS } from "../data/morningEveningAudio";
import type { MorningEveningCategory } from "../data/morningEveningAudio";
import {
  getMorningEveningAudioAssets,
  getMorningEveningAudioSource,
  getSpokenText,
  isAudioSafeDhikrId,
  playMorningEveningAudio,
  resolveMorningEveningAudio,
} from "./morningEveningAudio";
import type { MorningEveningLists } from "./morningEveningAudio";
import type { AudioElementLike } from "./audioEngine";
import { getActiveAudio, setAudioElementFactory, stopAudio } from "./audioEngine";

const CATEGORIES: MorningEveningCategory[] = ["morning", "evening"];

// The ids audio files are named after. Locked here on purpose: renaming or
// dropping one orphans its generated audio, so that must be a deliberate,
// test-visible change. (Order below is irrelevant — compared as sets.)
const LOCKED_IDS: Record<MorningEveningCategory, string[]> = {
  morning: [
    "morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005",
    "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012",
    "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_020",
    "morning_023",
  ],
  evening: [
    "morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005",
    "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012",
    "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_023",
    "evening_001",
  ],
};

const QURANIC_IDS = ["morning_001", "morning_002", "morning_002b", "morning_002c"];

// The exact set of generated files the current content needs.
const EXPECTED_AUDIO_IDS = [
  ...["005", "008", "009", "010", "011", "012", "013", "014", "017", "018", "023"].map((n) => `shared/morning_${n}`),
  ...["003", "004", "006", "007", "015", "016", "020"].map((n) => `morning/morning_${n}`),
  ...["003", "004", "006", "007", "015", "016"].map((n) => `evening/morning_${n}`),
  "evening/evening_001",
];

function fakeReciter(id: string): QuranReciter {
  return { id, name: { ar: id, en: id }, style: "murattal", audio: { kind: "per-ayah", baseUrl: `https://audio.test/${id}/`, extension: "mp3" }, available: true };
}

const find = (category: MorningEveningCategory, id: string) => writtenAdhkarItems[category].find((i) => i.id === id)!;

describe("Morning/Evening dhikr ids", () => {
  it.each(CATEGORIES)("%s: every item has a unique, filename-safe, locked id", (category) => {
    const ids = writtenAdhkarItems[category].map((i) => i.id);
    expect(ids.every((id) => typeof id === "string" && isAudioSafeDhikrId(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...LOCKED_IDS[category]].sort());
  });
});

describe("spokenText", () => {
  it("drops only the trailing counter instruction and the (( )) delimiters", () => {
    expect(getSpokenText("((سُبْحَانَ اللَّهِ وَبِحَمْدِهِ)) (مائة مرَّةٍ).")).toBe("سُبْحَانَ اللَّهِ وَبِحَمْدِهِ");
    // Expected values are cut straight out of the data (the text between
    // "((" and "))"), so the comparison is code-point exact — no retyped
    // Arabic, whose diacritic order could silently differ.
    for (const [category, id] of [["morning", "morning_020"], ["evening", "evening_001"], ["morning", "morning_009"]] as const) {
      const text = find(category, id).text_ar;
      expect(getSpokenText(text), id).toBe(text.slice(text.indexOf("((") + 2, text.indexOf("))")).trim());
    }
    expect(find("morning", "morning_020").text_ar).toContain("إذا أصبحَ");
    expect(getSpokenText(find("morning", "morning_020").text_ar)).not.toContain("أصبحَ");
  });

  it("leaves text without delimiters or a counter instruction untouched", () => {
    const text = find("evening", "morning_004").text_ar;
    expect(getSpokenText(text)).toBe(text.trim());
  });

  it("keeps a trailing parenthetical that is not a repetition count", () => {
    expect(getSpokenText("((ذكر)) (عند النوم).")).toBe("((ذكر)) (عند النوم).");
  });

  it.each(CATEGORIES)("%s: is always a verbatim part of the display text, with no instruction left in it", (category) => {
    for (const item of writtenAdhkarItems[category]) {
      if (item.quranRef) continue;
      const spoken = getSpokenText(item.text_ar);
      expect(spoken.length, item.id).toBeGreaterThan(0);
      expect(item.text_ar.includes(spoken), item.id).toBe(true);
      expect(spoken, item.id).not.toMatch(/[()]/);
      // Whatever was dropped contains no dhikr letters other than the
      // counter instruction itself.
      const dropped = item.text_ar.replace(spoken, "").replace(/[\s().]/g, "");
      if (dropped) expect(dropped.replace(/[ً-ٰٟ]/g, ""), item.id).toMatch(/مر(?:ة|ات)/);
    }
  });
});

describe("audio assets", () => {
  const assets = getMorningEveningAudioAssets();

  it("needs exactly the expected files: 25 unique, 11 shared, 7 Morning-only, 7 Evening-only", () => {
    expect(assets.map((a) => a.audioId).sort()).toEqual([...EXPECTED_AUDIO_IDS].sort());
    expect(assets.filter((a) => a.audioId.startsWith("shared/"))).toHaveLength(11);
    expect(assets.filter((a) => a.audioId.startsWith("morning/"))).toHaveLength(7);
    expect(assets.filter((a) => a.audioId.startsWith("evening/"))).toHaveLength(7);
    for (const a of assets) expect(a.path).toBe(`audio/adhkar/${a.audioId}.mp3`);
  });

  it("shares a file only when Morning and Evening spoken text is exactly identical", () => {
    for (const a of assets) {
      const texts = a.usedBy.map((u) => getSpokenText(find(u.category, u.dhikrId).text_ar));
      expect(new Set(texts).size, a.audioId).toBe(1);
      expect(texts[0]).toBe(a.spokenText);
      if (a.audioId.startsWith("shared/")) {
        expect(a.usedBy.map((u) => u.category).sort()).toEqual(["evening", "morning"]);
      } else {
        expect(a.usedBy).toHaveLength(1);
      }
    }
    // No two separate files speak the same words.
    expect(new Set(assets.map((a) => a.spokenText)).size).toBe(assets.length);
  });

  it("covers every non-Quran item exactly once and excludes every Quranic item", () => {
    const served = assets.flatMap((a) => a.usedBy.map((u) => `${u.category}:${u.dhikrId}`)).sort();
    const expected = CATEGORIES.flatMap((c) => writtenAdhkarItems[c].filter((i) => !i.quranRef).map((i) => `${c}:${i.id}`)).sort();
    expect(served).toEqual(expected);
    expect(served).toHaveLength(36);
    for (const id of QURANIC_IDS) expect(served.some((s) => s.endsWith(`:${id}`))).toBe(false);
  });

  it("keeps morning_009 as generated dhikr audio", () => {
    expect(getMorningEveningAudioSource("morning", find("morning", "morning_009"))).toEqual({
      kind: "generated",
      audioId: "shared/morning_009",
      path: "audio/adhkar/shared/morning_009.mp3",
    });
  });
});

describe("identity does not depend on position", () => {
  it("reordering both lists and inserting a new item changes no existing item's audio", () => {
    const newItem: WrittenAdhkarItem = { id: "morning_099", text_ar: "((نص جديد)) (ثلاثَ مرَّاتٍ).", text_en: "", source_ar: "", source_en: "" };
    const changed: MorningEveningLists = {
      morning: [newItem, ...[...writtenAdhkarItems.morning].reverse()],
      evening: [...writtenAdhkarItems.evening].reverse(),
    };
    for (const category of CATEGORIES) {
      for (const item of writtenAdhkarItems[category]) {
        expect(getMorningEveningAudioSource(category, item, changed), `${category}/${item.id}`).toEqual(getMorningEveningAudioSource(category, item));
      }
    }
    expect(getMorningEveningAudioSource("morning", newItem, changed)).toEqual({
      kind: "generated",
      audioId: "morning/morning_099",
      path: "audio/adhkar/morning/morning_099.mp3",
    });
  });

  it("rejects ids that would be unsafe as file names", () => {
    const bad: WrittenAdhkarItem = { id: "../x", text_ar: "نص", text_en: "", source_ar: "", source_en: "" };
    expect(() => getMorningEveningAudioAssets({ morning: [bad], evening: [] })).toThrow();
  });
});

describe("resolution", () => {
  const ayatAlKursi = find("morning", "morning_001");
  const shared = find("evening", "morning_005");
  const eveningOnlyWording = find("evening", "morning_003");
  const everything = getMorningEveningAudioAssets().map((a) => a.audioId);

  it("resolves Quranic items through the selected reciter, in both lists", () => {
    const a = resolveMorningEveningAudio("morning", ayatAlKursi, fakeReciter("reciter-a"));
    const b = resolveMorningEveningAudio("morning", ayatAlKursi, fakeReciter("reciter-b"));
    expect(a).toEqual({ status: "ready", kind: "quran", key: "quran:reciter-a:2:255", urls: ["https://audio.test/reciter-a/002255.mp3"] });
    expect(b).toEqual({ status: "ready", kind: "quran", key: "quran:reciter-b:2:255", urls: ["https://audio.test/reciter-b/002255.mp3"] });
    expect(resolveMorningEveningAudio("evening", ayatAlKursi, fakeReciter("reciter-a"))).toEqual(a);
  });

  it("reports Quranic items as unavailable while no reciter audio is configured", () => {
    expect(resolveMorningEveningAudio("morning", ayatAlKursi, getDefaultQuranReciter())).toEqual({
      status: "unavailable",
      kind: "quran",
      reason: "audio-source-not-configured",
    });
  });

  it("resolves Morning and Evening to the same shared file, independent of the reciter", () => {
    const m = resolveMorningEveningAudio("morning", shared, fakeReciter("reciter-a"), { generated: everything });
    const e = resolveMorningEveningAudio("evening", shared, fakeReciter("reciter-b"), { generated: everything });
    expect(m).toEqual({ status: "ready", kind: "generated", key: "adhkar:shared/morning_005", urls: ["/audio/adhkar/shared/morning_005.mp3"] });
    expect(e).toEqual(m);
  });

  it("resolves differing wording to separate files", () => {
    const e = resolveMorningEveningAudio("evening", eveningOnlyWording, fakeReciter("reciter-a"), { generated: everything });
    expect(e).toMatchObject({ status: "ready", urls: ["/audio/adhkar/evening/morning_003.mp3"] });
    const m = resolveMorningEveningAudio("morning", find("morning", "morning_003"), fakeReciter("reciter-a"), { generated: everything });
    expect(m).toMatchObject({ status: "ready", urls: ["/audio/adhkar/morning/morning_003.mp3"] });
  });

  it("reports items without a generated file as unavailable, and unknown items as unknown", () => {
    expect(resolveMorningEveningAudio("morning", find("morning", "morning_006"), getDefaultQuranReciter())).toEqual({
      status: "unavailable",
      kind: "generated",
      reason: "asset-not-generated",
    });
    const stranger: WrittenAdhkarItem = { id: "morning_099", text_ar: "نص", text_en: "", source_ar: "", source_en: "" };
    expect(resolveMorningEveningAudio("morning", stranger, getDefaultQuranReciter())).toEqual({ status: "unknown-item" });
  });
});

describe("playback through the shared engine", () => {
  class FakeAudio implements AudioElementLike {
    src = "";
    played: string[] = [];
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play() {
      this.played.push(this.src);
    }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  let fake: FakeAudio;
  beforeEach(() => {
    fake = new FakeAudio();
    setAudioElementFactory(() => fake);
  });
  afterEach(() => stopAudio());

  it("plays Quranic items on the quran channel with the given reciter", () => {
    const res = playMorningEveningAudio("morning", find("morning", "morning_002"), fakeReciter("reciter-a"));
    expect(res.status).toBe("ready");
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "quran:reciter-a:112:1-4" });
    expect(fake.played).toEqual(["https://audio.test/reciter-a/112001.mp3"]);
  });

  it("plays nothing while the item's audio is unavailable", () => {
    expect(playMorningEveningAudio("morning", find("morning", "morning_006"), getDefaultQuranReciter()).status).toBe("unavailable");
    expect(fake.played).toEqual([]);
    expect(getActiveAudio()).toBeNull();
  });
});

describe("generated-audio manifest", () => {
  it("only lists audioIds the current content actually needs", () => {
    const needed = new Set(getMorningEveningAudioAssets().map((a) => a.audioId));
    for (const id of GENERATED_MORNING_EVENING_AUDIO_IDS) expect(needed.has(id), id).toBe(true);
  });
});
