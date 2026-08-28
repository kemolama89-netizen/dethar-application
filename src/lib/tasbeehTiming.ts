import { dhikrItems } from "../data/tasbeeh";

// Word-count based pacing ("calm counting") for the Tasbih ("السبحة")
// screen. Tasbih phrases are short and repeated many times, so pacing here
// is tiered directly by word count. None of these numbers are ever shown
// to the user — no seconds, no countdown — they only decide when the
// pacing ring reaches READY and the next count is accepted.
//
// FINAL timing table (exact total circle durations, not adjustments on top
// of anything else):
//   1-2 words   -> 500ms
//   3-4 words   -> 750ms
//   5-9 words   -> 1750ms
//   10 words    -> 3250ms
//   11-14 words -> 4250ms
//   15+ words   -> 5750ms
function normalizeTasbeehWords(text: string): string[] {
  return text
    .replace(/[،؛؟!.,:;"'«»()]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function countTasbeehWords(text: string): number {
  return normalizeTasbeehWords(text).length;
}

function computeBaseTasbeehReadyDurationMs(text: string): number {
  const words = Math.max(1, countTasbeehWords(text));

  if (words <= 2) return 500;
  if (words <= 4) return 750;
  if (words <= 9) return 1750;
  if (words <= 10) return 3250;
  if (words <= 14) return 4250;
  return 5750;
}

// Absolute floor/fallback, independent of the table above — the last line
// of defense so a duration can never reach the ring/gate as 0, negative, or
// NaN even if `text` is something unexpected (e.g. not a string). The floor
// sits below the shortest real tier (500ms) so it never overrides an
// intentional result, only guards against a computation actually failing.
const ABSOLUTE_MIN_READY_MS = 300;
const FALLBACK_READY_DURATION_MS = 1000;

// ONE-OFF exception for this specific Dhikr only (id 6 in
// tasbeeh-library.json, "لا إله إلا الله وحده لا شريك له..."). Read
// directly from the actual data source (never a hand-retyped copy of the
// Arabic string, which risks a subtle character mismatch) so the match is
// always byte-exact. NOT a change to the general word-count table above,
// and it never affects any other Dhikr, even other 15+-word ones. Reduces
// its computed duration by exactly 1000ms, floored the same way as
// everything else so it can never go negative/invalid.
const SPECIAL_CASE_TEXT = dhikrItems.find((item) => item.id === 6)?.dhikr_ar ?? null;
const SPECIAL_CASE_REDUCTION_MS = 1000;

// The single entry point TasbeehScreen calls — both the pacing ring's
// visual sweep and the tap gate itself derive from this ONE value (see
// TasbeehScreen.tsx's readyDurationMs), so the countdown and the animation
// can never finish at different times.
export function computeTasbeehReadyDurationMs(text: string): number {
  try {
    let raw = computeBaseTasbeehReadyDurationMs(text);
    if (SPECIAL_CASE_TEXT !== null && text === SPECIAL_CASE_TEXT) {
      raw -= SPECIAL_CASE_REDUCTION_MS;
    }
    return Number.isFinite(raw) && raw > 0 ? Math.max(ABSOLUTE_MIN_READY_MS, raw) : FALLBACK_READY_DURATION_MS;
  } catch {
    return FALLBACK_READY_DURATION_MS;
  }
}
