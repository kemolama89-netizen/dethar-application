import { BrandLogo } from "./BrandLogo";

// Top margin reads from --home-header-mt (index.css) — 18px on a
// normal/tall viewport (unchanged from before), trimmed by index.css's
// short-viewport media queries on a shorter phone (Batch 5's responsive
// Home Screen fix).
//
// The app-name text line that used to render here has been removed: the
// wordmark ("دِثار" / "DETHAR") is now baked into the logo PNG itself
// (see ThemeContext.tsx's per-theme/language asset selection), so a
// separate text label would duplicate it.
//
// The featured hadith that used to sit under the logo was removed from the
// app content: it failed the 2026-10-30 religious-content audit (its wording
// repeats «ربه», which Sahih al-Bukhari 6407 does not).
export function LogoHeader() {
  return (
    // .dithar-logo-halo (index.css): a soft glow behind the logo, so its wordmark stays legible over a
    // dark wallpaper (Night) or a busy photograph.
    <div className="dithar-logo-halo flex flex-col items-center gap-0.5" style={{ marginTop: "var(--home-header-mt)" }}>
      <BrandLogo />
    </div>
  );
}
