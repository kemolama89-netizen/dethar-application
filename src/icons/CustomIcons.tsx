import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function MosqueDomeIcon({ size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 2v2" />
      <path d="M10.5 3.5h3" />
      <path d="M6 11c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M4 15c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4" />
      <path d="M3 19c0-1.7 1.3-3 3-3h1c1.7 0 3 1.3 3 3v1H3z" />
      <path d="M14 19c0-1.7 1.3-3 3-3h1c1.7 0 3 1.3 3 3v1h-7z" />
      <path d="M10 20v-3.5a2 2 0 0 1 4 0V20" />
      <path d="M2 21h20" />
    </svg>
  );
}

// A pointed mihrab-style niche outline — the recurring arch motif behind
// both illustrations in the approved reference (the Quran-stand niche and
// the lantern niche). Used as a decorative backdrop for the card motif
// slots until dedicated illustration assets are supplied.
export function ArchNicheOutline({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 120" className={className} style={style} aria-hidden="true">
      <path
        d="M6 118V56C6 27 25 6 50 6C75 6 94 27 94 56V118"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      />
    </svg>
  );
}

export function SprigIcon({ size = 22, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 21V7" />
      <path d="M12 15c0-3.5 2.5-6 6-6.5C17.5 12 15 14.5 12 15Z" />
      <path d="M12 11c0-3.5-2.5-6-6-6.5C6.5 8 9 10.5 12 11Z" />
      <path d="M9.5 21h5" />
    </svg>
  );
}

export function LanternOutlineIcon({ size = 22, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 2v2.5" />
      <path d="M9 4.5h6l1 2.5H8Z" />
      <path d="M8 7h8v9a4 4 0 0 1-8 0Z" />
      <path d="M10.3 9.5c0 1.3 1 1.6 1 2.7s-1 1.4-1 2.7" />
      <path d="M13.7 9.5c0 1.3 1 1.6 1 2.7s-1 1.4-1 2.7" />
      <path d="M9 19h6" />
      <path d="M10 21.5h4" />
    </svg>
  );
}

// Small top-of-card ornament for the Written Adhkar reading card (men's
// theme) — a restrained 8-point geometric star/medallion, the same
// line-art style as the icons above. Women's theme reuses SprigIcon
// instead (see WrittenAdhkarReader), giving each identity its own
// ornament rather than sharing one symbol recolored.
export function MedallionIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 2.5 14 8l5.5-2-2 5.5L23 12l-5.5 1.5 2 5.5-5.5-2L12 21.5 10 17l-5.5 2 2-5.5L1 12l5.5-1.5-2-5.5L10 8Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function TasbihBeadsIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="4.5" r="1.6" />
      <circle cx="17.5" cy="7" r="1.6" />
      <circle cx="19.5" cy="12.5" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
      <circle cx="11.3" cy="20.3" r="1.6" />
      <circle cx="5.5" cy="17.3" r="1.6" />
      <circle cx="4" cy="11" r="1.6" />
      <circle cx="7.3" cy="5.8" r="1.6" />
      <path d="M12 6.1v3.5" />
    </svg>
  );
}
