#!/usr/bin/env python3
"""Extracts the four Written Adhkar category artworks from the single
combined reference image (ASSETS/dithar-adhkar-icons.png — a 2x2 montage
on a black canvas, one artwork per quadrant) into four standalone,
full-bleed WebP files.

IMPORTANT: these are meant to fill the ENTIRE image area of a card edge to
edge (`object-fit: cover` in WrittenAdhkarCategoryCard) with NO visible
margin, halo, or transparent border of any kind — not a small icon, not
an inset panel with breathing room around it. An earlier version of this
script cropped to a soft *ellipse*, which baked a circular silhouette
into the file and made the artwork read as a round badge; a version after
that added a transparent straight-edge feather intended to blend a
*smaller, inset* panel into the ivory card — but once the artwork covers
the card completely (this version's actual use), that feather itself
became exactly the kind of visible margin this is meant to avoid, so it's
gone too. This version outputs a plain, fully OPAQUE rectangular crop: no
alpha channel, no edge fade, artwork pixels reaching all four sides of
the file. The only remaining non-crop treatment is a global,
LUMINANCE-based shadow lift that blends genuinely dark tones toward the
ivory card color *everywhere in the crop*, position-independent — it
softens the artwork's own built-in glow vignette in the corners without
touching bright content (moon, gold linework, sun disc sit well above the
threshold) and without changing the image's shape or opacity. Output is
WebP (not PNG) — much smaller for the same visual quality on this kind of
soft-gradient art, which matters since these load at runtime on first
paint of the category screen.

Run from the repo root: python3 scripts/extract-adhkar-icons.py
Requires: pip install pillow numpy
"""

import numpy as np
from PIL import Image

SRC = "ASSETS/dithar-adhkar-icons.png"
OUT_DIR = "src/assets/illustrations"

# Card surface color (--wa-surface, both themes sit close to this) — the
# shadow lift blends dark corners toward this tone so it reads as a warm
# fade rather than a cool grey/black one.
IVORY = np.array([252, 250, 244], dtype=np.float32)

# Luminance-based shadow lift: pixels at/under SHADOW_THRESH (0..1 of max
# channel) get blended toward IVORY by up to SHADOW_LIFT, scaled by how
# dark they are (darkest pixels get the most lift). This targets the
# artwork's own background/vignette tones specifically — content bright
# enough to matter (moon, gold, sun disc) sits well above the threshold
# and is essentially untouched.
SHADOW_THRESH = 0.34
SHADOW_LIFT = 0.62
SHADOW_GAMMA = 1.4

# name -> (quadrant row, quadrant col, left, top, right, bottom) — a plain
# rectangular crop box in that quadrant's own 0..768 x 0..512 pixel space.
# Bounds were hand-tuned around each icon's own content spread (measured,
# not eyeballed) so the crop is tight enough to fill a card at 70-80% but
# wide enough to keep every appendage (star tip, reflection lines, arch
# steps, leaf tips) fully inside the frame.
ICONS = {
    "adhkar-morning": (0, 0, 210, 10, 712, 480),
    "adhkar-evening": (0, 1, 77, 0, 571, 489),
    "adhkar-prayer": (1, 0, 186, 6, 760, 466),
    "adhkar-misc": (1, 1, 57, 0, 563, 512),
}

# Cards display these around a third of the mobile viewport width — cap
# the long edge above that ceiling (incl. retina) for headroom, not at
# source resolution (~650px), to keep the four assets light.
MAX_DIMENSION = 560
WEBP_QUALITY = 82


def main():
    im = Image.open(SRC).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    H, W, _ = arr.shape
    qh, qw = H // 2, W // 2

    for name, (row, col, left, top, right, bottom) in ICONS.items():
        y0, x0 = row * qh, col * qw
        tile = arr[y0 : y0 + qh, x0 : x0 + qw, :]
        left, top = max(left, 0), max(top, 0)
        right, bottom = min(right, qw), min(bottom, qh)
        crop = tile[top:bottom, left:right, :]

        # Shadow lift — luminance-based, position-independent. Reduces the
        # artwork's own dark vignette everywhere it occurs, without any
        # alpha/shape/crop change — the output stays a plain, fully opaque
        # rectangle with real artwork pixels touching all four edges.
        luminance = crop.max(axis=2) / 255.0
        shadow_amount = np.clip((SHADOW_THRESH - luminance) / SHADOW_THRESH, 0, 1) ** SHADOW_GAMMA
        lift = shadow_amount * SHADOW_LIFT
        lifted = crop * (1 - lift[..., None]) + IVORY * lift[..., None]

        out_im = Image.fromarray(lifted.astype(np.uint8), mode="RGB")

        if max(out_im.size) > MAX_DIMENSION:
            scale = MAX_DIMENSION / max(out_im.size)
            new_size = (round(out_im.width * scale), round(out_im.height * scale))
            out_im = out_im.resize(new_size, Image.LANCZOS)

        out_path = f"{OUT_DIR}/{name}.webp"
        out_im.save(out_path, format="WEBP", quality=WEBP_QUALITY, method=6)
        print(f"{name} -> {out_im.size} saved to {out_path}")


if __name__ == "__main__":
    main()
