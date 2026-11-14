# trygrowency: homepage

Vite + TypeScript site. The homepage hero is a scroll-scrubbed WebGL sequence
(three.js + GSAP ScrollTrigger):

1. **Opening:** the cards are dealt into a tilted orbit under the `trygrowency` wordmark, while the tagline wipes in inside the ring. The ring drifts at rest and you can drag it with inertia (mouse or touch). Video cards carry a frosted liquid-glass play blob that swells toward the cursor.
2. **Disintegrate:** the wordmark erodes letter by letter from the left, edges first, into fragments that drift toward the orbit. Scrolling back rebuilds it.
3. **Orbit → mark:** the ring speeds up, tilts and opens, then the same cards fly into the three facets of the mark and are clipped to them. Up to 3 clips play.
4. **Chrome:** a silver sweep dissolves the footage into a bevelled chrome mark that tilts to show its edges.
5. **White-on-white:** the mark settles to flat white with a faint edge. Hover, focus or tap blooms a silver-grey halo. Grab it (or use the arrow keys) to spin it in 3D: it turns chrome while held, then springs back to face front.

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
- `src/hero/ringText.ts`: the tagline shown inside the orbit.

## Accessibility & performance

- The `<h1>` holds the real text, and the wordmark SVG is inlined at build time. WebGL hides the SVG's visuals but keeps its layout.
- `prefers-reduced-motion`, or no WebGL2: no pin and no three.js download. You get the static wordmark plus the mark filled with posters.
- Front-of-ring posters load first. At most 3 muted clips play, and video pauses when the hero is offscreen or the tab is hidden.
- The nav (with **Book a call**) stays fixed at every width.
