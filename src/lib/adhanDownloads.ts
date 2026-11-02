// On-demand Adhan recordings in the Android app. The APK carries only the two
// built-in voices (the defaults); the user listens to any other online and
// downloads the ones they want (scripts/audio/exclude-adhan-from-apk.mjs).
//
//  - Prayer-time playback never uses the network: the alarm plays only built-in
//    or downloaded files, and a built-in voice stands in for anything else, so
//    an adhan never goes silent for want of a connection.
//  - Previews play the local file when there is one, else stream.
//  - A download is kept only if its size and SHA-256 match src/data/adhanDownloads.json.
//  - A download is never lost quietly: the voices the user downloaded are
//    remembered (adhan-downloads:kept), so one that's gone from the device, or is
//    an older version than this app expects, shows as such and can be fetched again.
//
// In a browser (the web app) no file is built in and there is no alarm: every
// recording can be listened to, and downloaded with a tap into the browser's own
// storage (lib/adhanWebDownloads.ts), from where it then plays. adhanOnDemand()
// is false there, so the rotation and everything else behave exactly as before.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import manifest from "../data/adhanDownloads.json";
import type { AdhanRecording } from "../data/adhanRecordings";
import { playableAudioPath } from "./audioAssets";
import { createWebAdhanDownloads } from "./adhanWebDownloads";

export type AdhanDownloadSection = "regular" | "fajr";

interface AdhanDownloadsPlugin {
  list(): Promise<{ files: { id: string; path: string; bytes?: number; sha256?: string }[] }>;
  /** Browser only: whether the browser has agreed never to clear this site's storage by itself. */
  persisted?(): Promise<boolean>;
  download(options: { id: string; url: string; bytes: number; sha256: string }): Promise<{ path: string }>;
  cancel(options: { id: string }): Promise<void>;
  remove(options: { id: string }): Promise<void>;
  addListener(event: "progress", listener: (e: { id: string; received: number; total: number }) => void): Promise<PluginListenerHandle>;
}

const ownBackend = (): AdhanDownloadsPlugin => (Capacitor.isNativePlatform() ? registerPlugin<AdhanDownloadsPlugin>("DitharAdhanDownloads") : createWebAdhanDownloads());
const ownOnDemand = () => import.meta.env.VITE_ADHAN_ON_DEMAND === "1" && Capacitor.isNativePlatform();

let native: AdhanDownloadsPlugin = ownBackend();
let onDemand = ownOnDemand();
let inBrowser = !Capacitor.isNativePlatform();

/** The Android app, with most recordings left out of its APK. */
export function adhanOnDemand(): boolean {
  return onDemand;
}

/** Whether Listen and Download are offered: the Android app and the web app. */
export function adhanDownloadsOffered(): boolean {
  return onDemand || inBrowser;
}

const manifestFiles: Readonly<Record<string, { bytes: number; sha256: string }>> = manifest.files;
const files = new Map<string, string>();
const active = new Map<string, number>();
const failed = new Map<string, AdhanDownloadFailure>();
const lost = new Set<string>();
const KEPT_KEY = "dithar:adhan-downloads:kept:v1";
let storageProblem = false;
let storageGuaranteed = true;
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
export function subscribeAdhanDownloads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const adhanDownloadsVersion = () => version;

/** Called when the set of playable files changes, so the prayer alarm gets the new set. */
export function onAdhanFilesChanged(listener: () => void): () => void {
  fileListeners.add(listener);
  return () => fileListeners.delete(listener);
}

/** Resolves once the files on this device are known. Anything that sends the alarm its voices waits for this. */
export function adhanDownloadsReady(): Promise<void> {
  if (!adhanDownloadsOffered()) return Promise.resolve();
  ready ??= (async () => {
    void native.addListener("progress", ({ id, received, total }) => {
      if (!active.has(id) || total <= 0) return;
      active.set(id, Math.min(1, received / total));
      changed();
    });
    await readFiles();
  })();
  return ready;
}

function loadKept(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEPT_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && id in manifestFiles) : []);
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

/**
 * What is really on the device, against what the user downloaded. Read again
 * each time the settings screen opens, because site data can be cleared at any
 * time. If storage can't be read, nothing is concluded about what is there.
 */
async function readFiles(): Promise<void> {
  let found: Awaited<ReturnType<AdhanDownloadsPlugin["list"]>>["files"];
  try {
    found = (await native.list()).files;
    storageProblem = false;
  } catch {
    storageProblem = true;
    isReady = true;
    changed();
    return;
  }
  const before = [...files.keys()].sort().join();
  const kept = loadKept();
  files.clear();
  lost.clear();
  for (const { id, path, bytes, sha256 } of found) {
    const entry = manifestFiles[id];
    // A recording this version no longer has; or an older file than it expects, whose timings no longer fit.
    const outdated = !!entry && ((bytes !== undefined && bytes !== entry.bytes) || (sha256 !== undefined && sha256 !== entry.sha256));
    if (!entry || outdated) {
      await native.remove({ id }).catch(() => {});
      if (entry) kept.add(id);
    } else {
      files.set(id, path);
      kept.add(id);
    }
  }
  for (const id of kept) if (!files.has(id) && !active.has(id)) lost.add(id);
  saveKept(kept);
  storageGuaranteed = native.persisted ? await native.persisted().catch(() => false) : true;
  isReady = true;
  changed();
  if ([...files.keys()].sort().join() !== before) filesChanged();
}

/** The settings screen opened: look again. */
export function refreshAdhanDownloads(): Promise<void> {
  return adhanDownloadsReady().then(() => (adhanDownloadsOffered() ? readFiles() : undefined));
}

/** A notice for the whole screen: this browser can't save downloads, or may clear them by itself under pressure. */
export function adhanStorageNotice(): "unavailable" | "not-guaranteed" | null {
  if (storageProblem) return "unavailable";
  return inBrowser && !storageGuaranteed && files.size > 0 ? "not-guaranteed" : null;
}

export const adhanFallbackId = (section: AdhanDownloadSection): string => manifest.bundled[section];

export function isAdhanBundled(id: string): boolean {
  if (inBrowser) return false;
  return !onDemand || id === manifest.bundled.regular || id === manifest.bundled.fajr;
}

/**
 * Whether a voice can play at prayer time with no connection. True until the
 * device's files are known, so the rotation's saved next voice isn't redrawn
 * in that moment.
 */
export function isAdhanPlayableOffline(id: string): boolean {
  return !onDemand || !isReady || isAdhanBundled(id) || files.has(id);
}

/** Why a download stopped. */
export type AdhanDownloadFailure = "offline" | "source-unavailable" | "no-space" | "mismatch" | "storage" | "unknown";
const FAILURES: readonly string[] = ["offline", "source-unavailable", "no-space", "mismatch", "storage"];

export type AdhanDownloadState =
  | { kind: "built-in" }
  | { kind: "downloaded" }
  | { kind: "downloading"; progress: number }
  | { kind: "failed"; reason: AdhanDownloadFailure }
  | { kind: "lost" }
  | { kind: "none" };

export function adhanDownloadState(id: string): AdhanDownloadState {
  if (isAdhanBundled(id)) return { kind: "built-in" };
  if (files.has(id)) return { kind: "downloaded" };
  const progress = active.get(id);
  if (progress !== undefined) return { kind: "downloading", progress };
  const reason = failed.get(id);
  if (reason) return { kind: "failed", reason };
  return lost.has(id) ? { kind: "lost" } : { kind: "none" };
}

export const adhanDownloadBytes = (id: string): number => manifestFiles[id]?.bytes ?? 0;

/** The hosted file: the deployed site for the APK; for the web app, its own site. */
export const adhanStreamUrl = (recording: AdhanRecording): string => `${inBrowser ? import.meta.env.BASE_URL : manifest.baseUrl}${encodeURI(recording.path)}`;

/** Where this voice plays from when that isn't the usual URL: the downloaded file, else the stream. Null when the usual URL it is. */
export function adhanOnDemandUrl(recording: AdhanRecording): string | null {
  if (isAdhanBundled(recording.id)) return null;
  const path = files.get(recording.id);
  if (path) return inBrowser ? path : Capacitor.convertFileSrc(path);
  return onDemand ? adhanStreamUrl(recording) : null;
}

/** The file native plays at prayer time: an APK asset, or a downloaded file's absolute path. Null when it isn't on the device. */
export function adhanNativeSource(recording: AdhanRecording): string | null {
  if (!onDemand || isAdhanBundled(recording.id)) return `public/${playableAudioPath(recording.path)}`;
  return files.get(recording.id) ?? null;
}

export async function downloadAdhan(recording: AdhanRecording): Promise<void> {
  const { id } = recording;
  // A tap before the device's files are known must not fetch one that's already there.
  if (!isReady) await adhanDownloadsReady();
  const entry = manifestFiles[id];
  if (!adhanDownloadsOffered() || !entry || isAdhanBundled(id) || files.has(id) || active.has(id)) return;
  failed.delete(id);
  active.set(id, 0);
  changed();
  try {
    const { path } = await native.download({ id, url: adhanStreamUrl(recording), bytes: entry.bytes, sha256: entry.sha256 });
    files.set(id, path);
    active.delete(id);
    lost.delete(id);
    const kept = loadKept();
    kept.add(id);
    saveKept(kept);
    if (native.persisted) storageGuaranteed = await native.persisted().catch(() => false);
    changed();
    filesChanged();
  } catch (e) {
    active.delete(id);
    const message = e instanceof Error ? e.message : "";
    // Cancelling is the user's own choice, not a failure.
    if (message !== "cancelled") failed.set(id, FAILURES.includes(message) ? (message as AdhanDownloadFailure) : "unknown");
    changed();
  }
}

export async function cancelAdhanDownload(id: string): Promise<void> {
  await native.cancel({ id }).catch(() => {});
}

export async function removeAdhanDownload(id: string): Promise<void> {
  if (!files.has(id)) return;
  await native.remove({ id });
  files.delete(id);
  // The user's own choice: not something to report as missing later.
  const kept = loadKept();
  kept.delete(id);
  saveKept(kept);
  changed();
  filesChanged();
}

/**
 * Test seam: the Android app's mode with a fake native side, or with
 * [browser] the web app's. Null restores this build's own mode.
 */
export function setAdhanDownloadsForTesting(fake: AdhanDownloadsPlugin | null, browser = false): void {
  native = fake ?? ownBackend();
  onDemand = fake ? !browser : ownOnDemand();
  inBrowser = fake ? browser : !Capacitor.isNativePlatform();
  files.clear();
  active.clear();
  failed.clear();
  lost.clear();
  storageProblem = false;
  storageGuaranteed = true;
  fileListeners.clear();
  ready = null;
  isReady = false;
  version = 0;
}
