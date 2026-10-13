// @vitest-environment jsdom
//
// Quran audio for the Quranic Morning/Evening adhkar: the bundled
// EveryAyah files, how a reciter is chosen (Specific Reciter / Automatic
// Rotation) and how a recitation plays through the Audio Adhkar player.
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { writtenAdhkarItems } from "../data/written-adhkar";
import { QURAN_RECITERS, getAvailableQuranReciters } from "../data/quranReciters";
import { BUNDLED_QURAN_AYAHS, quranAyahAudioPath } from "../data/quranAudioBundle";
import { bundledQuranAudio, bundledQuranAudioPaths, resolveQuranAudio } from "./quranAudio";
import { getMorningEveningAudioSource } from "./morningEveningAudio";
import { saveQuranReciterMode, saveQuranRotationIndex, saveSelectedQuranReciterId, loadQuranRotationIndex } from "./quranAudioPreferences";
import { takeQuranReciterForPlayback } from "./quranReciterSelection";
import type { AudioElementLike } from "./audioEngine";
import { getActiveAudio, setAudioElementFactory, stopAudio } from "./audioEngine";
import { REPETITION_PAUSE_MS, getNowPlaying } from "./audioAdhkarPlayback";
import { getAudioAdhkarSource, startAudioAdhkar, stopAudioAdhkar } from "./audioAdhkarPlayer";
import { peekSectionReciter, saveSectionReciterChoice, setSectionReciterRandomForTesting } from "./audioAdhkarScheduleSettings";

// The adhan pause (each adhan + 30 min) arms a stop timer while something
// plays; these suites count pending timers precisely, so they run without
// adhan windows. The adhan rule has its own tests (audioAdhkarAdhanPause.test.ts).
vi.mock("./adhanSuppression", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./adhanSuppression")>()),
  buildAdhanWindows: () => [],
}));


// Every bundled Quran file, keyed "/public/audio/quran/{reciter}/{SSSAAA}.mp3"
// → its bytes as a data URI (loaded on demand).
const quranFiles = import.meta.glob<string>("/public/audio/quran/**/*.mp3", { query: "?inline", import: "default" });
const RECITER_IDS = ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "sudais-murattal", "muaiqly-murattal", "dosari-murattal", "qatami-murattal", "banna-murattal", "mustafaismail-mujawwad"];

// The four Quranic recitations, verified word for word against the Quran text.
const QURANIC = [
  { id: "morning_001", ref: { surah: 2, fromAyah: 255, toAyah: 255 }, stems: ["002255"] },
  { id: "morning_002", ref: { surah: 112, fromAyah: 1, toAyah: 4 }, stems: ["112001", "112002", "112003", "112004"] },
  { id: "morning_002b", ref: { surah: 113, fromAyah: 1, toAyah: 5 }, stems: ["113001", "113002", "113003", "113004", "113005"] },
  { id: "morning_002c", ref: { surah: 114, fromAyah: 1, toAyah: 6 }, stems: ["114001", "114002", "114003", "114004", "114005", "114006"] },
];

const item = (category: "morning" | "evening", id: string) => writtenAdhkarItems[category].find((i) => i.id === id)!;
const url = (reciter: string, stem: string) => `/audio/quran/${reciter}/${stem}.mp3`;

// Each reciter's OWN basmala (quranReciters.ts), as verified. Every voiced
// one has {id}/basmala.mp3 (al-Fatiha 1:1 or cut from his own 27:30; for
// Al-Banna and Mustafa Ismail, cut from the start of their own 112:1).
// Al-Banna's and Mustafa Ismail's first-ayah files of the surahs already
// open with it, so nothing is added there. Sudais: none verified.
const SEPARATE_BASMALA = ["abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "muaiqly-murattal", "dosari-murattal", "qatami-murattal"];
const BASMALA_IN_FIRST_AYAH: Record<string, Record<number, number>> = {
  "banna-murattal": { 112: 5.02, 113: 5.26, 114: 5.36 },
  "mustafaismail-mujawwad": { 112: 6.58, 113: 7.08, 114: 6.78 },
};
const NO_VERIFIED_BASMALA = ["sudais-murattal"];
const WITH_BASMALA_FILE = [...SEPARATE_BASMALA, ...Object.keys(BASMALA_IN_FIRST_AYAH)];
/** The file stems EVERY repetition plays: the reciter's own basmala, then the ayahs. */
const stemsFor = (reciter: string, q: (typeof QURANIC)[number]) => {
  if (NO_VERIFIED_BASMALA.includes(reciter)) return q.stems;
  if (BASMALA_IN_FIRST_AYAH[reciter] && q.ref.fromAyah === 1) return q.stems; // his 1st ayah opens with it
  return ["basmala", ...q.stems];
};

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
  end() {
    this.onended?.();
  }
}

let fake: FakeAudio;
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  fake = new FakeAudio();
  setAudioElementFactory(() => fake);
});
afterEach(() => {
  stopAudioAdhkar();
  stopAudio();
  vi.useRealTimers();
});

/** Plays every file of one repetition to its end. */
const endRepetition = (files: number) => {
  for (let i = 0; i < files; i++) fake.end();
};

describe("the four Quranic references", () => {
  it("are exactly Ayat al-Kursi, al-Ikhlas, al-Falaq and an-Nas — in Morning and Evening alike", () => {
    for (const category of ["morning", "evening"] as const) {
      const quranic = writtenAdhkarItems[category].filter((i) => i.quranRef);
      expect(quranic.map((i) => [i.id, i.quranRef])).toEqual(QURANIC.map((q) => [q.id, q.ref]));
    }
  });

  it("Morning and Evening share one mapping: same id, same quranRef, same audio", () => {
    for (const q of QURANIC) {
      expect(getMorningEveningAudioSource("morning", item("morning", q.id))).toEqual({ kind: "quran", ref: q.ref });
      expect(getMorningEveningAudioSource("evening", item("evening", q.id))).toEqual({ kind: "quran", ref: q.ref });
      expect(getAudioAdhkarSource("evening", item("evening", q.id))).toEqual(getAudioAdhkarSource("morning", item("morning", q.id)));
    }
  });
});

describe("bundled files", () => {
  it("bundles exactly the 16 ayahs those references cover", () => {
    expect(BUNDLED_QURAN_AYAHS.map((a) => quranAyahAudioPath("x", a.surah, a.ayah).slice("audio/quran/x/".length, -4))).toEqual(QURANIC.flatMap((q) => q.stems));
  });

  it("has every ayah for all 10 reciters (+ 9 own-voice basmala files) on disk — non-empty, 169 files, nothing else", async () => {
    expect(QURAN_RECITERS.map((r) => r.id)).toEqual(RECITER_IDS);
    const expected = [
      ...RECITER_IDS.flatMap((reciter) => BUNDLED_QURAN_AYAHS.map((a) => `/public/${quranAyahAudioPath(reciter, a.surah, a.ayah)}`)),
      ...WITH_BASMALA_FILE.map((reciter) => `/public/audio/quran/${reciter}/basmala.mp3`),
    ];
    expect(expected).toHaveLength(169);
    expect(Object.keys(quranFiles).sort()).toEqual([...expected].sort());
    const loaded = await Promise.all(expected.map(async (file) => [file, await quranFiles[file]()] as const));
    for (const [file, dataUri] of loaded) {
      expect(dataUri.startsWith("data:audio/mpeg;base64,"), file).toBe(true);
      expect(dataUri.length, file).toBeGreaterThan(10_000);
    }
  }, 60_000);
});

describe("resolver: quranRef + reciter → local files", () => {
  it.each(RECITER_IDS)("%s: every Quranic dhikr (Ayat al-Kursi too) resolves to his own basmala, then the ayahs in order — the same for every repetition", (reciterId) => {
    const reciter = getAvailableQuranReciters().find((r) => r.id === reciterId)!;
    for (const q of QURANIC) {
      // No `repeat`: every repetition plays exactly these files, basmala first.
      expect(resolveQuranAudio(q.ref, reciter), q.id).toEqual({ status: "ready", reciterId, ref: q.ref, urls: stemsFor(reciterId, q).map((s) => url(reciterId, s)) });
      expect(bundledQuranAudioPaths(q.ref, reciter)).toEqual(q.stems.map((s) => `audio/quran/${reciterId}/${s}.mp3`));
    }
  });

  it("every reciter's basmala is his own — never another reciter's file", () => {
    for (const reciter of getAvailableQuranReciters()) {
      for (const q of QURANIC) {
        const audio = bundledQuranAudio(q.ref, reciter)!;
        for (const path of [...audio.paths, ...(audio.repeat?.paths ?? [])]) expect(path, `${reciter.id} ${q.id}`).toMatch(new RegExp(`^audio/quran/${reciter.id}/`));
      }
    }
    expect([...WITH_BASMALA_FILE, ...NO_VERIFIED_BASMALA].sort()).toEqual([...RECITER_IDS].sort());
  });
});

describe("Specific Reciter mode", () => {
  it("plays every Quranic dhikr with the selected reciter, and only that reciter", () => {
    saveSelectedQuranReciterId("alafasy-murattal");
    for (const q of QURANIC) {
      const stems = stemsFor("alafasy-murattal", q);
      startAudioAdhkar("morning", item("morning", q.id));
      endRepetition(stems.length);
      expect(fake.played.slice(-stems.length), q.id).toEqual(stems.map((s) => url("alafasy-murattal", s)));
      stopAudioAdhkar();
    }
    expect(fake.played.every((u) => u.includes("/alafasy-murattal/"))).toBe(true);
    expect(loadQuranRotationIndex()).toBe(0); // the rotation is untouched
  });

  it("plays on the quran channel, so changing the reciter stops it", () => {
    startAudioAdhkar("evening", item("evening", "morning_001"));
    expect(getActiveAudio()).toEqual({ channel: "quran", key: "quran:abdulbasit-murattal:2:255" });
    stopAudio("quran"); // what QuranReciterProvider does on a change
    expect(getNowPlaying()).toBeNull();
  });
});

describe("Random rotation (a section's reciter set to random)", () => {
  beforeEach(() => saveSectionReciterChoice("morning", "random"));
  afterEach(() => setSectionReciterRandomForTesting(null));

  it("gives each recitation a random reciter — never the same one twice in a row — and every reciter comes up", () => {
    const kursi = item("morning", "morning_001");
    const used: string[] = [];
    for (let i = 0; i < 80; i++) {
      startAudioAdhkar("morning", kursi);
      used.push(fake.played.at(-1)!.split("/")[3]);
      stopAudioAdhkar();
    }
    for (let i = 1; i < used.length; i++) expect(used[i], `recitation ${i + 1}`).not.toBe(used[i - 1]);
    expect(new Set(used)).toEqual(new Set(RECITER_IDS));
  });

  it("the app-wide rotation itself is unchanged: it continues from its persisted position", () => {
    saveQuranReciterMode("rotation");
    saveQuranRotationIndex(3);
    expect(takeQuranReciterForPlayback().id).toBe("alafasy-murattal");
    expect(takeQuranReciterForPlayback().id).toBe("sudais-murattal");
    expect(takeQuranReciterForPlayback().id).toBe("muaiqly-murattal");
    saveQuranRotationIndex(7);
    expect(takeQuranReciterForPlayback().id).toBe("qatami-murattal");
    expect(takeQuranReciterForPlayback().id).toBe("banna-murattal");
    expect(takeQuranReciterForPlayback().id).toBe("mustafaismail-mujawwad");
    expect(takeQuranReciterForPlayback().id).toBe("abdulbasit-murattal"); // wraps after all 10
  });

  it("looking (rendering, availability, the scheduled playlist) never draws a new reciter", () => {
    const shown = peekSectionReciter("morning").id;
    for (let i = 0; i < 3; i++) {
      expect(peekSectionReciter("morning").id).toBe(shown);
      getAudioAdhkarSource("morning", item("morning", "morning_002"));
    }
    startAudioAdhkar("morning", item("morning", "morning_001"));
    expect(fake.played.at(-1)!.split("/")[3]).toBe(shown); // what was shown is what plays
  });

  it("keeps ONE reciter for all ayahs and all repetitions of a recitation; pauses 1.5 s only between repetitions", () => {
    // Counting pending timers exactly: keep jsdom's per-write "storage" event timers (the heard-count) out of it.
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    onTestFinished(() => setItem.mockRestore());
    setSectionReciterRandomForTesting(() => 0.2); // → Husary (index 2 of 10)
    const ikhlas = QURANIC[1];
    startAudioAdhkar("morning", item("morning", ikhlas.id));
    // jsdom queues a timer per localStorage write (its "storage" event), so
    // count the repetition pause relative to what is pending right now.
    vi.runOnlyPendingTimers();
    const base = vi.getTimerCount();
    for (let rep = 1; rep <= 3; rep++) {
      expect(getNowPlaying()).toMatchObject({ itemId: "morning_002", repetition: rep, total: 3, status: "playing" });
      const files = 5; // every repetition opens with Husary's own basmala
      for (let a = 0; a < files; a++) {
        if (a > 0) expect(vi.getTimerCount(), `no pause before file ${a + 1}`).toBe(base);
        fake.end();
      }
      if (rep < 3) {
        expect(vi.getTimerCount()).toBe(base + 1);
        const before = fake.played.length;
        vi.advanceTimersByTime(REPETITION_PAUSE_MS - 1);
        expect(fake.played).toHaveLength(before);
        vi.advanceTimersByTime(1);
      }
    }
    expect(getNowPlaying()).toMatchObject({ repetition: 3, total: 3, status: "finished" });
    const order = ikhlas.stems.map((s) => url("husary-murattal", s));
    const b = url("husary-murattal", "basmala");
    expect(fake.played).toEqual([b, ...order, b, ...order, b, ...order]); // basmala before every repetition, never between ayahs
  });
});

describe("multi-ayah ordering", () => {
  it.each(QURANIC.slice(1))("$id plays the reciter's basmala then its ayahs strictly in order, each from the original file", (q) => {
    const stems = stemsFor("abdulbasit-murattal", q);
    startAudioAdhkar("evening", item("evening", q.id));
    endRepetition(stems.length);
    expect(fake.played.slice(0, stems.length)).toEqual(stems.map((s) => url("abdulbasit-murattal", s)));
  });
});

describe.each(["banna-murattal", "mustafaismail-mujawwad"])("new reciter %s", (reciterId) => {
  it("Specific Reciter: all four Quranic items play every ayah in order — the same in Morning and Evening", () => {
    saveSelectedQuranReciterId(reciterId);
    for (const category of ["morning", "evening"] as const) {
      for (const q of QURANIC) {
        fake.played = [];
        const stems = stemsFor(reciterId, q); // his own basmala: in his first-ayah files, or his basmala.mp3 (Ayat al-Kursi)
        startAudioAdhkar(category, item(category, q.id));
        endRepetition(stems.length);
        expect(fake.played.slice(0, stems.length), `${category} ${q.id}`).toEqual(stems.map((s) => url(reciterId, s)));
        stopAudioAdhkar();
      }
    }
  });

  it("is in the random rotation, after the original eight", () => {
    expect(RECITER_IDS.indexOf(reciterId)).toBeGreaterThanOrEqual(8);
    saveSectionReciterChoice("morning", "random");
    setSectionReciterRandomForTesting(() => (RECITER_IDS.indexOf(reciterId) + 0.5) / RECITER_IDS.length);
    startAudioAdhkar("morning", item("morning", "morning_001"));
    setSectionReciterRandomForTesting(null);
    expect(fake.played.at(-1)).toBe(url(reciterId, "basmala")); // Ayat al-Kursi starts with his own basmala
  });
});

describe("every bundled Quran file is a valid, unbroken MP3 (incl. Mustafa Ismail's re-gained files and the basmalas)", () => {
  const BITRATES: Record<number, number[]> = {
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // MPEG-1 Layer III
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // MPEG-2 Layer III
  };
  const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000] };

  /** Walks the MPEG frames from the first header to the end; returns how many, or throws where the stream breaks. */
  function countFrames(bytes: Uint8Array): number {
    let i = 0;
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) i = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]); // ID3v2
    const end = bytes.length - (bytes[bytes.length - 128] === 0x54 && bytes[bytes.length - 127] === 0x41 && bytes[bytes.length - 126] === 0x47 ? 128 : 0); // ID3v1 "TAG"
    let frames = 0;
    while (i + 4 <= end) {
      if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) throw new Error(`no frame sync at byte ${i} of ${end}`);
      const version = (bytes[i + 1] >> 3) & 3; // 3 = MPEG-1, 2 = MPEG-2
      if ((bytes[i + 1] & 0x06) !== 0x02 || !(version in BITRATES)) throw new Error(`not MPEG Layer III at byte ${i}`);
      const kbps = BITRATES[version][bytes[i + 2] >> 4];
      const rate = RATES[version][(bytes[i + 2] >> 2) & 3];
      const padding = (bytes[i + 2] >> 1) & 1;
      if (!kbps || !rate) throw new Error(`bad header at byte ${i}`);
      i += Math.floor(((version === 3 ? 144 : 72) * kbps * 1000) / rate) + padding;
      frames += 1;
    }
    return frames;
  }
  const bytesOf = (dataUri: string) => Uint8Array.from(atob(dataUri.slice(dataUri.indexOf(",") + 1)), (c) => c.charCodeAt(0));

  it("all 169 files parse frame by frame to their end; none carries an APE (mp3gain) tag", async () => {
    const files = Object.keys(quranFiles);
    expect(files).toHaveLength(169);
    for (const file of files) {
      const bytes = bytesOf(await quranFiles[file]());
      expect(countFrames(bytes), file).toBeGreaterThan(20);
      expect(new TextDecoder("latin1").decode(bytes.slice(-200)).includes("APETAGEX"), file).toBe(false);
    }
  }, 120_000);
});
