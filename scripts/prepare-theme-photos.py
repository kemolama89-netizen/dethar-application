#!/usr/bin/env python3
"""Builds public/themes/ (the appearance themes' photographs) from Wikimedia Commons.

Every source is a photograph on Wikimedia Commons under CC0 or CC BY (see
public/themes/README.md for the credits the CC BY ones require). This script
downloads each one (1600-1920 px wide), crops it around its subject and writes:

  wall-<id>.jpg        720×1280  the Home wallpaper (portrait, full screen)
  thumb-<id>.jpg       200×250   its tile in Settings → Appearance
  arch-<look>.jpg      720×900   the prayer-times arch scene of a look
  thumb-arch-<look>.jpg 200×250  the look's tile in Settings → Appearance

Usage:  python3 scripts/prepare-theme-photos.py [--cache DIR]
The downloads are cached in DIR (default: a temp folder), never committed.
"""
from __future__ import annotations

import argparse
import json
import os
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "themes"
UA = {"User-Agent": "DitharThemePhotos/1.0 (https://github.com/kemolama89-netizen)"}

# key -> (Commons file, focal x 0..1, focal y 0..1, grade[, zoom])
# The focal point is kept in the crop (zoom > 1 frames it tighter); "grade" nudges the colours toward the look.
# The arch scenes put the mosque in the upper-middle: the lower part sits under the shade and the prayer times.
SOURCES: dict[str, tuple] = {
    # Prayer-times arch scenes, one per look. (The "Blue Mosque In Dawn" crop leaves out its corner watermark.)
    "arch-classic": ("File:Blue Mosque In Dawn (122678105).jpeg", 0.58, 0.8, "warm", 1.45),
    "arch-night": ("File:Sultan Omar Ali Saifuddin Mosque at dusk (18404471080).jpg", 0.5, 0.45, "none"),
    "arch-nature": ("File:Ahmet Hamdi Akseki Mosque, Ankara 04.jpg", 0.6, 0.72, "fresh", 1.3),
    "arch-sunset": ("File:Sultan Omar Ali Saifuddin Mosque. Brunei. (35021907632).jpg", 0.74, 0.55, "none"),
    # Home wallpapers.
    "wall-classic": ("File:Hiking Through Sand Dunes (Unsplash).jpg", 0.42, 0.5, "soft"),
    "wall-night": ("File:Stars Sky Banff (Unsplash).jpg", 0.5, 0.5, "none"),
    "wall-nature": ("File:Hintersee Lake House Forest (Unsplash).jpg", 0.62, 0.5, "fresh"),
    "wall-sunset": ("File:Sunset in Vancouver (Unsplash).jpg", 0.5, 0.5, "none"),
    "wall-sea": ("File:Drone view of ocean waves (Unsplash).jpg", 0.5, 0.5, "calm"),
    "wall-mosque": ("File:Kocatepe Camii, Ankara.jpg", 0.5, 0.5, "none"),
    "wall-flowers": ("File:Flowers (Unsplash 4kX1uoAAohY).jpg", 0.36, 0.5, "none"),
}


def fetch(title: str, cache: Path) -> Path:
    path = cache / (title.replace("File:", "").replace("/", "_"))
    if path.exists():
        return path
    query = {"action": "query", "format": "json", "titles": title, "prop": "imageinfo", "iiprop": "url", "iiurlwidth": "1920"}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(query)
    data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
    info = next(iter(data["query"]["pages"].values()))["imageinfo"][0]
    path.write_bytes(urllib.request.urlopen(urllib.request.Request(info["thumburl"], headers=UA), timeout=60).read())
    time.sleep(2)  # be gentle with Commons
    return path


def cover(img: Image.Image, size: tuple[int, int], fx: float, fy: float, zoom: float = 1.0) -> Image.Image:
    """Crops to the target aspect around the focal point (zoom > 1: a tighter crop), then resizes."""
    w, h = img.size
    tw, th = size
    scale = max(tw / w, th / h) * zoom
    cw, ch = round(tw / scale), round(th / scale)
    left = min(max(round(fx * w - cw / 2), 0), w - cw)
    top = min(max(round(fy * h - ch / 2), 0), h - ch)
    return img.crop((left, top, left + cw, top + ch)).resize(size, Image.LANCZOS)


def grade(img: Image.Image, kind: str) -> Image.Image:
    if kind == "warm":  # golden hour: warmer, a touch richer
        r, g, b = img.split()
        img = Image.merge("RGB", (r.point(lambda v: min(255, v * 1.06)), g.point(lambda v: v * 1.0), b.point(lambda v: v * 0.86)))
        return ImageEnhance.Color(img).enhance(1.05)
    if kind == "fresh":  # greener, slightly brighter
        img = ImageEnhance.Color(img).enhance(1.08)
        return ImageEnhance.Brightness(img).enhance(1.04)
    if kind == "soft":  # a calm, bright page behind light cards
        img = ImageEnhance.Color(img).enhance(0.85)
        return ImageEnhance.Brightness(img).enhance(1.08)
    if kind == "calm":  # fine water texture: a whisper of softening keeps it calm (and the file small)
        return img.filter(ImageFilter.GaussianBlur(2.2))
    return img


MAX_BYTES = 115_000  # src/theme/looks.test.ts keeps every theme image under 120 KB


def save_fitted(img: Image.Image, path: Path, quality: int) -> None:
    """Saves at the given JPEG quality, stepping down until the file fits MAX_BYTES (never below 60)."""
    while True:
        img.save(path, quality=quality, optimize=True, progressive=True)
        if path.stat().st_size <= MAX_BYTES or quality <= 60:
            return
        quality -= 3


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=os.path.join(tempfile.gettempdir(), "dithar-theme-photos"))
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for key, (title, fx, fy, kind, *rest) in SOURCES.items():
        zoom = rest[0] if rest else 1.0
        src = grade(Image.open(fetch(title, cache)).convert("RGB"), kind)
        kind_name, ident = key.split("-", 1)
        if kind_name == "wall":
            save_fitted(cover(src, (720, 1280), fx, fy), OUT / f"wall-{ident}.jpg", 80)
            cover(src, (200, 250), fx, fy).save(OUT / f"thumb-{ident}.jpg", quality=78, optimize=True)
        else:
            save_fitted(cover(src, (720, 900), fx, fy, zoom), OUT / f"arch-{ident}.jpg", 84)
            cover(src, (200, 250), fx, fy, zoom).save(OUT / f"thumb-arch-{ident}.jpg", quality=78, optimize=True)
        print("wrote", key)


if __name__ == "__main__":
    main()
