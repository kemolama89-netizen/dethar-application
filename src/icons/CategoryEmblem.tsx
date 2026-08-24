// The four Written Adhkar category artworks — real illustration assets
// (not CSS/SVG-drawn), extracted from the single approved reference sheet
// ASSETS/dithar-adhkar-icons.png. See scripts/extract-adhkar-icons.py and
// src/assets/illustrations/README.md for how the black background behind
// each artwork was removed and where these crops come from — that
// reference file itself was never modified. Each file is a plain, fully
// OPAQUE rectangular crop with artwork reaching all four edges — no
// transparent/faded margin baked into the file (an earlier version had
// one, meant for a smaller inset placement; now that the artwork covers
// the whole card, that margin would itself have been the visible "empty
// space around the artwork" this is meant to avoid). object-fit: cover
// (not contain) so it fills its full-bleed slot in
// WrittenAdhkarCategoryCard edge to edge, cropping slightly rather than
// letterboxing.
//
// Assets are WebP, not PNG (~15KB vs ~250-300KB each for this kind of
// soft-gradient art) — these load at runtime the moment the category
// screen mounts, so file weight directly affects how long the cards stay
// blank. Never the 1536x1024 combined reference sheet at runtime; each
// variant is its own small, standalone file. fetchPriority="high" asks
// the browser to fetch these ahead of lower-priority requests on the
// page, since they're the dominant visual content the instant this
// screen mounts.
import { useEffect, useRef, useState } from "react";
import adhkarMorning from "../assets/illustrations/adhkar-morning.webp";
import adhkarEvening from "../assets/illustrations/adhkar-evening.webp";
import adhkarPrayer from "../assets/illustrations/adhkar-prayer.webp";
import adhkarMisc from "../assets/illustrations/adhkar-misc.webp";

export type CategoryEmblemVariant = "morning" | "evening" | "prayer" | "misc";

interface CategoryEmblemProps {
  variant: CategoryEmblemVariant;
  className?: string;
}

// Exported (not just module-private) so WrittenAdhkarReader can reuse the
// exact same asset as its in-card watermark and completion-celebration
// artwork — one source of truth for "which file is this category's
// approved artwork", and since the category screen the user just tapped
// through already requested this exact URL, it's typically already in
// the browser's cache by the time the reader mounts.
export const CATEGORY_ARTWORK: Record<CategoryEmblemVariant, string> = {
  morning: adhkarMorning,
  evening: adhkarEvening,
  prayer: adhkarPrayer,
  misc: adhkarMisc,
};

// Module-scope, runs once (the first time this file is imported — i.e.
// the moment WrittenAdhkarCategoryCard first renders): hints the browser
// to start fetching all four assets immediately, rather than waiting for
// each <img> to be discovered one at a time as React commits the grid.
// Guarded so re-imports (Vite HMR, multiple bundles) don't duplicate tags.
if (typeof document !== "undefined") {
  for (const href of Object.values(CATEGORY_ARTWORK)) {
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
  }
}

// Fade-in is deliberately quiet (180ms, no spinner) — the card shell and
// ivory background are already visible the instant the screen mounts;
// this just softens the artwork's own arrival a beat later rather than
// having it pop in. `img.complete` is checked on mount (not just onLoad)
// because a cached image can finish loading before React attaches the
// listener, which would otherwise leave the card looking permanently
// blank on a revisit.
export function CategoryEmblem({ variant, className }: CategoryEmblemProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(imgRef.current?.complete ?? false);
  }, [variant]);

  return (
    <img
      ref={imgRef}
      src={CATEGORY_ARTWORK[variant]}
      alt=""
      aria-hidden="true"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onLoad={() => setLoaded(true)}
      className={className}
      style={{
        objectFit: "cover",
        opacity: loaded ? 1 : 0,
        transition: "opacity 180ms ease-out",
      }}
    />
  );
}
