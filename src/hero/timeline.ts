// Scroll choreography for the hero. `p` is pinned-scroll progress 0..1.
// All phase boundaries live here so timing can be tuned in one place.

/** How long the hero stays pinned, in viewport heights of scrolling. */
export const PIN_LENGTH_VH = 8.5;

export const T = {
  // 1. Let the reflection pass before the headline breaks up.
  typeStart: 0.12,
  typeEnd: 0.38,
  // 2/3. Orbit accelerates, tilts and opens once the type starts clearing…
  orbitStart: 0.16,
  orbitEnd: 0.44,
  // …and the cards fly out into the mark's three facets.
  flyStart: 0.34,
  flyEnd: 0.61,
  // 3b. Briefly hold the assembled video-filled mark.
  chromeStart: 0.66,
  // 4. Chrome reveal and rotation.
  chromeEnd: 0.82,
  // 5. Push into a metallic facet until it fills the viewport.
  zoomStart: 0.85,
  zoomEnd: 1.0,
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
  /** Final push into the chrome surface 0..1 */
  zoom: number;
}

export function phases(p: number): Phases {
  return {
    type: seg(p, T.typeStart, T.typeEnd),
    orbit: seg(p, T.orbitStart, T.orbitEnd),
    fly: seg(p, T.flyStart, T.flyEnd),
    chrome: seg(p, T.chromeStart, T.chromeEnd),
    zoom: seg(p, T.zoomStart, T.zoomEnd),
  };
}
