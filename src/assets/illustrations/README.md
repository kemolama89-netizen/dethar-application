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

## Misc Library ("الأذكار والأدعية المنوعة") category artwork

- `dithar-misc-*.png` (16 files) — one photographic background per Misc
  Library category card, used at `object-fit: cover` the same way as the
  Written Adhkar artwork above.

Source: `ASSETS/dithar-misc-*.png`, one file per category. Those reference
files are read-only source material and were never modified, cropped in
place, overwritten, or renamed. Each one arrived as a small rounded-rect
photo (~15-25px corner radius) inset on a plain white canvas — not
edge-to-edge — which left visible white corner slivers when used as a
full-card `cover` background. The files here are a derived fix, generated
on an in-memory copy of the decoded pixel data:

1. Crop a fixed 26px margin off all four sides — comfortably past every
   source file's rounded-corner radius (measured 13-25px, plus
   anti-aliasing fringe) — removing the white cutout and any stray
   1px border artifact at the image edge entirely.
2. Center-crop that result to the exact aspect ratio the card renders at
   (16:9 for `dithar-misc-general-duas.png`, the one "large" category
   tile; 4:3 for the other 15, all default-size tiles) — cropping only
   the excess width or height needed to hit that ratio, never distorting.
3. Upscale 2x with Lanczos resampling for on-screen crispness at typical
   card sizes.

No new content was invented, redrawn, or outpainted — every output pixel
comes from the original photograph; corners were trimmed, not filled.
Known limitation: the two categories using a rounded-corner-heavy or
sky/cloud-bright composition near their corners lost a little more of
that content to the fixed 26px margin than a per-image-tuned crop would
have, since a single uniform margin (rather than a per-file measurement)
was used across all 16 for consistency — visually negligible at actual
card size.

### The four newly added categories (17-20)

- `dithar-misc-istikhara.png`, `dithar-misc-debt-rizq.png`,
  `dithar-misc-guidance-stability.png`, `dithar-misc-seasonal-worship.png`
  — one background each for الاستخارة، قضاء الدين والرزق، الهداية والثبات،
  العبادة الموسمية.

Source: `ASSETS/` files of the same names, generated externally and
uploaded by the project owner (768x512, larger and higher-resolution than
the original 16). Those files are read-only source material and were
never modified, cropped in place, overwritten, or renamed. They arrived
with the same rounded-rect-photo-on-white-canvas issue as the original 16
(here a larger ~30-40px corner radius plus a thin ~6-11px flat white
border on all four sides — measured per-corner rather than assumed, since
the radius/canvas proportions differ from the first batch). Fixed the
same way, on an in-memory copy:

1. Crop a fixed 45px margin off all four sides — past the measured
   corner radius and the flat border together.
2. Center-crop to the card's 4:3 aspect ratio (all four are default-size
   tiles; none uses the 16:9 "large" slot).
3. Upscale 1.5x with Lanczos (the source was already higher-resolution
   than the first batch, so a smaller upscale factor was enough).

No new content invented; corners and border trimmed, not filled.
