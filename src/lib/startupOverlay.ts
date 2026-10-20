// Timing, publication and once-per-launch state for the launch intro with
// the startup Hadith (components/StartupHadithOverlay.tsx). Deliberately
// light: the intro is in the startup bundle, so nothing here imports the
// content library or the review store.
import { STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";

/** The intro stays at least this long once its text is shown — long enough to read the whole Hadith… */
export const MIN_VISIBLE_MS = 5_000;
/**
 * …and never longer than this from its first paint, whatever happens (a tap
 * ends it sooner). It leaves the room for the font wait and a slow Home
 * Screen paint after the minimum, without holding a ready app back.
 */
export const MAX_VISIBLE_MS = 6_500;
/** Its text waits at most this long for the Arabic display font, so it never reflows while visible. */
export const FONT_WAIT_MS = 400;
export const FADE_MS = 450;

const SESSION_KEY = "dithar:startup-intro-shown";
/** lib/contentReview.ts CONTENT_REVIEW_KEY (startupOverlay.test.ts keeps them equal). */
const REVIEW_KEY = "dithar:content-review:v1";
const STATUSES = ["pending", "verified", "needs-verification", "needs-editing", "approved", "rejected"];

/**
 * Whether the intro's Hadith is published — the same answer as
 * contentReview.isPublished(STARTUP_HADITH_REVIEW_ID) (approved by default;
 * a saved review decision wins), read straight from storage.
 */
export function startupHadithPublished(): boolean {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(REVIEW_KEY) : null;
    const status: unknown = raw ? (JSON.parse(raw) as Record<string, { status?: unknown } | null>)?.[STARTUP_HADITH_REVIEW_ID]?.status : undefined;
    return typeof status === "string" && STATUSES.includes(status) ? status === "approved" : true;
  } catch {
    return true;
  }
}

let shownThisLaunch = false;

/** Whether the intro will show on this render (read once by App and the intro, before either marks it shown). */
export function startupIntroWillShow(): boolean {
  return startupHadithPublished() && !startupOverlayShown();
}

/**
 * Whether it was already shown in this app launch. Kept in memory AND in
 * sessionStorage, so a WebView reload inside the same launch doesn't show it
 * twice; a fresh launch (new app process) starts with an empty session.
 */
export function startupOverlayShown(): boolean {
  if (shownThisLaunch) return true;
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records that it was shown (from an effect — safe under StrictMode's double render). */
export function markStartupOverlayShown(): void {
  shownThisLaunch = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Memory only: still once for this page.
  }
}

const dismissListeners = new Set<() => void>();

/** Ends the intro now — e.g. a reminder opened from the widget or a notification should be seen at once. */
export function dismissStartupOverlay(): void {
  for (const listener of [...dismissListeners]) listener();
}

export function onStartupOverlayDismiss(listener: () => void): () => void {
  dismissListeners.add(listener);
  return () => dismissListeners.delete(listener);
}

/** The static cover in index.html that bridges the native launch screen and the first React paint. */
export function removeLaunchCover(): void {
  if (typeof document !== "undefined") document.getElementById("dithar-launch-cover")?.remove();
}

/** Tests only: allow the intro again, as on a fresh launch. */
export function resetStartupOverlayForTesting(): void {
  shownThisLaunch = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
}
