#!/usr/bin/env python3
"""Imports the Madinah Mushaf's decorated opening pages (1–2) — the full-page
ornamental opening spread of the KFGQPC 1441H print — into
public/mushaf/hafs-kfqc-opening/.

Why two sources, one edition:
  * The reader's pages (public/mushaf/hafs-kfqc) are quran-svg's tracing of
    KFGQPC's Digital Mushaf master files, 1441-AI-hafs.zip (1441H, Hafs, the
    "39" layout). Its pages 1–2 carry only a plain green panel: the master files
    hold no other opening decoration (their only layers are Ornaments, Aya No.
    and Quran Text; two inks; nothing hidden).
  * KFGQPC's print PDF of the same Mushaf, standard39-2.pdf ("المصحف العادي"),
    printed 1441H (its colophon: «… تم طبع هذا المصحف الشريف في مجمع الملك فهد …
    عام ١٤٤١هـ وقد كتبه الخطاط عثمان طه»), same page size, carries the full
    ornamental opening spread. Its Qur'an text on these pages is the master's
    own typesetting: the master's text matches it pixel for pixel (≥ 99.9% within
    0.25 pt) — the check below, which this script runs and enforces.

What it does: verifies both archives' SHA-256; writes PDF pages 4 and 5 (Mushaf
pages 1 and 2) embedded page images exactly as stored (lossless PNG, never
resized, cropped or retouched); records the part the reader shows — the
complete decorative design (`displayBox`); registers the master's text on each image (scale
and offset, by FFT cross-correlation) and refuses to continue unless the text
agrees; and writes the transform that places quran-svg's verse shapes on each
image, so tapping a verse works as on every other page.

Usage (needs PyMuPDF and NumPy, e.g. `pip install pymupdf==1.24.10 numpy`):
    curl -O https://cdn.quran.ws/KFGQPC/resources/dm/1441-ai-hafs/1441-AI-hafs.zip
    curl -O https://cdn.quran.ws/KFGQPC/resources/quran-hafs/standard39-2/standard39-2.pdf
    python3 scripts/mushaf/import-opening-pages.py 1441-AI-hafs.zip standard39-2.pdf
"""
import hashlib
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np

MASTER_SHA256 = "280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef"  # 1441-AI-hafs.zip
PRINT_SHA256 = "5c4297de1fb6b654f641eed33242408d89432cbecf8a96ff5d297cb45fea7f07"  # standard39-2.pdf
#: Mushaf page → the print PDF's page that carries it.
PRINT_PAGE = {1: 4, 2: 5}
#: The master's text must be found in the print's image within 1 px (0.25 pt) at least this often.
MIN_TEXT_AGREEMENT = 0.995

ROOT = Path(__file__).resolve().parents[2]
QURAN_SVG = ROOT / "public/mushaf/hafs-kfqc/svg"
OUT = ROOT / "public/mushaf/hafs-kfqc-opening"


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ink(pix: fitz.Pixmap) -> np.ndarray:
    """Near-black pixels: the Qur'an text's ink."""
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
    return a.sum(2) < 220


def dilate(m: np.ndarray, r: int) -> np.ndarray:
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def display_box(path: str):
    """What the reader shows of a page image: the complete decorative design.

    The print's opening is a two-page spread. On each page's binding side
    (left of page 1, right of page 2) a banded border — pink and green rules
    and a diamond chain — runs the full height of the image: it is the inner
    rectangular frame's fourth side (its top and bottom chain bands join it at
    the corners), and it continues past the frame to the top and bottom of the
    sheet. The box therefore spans the full width, including that band (so the
    frame is complete), and the ornament's own height: from the tips of its
    top finials to those of its bottom ones — so the band never runs past the
    design. The image itself is never changed, only this box is shown
    (src/components/QuranReaderScreen.tsx).
    """
    pix = fitz.Pixmap(path)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].astype(int)
    inked = a.sum(2) < 735
    full = inked.mean(0) > 0.97
    band = np.zeros(pix.width, bool)
    for edge in (range(pix.width), range(pix.width - 1, -1, -1)):
        for x in edge:  # a full-height run from either edge
            if not full[x]:
                break
            band[x] = True
    if not band.any() or band.all():
        sys.exit(f"{path}: no binding-side band found")
    xs = np.nonzero(inked.any(0))[0]
    ys = np.nonzero((inked & ~band[None, :]).any(1))[0]
    return [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)], int(band.sum())


def register(master_page: fitz.Page, image_ink: np.ndarray, px_per_pt: float):
    """The scale and pixel offset that place the master page's text on the print's image."""
    h_img, w_img = image_ink.shape
    target = np.fft.rfft2(image_ink.astype(float))

    def placed(scale):
        m = ink(master_page.get_pixmap(matrix=fitz.Matrix(px_per_pt * scale, px_per_pt * scale)))
        canvas = np.zeros((h_img, w_img), bool)
        h, w = min(h_img, m.shape[0]), min(w_img, m.shape[1])
        canvas[:h, :w] = m[:h, :w]
        return canvas

    best = None
    for scale in np.arange(0.994, 1.0061, 0.001):
        canvas = placed(scale)
        corr = np.fft.irfft2(target * np.conj(np.fft.rfft2(canvas.astype(float))), s=(h_img, w_img))
        i = np.unravel_index(np.argmax(corr), corr.shape)
        score = corr[i] / canvas.sum()
        if best is None or score > best[0]:
            best = (score, float(scale), i)
    _, scale, (ty, tx) = best
    ty = ty - h_img if ty > h_img // 2 else ty
    tx = tx - w_img if tx > w_img // 2 else tx
    text = np.roll(np.roll(placed(scale), ty, 0), tx, 1)
    agreement = float((text & dilate(image_ink, 1)).sum() / text.sum())
    return round(scale, 4), int(tx), int(ty), agreement


def main(master_zip: str, print_pdf: str) -> None:
    for path, expected in ((master_zip, MASTER_SHA256), (print_pdf, PRINT_SHA256)):
        actual = sha256_file(path)
        if actual != expected:
            sys.exit(f"{path}: SHA-256 {actual} is not the recorded {expected}")

    printed = fitz.open(print_pdf)
    if shutil.os.path.isdir(OUT / "svg"):
        shutil.rmtree(OUT / "svg")  # the earlier, plain-panel import
    (OUT / "png").mkdir(parents=True, exist_ok=True)
    pages, sums = {}, []
    with zipfile.ZipFile(master_zip) as zf:
        names = {re.search(r"/(\d{3})___Hafs39__DM\.ai$", n).group(1): n for n in zf.namelist() if re.search(r"/\d{3}___Hafs39__DM\.ai$", n)}
        for n, pdf_page in PRINT_PAGE.items():
            page = printed[pdf_page - 1]
            (xref, *_), = page.get_images(full=True)
            stored = printed.extract_image(xref)
            if stored["ext"] != "png":
                sys.exit(f"print page {pdf_page}: expected a lossless image, found {stored['ext']}")
            out = OUT / "png" / f"{n:03d}.png"
            out.write_bytes(stored["image"])
            width, height = stored["width"], stored["height"]
            placed_at = page.get_image_rects(xref)[0]
            px_per_pt = width / placed_at.width
            if abs(height / placed_at.height - px_per_pt) > 0.01:
                sys.exit(f"print page {pdf_page}: the image is not placed at its own proportions")

            # Register the master's page n on this image (both on the same 382.68 × 547.09 pt page).
            master_page = fitz.open(stream=zf.read(names[f"{n:03d}"]), filetype="pdf")[0]
            image_ink = ink(fitz.Pixmap(str(out)))
            scale, tx, ty, agreement = register(master_page, image_ink, px_per_pt)
            if agreement < MIN_TEXT_AGREEMENT:
                sys.exit(f"Mushaf page {n}: the master's text matches the print's only {agreement:.2%} — not the same typesetting")

            # quran-svg's page n = the master's PDF space (y up) through matrix(a 0 0 d e f). Composed with the
            # master page (y down) → image pixels (× px_per_pt × scale, + offset):
            head = (QURAN_SVG / f"{n:03d}.svg").read_text(encoding="utf-8")[:1000]
            a, _, _, d, e, f = map(float, re.search(r"matrix\(([^)]+)\)", head).group(1).split())
            k = px_per_pt * scale
            h_master = master_page.mediabox.height
            matrix = [k / a, 0, 0, -k / d, -k * e / a + tx, k * (h_master + f / d) + ty]
            box, strip_width = display_box(str(out))
            pages[str(n)] = {
                "image": f"png/{n:03d}.png",
                "viewBox": f"0 0 {width} {height}",
                # The part shown, in image pixels: the complete design — its full width, including the
                # binding-side band (`bindingBand` px, the frame's fourth side), and the ornament's own height.
                "displayBox": " ".join(map(str, box)),
                "bindingBand": strip_width,
                "shapeTransform": "matrix(" + " ".join(f"{v:.6f}" for v in matrix) + ")",
                "printPage": pdf_page,
                "textAgreement": round(agreement, 4),
                "registration": {"scale": scale, "offsetPx": [tx, ty], "pxPerPt": round(px_per_pt, 4)},
            }
            sums.append(f"{hashlib.sha256(out.read_bytes()).hexdigest()}  png/{n:03d}.png")
            print(f"page {n}: {width}×{height} px from print page {pdf_page}; text agreement {agreement:.2%}; scale {scale}, offset ({tx}, {ty}) px; shown: {box} (binding-side band, {strip_width} px, included)")
    (OUT / "SHA256SUMS").write_text("\n".join(sums) + "\n")
    (ROOT / "src/data/quran/kfqc-hafs-1441-opening.json").write_text(
        json.dumps({"masterSha256": MASTER_SHA256, "printSha256": PRINT_SHA256, "pages": pages}, indent=2) + "\n"
    )


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
