import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { MISC_DUAS } from "../data/misc-library";
import type { AudioElementLike } from "./audioEngine";
import { claimAudio, getActiveAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import { setUserRepeatCount } from "./audioUserRepeat";
import {
  AUDIO_ENABLED_COLLECTIONS,
  audioRepetitionTotal,
  getAudioAdhkarSource,
  pauseAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkar,
  stopAudioAdhkar,
} from "./audioAdhkarPlayer";

// The adhan pause (each adhan + 30 min) arms a stop timer while something
// plays; these suites count pending timers precisely, so they run without
// adhan windows. The adhan rule has its own tests (audioAdhkarAdhanPause.test.ts).
vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));


class FakeAudio implements AudioElementLike {
  src = "";
  played: string[] = [];
  paused = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    this.played.push(this.src);
  }
  pause() {
    this.paused++;
  }
  removeAttribute() {}
  load() {}
  /** What the browser does when the file actually finishes. */
  end() {
    this.onended?.();
  }
}

let fake: FakeAudio;
beforeEach(() => {
  vi.useFakeTimers();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});
/** One repetition's file ends, then the pause before the next one elapses. */
const endThenPause = () => {
  fake.end();
  vi.advanceTimersByTime(REPETITION_PAUSE_MS);
};

const evening = (id: string) => writtenAdhkarItems.evening.find((i) => i.id === id)!;
const morning = (id: string) => writtenAdhkarItems.morning.find((i) => i.id === id)!;
// Harakat, superscript alef and tatweel only — letters are kept.
const stripMarks = (s: string) => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u0640]/g, "");
// The actual file contents (as data URIs) — to prove each served file IS the uploaded recording.
const files = {
  ...import.meta.glob<string>("/public/audio/adhkar/**/*.mp3", { query: "?inline", import: "default", eager: true }),
  ...import.meta.glob<string>("/ASSETS/audio/adhkar/*.mp3", { query: "?inline", import: "default", eager: true }),
};
const bytes = (path: string) => files[`/${path}`];

// The three uploaded recordings, by what they contain (verified by transcription).
const RECORDINGS = [
  { upload: "أَمْسَيْنَا وَأَمْسَىَ الْمُلْكُ لِلَّهْ.mp3", id: "morning_003", opening: "أمسينا وأمسى الملك", url: "/audio/adhkar/evening/morning_003.mp3" },
  { upload: "اللَّهُمَّ بِكَ أَمْسَيْنَا.mp3", id: "morning_004", opening: "اللَّهم بك أمسينا", url: "/audio/adhkar/evening/morning_004.mp3" },
  { upload: "اللهم انت ربي لا اله الا انت 1.mp3", id: "morning_005", opening: "اللهم أنت ربي", url: "/audio/adhkar/shared/morning_005.mp3" },
  { upload: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكْ.mp3", id: "morning_006", opening: "اللهم إني أمسيت أشهدك", url: "/audio/adhkar/evening/morning_006.mp3" },
  { upload: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ.mp3", id: "morning_007", opening: "اللهم ما أمسى بي من نعمة", url: "/audio/adhkar/evening/morning_007.mp3" },
  { upload: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينْ.mp3", id: "morning_015", opening: "أمسينا وأمسى الملك للَّه ربّ العالمين", url: "/audio/adhkar/evening/morning_015.mp3" },
  { upload: "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامْ.mp3", id: "morning_016", opening: "أمسينا عَلَى فِطْرَةِ", url: "/audio/adhkar/evening/morning_016.mp3" },
];

describe("Evening recordings map to the right dhikr", () => {
  it("morning_005 (سيد الاستغفار): Morning and Evening share ONE recording — the new upload", () => {
    const url = "/audio/adhkar/shared/morning_005.mp3";
    expect(getAudioAdhkarSource("morning", morning("morning_005"))?.urls).toEqual([url]);
    expect(getAudioAdhkarSource("evening", evening("morning_005"))?.urls).toEqual([url]);
    expect(bytes(`public${url}`)).toBe(bytes("ASSETS/audio/adhkar/اللهم انت ربي لا اله الا انت 1.mp3"));
    for (const category of ["morning", "evening"] as const) {
      expect(writtenAdhkarItems[category].filter((i) => i.id === "morning_005"), category).toHaveLength(1); // no duplicate
    }
  });

  for (const r of RECORDINGS) {
    it(`${r.upload} → evening ${r.id}`, () => {
      const item = evening(r.id);
      expect(item.text_ar.replace(/[ؐ-ًؚ-ٰٟـ]/g, "")).toContain(r.opening.replace(/[ؐ-ًؚ-ٰٟـ]/g, ""));
      expect(getAudioAdhkarSource("evening", item)?.urls).toEqual([r.url]);
      expect(bytes(`public${r.url}`)).toBeTruthy();
      expect(bytes(`public${r.url}`)).toBe(bytes(`ASSETS/audio/adhkar/${r.upload}`));
    });
  }

  it("only the Evening dhikr with audio (Quranic or recorded) are playable; the rest stay unavailable", () => {
    const playable = writtenAdhkarItems.evening.filter((i) => getAudioAdhkarSource("evening", i)).map((i) => i.id);
    expect(playable).toEqual([
      "morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_023", "evening_001",
    ]);
  });

  it("plays Quranic Evening items from the bundled Quran audio, on the quran channel", () => {
    for (const item of writtenAdhkarItems.evening.filter((i) => i.quranRef)) {
      const source = getAudioAdhkarSource("evening", item)!;
      expect(source.channel, item.id).toBe("quran");
      for (const url of source.urls) expect(url).toMatch(/^\/audio\/quran\/abdulbasit-murattal\/(\d{6}|basmala)\.mp3$/);
    }
  });

  it("enables Morning: every Morning dhikr is playable", () => {
    expect(AUDIO_ENABLED_COLLECTIONS).toEqual(["morning", "evening"]);
    const playable = writtenAdhkarItems.morning.filter((i) => getAudioAdhkarSource("morning", i)).map((i) => i.id);
    expect(playable).toEqual([
      "morning_001", "morning_002", "morning_002b", "morning_002c", "morning_003", "morning_004", "morning_005", "morning_006", "morning_007", "morning_008", "morning_009", "morning_010", "morning_011", "morning_012", "morning_013", "morning_014", "morning_015", "morning_016", "morning_017", "morning_018", "morning_020", "morning_023",
    ]);
  });

  it("does not enable Various", () => {
    for (const item of MISC_DUAS) {
      expect(getAudioAdhkarSource("misc", item as unknown as WrittenAdhkarItem)).toBeNull();
    }
  });

  it("does nothing for a dhikr without a recording", () => {
    // Every Evening dhikr has audio now — an id outside the Evening list has none.
    expect(writtenAdhkarItems.evening.every((i) => getAudioAdhkarSource("evening", i))).toBe(true);
    const unrecorded = { ...evening("morning_005"), id: "morning_099" };
    expect(startAudioAdhkar("evening", unrecorded)).toBe(false);
    expect(getNowPlaying()).toBeNull();
    expect(fake.played).toEqual([]);
  });
});

// The Morning-only recordings (أصبحنا wordings) — each upload verified by
// transcription; their Evening counterparts are worded differently, so each
// file serves Morning alone and the Evening item keeps its own file (or none).
const MORNING_RECORDINGS = [
  { upload: "اصبحنا واصبح الملك لله.mp3", id: "morning_003", opening: "رب أسألك خير ما في هذا اليوم", repeat: 1 },
  { upload: "اللهم بك اصبحنا.mp3", id: "morning_004", opening: "اللهم بك أصبحنا، وبك أمسينا", repeat: 1 },
  { upload: "اللهم اني اصبحت.mp3", id: "morning_006", opening: "اللهم إني أصبحت أشهدك", repeat: 4 },
  { upload: "اللهم ما اصبح بي من نعمة.mp3", id: "morning_007", opening: "اللهم ما أصبح بي من نعمة", repeat: 1 },
  { upload: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينْ.mp3", id: "morning_015", opening: "أصبحنا وأصبح الملك لله رب العالمين", repeat: 1 },
  { upload: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامْ.mp3", id: "morning_016", opening: "أصبحنا على فطرة الإسلام", repeat: 1 },
  { upload: "سُبْحَانَ اللَّهِ وَبِحَمْدِهْ، عَدَدَ خَلْقِهْ.mp3", id: "morning_020", opening: "عدد خلقه، ورضا نفسه", repeat: 3 },
];

describe("Morning recordings map to the right dhikr", () => {
  for (const r of MORNING_RECORDINGS) {
    it(`${r.upload} → morning ${r.id} (Morning only, ×${r.repeat})`, () => {
      const item = morning(r.id);
      expect(stripMarks(item.text_ar)).toContain(stripMarks(r.opening));
      const url = `/audio/adhkar/morning/${r.id}.mp3`;
      expect(getAudioAdhkarSource("morning", item)?.urls).toEqual([url]);
      expect(bytes(`public${url}`)).toBeTruthy();
      expect(bytes(`public${url}`)).toBe(bytes(`ASSETS/audio/adhkar/${r.upload}`));
      expect(audioRepetitionTotal(item)).toBe(r.repeat);
      const eveningItem = writtenAdhkarItems.evening.find((i) => i.id === r.id);
      if (eveningItem) expect(getAudioAdhkarSource("evening", eveningItem)?.urls ?? []).not.toContain(url);
    });
  }

  it("leaves the Evening morning_016 recording on its own file", () => {
    expect(getAudioAdhkarSource("evening", evening("morning_016"))?.urls).toEqual(["/audio/adhkar/evening/morning_016.mp3"]);
    expect(bytes("public/audio/adhkar/evening/morning_016.mp3")).toBe(bytes("ASSETS/audio/adhkar/" + "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامْ.mp3"));
  });

  it("morning_006 plays 4 times with the 1.5 s pause between repetitions, then finishes", () => {
    expect(startAudioAdhkar("morning", morning("morning_006"))).toBe(true);
    fake.end();
    vi.advanceTimersByTime(REPETITION_PAUSE_MS - 1);
    expect(fake.played).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(fake.played).toHaveLength(2);
    endThenPause();
    endThenPause();
    expect(fake.played).toEqual(Array(4).fill("/audio/adhkar/morning/morning_006.mp3"));
    fake.end();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_006", repetition: 4, total: 4, status: "finished" });
  });
});

// Recordings kept under their original Arabic names (content verified by transcription).
const NAMED_RECORDINGS = [
  { file: "shared/اللهم عافني في بدني.mp3", id: "morning_008", opening: "اللهم عافني في بدني" },
  { file: "shared/حسبي الله.mp3", id: "morning_009", opening: "حسبي الله لا إله إلا هو" },
  { file: "shared/اللهم اني اسالك العفو و العافية.mp3", id: "morning_010", opening: "اللهم إني أسألك العفو والعافية" },
  { file: "shared/اللهم عالم الغيب والشهادة.mp3", id: "morning_011", opening: "اللهم عالم الغيب والشهادة" },
  { file: "shared/بسم الله الذي لا يضر.mp3", id: "morning_012", opening: "بسم الله الذي لا يضر مع اسمه شيء" },
  { file: "shared/رضيت بالله ربا.mp3", id: "morning_013", opening: "رضيت بالله ربا" },
  { file: "shared/سبحان الله وبحمده.mp3", id: "morning_017", opening: "سبحان الله وبحمده" },
  { file: "shared/لا اله الا الله وحده لا شريك له.mp3", id: "morning_018", opening: "لا إله إلا الله وحده لا شريك له" },
];

describe("Arabic-named recordings map to the right dhikr", () => {
  for (const r of NAMED_RECORDINGS) {
    it(`${r.file} → ${r.id} in BOTH Morning and Evening (one file)`, () => {
      const url = `/${encodeURI(`audio/adhkar/${r.file}`)}`;
      for (const item of [morning(r.id), evening(r.id)]) {
        expect(stripMarks(item.text_ar), item.id).toContain(stripMarks(r.opening));
      }
      expect(getAudioAdhkarSource("morning", morning(r.id))?.urls).toEqual([url]);
      expect(getAudioAdhkarSource("evening", evening(r.id))?.urls).toEqual([url]);
      expect(bytes(`public/audio/adhkar/${r.file}`)).toBeTruthy();
    });
  }

  it("morning_008 and morning_012 play 3 times in both Morning and Evening", () => {
    for (const id of ["morning_008", "morning_012"]) {
      for (const item of [morning(id), evening(id)]) expect(audioRepetitionTotal(item), `${id}`).toBe(3);
    }
  });

  it("ياحي ياقيوم.mp3 → morning_014 in BOTH Morning and Evening (one file, played once)", () => {
    const url = "/audio/adhkar/shared/morning_014.mp3";
    for (const item of [morning("morning_014"), evening("morning_014")]) {
      expect(stripMarks(item.text_ar), item.id).toContain("يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين");
      expect(audioRepetitionTotal(item)).toBe(1);
    }
    expect(getAudioAdhkarSource("morning", morning("morning_014"))?.urls).toEqual([url]);
    expect(getAudioAdhkarSource("evening", evening("morning_014"))?.urls).toEqual([url]);
    expect(bytes(`public${url}`)).toBeTruthy();
    expect(bytes(`public${url}`)).toBe(bytes(`ASSETS/audio/adhkar/ياحي ياقيوم.mp3`));
  });

  it("اعوذ بكلمات التامات.mp3 → evening_001, Evening only", () => {
    expect(stripMarks(evening("evening_001").text_ar)).toContain("أعوذ بكلمات الله التامات");
    expect(writtenAdhkarItems.morning.some((i) => i.id === "evening_001")).toBe(false);
    expect(getAudioAdhkarSource("evening", evening("evening_001"))?.urls).toEqual([`/${encodeURI("audio/adhkar/evening/اعوذ بكلمات التامات.mp3")}`]);
    expect(bytes("public/audio/adhkar/evening/اعوذ بكلمات التامات.mp3")).toBeTruthy();
  });
});

describe("morning_023 — no fixed count, the user chooses how many times it plays", () => {
  const url = `/${encodeURI("audio/adhkar/shared/اللهم صل على محمد.mp3")}`;
  afterEach(() => setUserRepeatCount("morning_023", null));

  it("maps the one shared file to BOTH Morning and Evening, keeping the written data count-free", () => {
    for (const item of [morning("morning_023"), evening("morning_023")]) {
      expect(stripMarks(item.text_ar)).toContain("اللهم صل على محمد وعلى آل محمد");
      expect(item.unboundedCount).toBe(true);
      expect(item.repeat).toBeUndefined();
    }
    expect(getAudioAdhkarSource("morning", morning("morning_023"))?.urls).toEqual([url]);
    expect(getAudioAdhkarSource("evening", evening("morning_023"))?.urls).toEqual([url]);
    expect(bytes("public/audio/adhkar/shared/اللهم صل على محمد.mp3")).toBeTruthy();
  });

  it("plays once when no count was chosen (Audio Adhkar asks for none), never loops", () => {
    expect(audioRepetitionTotal(evening("morning_023"))).toBe(1);
    expect(startAudioAdhkar("evening", evening("morning_023"))).toBe(true);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_023", repetition: 1, total: 1, status: "playing" });
    fake.end();
    expect(getNowPlaying()).toMatchObject({ status: "finished" });
    expect(fake.played).toHaveLength(1);
  });

  it("plays exactly the chosen number of times, then finishes", () => {
    setUserRepeatCount("morning_023", 3);
    expect(audioRepetitionTotal(morning("morning_023"))).toBe(3);
    expect(startAudioAdhkar("morning", morning("morning_023"))).toBe(true);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_023", repetition: 1, total: 3, status: "playing" });
    endThenPause();
    endThenPause();
    fake.end();
    expect(getNowPlaying()).toMatchObject({ repetition: 3, total: 3, status: "finished" });
    expect(fake.played).toEqual([url, url, url]);
    fake.end();
    expect(fake.played).toHaveLength(3);
  });
});

describe("playback drives the existing repetition state", () => {
  const threeTimes = () => {
    // Every connected Evening recording is said once, so drive the
    // repetition logic with a 3× copy of a real recorded item.
    return { ...evening("morning_003"), repeat: 3 };
  };

  it("starting sets the current dhikr at repetition 1 and plays its file", () => {
    expect(startAudioAdhkar("evening", evening("morning_016"))).toBe(true);
    expect(getNowPlaying()).toEqual({ collection: "evening", itemId: "morning_016", repetition: 1, total: 1, status: "playing" });
    expect(fake.played).toEqual(["/audio/adhkar/evening/morning_016.mp3"]);
    expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "adhkar:evening/morning_016" });
  });

  it("advances exactly once per completed playback, replaying the file after the repetition pause", () => {
    startAudioAdhkar("evening", threeTimes());
    endThenPause();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    expect(fake.played).toHaveLength(2);
    endThenPause();
    expect(getNowPlaying()).toMatchObject({ repetition: 3, status: "playing" });
    expect(fake.played).toHaveLength(3);
  });

  it("finishing the last repetition ends in the finished state and stops playing", () => {
    startAudioAdhkar("evening", threeTimes());
    endThenPause();
    endThenPause();
    fake.end();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_003", repetition: 3, status: "finished" });
    expect(fake.played).toHaveLength(3);
    expect(getActiveAudio()).toBeNull();
  });

  it("a duplicate completion callback for the same playback can't advance twice", () => {
    startAudioAdhkar("evening", threeTimes());
    const firstEnded = fake.onended!;
    firstEnded();
    firstEnded();
    vi.advanceTimersByTime(REPETITION_PAUSE_MS);
    expect(getNowPlaying()?.repetition).toBe(2);
    // A late "ended" from the first playback, after the second started:
    firstEnded();
    expect(getNowPlaying()?.repetition).toBe(2);
    expect(fake.played).toHaveLength(2);
  });

  it("a single-repetition dhikr finishes after one playback, even if 'ended' fires twice", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    const ended = fake.onended!;
    ended();
    ended();
    expect(getNowPlaying()).toMatchObject({ repetition: 1, status: "finished" });
    expect(fake.played).toHaveLength(1);
  });

  it("pause does not advance; resume continues the same repetition without restarting it", () => {
    startAudioAdhkar("evening", threeTimes());
    endThenPause();
    const pausesBefore = fake.paused;
    pauseAudioAdhkar();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "paused" });
    expect(fake.paused).toBe(pausesBefore + 1);
    pauseAudioAdhkar();
    expect(getNowPlaying()?.repetition).toBe(2);
    resumeAudioAdhkar();
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    // resume = play() on the same element and src — same repetition continues
    expect(fake.played).toEqual(Array(3).fill("/audio/adhkar/evening/morning_003.mp3"));
    endThenPause();
    expect(getNowPlaying()?.repetition).toBe(3);
  });

  it("starting another dhikr replaces the current one; the old playback's late end is ignored", () => {
    startAudioAdhkar("evening", threeTimes());
    const oldEnded = fake.onended!;
    startAudioAdhkar("evening", evening("morning_016"));
    oldEnded();
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", repetition: 1, status: "playing" });
  });

  it("another audio source taking over clears the state instead of leaving it 'playing'", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    claimAudio("quran", "quran:x", () => {});
    expect(getNowPlaying()).toBeNull();
  });

  it("stop clears the state and the audio", () => {
    startAudioAdhkar("evening", evening("morning_016"));
    stopAudioAdhkar();
    expect(getNowPlaying()).toBeNull();
    expect(getActiveAudio()).toBeNull();
  });
});

describe("1.5-second pause between repetitions — every dhikr, Morning and Evening", () => {
  it("is 1.5 seconds", () => {
    expect(REPETITION_PAUSE_MS).toBe(1_500);
  });

  for (const collection of ["morning", "evening"] as const) {
    it(`${collection}: a multi-repeat dhikr waits exactly 1.5 s before its next repetition`, () => {
      const item = writtenAdhkarItems[collection].find((i) => i.id === "morning_008")!; // written ×3
      expect(item.repeat).toBe(3);
      startAudioAdhkar(collection, item);
      fake.end();
      // During the pause: nothing plays, the counter stays on the repetition just heard, the audio stays held.
      expect(fake.played).toHaveLength(1);
      expect(getNowPlaying()).toMatchObject({ collection, itemId: "morning_008", repetition: 1, total: 3, status: "playing" });
      expect(getActiveAudio()).toEqual({ channel: "adhkar", key: "adhkar:shared/morning_008" });
      vi.advanceTimersByTime(REPETITION_PAUSE_MS - 1);
      expect(fake.played).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(fake.played).toHaveLength(2);
      expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
    });

    it(`${collection}: a single-repeat dhikr finishes at once — no 1.5 s wait`, () => {
      const item = writtenAdhkarItems[collection].find((i) => i.id === "morning_005")!; // written ×1
      expect(item.repeat).toBe(1);
      startAudioAdhkar(collection, item);
      fake.end();
      expect(getNowPlaying()).toMatchObject({ repetition: 1, total: 1, status: "finished" });
      expect(getActiveAudio()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it(`${collection}: no pause after the final repetition`, () => {
      const item = writtenAdhkarItems[collection].find((i) => i.id === "morning_008")!;
      startAudioAdhkar(collection, item);
      endThenPause();
      endThenPause();
      fake.end();
      expect(getNowPlaying()).toMatchObject({ repetition: 3, total: 3, status: "finished" });
      expect(getActiveAudio()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      expect(fake.played).toHaveLength(3);
    });

    it(`${collection}: applies to every recorded dhikr — pause exactly when another repetition follows`, () => {
      setUserRepeatCount("morning_023", 2);
      try {
        const recorded = writtenAdhkarItems[collection].filter((i) => getAudioAdhkarSource(collection, i));
        expect(recorded.length).toBeGreaterThan(0);
        for (const item of recorded) {
          const total = audioRepetitionTotal(item)!;
          const files = getAudioAdhkarSource(collection, item)!.urls.length;
          startAudioAdhkar(collection, item);
          // One repetition = every file of it (a Quranic recitation's ayahs), with no pause between them.
          for (let f = 1; f < files; f++) {
            fake.end();
            expect(vi.getTimerCount(), `${item.id} ayah ${f}`).toBe(0);
          }
          fake.end();
          if (total > 1) {
            expect(vi.getTimerCount(), item.id).toBe(1);
            vi.advanceTimersByTime(REPETITION_PAUSE_MS);
            expect(getNowPlaying(), item.id).toMatchObject({ itemId: item.id, repetition: 2, status: "playing" });
          } else {
            expect(vi.getTimerCount(), item.id).toBe(0);
            expect(getNowPlaying(), item.id).toMatchObject({ itemId: item.id, status: "finished" });
          }
          stopAudioAdhkar();
        }
      } finally {
        setUserRepeatCount("morning_023", null);
      }
    });
  }

  it("pausing during the pause freezes the remaining time; resuming continues it", () => {
    startAudioAdhkar("evening", evening("morning_008"));
    fake.end();
    vi.advanceTimersByTime(600);
    pauseAudioAdhkar();
    expect(getNowPlaying()).toMatchObject({ repetition: 1, status: "paused" });
    vi.advanceTimersByTime(60_000);
    expect(fake.played).toHaveLength(1);
    resumeAudioAdhkar();
    vi.advanceTimersByTime(REPETITION_PAUSE_MS - 600 - 1);
    expect(fake.played).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(fake.played).toHaveLength(2);
    expect(getNowPlaying()).toMatchObject({ repetition: 2, status: "playing" });
  });

  it("stopping during the pause cancels the next repetition", () => {
    startAudioAdhkar("evening", evening("morning_008"));
    fake.end();
    stopAudioAdhkar();
    vi.advanceTimersByTime(10_000);
    expect(fake.played).toHaveLength(1);
    expect(getNowPlaying()).toBeNull();
    expect(getActiveAudio()).toBeNull();
  });

  it("another audio source starting during the pause ends the session instead of resuming later", () => {
    startAudioAdhkar("evening", evening("morning_008"));
    fake.end();
    claimAudio("quran", "quran:x", () => {});
    vi.advanceTimersByTime(10_000);
    expect(fake.played).toHaveLength(1);
    expect(getNowPlaying()).toBeNull();
  });

  it("starting another dhikr during the pause replaces it cleanly", () => {
    startAudioAdhkar("evening", evening("morning_008"));
    fake.end();
    startAudioAdhkar("evening", evening("morning_016"));
    vi.advanceTimersByTime(10_000);
    expect(fake.played).toEqual(["/audio/adhkar/shared/" + encodeURI("اللهم عافني في بدني.mp3"), "/audio/adhkar/evening/morning_016.mp3"]);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_016", repetition: 1, status: "playing" });
  });
});

describe("pause rules (1.5 s between playbacks, none inside one Quranic recitation)", () => {
  it("Dhikr A repeat 1 → exactly 1.5 s → repeat 2", () => {
    startAudioAdhkar("morning", morning("morning_008")); // ×3
    fake.end();
    vi.advanceTimersByTime(1_499);
    expect(fake.played).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(fake.played).toHaveLength(2);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_008", repetition: 2 });
  });

  it("Quran basmala → ayah 1 → ayah 2 → … plays straight through — no 1.5 s pause inside one repetition", () => {
    startAudioAdhkar("morning", morning("morning_002")); // al-Ikhlas: Abdul Basit's own basmala + 4 ayah files
    const timersAtStart = vi.getTimerCount();
    expect(fake.played[0]).toMatch(/\/abdulbasit-murattal\/basmala\.mp3$/);
    for (let ayah = 1; ayah <= 4; ayah++) {
      fake.end(); // the previous file ends …
      expect(fake.played, `ayah ${ayah}`).toHaveLength(ayah + 1); // … the next starts at once, no timer
      expect(fake.played[ayah]).toMatch(new RegExp(`/11200${ayah}\\.mp3$`));
      expect(vi.getTimerCount()).toBe(timersAtStart);
    }
    fake.end(); // the recitation's last ayah: NOW the 1.5 s repetition pause
    expect(vi.getTimerCount()).toBe(timersAtStart + 1);
    vi.advanceTimersByTime(REPETITION_PAUSE_MS);
    expect(fake.played[5]).toMatch(/\/abdulbasit-murattal\/basmala\.mp3$/); // repetition 2 starts with his basmala again
  });

  it("no pause after the final repetition — the session simply finishes", () => {
    startAudioAdhkar("evening", evening("morning_005")); // ×1
    fake.end();
    expect(getNowPlaying()).toMatchObject({ status: "finished" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Listen on one dhikr plays only that dhikr — it never continues into the next one", () => {
    startAudioAdhkar("evening", evening("morning_005"));
    fake.end();
    vi.advanceTimersByTime(60_000);
    expect(fake.played).toHaveLength(1);
    expect(getNowPlaying()).toMatchObject({ itemId: "morning_005", status: "finished" });
  });
});
