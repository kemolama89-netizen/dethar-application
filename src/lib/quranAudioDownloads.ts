// On-demand Qur'an reciters in the Android app — the same design as the Adhan
// recordings (lib/adhanDownloads.ts). The APK carries only the built-in
// reciter (src/data/quranAudioDownloads.json `bundled`: al-Husary, the
// default); every other reciter is listened to online (a short sample) and
// downloaded on demand (scripts/audio/exclude-quran-from-apk.mjs).
//
//  - A reciter is a set of files (his 16 ayahs of the Qur'anic adhkar and his
//    own basmala). He is on the device only once EVERY file is there and
//    verified: a partial download plays nothing of his.
//  - Playback never uses the network. A reciter who isn't on the device is
//    never handed to the player: the built-in reciter plays in his place
//    (lib/quranReciterSelection.ts, lib/audioAdhkarScheduleSettings.ts), so the
//    Qur'anic adhkar never go silent and the scheduled sessions never fail.
//  - Each file is kept only if its size and SHA-256 match the manifest; a
//    download that stopped keeps its finished files, and a retry fetches only
//    the rest.
//  - A download is never lost quietly: reciters the user downloaded are
//    remembered (quran-audio-downloads:kept), so one gone from the device shows
//    as such and can be fetched again.
//  - Reciters added after this version come from the hosted catalog
//    (lib/quranReciterCatalog.ts), with their own files' checksums.
//
// In a browser (the web app) every reciter's files are on the site and every
// reciter plays online, as before; each can also be downloaded with a tap into
// the browser's own storage (the Adhan's IndexedDB backend, lib/adhanWebDownloads.ts),
// from where he then plays without a connection. quranAudioOnDemand() is false
// there, so nothing else changes.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import manifest from "../data/quranAudioDownloads.json";
import { getAvailableQuranReciters, getCatalogQuranReciters, getDefaultQuranReciter } from "../data/quranReciters";
import type { QuranReciter } from "../data/quranReciters";
import type { QuranAudioFileEntry } from "./quranReciterCatalog";
import { refreshQuranCatalog } from "./quranReciterCatalog";
import { createWebAdhanDownloads, indexedDbFiles } from "./adhanWebDownloads";

export interface QuranAudioDownloadsPlugin {
  list(): Promise<{ files: { reciter: string; file: string; path: string; bytes?: number; sha256?: string }[] }>;
  download(options: { reciter: string; file: string; url: string; bytes: number; sha256: string }): Promise<{ path: string }>;
  cancel(options: { reciter: string }): Promise<void>;
  /** Without [file], every file of the reciter. */
  remove(options: { reciter: string; file?: string }): Promise<void>;
  addListener(event: "progress", listener: (e: { reciter: string; file: string; received: number; total: number }) => void): Promise<PluginListenerHandle>;
}

/**
 * The browser's backend: the Adhan's (createWebAdhanDownloads — size and SHA-256 checked, saved in
 * IndexedDB, played from a blob: URL), in a database of its own, each file stored as "reciter/file".
 */
export function createWebQuranAudioDownloads(web = createWebAdhanDownloads(indexedDbFiles("dithar-quran-audio-downloads"))): QuranAudioDownloadsPlugin {
  const split = (id: string) => ({ reciter: id.slice(0, id.indexOf("/")), file: id.slice(id.indexOf("/") + 1) });
  const current = new Map<string, string>();
  return {
    list: async () => ({ files: (await web.list()).files.filter((f) => f.id.includes("/")).map((f) => ({ ...split(f.id), path: f.path, bytes: f.bytes, sha256: f.sha256 })) }),
    download: async ({ reciter, file, url, bytes, sha256 }) => {
      const id = `${reciter}/${file}`;
      current.set(reciter, id);
      try {
        return await web.download({ id, url, bytes, sha256 });
      } finally {
        current.delete(reciter);
      }
    },
    cancel: async ({ reciter }) => {
      const id = current.get(reciter);
      if (id) await web.cancel({ id });
    },
    remove: async ({ reciter, file }) => {
      const ids = file ? [`${reciter}/${file}`] : (await web.list()).files.map((f) => f.id).filter((id) => id.startsWith(`${reciter}/`));
      for (const id of ids) await web.remove({ id });
    },
    addListener: (_event, listener) => web.addListener("progress", ({ id, received, total }) => listener({ ...split(id), received, total })),
  };
}

const ownBackend = (): QuranAudioDownloadsPlugin => (Capacitor.isNativePlatform() ? registerPlugin<QuranAudioDownloadsPlugin>("DitharQuranAudioDownloads") : createWebQuranAudioDownloads());
const ownOnDemand = () => import.meta.env.VITE_QURAN_ON_DEMAND === "1" && Capacitor.isNativePlatform();

let native: QuranAudioDownloadsPlugin | null = ownBackend();
let onDemand = ownOnDemand();
let inBrowser = !Capacitor.isNativePlatform();

/** Whether Listen and Download are offered: the on-demand Android app and the web app. */
export function quranDownloadsOffered(): boolean {
  return onDemand || inBrowser;
}

/** Whether [id] is built into this app (only the Android app has one). */
const isBuiltIn = (id: string) => onDemand && id === QURAN_BUILT_IN_RECITER_ID;

/** The Android app, with every reciter but the built-in one left out of its APK. */
export function quranAudioOnDemand(): boolean {
  return onDemand;
}

/** The reciter built into the APK, who plays in place of any reciter not on the device. */
export const QURAN_BUILT_IN_RECITER_ID: string = manifest.bundled;

const bundledFiles = manifest.reciters as Readonly<Record<string, { files: Readonly<Record<string, QuranAudioFileEntry>> }>>;

/** A reciter's files, by name ("002255.mp3", "basmala.mp3"): this version's manifest, else the catalog's. */
function manifestFiles(id: string): Readonly<Record<string, QuranAudioFileEntry>> | null {
  return bundledFiles[id]?.files ?? getCatalogQuranReciters().find((c) => c.reciter.id === id)?.files ?? null;
}

/** Downloaded, verified files per reciter: file name → absolute path. */
const files = new Map<string, Map<string, string>>();
/** Downloads in progress: bytes done so far (finished files + the current one), of the reciter's total. */
const active = new Map<string, { received: number; total: number; done: number; cancelled: boolean }>();
const failed = new Map<string, QuranDownloadFailure>();
const lost = new Set<string>();
const KEPT_KEY = "dithar:quran-audio-downloads:kept:v1";
let storageProblem = false;
const listeners = new Set<() => void>();
const fileListeners = new Set<() => void>();
let version = 0;
let ready: Promise<void> | null = null;
let isReady = false;

function changed(): void {
  version++;
  for (const listener of [...listeners]) listener();
}

function filesChanged(): void {
  for (const listener of [...fileListeners]) listener();
}

/** For the UI: called on any change of progress or files. */
export function subscribeQuranAudioDownloads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const quranAudioDownloadsVersion = () => version;

/** Called when the reciters on the device change, so the scheduled sessions get playlists that play. */
export function onQuranAudioFilesChanged(listener: () => void): () => void {
  fileListeners.add(listener);
  return () => fileListeners.delete(listener);
}

/** Resolves once the files on this device are known. Anything that sends native its playlists waits for this. */
export function quranAudioDownloadsReady(): Promise<void> {
  if (!quranDownloadsOffered() || !native) return Promise.resolve();
  const backend = native;
  ready ??= (async () => {
    void backend.addListener("progress", ({ reciter, received }) => {
      const a = active.get(reciter);
      if (!a) return;
      a.received = Math.min(a.total, a.done + received);
      changed();
    });
    await readFiles();
  })();
  return ready;
}

function loadKept(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEPT_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function saveKept(kept: Set<string>): void {
  try {
    localStorage.setItem(KEPT_KEY, JSON.stringify([...kept]));
  } catch {
    // Only the notice that a download went missing depends on this.
  }
}

/** Whether every file of [id] is on the device and verified. */
function complete(id: string): boolean {
  const want = manifestFiles(id);
  const have = files.get(id);
  return !!want && !!have && Object.keys(want).every((name) => have.has(name));
}

/**
 * What is really on the device, against the manifest. A file this version
 * doesn't expect (another version of it, or a reciter it no longer has) is
 * removed. If storage can't be read, nothing is concluded about what is there.
 */
async function readFiles(): Promise<void> {
  if (!native) return;
  let found: Awaited<ReturnType<QuranAudioDownloadsPlugin["list"]>>["files"];
  try {
    found = (await native.list()).files;
    storageProblem = false;
  } catch {
    storageProblem = true;
    isReady = true;
    changed();
    return;
  }
  const before = onDeviceKey();
  files.clear();
  lost.clear();
  for (const { reciter, file, path, bytes, sha256 } of found) {
    const entry = manifestFiles(reciter)?.[file];
    const outdated = !!entry && ((bytes !== undefined && bytes !== entry.bytes) || (sha256 !== undefined && sha256 !== entry.sha256));
    if (!entry || outdated) {
      await native.remove({ reciter, file }).catch(() => {});
      continue;
    }
    if (!files.has(reciter)) files.set(reciter, new Map());
    files.get(reciter)!.set(file, path);
  }
  const kept = loadKept();
  for (const id of kept) if (!complete(id) && !active.has(id)) lost.add(id);
  isReady = true;
  changed();
  if (onDeviceKey() !== before) filesChanged();
}

/** The complete reciters, as a key: what changes the playlists. */
const onDeviceKey = () => [...files.keys()].filter(complete).sort().join();

/** The settings screen opened: look again, and fetch the catalog of newer reciters. */
export async function refreshQuranAudioDownloads(): Promise<void> {
  await quranAudioDownloadsReady();
  if (!quranDownloadsOffered()) return;
  if (await refreshQuranCatalog(`${onDemand ? manifest.baseUrl : import.meta.env.BASE_URL}audio/quran/catalog.json`)) changed();
  await readFiles();
}

/** A notice for the whole screen: this device's storage can't be read. */
export function quranAudioStorageNotice(): "unavailable" | null {
  return storageProblem ? "unavailable" : null;
}

/** Whether the device's files are known (always, outside the on-demand Android app). Until then only the built-in reciter plays. */
export function quranAudioFilesKnown(): boolean {
  return !onDemand || isReady;
}

/** Whether [id] plays offline on this device: always in the web app; in the Android app, the built-in reciter or a complete download. */
export function isQuranReciterOnDevice(id: string): boolean {
  return !onDemand || id === QURAN_BUILT_IN_RECITER_ID || (isReady && complete(id));
}

/** [reciter] when he plays on this device, else the built-in reciter (the default) — who always does. */
export function playableQuranReciter(reciter: QuranReciter): QuranReciter {
  return isQuranReciterOnDevice(reciter.id) ? reciter : getDefaultQuranReciter();
}

/** The available reciters that play on this device, in the registry's order: what a rotation or a random draw picks from. Never empty. */
export function getPlayableQuranReciters(): QuranReciter[] {
  const playable = getAvailableQuranReciters().filter((r) => isQuranReciterOnDevice(r.id));
  return playable.length > 0 ? playable : [getDefaultQuranReciter()];
}

/** Why a download stopped (as the Adhan's — AdhanDownloadRules). */
export type QuranDownloadFailure = "offline" | "source-unavailable" | "no-space" | "mismatch" | "storage" | "unknown";
const FAILURES: readonly string[] = ["offline", "source-unavailable", "no-space", "mismatch", "storage"];

export type QuranDownloadState =
  | { kind: "built-in" }
  | { kind: "downloaded" }
  | { kind: "downloading"; received: number; total: number }
  | { kind: "failed"; reason: QuranDownloadFailure; received: number; total: number }
  | { kind: "lost" }
  /** Some files are here from a download that stopped earlier: not playable until the rest come. */
  | { kind: "partial"; received: number; total: number }
  | { kind: "none" };

/** Bytes of [id]'s files already on the device (a stopped download's finished files). */
function bytesOnDevice(id: string): number {
  const want = manifestFiles(id) ?? {};
  return [...(files.get(id)?.keys() ?? [])].reduce((n, name) => n + (want[name]?.bytes ?? 0), 0);
}

export function quranDownloadState(id: string): QuranDownloadState {
  if (!quranDownloadsOffered() || isBuiltIn(id)) return { kind: "built-in" };
  const a = active.get(id);
  if (a) return { kind: "downloading", received: a.received, total: a.total };
  if (complete(id)) return { kind: "downloaded" };
  const reason = failed.get(id);
  if (reason) return { kind: "failed", reason, received: bytesOnDevice(id), total: quranDownloadBytes(id) };
  if (lost.has(id)) return { kind: "lost" };
  const received = bytesOnDevice(id);
  return received > 0 ? { kind: "partial", received, total: quranDownloadBytes(id) } : { kind: "none" };
}

/** The size of [id]'s whole set of files. */
export const quranDownloadBytes = (id: string): number => Object.values(manifestFiles(id) ?? {}).reduce((n, f) => n + f.bytes, 0);

/** Where a reciter's file is hosted: the deployed site for the APK; the site itself in the web app. */
export const quranAudioStreamUrl = (reciterId: string, file: string): string => `${onDemand ? manifest.baseUrl : import.meta.env.BASE_URL}audio/quran/${reciterId}/${file}`;

/**
 * The downloaded file for [path] ("audio/quran/{reciter}/{file}", as quranAudioBundle.ts names it),
 * when it is part of a complete download on this device; else null (an APK asset, or the site's file).
 */
export function downloadedQuranAudioPath(path: string): string | null {
  if (!quranDownloadsOffered()) return null;
  const m = /^audio\/quran\/([a-z0-9-]+)\/([^/]+)$/.exec(path);
  if (!m || isBuiltIn(m[1]) || !complete(m[1])) return null;
  return files.get(m[1])?.get(m[2]) ?? null;
}

/** A playable URL for a downloaded file: the WebView can't open a plain path; in a browser it is already a blob: URL. */
export const downloadedQuranAudioUrl = (path: string): string => (inBrowser ? path : Capacitor.convertFileSrc(path));

/**
 * A short sample of [reciter] — his own basmala (if voiced), then al-Ikhlas 112:1–2 — from the
 * device when he is on it, else streamed. Never downloads anything.
 */
export function quranPreviewUrls(reciter: QuranReciter): { urls: string[]; local: boolean } {
  const names = [...(reciter.audio.kind === "bundled" && reciter.audio.basmala.kind === "separate" ? ["basmala.mp3"] : []), "112001.mp3", "112002.mp3"];
  // On this device: downloaded, or built into the APK. (In a browser, a reciter not downloaded streams from the site.)
  const local = complete(reciter.id) || isBuiltIn(reciter.id);
  const urls = names.map((name) => {
    const path = `audio/quran/${reciter.id}/${name}`;
    const downloaded = downloadedQuranAudioPath(path);
    if (downloaded) return downloadedQuranAudioUrl(downloaded);
    return isBuiltIn(reciter.id) ? `${import.meta.env.BASE_URL}${path}` : quranAudioStreamUrl(reciter.id, name);
  });
  return { urls, local };
}

/** Downloads [id]'s whole set, file by file — skipping the files already here. */
export async function downloadQuranReciter(id: string): Promise<void> {
  // A tap before the device's files are known must not fetch what's already there.
  if (!isReady) await quranAudioDownloadsReady();
  const want = manifestFiles(id);
  if (!quranDownloadsOffered() || !native || !want || isBuiltIn(id) || complete(id) || active.has(id)) return;
  const backend = native;
  failed.delete(id);
  lost.delete(id);
  const total = quranDownloadBytes(id);
  const progress = { received: bytesOnDevice(id), total, done: bytesOnDevice(id), cancelled: false };
  active.set(id, progress);
  changed();
  try {
    for (const [name, entry] of Object.entries(want)) {
      if (files.get(id)?.has(name)) continue;
      if (progress.cancelled) throw new Error("cancelled");
      const { path } = await backend.download({ reciter: id, file: name, url: quranAudioStreamUrl(id, name), bytes: entry.bytes, sha256: entry.sha256 });
      if (!files.has(id)) files.set(id, new Map());
      files.get(id)!.set(name, path);
      progress.done += entry.bytes;
      progress.received = progress.done;
      changed();
    }
    active.delete(id);
    const kept = loadKept();
    kept.add(id);
    saveKept(kept);
    changed();
    filesChanged();
  } catch (e) {
    active.delete(id);
    const message = e instanceof Error ? e.message : "";
    // Cancelling is the user's own choice, not a failure; the finished files stay for a later download.
    if (message !== "cancelled" && !progress.cancelled) failed.set(id, FAILURES.includes(message) ? (message as QuranDownloadFailure) : "unknown");
    changed();
  }
}

export async function cancelQuranDownload(id: string): Promise<void> {
  const a = active.get(id);
  if (!a || !native) return;
  a.cancelled = true;
  await native.cancel({ reciter: id }).catch(() => {});
}

/** Removes every file of [id] (a complete download, or what a stopped one left), reclaiming the space. */
export async function removeQuranReciterDownload(id: string): Promise<void> {
  if (!native || isBuiltIn(id) || active.has(id) || !files.has(id)) return;
  const wasComplete = complete(id);
  await native.remove({ reciter: id });
  files.delete(id);
  failed.delete(id);
  // The user's own choice: not something to report as missing later.
  const kept = loadKept();
  kept.delete(id);
  saveKept(kept);
  changed();
  if (wasComplete) filesChanged();
}

/** Bytes this device holds for [id] (complete or not): what Delete reclaims. */
export const quranBytesOnDevice = (id: string): number => bytesOnDevice(id);

/** Test seam: the Android app's mode with a fake native side, or with [browser] the web app's. Null restores this build's own mode. */
export function setQuranAudioDownloadsForTesting(fake: QuranAudioDownloadsPlugin | null, browser = false): void {
  native = fake ?? ownBackend();
  onDemand = fake ? !browser : ownOnDemand();
  inBrowser = fake ? browser : !Capacitor.isNativePlatform();
  files.clear();
  active.clear();
  failed.clear();
  lost.clear();
  storageProblem = false;
  fileListeners.clear();
  listeners.clear();
  ready = null;
  isReady = false;
  version = 0;
}
