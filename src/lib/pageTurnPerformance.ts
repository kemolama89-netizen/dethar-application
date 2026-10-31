// Whether this device draws the Qur'an reader's page turn smoothly
// (components/QuranReaderScreen.tsx PageTurn). A frame of the turn slower
// than SLOW_FRAME_MS, SLOW_FRAMES times in one turn, means it can't (e.g. no
// GPU); the frame the turn begins on isn't counted, since drawing the two
// pages the first time may take a moment on any device. That turn then ends
// at once, and for the rest of the session pages simply change — the
// lightweight fallback. Kept in memory only: a later session tries again.
export const SLOW_FRAME_MS = 150;
export const SLOW_FRAMES = 2;

let tooSlow = false;

export function pageTurnTooSlow(): boolean {
  return tooSlow;
}

export function markPageTurnTooSlow(): void {
  tooSlow = true;
}

/** Tests only. */
export function resetPageTurnPerformanceForTesting(): void {
  tooSlow = false;
}
