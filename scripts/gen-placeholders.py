"""Generate clearly labelled PLACEHOLDER campaign media for the hero ring.

Run:  python3 -I scripts/gen-placeholders.py
Writes posters (JPG) and a handful of short muted loops (MP4) to
public/media/campaigns/. Replace these with real Growency campaign media
and update src/content/campaigns.ts. Nothing here is real client work.
"""
import math
import os
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "media", "campaigns")
FONT_DIR = os.path.join(ROOT, "node_modules", "geist", "dist", "fonts", "geist-sans")
W, H = 800, 1000
COUNT = 18
VIDEO_IDS = {1, 4, 7, 10, 13, 16}  # two clips per logo facet group

PALETTES = [
    ("#ff5a36", "#ffd23f", "#1b1b1f"),
    ("#2d5bff", "#8fd3ff", "#0b1030"),
    ("#00b894", "#d6ff5c", "#08261f"),
    ("#ff3d8b", "#ffb4d0", "#2a0716"),
    ("#7b5cff", "#ffcf6e", "#140c33"),
    ("#ff8a00", "#ff2e63", "#1f0a00"),
    ("#00c2ff", "#00ffa3", "#00202a"),
    ("#ffe14d", "#ff6b3d", "#2b1d00"),
    ("#e23d28", "#f6ede4", "#240a06"),
]


def font(size, weight="Bold"):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Geist-{weight}.ttf"), size)


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def gradient(a, b, angle):
    img = Image.new("RGB", (W, H))
    px = img.load()
    ca, cb = hex2rgb(a), hex2rgb(b)
    ax, ay = math.cos(angle), math.sin(angle)
    for y in range(H):
        for x in range(W):
            t = ((x / W - 0.5) * ax + (y / H - 0.5) * ay) + 0.5
            t = min(1, max(0, t))
            px[x, y] = tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return img


def poster(i):
    rnd = random.Random(i * 7919)
    a, b, ink = PALETTES[i % len(PALETTES)]
    img = gradient(a, b, rnd.uniform(0, math.tau))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    style = i % 4
    if style == 0:  # orbs
        for _ in range(5):
            r = rnd.randint(120, 320)
            x, y = rnd.randint(0, W), rnd.randint(0, H)
            d.ellipse((x - r, y - r, x + r, y + r), fill=hex2rgb(rnd.choice((a, b, ink))) + (150,))
        layer = layer.filter(ImageFilter.GaussianBlur(40))
    elif style == 1:  # bold stripes
        for k in range(-4, 14):
            x = k * 90
            d.polygon([(x, 0), (x + 45, 0), (x + 45 - 500, H), (x - 500, H)], fill=hex2rgb(ink) + (60,))
    elif style == 2:  # product-shot block
        d.rounded_rectangle((180, 220, 620, 760), 40, fill=hex2rgb(ink) + (235,))
        d.ellipse((290, 330, 510, 550), fill=hex2rgb(b) + (255,))
    else:  # grid of tiles
        for gx in range(4):
            for gy in range(5):
                if rnd.random() < 0.55:
                    x0, y0 = 40 + gx * 185, 40 + gy * 185
                    d.rounded_rectangle((x0, y0, x0 + 165, y0 + 165), 24, fill=hex2rgb(rnd.choice((ink, b, a))) + (200,))
    img = Image.alpha_composite(img.convert("RGBA"), layer)

    d = ImageDraw.Draw(img)
    n = f"{i + 1:02d}"
    d.text((56, H - 250), f"Campaign {n}", font=font(78), fill=hex2rgb(ink))
    d.text((58, H - 160), "Replace with real work", font=font(34, "Medium"), fill=hex2rgb(ink))
    # Unmissable placeholder chip
    d.rounded_rectangle((56, 56, 356, 112), 28, fill=(255, 255, 255, 235))
    d.text((80, 66), "PLACEHOLDER", font=font(30, "SemiBold"), fill=(20, 20, 24))
    return img.convert("RGB")


def video(i, poster_path, out_path):
    # 6 s seamless-ish loop: slow push-in + hue drift on the placeholder poster.
    vf = (
        "scale=960:1200,zoompan=z='1.0+0.08*sin(2*PI*on/180)':"
        "x='iw/2-(iw/zoom/2)+40*sin(2*PI*on/180)':y='ih/2-(ih/zoom/2)':d=1:s=480x600:fps=30,"
        "hue=h='25*sin(2*PI*t/6)',format=yuv420p"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", poster_path, "-t", "6",
         "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-movflags", "+faststart",
         "-an", out_path],
        check=True,
    )


def main():
    os.makedirs(OUT, exist_ok=True)
    for i in range(COUNT):
        n = f"{i + 1:02d}"
        p = os.path.join(OUT, f"placeholder-{n}.jpg")
        poster(i).save(p, quality=82, optimize=True, progressive=True)
        if i in VIDEO_IDS:
            video(i, p, os.path.join(OUT, f"placeholder-{n}.mp4"))
        print("wrote", n, file=sys.stderr)


if __name__ == "__main__":
    main()
