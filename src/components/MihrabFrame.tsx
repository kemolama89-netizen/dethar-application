import { useId, useLayoutEffect, useRef, useState } from "react";

// The prayer-times panel's mihrab (after public/reference/mihrab-reference.png):
// the whole panel is a carved niche — decorative only (aria-hidden). It shows
// no direction and is no compass: the app does not calculate the Qibla.
//
// Like the reference: a tall pointed arch whose carved band runs down both
// sides as pilasters, so the prayer times sit INSIDE the niche; the panel's
// title and location run across the top, above the crest, with a rosette in
// each spandrel beside the crown. Layers,
// back to front: a dark damask over the whole panel; a rectangular frame of
// two fine mouldings; the niche, shaded deeper toward its crown; the carved
// band (a bronze field with tooled interlace between grooved mouldings);
// a lace of small cusps along the arch's inner edge; capitals where the arch
// springs, bases at the foot; and a crest on the crown. Colours are fixed
// dark bronze, brown and gold — the reference's — over the panel's own
// background.
//
// Drawn in the panel's real pixels (measured), never stretched. The crown
// rises from just under the title row ([data-prayer-panel-title]) and the arch
// springs just above the prayer cards ([data-prayer-times]), wherever the
// layout puts them.

const BRONZE_DEEP = "#2b1d10";
const BRONZE_DARK = "#4a3420";
const BRONZE = "#7a5a36";
const BRONZE_LIGHT = "#b48d57";
const GOLD = "#d8b26a";
const GOLD_PALE = "#f0d9a3";

interface Arch {
  x0: number;
  x1: number;
  top: number;
  spring: number;
}

type Pt = [number, number];

/** The crown's two halves as cubic Béziers: round shoulders meeting in a point. */
function crown(a: Arch): [Pt[], Pt[]] {
  const cx = (a.x0 + a.x1) / 2;
  const hw = cx - a.x0;
  const rise = a.spring - a.top;
  // A short crown (a short screen) gets fuller shoulders, so its niche is wide enough near the top
  // for the text under it; the tip stays pointed either way.
  const full = Math.min(1, Math.max(0, (150 - rise) / 70));
  const k1 = 0.62 + 0.24 * full;
  const k2x = 0.34 + 0.24 * full;
  const k2y = 0.16 - 0.1 * full;
  const left: Pt[] = [
    [a.x0, a.spring],
    [a.x0, a.spring - rise * k1],
    [cx - hw * k2x, a.top + rise * k2y],
    [cx, a.top],
  ];
  const right: Pt[] = [
    [cx, a.top],
    [cx + hw * k2x, a.top + rise * k2y],
    [a.x1, a.spring - rise * k1],
    [a.x1, a.spring],
  ];
  return [left, right];
}

function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}

/** A point along the crown, u ∈ [0, 1] from the left springing to the right. */
function crownAt(a: Arch, u: number): Pt {
  const [l, r] = crown(a);
  return u <= 0.5 ? bez(l, u * 2) : bez(r, u * 2 - 1);
}

/** The arch's line from the left foot, over the crown, to the right foot (open). */
function archLine(a: Arch, bottom: number): string {
  const [l, r] = crown(a);
  const c = (p: Pt[]) => `C ${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`;
  return `M ${a.x0} ${bottom} L ${a.x0} ${a.spring} ${c(l)} ${c(r)} L ${a.x1} ${bottom}`;
}

const inset = (a: Arch, d: number): Arch => ({ x0: a.x0 + d, x1: a.x1 - d, top: a.top + d * 1.15, spring: a.spring });

export function MihrabFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, spring: 0, top: 4 });
  const uid = useId().replace(/:/g, "");
  useLayoutEffect(() => {
    const el = ref.current;
    const panel = el?.parentElement;
    if (!el || !panel) return;
    const cards = () => panel.querySelector<HTMLElement>("[data-prayer-times]");
    const title = () => panel.querySelector<HTMLElement>("[data-prayer-panel-title]");
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const t = title();
      const top = t ? t.offsetTop + t.offsetHeight + 7 : 4;
      const spring = Math.max(top + 30, (cards()?.offsetTop ?? h * 0.6) - 6);
      setBox((b) => (b.w === w && b.h === h && b.spring === spring && b.top === top ? b : { w, h, spring, top }));
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    const c = cards();
    if (c) observer?.observe(c);
    return () => observer?.disconnect();
  }, []);

  const { w, h, spring, top } = box;
  const band = w < 340 ? 10 : 12;
  const frame = 3; // the rectangular frame's mouldings
  const outer: Arch = { x0: frame + 2, x1: w - frame - 2, top, spring };
  const inner = inset(outer, band);
  const id = (n: string) => `mihrab-${n}-${uid}`;
  const url = (n: string) => `url(#${id(n)})`;

  // The lace: small cusps along the crown's inner edge, pointing into the niche.
  const cusps: string[] = [];
  if (w > 0) {
    const steps = Math.max(12, Math.round((w + spring) / 9));
    for (let i = 1; i < steps; i++) {
      const [x, y] = crownAt(inset(inner, 0.6), i / steps);
      cusps.push(`M ${(x - 2.3).toFixed(2)} ${y.toFixed(2)} a 2.3 2.3 0 0 0 4.6 0`);
    }
  }

  // A rosette in each spandrel, between the title row and the crown, where there is room.
  const rx = outer.x0 + (w / 2 - outer.x0) * 0.3;
  let crownY = spring;
  for (let i = 0; i <= 100; i++) {
    const [px, py] = crownAt(outer, i / 200);
    if (px >= rx) {
      crownY = py;
      break;
    }
  }
  const rosetteR = Math.min(8, (crownY - (top - 4)) / 2 - 2);
  const rosetteY = (top - 4 + crownY) / 2;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }} aria-hidden="true" data-mihrab="">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" data-mihrab-spring={Math.round(spring)}>
          <defs>
            {/* Dark damask: an ogee lattice, barely lighter than the ground, as on the reference's panel. */}
            <pattern id={id("damask")} width="26" height="34" patternUnits="userSpaceOnUse">
              <path d="M13 0 C 21 8, 21 9, 13 17 C 5 25, 5 26, 13 34 M13 0 C 5 8, 5 9, 13 17 C 21 25, 21 26, 13 34" fill="none" stroke={GOLD} strokeOpacity="0.07" strokeWidth="0.9" />
              <circle cx="13" cy="17" r="1.6" fill={GOLD} fillOpacity="0.08" />
              <circle cx="0" cy="0" r="1.2" fill={GOLD} fillOpacity="0.06" />
              <circle cx="26" cy="34" r="1.2" fill={GOLD} fillOpacity="0.06" />
            </pattern>
            {/* The carved field: tooled interlaced circles, each with a dark cut and a lit edge. */}
            <pattern id={id("carving")} width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill={BRONZE} />
              <circle cx="3.5" cy="3.5" r="2.6" fill="none" stroke={BRONZE_DEEP} strokeWidth="0.8" />
              <circle cx="3.1" cy="3.1" r="2.6" fill="none" stroke={GOLD} strokeOpacity="0.55" strokeWidth="0.4" />
              <path d="M0 3.5 a 3.5 3.5 0 0 0 3.5 -3.5 M3.5 7 a 3.5 3.5 0 0 1 3.5 -3.5" fill="none" stroke={BRONZE_DEEP} strokeWidth="0.6" />
              <circle cx="3.5" cy="3.5" r="0.7" fill={GOLD_PALE} fillOpacity="0.7" />
            </pattern>
            {/* The niche: deeper toward its crown. */}
            <linearGradient id={id("niche")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.42" />
              <stop offset="0.5" stopColor="#000" stopOpacity="0.16" />
              <stop offset="1" stopColor="#000" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id={id("glow")} cx="0.5" cy="0.25" r="0.55">
              <stop offset="0" stopColor={GOLD} stopOpacity="0.12" />
              <stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* The ground's damask, everywhere. */}
          <rect width={w} height={h} fill={url("damask")} />

          {/* The rectangular frame: a lit moulding and a dark groove. */}
          <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="14" fill="none" stroke={BRONZE_LIGHT} strokeWidth="1.2" />
          <rect x="3.6" y="3.6" width={w - 7.2} height={h - 7.2} rx="12" fill="none" stroke={BRONZE_DEEP} strokeWidth="1.4" strokeOpacity="0.8" />

          {/* The niche: deeper toward the crown, a soft light under it. */}
          <path d={`${archLine(inner, h)} Z`} fill={url("niche")} data-mihrab-niche="" />
          <path d={`${archLine(inner, h)} Z`} fill={url("glow")} />

          {/* The carved band, arch and pilasters in one: the field, then grooves and lit edges. */}
          <path d={`${archLine(outer, h)} Z ${archLine(inner, h)} Z`} fillRule="evenodd" fill={url("carving")} data-mihrab-band="" />
          <path d={archLine(outer, h)} fill="none" stroke={GOLD} strokeWidth="1.3" strokeLinejoin="round" />
          <path d={archLine(inset(outer, 1.6), h)} fill="none" stroke={BRONZE_DEEP} strokeWidth="1" strokeLinejoin="round" />
          <path d={archLine(inset(outer, band - 1.6), h)} fill="none" stroke={BRONZE_DEEP} strokeWidth="1" strokeLinejoin="round" />
          <path d={archLine(inner, h)} fill="none" stroke={GOLD_PALE} strokeWidth="1" strokeOpacity="0.85" strokeLinejoin="round" />

          {/* Rosettes in the spandrels. */}
          {rosetteR >= 4 &&
            [rx, w - rx].map((x) => (
              <g key={x} transform={`translate(${x} ${rosetteY})`}>
                <circle r={rosetteR} fill={BRONZE_DARK} stroke={BRONZE_LIGHT} strokeWidth="0.8" />
                {Array.from({ length: 8 }, (_, i) => (
                  <ellipse key={i} cy={-rosetteR * 0.5} rx={rosetteR * 0.2} ry={rosetteR * 0.4} transform={`rotate(${i * 45})`} fill={GOLD} fillOpacity="0.85" />
                ))}
                <circle r={rosetteR * 0.22} fill={GOLD_PALE} />
              </g>
            ))}

          {/* The lace of cusps along the crown's inner edge. */}
          <path d={cusps.join(" ")} fill={BRONZE_DARK} fillOpacity="0.55" stroke={BRONZE_LIGHT} strokeWidth="0.7" />

          {/* Capitals where the arch springs, bases at the foot. */}
          {[outer.x0, inner.x1].map((x) => (
            <g key={x}>
              <path d={`M ${x - 1.5} ${spring - 1} H ${x + band + 1.5} L ${x + band} ${spring + 3.5} H ${x} Z`} fill={GOLD} stroke={BRONZE_DEEP} strokeWidth="0.6" />
              <rect x={x - 0.5} y={spring + 3.5} width={band + 1} height="1.4" fill={BRONZE_DEEP} />
              <rect x={x - 1.5} y={h - 9} width={band + 3} height="4.5" rx="1" fill={GOLD} fillOpacity="0.9" stroke={BRONZE_DEEP} strokeWidth="0.6" />
            </g>
          ))}

          {/* The crest on the crown: a pointed finial over a small rosette. */}
          <g transform={`translate(${w / 2} ${outer.top})`}>
            <path d="M0 -3.5 C 3 -1, 5 2, 0 7 C -5 2, -3 -1, 0 -3.5 Z" fill={GOLD} stroke={BRONZE_DEEP} strokeWidth="0.7" />
            <circle cy="2.6" r="1.6" fill={BRONZE_DEEP} />
          </g>
        </svg>
      )}
    </div>
  );
}
