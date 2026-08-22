import { useTheme } from "../theme/ThemeContext";

// Renders the authoritative DITHAR / دِثار logo artwork exactly as supplied
// — the wordmark is part of the image asset and is never reproduced as text.
//
// Sized by height (not width): the source square canvas has a lot of
// transparent margin around the actual icon+wordmark glyph, so sizing by a
// percentage of card width (the old approach) made the box scale up to
// 260px tall on typical phones — a major, unnecessary contributor to the
// Home screen needing to scroll. A fixed height keeps the logo visually
// consistent across devices and gives back that vertical space.
//
// width/height attributes (matching the optimized asset's real 480x480
// pixel size) let the browser reserve the correct aspect ratio before the
// bytes arrive, preventing layout shift.
export function BrandLogo() {
  const { logoSrc, theme } = useTheme();

  return (
    <img
      src={logoSrc}
      alt="دِثار DITHAR"
      width={480}
      height={480}
      loading="eager"
      decoding="sync"
      // @ts-expect-error -- fetchpriority is valid HTML but not yet in React's DOM typings
      fetchpriority="high"
      className="mx-auto h-[104px] w-auto max-w-[58%] object-contain"
      key={theme}
    />
  );
}
