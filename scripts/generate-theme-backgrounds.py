#!/usr/bin/env python3
"""Paints DITHAR's appearance themes: the app wallpapers and the prayer-times arch scenes.

Every image is drawn here from scratch (gradients, shapes, seeded noise) — no
photograph or third-party artwork is used, so the output is original work,
dedicated to the public domain (CC0 1.0). Re-running reproduces the same files.
Design target: public/reference/Dithar App Theme Showcase.png.

Output: public/themes/
  wall-<id>.jpg   720×1280 — the Home wallpaper, behind the frosted cards
                  id: classic | night | nature | sunset | sea | mosque | flowers
  arch-<look>.jpg 720×880  — the scene inside the prayer-times arch
                  look: classic | night | nature | sunset
  thumb-<id>.jpg  160×220  — the wallpaper's tile in Settings → Appearance
No symbol is drawn but domes, minarets, a crescent, trees, waves and flowers.

Superseded (2026-10-31): the app now ships photographs in public/themes/
(scripts/prepare-theme-photos.py). This painter writes to scripts/out/drawn-themes/
by default so re-running it can never overwrite them; set DITHAR_DRAWN_THEMES_OUT
to choose another folder.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("DITHAR_DRAWN_THEMES_OUT", os.path.join(ROOT, "scripts", "out", "drawn-themes"))
os.makedirs(OUT, exist_ok=True)


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


class Canvas:
    def __init__(self, w, h, seed):
        self.w, self.h = w, h
        self.img = np.zeros((h, w, 3))
        self.rng = np.random.default_rng(seed)
        self.yy, self.xx = np.mgrid[0:h, 0:w]

    def gradient(self, stops):
        ys = np.linspace(0, 1, self.h)
        pos = [p for p, _ in stops]
        cols = np.array([rgb(c) for _, c in stops])
        for ch in range(3):
            self.img[:, :, ch] = np.interp(ys, pos, cols[:, ch])[:, None]

    def blend(self, alpha, color):
        a = np.clip(alpha, 0, 1)[:, :, None]
        c = rgb(color) if isinstance(color, str) else color
        self.img = self.img * (1 - a) + c * a

    def glow(self, cx, cy, rx, ry, color, strength):
        d = ((self.xx - cx) / rx) ** 2 + ((self.yy - cy) / ry) ** 2
        self.blend(np.exp(-d) * strength, color)

    def band(self, y0, y1, color, strength):
        """A soft horizontal haze between y0 and y1 (fractions)."""
        t = (self.yy / self.h - y0) / max(y1 - y0, 1e-6)
        self.blend(np.clip(1 - np.abs(t * 2 - 1), 0, 1) ** 1.5 * strength, color)

    def stars(self, count, y_max, color="#fff6dc", max_alpha=0.9):
        for _ in range(count):
            x = self.rng.uniform(0, self.w)
            y = self.rng.uniform(0, self.h * y_max) ** 1.0
            r = self.rng.uniform(0.6, 1.7)
            a = self.rng.uniform(0.25, max_alpha) * (1 - y / (self.h * y_max)) ** 0.6
            d = np.sqrt((self.xx - x) ** 2 + (self.yy - y) ** 2)
            self.blend(np.clip((r - d) / 1.2 + 0.5, 0, 1) * a, color)

    def mask_layer(self, draw_fn, ss=2, blur=0.0):
        """An anti-aliased mask (0..1) drawn at ss× then reduced."""
        m = Image.new("L", (self.w * ss, self.h * ss), 0)
        draw_fn(ImageDraw.Draw(m), ss)
        m = m.resize((self.w, self.h), Image.LANCZOS)
        if blur:
            m = m.filter(ImageFilter.GaussianBlur(blur))
        return np.asarray(m, dtype=float) / 255

    def noise(self, amount):
        self.img += self.rng.normal(0, amount, self.img.shape)

    def save(self, name, quality=82):
        os.makedirs(OUT, exist_ok=True)
        im = Image.fromarray(np.clip(self.img, 0, 255).astype(np.uint8))
        im.save(os.path.join(OUT, name), quality=quality, optimize=True, progressive=True)
        return im


def mosque(d: ImageDraw.ImageDraw, ss, cx, base, s, fill=255):
    """A mosque silhouette: a central onion dome on a drum, two side domes, four minarets."""
    def onion(x, y_base, r, fill):
        # Drum-less onion dome: a circle swelling a little wider than its base, with a pointed tip.
        d.ellipse([(x - r) * ss, (y_base - 1.55 * r) * ss, (x + r) * ss, (y_base + 0.25 * r) * ss], fill=fill)
        d.polygon([((x - 0.42 * r) * ss, (y_base - 1.3 * r) * ss), ((x + 0.42 * r) * ss, (y_base - 1.3 * r) * ss), (x * ss, (y_base - 2.15 * r) * ss)], fill=fill)
        d.line([(x * ss, (y_base - 2.1 * r) * ss), (x * ss, (y_base - 2.55 * r) * ss)], fill=fill, width=max(1, int(0.07 * r * ss)))

    hall_w, hall_h = 1.25 * s, 0.32 * s
    d.rectangle([(cx - hall_w / 2) * ss, (base - hall_h) * ss, (cx + hall_w / 2) * ss, base * ss], fill=fill)
    drum_w, drum_h = 0.5 * s, 0.14 * s
    d.rectangle([(cx - drum_w / 2) * ss, (base - hall_h - drum_h) * ss, (cx + drum_w / 2) * ss, (base - hall_h) * ss], fill=fill)
    onion(cx, base - hall_h - drum_h, 0.27 * s, fill)
    for side in (-1, 1):
        sx = cx + side * 0.38 * s
        d.rectangle([(sx - 0.13 * s) * ss, (base - hall_h - 0.06 * s) * ss, (sx + 0.13 * s) * ss, (base - hall_h + 1) * ss], fill=fill)
        onion(sx, base - hall_h - 0.05 * s, 0.13 * s, fill)
        for mx, mh in ((cx + side * 0.72 * s, 0.95 * s), (cx + side * 0.98 * s, 0.72 * s)):
            mw = 0.055 * s
            d.rectangle([(mx - mw / 2) * ss, (base - mh) * ss, (mx + mw / 2) * ss, base * ss], fill=fill)
            for k in (0.55, 0.8):  # balconies
                by = base - mh * k
                d.rectangle([(mx - mw) * ss, (by - 0.015 * s) * ss, (mx + mw) * ss, (by + 0.012 * s) * ss], fill=fill)
            d.polygon([((mx - mw * 0.75) * ss, (base - mh) * ss), ((mx + mw * 0.75) * ss, (base - mh) * ss), (mx * ss, (base - mh - 0.13 * s) * ss)], fill=fill)


def windows(d: ImageDraw.ImageDraw, ss, cx, base, s, fill=255):
    """Lit arched windows along the hall."""
    hall_h = 0.32 * s
    for k in range(-4, 5):
        x = cx + k * 0.12 * s
        w, h = 0.035 * s, 0.09 * s
        y1 = base - hall_h * 0.25
        d.rectangle([(x - w) * ss, (y1 - h) * ss, (x + w) * ss, y1 * ss], fill=fill)
        d.ellipse([(x - w) * ss, (y1 - h - w) * ss, (x + w) * ss, (y1 - h + w) * ss], fill=fill)


def trees(d: ImageDraw.ImageDraw, ss, rng, x0, x1, base, top, count, fill=255):
    """A stand of rounded trees: trunk and clustered canopies."""
    for _ in range(count):
        x = rng.uniform(x0, x1)
        h = rng.uniform(0.6, 1.0) * (base - top)
        r = h * rng.uniform(0.14, 0.22)
        d.rectangle([(x - r * 0.06) * ss, (base - h * 0.55) * ss, (x + r * 0.06) * ss, base * ss], fill=fill)
        for _ in range(11):
            ox, oy = rng.normal(0, r * 0.5), rng.normal(0, r * 0.7)
            rr = r * rng.uniform(0.45, 0.75)
            cy = base - h + r + oy
            d.ellipse([(x + ox - rr) * ss, (cy - rr) * ss, (x + ox + rr) * ss, (cy + rr) * ss], fill=fill)


def reflect(c: Canvas, horizon, tint, strength, blur=2.5):
    """Mirrors everything above the horizon into the water below, tinted and rippled."""
    h = int(horizon)
    above = c.img[:h].copy()
    depth = c.h - h
    refl = above[::-1][:depth]
    if refl.shape[0] < depth:
        refl = np.vstack([refl, np.repeat(refl[-1:], depth - refl.shape[0], axis=0)])
    # Ripples: shift rows sideways a little.
    for y in range(depth):
        shift = int(2.5 * math.sin(y * 0.55) * (y / depth + 0.2))
        refl[y] = np.roll(refl[y], shift, axis=0)
    im = Image.fromarray(np.clip(refl, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    refl = np.asarray(im, dtype=float)
    refl = refl * (1 - strength) + rgb(tint) * strength
    c.img[h:] = refl
    # A thin bright shoreline.
    c.blend(np.exp(-((c.yy - horizon) / 1.6) ** 2) * 0.35, "#fff4dc")


# ---- arch scenes (prayer-times panel) ---------------------------------------

def arch_scene(look):
    W, H = 720, 880
    c = Canvas(W, H, {"classic": 11, "night": 12, "nature": 13, "sunset": 14}[look])
    # The horizon sits a little above the middle and the mosque is modest, so the panel's text (the
    # next prayer, its countdown) falls on the darker water below, as in the reference.
    horizon = H * 0.5
    cx, s = W / 2, W * 0.27
    if look == "classic":
        c.gradient([(0, "#f3dcae"), (0.27, "#f0c98d"), (0.46, "#e8a96a"), (0.5, "#d9935a"), (1, "#7d5a3c")])
        c.glow(cx, horizon - 30, 260, 120, "#fff1c9", 0.85)
        sil, lit, water = "#5b3f2c", "#ffd98a", "#8a6446"
    elif look == "night":
        c.gradient([(0, "#0d1433"), (0.22, "#1e2154"), (0.37, "#40306d"), (0.47, "#a5577a"), (0.5, "#e39a6a"), (1, "#141a38")])
        c.stars(260, 0.5)
        c.glow(cx, horizon - 10, 300, 70, "#ffb877", 0.55)
        sil, lit, water = "#120f26", "#ffcf7a", "#1c2048"
    elif look == "nature":
        c.gradient([(0, "#9ccbe0"), (0.3, "#cfe5e4"), (0.47, "#f2e8c8"), (0.5, "#d9ddb8"), (1, "#4f6a46")])
        c.glow(cx, horizon - 70, 280, 160, "#fff7dc", 0.8)
        sil, lit, water = "#eef0e6", "#fff2c6", "#6f8f6a"
    else:  # sunset
        c.gradient([(0, "#8e7fc7"), (0.22, "#b79ad6"), (0.37, "#e2a7c3"), (0.47, "#f6c3a6"), (0.5, "#f7cfae"), (1, "#5b4c8c")])
        c.glow(cx, horizon - 20, 260, 100, "#fff0d8", 0.6)
        sil, lit, water = "#4f5596", "#ffe2a6", "#7c6aa9"
    # Soft clouds.
    for _ in range(5):
        x, y = c.rng.uniform(0, W), c.rng.uniform(H * 0.12, H * 0.45)
        c.glow(x, y, c.rng.uniform(110, 220), c.rng.uniform(14, 26), "#ffffff", 0.18 if look != "night" else 0.06)
    if look == "night":
        moon = c.mask_layer(lambda d, ss: d.ellipse([(W * 0.74 - 26) * ss, (H * 0.16 - 26) * ss, (W * 0.74 + 26) * ss, (H * 0.16 + 26) * ss], fill=255))
        cut = c.mask_layer(lambda d, ss: d.ellipse([(W * 0.74 - 14) * ss, (H * 0.16 - 32) * ss, (W * 0.74 + 36) * ss, (H * 0.16 + 18) * ss], fill=255))
        c.glow(W * 0.74, H * 0.16, 70, 70, "#fff3cf", 0.25)
        c.blend(moon * (1 - cut), "#fff3cf")
    # Distant hills, the mosque and (nature) trees.
    hills = c.mask_layer(lambda d, ss: d.polygon([(0, horizon * ss)] + [(x * ss, (horizon - 18 - 14 * math.sin(x / 70) - 10 * math.sin(x / 23)) * ss) for x in range(0, W + 1, 8)] + [(W * ss, horizon * ss)], fill=255), blur=1.2)
    c.blend(hills * 0.55, sil)
    body = c.mask_layer(lambda d, ss: mosque(d, ss, cx, horizon, s), blur=0.4)
    if look == "nature":
        c.blend(body, "#f4f1e6")
        shade = c.mask_layer(lambda d, ss: mosque(d, ss, cx + 6, horizon, s), blur=6)
        c.blend(np.clip(shade - body, 0, 1) * 0.45, "#5f6f55")
        c.blend(c.mask_layer(lambda d, ss: windows(d, ss, cx, horizon, s), blur=0.6) * body * 0.5, "#b7a27a")
    else:
        c.blend(body, sil)
        c.blend(c.mask_layer(lambda d, ss: windows(d, ss, cx, horizon, s), blur=0.6) * body * 0.9, lit)
    if look == "nature":
        for x0, x1, col in ((-80, 170, "#56744a"), (W - 170, W + 80, "#56744a"), (-40, 120, "#3d5634"), (W - 120, W + 40, "#3d5634")):
            t = c.mask_layer(lambda d, ss, x0=x0, x1=x1: trees(d, ss, np.random.default_rng(abs(int(x0)) + len(col)), x0, x1, horizon + 6, horizon - 300, 10), blur=1.2)
            c.blend(t * 0.92, col)
    reflect(c, horizon, water, 0.42)
    c.noise(1.4)
    return c.save(f"arch-{look}.jpg")


# ---- wallpapers ---------------------------------------------------------------

def wallpaper(kind):
    W, H = 720, 1280
    c = Canvas(W, H, 100 + ["classic", "night", "nature", "sunset", "sea", "mosque", "flowers"].index(kind))
    if kind == "classic":
        c.gradient([(0, "#fbf6ec"), (0.5, "#f5ecdc"), (1, "#efe2cb")])
        c.glow(W * 0.5, H * 0.12, 420, 260, "#fffaf0", 0.7)
        sil = c.mask_layer(lambda d, ss: mosque(d, ss, W * 0.5, H * 0.17, W * 0.3), blur=2.5)
        c.blend(sil * 0.08, "#b08a52")
        # Faint champagne arches along the bottom.
        def arches(d, ss):
            for k in range(5):
                x = W * (0.1 + 0.2 * k)
                d.arc([(x - 60) * ss, (H * 0.86) * ss, (x + 60) * ss, (H * 0.86 + 160) * ss], 180, 360, fill=255, width=2 * ss)
        c.blend(c.mask_layer(arches, blur=0.6) * 0.12, "#b9955a")
    elif kind == "night":
        c.gradient([(0, "#0a1230"), (0.55, "#101c42"), (1, "#0b1530")])
        c.stars(420, 0.95, max_alpha=0.75)
        c.glow(W * 0.78, H * 0.1, 180, 160, "#33407a", 0.5)
        sil = c.mask_layer(lambda d, ss: mosque(d, ss, W * 0.5, H * 1.0, W * 0.42), blur=2)
        c.blend(sil * 0.35, "#060b1d")
    elif kind == "nature":
        c.gradient([(0, "#e4ead8"), (0.5, "#dfe4cc"), (1, "#c9d3b2")])
        c.glow(W * 0.5, H * 0.25, 380, 320, "#fffbe8", 0.7)
        for x0, x1, top in ((-160, 160, 0.02), (W - 160, W + 160, 0.04)):
            t = c.mask_layer(lambda d, ss, x0=x0, x1=x1, top=top: trees(d, ss, np.random.default_rng(abs(int(x0)) + 7), x0, x1, H * 0.62, H * top, 9), blur=7)
            c.blend(t * 0.55, "#5f7a4f")
        hills = c.mask_layer(lambda d, ss: d.polygon([(0, H * ss)] + [(x * ss, (H * 0.86 - 30 * math.sin(x / 120)) * ss) for x in range(0, W + 1, 10)] + [(W * ss, H * ss)], fill=255), blur=4)
        c.blend(hills * 0.35, "#8ea36f")
    elif kind == "sunset":
        c.gradient([(0, "#a998d8"), (0.35, "#c9a7d8"), (0.65, "#eab4c6"), (1, "#f6cdb5")])
        for _ in range(9):
            c.glow(c.rng.uniform(0, W), c.rng.uniform(H * 0.1, H * 0.8), c.rng.uniform(180, 340), c.rng.uniform(26, 50), "#fff1f2", 0.22)
        c.glow(W * 0.5, H * 0.78, 300, 160, "#ffe3c4", 0.55)
    elif kind == "sea":
        horizon = H * 0.56
        c.gradient([(0, "#8ec5e6"), (0.5, "#cfe8f2"), (0.56, "#f5efe0"), (0.57, "#5aa3c4"), (1, "#1f5f86")])
        c.glow(W * 0.62, horizon - 60, 160, 120, "#fffbe8", 0.75)
        for _ in range(6):
            c.glow(c.rng.uniform(0, W), c.rng.uniform(H * 0.08, H * 0.4), c.rng.uniform(140, 260), 22, "#ffffff", 0.4)
        def waves(d, ss):
            for k in range(40):
                y = horizon + 12 + (k ** 1.6) * 3.2
                if y > H:
                    break
                amp = 2 + k * 0.35
                d.line([(x * ss, (y + amp * math.sin(x / (18 + k) + k)) * ss) for x in range(0, W + 1, 6)], fill=255, width=max(1, int((1 + k * 0.06) * ss)))
        c.blend(c.mask_layer(waves, blur=0.8) * 0.32, "#e9f6fb")
    elif kind == "mosque":
        horizon = H * 0.72
        c.gradient([(0, "#2b3a6a"), (0.4, "#a8698a"), (0.62, "#f0a868"), (0.72, "#f6c487"), (1, "#3d2b2a")])
        c.glow(W * 0.5, horizon - 40, 300, 160, "#ffe1a3", 0.6)
        c.stars(60, 0.3, max_alpha=0.6)
        body = c.mask_layer(lambda d, ss: mosque(d, ss, W * 0.5, horizon, W * 0.4), blur=0.4)
        c.blend(body, "#2d1f22")
        c.blend(c.mask_layer(lambda d, ss: windows(d, ss, W * 0.5, horizon, W * 0.4), blur=0.6) * body * 0.9, "#ffcf7a")
        ground = c.mask_layer(lambda d, ss: d.rectangle([0, horizon * ss, W * ss, H * ss], fill=255))
        c.blend(ground, "#2d1f22")
    else:  # flowers
        c.gradient([(0, "#fbeef0"), (0.5, "#f7e1e6"), (1, "#f1d3db")])
        for _ in range(26):  # out-of-focus blossoms behind
            c.glow(c.rng.uniform(0, W), c.rng.uniform(0, H), c.rng.uniform(40, 110), c.rng.uniform(40, 110), "#f3b9c8", 0.35)
        def blossoms(d, ss):
            rng = np.random.default_rng(5)
            for _ in range(18):
                x, y, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(26, 58)
                if 0.22 * H < y < 0.78 * H and 0.2 * W < x < 0.8 * W:
                    continue  # keep the middle calm, behind the cards
                for p in range(5):
                    a = p * 2 * math.pi / 5 + rng.uniform(0, 1)
                    px, py = x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55
                    d.ellipse([(px - r * 0.5) * ss, (py - r * 0.5) * ss, (px + r * 0.5) * ss, (py + r * 0.5) * ss], fill=255)
        petals = c.mask_layer(blossoms, blur=1.2)
        c.blend(petals * 0.85, "#f6c3d0")
        c.blend(c.mask_layer(blossoms, blur=6) * 0.25, "#e796ab")
    c.noise(1.2)
    im = c.save(f"wall-{kind}.jpg", quality=78)
    thumb = im.copy()
    thumb.thumbnail((160, 284))
    thumb = thumb.crop((0, 32, 160, 252))
    thumb.save(os.path.join(OUT, f"thumb-{kind}.jpg"), quality=80, optimize=True)


if __name__ == "__main__":
    for look in ("classic", "night", "nature", "sunset"):
        arch_scene(look)
    for kind in ("classic", "night", "nature", "sunset", "sea", "mosque", "flowers"):
        wallpaper(kind)
    print("done:", sorted(os.listdir(OUT)))
