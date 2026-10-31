"""Builds DITHAR's Android launcher icons from the approved logo.

Source: ASSETS/dithar-logo-men.png — the authoritative logo (the app's
default identity theme; see src/assets/logos/README.md). The icon shows
only its emblem: the artwork above the first fully transparent band that
separates it from the wordmark (no pixel of the emblem is cut). It is only
scaled (Lanczos) and centered, never redrawn or recolored:

  mipmap-*/ic_launcher_foreground.png  adaptive-icon foreground (Android 8+),
      108dp canvas, logo inside the 66dp safe zone so no launcher mask
      (circle, squircle, HONOR's rounded square) can clip it; the background
      layer is @color/ic_launcher_background, fully transparent — no plate.
  mipmap-*/ic_launcher.png             legacy icon (Android 7), transparent
  mipmap-*/ic_launcher_round.png       legacy round icon (Android 7), transparent

Re-run after the approved logo changes:  python3 scripts/generate-android-icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "ASSETS" / "dithar-logo-men.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def fitted(logo: Image.Image, box: int) -> Image.Image:
    scale = box / max(logo.size)
    return logo.resize((max(1, round(logo.width * scale)), max(1, round(logo.height * scale))), Image.LANCZOS)


def centered(canvas: Image.Image, art: Image.Image) -> Image.Image:
    canvas.alpha_composite(art, ((canvas.width - art.width) // 2, (canvas.height - art.height) // 2))
    return canvas


def emblem(logo: Image.Image) -> Image.Image:
    """The artwork above the transparent band between emblem and wordmark."""
    # Visible pixels only: the source carries faint near-zero alpha noise.
    visible = logo.getchannel("A").point(lambda a: 255 if a > 16 else 0)
    width, height = logo.size
    seen = False
    for y in range(height):
        empty = visible.crop((0, y, width, y + 1)).getbbox() is None
        if not empty:
            seen = True
        elif seen:
            return logo.crop(visible.crop((0, 0, width, y)).getbbox())
    raise SystemExit("no transparent band separates the emblem from the wordmark")


def main() -> None:
    logo = emblem(Image.open(SOURCE).convert("RGBA"))
    for density, factor in DENSITIES.items():
        out = RES / f"mipmap-{density}"
        # Adaptive foreground: 108dp canvas, art within the 66dp safe zone.
        size = round(108 * factor)
        centered(Image.new("RGBA", (size, size), (0, 0, 0, 0)), fitted(logo, round(66 * factor))).save(out / "ic_launcher_foreground.png", optimize=True)
        # Legacy icons (Android 7): 48dp, the emblem alone on transparency — no plate.
        size = round(48 * factor)
        art = fitted(logo, round(size * 0.92))
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            centered(Image.new("RGBA", (size, size), (0, 0, 0, 0)), art).save(out / name, optimize=True)
    print("launcher icons written")


if __name__ == "__main__":
    main()
