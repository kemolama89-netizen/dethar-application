#!/usr/bin/env python3
"""Paints DITHAR's reminder / widget backgrounds.

Every image is drawn here from scratch (gradients, shapes, seeded noise) —
no photograph or third-party artwork is used, so the output is original
work, dedicated to the public domain (CC0 1.0). Re-running reproduces the
same files.

Output: public/backgrounds/<id>.jpg, 720×1280 (portrait). The main elements
(horizon, sun/moon, silhouettes) sit in the middle band so the same image
also reads well centre-cropped into a wide home-screen widget. Text is never
baked in — the app and widget overlay it with a readability scrim.

  <period>-<season>   period: dawn | day | sunset | night
                      season: spring | summer | autumn | winter
  pattern-navy, pattern-sage, arches-dusk, mosque-night   (Islamic-inspired)
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 720, 1280
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "backgrounds")


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient(stops):
    """Vertical gradient from [(position 0..1, '#rrggbb'), ...]."""
    ys = np.linspace(0, 1, H)
    img = np.zeros((H, W, 3))
    pos = [p for p, _ in stops]
    cols = np.array([hex_rgb(c) for _, c in stops], dtype=float)
    for ch in range(3):
        img[:, :, ch] = np.interp(ys, pos, cols[:, ch])[:, None]
    return img


def glow(img, cx, cy, radius, color, strength):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    a = np.clip(np.exp(-d * d) * strength, 0, 1)[:, :, None]
    return img * (1 - a) + np.array(hex_rgb(color)) * a


def disc(img, cx, cy, r, color, soft=2.0):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip((r - d) / soft + 0.5, 0, 1)[:, :, None]
    return img * (1 - a) + np.array(hex_rgb(color)) * a


def crescent(img, cx, cy, r, color):
    sky = img.copy()  # the "shadow" disc restores the sky itself, so the crescent stays clean on any gradient
    img = glow(img, cx, cy, r * 4, color, 0.22)
    lit = disc(img, cx, cy, r, color)
    yy, xx = np.mgrid[0:H, 0:W]
    ox, oy = cx + r * 0.42, cy - r * 0.2
    d = np.sqrt((xx - ox) ** 2 + (yy - oy) ** 2)
    a = np.clip((r * 0.88 - d) / 1.5 + 0.5, 0, 1)[:, :, None]
    halo = glow(sky, cx, cy, r * 4, color, 0.22)
    return lit * (1 - a) + halo * a


def stars(img, rng, count, top, bottom, brightness=1.0):
    for _ in range(count):
        x, y = rng.integers(0, W), rng.integers(int(top * H), int(bottom * H))
        b = rng.uniform(0.35, 1.0) * brightness
        r = rng.choice([0.8, 1.0, 1.3, 1.8], p=[0.5, 0.3, 0.15, 0.05])
        y0, y1, x0, x1 = max(0, y - 3), min(H, y + 4), max(0, x - 3), min(W, x + 4)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        a = np.clip((r - np.sqrt((xx - x) ** 2 + (yy - y) ** 2)) + 0.5, 0, 1) * b
        img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - a[:, :, None]) + 255 * a[:, :, None]
    return img


def ridge(rng, base, amp, waves, phase_seed):
    x = np.arange(W)
    y = np.full(W, base, dtype=float)
    for k in range(waves):
        f = rng.uniform(0.6, 2.8) * (k + 1) / W * 2 * math.pi
        y += amp / (k + 1) * np.sin(f * x + rng.uniform(0, 2 * math.pi) + phase_seed)
    return y


def fill_below(img, curve, color, alpha=1.0, snow=None):
    yy = np.arange(H)[:, None]
    mask = (yy >= curve[None, :]).astype(float)
    layer = np.zeros_like(img) + np.array(hex_rgb(color))
    # A soft vertical shading on each layer for depth.
    shade = np.clip((yy - curve[None, :]) / 500, 0, 1)[:, :, None] * 0.25
    layer = layer * (1 - shade)
    if snow is not None:
        cap = ((yy >= curve[None, :]) & (yy < curve[None, :] + snow)).astype(float)[:, :, None]
        layer = layer * (1 - cap * 0.85) + 245 * cap * 0.85
    a = (mask * alpha)[:, :, None]
    return img * (1 - a) + layer * a


def clouds(img, rng, count, top, bottom, color, alpha):
    pil = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(pil)
    for _ in range(count):
        cx, cy = rng.uniform(-60, W + 60), rng.uniform(top * H, bottom * H)
        for _ in range(6):
            rx, ry = rng.uniform(40, 110), rng.uniform(14, 34)
            ox, oy = rng.uniform(-90, 90), rng.uniform(-14, 14)
            d.ellipse([cx + ox - rx, cy + oy - ry, cx + ox + rx, cy + oy + ry], fill=255)
    mask = np.asarray(pil.filter(ImageFilter.GaussianBlur(18)), dtype=float)[:, :, None] / 255 * alpha
    return img * (1 - mask) + np.array(hex_rgb(color)) * mask


def mosque_silhouette(draw, cx, base, scale, color, ground=None):
    s = scale
    bottom = base + 400 if ground is None else ground
    draw.rectangle([cx - 70 * s, base - 60 * s, cx + 70 * s, bottom], fill=color)
    draw.pieslice([cx - 60 * s, base - 150 * s, cx + 60 * s, base - 30 * s], 180, 360, fill=color)
    draw.polygon([(cx - 4 * s, base - 150 * s), (cx, base - 178 * s), (cx + 4 * s, base - 150 * s)], fill=color)
    for side in (-1, 1):
        mx = cx + side * 105 * s
        draw.rectangle([mx - 9 * s, base - 190 * s, mx + 9 * s, bottom], fill=color)
        draw.rectangle([mx - 13 * s, base - 150 * s, mx + 13 * s, base - 142 * s], fill=color)
        draw.polygon([(mx - 10 * s, base - 190 * s), (mx, base - 222 * s), (mx + 10 * s, base - 190 * s)], fill=color)
        draw.pieslice([cx + side * 75 * s - 28 * s, base - 95 * s, cx + side * 75 * s + 28 * s, base - 40 * s], 180, 360, fill=color)
        draw.rectangle([cx + side * 75 * s - 28 * s, base - 68 * s, cx + side * 75 * s + 28 * s, bottom], fill=color)


def palm(draw, x, base, h, color, lean):
    pts = [(x + lean * (t ** 2) * h * 0.25, base - t * h) for t in np.linspace(0, 1, 12)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        draw.line([x0, y0, x1, y1], fill=color, width=max(3, int(h * 0.035)))
    tx, ty = pts[-1]
    for angle in np.linspace(-160, -20, 7):
        a = math.radians(angle)
        length = h * 0.42
        mx, my = tx + math.cos(a) * length * 0.55, ty + math.sin(a) * length * 0.35
        ex, ey = tx + math.cos(a) * length, ty + math.sin(a) * length * 0.25 + length * 0.35
        draw.line([tx, ty, mx, my, ex, ey], fill=color, width=max(3, int(h * 0.03)), joint="curve")


def finish(img, rng, vignette=0.35, grain=3.0):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    img = img * (1 - vignette * np.clip(d - 0.55, 0, 1)[:, :, None])
    img = img + rng.normal(0, grain, img.shape)  # breaks gradient banding
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


SKIES = {
    "dawn": [(0, "#2b3a67"), (0.35, "#6b6fa8"), (0.55, "#e7a6a1"), (0.68, "#f7d3a6"), (1, "#f9e7c9")],
    "day": [(0, "#3d7cc9"), (0.45, "#8fc0ea"), (0.7, "#d6ecf8"), (1, "#eef6fb")],
    "sunset": [(0, "#2a2350"), (0.3, "#7a3e6e"), (0.5, "#e0745a"), (0.65, "#f6b26b"), (1, "#f8d79a")],
    "night": [(0, "#050a1c"), (0.45, "#0f1d40"), (0.7, "#1d2f5e"), (1, "#24386a")],
}
SEASON_TINT = {  # (sky multiply, land colours back→front, snow)
    "spring": ((1.0, 1.02, 0.98), ["#7fae84", "#4f8a5c", "#2f6343"], None),
    "summer": ((1.04, 1.0, 0.94), ["#d8b27a", "#c08f52", "#9a6a35"], None),
    "autumn": ((1.05, 0.97, 0.9), ["#c2875a", "#9c5b39", "#6f3d27"], None),
    "winter": ((0.94, 0.98, 1.06), ["#9fb1c6", "#7489a3", "#4f6280"], 26),
}


def landscape(period, season, seed):
    rng = np.random.default_rng(seed)
    tint, land, snow = SEASON_TINT[season]
    img = gradient(SKIES[period]) * np.array(tint)
    horizon = H * 0.66
    if period == "night":
        img = stars(img, rng, 260, 0.02, 0.6)
        img = crescent(img, W * 0.7, H * 0.36, 34, "#f6efd2")
    elif period == "day":
        img = glow(img, W * 0.78, H * 0.3, 260, "#fffbe8", 0.55)
        img = disc(img, W * 0.78, H * 0.3, 38, "#fff9e3", soft=6)
        img = clouds(img, rng, 5, 0.18, 0.5, "#ffffff", 0.75)
    elif period == "dawn":
        img = glow(img, W * 0.42, horizon - 10, 380, "#ffe2b8", 0.75)
        img = disc(img, W * 0.42, horizon + 6, 46, "#fff1d6", soft=8)
        img = clouds(img, rng, 4, 0.3, 0.55, "#f3b9b0", 0.45)
    else:  # sunset
        img = glow(img, W * 0.5, horizon - 20, 420, "#ffb36b", 0.8)
        img = disc(img, W * 0.5, horizon - 4, 58, "#ffd38a", soft=6)
        img = clouds(img, rng, 4, 0.25, 0.52, "#d77a7a", 0.4)
    dark = period in ("night", "sunset")
    for i, color in enumerate(land):
        base = horizon + i * 70
        amp = (60 if season == "winter" and i == 0 else 26) - i * 4
        curve = ridge(rng, base, amp, 3, i)
        c = np.array(hex_rgb(color))
        if dark:
            c = c * (0.35 if period == "night" else 0.55) + np.array(hex_rgb("#1a1630")) * (0.4 if period == "night" else 0.2)
        img = fill_below(img, curve, "#%02x%02x%02x" % tuple(np.clip(c, 0, 255).astype(int)), 1.0, snow if (snow and i == 0) else None)
    pil = finish(img, rng)
    if period in ("sunset", "night"):
        d = ImageDraw.Draw(pil)
        sil = (24, 18, 36) if period == "sunset" else (8, 12, 28)
        if period == "night":
            mosque_silhouette(d, W * 0.3, horizon + 10, 0.5, sil, ground=horizon + 40)
        elif season in ("summer", "autumn"):
            palm(d, W * 0.16, horizon + 140, 300, sil, 1.0)
            palm(d, W * 0.86, horizon + 150, 240, sil, -0.8)
    return pil


def khatam_pattern(bg_top, bg_bottom, line, seed):
    rng = np.random.default_rng(seed)
    img = gradient([(0, bg_top), (1, bg_bottom)])
    pil = finish(img, rng, vignette=0.25, grain=2.0)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cell = 170
    col = hex_rgb(line) + (165,)
    for gy in range(-1, H // cell + 2):
        for gx in range(-1, W // cell + 2):
            cx, cy = gx * cell + (cell / 2 if gy % 2 else 0), gy * cell * 0.87
            r1, r2 = cell * 0.48, cell * 0.2
            pts = []
            for k in range(16):
                a = math.pi / 8 * k + math.pi / 16
                r = r1 if k % 2 == 0 else r2 * 1.55
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
            d.line(pts + [pts[0]], fill=col, width=3)
            sq = [(cx + cell * 0.18 * math.cos(math.pi / 4 * k), cy + cell * 0.18 * math.sin(math.pi / 4 * k)) for k in range(8)]
            d.line(sq + [sq[0]], fill=hex_rgb(line) + (110,), width=2)
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    pil = Image.alpha_composite(pil.convert("RGBA"), overlay)
    # A soft central glow keeps the middle calm for text.
    arr = np.asarray(pil.convert("RGB"), dtype=float)
    arr = glow(arr, W / 2, H * 0.48, 330, bg_bottom, 0.45)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def arches_dusk(seed):
    rng = np.random.default_rng(seed)
    img = gradient([(0, "#1d2448"), (0.45, "#6b4a7a"), (0.7, "#e39a74"), (1, "#f4c48e")])
    img = glow(img, W * 0.5, H * 0.62, 400, "#ffc98a", 0.6)
    pil = finish(img, rng, vignette=0.2)
    d = ImageDraw.Draw(pil)
    wall = (22, 18, 34)
    d.rectangle([0, 0, W, H * 0.12], fill=wall)
    d.rectangle([0, H * 0.86, W, H], fill=wall)
    for i, x in enumerate((0, W / 3, 2 * W / 3, W)):
        d.rectangle([x - 34, 0, x + 34, H], fill=wall)
    for i in range(3):
        x0, x1 = i * W / 3 + 34, (i + 1) * W / 3 - 34
        top = H * 0.12
        mid = (x0 + x1) / 2
        d.polygon([(x0, top), (x0, top + 140), (mid, top + 40), (x1, top + 140), (x1, top)], fill=wall)
    arr = np.asarray(pil, dtype=float)
    for i in range(3):
        lx = i * W / 3 + W / 6
        ly = H * 0.12 + 120 + (i % 2) * 40
        arr = glow(arr, lx, ly + 60, 70, "#ffd27a", 0.7)
    pil = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil)
    for i in range(3):
        lx = i * W / 3 + W / 6
        ly = H * 0.12 + 120 + (i % 2) * 40
        d.line([lx, H * 0.12 + 40, lx, ly + 30], fill=(40, 30, 40), width=2)
        d.polygon([(lx - 16, ly + 30), (lx + 16, ly + 30), (lx + 22, ly + 70), (lx, ly + 100), (lx - 22, ly + 70)], fill=(255, 210, 130))
    return pil


def mosque_night(seed):
    rng = np.random.default_rng(seed)
    img = gradient([(0, "#030716"), (0.5, "#0d1a3a"), (0.78, "#1f3462"), (1, "#2d4677")])
    img = stars(img, rng, 320, 0.02, 0.62)
    img = crescent(img, W * 0.68, H * 0.3, 40, "#f8f0d0")
    img = glow(img, W * 0.5, H * 0.72, 360, "#3b5a92", 0.35)
    pil = finish(img, rng)
    d = ImageDraw.Draw(pil)
    mosque_silhouette(d, W * 0.5, H * 0.72, 1.05, (6, 10, 24))
    d.rectangle([0, H * 0.78, W, H], fill=(6, 10, 24))
    return pil


def main():
    os.makedirs(OUT, exist_ok=True)
    seed = 1447
    for period in ("dawn", "day", "sunset", "night"):
        for season in ("spring", "summer", "autumn", "winter"):
            seed += 1
            landscape(period, season, seed).save(os.path.join(OUT, f"{period}-{season}.jpg"), quality=80, optimize=True, progressive=True)
    khatam_pattern("#0e1a36", "#1c2c55", "#c9a45c", 7).save(os.path.join(OUT, "pattern-navy.jpg"), quality=80, optimize=True, progressive=True)
    khatam_pattern("#2f4a3c", "#4a6b58", "#d8c38a", 8).save(os.path.join(OUT, "pattern-sage.jpg"), quality=80, optimize=True, progressive=True)
    arches_dusk(9).save(os.path.join(OUT, "arches-dusk.jpg"), quality=80, optimize=True, progressive=True)
    mosque_night(10).save(os.path.join(OUT, "mosque-night.jpg"), quality=80, optimize=True, progressive=True)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith(".jpg"))
    print(f"{len([f for f in os.listdir(OUT) if f.endswith('.jpg')])} images, {total // 1024} KB")


if __name__ == "__main__":
    main()
