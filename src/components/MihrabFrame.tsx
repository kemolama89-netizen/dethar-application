import { memo, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// The prayer-times panel's mihrab (after public/reference/mihrab-reference.png):
// the whole panel is a carved niche — decorative only (aria-hidden). It shows
// no direction and is no compass: the app does not calculate the Qibla.
//
// Built like a real mihrab in burgundy stone and gold, whatever the palette
// (the panel scopes its own colours: PrayerTimesPanel MIHRAB_PANEL_VARS) —
// back to front:
//  - the surround: deep burgundy, lit from above, with a carved girih
//    (eight-pointed star) lattice in faint relief;
//  - the alfiz: a rectangular frame of layered mouldings — a bevelled gold
//    edge (lit above, shaded below), a dark channel, a fine inner gold line,
//    a small rosette in each corner;
//  - the spandrels: a gold eight-pointed star (khatam) roundel each, with
//    scrolling vines;
//  - the niche: burgundy, concave — lit at its centre, shaded toward its
//    sides and its crown — with a soft shadow inside the arch; in its crown,
//    above the text only, a carved shell hood (alternate lit and shaded
//    flutes) over a scalloped cornice, and a hanging lamp where it fits;
//  - the arch: a pointed arch in two stepped tiers of gold (an archivolt) —
//    beaded outer moulding, voussoir joints and an engraved interlace on the
//    outer tier, a dark recessed channel, a polished inner tier with a cusped
//    (multifoil) edge — casting its shadow into the niche;
//  - engaged columns down both sides, shaded round, with muqarnas capitals,
//    moulded bases and a finial on the crown.
//
// The decoration keeps to the frame, the band, the spandrels and the hood —
// never where the text and controls are: the band's cusps bite OUTWARD into
// the band (the niche never loses room), the crown rises from just under the
// title row ([data-prayer-panel-title]), the arch springs just above the
// prayer cards ([data-prayer-times]), and the hood's flutes end above the
// next prayer's first line ([data-next-prayer]), wherever the layout puts
// them. Drawn in the panel's real pixels (measured), never stretched; on its
// own compositing layer, so the countdown ticking never repaints it.

// Gold metalwork (fixed, like the app's gold): highlight, body, shadow.
const GOLD_HI = "#fbe7a8";
const GOLD = "#d9b25e";
const GOLD_MID = "#b8893e";
const GOLD_LO = "#7e5823";
// Burgundy stone: the niche, the surround around it, and its deepest recesses.
export const MIHRAB_STONE = "#6e1a2d";
const SURROUND = "#4b0f1f";
const SURROUND_DEEP = "#2b0711";
const SHADE = "#12030a";
const LAMP_GLOW = "#ffd98a";

interface Arch {
  x0: number;
  x1: number;
  top: number;
  spring: number;
}

type Pt = [number, number];

/** The crown's two halves as cubic Béziers: round shoulders rising to a pointed crown. */
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

/** Points along the crown at (roughly) equal distances, `step` px apart, including both springings. */
function crownPoints(a: Arch, step: number): Pt[] {
  const fine: Pt[] = [];
  for (let i = 0; i <= 400; i++) fine.push(crownAt(a, i / 400));
  let length = 0;
  for (let i = 1; i < fine.length; i++) length += Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]);
  const n = Math.max(6, Math.round(length / step));
  const out: Pt[] = [fine[0]];
  let walked = 0;
  let next = length / n;
  for (let i = 1; i < fine.length && out.length < n; i++) {
    walked += Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]);
    if (walked >= next) {
      out.push(fine[i]);
      next += length / n;
    }
  }
  out.push(fine[fine.length - 1]);
  return out;
}

/**
 * The cusped (multifoil) inner edge, from foot to foot: down the columns
 * straight, over the crown as small lobes between points on the inner arch
 * line. Each lobe bulges OUT of the niche into the band, so the cusps' points
 * lie on the arch line and the niche keeps all its room.
 */
function cuspedLine(a: Arch, bottom: number, step: number): string {
  const pts = crownPoints(a, step);
  let d = `M ${a.x0} ${bottom} L ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const r = Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]) * 0.62;
    d += ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} L ${a.x1} ${bottom}`;
}

/** An eight-pointed star (two squares, one turned 45°) of radius r, centred at the origin. */
function khatam(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    pts.push(`${(rr * Math.cos(angle)).toFixed(2)} ${(rr * Math.sin(angle)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

const fill = (color: string): CSSProperties => ({ fill: color });
const stop = (color: string, opacity = 1): CSSProperties => ({ stopColor: color, stopOpacity: opacity });

function MihrabFrameView() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, spring: 0, top: 4, textTop: 0 });
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
      // Where the next prayer's text begins (its first shown line): the hood's flutes stay above it.
      const base = el.getBoundingClientRect().top;
      const lines = [...panel.querySelectorAll<HTMLElement>("[data-next-prayer] > *")].map((c) => c.getBoundingClientRect()).filter((r) => r.height > 0);
      const textTop = lines.length > 0 ? Math.round(Math.min(...lines.map((r) => r.top)) - base) : spring;
      setBox((b) => (b.w === w && b.h === h && b.spring === spring && b.top === top && b.textTop === textTop ? b : { w, h, spring, top, textTop }));
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    const c = cards();
    if (c) observer?.observe(c);
    const next = panel.querySelector<HTMLElement>("[data-next-prayer]");
    if (next) observer?.observe(next);
    return () => observer?.disconnect();
  }, []);

  const { w, h, spring, top, textTop } = box;
  // The band's inner face (x ≈ 15) stays clear of the prayer cards and switches (they start at 18), so they
  // never touch a column (measured on 320–430 px screens).
  const band = w < 340 ? 9.4 : 10;
  const frame = 5; // the alfiz's mouldings
  const outer: Arch = { x0: frame + 0.6, x1: w - frame - 0.6, top, spring };
  const inner = inset(outer, band);
  const id = (n: string) => `mihrab-${n}-${uid}`;
  const url = (n: string) => `url(#${id(n)})`;

  // Voussoir joints across the band over the crown, and beads along its outer moulding.
  const joints: string[] = [];
  const beads: Pt[] = [];
  let cusped = "";
  let flutes = "";
  const litFlutes: string[] = [];
  const shadedFlutes: string[] = [];
  if (w > 0) {
    const steps = Math.max(14, Math.round((w + 2 * (spring - top)) / 18));
    for (let i = 1; i < steps; i++) {
      const [a, b] = [crownAt(inset(outer, 2.4), i / steps), crownAt(inset(inner, -0.6), i / steps)];
      joints.push(`M ${a[0].toFixed(2)} ${a[1].toFixed(2)} L ${b[0].toFixed(2)} ${b[1].toFixed(2)}`);
    }
    beads.push(...crownPoints(inset(outer, 1.7), 4.6));
    cusped = cuspedLine(inner, h, 8.5);
    // The hood: a shell of flutes radiating from a point below the crown, as on a mihrab's conch —
    // alternate flutes lit and shaded, so it reads as carved, not drawn.
    const cx = w / 2;
    const fy = Math.min(spring, textTop + 6);
    const rim = Array.from({ length: 19 }, (_, i) => crownAt(inset(inner, 1.5), i / 18));
    for (let i = 1; i < 18; i++) {
      const [x, y] = rim[i];
      flutes += `M ${cx.toFixed(1)} ${fy.toFixed(1)} L ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    for (let i = 0; i < 18; i++) {
      const [x0, y0] = rim[i];
      const [x1, y1] = rim[i + 1];
      (i % 2 === 0 ? litFlutes : shadedFlutes).push(`M ${cx.toFixed(1)} ${fy.toFixed(1)} L ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} Z`);
    }
  }

  // A khatam roundel in each spandrel, between the title row and the crown, where there is room.
  const rx = outer.x0 + (w / 2 - outer.x0) * 0.3;
  let crownY = spring;
  for (let i = 0; i <= 100; i++) {
    const [px, py] = crownAt(outer, i / 200);
    if (px >= rx) {
      crownY = py;
      break;
    }
  }
  const rosetteR = Math.min(9, (crownY - (top - 4)) / 2 - 1.5);
  const rosetteY = (top - 4 + crownY) / 2;
  // The spandrels (below the title row, above the springing, outside the arch) — the ornaments' room.
  const spandrels = `M ${frame} ${top - 4} H ${w - frame} V ${spring} H ${frame} Z ${archLine(outer, spring)} Z`;
  // The hood: inside the arch, above the next prayer's first line.
  const hoodBottom = Math.max(top + 8, Math.min(spring, textTop - 3));
  // The archivolt's two tiers meet at this line: the engraved outer tier, then a recessed channel.
  const tier = inset(outer, band * 0.6);
  // A scalloped cornice across the hood's foot (small arches hanging from a fillet), where the hood is tall enough.
  const corniceY = hoodBottom - 6;
  let cornice = "";
  if (w > 0 && corniceY - inner.top > 26) {
    const r = 3.4;
    for (let x = frame + band; x < w - frame - band; x += r * 2) cornice += `M ${x.toFixed(1)} ${corniceY} a ${r} ${r} 0 0 0 ${(r * 2).toFixed(1)} 0 `;
  }
  // The hanging lamp (mishkat) in the crown — only where it hangs fully above the cornice.
  const lampH = 17;
  const lampBottom = corniceY - 5;
  const showLamp = w > 0 && lampBottom - lampH - inner.top >= 14;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit", transform: "translateZ(0)" }} aria-hidden="true" data-mihrab="">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" data-mihrab-spring={Math.round(spring)} data-mihrab-hood={Math.round(hoodBottom)}>
          <defs>
            {/* Polished gold: lit from above, shaded below. */}
            <linearGradient id={id("gold")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop(GOLD_HI)} />
              <stop offset="0.35" style={stop(GOLD)} />
              <stop offset="0.72" style={stop(GOLD_MID)} />
              <stop offset="1" style={stop(GOLD_LO)} />
            </linearGradient>
            <linearGradient id={id("gold-band")} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2={w * 0.25} y2={h}>
              <stop offset="0" style={stop(GOLD_HI)} />
              <stop offset="0.3" style={stop(GOLD)} />
              <stop offset="0.65" style={stop(GOLD_MID)} />
              <stop offset="1" style={stop(GOLD_LO)} />
            </linearGradient>
            {/* A round column: light on one side, shade on the other. */}
            <linearGradient id={id("shaft")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={stop(GOLD_LO)} />
              <stop offset="0.35" style={stop(GOLD_HI)} />
              <stop offset="0.6" style={stop(GOLD)} />
              <stop offset="1" style={stop(GOLD_LO)} />
            </linearGradient>
            {/* The surround's carved girih: eight-pointed stars and crosses in faint relief (a lit edge over a shadow). */}
            <pattern id={id("girih")} width="28" height="28" patternUnits="userSpaceOnUse">
              <g fill="none" strokeWidth="0.9">
                <path d={khatam(9)} transform="translate(14.6 14.8)" stroke={SHADE} strokeOpacity="0.45" />
                <path d={khatam(9)} transform="translate(14 14)" stroke={GOLD} strokeOpacity="0.16" />
                <path d="M0 0 L 5.2 5.2 M28 0 L 22.8 5.2 M0 28 L 5.2 22.8 M28 28 L 22.8 22.8" transform="translate(0.6 0.8)" stroke={SHADE} strokeOpacity="0.4" />
                <path d="M0 0 L 5.2 5.2 M28 0 L 22.8 5.2 M0 28 L 5.2 22.8 M28 28 L 22.8 22.8" stroke={GOLD} strokeOpacity="0.14" />
              </g>
              <circle cx="14" cy="14" r="1.3" fill={GOLD} fillOpacity="0.2" />
            </pattern>
            {/* The surround lit from above, darker toward the floor. */}
            <linearGradient id={id("surround-light")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("#ffffff", 0.07)} />
              <stop offset="0.5" style={stop("#ffffff", 0)} />
              <stop offset="1" style={stop(SHADE, 0.35)} />
            </linearGradient>
            {/* The inner tier of the archivolt: polished, smoother than the engraved outer tier. */}
            <linearGradient id={id("gold-inner")} gradientUnits="userSpaceOnUse" x1={w} y1={top} x2={w * 0.7} y2={h}>
              <stop offset="0" style={stop(GOLD_HI)} />
              <stop offset="0.45" style={stop(GOLD)} />
              <stop offset="1" style={stop(GOLD_MID)} />
            </linearGradient>
            {/* The niche is concave: shaded toward both sides, lit down its middle. */}
            <linearGradient id={id("niche-concave")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={stop(SHADE, 0.5)} />
              <stop offset="0.18" style={stop(SHADE, 0.16)} />
              <stop offset="0.5" style={stop(SHADE, 0)} />
              <stop offset="0.82" style={stop(SHADE, 0.16)} />
              <stop offset="1" style={stop(SHADE, 0.5)} />
            </linearGradient>
            <radialGradient id={id("lamp-glow")}>
              <stop offset="0" style={stop(LAMP_GLOW, 0.55)} />
              <stop offset="0.4" style={stop(LAMP_GLOW, 0.16)} />
              <stop offset="1" style={stop(LAMP_GLOW, 0)} />
            </radialGradient>
            <linearGradient id={id("lamp-glass")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={stop("#b8893e", 0.85)} />
              <stop offset="0.45" style={stop("#fff1c4", 0.95)} />
              <stop offset="1" style={stop("#9a6a2c", 0.85)} />
            </linearGradient>
            {/* The band's engraved interlace. */}
            <pattern id={id("engraving")} width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="3" fill="none" stroke={GOLD_LO} strokeOpacity="0.7" strokeWidth="0.6" />
              <path d="M0 4 a 4 4 0 0 0 4 -4 M4 8 a 4 4 0 0 1 4 -4 M0 4 a 4 4 0 0 1 4 4 M4 0 a 4 4 0 0 0 4 4" fill="none" stroke={GOLD_LO} strokeOpacity="0.45" strokeWidth="0.45" />
              <circle cx="4" cy="4" r="0.7" fill={GOLD_HI} fillOpacity="0.8" />
            </pattern>
            {/* The niche: lit from within, darker toward its edges and deepest at the crown. */}
            <radialGradient id={id("niche-light")} gradientUnits="userSpaceOnUse" cx={w / 2} cy={(top + spring) / 2 + 10} r={Math.max(w, h) * 0.62}>
              <stop offset="0" style={stop("#ffffff", 0.1)} />
              <stop offset="0.45" style={stop("#ffffff", 0.02)} />
              <stop offset="1" style={stop(SHADE, 0.38)} />
            </radialGradient>
            <linearGradient id={id("niche-depth")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop(SHADE, 0.32)} />
              <stop offset="0.45" style={stop(SHADE, 0.08)} />
              <stop offset="1" style={stop(SHADE, 0)} />
            </linearGradient>
            <filter id={id("soft")} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <filter id={id("lift")} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.9" floodColor={SHADE} floodOpacity="0.6" />
            </filter>
            <clipPath id={id("niche")}>
              <path d={`${archLine(inner, h)} Z`} />
            </clipPath>
            <clipPath id={id("hood")}>
              <path d={`${archLine(inner, hoodBottom)} Z`} />
            </clipPath>
            <clipPath id={id("outer-tier")}>
              <path d={`${archLine(outer, h)} Z ${archLine(tier, h)} Z`} clipRule="evenodd" />
            </clipPath>
            <clipPath id={id("spandrels")}>
              <path d={spandrels} clipRule="evenodd" />
            </clipPath>
          </defs>

          {/* The surround: deep burgundy stone, lit from above, with its carved girih. */}
          <rect width={w} height={h} style={fill(SURROUND)} />
          <rect width={w} height={h} fill={url("girih")} />
          <rect width={w} height={h} fill={url("surround-light")} />

          {/* The niche: burgundy, concave — lit down its middle, deepening toward the sides and the crown. */}
          <path d={`${archLine(inner, h)} Z`} style={fill(MIHRAB_STONE)} data-mihrab-niche="" />
          <g clipPath={url("niche")}>
            <rect width={w} height={h} fill={url("niche-light")} />
            <rect width={w} height={h} fill={url("niche-concave")} />
            <rect x="0" y={top} width={w} height={Math.max(1, spring - top)} fill={url("niche-depth")} />
            {/* The carved shell hood, above the text only: lit and shaded flutes, their ribs, a scalloped cornice. */}
            <g clipPath={url("hood")} data-mihrab-flutes="">
              <path d={litFlutes.join(" ")} fill={GOLD_HI} fillOpacity="0.07" />
              <path d={shadedFlutes.join(" ")} fill={SHADE} fillOpacity="0.2" />
              <path d={flutes} fill="none" stroke={GOLD} strokeOpacity="0.26" strokeWidth="0.7" />
              {cornice && (
                <g data-mihrab-cornice="">
                  <rect x="0" y={corniceY - 1.4} width={w} height="1.4" fill={GOLD} fillOpacity="0.55" />
                  <path d={cornice} fill={SHADE} fillOpacity="0.25" stroke={GOLD} strokeOpacity="0.5" strokeWidth="0.6" />
                </g>
              )}
            </g>
            {showLamp && (
              <g data-mihrab-lamp="">
                <circle cx={w / 2} cy={lampBottom - lampH * 0.45} r={lampH * 1.5} fill={url("lamp-glow")} />
                <path d={`M ${w / 2} ${inner.top + 2} V ${lampBottom - lampH}`} stroke={GOLD} strokeOpacity="0.75" strokeWidth="0.6" strokeDasharray="1.6 1" />
                <g transform={`translate(${w / 2} ${lampBottom - lampH})`} filter={url("lift")}>
                  {/* Cap, the glass body with its flared neck, and the foot. */}
                  <path d="M -2.4 0 H 2.4 L 3.4 2.4 H -3.4 Z" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.3" />
                  <path d="M -3 2.4 C -3 5, -7 7, -7 10.5 C -7 14, -3.6 15.2, 0 15.2 C 3.6 15.2, 7 14, 7 10.5 C 7 7, 3 5, 3 2.4 Z" fill={url("lamp-glass")} stroke={GOLD_LO} strokeWidth="0.4" />
                  <path d="M -6.6 9.4 H 6.6" stroke={GOLD_LO} strokeOpacity="0.6" strokeWidth="0.5" />
                  <path d="M -2.6 15.2 H 2.6 L 1.6 17 H -1.6 Z" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.3" />
                </g>
              </g>
            )}
            {/* The shadow the arch casts inside the niche, and the shade along its inner edge. */}
            <path d={archLine(inner, h)} fill="none" stroke={SHADE} strokeOpacity="0.55" strokeWidth="9" filter={url("soft")} transform="translate(0 3)" />
          </g>

          {/* The alfiz: a bevelled gold edge, a dark channel, a fine inner gold line; a rosette in each corner. */}
          <rect x="5" y="5" width={w - 10} height={h - 10} rx="11" fill="none" stroke={SHADE} strokeOpacity="0.45" strokeWidth="4" filter={url("soft")} />
          <rect x="1.2" y="1.2" width={w - 2.4} height={h - 2.4} rx="15" fill="none" stroke={url("gold")} strokeWidth="2.4" />
          <rect x="3.4" y="3.4" width={w - 6.8} height={h - 6.8} rx="13" fill="none" style={{ stroke: SURROUND_DEEP }} strokeWidth="2" />
          <rect x="4.9" y="4.9" width={w - 9.8} height={h - 9.8} rx="11.5" fill="none" stroke={GOLD} strokeOpacity="0.75" strokeWidth="0.6" />
          {[
            [11, 11],
            [w - 11, 11],
            [11, h - 11],
            [w - 11, h - 11],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`} filter={url("lift")}>
              <path d={khatam(3.4)} fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.4" />
              <circle r="1.1" style={fill(SURROUND_DEEP)} />
            </g>
          ))}

          {/* The spandrels: gold vines and a khatam roundel each. */}
          <g clipPath={url("spandrels")} data-mihrab-spandrels="">
            {[0, 1].map((side) => {
              const sx = side === 0 ? 1 : -1;
              const ox = side === 0 ? frame : w - frame;
              const span = w / 2 - frame;
              const y0 = top - 4;
              const hgt = Math.max(1, spring - y0);
              const P = (fx: number, fy: number) => `${(ox + sx * span * fx).toFixed(1)} ${(y0 + hgt * fy).toFixed(1)}`;
              return (
                <g key={side} fill="none" stroke={GOLD} strokeOpacity="0.4" strokeWidth="0.9" strokeLinecap="round">
                  <path d={`M ${P(0.03, 0.95)} C ${P(0.1, 0.55)} ${P(0.06, 0.25)} ${P(0.32, 0.18)} S ${P(0.62, 0.05)} ${P(0.84, 0.02)}`} />
                  <path d={`M ${P(0.02, 0.36)} C ${P(0.08, 0.13)} ${P(0.2, 0.06)} ${P(0.4, 0.04)}`} strokeOpacity="0.28" />
                  <path d={`M ${P(0.07, 0.6)} c ${4 * sx} -6, ${12 * sx} -5, ${11 * sx} 2 c ${-1 * sx} 5, ${-7 * sx} 5, ${-7 * sx} 1`} />
                  <path d={`M ${P(0.62, 0.06)} c ${3 * sx} -4, ${9 * sx} -3, ${9 * sx} 2`} />
                  {[
                    [0.06, 0.76],
                    [0.13, 0.42],
                    [0.25, 0.22],
                    [0.5, 0.11],
                    [0.72, 0.04],
                    [0.19, 0.07],
                  ].map(([fx, fy]) => (
                    <path key={`${fx}`} d={`M ${P(fx, fy)} q ${3 * sx} -4 ${7 * sx} -2 q ${-3 * sx} 4 ${-7 * sx} 2 Z`} fill={GOLD} fillOpacity="0.32" stroke="none" />
                  ))}
                </g>
              );
            })}
            {rosetteR >= 4 &&
              [rx, w - rx].map((x) => (
                <g key={x} transform={`translate(${x} ${rosetteY})`} filter={url("lift")}>
                  <circle r={rosetteR} style={fill(SURROUND_DEEP)} stroke={url("gold")} strokeWidth="1.1" />
                  <path d={khatam(rosetteR * 0.82)} fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.4" />
                  <path d={khatam(rosetteR * 0.5)} style={fill(SURROUND)} stroke={GOLD_HI} strokeWidth="0.35" />
                  <circle r={rosetteR * 0.18} fill={GOLD_HI} />
                </g>
              ))}
          </g>

          {/* The arch: a band of gold — its shadow first, then the metal, its engraving, the voussoir
              joints, the beaded outer moulding and the cusped inner edge. */}
          <path d={`${archLine(outer, h)} Z ${archLine(inner, h)} Z`} fillRule="evenodd" fill={SHADE} fillOpacity="0.5" filter={url("soft")} transform="translate(0 2.5)" />
          <path d={`${archLine(outer, h)} Z ${archLine(inner, h)} Z`} fillRule="evenodd" fill={url("gold-band")} data-mihrab-band="" />
          <path d={`${archLine(outer, h)} Z ${archLine(tier, h)} Z`} fillRule="evenodd" fill={url("engraving")} opacity="0.85" />
          <path d={`${archLine(tier, h)} Z ${archLine(inner, h)} Z`} fillRule="evenodd" fill={url("gold-inner")} data-mihrab-inner-tier="" />
          <path d={joints.join(" ")} fill="none" stroke={GOLD_LO} strokeOpacity="0.75" strokeWidth="0.6" clipPath={url("outer-tier")} />
          {/* The recessed channel between the tiers: a dark groove, lit on its lower lip. */}
          <path d={archLine(tier, h)} fill="none" stroke={SURROUND_DEEP} strokeWidth="1.5" strokeLinejoin="round" />
          <path d={archLine(inset(tier, 0.9), h)} fill="none" stroke={GOLD_HI} strokeOpacity="0.7" strokeWidth="0.45" strokeLinejoin="round" />
          <path d={`${cusped} Z ${archLine(inner, h)} Z`} fillRule="evenodd" fill={GOLD_MID} data-mihrab-cusps="" />
          <path d={cusped} fill="none" stroke={GOLD_LO} strokeWidth="0.8" strokeLinejoin="round" />
          <path d={cusped} fill="none" stroke={GOLD_HI} strokeOpacity="0.7" strokeWidth="0.5" strokeLinejoin="round" transform="translate(0 -0.6)" />
          <path d={archLine(outer, h)} fill="none" stroke={GOLD_LO} strokeWidth="1.4" strokeLinejoin="round" />
          <path d={archLine(inset(outer, 0.7), h)} fill="none" stroke={GOLD_HI} strokeOpacity="0.85" strokeWidth="0.7" strokeLinejoin="round" />
          {beads.map(([x, y], i) => (
            <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1" fill={GOLD_HI} stroke={GOLD_LO} strokeWidth="0.3" />
          ))}
          <path d={archLine(inner, h)} fill="none" stroke={GOLD_LO} strokeWidth="0.7" strokeLinejoin="round" />

          {/* Engaged columns: round, shaded shafts with fine flutes, muqarnas capitals and moulded bases. */}
          {[outer.x0, inner.x1].map((x, side) => {
            const shaftTop = spring + 9;
            const shaftBottom = h - 13;
            // Capitals and bases overhang outward only (toward the panel's edge): the column's inner face
            // stays one straight line, clear of the prayer cards and the switches beside it.
            const out = (by: number) => (side === 0 ? x - by : x);
            return (
              <g key={x} data-mihrab-column="">
                <rect x={x + 1.5} y={shaftTop} width={band - 3} height={Math.max(0, shaftBottom - shaftTop)} rx="1.5" fill={url("shaft")} />
                {[0.3, 0.55, 0.8].map((f) => (
                  <line key={f} x1={x + 1.5 + (band - 3) * f} y1={shaftTop} x2={x + 1.5 + (band - 3) * f} y2={shaftBottom} stroke={GOLD_LO} strokeOpacity="0.5" strokeWidth="0.45" />
                ))}
                {/* Capital: an abacus over three tiers of small niches. */}
                <g filter={url("lift")}>
                  <rect x={out(1.5)} y={spring - 2.5} width={band + 1.5} height="2.6" rx="0.6" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.4" />
                  {[0, 1, 2].map((tier) => {
                    const y = spring + 0.2 + tier * 2.6;
                    const ins = tier * 0.9;
                    const cells = tier === 2 ? 2 : 3;
                    const cw = (band - 2 * ins) / cells;
                    return Array.from({ length: cells }, (_, c) => {
                      const cx0 = x + ins + c * cw;
                      return <path key={`${tier}-${c}`} d={`M ${cx0} ${y + 2.6} V ${y + 1.1} Q ${cx0 + cw / 2} ${y - 0.7} ${cx0 + cw} ${y + 1.1} V ${y + 2.6} Z`} fill={tier % 2 ? GOLD_MID : GOLD} stroke={GOLD_LO} strokeWidth="0.4" />;
                    });
                  })}
                </g>
                {/* Base: a torus over a plinth. */}
                <g filter={url("lift")}>
                  <rect x={out(0.8)} y={h - 13} width={band + 0.8} height="2.4" rx="1.2" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.4" />
                  <rect x={out(2)} y={h - 10.6} width={band + 2} height="3.6" rx="0.8" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.5" />
                </g>
              </g>
            );
          })}

          {/* The finial on the crown: a gold bud on a small orb. */}
          <g transform={`translate(${w / 2} ${outer.top})`} filter={url("lift")}>
            <circle cy="3.2" r="1.9" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.4" />
            <path d="M0 -4.6 C 3.2 -1.6, 4.8 1.2, 0 6.6 C -4.8 1.2, -3.2 -1.6, 0 -4.6 Z" fill={url("gold")} stroke={GOLD_LO} strokeWidth="0.6" />
            <path d="M0 -2.4 C 1.4 -0.6, 2 1, 0 3.8 C -2 1, -1.4 -0.6, 0 -2.4 Z" style={fill(SURROUND)} fillOpacity="0.7" />
          </g>
        </svg>
      )}
    </div>
  );
}

/** The panel re-renders every second (the countdown); the mihrab only when its own box changes. */
export const MihrabFrame = memo(MihrabFrameView);
