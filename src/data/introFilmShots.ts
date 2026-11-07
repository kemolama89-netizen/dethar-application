// The introduction's camera (components/IntroFilm.tsx): each scene is filmed as its own shot — a slow
// push in, a pull back, a pan, a crane up or down, seen from a slightly different angle — and between two
// scenes the camera keeps moving: the shot leaving drifts on in its direction as it fades, the next one
// settles in from its own. Restrained by design: a few percent of travel, at most 3° of viewing angle
// (4° while a shot enters or leaves), no roll, no spinning, no flying through space. Only a scene's
// picture moves; its sentence stays still, so it is always easy to read.
import type { IntroSceneId } from "./introFilmLabels";

/** x: toward the reading's end (%), y: down (%), s: scale, ry/rx: viewing angle (deg). */
type Pose = { x: number; y: number; s: number; ry: number; rx: number };
type Shot = { from: Partial<Pose>; to: Partial<Pose> };

const SHOTS: Record<IntroSceneId, Shot> = {
  opening: { from: { s: 0.98 }, to: { s: 1.02 } }, // push in
  prayer: { from: { y: 2, rx: 3 }, to: { y: -1, rx: 0 } }, // crane up, to the sky
  quran: { from: { s: 1 }, to: { s: 1.03 } }, // a slow push toward the page
  tafsir: { from: { x: -2, ry: -3 }, to: { x: 1, ry: 0 } }, // pan from the reading's start
  journey: { from: { s: 1.03 }, to: { s: 1 } }, // pull back
  adhan: { from: { x: 2, ry: 3 }, to: { x: -1, ry: 0 } }, // from the reading's end
  audio: { from: { y: -2, rx: -2 }, to: { y: 1, rx: 0 } }, // crane down
  written: { from: { s: 0.99 }, to: { s: 1.03 } },
  tasbeeh: { from: { s: 1.02, ry: 3 }, to: { s: 1, ry: -2 } }, // a slow arc around the ring
  floating: { from: { x: -2 }, to: { x: 2 } }, // pan across
  widget: { from: { y: 2, rx: 2 }, to: { y: -1, rx: 0 } },
  notify: { from: { x: 1.5, ry: -3 }, to: { x: -1, ry: 1 } },
  daysoff: { from: { s: 1 }, to: { s: 1.03 } },
  stats: { from: { y: 1.5, rx: 3 }, to: { y: -1, rx: 0 } },
  looks: { from: { x: 2, ry: 2 }, to: { x: -2, ry: -1 } },
  closing: { from: { s: 1.05 }, to: { s: 1 } }, // the camera draws back for the end
};

const full = (p: Partial<Pose>): Pose => ({ x: 0, y: 0, s: 1, ry: 0, rx: 0, ...p });
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

function css(p: Pose, end: number): string {
  return `perspective(1400px) translate3d(${(p.x * end).toFixed(2)}%, ${p.y.toFixed(2)}%, 0) rotateY(${(p.ry * end).toFixed(2)}deg) rotateX(${p.rx.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
}

/** The camera keeps going the same way past the shot's ends — a little, to arrive and to leave in motion. */
function beyond(a: Pose, b: Pose): Pose {
  const k = 1.2;
  return {
    x: clamp((b.x - a.x) * k, 6),
    y: clamp((b.y - a.y) * k, 6),
    s: Math.max(0.94, Math.min(1.08, 1 + (b.s - a.s) * k)),
    ry: clamp((b.ry - a.ry) * k, 4),
    rx: clamp((b.rx - a.rx) * k, 4),
  };
}

/** The CSS custom properties for a scene's shot: its drift, and how it enters and leaves. */
export function shotVars(id: IntroSceneId, dir: "rtl" | "ltr"): Record<string, string> {
  const end = dir === "rtl" ? -1 : 1;
  const shot = SHOTS[id];
  const from = full(shot.from);
  const to = full(shot.to);
  return {
    "--shot-from": css(from, end),
    "--shot-to": css(to, end),
    "--shot-enter": css(beyond(to, from), end), // arriving: from back along the shot's own line
    "--shot-exit": css(beyond(from, to), end), // leaving: on along it
  };
}

/** Exposed for the tests: every pose a shot passes through. */
export function shotPoses(id: IntroSceneId): Pose[] {
  const from = full(SHOTS[id].from);
  const to = full(SHOTS[id].to);
  return [from, to, beyond(to, from), beyond(from, to)];
}
