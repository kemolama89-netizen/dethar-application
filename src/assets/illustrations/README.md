# Card illustration assets — provenance

These four PNGs are extracted from the approved reference designs:

- `ASSETS/dithar-home-men-ar.png`
- `ASSETS/dithar-home-women-ar.png`

Those two reference files are read-only source material and were never
modified, cropped in place, overwritten, or renamed — the crop happens on
an in-memory copy of the decoded pixel data; the process only ever writes
new files here.

Files:

- `quran-insight-men.png` / `quran-insight-women.png` — the Qur'an-stand +
  vase + botanical-branch + niche/arch illustration next to the "لطيفة
  قرآنية" card, one per theme (the two reference designs use different
  artwork — a dark vase with golden branches for men, a lighter ceramic
  vase with sage-green branches for women).
- `hadith-men.png` / `hadith-women.png` — the hanging-lantern + Qur'an +
  books + niche/arch illustration next to the "حديث نبوي" card, one per
  theme (different lantern/book styling per theme, matching each
  reference).

How they were made: each illustration was cropped out of its reference
screenshot, then the flat card-background color surrounding it was keyed
to transparent (same technique as the derived logo — sample the background
color, make pixels close to it transparent with a soft feather band for
anti-aliased edges, leave every other pixel's RGB untouched). The
niche/arch backdrop itself is preserved as part of the artwork since its
texture/shading differs from the flat surrounding card color; only the
genuinely flat background was removed. No part of the illustration was
redrawn, recolored, or reconstructed.

Known limitation: a faint trace of the reference card's rounded top-right
corner survives as a very subtle arc in some of these crops (the pixels
there sit in the keying's soft-feather zone rather than fully flat
background). It's minor at the card's actual on-screen size but is a
known imperfection of the crop, not a redraw.

## Written Adhkar category artwork

- `adhkar-morning.webp`, `adhkar-evening.webp`, `adhkar-prayer.webp`,
  `adhkar-misc.webp` — the four Written Adhkar category-card artworks
  (dawn/sunrise, crescent moon + stars, mihrab arch, botanical branch),
  one per category, used in both themes. WebP, not PNG — ~15KB each vs.
  ~250-300KB as PNG for this kind of soft-gradient art, which matters
  since these load at runtime the moment the category screen mounts.

Source: `ASSETS/dithar-adhkar-icons.png`, a single 2x2 montage (one
artwork per quadrant) on a black canvas. That reference file is read-only
source material and was never modified — extraction happens on an
in-memory copy via `scripts/extract-adhkar-icons.py` (run with
`python3 scripts/extract-adhkar-icons.py` from the repo root; requires
`pillow` + `numpy`), which only ever writes the four files here.

How they were made: unlike the flat-background keying above, this
artwork's background is a soft glow that blends continuously from full
color to black with no hard edge — and for the warmer-toned icons
(morning, misc) there's no reliable *color* difference between "glow" and
"foreground" either, so a chroma-key by color/luminance was not usable
here (early attempts either left visible grey/black cloud remnants or ate
into real content like the evening icon's navy sky — see git history on
this file's script if resurrecting that approach). Instead each quadrant
is cropped to a plain **rectangle** (a generous bounding box hand-tuned
around each icon's own content spread), then a global, luminance-based
"shadow lift" blends only genuinely dark tones toward the ivory card
color *everywhere in the crop* — position-independent, so it softens the
artwork's own built-in glow vignette in the corners without ever touching
bright content (moon, gold linework, sun disc sit well above the shadow
threshold). The result is a plain, fully **opaque** rectangle — no alpha
channel, no transparent or faded margin of any kind, artwork pixels
reaching all four edges of the file. No part of any artwork was redrawn,
recolored, or reconstructed.

These render at `object-fit: cover` filling the ENTIRE image area of each
card (`WrittenAdhkarCategoryCard`) edge to edge, with no visible margin
around the artwork. Two earlier versions of this script are worth noting
so they aren't reintroduced by accident: one cropped to a soft *ellipse*,
which baked a circular silhouette into the file and made every icon read
as a small round badge no matter how large it was displayed; the next
fixed that with a rectangular crop but added a transparent straight-edge
feather meant to blend a *smaller, inset* panel into the ivory card — once
the artwork was made to cover the whole card instead, that feather itself
became a visible margin around the artwork, which is exactly what this
version removes. Both approaches were rejected; neither is what's in
these files now.

Known limitation: because the source has no true edge for these icons (the
artist's own glow fades gradually, it doesn't stop), the crop rectangle is
a judgment call baked into the script's per-icon constants — tight enough
that the file is mostly real artwork, loose enough not to clip real
content (arch pillars, leaf tips, the star ornament's wire). The shadow
lift reduces but doesn't fully erase a soft dark falloff in the corners
of evening/prayer/misc at full zoom; that's the artwork's own built-in
glow vignette (present in the source at this crop tightness), not
something this script added — lifting it further starts washing out real
shadow detail, and cropping tighter starts clipping real content.
`object-fit: cover` also crops some of this away automatically wherever a
card's aspect ratio differs from the source rectangle's.
