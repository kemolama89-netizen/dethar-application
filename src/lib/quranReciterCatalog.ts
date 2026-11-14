// Qur'an reciters added after this app version (public/audio/quran/catalog.json,
// written by scripts/audio/quran-audio-manifest.mjs and hosted with the web app).
// They can be offered, listened to and downloaded without an app update: each
// brings its name, style, own-voice basmala and every file's size and SHA-256.
//
//  - The last good catalog is kept (localStorage), so a reciter downloaded from
//    it stays known offline and across restarts.
//  - Nothing in it can replace a reciter this version already knows: those ids
//    are ignored here (src/data/quranReciters.ts stays authoritative for them).
//  - An entry that isn't complete — not every file the Qur'anic adhkar need, or
//    a malformed field — is left out whole, never half used.
//
// No import of the registry here (it imports this module): only types.
import type { QuranBasmala, QuranReciter, QuranReciterStyle } from "../data/quranReciters";

export interface QuranAudioFileEntry {
  bytes: number;
  sha256: string;
}

export interface QuranCatalogReciter {
  reciter: QuranReciter;
  files: Readonly<Record<string, QuranAudioFileEntry>>;
}

const KEY = "dithar:quran-reciter-catalog:v1";
const ID = /^[a-z0-9-]{1,48}$/;
const FILE = /^(\d{6}|basmala)\.mp3$/;
const SHA = /^[0-9a-f]{64}$/;

const isName = (v: unknown): v is { ar: string; en: string } => !!v && typeof (v as { ar?: unknown }).ar === "string" && typeof (v as { en?: unknown }).en === "string" && !!(v as { ar: string }).ar && !!(v as { en: string }).en;
const isStyle = (v: unknown): v is QuranReciterStyle => v === "murattal" || v === "mujawwad";

function parseBasmala(v: unknown): QuranBasmala | null {
  const b = v as { kind?: unknown; source?: unknown; from?: unknown; ayahStartsAt?: unknown } | null;
  if (!b) return null;
  if (b.kind === "none") return { kind: "none" };
  if (b.kind === "separate" && b.source === "1:1") return { kind: "separate", source: "1:1" };
  if (b.kind === "separate" && b.source === "27:30" && typeof b.from === "number" && b.from >= 0) return { kind: "separate", source: "27:30", from: b.from };
  if (b.kind === "in-first-ayah" && b.ayahStartsAt && typeof b.ayahStartsAt === "object") {
    const starts: Record<number, number> = {};
    for (const [k, s] of Object.entries(b.ayahStartsAt as Record<string, unknown>)) {
      if (!/^\d{1,3}$/.test(k) || typeof s !== "number" || s < 0) return null;
      starts[Number(k)] = s;
    }
    return { kind: "in-first-ayah", ayahStartsAt: starts };
  }
  return null;
}

function parseFiles(v: unknown): Record<string, QuranAudioFileEntry> | null {
  if (!v || typeof v !== "object") return null;
  const files: Record<string, QuranAudioFileEntry> = {};
  for (const [name, f] of Object.entries(v as Record<string, unknown>)) {
    const e = f as { bytes?: unknown; sha256?: unknown } | null;
    if (!FILE.test(name) || !e || !Number.isInteger(e.bytes) || (e.bytes as number) <= 0 || typeof e.sha256 !== "string" || !SHA.test(e.sha256)) return null;
    files[name] = { bytes: e.bytes as number, sha256: e.sha256 };
  }
  return files;
}

/**
 * The catalog's usable reciters: well formed, unknown to this version, and with
 * every file in [required] (plus basmala.mp3 when its basmala is voiced).
 */
export function parseQuranCatalog(raw: unknown, knownIds: ReadonlySet<string>, required: readonly string[]): QuranCatalogReciter[] {
  const value = raw as { v?: unknown; reciters?: unknown } | null;
  if (!value || value.v !== 1 || !Array.isArray(value.reciters)) return [];
  const out: QuranCatalogReciter[] = [];
  const seen = new Set<string>();
  for (const entry of value.reciters as Record<string, unknown>[]) {
    const id = entry?.id;
    if (typeof id !== "string" || !ID.test(id) || knownIds.has(id) || seen.has(id)) continue;
    const basmala = parseBasmala(entry.basmala);
    const files = parseFiles(entry.files);
    if (!isName(entry.name) || !isStyle(entry.style) || !basmala || !files) continue;
    const needed = basmala.kind === "none" ? required : [...required, "basmala.mp3"];
    if (needed.some((f) => !files[f])) continue;
    seen.add(id);
    out.push({ reciter: { id, name: { ar: entry.name.ar, en: entry.name.en }, style: entry.style, audio: { kind: "bundled", everyAyahFolder: "", basmala }, available: true }, files });
  }
  return out;
}

let cached: QuranCatalogReciter[] | null = null;
let cachedFor = "";

/** The last good catalog's reciters (validated against [knownIds] and [required]). Empty when there is none. */
export function catalogReciters(knownIds: ReadonlySet<string>, required: readonly string[]): QuranCatalogReciter[] {
  let raw: string | null = null;
  try {
    raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  const key = raw ?? "";
  if (cached && cachedFor === key) return cached;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  cached = parseQuranCatalog(parsed, knownIds, required);
  cachedFor = key;
  return cached;
}

/**
 * Fetches the hosted catalog and keeps it when it is well formed. A failure keeps
 * the last good one (a download made from it must stay known). Returns whether it changed.
 */
export async function refreshQuranCatalog(url: string, fetcher: typeof fetch = (...a) => fetch(...a)): Promise<boolean> {
  let text: string;
  try {
    const res = await fetcher(url, { cache: "no-store" });
    if (!res.ok) return false;
    text = await res.text();
    const value = JSON.parse(text) as { v?: unknown; reciters?: unknown };
    if (value?.v !== 1 || !Array.isArray(value.reciters)) return false;
  } catch {
    return false;
  }
  try {
    if (localStorage.getItem(KEY) === text) return false;
    localStorage.setItem(KEY, text);
  } catch {
    return false;
  }
  return true;
}

/** Test seam. */
export function resetQuranCatalogForTesting(): void {
  cached = null;
  cachedFor = "";
}
