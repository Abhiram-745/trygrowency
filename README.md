# trygrowency: homepage

Vite + TypeScript site. The homepage hero is a scroll-scrubbed WebGL sequence
(three.js + GSAP ScrollTrigger):

1. **Opening:** campaign cards drift in a raised, draggable orbit below the wordmark. The tagline stays hidden until scrolling begins, then appears in the clear centre in front of the cards.
2. **Metallic type:** scrolling sends a silver reflection across the wordmark and tagline, then erodes the letters into drifting fragments. Scrolling back rebuilds them.
3. **Orbit → mark:** the cards accelerate and assemble into the three facets of the mark, playing up to three clips.
4. **Chrome rotation:** a reflection replaces the footage with bevelled chrome as the mark rotates through a full turn. It stays metallic.
5. **Immersive finish:** the final scroll pushes into the middle facet until silver fills the viewport. The sequence spans 8.5 viewport heights; there are no sections below it.

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
- The compact brand navigation stays fixed at every width.
