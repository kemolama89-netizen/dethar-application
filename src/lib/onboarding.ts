// The first-time tour (components/OnboardingTour.tsx): shown once, automatically, to a NEW install —
// someone who already used DITHAR before this version isn't interrupted by it — and replayable from
// Settings. Plus the one-line hints shown the first time a section is entered (FirstVisitHint).
//
// Whether this is an existing user is read once, as the app starts — before the app records anything
// of its own (its installation day, statistics, a reading position) — and kept.

const STATE_KEY = "dithar:onboarding:v1";
const HINTS_KEY = "dithar:onboarding:hints:v1";
/** What an earlier version leaves behind: any of these means DITHAR was already in use. */
const EXISTING_USER_KEYS = ["dithar:daily-content:install-anchor:v1", "dithar:stats:events:v1", "dithar:quran:position:v1"];

export type OnboardingState = "pending" | "finished" | "skipped" | "existing-user";

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
    // Without storage the tour may show again: never an error.
  }
}

/** Decided at the app's start (module load): an install from before this version is an existing user. */
const startedAsExistingUser = EXISTING_USER_KEYS.some((k) => read(k) !== null);

export function loadOnboardingState(): OnboardingState {
  const v = read(STATE_KEY);
  if (v === "finished" || v === "skipped" || v === "existing-user") return v;
  return startedAsExistingUser ? "existing-user" : "pending";
}

/** Whether the tour should open by itself on this launch: a new install that hasn't seen it. */
export function shouldAutoShowTour(): boolean {
  return loadOnboardingState() === "pending";
}

export function saveOnboardingState(state: Exclude<OnboardingState, "pending">): void {
  write(STATE_KEY, state);
}

// ---- replay from Settings ---------------------------------------------------------

const replayListeners = new Set<() => void>();

/** Settings → «جولة في التطبيق»: the tour opens again on Home, and its section hints show again. */
export function requestTourReplay(): void {
  write(HINTS_KEY, "[]");
  for (const l of [...replayListeners]) l();
}

export function subscribeTourReplay(listener: () => void): () => void {
  replayListeners.add(listener);
  return () => replayListeners.delete(listener);
}

// ---- first-visit hints ----------------------------------------------------------------

function seenHints(): string[] {
  try {
    const v: unknown = JSON.parse(read(HINTS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** A section's one-line hint shows on its first visit — for those the tour was meant for (not existing users). */
export function shouldShowHint(id: string): boolean {
  return loadOnboardingState() !== "existing-user" && !seenHints().includes(id);
}

export function markHintSeen(id: string): void {
  const seen = seenHints();
  if (!seen.includes(id)) write(HINTS_KEY, JSON.stringify([...seen, id]));
}
