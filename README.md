# trygrowency: homepage

Vite + TypeScript site. The homepage hero is a scroll-scrubbed WebGL sequence
(three.js + GSAP ScrollTrigger):

1. **Opening:** the plain black **growency** wordmark sits above a raised, draggable orbit of campaign cards. The tagline is hidden.
2. **Clear the stage:** the wordmark erodes completely before the tagline appears. A liquid-silver lighting reveal travels across its fixed-weight letters; there is no idle or cursor-driven weight animation.
3. **Snap and dissolve:** the tagline holds for reading, makes a brief mechanical snap, then breaks into silver fragments as the carousel opens and assembles into the logo.
4. **Chrome reflection:** a reflection replaces the footage with bevelled chrome while the assembled mark stays facing forward. It stays metallic. Once the shine completes, drag the bevelled 3D mark (mouse or touch) or focus it and use the arrow keys to rotate it. The finished chrome mark makes one scroll-driven turn. Drag and keyboard input settle along the shortest arc before the zoom starts; its orientation stays fixed throughout the full-screen takeover.
5. **Immersive finish:** the final scroll pushes into the middle facet until silver fills the viewport. The sequence spans 14 viewport heights. Navigation fades away before the immersive zoom. A short Content scroll interval leads into a white footer with a responsive countryside illustration, with separate desktop and phone compositions. Optional image-to-video loops can be added later; see [the video prompt and integration guide](docs/footer-video-prompt.md). The still image remains the reduced-motion and playback-error fallback.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
```

Review helpers: `?p=0.7` jumps to a point in the sequence; `?static` forces the static layout.

## Replacing placeholder media

All card media is listed in **`src/content/campaigns.ts`** (poster, video, alt, title, client, link).
Drop files into **`public/media/campaigns/`**, update the entries and set `placeholder: false`.
Cards 1–6 fill the top facet, 7–12 the lower facet and 13–18 the left facet. Posters should be 4:5 JPG/WebP;
clips should be muted 4:5 H.264 MP4 loops. The current files are generated stand-ins (`npm run gen:placeholders`).

## Brand files

- `src/brand/mark.ts`: the mark's three facets, traced from the supplied logo and made exactly symmetric.
  The ring targets, clipping, chrome extrusion, halo, static fallback, nav icon and favicon all derive from it.
- `scripts/build-wordmark.mjs` → `src/brand/wordmark.generated.ts`: Geist Bold outlines, hand-tuned tracking,
  and a redrawn final "y" whose descender is cut at the mark's lower-edge angle. Re-run `npm run gen:wordmark` after tuning.
- `src/hero/timeline.ts`: every phase boundary and the pin length.
- `src/hero/ringText.ts`: the fixed-weight tagline, liquid-metal lighting reveal and snap-to-fragments exit.

## Accessibility & performance

- Lenis adds a smooth wheel glide across the page. Touch stays native, anchors are supported, and reduced motion disables smoothing.

- The `<h1>` holds the real text, and the wordmark SVG is inlined at build time. WebGL hides the SVG's visuals but keeps its layout.
- `prefers-reduced-motion`, or no WebGL2: no pin and no three.js download. You get the static wordmark plus the mark filled with posters.
- Front-of-ring posters load first. At most 3 muted clips play, and video pauses when the hero is offscreen or the tab is hidden.
- The compact brand navigation stays fixed at every width.
