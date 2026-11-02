// @vitest-environment jsdom
// On-demand Adhan recordings: previews stream, prayer time never does, the
// rotation and its exclusions keep working over what is on the device, and an
// adhan always has something to play.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "../data/adhanDownloads.json";
import { adhanRecordings, getAdhanRecordingById } from "../data/adhanRecordings";
import { DEFAULT_FAJR_RECORDING_ID, DEFAULT_REGULAR_RECORDING_ID, resetAdhanAudioSettingsMemoryForTesting, saveAdhanAutoPlay, saveFajrAdhanChoice, saveRegularAdhanChoice } from "./adhanAudioSettings";
import { adhanStorageNotice, refreshAdhanDownloads, adhanDownloadState, adhanDownloadsReady, adhanNativeSource, adhanOnDemand, cancelAdhanDownload, downloadAdhan, isAdhanPlayableOffline, onAdhanFilesChanged, removeAdhanDownload, setAdhanDownloadsForTesting } from "./adhanDownloads";
import { adhanAudioUrl } from "./adhanAudio";
import { downloadChosenAdhanVoices, peekNextAdhanVoice, resetAdhanRotationMemoryForTesting, rotationVoices, scheduledRotationVoices, setAdhanRotationEnabled, setAdhanVoiceIncluded, takeNextAdhanVoice } from "./adhanVoiceRotation";
import { buildAdhanConfig } from "./prayerNotifications";

const rec = (id: string) => getAdhanRecordingById(id)!;

function fakeNative(onDevice: string[] = []) {
  const pending = new Map<string, { resolve: (v: { path: string }) => void; reject: (e: Error) => void }>();
  let progress: ((e: { id: string; received: number; total: number }) => void) | null = null;
  return {
    pending,
    emit: (e: { id: string; received: number; total: number }) => progress?.(e),
    list: vi.fn(async () => ({ files: onDevice.map((id) => ({ id, path: `/data/adhan/${id}.mp3` })) })),
    download: vi.fn((o: { id: string; url: string; bytes: number; sha256: string }) => new Promise<{ path: string }>((resolve, reject) => pending.set(o.id, { resolve, reject }))),
    cancel: vi.fn(async ({ id }: { id: string }) => pending.get(id)?.reject(new Error("cancelled"))),
    remove: vi.fn(async () => {}),
    addListener: vi.fn(async (_: "progress", l: (e: { id: string; received: number; total: number }) => void) => {
      progress = l;
      return { remove: async () => {} };
    }),
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  localStorage.clear();
  resetAdhanAudioSettingsMemoryForTesting();
  resetAdhanRotationMemoryForTesting();
});
afterEach(() => setAdhanDownloadsForTesting(null));

describe("the manifest", () => {
  it("covers every recording, and the built-in voices are the app's defaults", () => {
    expect(Object.keys(manifest.files).sort()).toEqual(adhanRecordings.map((r) => r.id).sort());
    expect(manifest.bundled).toEqual({ regular: DEFAULT_REGULAR_RECORDING_ID, fajr: DEFAULT_FAJR_RECORDING_ID });
  });

  it("gives the built-in voices every mode, so standing in never loses the chosen one", () => {
    expect(rec(manifest.bundled.regular).segments.full && rec(manifest.bundled.regular).segments.takbeer).toBeTruthy();
    const fajr = rec(manifest.bundled.fajr).segments;
    expect(fajr.full && fajr.takbeer && fajr.fajrPhrase).toBeTruthy();
  });
});

describe("every other build (the web app)", () => {
  it("has them all, with its URLs and rotation unchanged", () => {
    expect(adhanOnDemand()).toBe(false);
    const r = rec("husary");
    expect(isAdhanPlayableOffline(r.id)).toBe(true);
    expect(adhanAudioUrl(r)).toBe(`/${encodeURI(r.path)}`);
    expect(adhanNativeSource(r)).toBe(`public/${r.path}`);
    expect(scheduledRotationVoices("regular")).toEqual(rotationVoices("regular"));
  });
});

describe("in the Android app", () => {
  it("streams a preview of a voice that isn't on the device, and plays the file once it is", async () => {
    setAdhanDownloadsForTesting(fakeNative(["minshawi"]));
    await adhanDownloadsReady();
    expect(adhanAudioUrl(rec("husary"))).toBe(`${manifest.baseUrl}${encodeURI(rec("husary").path)}`);
    expect(adhanAudioUrl(rec("minshawi"))).toContain("/data/adhan/minshawi.mp3");
    expect(adhanAudioUrl(rec("minshawi"))).not.toContain("github.io");
  });

  it("plays a built-in voice from the app, never the network", async () => {
    setAdhanDownloadsForTesting(fakeNative());
    await adhanDownloadsReady();
    expect(adhanAudioUrl(rec(manifest.bundled.regular))).toBe(`/${encodeURI(rec(manifest.bundled.regular).path)}`);
    expect(adhanDownloadState(manifest.bundled.regular).kind).toBe("built-in");
  });

  it("sends the alarm only files on the device, never a URL", async () => {
    setAdhanDownloadsForTesting(fakeNative(["minshawi", "husary"]));
    await adhanDownloadsReady();
    saveAdhanAutoPlay("regular", true);
    setAdhanRotationEnabled("regular", true);
    const config = buildAdhanConfig("regular", "ar")!;
    expect(config.voices.map((v) => v.id).sort()).toEqual(["alafasy-kuwait", "husary", "minshawi"]);
    for (const v of config.voices) expect(v.assetPath).toMatch(/^(public\/|\/data\/adhan\/)/);
    expect(config.rotate).toBe(true);
    expect(config.fallback?.id).toBe(manifest.bundled.regular);
  });

  it("keeps the rotation random over the device's voices, without repeating, and honours exclusions", async () => {
    setAdhanDownloadsForTesting(fakeNative(["minshawi", "husary", "refaat"]));
    await adhanDownloadsReady();
    setAdhanRotationEnabled("regular", true);
    setAdhanVoiceIncluded("regular", "refaat", false);
    const allowed = new Set(["alafasy-kuwait", "minshawi", "husary"]);
    let last = "";
    for (let i = 0; i < 40; i++) {
      const { id } = takeNextAdhanVoice("regular", `day-${i}`).recording;
      expect(allowed.has(id)).toBe(true);
      expect(id).not.toBe(last);
      last = id;
    }
  });

  it("doesn't count a voice as gone from the rotation just because it isn't downloaded: the exclusion list is untouched", async () => {
    setAdhanDownloadsForTesting(fakeNative());
    await adhanDownloadsReady();
    setAdhanRotationEnabled("regular", true);
    const before = rotationVoices("regular").length;
    expect(before).toBeGreaterThan(1);
    // Excluding the one built-in voice is allowed: other voices stay selected, even if not downloaded yet.
    const next = setAdhanVoiceIncluded("regular", manifest.bundled.regular, false);
    expect(next.regular.excluded).toEqual([manifest.bundled.regular]);
    expect(rotationVoices("regular").length).toBe(before - 1);
  });

  it("still plays an adhan when every voice left in the rotation isn't downloaded", async () => {
    setAdhanDownloadsForTesting(fakeNative());
    await adhanDownloadsReady();
    saveAdhanAutoPlay("regular", true);
    setAdhanRotationEnabled("regular", true);
    setAdhanVoiceIncluded("regular", manifest.bundled.regular, false);
    const config = buildAdhanConfig("regular", "ar")!;
    expect(config.voices.map((v) => v.id)).toEqual([manifest.bundled.regular]);
    expect(peekNextAdhanVoice("regular").recording.id).toBe(manifest.bundled.regular);
  });

  it("stands in the built-in voice for a chosen voice not yet downloaded, keeping the choice and the mode", async () => {
    setAdhanDownloadsForTesting(fakeNative());
    await adhanDownloadsReady();
    saveAdhanAutoPlay("fajr", true);
    saveFajrAdhanChoice({ recordingId: "omran-fajr", mode: "takbeer" });
    const config = buildAdhanConfig("fajr", "ar")!;
    expect(config.voices.map((v) => v.id)).toEqual([manifest.bundled.fajr]);
    const segment = rec(manifest.bundled.fajr).segments.takbeer!;
    expect(config.voices[0].endMillis).toBe(Math.round(segment.end * 1000));
  });

  it("downloads the chosen voice without a further tap, and only that one", async () => {
    const native = fakeNative();
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    saveRegularAdhanChoice({ recordingId: "husary" });
    downloadChosenAdhanVoices();
    await flush();
    expect(native.download.mock.calls.map(([o]) => o.id)).toEqual(["husary"]);
    expect(native.download.mock.calls[0][0]).toMatchObject({ url: `${manifest.baseUrl}${encodeURI(rec("husary").path)}`, bytes: manifest.files.husary.bytes, sha256: manifest.files.husary.sha256 });
  });

  it("downloads nothing by itself while rotating, or for a built-in voice", async () => {
    const native = fakeNative();
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    downloadChosenAdhanVoices();
    saveRegularAdhanChoice({ recordingId: "husary" });
    setAdhanRotationEnabled("regular", true);
    downloadChosenAdhanVoices();
    await flush();
    expect(native.download).not.toHaveBeenCalled();
  });

  it("shows progress, and on success tells the alarm a new voice can play", async () => {
    const native = fakeNative();
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    const changes = vi.fn();
    onAdhanFilesChanged(changes);
    const done = downloadAdhan(rec("husary"));
    native.emit({ id: "husary", received: 50, total: 100 });
    expect(adhanDownloadState("husary")).toEqual({ kind: "downloading", progress: 0.5 });
    native.pending.get("husary")!.resolve({ path: "/data/adhan/husary.mp3" });
    await done;
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
    expect(adhanNativeSource(rec("husary"))).toBe("/data/adhan/husary.mp3");
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("reports a failed download, but not a cancelled one, and keeps the voice out of the alarm", async () => {
    const native = fakeNative();
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    const failing = downloadAdhan(rec("husary"));
    native.pending.get("husary")!.reject(new Error("the file does not match"));
    await failing;
    expect(adhanDownloadState("husary").kind).toBe("failed");
    expect(adhanNativeSource(rec("husary"))).toBeNull();
    const cancelling = downloadAdhan(rec("minshawi"));
    await cancelAdhanDownload("minshawi");
    await cancelling;
    expect(adhanDownloadState("minshawi").kind).toBe("none");
  });

  it("removes a download: the voice stays offered, and streams again", async () => {
    const native = fakeNative(["husary"]);
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    const changes = vi.fn();
    onAdhanFilesChanged(changes);
    await removeAdhanDownload("husary");
    expect(native.remove).toHaveBeenCalledWith({ id: "husary" });
    expect(adhanDownloadState("husary").kind).toBe("none");
    expect(adhanAudioUrl(rec("husary"))).toContain("github.io");
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("never downloads the same voice twice at once", async () => {
    const native = fakeNative();
    setAdhanDownloadsForTesting(native);
    await adhanDownloadsReady();
    void downloadAdhan(rec("husary"));
    void downloadAdhan(rec("husary"));
    expect(native.download).toHaveBeenCalledTimes(1);
  });
});

describe("a download is never lost quietly", () => {
  const entry = manifest.files.husary;
  const good = { id: "husary", path: "/data/adhan/husary.mp3", bytes: entry.bytes, sha256: entry.sha256 };
  const withFiles = (found: () => { id: string; path: string; bytes?: number; sha256?: string }[]) => ({ ...fakeNative(), list: vi.fn(async () => ({ files: found() })) });

  it("keeps a file across a later start of the app", async () => {
    setAdhanDownloadsForTesting(withFiles(() => [good]));
    await adhanDownloadsReady();
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
    setAdhanDownloadsForTesting(withFiles(() => [good]));
    await adhanDownloadsReady();
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
    expect(adhanNativeSource(rec("husary"))).toBe(good.path);
  });

  it("says so when a downloaded file has gone, rather than just offering Download", async () => {
    let present = [good];
    setAdhanDownloadsForTesting(withFiles(() => present));
    await adhanDownloadsReady();
    present = [];
    await refreshAdhanDownloads();
    expect(adhanDownloadState("husary").kind).toBe("lost");
    expect(adhanNativeSource(rec("husary"))).toBeNull();
  });

  it("still knows after a restart, and the notice ends when it is downloaded again", async () => {
    setAdhanDownloadsForTesting(withFiles(() => [good]));
    await adhanDownloadsReady();
    const fake = withFiles(() => []);
    setAdhanDownloadsForTesting(fake);
    await adhanDownloadsReady();
    expect(adhanDownloadState("husary").kind).toBe("lost");
    const done = downloadAdhan(rec("husary"));
    fake.pending.get("husary")!.resolve({ path: good.path });
    await done;
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
  });

  it("doesn't report a voice the user removed themselves", async () => {
    let present = [good];
    setAdhanDownloadsForTesting(withFiles(() => present));
    await adhanDownloadsReady();
    await removeAdhanDownload("husary");
    present = [];
    await refreshAdhanDownloads();
    expect(adhanDownloadState("husary").kind).toBe("none");
  });

  it("concludes nothing when storage can't be read: says so, and keeps the record for later", async () => {
    setAdhanDownloadsForTesting(withFiles(() => [good]));
    await adhanDownloadsReady();
    const fake = fakeNative();
    fake.list = vi.fn(async () => {
      throw new Error("blocked");
    });
    setAdhanDownloadsForTesting(fake);
    await adhanDownloadsReady();
    expect(adhanStorageNotice()).toBe("unavailable");
    expect(adhanDownloadState("husary").kind).toBe("none");
    setAdhanDownloadsForTesting(withFiles(() => [good]));
    await adhanDownloadsReady();
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
    expect(adhanStorageNotice()).toBeNull();
  });

  it("doesn't play a file older than this app expects: it is replaced, not used with the wrong timings", async () => {
    const fake = withFiles(() => [{ ...good, sha256: "0".repeat(64) }]);
    setAdhanDownloadsForTesting(fake);
    await adhanDownloadsReady();
    expect(fake.remove).toHaveBeenCalledWith({ id: "husary" });
    expect(adhanDownloadState("husary").kind).toBe("lost");
    expect(adhanNativeSource(rec("husary"))).toBeNull();
  });

  it("doesn't play a file of the wrong size", async () => {
    const fake = withFiles(() => [{ ...good, bytes: entry.bytes - 1 }]);
    setAdhanDownloadsForTesting(fake);
    await adhanDownloadsReady();
    expect(adhanNativeSource(rec("husary"))).toBeNull();
  });

  it("accepts a correct file saved before versions were recorded", async () => {
    setAdhanDownloadsForTesting(withFiles(() => [{ id: "husary", path: good.path, bytes: entry.bytes }]));
    await adhanDownloadsReady();
    expect(adhanDownloadState("husary").kind).toBe("downloaded");
  });

  it("clears out a recording this version no longer has, without a notice", async () => {
    const fake = withFiles(() => [{ id: "retired-voice", path: "/data/adhan/retired-voice.mp3", bytes: 5 }]);
    setAdhanDownloadsForTesting(fake);
    await adhanDownloadsReady();
    expect(fake.remove).toHaveBeenCalledWith({ id: "retired-voice" });
    expect(adhanDownloadState("retired-voice").kind).toBe("none");
  });

  it("tells the alarm when a voice has gone, so it stops being offered", async () => {
    let present = [good];
    setAdhanDownloadsForTesting(withFiles(() => present));
    await adhanDownloadsReady();
    const changes = vi.fn();
    onAdhanFilesChanged(changes);
    await refreshAdhanDownloads();
    expect(changes).not.toHaveBeenCalled();
    present = [];
    await refreshAdhanDownloads();
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("gives each failure its own reason", async () => {
    for (const reason of ["offline", "source-unavailable", "no-space", "mismatch", "storage"]) {
      const native = fakeNative();
      setAdhanDownloadsForTesting(native);
      await adhanDownloadsReady();
      const running = downloadAdhan(rec("husary"));
      native.pending.get("husary")!.reject(new Error(reason));
      await running;
      expect(adhanDownloadState("husary")).toEqual({ kind: "failed", reason });
    }
  });

  it("warns in a browser that hasn't promised to keep them, only once something is saved", async () => {
    const fake = { ...fakeNative(), persisted: async () => false };
    setAdhanDownloadsForTesting(fake, true);
    await adhanDownloadsReady();
    expect(adhanStorageNotice()).toBeNull();
    const done = downloadAdhan(rec("husary"));
    fake.pending.get("husary")!.resolve({ path: "blob:x" });
    await done;
    expect(adhanStorageNotice()).toBe("not-guaranteed");
  });

  it("doesn't fetch a file that's already there when tapped before the device has been read", async () => {
    const fake = withFiles(() => [good]);
    setAdhanDownloadsForTesting(fake);
    await downloadAdhan(rec("husary"));
    expect(fake.download).not.toHaveBeenCalled();
  });
});

describe("the hosted recordings", () => {
  it("are byte for byte what the manifest promises: an APK in the field rejects anything else, so a file must never change in place", async () => {
    const fs = await import(/* @vite-ignore */ ["node", "fs"].join(":"));
    const crypto = await import(/* @vite-ignore */ ["node", "crypto"].join(":"));
    const root = new URL("../../public/", String(import.meta.url).replace(/^(?!file:)/, "file://"));
    for (const r of adhanRecordings) {
      const bytes = fs.readFileSync(new URL(encodeURI(r.path), root));
      const want = (manifest.files as Record<string, { bytes: number; sha256: string }>)[r.id];
      expect(bytes.length, r.id).toBe(want.bytes);
      expect(crypto.createHash("sha256").update(bytes).digest("hex"), r.id).toBe(want.sha256);
    }
  }, 60_000);
});
