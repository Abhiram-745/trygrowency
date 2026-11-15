"""Make gentle motion loops of selected spec ads for the hero ring's video slots.

Run:  python3 -I scripts/gen-ad-loops.py
Each loop is the real ad with a slow, seamless "breathing" push-in (6 s, 4:5,
muted). Output: public/media/campaigns/<id>-loop.mp4
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "public", "media", "work")
OUT = os.path.join(ROOT, "public", "media", "campaigns")
LOOPS = {
    "wispr-flow": "wispr-flow-brand.jpg",
    "granola": "granola-brand.jpg",
    "sandwich": "sandwich.webp",
    "allbirds": "allbirds.webp",
    "instinct": "instinct-tennis.jpg",
    "moonshot-good-memory": "moonshot-good-memory.jpg",
}
FPS, SECONDS = 30, 6
N = FPS * SECONDS

os.makedirs(OUT, exist_ok=True)
for ad_id, src in LOOPS.items():
    # Upscale 4x first so sub-pixel zoompan motion stays smooth; zoom follows a
    # full cosine period, so the last frame flows straight into the first.
    vf = (
        "scale=2880:3600:flags=lanczos,"
        f"zoompan=z='1.035-0.035*cos(2*PI*on/{N})':"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d=1:s=720x900:fps={FPS},format=yuv420p"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", os.path.join(WORK, src), "-frames:v", str(N),
         "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", "-an",
         os.path.join(OUT, f"{ad_id}-loop.mp4")],
        check=True,
    )
    print("wrote", ad_id)
