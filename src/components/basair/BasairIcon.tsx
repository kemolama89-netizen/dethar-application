/**
 * Basa'ir's mark: a pointed arch holding lines of text that part around a gold
 * opening, which is what the screen does. Colours follow the app's theme
 * (--basair-* in basair.css), and it stays clear at the size of a control.
 */
export function BasairIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 78) / 64} viewBox="0 0 64 78" aria-hidden="true" className="dithar-basair-icon" data-basair-icon="">
      <path d="M7 75 Q3 75 3 71 V35 C3 20 22 14 32 3 C42 14 61 20 61 35 V71 Q61 75 57 75 Z" style={{ fill: "var(--basair-deep)", stroke: "var(--basair-gold)" }} strokeWidth="2.5" />
      <g fill="none" strokeLinecap="round" strokeWidth="3" style={{ stroke: "var(--basair-on-deep)" }}>
        <path d="M18 31 H46" />
        <path d="M13 40 H51" />
        <path d="M13 66 H51" />
      </g>
      <path d="M8 47 H56 M8 59 H56" fill="none" strokeWidth="2" style={{ stroke: "var(--basair-gold)" }} />
    </svg>
  );
}
