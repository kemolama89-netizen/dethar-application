// Large bespoke category illustrations for the Written Adhkar landing
// grid — deliberately NOT small icon-in-a-circle badges (spec: the visual
// symbol should be "integrated into the composition", occupying real
// space, not a generic settings-button treatment). Each is restrained
// line/silhouette art in the same duotone language: --wa-ink for
// structural strokes, --wa-gold for the one accent fill — so they
// automatically re-theme for men/women without any props, exactly like
// every other --wa-* driven element on this page.
//
// All four share a 160x100 canvas and sit on a horizon-adjacent
// composition (sunrise/evening share a literal horizon line; the mihrab
// and branch use the same baseline for visual rhythm across the grid).

interface IllustrationProps {
  className?: string;
}

export function SunriseIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden="true" fill="none">
      <path d="M8 78H152" stroke="var(--wa-ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
      <path
        d="M46 78a34 34 0 0 1 68 0"
        stroke="var(--wa-gold)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <g stroke="var(--wa-gold)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        <path d="M80 20v14" />
        <path d="M52 30l10 10" />
        <path d="M108 30l-10 10" />
        <path d="M34 52l13 6" />
        <path d="M126 52l-13 6" />
      </g>
    </svg>
  );
}

export function EveningIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden="true" fill="none">
      <path d="M8 82H152" stroke="var(--wa-ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
      <path
        d="M100 20a24 24 0 1 0 0 48a19 19 0 1 1 0-48Z"
        fill="var(--wa-gold)"
      />
      <g fill="var(--wa-gold)" opacity="0.85">
        <path d="M46 28l1.8 4.4L52 34l-4.2 1.6L46 40l-1.8-4.4L40 34l4.2-1.6Z" />
        <circle cx="64" cy="46" r="1.7" />
        <circle cx="32" cy="50" r="1.3" />
      </g>
    </svg>
  );
}

export function MihrabIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden="true" fill="none">
      <path d="M8 86H152" stroke="var(--wa-ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
      <path
        d="M40 84V46C40 24 56 10 80 10C104 10 120 24 120 46V84"
        stroke="var(--wa-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M50 84V50C50 32 62 22 80 22C98 22 110 32 110 50V84"
        stroke="var(--wa-gold)"
        strokeWidth="1.3"
        opacity="0.6"
      />
      <path
        d="M80 38l3.6 8.4L92 50l-8.4 3.6L80 62l-3.6-8.4L68 50l8.4-3.6Z"
        fill="var(--wa-gold)"
        opacity="0.9"
      />
    </svg>
  );
}

export function BranchIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden="true" fill="none">
      <path d="M8 86H152" stroke="var(--wa-ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.28" />
      <path d="M80 86V16" stroke="var(--wa-ink)" strokeWidth="1.8" strokeLinecap="round" />
      <g fill="var(--wa-gold)">
        <path d="M80 66c0-13 9-22 22-24c-2 13-9 20-22 24Z" opacity="0.9" />
        <path d="M80 66c0-13-9-22-22-24c2 13 9 20 22 24Z" opacity="0.9" />
        <path d="M80 42c0-12 8-20 19-22c-2 12-8 18-19 22Z" opacity="0.7" />
        <path d="M80 42c0-12-8-20-19-22c2 12 8 18 19 22Z" opacity="0.7" />
      </g>
      <path
        d="M80 16l2.6 4.8L88 24l-5.4 2.2L80 32l-2.6-5.8L72 24l5.4-3.2Z"
        fill="var(--wa-gold)"
      />
    </svg>
  );
}
