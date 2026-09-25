// Audio Adhkar ("الأذكار المسموعة") content.
//
// Holds NO dhikr content of its own — every item here is the SAME object
// the Written Adhkar section shows (same array references, same stable
// ids), so the two sections can never drift apart:
//
//   Morning  → writtenAdhkarItems.morning   (Written's Morning reader)
//   Evening  → writtenAdhkarItems.evening   (Written's Evening reader)
//   Various  → MISC_DUAS, per Misc category (Written's "Various" tile opens
//              the Misc Library — see App.tsx — not writtenAdhkarItems.misc)
//
// Prayer Adhkar are deliberately not part of Audio Adhkar.
import { writtenAdhkarItems } from "./written-adhkar";
import type { WrittenAdhkarItem } from "./written-adhkar";
import { MISC_CATEGORY_ORDER, MISC_DUAS } from "./misc-library";
import type { MiscCategoryKey, MiscDuaItem } from "./misc-library";

export type AudioAdhkarCategoryKey = "morning" | "evening" | "misc";

export const AUDIO_ADHKAR_CATEGORY_ORDER: readonly AudioAdhkarCategoryKey[] = ["morning", "evening", "misc"];

export const audioAdhkarItems: Readonly<Record<"morning" | "evening", readonly WrittenAdhkarItem[]>> = {
  morning: writtenAdhkarItems.morning,
  evening: writtenAdhkarItems.evening,
};

// Same order the Misc Library's category grid shows (MiscLibraryScreen):
// MISC_CATEGORY_ORDER, with "authenticRare" always rendered last.
export const AUDIO_MISC_CATEGORY_ORDER: readonly MiscCategoryKey[] = [
  ...MISC_CATEGORY_ORDER.filter((key) => key !== "authenticRare"),
  "authenticRare",
];

/** A Misc category's items — the same filter MiscCategoryScreen uses. */
export function audioMiscItems(key: MiscCategoryKey): MiscDuaItem[] {
  return MISC_DUAS.filter((item) => item.categories.includes(key));
}

// Lives with the player (which needs it) so the player and the scheduler
// don't pull this module — and the Misc Library dataset — into their chunks.
export { audioRepetitionTotal } from "../lib/audioAdhkarPlayer";
