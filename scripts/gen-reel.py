"""Compose the Growency spec-ad showreel loop from the real spec ads.

Run:  python3 -I scripts/gen-reel.py
Writes public/media/reel/spec-reel.mp4 (+ poster .jpg). The ten spec ads
(public/media/work/) glide across a neutral charcoal field with a slow, soft light. The loop is seamless: the strip advances exactly one period.
"""
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "public", "media", "work")
OUT = os.path.join(ROOT, "public", "media", "reel")
FONT_DIR = os.path.join(ROOT, "node_modules", "geist", "dist", "fonts", "geist-sans")

W, H = 1600, 900
FPS = 30
SECONDS = 14
ORDER = [
    "allbirds.webp", "granola-brand.jpg", "moonshot-for-everything.jpg", "aside-invoice-matching.png",
    "wispr-flow-brand.jpg", "ikea.webp", "moonshot-bring-flowers.jpg", "sandwich.webp",
    "instinct-tennis.jpg", "moonshot-good-memory.jpg",
]
CARD_H = 560
CARD_W = int(CARD_H * 0.8)
GAP = 64
RADIUS = 26


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background():
    """Neutral charcoal gradient (no brand colour, so the ads carry the colour)."""
    img = Image.new("RGB", (W, H))
    px = img.load()
    top, bottom = (17, 17, 20), (34, 34, 38)
    for y in range(H):
        c = lerp(top, bottom, (y / H) ** 1.4)
        for x in range(W):
            px[x, y] = c
    return img


def glow_layer(cx, cy, r, color, alpha):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(r * 0.55))


def card(path):
    im = Image.open(path).convert("RGB")
    # cover-fit to 4:5
    tw, th = CARD_W, CARD_H
    s = max(tw / im.width, th / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    l, t = (im.width - tw) // 2, (im.height - th) // 2
    im = im.crop((l, t, l + tw, t + th))
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), RADIUS, fill=255)
    out = Image.new("RGBA", (tw, th))
    out.paste(im, (0, 0), mask)
    return out


def shadow():
    pad = 80
    s = Image.new("RGBA", (CARD_W + pad * 2, CARD_H + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((pad, pad + 24, pad + CARD_W, pad + CARD_H + 24), RADIUS, fill=(0, 0, 0, 150))
    return s.filter(ImageFilter.GaussianBlur(34)), pad


def main():
    os.makedirs(OUT, exist_ok=True)
    cards = [card(os.path.join(WORK, f)) for f in ORDER]
    sh, pad = shadow()
    base = background()
    period = len(cards) * (CARD_W + GAP)
    frames = FPS * SECONDS
    y0 = (H - CARD_H) // 2 - 10

    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", os.path.join(OUT, "spec-reel.mp4")],
        stdin=subprocess.PIPE,
    )
    for f in range(frames):
        t = f / frames
        frame = base.copy().convert("RGBA")
        # light that drifts in a closed loop (seamless)
        a = t * math.tau
        frame = Image.alpha_composite(frame, glow_layer(int(W * (0.5 + 0.32 * math.cos(a))), int(H * (0.42 + 0.12 * math.sin(a * 2))), 420, (255, 255, 255), 26))
        frame = Image.alpha_composite(frame, glow_layer(int(W * (0.5 - 0.3 * math.cos(a))), int(H * (0.7 - 0.1 * math.sin(a))), 360, (255, 244, 230), 22))
        offset = t * period
        x = -offset - CARD_W
        while x < W + CARD_W:
            i = int(round((x + offset + CARD_W) / (CARD_W + GAP))) % len(cards)
            # gentle bob so the strip feels alive (period-locked)
            phase = (x + offset) / period * math.tau * 2
            yy = y0 + int(10 * math.sin(phase + a))
            frame.alpha_composite(sh, (int(x) - pad, yy - pad))
            frame.alpha_composite(cards[i], (int(x), yy))
            x += CARD_W + GAP
        rgb = frame.convert("RGB")
        if f == int(frames * 0.25):
            rgb.save(os.path.join(OUT, "spec-reel.jpg"), quality=84, optimize=True, progressive=True)
        ff.stdin.write(rgb.tobytes())
        if f % 60 == 0:
            print("frame", f, "/", frames, file=sys.stderr)
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main()
