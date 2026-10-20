// A surah title's ornamental frame (lib/mushafHeadings.ts), drawn behind the
// page artwork in its own viewBox units: the opening pages' title panel — a teal
// band between gold rules, a navy field of gold arabesque vines with teal and
// cream florets, and a cream cartouche with pointed ends holding the title.
// Colours are in quranReader.css (.dithar-mushaf-headings).
import { CARTOUCHE_HALF_WIDTH, CARTOUCHE_TIP, FRAME_BORDER, FRAME_HEIGHT, FRAME_WIDTH, type SurahHeadingFrame } from "../lib/mushafHeadings";

const W = FRAME_WIDTH / 2;
const H = FRAME_HEIGHT / 2;
/** The navy field's half height; the cartouche fills it top to bottom. */
const F = H - FRAME_BORDER;
/** One repeat of the arabesque: two mirrored vines crossing, a floret in each of the two cells between them. */
const TILE = 24;

/** A cartouche with pointed ends: straight top and bottom to ±half, then concave curves meeting at ±tip. */
function cartouche(half: number, tip: number, h: number): string {
  const c = half + (tip - half) * 0.28;
  return (
    `M ${-half} ${-h} L ${half} ${-h} Q ${c} ${-h * 0.18} ${tip} 0 Q ${c} ${h * 0.18} ${half} ${h} ` +
    `L ${-half} ${h} Q ${-c} ${h * 0.18} ${-tip} 0 Q ${-c} ${-h * 0.18} ${-half} ${-h} Z`
  );
}

const diamond = (x: number, r: number) => `M ${x - r} 0 L ${x} ${-r} L ${x + r} 0 L ${x} ${r} Z`;

/** The arabesque, once per page's <svg> (`id` is unique to the page). */
export function MushafSurahFrameDefs({ id }: { id: string }) {
  const h = 2 * F;
  const m = h / 2;
  // A vine wave over the tile: from the left crossing, out to one side and back at the middle, then out
  // to the other side and back at the right crossing; its mirror (sign -1) closes the two cells.
  const vine = (sign: 1 | -1) => {
    const y = m - sign * h * 0.4;
    const z = m + sign * h * 0.4;
    return `M 0 ${m} C ${TILE * 0.12} ${y} ${TILE * 0.38} ${y} ${TILE / 2} ${m} C ${TILE * 0.62} ${z} ${TILE * 0.88} ${z} ${TILE} ${m}`;
  };
  const floret = (x: number, cls: string) => (
    <g className={cls} transform={`translate(${x} ${m})`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx={0} cy={-1.7} rx={0.95} ry={1.65} transform={`rotate(${a})`} />
      ))}
      <circle className="dithar-surah-frame-gold" r={0.85} />
    </g>
  );
  const leaf = (x: number, y: number, a: number) => (
    <ellipse className="dithar-surah-frame-leaf" cx={x} cy={y} rx={2.3} ry={0.95} transform={`rotate(${a} ${x} ${y})`} />
  );
  return (
    <defs>
      {/* Laid out from the field's middle, so the arabesque is symmetric about the title. */}
      <pattern id={id} patternUnits="userSpaceOnUse" width={TILE} height={h} x={-TILE / 2} y={-F}>
        <path className="dithar-surah-frame-vine" d={vine(1)} />
        <path className="dithar-surah-frame-vine" d={vine(-1)} />
        {floret(TILE / 4, "dithar-surah-frame-floret")}
        {floret((3 * TILE) / 4, "dithar-surah-frame-floret dithar-surah-frame-floret-teal")}
        {/* Above and below each crossing: a pair of leaves and a gold bud. */}
        {[0, TILE / 2, TILE].map((x) => (
          <g key={x}>
            {leaf(x - 2.1, h * 0.12, -20)}
            {leaf(x + 2.1, h * 0.12, 20)}
            {leaf(x - 2.1, h * 0.88, 20)}
            {leaf(x + 2.1, h * 0.88, -20)}
            <circle className="dithar-surah-frame-gold" cx={x} cy={h * 0.17} r={0.6} />
            <circle className="dithar-surah-frame-gold" cx={x} cy={h * 0.83} r={0.6} />
            <path className="dithar-surah-frame-gold" d={`M ${x - 1.2} ${m} L ${x} ${m - 1.2} L ${x + 1.2} ${m} L ${x} ${m + 1.2} Z`} />
          </g>
        ))}
      </pattern>
    </defs>
  );
}

/** One title's frame, centred on the title (the frame's own box). */
export function MushafSurahFrame({ frame, pattern }: { frame: SurahHeadingFrame; pattern: string }) {
  return (
    <g transform={`translate(${frame.x + frame.width / 2} ${frame.y + frame.height / 2})`} data-surah-heading={frame.surah}>
      <rect className="dithar-surah-frame-field" x={-W + FRAME_BORDER} y={-F} width={FRAME_WIDTH - 2 * FRAME_BORDER} height={2 * F} />
      <rect x={-W + FRAME_BORDER} y={-F} width={FRAME_WIDTH - 2 * FRAME_BORDER} height={2 * F} fill={`url(#${pattern})`} />
      {/* A navy margin around the cartouche, so the arabesque never crowds it (the band, drawn after, trims it). */}
      <path className="dithar-surah-frame-halo" d={cartouche(CARTOUCHE_HALF_WIDTH, CARTOUCHE_TIP, F)} />
      <path className="dithar-surah-frame-cartouche" d={cartouche(CARTOUCHE_HALF_WIDTH, CARTOUCHE_TIP, F)} />
      <path className="dithar-surah-frame-cartouche-line" d={cartouche(CARTOUCHE_HALF_WIDTH - 1.6, CARTOUCHE_TIP - 2.6, F - 1.5)} />
      {[-1, 1].map((s) => (
        <path key={s} className="dithar-surah-frame-gold" d={diamond(s * (CARTOUCHE_TIP + 2.6), 1.7)} />
      ))}
      {/* The teal band: the ring between the frame's edge and the field, with its gold rules. */}
      <path
        className="dithar-surah-frame-band"
        fillRule="evenodd"
        d={`M ${-W} ${-H} H ${W} V ${H} H ${-W} Z M ${-W + FRAME_BORDER} ${-F} V ${F} H ${W - FRAME_BORDER} V ${-F} Z`}
      />
      <rect className="dithar-surah-frame-edge" x={-W} y={-H} width={FRAME_WIDTH} height={FRAME_HEIGHT} rx={1.2} />
      <rect className="dithar-surah-frame-rule" x={-W + 1.3} y={-H + 1.3} width={FRAME_WIDTH - 2.6} height={FRAME_HEIGHT - 2.6} />
      <rect className="dithar-surah-frame-field-edge" x={-W + FRAME_BORDER} y={-F} width={FRAME_WIDTH - 2 * FRAME_BORDER} height={2 * F} />
    </g>
  );
}
