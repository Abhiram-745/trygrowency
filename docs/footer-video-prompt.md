# Growency footer: image-to-video loop

Use the matching desktop or mobile image as the input image / first-frame reference. Generate each format separately so the cottage and river retain their intended composition. The website currently shows the responsive stills; no AI video has been generated yet.

## Copy-and-paste prompt

Create an eight-second seamless looping living illustration using the supplied image as a strict visual reference. Preserve the exact composition, cottage architecture, fence geometry, river course, field boundaries, painterly print texture, warm ivory sky, olive greens and golden afternoon light. The camera is completely locked: no pan, tilt, zoom, dolly, crop, parallax or perspective change.

The countryside is almost still. Add only tiny, natural cyclic movements: a soft breeze gently sways a few foreground grass tips and leaves; very small ripples carry delicate sunlight glints across the existing river; the distant valley mist softly breathes without visibly drifting out of place. Motion should be noticeable only after watching quietly for a moment. Keep the cottage, fence, hills and tree trunks perfectly stationary. Preserve the empty light sky for website text. Maintain constant exposure, colour balance and sun position.

All animated details return naturally to their starting positions by the final frame, with matching motion direction and speed at the loop seam. Make the first and last frames visually identical, without a pause, dissolve or sudden reversal. Keep the movement elegant, slow and understated. No sound, no text, no logos.

## Negative prompt

Camera movement, zoom, orbit, parallax, handheld shake, frame drift, scene cuts, changing weather, changing time of day, dramatic clouds, moving sun, flicker, pulsing exposure, boiling textures, morphing buildings, bending fences, melted foliage, added people, animals, birds, vehicles, smoke, new objects, strong wind, exaggerated water, ASCII, pixelation, subtitles, watermark, audio.

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
