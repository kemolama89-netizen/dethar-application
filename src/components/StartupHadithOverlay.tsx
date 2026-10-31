import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "../theme/LanguageContext";
import { STARTUP_HADITH, STARTUP_HADITH_REVIEW_ID } from "../data/startupHadith";
import { auditShowsEnglish } from "../lib/religiousAudit";
import {
  FADE_MS,
  FONT_WAIT_MS,
  MAX_VISIBLE_MS,
  MIN_VISIBLE_MS,
  fadeOutLaunchCover,
  launchLogoShowing,
  markStartupOverlayShown,
  onStartupOverlayDismiss,
  removeLaunchCover,
  startupIntroWillShow,
  whenLaunchLogoDone,
} from "../lib/startupOverlay";

// DITHAR's launch intro: an authentic Hadith on the virtue of remembering
// Allah (Jami' at-Tirmidhi 3377 — data/startupHadith.ts), shown full screen
// between the DITHAR logo and the Home Screen.
//
//  - On a fresh launch the logo comes first: index.html's static cover shows
//    it before any bundle has loaded, for LOGO_VISIBLE_MS from its first
//    frame (lib/startupOverlay.ts). Meanwhile the intro waits beneath it and
//    the Home Screen mounts beneath both, so the app's loading is done while
//    the logo shows instead of after it. Then the logo fades to the Hadith.
//
//  - It is the first thing React paints (imported eagerly, opaque), and it
//    takes over from index.html's static cover of the same colour, which
//    itself follows the native launch screen — all in DITHAR's page colour
//    (--color-bg), so nothing flashes in between, the Home Screen is never
//    seen behind or before it, and the final fade has no colour jump.
//  - Its text appears once the Arabic display font is ready (at most
//    FONT_WAIT_MS), so it never reflows while read. Once that text is on
//    screen — or, with the launch logo, once the intro is painted beneath
//    the logo — App mounts the Home Screen underneath (onShown): it loads
//    while the logo or the Hadith is on screen, never in their first frames.
//  - Its timing starts once it has actually been painted (a slow WebView
//    can't use its time up unseen). It stays MIN_VISIBLE_MS once its text shows and leaves as soon as the
//    app has painted after that; never longer than MAX_VISIBLE_MS. A tap
//    ends it at once, and so does a reminder opened from the widget or a
//    notification (dismissStartupOverlay).
//  - Once per launch (lib/startupOverlay.ts); only while its review status is
//    "approved" (lib/contentReview.ts — read without importing it, so the
//    content library stays out of the startup bundle). With reduced motion
//    it doesn't fade.

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves when the Arabic display font is ready, or after [ms] — whichever comes first. */
function whenFontReady(ms: number): Promise<void> {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts || typeof fonts.load !== "function") return Promise.resolve();
  return Promise.race([
    fonts.load('400 20px "Amiri"', "ذكر").then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
  ]);
}

/** Runs [fn] once the intro has really been painted (two frames), so a slow WebView can't use up its time unseen. */
function afterFirstPaint(fn: () => void): () => void {
  if (typeof window.requestAnimationFrame !== "function") {
    const t = window.setTimeout(fn, 0);
    return () => window.clearTimeout(t);
  }
  let second = 0;
  const first = window.requestAnimationFrame(() => {
    second = window.requestAnimationFrame(fn);
  });
  return () => {
    window.cancelAnimationFrame(first);
    window.cancelAnimationFrame(second);
  };
}

/**
 * [onShown]: the intro's text is on screen (or the intro isn't showing) — App
 * mounts the Home Screen underneath only then, so the two never compete for
 * the first frames and the intro is really seen.
 */
export function StartupHadithOverlay({ appReady, onShown }: { appReady: boolean; onShown?: () => void }) {
  const { language } = useLanguage();
  const [state, setState] = useState<"hidden" | "visible" | "leaving">(() => (startupIntroWillShow() ? "visible" : "hidden"));
  const [textReady, setTextReady] = useState(false);
  const onShownRef = useRef(onShown);
  useLayoutEffect(() => {
    onShownRef.current = onShown;
  }, [onShown]);
  const [minElapsed, setMinElapsed] = useState(false);
  // The launch logo (index.html) is still on screen above it: its own time hasn't started.
  const [logoDone, setLogoDone] = useState(() => !launchLogoShowing());
  // The intro is over and the app is ready: it leaves now.
  const phase = state === "visible" && minElapsed && appReady ? "leaving" : state;

  // Without the launch logo, the intro (or, when it isn't shown, the Home Screen) now covers the
  // screen: the static cover can go. With it, the cover fades out once the logo has had its time.
  useLayoutEffect(() => {
    if (!launchLogoShowing()) return removeLaunchCover();
    return whenLaunchLogoDone(() => {
      fadeOutLaunchCover();
      setLogoDone(true);
    });
  }, []);

  useEffect(() => {
    if (state !== "visible") return;
    markStartupOverlayShown();
    const stop = onStartupOverlayDismiss(() => setState("leaving"));
    let cancelled = false;
    // The text waits for the Arabic display font (at most FONT_WAIT_MS) — beneath the logo when there
    // is one, so the Hadith is already complete the moment the logo leaves and its 4 seconds are all reading time.
    const fontReady = whenFontReady(FONT_WAIT_MS);
    if (!logoDone) {
      void fontReady.then(() => {
        if (!cancelled) setTextReady(true);
      });
      // Beneath the logo: the Home Screen loads now, once the intro itself is painted.
      const cancelPaint = afterFirstPaint(() => onShownRef.current?.());
      return () => {
        cancelled = true;
        cancelPaint();
        stop();
      };
    }
    let min: number | undefined;
    let max: number | undefined;
    // Its time starts when it is on screen, not when React mounted it.
    let cancelTextPaint = () => {};
    const cancelPaint = afterFirstPaint(() => {
      max = window.setTimeout(() => setState("leaving"), MAX_VISIBLE_MS);
      void fontReady.then(() => {
        if (cancelled) return;
        setTextReady(true);
        // Counted from the frame that shows the text, not from when it was asked for.
        cancelTextPaint = afterFirstPaint(() => {
          onShownRef.current?.();
          min = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelPaint();
      cancelTextPaint();
      window.clearTimeout(min);
      window.clearTimeout(max);
      stop();
    };
  }, [state, logoDone]);

  // Not showing (already shown, not approved) or ended early: the Home Screen must not wait for it.
  useEffect(() => {
    if (phase !== "visible") onShownRef.current?.();
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const done = window.setTimeout(() => setState("hidden"), prefersReducedMotion() ? 0 : FADE_MS);
    return () => window.clearTimeout(done);
  }, [phase]);

  if (phase === "hidden") return null;
  const isEn = language === "en";
  return (
    <div
      className={`dithar-startup-intro fixed inset-0 z-[95] flex flex-col items-center justify-center px-7 ${phase === "leaving" ? "is-leaving" : ""} ${textReady ? "is-text-ready" : ""}`}
      style={{ background: "var(--launch-bg, var(--color-bg))", color: "var(--color-text-primary)" }}
      data-startup-overlay={phase}
      role="dialog"
      aria-label={isEn ? "DITHAR" : "دِثار"}
      onClick={() => setState("leaving")}
    >
      <div className="dithar-startup-intro__text w-full max-w-[26rem] text-center">
        <span aria-hidden="true" className="mx-auto mb-6 block h-px w-10" style={{ background: "var(--color-gold)" }} />
        <p dir="rtl" lang="ar" className="text-[19px] leading-[2.05]" style={{ fontFamily: "var(--font-display)" }} data-startup-text="">
          {STARTUP_HADITH.quoteAr}
        </p>
        {/* Its English is a DITHAR rendering, not a credited published translation (lib/religiousAudit.ts). */}
        {isEn && auditShowsEnglish(STARTUP_HADITH_REVIEW_ID) && (
          <p dir="ltr" lang="en" className="mt-4 text-[13px] italic leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {STARTUP_HADITH.meaningEn}
          </p>
        )}
        <p className="mt-5 text-[11.5px] leading-relaxed" style={{ color: "var(--color-text-muted)" }} data-startup-source="">
          {isEn ? `${STARTUP_HADITH.referenceEn} — ${STARTUP_HADITH.gradeEn}` : `${STARTUP_HADITH.referenceAr} — ${STARTUP_HADITH.gradeAr} (${STARTUP_HADITH.gradingSourceAr})`}
        </p>
        <span aria-hidden="true" className="mx-auto mt-6 block h-px w-10" style={{ background: "var(--color-gold)" }} />
      </div>
    </div>
  );
}
