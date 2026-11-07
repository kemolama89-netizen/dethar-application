// DITHAR's film (components/IntroFilm.tsx): watched on request, from Settings → «جولة داخل التطبيق».
// It never plays by itself — the first launch keeps its launch Hadith and the tour. Kept here: the
// viewer's sound choice, and the open / closed signals between Settings, App and the tour.

const MUTED_KEY = "dithar:intro-film:muted:v1";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Without storage the choice isn't remembered: never an error.
  }
}

/** Sound is off until someone turns it on (and then remembered for the next viewing). */
export function loadIntroMuted(): boolean {
  return read(MUTED_KEY) !== "0";
}
export function saveIntroMuted(muted: boolean): void {
  write(MUTED_KEY, muted ? "1" : "0");
}

// ---- opening from Settings, and closing ---------------------------------------------------

const closedListeners = new Set<() => void>();
/** The film has gone (finished or skipped): a tour waiting on Home may now open. */
export function notifyIntroClosed(): void {
  for (const l of [...closedListeners]) l();
}
export function subscribeIntroClosed(listener: () => void): () => void {
  closedListeners.add(listener);
  return () => closedListeners.delete(listener);
}

const replayListeners = new Set<() => void>();
/** Settings → «جولة داخل التطبيق» → the film: it opens over the current screen. */
export function requestIntroReplay(): void {
  for (const l of [...replayListeners]) l();
}
export function subscribeIntroReplay(listener: () => void): () => void {
  replayListeners.add(listener);
  return () => replayListeners.delete(listener);
}
