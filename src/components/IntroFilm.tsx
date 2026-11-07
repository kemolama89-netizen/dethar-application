import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { introFilmLabels } from "../data/introFilmLabels";
import type { IntroSceneId } from "../data/introFilmLabels";
import { prayerNames } from "../data/content";
import { FeatureScene } from "./IntroFilmScenes";
import { PAGE_TURN_AT, SCENE_SOUNDS, SCENES } from "../data/introFilmTimeline";
import { IntroFilmSound } from "../lib/introFilmSound";
import { shotVars } from "../data/introFilmShots";
import { playPageTurnSound, preparePageTurnSound } from "../lib/pageTurnSound";
import { useBackDismiss } from "../lib/backOverlays";
import { loadIntroMuted, saveIntroMuted } from "../lib/introFilm";
import { fadeOutLaunchCover, launchLogoShowing, markStartupOverlayShown, onStartupOverlayDismiss, removeLaunchCover, whenLaunchLogoDone } from "../lib/startupOverlay";
import "./introFilm.css";

/**
 * DITHAR's first-launch introduction («الخيط الذهبي»): sixteen short scenes, about 68 seconds — the
 * identity, prayer, the Mushaf, then the app's features one by one as miniatures of their real screens
 * (IntroFilmScenes.tsx), and a closing where the thread weaves the cover (دِثار) around the logo — tied
 * together by one gold thread that draws each scene and leads into the next. Then Home.
 *
 * Built from the app's own parts (its tokens, so it follows the current look; the emblem and logo; the
 * printed Mushaf page the reader shows; real labels) — no video file. Every motion is CSS on transform,
 * opacity or a stroke's dash, one scene (plus the one leaving) mounted at a time, and the only timer is
 * one per scene; nothing repeats forever. Pausing stops both, and it pauses itself when the app is hidden.
 * Sound is off until asked for; then each scene has its own (lib/introFilmSound.ts): the app's recordings
 * of the adhan, the Basmala and the adhkar, the page turn, and soft touches — never music. Skip, Back and «ابدأ» end
 * it; with reduced motion, nothing draws or moves — the scenes only cross-fade.
 */

const CROSSFADE_MS = 500;
const LEAVE_MS = 600;

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const EMBLEM = asset("logos/dithar_emblem.png");
const LOGO = { ar: asset("logos/dithar_male_ar.png") };
const MUSHAF_PAGE = asset("mushaf/hafs-kfqc-opening/composed/001.svg");
const MUSHAF_PAGE_2 = asset("mushaf/hafs-kfqc-opening/composed/002.svg");

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Runs [fn] once the film has really been painted (two frames). */
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

/** The thread: a soft wide stroke under a fine one, drawn in, then unwound toward the next scene. */
function Thread({ d, draw = 2.2, delay = 0, out = true, sceneMs, fade }: { d: string; draw?: number; delay?: number; out?: boolean; sceneMs: number; fade?: number }) {
  const style = {
    "--draw": `${draw}s`,
    "--delay": `${delay}s`,
    "--out-at": `${sceneMs / 1000 - 1.1}s`,
    "--fade-at": fade !== undefined ? `${fade}s` : undefined,
  } as CSSProperties;
  const cls = `intro-thread ${out ? "is-unwinding" : ""} ${fade !== undefined ? "is-fading" : ""}`;
  return (
    <g className={cls} style={style}>
      <path d={d} pathLength={1} className="intro-thread__glow" />
      <path d={d} pathLength={1} className="intro-thread__line" />
    </g>
  );
}

/** One scene's stage: the thread (mirrored for left-to-right reading) under the scene's own content. */
function Stage({ children, thread, dir }: { children?: React.ReactNode; thread: React.ReactNode; dir: "rtl" | "ltr" }) {
  return (
    <div className="intro-stage">
      <svg className="intro-stage__svg" viewBox="0 0 300 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={dir === "ltr" ? { transform: "scaleX(-1)" } : undefined}>
        {thread}
      </svg>
      {children}
    </div>
  );
}

// The sun's path for the prayer scene: a quadratic arc, Fajr where the line starts (the reading side).
const ARC = { p0: [270, 235], p1: [150, -10], p2: [30, 235] } as const;
// The sun's day: Fajr before it rises, Dhuhr at the top, Asr on the way down, Maghrib at the horizon, Isha after.
const PRAYER_T = [0.06, 0.5, 0.72, 0.92, 1.12];
function arcPoint(t: number): [number, number] {
  const u = 1 - t;
  return [u * u * ARC.p0[0] + 2 * u * t * ARC.p1[0] + t * t * ARC.p2[0], u * u * ARC.p0[1] + 2 * u * t * ARC.p1[1] + t * t * ARC.p2[1]];
}
const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const NEXT = 2; // the light settles on the next prayer: an example, not your time

function SceneContent({ id, ms, language, dir }: { id: IntroSceneId; ms: number; language: "ar" | "en"; dir: "rtl" | "ltr" }) {
  const t = introFilmLabels[language];
  const x = (v: number) => `${((dir === "rtl" ? v : 300 - v) / 300) * 100}%`;
  const y = (v: number) => `${(v / 360) * 100}%`;
  if (id === "opening") {
    return (
      <Stage
        dir={dir}
        thread={<Thread sceneMs={ms} d="M340,300 C300,300 228,300 228,276 L228,150 C228,100 194,66 150,44 C106,66 72,100 72,150 L72,276 C72,300 0,300 -40,300" />}
      >
        <div className="intro-light intro-fade" style={{ left: "50%", top: y(158), "--d": "1.1s" } as CSSProperties} />
        <img src={EMBLEM} alt="" className="intro-emblem intro-rise" style={{ top: y(158), "--d": "1.4s" } as CSSProperties} draggable={false} />
        {/* The brand name under the emblem (the emblem itself untouched), then the tagline beneath the stage. */}
        <span className="intro-brand intro-rise" lang="en" dir="ltr" style={{ top: y(250), "--d": "1.9s" } as CSSProperties}>
          {t.brand}
        </span>
      </Stage>
    );
  }
  if (id === "prayer") {
    return (
      <Stage dir={dir} thread={<Thread sceneMs={ms} draw={2} d={`M340,235 L270,235 Q150,-10 30,235 L-40,235`} />}>
        {PRAYERS.map((key, i) => {
          // Isha lies past the arc, on the line it leads out along.
          const past = PRAYER_T[i] > 1;
          const [px, py] = past ? [ARC.p2[0] - 12, ARC.p2[1]] : arcPoint(PRAYER_T[i]);
          // On the arc's sides, the name stands a little outward, clear of the line.
          const sx = dir === "rtl" ? px : 300 - px;
          const nudge = past ? 0 : sx > 170 ? 1 : sx < 130 ? -1 : 0; // on the flat line, straight above
          const state = i < NEXT ? "past" : i === NEXT ? "next" : "later";
          return (
            <div key={key} className={`intro-prayer is-${state}`} style={{ left: x(px), top: y(py), "--d": `${1.2 + i * 0.22}s`, "--nx": `${nudge * 18}px` } as CSSProperties}>
              <span className="intro-prayer__dot" aria-hidden="true" />
              <span className="intro-prayer__name">{prayerNames[language][key]}</span>
            </div>
          );
        })}
        <div className="intro-next intro-rise" style={{ top: y(262), "--d": "2.6s" } as CSSProperties}>
          <span className="intro-next__label">{t.prayer.next}</span>
          <span className="intro-next__name">{prayerNames[language][PRAYERS[NEXT]]}</span>
          <span className="intro-next__bar" aria-hidden="true">
            <span />
          </span>
        </div>
      </Stage>
    );
  }
  if (id === "quran") {
    return (
      <Stage dir={dir} thread={<Thread sceneMs={ms} out={false} fade={2.0} d="M340,350 L262,350 L262,11 L38,11 L38,350 L-40,350" />}>
        {/* The reader's own page turn: a copy of page 1 lifts from the spine (the right edge) and turns
            away over page 2 — the printed pages themselves, untouched. Its paper sound is a cue (SCENE_SOUNDS). */}
        <div className="intro-page intro-page-turn intro-rise" style={{ "--d": "1.4s", "--turn": `${PAGE_TURN_AT / 1000}s` } as CSSProperties}>
          <img src={MUSHAF_PAGE_2} alt="" className="intro-page-turn__under" draggable={false} />
          <span className="intro-page-turn__cast" aria-hidden="true" />
          <span className="intro-page-turn__leaf">
            <img src={MUSHAF_PAGE} alt="" draggable={false} />
            <span className="intro-page-turn__shade" aria-hidden="true" />
          </span>
        </div>
      </Stage>
    );
  }
  if (id !== "closing") {
    // The feature scenes: the thread runs in beneath the miniature (a ring for the Tasbeeh) and leads on.
    const d =
      id === "tasbeeh"
        ? "M340,128 L245,128 A95,95 0 1,0 55,128 A95,95 0 1,0 245,128"
        : "M340,350 C262,350 232,356 150,356 C68,356 38,350 -40,350";
    return (
      <Stage dir={dir} thread={<Thread sceneMs={ms} draw={id === "tasbeeh" ? 1.3 : 1} d={d} />}>
        <FeatureScene id={id} lang={language} dir={dir} />
      </Stage>
    );
  }
  // Closing: three strands weave across, the cover (دِثار) settles between them, the logo inside it.
  return (
    <Stage
      dir={dir}
      thread={
        <>
          <Thread sceneMs={ms} out={false} draw={1.6} d="M340,150 C260,110 210,250 150,180 C90,110 40,250 -40,190" />
          <Thread sceneMs={ms} out={false} draw={1.6} delay={0.2} d="M340,210 C260,250 210,110 150,180 C90,250 40,110 -40,170" />
          <Thread sceneMs={ms} out={false} draw={1.6} delay={0.4} d="M340,180 C250,180 220,140 150,140 C80,140 50,220 -40,180" />
        </>
      }
    >
      <div className="intro-cover intro-fade" style={{ "--d": "1.2s" } as CSSProperties} aria-hidden="true" />
      {language === "ar" ? (
        <img src={LOGO.ar} alt="" className="intro-logo intro-rise" style={{ "--d": "1.5s" } as CSSProperties} draggable={false} />
      ) : (
        // In English: the emblem with the brand name as the opening spells it (DITHAR), one spelling throughout.
        <>
          <img src={EMBLEM} alt="" className="intro-emblem intro-rise" style={{ top: y(160), width: "38%", "--d": "1.5s" } as CSSProperties} draggable={false} />
          <span className="intro-brand intro-rise" lang="en" dir="ltr" style={{ top: y(246), "--d": "1.8s" } as CSSProperties}>
            {t.brand}
          </span>
        </>
      )}
    </Stage>
  );
}

export function IntroFilm({ firstLaunch, onShown, onClose }: { firstLaunch: boolean; onShown?: () => void; onClose: (how: "finished" | "skipped") => void }) {
  const { language, dir } = useLanguage();
  const t = introFilmLabels[language];
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const [reduced] = useState(prefersReducedMotion);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(loadIntroMuted);
  const [closing, setClosing] = useState<"finished" | "skipped" | null>(null);
  // On a fresh launch, the logo (index.html) is still above: the film starts when it has had its time.
  const [started, setStarted] = useState(() => !firstLaunch || !launchLogoShowing());
  const remaining = useRef(SCENES[0].ms);
  // Set by «التالي»: the scene being left must not carry its elapsed time into the next one.
  const movedOn = useRef(false);
  // Where the running scene's clock stood when it last (re)started — for its sound cue.
  const clock = useRef({ begin: 0, remaining: SCENES[0].ms });
  // The film's sound (lib/introFilmSound.ts): made when the sound is first turned on; each cue plays once.
  const sound = useRef<IntroFilmSound | null>(null);
  const cuesPlayed = useRef(new Set<string>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const onShownRef = useRef(onShown);
  useLayoutEffect(() => {
    onShownRef.current = onShown;
  }, [onShown]);

  const close = useCallback((how: "finished" | "skipped") => setClosing((c) => c ?? how), []);
  const skip = useCallback(() => close("skipped"), [close]);
  useBackDismiss(true, skip);

  // The launch cover: gone at once without the logo; with it, it fades over the film after its second.
  useLayoutEffect(() => {
    if (!firstLaunch) return;
    if (!launchLogoShowing()) {
      removeLaunchCover();
      return;
    }
    return whenLaunchLogoDone(() => {
      fadeOutLaunchCover();
      setStarted(true);
    });
  }, [firstLaunch]);

  useEffect(() => {
    if (firstLaunch) markStartupOverlayShown(); // this launch's Hadith has had its turn: the film took it
    // Home loads beneath, once the film itself is on screen.
    const cancel = afterFirstPaint(() => onShownRef.current?.());
    const stop = onStartupOverlayDismiss(skip); // a reminder opened from a notification comes first
    return () => {
      cancel();
      stop();
    };
  }, [firstLaunch, skip]);

  // Focus goes to the film itself (screen readers announce it; Skip is the next stop), with no ring drawn.
  useEffect(() => dialogRef.current?.focus({ preventScroll: true }), []);

  // Hidden (the app went to the background): the film waits, like a paused one.
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const halted = paused || hidden || !started || closing !== null;

  // One timer per scene, resumable: what is left of the scene is kept across a pause.
  useEffect(() => {
    if (halted) return;
    movedOn.current = false;
    const begin = performance.now();
    clock.current = { begin, remaining: remaining.current };
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      if (index === SCENES.length - 1) return close("finished");
      remaining.current = SCENES[index + 1].ms;
      setLeaving(index);
      setIndex(index + 1);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!fired && !movedOn.current) remaining.current = Math.max(0, remaining.current - (performance.now() - begin));
    };
  }, [index, halted, close]);

  // The scene's sounds (data/introFilmTimeline.ts SCENE_SOUNDS), on the same clock as its animation:
  // they wait through a pause — a recording holds where it is — and play only with the sound on. A cue
  // already past when the sound comes on is skipped, never started late.
  useEffect(() => {
    if (muted) {
      sound.current?.stopAll();
      return;
    }
    sound.current ??= new IntroFilmSound(import.meta.env.BASE_URL);
    const engine = sound.current;
    if (halted) {
      engine.pause();
      return;
    }
    engine.resume();
    const elapsed = SCENES[index].ms - clock.current.remaining + (performance.now() - clock.current.begin);
    const timers = (SCENE_SOUNDS[SCENES[index].id] ?? []).flatMap((cue, n) => {
      const key = `${index}:${n}`;
      const wait = cue.at - elapsed;
      if (cuesPlayed.current.has(key) || wait < -150) return [];
      return [
        window.setTimeout(() => {
          cuesPlayed.current.add(key);
          if ("clip" in cue) engine.play(cue.clip);
          else if ("touch" in cue) engine.touch(cue.touch);
          else playPageTurnSound(400);
        }, Math.max(0, wait)),
      ];
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [index, halted, muted]);
  useEffect(() => {
    if (!muted) void preparePageTurnSound();
  }, [muted]);
  // Skip, «ابدأ», the end: the sound goes with the film.
  useEffect(() => {
    if (closing) sound.current?.stopAll(0.3);
  }, [closing]);
  useEffect(
    () => () => {
      sound.current?.dispose();
      sound.current = null;
    },
    [],
  );
  // The page the Mushaf turns to is ready before its turn.
  useEffect(() => {
    const img = new Image();
    img.src = MUSHAF_PAGE_2;
  }, []);

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), CROSSFADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // Ending: a short fade, then Home.
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => onClose(closing), reduced ? 0 : LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClose, reduced]);

  const scene = SCENES[index];
  // «التالي»: the next scene now (the film keeps playing from there).
  const goNext = () => {
    if (index >= SCENES.length - 1 || closing) return;
    remaining.current = SCENES[index + 1].ms;
    movedOn.current = true;
    setLeaving(index);
    setIndex(index + 1);
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    saveIntroMuted(next);
  };
  const last = index === SCENES.length - 1;
  return (
    <div
      className={`dithar-intro fixed inset-0 z-[95] flex flex-col ${halted ? "is-paused" : ""} ${closing ? "is-closing" : ""} ${reduced ? "is-reduced" : ""}`}
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-label={t.dialog}
      ref={dialogRef}
      tabIndex={-1}
      data-intro-film={closing ? "closing" : scene.id}
    >
      <div className="intro-bar">
        {/* On the last scene «ابدأ» takes its place. */}
        <button type="button" className={`intro-skip ${last ? "is-gone" : ""}`} onClick={skip} aria-hidden={last} tabIndex={last ? -1 : 0} data-intro-skip="">
          {t.skip}
        </button>
        <span className="flex-1" />
        <button type="button" className="intro-icon" onClick={() => setPaused((p) => !p)} aria-label={paused ? t.play : t.pause} aria-pressed={paused} data-intro-pause="">
          {paused ? <Play size={18} strokeWidth={1.8} /> : <Pause size={18} strokeWidth={1.8} />}
        </button>
        <button type="button" className="intro-icon" onClick={toggleMute} aria-label={muted ? t.unmute : t.mute} aria-pressed={!muted} data-intro-mute={muted ? "muted" : "on"}>
          {muted ? <VolumeX size={18} strokeWidth={1.8} /> : <Volume2 size={18} strokeWidth={1.8} />}
        </button>
      </div>

      <div className="intro-scenes">
        {started &&
          [leaving, index].map((i) =>
            i === null ? null : (
              <div
                key={SCENES[i].id}
                className={`intro-scene ${i === leaving ? "is-leaving" : ""}`}
                style={{ ...shotVars(SCENES[i].id, dir), "--shot-ms": `${SCENES[i].ms}ms` } as CSSProperties}
                data-intro-scene={SCENES[i].id}
                aria-hidden={i === leaving}
              >
                {/* The camera (data/introFilmShots.ts): the scene's picture is filmed as a slow shot, and
                    arrives and leaves still moving. Its sentence below stays still. */}
                <div className="intro-shot-move">
                  <div className="intro-shot">
                    <SceneContent id={SCENES[i].id} ms={SCENES[i].ms} language={language} dir={dir} />
                  </div>
                </div>
                <p className={`intro-caption intro-rise ${SCENES[i].id === "opening" ? "is-tagline" : ""}`} style={{ "--d": SCENES[i].id === "opening" ? "2.2s" : i <= 2 || SCENES[i].id === "closing" ? "0.9s" : "0.3s" } as CSSProperties}>
                  {SCENES[i].id === "opening" ? t.tagline : t.captions[SCENES[i].id]}
                </p>
              </div>
            ),
          )}
      </div>

      {/* For screen readers: the scene's sentence, once. */}
      <p className="sr-only" aria-live="polite">
        {started ? (scene.id === "opening" ? t.tagline : t.captions[scene.id]) : ""}
      </p>

      <div className="intro-foot">
        <div className={`intro-begin-slot ${last ? "is-shown" : ""}`}>
          {last ? (
            <button type="button" className="intro-begin intro-rise" style={{ "--d": "2.1s" } as CSSProperties} onClick={() => close("finished")} data-intro-begin="">
              {t.begin}
            </button>
          ) : (
            <button type="button" className="intro-next-btn" onClick={goNext} data-intro-next="">
              {t.next}
              <NextIcon size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="intro-progress" role="img" aria-label={t.progress(index + 1, SCENES.length)}>
          {SCENES.map((s, i) => (
            <span key={s.id} className="intro-progress__seg">
              <span className={i < index ? "is-done" : i === index && started ? "is-current" : ""} style={i === index ? ({ "--ms": `${s.ms}ms` } as CSSProperties) : undefined} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default IntroFilm;
