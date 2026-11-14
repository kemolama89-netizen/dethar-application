// @vitest-environment jsdom
// On-demand Qur'an reciters (lib/quranAudioDownloads.ts): only al-Husary ships in the APK; the
// others are previewed online and downloaded whole. What plays is always on the device — a reciter
// not (fully) downloaded gives way to al-Husary — and the user's choice is kept.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import manifest from "../data/quranAudioDownloads.json";
import { DEFAULT_QURAN_RECITER_ID, QURAN_RECITERS, getAvailableQuranReciters, getQuranReciterById } from "../data/quranReciters";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { QuranAudioDownloadsPlugin } from "./quranAudioDownloads";
import {
  QURAN_BUILT_IN_RECITER_ID,
  cancelQuranDownload,
  downloadQuranReciter,
  getPlayableQuranReciters,
  isQuranReciterOnDevice,
  onQuranAudioFilesChanged,
  quranAudioDownloadsReady,
  quranDownloadBytes,
  quranDownloadState,
  quranPreviewUrls,
  refreshQuranAudioDownloads,
  removeQuranReciterDownload,
  setQuranAudioDownloadsForTesting,
} from "./quranAudioDownloads";
import { resolveQuranAudio } from "./quranAudio";
import { loadSelectedQuranReciterId, saveQuranReciterMode, saveSelectedQuranReciterId } from "./quranAudioPreferences";
import { peekQuranReciterForPlayback, takeQuranReciterForPlayback } from "./quranReciterSelection";
import { peekSectionReciter, saveSectionReciterChoice, takeSectionReciter } from "./audioAdhkarScheduleSettings";
import { nativeWrittenAudio } from "./audioAdhkarNativeItems";
import { resetQuranCatalogForTesting } from "./quranReciterCatalog";
import { createWebQuranAudioDownloads } from "./quranAudioDownloads";
import { createWebAdhanDownloads } from "./adhanWebDownloads";
import type { AdhanFileStore, AdhanStoredFile } from "./adhanWebDownloads";

// Node's own modules, as mushafAssets.test.ts loads them (the app's types don't include Node).
const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));
type Files = Record<string, { bytes: number; sha256: string }>;
const filesOf = (id: string): Files => (manifest.reciters as Record<string, { files: Files }>)[id].files;
const MINSHAWI = "minshawi-murattal";
const ayatAlKursi = writtenAdhkarItems.evening.find((i) => i.id === "morning_001")!;

/** A fake native side: files "on disk", every download call, and downloads that wait until released. */
function fakeNative(onDisk: { reciter: string; file: string; bytes?: number; sha256?: string }[] = []) {
  const disk = new Map(onDisk.map((f) => [`${f.reciter}/${f.file}`, f]));
  const calls: string[] = [];
  const removed: string[] = [];
  let progress: ((e: { reciter: string; file: string; received: number; total: number }) => void) | null = null;
  let hold = false;
  const waiting: { resolve: () => void; reject: (e: Error) => void }[] = [];
  let failWith: string | null = null;
  const plugin: QuranAudioDownloadsPlugin = {
    list: async () => ({ files: [...disk.values()].map((f) => ({ ...f, path: `/data/quran-audio/${f.reciter}/${f.file}` })) }),
    download: async ({ reciter, file, url, bytes, sha256 }) => {
      calls.push(`${reciter}/${file} ${url}`);
      progress?.({ reciter, file, received: Math.floor(bytes / 2), total: bytes });
      if (hold) await new Promise<void>((resolve, reject) => waiting.push({ resolve, reject }));
      if (failWith) throw new Error(failWith);
      disk.set(`${reciter}/${file}`, { reciter, file, bytes, sha256 });
      return { path: `/data/quran-audio/${reciter}/${file}` };
    },
    cancel: async () => {
      for (const w of waiting.splice(0)) w.reject(new Error("cancelled"));
    },
    remove: async ({ reciter, file }) => {
      removed.push(file ? `${reciter}/${file}` : reciter);
      for (const key of [...disk.keys()]) if (key === `${reciter}/${file}` || (!file && key.startsWith(`${reciter}/`))) disk.delete(key);
    },
    addListener: async (_e, listener) => {
      progress = listener;
      return { remove: async () => {} };
    },
  };
  return {
    plugin,
    calls,
    removed,
    disk,
    hold: (on: boolean) => (hold = on),
    failWith: (code: string | null) => (failWith = code),
    release: () => waiting.shift()?.resolve(),
    waiting: () => waiting.length,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const complete = (id: string) => Object.entries(filesOf(id)).map(([file, f]) => ({ reciter: id, file, ...f }));

beforeEach(() => {
  localStorage.clear();
  resetQuranCatalogForTesting();
});
afterEach(() => setQuranAudioDownloadsForTesting(null));

describe("the manifest", () => {
  it("names exactly the registry's reciters, with al-Husary — the default — built in", () => {
    expect(Object.keys(manifest.reciters).sort()).toEqual(QURAN_RECITERS.map((r) => r.id).sort());
    expect(QURAN_BUILT_IN_RECITER_ID).toBe("husary-murattal");
    expect(DEFAULT_QURAN_RECITER_ID).toBe(QURAN_BUILT_IN_RECITER_ID);
    expect(manifest.baseUrl).toBe("https://kemolama89-netizen.github.io/dethar-application/");
  });

  it("matches every bundled file byte for byte (size and SHA-256), and lists every one", async () => {
    const fs = await nodeModule("fs");
    const { createHash } = await nodeModule("crypto");
    const { join } = await nodeModule("path");
    // Vitest runs from the project root (a file: URL from import.meta.url isn't one under jsdom).
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    for (const id of Object.keys(manifest.reciters)) {
      const dir: string = join(cwd, "public/audio/quran", id);
      expect(Object.keys(filesOf(id)).sort(), id).toEqual((fs.readdirSync(dir) as string[]).filter((n) => n.endsWith(".mp3")).sort());
      for (const [name, want] of Object.entries(filesOf(id))) {
        const bytes = fs.readFileSync(join(dir, name));
        expect(bytes.length, `${id}/${name}`).toBe(want.bytes);
        expect(createHash("sha256").update(bytes).digest("hex"), `${id}/${name}`).toBe(want.sha256);
      }
    }
  });
});

describe("in the web app (not on demand)", () => {
  it("every reciter still plays online from the site; each can be downloaded into the browser, al-Husary too", async () => {
    setQuranAudioDownloadsForTesting(fakeNative().plugin, true);
    await quranAudioDownloadsReady();
    for (const r of getAvailableQuranReciters()) expect(isQuranReciterOnDevice(r.id)).toBe(true);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "none" });
    expect(quranDownloadState("husary-murattal")).toEqual({ kind: "none" });
    const ref = { surah: 2, fromAyah: 255, toAyah: 255 };
    expect(resolveQuranAudio(ref, getQuranReciterById(MINSHAWI)!)).toMatchObject({ status: "ready", urls: ["/audio/quran/minshawi-murattal/basmala.mp3", "/audio/quran/minshawi-murattal/002255.mp3"] });
    // The sample streams from the site itself.
    expect(quranPreviewUrls(getQuranReciterById(MINSHAWI)!)).toEqual({ urls: ["/audio/quran/minshawi-murattal/basmala.mp3", "/audio/quran/minshawi-murattal/112001.mp3", "/audio/quran/minshawi-murattal/112002.mp3"], local: false });
    // Downloaded: he plays from the browser's own copy.
    await downloadQuranReciter(MINSHAWI);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "downloaded" });
    expect(resolveQuranAudio(ref, getQuranReciterById(MINSHAWI)!)).toMatchObject({ status: "ready", urls: [`/data/quran-audio/${MINSHAWI}/basmala.mp3`, `/data/quran-audio/${MINSHAWI}/002255.mp3`] });
    expect(quranPreviewUrls(getQuranReciterById(MINSHAWI)!).local).toBe(true);
  });

  it("the browser backend is the Adhan's: each file checked (size and SHA-256), saved, listed per reciter, and removed together", async () => {
    // One real file of his, served by a fake site; the rest of his set is checked the same way.
    const name = "112001.mp3";
    const want = filesOf(MINSHAWI)[name];
    const fs = await nodeModule("fs");
    const { join } = await nodeModule("path");
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    const bytes = new Uint8Array(fs.readFileSync(join(cwd, "public/audio/quran", MINSHAWI, name)));
    const saved = new Map<string, AdhanStoredFile>();
    const store: AdhanFileStore = { all: async () => [...saved.values()], put: async (f) => void saved.set(f.id, f), remove: async (id) => void saved.delete(id) };
    const urls: string[] = [];
    const site = (async (url: string) => {
      urls.push(url);
      return new Response(bytes);
    }) as unknown as typeof fetch;
    const backend = createWebQuranAudioDownloads(createWebAdhanDownloads(store, site));
    const progress: string[] = [];
    await backend.addListener("progress", (e) => progress.push(`${e.reciter}/${e.file}`));
    const { path } = await backend.download({ reciter: MINSHAWI, file: name, url: `/audio/quran/${MINSHAWI}/${name}`, bytes: want.bytes, sha256: want.sha256 });
    expect(path.startsWith("blob:")).toBe(true);
    expect([...saved.keys()]).toEqual([`${MINSHAWI}/${name}`]);
    expect(progress.at(-1)).toBe(`${MINSHAWI}/${name}`);
    expect((await backend.list()).files).toEqual([{ reciter: MINSHAWI, file: name, path, bytes: want.bytes, sha256: want.sha256 }]);
    // Another file's checksum: refused, nothing saved.
    await expect(backend.download({ reciter: MINSHAWI, file: "112002.mp3", url: "x", bytes: want.bytes, sha256: "0".repeat(64) })).rejects.toThrow("mismatch");
    expect(saved.size).toBe(1);
    await backend.remove({ reciter: MINSHAWI });
    expect(saved.size).toBe(0);
  });
});

describe("in the Android app (on demand)", () => {
  it("plays only al-Husary until another reciter is downloaded — the choice itself is kept", async () => {
    setQuranAudioDownloadsForTesting(fakeNative().plugin);
    await quranAudioDownloadsReady();
    saveSelectedQuranReciterId(MINSHAWI);
    expect(isQuranReciterOnDevice(MINSHAWI)).toBe(false);
    expect(peekQuranReciterForPlayback().id).toBe("husary-murattal");
    expect(takeQuranReciterForPlayback().id).toBe("husary-murattal");
    expect(loadSelectedQuranReciterId()).toBe(MINSHAWI);
    // A section set to him, or to random: al-Husary — the only reciter on the device.
    saveSectionReciterChoice("evening", MINSHAWI);
    expect(peekSectionReciter("evening").id).toBe("husary-murattal");
    saveSectionReciterChoice("morning", "random");
    for (let i = 0; i < 5; i++) expect(takeSectionReciter("morning").id).toBe("husary-murattal");
    expect(getPlayableQuranReciters().map((r) => r.id)).toEqual(["husary-murattal"]);
    // Never handed to a player: not resolvable, no native files.
    expect(resolveQuranAudio({ surah: 2, fromAyah: 255, toAyah: 255 }, getQuranReciterById(MINSHAWI)!)).toMatchObject({ status: "unavailable", reason: "reciter-unavailable" });
    expect(nativeWrittenAudio("evening", ayatAlKursi, getQuranReciterById(MINSHAWI)!)).toBeNull();
    // Al-Husary plays from the APK.
    expect(nativeWrittenAudio("evening", ayatAlKursi, getQuranReciterById("husary-murattal")!)!.assetPaths).toEqual(["public/audio/quran/husary-murattal/basmala.mp3", "public/audio/quran/husary-murattal/002255.mp3"]);
  });

  it("downloads a reciter's whole set from DITHAR's own site, verified, with progress — then plays him from the device", async () => {
    const fake = fakeNative();
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    let changes = 0;
    onQuranAudioFilesChanged(() => changes++);
    fake.hold(true);
    const done = downloadQuranReciter(MINSHAWI);
    await flush();
    const total = quranDownloadBytes(MINSHAWI);
    const first = Object.values(filesOf(MINSHAWI))[0].bytes;
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "downloading", received: Math.floor(first / 2), total });
    fake.hold(false);
    fake.release();
    await done;
    expect(fake.calls).toHaveLength(Object.keys(filesOf(MINSHAWI)).length);
    expect(fake.calls[0]).toBe(`${MINSHAWI}/002255.mp3 https://kemolama89-netizen.github.io/dethar-application/audio/quran/${MINSHAWI}/002255.mp3`);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "downloaded" });
    expect(changes).toBe(1);
    saveSelectedQuranReciterId(MINSHAWI);
    expect(peekQuranReciterForPlayback().id).toBe(MINSHAWI);
    // The scheduled sessions get his files on the device (native opens absolute paths).
    expect(nativeWrittenAudio("evening", ayatAlKursi, getQuranReciterById(MINSHAWI)!)!.assetPaths).toEqual([`/data/quran-audio/${MINSHAWI}/basmala.mp3`, `/data/quran-audio/${MINSHAWI}/002255.mp3`]);
    // Random now draws from both.
    expect(getPlayableQuranReciters().map((r) => r.id)).toEqual([MINSHAWI, "husary-murattal"]);
  });

  it("a download cancelled half way plays nothing of his; the finished files stay, and continuing fetches only the rest", async () => {
    const fake = fakeNative();
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    const names = Object.keys(filesOf(MINSHAWI));
    // Let 5 files through, then hold the 6th and cancel it.
    let let_ = 5;
    const original = fake.plugin.download;
    fake.plugin.download = async (o) => {
      if (let_-- <= 0) fake.hold(true);
      return original(o);
    };
    const done = downloadQuranReciter(MINSHAWI);
    for (let i = 0; i < 20 && fake.waiting() === 0; i++) await flush();
    await cancelQuranDownload(MINSHAWI);
    await done;
    const state = quranDownloadState(MINSHAWI);
    expect(state.kind).toBe("partial");
    expect(isQuranReciterOnDevice(MINSHAWI)).toBe(false);
    saveSelectedQuranReciterId(MINSHAWI);
    expect(peekQuranReciterForPlayback().id).toBe("husary-murattal");
    // Continue: only the 12 files not yet here.
    fake.hold(false);
    fake.plugin.download = original;
    fake.calls.length = 0;
    await downloadQuranReciter(MINSHAWI);
    expect(fake.calls.map((c) => c.split(" ")[0].split("/")[1])).toEqual(names.slice(5));
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "downloaded" });
  });

  it("reports why a download failed, and a retry can finish it", async () => {
    const fake = fakeNative();
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    fake.failWith("offline");
    await downloadQuranReciter(MINSHAWI);
    expect(quranDownloadState(MINSHAWI)).toMatchObject({ kind: "failed", reason: "offline", received: 0 });
    fake.failWith("no-space");
    await downloadQuranReciter(MINSHAWI);
    expect(quranDownloadState(MINSHAWI)).toMatchObject({ kind: "failed", reason: "no-space" });
    fake.failWith("weird");
    await downloadQuranReciter(MINSHAWI);
    expect(quranDownloadState(MINSHAWI)).toMatchObject({ kind: "failed", reason: "unknown" });
    fake.failWith(null);
    await downloadQuranReciter(MINSHAWI);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "downloaded" });
  });

  it("deleting a reciter reclaims his files; he gives way to al-Husary again, and the choice is kept", async () => {
    const fake = fakeNative(complete(MINSHAWI));
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    saveSelectedQuranReciterId(MINSHAWI);
    expect(peekQuranReciterForPlayback().id).toBe(MINSHAWI);
    let changes = 0;
    onQuranAudioFilesChanged(() => changes++);
    await removeQuranReciterDownload(MINSHAWI);
    expect(fake.removed).toEqual([MINSHAWI]);
    expect(fake.disk.size).toBe(0);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "none" });
    expect(peekQuranReciterForPlayback().id).toBe("husary-murattal");
    expect(loadSelectedQuranReciterId()).toBe(MINSHAWI);
    expect(changes).toBe(1);
    // The built-in reciter can't be removed.
    await removeQuranReciterDownload("husary-murattal");
    expect(fake.removed).toEqual([MINSHAWI]);
  });

  it("drops a file that isn't the expected version, and says when a download the user made has gone", async () => {
    const files = complete(MINSHAWI);
    files[0] = { ...files[0], sha256: "0".repeat(64) };
    const fake = fakeNative(files);
    localStorage.setItem("dithar:quran-audio-downloads:kept:v1", JSON.stringify([MINSHAWI, "alafasy-murattal"]));
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    expect(fake.removed).toEqual([`${MINSHAWI}/${files[0].file}`]);
    expect(isQuranReciterOnDevice(MINSHAWI)).toBe(false);
    expect(quranDownloadState(MINSHAWI)).toEqual({ kind: "lost" });
    expect(quranDownloadState("alafasy-murattal")).toEqual({ kind: "lost" });
    expect(quranDownloadState("qatami-murattal")).toEqual({ kind: "none" });
  });

  it("a sample streams a few seconds from the site without downloading anything — from the device once he is on it", async () => {
    const fake = fakeNative();
    setQuranAudioDownloadsForTesting(fake.plugin);
    await quranAudioDownloadsReady();
    const base = `https://kemolama89-netizen.github.io/dethar-application/audio/quran/${MINSHAWI}/`;
    expect(quranPreviewUrls(getQuranReciterById(MINSHAWI)!)).toEqual({ urls: [`${base}basmala.mp3`, `${base}112001.mp3`, `${base}112002.mp3`], local: false });
    expect(fake.calls).toEqual([]);
    // Al-Husary (built in) and a downloaded reciter sample from the device.
    expect(quranPreviewUrls(getQuranReciterById("husary-murattal")!)).toEqual({ urls: ["/audio/quran/husary-murattal/basmala.mp3", "/audio/quran/husary-murattal/112001.mp3", "/audio/quran/husary-murattal/112002.mp3"], local: true });
    // A reciter with no voiced basmala: just his ayahs.
    expect(quranPreviewUrls(getQuranReciterById("sudais-murattal")!).urls.map((u) => u.split("/").pop())).toEqual(["112001.mp3", "112002.mp3"]);
    await downloadQuranReciter(MINSHAWI);
    expect(quranPreviewUrls(getQuranReciterById(MINSHAWI)!).local).toBe(true);
  });

  it("offers reciters added after this version from the hosted catalog — complete, well formed ones only — and downloads them", async () => {
    const fake = fakeNative();
    setQuranAudioDownloadsForTesting(fake.plugin);
    const minshawi = filesOf(MINSHAWI);
    const newcomer = { id: "newcomer-murattal", name: { ar: "قارئ جديد", en: "New Reciter" }, style: "murattal", basmala: { kind: "separate", source: "1:1" }, files: minshawi };
    const catalog = {
      v: 1,
      reciters: [
        newcomer,
        // Can't replace a reciter this version knows; incomplete or malformed entries are left out.
        { ...newcomer, id: MINSHAWI, name: { ar: "x", en: "x" } },
        { ...newcomer, id: "missing-files", files: { "002255.mp3": minshawi["002255.mp3"] } },
        { ...newcomer, id: "bad-basmala", basmala: { kind: "borrowed" } },
      ],
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify(catalog))) as typeof fetch;
    try {
      await refreshQuranAudioDownloads();
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(getAvailableQuranReciters().map((r) => r.id).slice(-1)).toEqual(["newcomer-murattal"]);
    expect(getQuranReciterById(MINSHAWI)!.name.en).toBe("Mohamed Siddiq al-Minshawi");
    expect(getQuranReciterById("missing-files")).toBeUndefined();
    expect(getQuranReciterById("bad-basmala")).toBeUndefined();
    expect(quranDownloadBytes("newcomer-murattal")).toBe(quranDownloadBytes(MINSHAWI));
    await downloadQuranReciter("newcomer-murattal");
    expect(fake.calls[0]).toContain("/audio/quran/newcomer-murattal/002255.mp3");
    expect(isQuranReciterOnDevice("newcomer-murattal")).toBe(true);
    saveQuranReciterMode("rotation");
    expect(getPlayableQuranReciters().map((r) => r.id)).toEqual(["husary-murattal", "newcomer-murattal"]);
  });
});
