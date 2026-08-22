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
