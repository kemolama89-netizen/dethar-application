#!/usr/bin/env python3
"""The decorated opening pages' frame (pages 1–2), from DITHAR's design reference.

`public/reference/mushaf-opening-design.png` is a two-page spread: page 1 (Al-Fatiha) on
the left, page 2 (Al-Baqarah) on the right, each a four-sided ornamental frame around a
cream medallion and a title cartouche. Its lettering is NOT the Mushaf's text (wrong verse
markers, a missing verse, misspelt words), so it is never shown: this script clears the
medallion and the cartouche, and layers.mjs draws quran-svg's own 1441H text in them.

  frame.py regions REF WORK   each page's crop, its medallion and cartouche (their cream
                              area's convex hull), and the cleared frame: WORK/frame_N.png
  frame.py fit WORK           where the title and text go (WORK/fit.json), from their ink
                              (WORK/ink_{title,text}_N.png, rendered by layers.mjs ink)

Clearing: inside each hull, shrunk 1 px so the gold ring's own edge stays, every pixel is
replaced by a smooth quadratic fit of that area's own cream background. Nothing else in the
reference is changed; it is never stretched (the reader shows it at an exact 2x).

Needs NumPy, SciPy, scikit-image and Pillow.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import convex_hull_image

REFERENCE_SHA256 = "a9aa7cbdd36a8361e6b2ac202745c854901ac416fe8ebef7e0a1c6339c3774b2"
#: Each page's columns in the reference (the spread's gutter is x 716–720).
CROPS = {"1": (0, 716), "2": (721, 1437)}
#: The page is shown at exactly this multiple of the reference's pixels.
UP = 2
#: The text block's ink reaches this fraction of the medallion (an ellipse); both pages share one scale.
TEXT_FILL = 0.90
#: The title's ink at most fills this much of its cartouche's width and height; both pages share one scale.
TITLE_FILL = (0.72, 0.62)
#: layers.mjs renders the ink at this many pixels per quran-svg unit.
INK_PX = 8


def hulls(page: np.ndarray) -> dict:
    """The medallion's and the cartouche's cream area (convex hull of the cream pixels around each seed)."""
    h, w, _ = page.shape
    r, g, b = page[..., 0], page[..., 1], page[..., 2]
    cream = (r > 225) & (g > 215) & (b > 170) & (r - b < 70)
    labels, _ = ndi.label(cream)
    out = {}
    for key, seed_y in (("medallion", int(h * 0.50)), ("title", int(h * 0.205))):
        ys = np.where(cream[:, w // 2])[0]
        y = ys[np.argmin(abs(ys - seed_y))]
        out[key] = convex_hull_image(labels == labels[y, w // 2])
    return out


def clear(page: np.ndarray, hull: np.ndarray) -> None:
    inner = ndi.binary_erosion(hull, iterations=1)
    r, g, b = page[..., 0], page[..., 1], page[..., 2]
    bg = ndi.binary_erosion(inner & (r > 238) & (g > 230) & (b > 195), iterations=2)
    poly = lambda x, y: np.c_[np.ones_like(x), x, y, x * x, x * y, y * y].astype(float)
    y, x = np.nonzero(bg)
    yi, xi = np.nonzero(inner)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(poly(x, y), page[y, x, c], rcond=None)
        page[yi, xi, c] = poly(xi, yi) @ coef


def box(mask: np.ndarray) -> list:
    """[cx, cy, half-width, half-height] in shown-page pixels (the reference's pixels times UP)."""
    y, x = np.nonzero(mask)
    return [(x.min() + x.max() + 1) / 2 * UP, (y.min() + y.max() + 1) / 2 * UP, (x.max() - x.min() + 1) / 2 * UP, (y.max() - y.min() + 1) / 2 * UP]


def regions(ref_path: str, work: Path) -> None:
    digest = hashlib.sha256(Path(ref_path).read_bytes()).hexdigest()
    if digest != REFERENCE_SHA256:
        sys.exit(f"{ref_path}: SHA-256 {digest}, expected {REFERENCE_SHA256}")
    ref = np.asarray(Image.open(ref_path).convert("RGB")).astype(float)
    geometry = {}
    for page, (x0, x1) in CROPS.items():
        art = ref[:, x0:x1].copy()
        found = hulls(art)
        for hull in found.values():
            clear(art, hull)
        Image.fromarray(np.clip(art.round(), 0, 255).astype(np.uint8)).save(work / f"frame_{page}.png", optimize=True)
        geometry[page] = {"crop": [x0, 0, x1 - x0, ref.shape[0]], "medallion": box(found["medallion"]), "cartouche": box(found["title"])}
    (work / "geometry.json").write_text(json.dumps(geometry, indent=1))


def ink(work: Path, kind: str, page: str, view_box: list) -> tuple:
    a = np.asarray(Image.open(work / f"ink_{kind}_{page}.png"))[..., 3]
    y, x = np.nonzero(a > 64)
    return view_box[0] + (x + 0.5) / INK_PX, view_box[1] + (y + 0.5) / INK_PX


def fit(work: Path) -> None:
    geometry = json.loads((work / "geometry.json").read_text())
    view_boxes = json.loads((work / "viewboxes.json").read_text())
    text, title = {}, {}
    for page, g in geometry.items():
        xs, ys = ink(work, "text", page, view_boxes[page])
        cx, cy, a, b = g["medallion"]
        bx, by = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        text[page] = (bx, by, TEXT_FILL / np.sqrt((((xs - bx) / a) ** 2 + ((ys - by) / b) ** 2).max()))
        xs, ys = ink(work, "title", page, view_boxes[page])
        _, _, hw, hh = g["cartouche"]
        title[page] = ((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2,
                       min(TITLE_FILL[0] * 2 * hw / (xs.max() - xs.min()), TITLE_FILL[1] * 2 * hh / (ys.max() - ys.min())))
    s_text = min(t[2] for t in text.values())
    s_title = min(t[2] for t in title.values())
    out = {}
    for page, g in geometry.items():
        (bx, by, _), (ix, iy, _) = text[page], title[page]
        cx, cy, *_ = g["medallion"]
        tx, ty, *_ = g["cartouche"]
        out[page] = {**g, "size": [g["crop"][2] * UP, g["crop"][3] * UP], "textFill": TEXT_FILL,
                     "text": [s_text, cx - s_text * bx, cy - s_text * by], "title": [s_title, tx - s_title * ix, ty - s_title * iy]}
    (work / "fit.json").write_text(json.dumps(json.loads(json.dumps(out, default=float)), indent=1))


if __name__ == "__main__":
    if sys.argv[1:2] == ["regions"] and len(sys.argv) == 4:
        regions(sys.argv[2], Path(sys.argv[3]))
    elif sys.argv[1:2] == ["fit"] and len(sys.argv) == 3:
        fit(Path(sys.argv[2]))
    else:
        sys.exit(__doc__)
