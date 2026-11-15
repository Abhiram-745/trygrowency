# Growency footer: image-to-video loop

Use the matching desktop or mobile image as the input image / first-frame reference. Generate each format separately so the cottage and river retain their intended composition. The website currently shows the responsive stills; no AI video has been generated yet. Generate the desktop and phone versions separately.

## Copy-and-paste prompt

Use the footer image as BOTH the start frame and the end frame.

> Locked-off tripod shot of this exact painting. The camera does not move at all: the horizon, the hills, the cottage and the fence stay at exactly the same place on screen in every frame. No tilt down, no pan, no zoom, no push-in, no crane.
>
> Bring the whole landscape gently to life, far and near at the same time:
> - Far hills: soft valley mist drifts slowly to the right between the hills, thinning and gathering.
> - Middle distance: a light breeze sends slow waves rolling across the golden wheat fields and green meadows.
> - River: the water flows steadily from the far bend toward the lower right, with small sun glints travelling along it.
> - Trees: the big oak on the left and the trees across the valley sway softly, leaves rustling and catching the light.
> - Cottage: a thin wisp of pale smoke rises from the chimney and drifts right.
> - Foreground: the long grass and white cow parsley along the fence nod in the breeze.
> - Sky: stays clear warm ivory with a faint shimmer of warm haze.
>
> Same golden late-afternoon light throughout. Everything moves slowly and calmly at one gentle pace and returns to the starting image, so the last frame matches the first for a seamless loop. Keep the soft painterly illustration style exactly as in the image.

## Negative prompt

Camera movement, tilt, pan, pan down, crane, dolly, zoom, push in, parallax, horizon moving, shaking, cropping, reframing, scene cut, time-lapse, changing light, moving sun, flicker, fast motion, strong wind, morphing cottage, bending fence, melting trees, new objects, people, animals, birds, vehicles, text, logo, watermark.

## Generator settings (why the camera kept sinking)

- **Camera control: static / none / locked.** Most tools default to a gentle move; with a big empty sky they often choose a tilt down. Turn it off explicitly.
- **Same image as first and last frame.** This forces the view to come back to where it started, so it can't drift.
- **Motion strength: medium, not low.** Low settings mostly animate the nearest plants, which is why only the front was moving.
- **Motion brush, if available (Kling, Runway):** paint the river (downstream), fields (left to right), mist (right), smoke (up), oak (sway); mark the hills, cottage and fence as static.
- If it still drifts, generate a 5 s clip instead of 8–10 s; shorter clips drift less.

## Desktop version

- Reference: `public/images/footer-desktop.webp` (wide 16:9 composition).
- Append: "Wide 16:9 composition; cottage lower-left, river centre-right, open sky across the top. Preserve the entire width and all important landmarks."
- Export target: 1920 × 1080, 24 fps, 8 seconds.

## Phone version

- Reference: `public/images/footer-mobile.webp` (portrait 9:16 composition).
- Append: "Portrait 9:16 composition. Keep the entire cottage and chimney visible in the lower-left, the winding river in the centre-right, and the upper third calm and open. Do not crop the desktop video."
- Export target: 1080 × 1920 (720 × 1280 is also suitable for a lighter mobile download), 24 fps, 8 seconds.

## Loop and delivery checks

Use the same reference image for the start and end keyframes if the generator supports it. A prompt alone cannot guarantee a seamless loop: check at least three repetitions for a visible jump, brightness change or unnatural reversal. Keep source PNGs for generation; the website uses compressed WebP posters.

Export MP4/H.264, yuv420p, no audio, web-optimized / fast-start. Aim for less than 5 MB on desktop and 3 MB on phones while preserving the subtle grain. Test playback on Safari and Chrome.

Place the final files at:

- `public/media/footer-desktop.mp4`
- `public/media/footer-mobile.mp4`

Then add these attributes to the existing `[data-footer-media]` element in `index.html`:

```html
<div class="world-footer__media" data-footer-media
     data-video-desktop="/media/footer-desktop.mp4"
     data-video-mobile="/media/footer-mobile.mp4">
```

The media helper selects the correct loop, plays muted and inline, pauses offscreen/in hidden tabs, and retains the still image for reduced motion, data saving, missing files or playback failure. Keep the poster and video compositions identical to avoid a jump when the video fades in.
