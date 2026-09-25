// DITHAR — audio for Morning & Evening Adhkar.
//
// Each written item decides its own audio source, by stable id — never by
// its position in the list:
//
//   item has quranRef?  ── yes ─→ Quran audio via the SELECTED reciter
//          │                     (quranAudio.ts, "quran" channel)
//          no
//          ↓
//   generated file for the item's audioId  ("adhkar" channel)
//
// displayText vs spokenText: the written `text_ar` is the source of truth
// and is what the UI shows, unchanged. Generated audio speaks `spokenText`
// (see getSpokenText) — the same words minus only the counter instruction.
//
// audioId (see data/morningEveningAudio.ts): a dhikr id whose Morning and
// Evening spoken text is exactly identical gets ONE shared file; otherwise
// each category gets its own. Sharing is decided by exact string equality
// of spokenText, never by meaning.
//
// Adding a Morning/Evening dhikr later needs only: its data entry (new
// stable id + text, in written-adhkar.ts / dithar-adhkar-cards.json), and —
// for non-Quran content — its generated file plus a manifest entry. Nothing
// here or in the audio engine changes.
import type { QuranReciter } from "../data/quranReciters";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { GENERATED_MORNING_EVENING_AUDIO_IDS } from "../data/morningEveningAudio";
import type { MorningEveningCategory } from "../data/morningEveningAudio";
import type { QuranRef } from "./quranRef";
import { playQuranRef, quranAudioKey, resolveQuranAudio } from "./quranAudio";
import { playUrlQueue } from "./audioEngine";
import type { PlayUrlQueueOptions } from "./audioEngine";

export type { MorningEveningCategory };

export type MorningEveningLists = Readonly<Record<MorningEveningCategory, readonly WrittenAdhkarItem[]>>;

const CATEGORIES: readonly MorningEveningCategory[] = ["morning", "evening"];

// ---------------------------------------------------------------------
// Spoken text
// ---------------------------------------------------------------------

// Arabic diacritics/tatweel — ignored ONLY when recognizing the word
// "مرة"/"مرات" inside a counter instruction; never removed from any text.
const DIACRITICS_RE = /[ؐ-ًؚ-ٰٟـ]/g;

// A single parenthetical at the very end of the text (optionally followed
// by a period), e.g. " (ثلاثَ مرَّاتٍ)." — only a CANDIDATE: it is removed
// only if it names a repetition count (contains مرة / مرات).
const TRAILING_PARENTHETICAL_RE = /\s*\(([^()]*)\)[\s.]*$/;
const COUNT_WORD_RE = /مر(?:ة|ات)/;

// The written adhkar wrap the dhikr's own words in (( … )) quotation
// delimiters — punctuation, not words.
const QUOTED_RE = /^\(\(([\s\S]*)\)\)[\s.]*$/;

/**
 * The words generated audio should speak for a written dhikr:
 *   1. drop one trailing "( … مرة/مرات … )" counter instruction (the app's
 *      counter handles repetition — the audio is the dhikr said once);
 *   2. drop the surrounding "(( … ))" quotation delimiters.
 * Nothing else changes: no letters, diacritics, words or inner punctuation
 * of the dhikr itself are touched, so the result is always a verbatim
 * substring of the display text.
 */
export function getSpokenText(displayText: string): string {
  let text = displayText.trim();
  const trailing = text.match(TRAILING_PARENTHETICAL_RE);
  if (trailing && COUNT_WORD_RE.test(trailing[1].replace(DIACRITICS_RE, ""))) {
    text = text.slice(0, trailing.index).trim();
  }
  const quoted = text.match(QUOTED_RE);
  if (quoted) text = quoted[1].trim();
  return text;
}

// ---------------------------------------------------------------------
// Audio identity
// ---------------------------------------------------------------------

// Ids become file names, so they are restricted to a filename-safe set;
// every current id already matches (see morningEveningAudio.test.ts).
const SAFE_ID_RE = /^[a-z0-9_]+$/;

export function isAudioSafeDhikrId(id: string): boolean {
  return SAFE_ID_RE.test(id);
}

/** Deterministic path, relative to the app's base URL. */
export function generatedAdhkarAudioPath(audioId: string): string {
  return `audio/adhkar/${audioId}.mp3`;
}

export interface AdhkarAudioAsset {
  /** "shared/{dhikrId}", "morning/{dhikrId}" or "evening/{dhikrId}". */
  audioId: string;
  /** Where the generated file goes, under public/. */
  path: string;
  /** Exactly what the generated audio must say — see getSpokenText. */
  spokenText: string;
  /** The written items this one file serves. */
  usedBy: { category: MorningEveningCategory; dhikrId: string }[];
}

interface AudioIndex {
  assets: AdhkarAudioAsset[];
  audioIdByItem: Map<string, string>;
}

const itemKey = (category: MorningEveningCategory, id: string) => `${category}:${id}`;

function buildAudioIndex(lists: MorningEveningLists): AudioIndex {
  const spoken = new Map<string, string>();
  for (const category of CATEGORIES) {
    for (const item of lists[category]) {
      if (item.quranRef) continue;
      if (!isAudioSafeDhikrId(item.id)) throw new Error(`Unsafe dhikr id for an audio file name: "${item.id}"`);
      spoken.set(itemKey(category, item.id), getSpokenText(item.text_ar));
    }
  }

  const assets = new Map<string, AdhkarAudioAsset>();
  const audioIdByItem = new Map<string, string>();
  for (const category of CATEGORIES) {
    const other: MorningEveningCategory = category === "morning" ? "evening" : "morning";
    for (const item of lists[category]) {
      const text = spoken.get(itemKey(category, item.id));
      if (text === undefined) continue;
      const shared = spoken.get(itemKey(other, item.id)) === text;
      const audioId = `${shared ? "shared" : category}/${item.id}`;
      audioIdByItem.set(itemKey(category, item.id), audioId);
      const asset = assets.get(audioId);
      if (asset) asset.usedBy.push({ category, dhikrId: item.id });
      else assets.set(audioId, { audioId, path: generatedAdhkarAudioPath(audioId), spokenText: text, usedBy: [{ category, dhikrId: item.id }] });
    }
  }
  return { assets: [...assets.values()], audioIdByItem };
}

let defaultIndex: AudioIndex | undefined;
function indexFor(lists: MorningEveningLists): AudioIndex {
  if (lists !== writtenAdhkarItems) return buildAudioIndex(lists);
  defaultIndex ??= buildAudioIndex(lists);
  return defaultIndex;
}

/** Every generated audio file Morning/Evening needs, with its exact spoken text — the generation workflow's input. */
export function getMorningEveningAudioAssets(lists: MorningEveningLists = writtenAdhkarItems): AdhkarAudioAsset[] {
  return indexFor(lists).assets;
}

export type MorningEveningAudioSource =
  | { kind: "quran"; ref: QuranRef }
  | { kind: "generated"; audioId: string; path: string };

export function getMorningEveningAudioSource(
  category: MorningEveningCategory,
  item: WrittenAdhkarItem,
  lists: MorningEveningLists = writtenAdhkarItems,
): MorningEveningAudioSource | undefined {
  if (item.quranRef) return { kind: "quran", ref: item.quranRef };
  const audioId = indexFor(lists).audioIdByItem.get(itemKey(category, item.id));
  return audioId ? { kind: "generated", audioId, path: generatedAdhkarAudioPath(audioId) } : undefined;
}

// ---------------------------------------------------------------------
// Resolution + playback
// ---------------------------------------------------------------------

export type MorningEveningAudioResolution =
  | { status: "ready"; kind: "quran" | "generated"; key: string; urls: string[] }
  | { status: "unavailable"; kind: "quran"; reason: "reciter-unavailable" | "audio-source-not-configured" }
  | { status: "unavailable"; kind: "generated"; reason: "asset-not-generated" }
  | { status: "invalid-ref"; kind: "quran" }
  | { status: "unknown-item" };

export function resolveMorningEveningAudio(
  category: MorningEveningCategory,
  item: WrittenAdhkarItem,
  reciter: QuranReciter,
  options: { lists?: MorningEveningLists; generated?: readonly string[] } = {},
): MorningEveningAudioResolution {
  const source = getMorningEveningAudioSource(category, item, options.lists);
  if (!source) return { status: "unknown-item" };
  if (source.kind === "quran") {
    const res = resolveQuranAudio(source.ref, reciter);
    if (res.status === "ready") return { status: "ready", kind: "quran", key: quranAudioKey(res.reciterId, res.ref), urls: res.urls };
    if (res.status === "unavailable") return { status: "unavailable", kind: "quran", reason: res.reason };
    return { status: "invalid-ref", kind: "quran" };
  }
  const generated = options.generated ?? GENERATED_MORNING_EVENING_AUDIO_IDS;
  if (!generated.includes(source.audioId)) return { status: "unavailable", kind: "generated", reason: "asset-not-generated" };
  return {
    status: "ready",
    kind: "generated",
    key: `adhkar:${source.audioId}`,
    urls: [`${import.meta.env.BASE_URL}${source.path}`],
  };
}

/**
 * Resolves and, when ready, plays through the shared audio engine —
 * Quranic items on the "quran" channel (so a reciter change stops them),
 * everything else on "adhkar". Only one audio source ever plays at a time.
 */
export function playMorningEveningAudio(
  category: MorningEveningCategory,
  item: WrittenAdhkarItem,
  reciter: QuranReciter,
  options?: PlayUrlQueueOptions,
): MorningEveningAudioResolution {
  const res = resolveMorningEveningAudio(category, item, reciter);
  if (res.status !== "ready") return res;
  if (res.kind === "quran") playQuranRef(item.quranRef, reciter, options);
  else playUrlQueue("adhkar", res.key, res.urls, options);
  return res;
}
