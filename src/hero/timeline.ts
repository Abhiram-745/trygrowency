// Scroll choreography for the hero. `p` is pinned-scroll progress 0..1.
// All phase boundaries live here so timing can be tuned in one place.

/** How long the hero stays pinned, in viewport heights of scrolling. */
export const PIN_LENGTH_VH = 5.4;

export const T = {
  // 1. Headline breaks up (first ~25%)
  typeStart: 0.0,
  typeEnd: 0.25,
  // 2/3. Orbit accelerates, tilts and opens once the type starts clearing…
  orbitStart: 0.08,
  orbitEnd: 0.36,
  // …and the cards fly out into the mark's three facets (next ~40%)
  flyStart: 0.25,
  flyEnd: 0.63,
  // 3b. Hold the video-filled mark (~20%) — flyEnd → chromeStart
  chromeStart: 0.83,
  // 4. Chrome reveal (final ~15%) …
  chromeEnd: 0.955,
  // 5. … then settle into the flat white mark.
  whiteEnd: 1.0,
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Phases {
  /** Wordmark disintegration 0..1 */
  type: number;
  /** Orbit acceleration / tilt / opening 0..1 */
  orbit: number;
  /** Cards flying into the facets 0..1 (per-card stagger applied downstream) */
  fly: number;
  /** Chrome reveal 0..1 */
  chrome: number;
  /** Chrome → flat white 0..1 */
  white: number;
}

export function phases(p: number): Phases {
  return {
    type: seg(p, T.typeStart, T.typeEnd),
    orbit: seg(p, T.orbitStart, T.orbitEnd),
    fly: seg(p, T.flyStart, T.flyEnd),
    chrome: seg(p, T.chromeStart, T.chromeEnd),
    white: seg(p, T.chromeEnd, T.whiteEnd),
  };
}
