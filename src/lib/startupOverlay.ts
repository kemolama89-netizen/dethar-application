// Timing, publication and once-per-launch state for the launch intro with
// the startup Hadith (components/StartupHadithOverlay.tsx). Deliberately
// light: the intro is in the startup bundle, so nothing here imports the
// content library or the review store.
import { STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";
import { auditShowsArabic } from "./religiousAudit";

/** The intro stays at least this long once its text is shown — long enough to read the whole Hadith… */
export const MIN_VISIBLE_MS = 4_000;
/**
 * …and never longer than this from its first paint, whatever happens (a tap
 * ends it sooner). It leaves the room for the font wait and a slow Home
 * Screen paint after the minimum, without holding a ready app back.
 */
export const MAX_VISIBLE_MS = 5_500;
/**
 * On a fresh launch the DITHAR logo comes first (index.html's launch cover
 * shows it before any bundle has loaded): it stays this long from its first
 * frame on screen, while the app loads underneath, then fades to the Hadith.
 */
export const LOGO_VISIBLE_MS = 1_000;
/** Should the logo's first frame never be reported, it still leaves after this long. */
const LOGO_REPORT_WAIT_MS = LOGO_VISIBLE_MS + 2_000;
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
  // Only a narration that passed the religious-content audit (lib/religiousAudit.ts).
  if (!auditShowsArabic(STARTUP_HADITH_REVIEW_ID)) return false;
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
  removeLaunchCover(); // the launch logo too
  for (const listener of [...dismissListeners]) listener();
}

export function onStartupOverlayDismiss(listener: () => void): () => void {
  dismissListeners.add(listener);
  return () => dismissListeners.delete(listener);
}

/** The static cover in index.html that bridges the native launch screen and the first React paint. */
export function removeLaunchCover(): void {
  if (coverHolds > 0) {
    coverRemoval = "remove";
    return;
  }
  if (typeof document !== "undefined") document.getElementById("dithar-launch-cover")?.remove();
}

// While the launch cover is held (holdLaunchCover), asking to remove or fade
// it is remembered and done on release — so nothing beneath it (Home) is seen
// before what must come first (a reminder tapped in a notification or the
// widget) has painted.
let coverHolds = 0;
let coverRemoval: "remove" | "fade" | null = null;

export interface LaunchCoverHold {
  /** Done holding: a removal asked for meanwhile happens now; [removeNow] removes it now in any case. */
  release(removeNow?: boolean): void;
  /** Gives the hold up without acting on what was asked meanwhile (an effect's cleanup). */
  cancel(): void;
}

/**
 * Keeps index.html's launch cover on screen until released — at most
 * [maxMs], so a lost release can never leave it up.
 */
export function holdLaunchCover(maxMs = 3_000): LaunchCoverHold {
  coverHolds++;
  let open = true;
  const end = (apply: boolean, removeNow: boolean) => {
    if (!open) return;
    open = false;
    window.clearTimeout(timer);
    coverHolds--;
    if (!apply || coverHolds > 0) return;
    const how = removeNow ? "remove" : coverRemoval;
    coverRemoval = null;
    if (how === "remove") removeLaunchCover();
    else if (how === "fade") fadeOutLaunchCover();
  };
  const timer = window.setTimeout(() => end(true, true), maxMs);
  return { release: (removeNow = false) => end(true, removeNow), cancel: () => end(false, false) };
}

declare global {
  interface Window {
    /** When index.html's launch logo was first on screen (performance.now()); -Infinity when it failed to load. */
    __ditharLogoShownAt?: number;
  }
}

const launchCover = () => (typeof document !== "undefined" ? document.getElementById("dithar-launch-cover") : null);

/** Whether index.html's launch cover is showing the DITHAR logo (a fresh launch, not a reload). */
export function launchLogoShowing(): boolean {
  return !!launchCover()?.hasAttribute("data-logo");
}

/**
 * Calls [done] once the launch logo has been on screen LOGO_VISIBLE_MS — at
 * once when there is no logo. The time is counted from the logo's first
 * frame (reported by index.html), so a slow start can't use it up unseen,
 * and it is never added on top of the time the app took to load.
 */
export function whenLaunchLogoDone(done: () => void): () => void {
  if (!launchLogoShowing()) {
    done();
    return () => {};
  }
  let timer: number | undefined;
  const schedule = () => {
    window.clearTimeout(timer);
    const shownAt = window.__ditharLogoShownAt ?? performance.now();
    timer = window.setTimeout(done, Math.max(0, LOGO_VISIBLE_MS - (performance.now() - shownAt)));
  };
  if (window.__ditharLogoShownAt !== undefined) schedule();
  else timer = window.setTimeout(done, LOGO_REPORT_WAIT_MS);
  window.addEventListener("dithar-logo-shown", schedule);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("dithar-logo-shown", schedule);
  };
}

/** The launch logo's time is over: the cover fades out over what is beneath (the Hadith, or Home). */
export function fadeOutLaunchCover(): void {
  if (coverHolds > 0) {
    coverRemoval ??= "fade";
    return;
  }
  const cover = launchCover();
  if (!cover) return;
  const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return cover.remove();
  cover.style.transition = `opacity ${FADE_MS}ms ease-out`;
  cover.style.opacity = "0";
  cover.style.pointerEvents = "none";
  window.setTimeout(() => cover.remove(), FADE_MS);
}

/** Tests only: allow the intro again, as on a fresh launch. */
export function resetStartupOverlayForTesting(): void {
  shownThisLaunch = false;
  coverHolds = 0;
  coverRemoval = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
}
