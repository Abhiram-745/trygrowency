// The Growency mark, as three separate polygonal facets.
//
// STAND-IN GEOMETRY: no original Growency mark was available (not in the repo,
// growency.com is a parked domain, and no vector was supplied). Replace
// MARK_POINTS / MARK_FACETS with a trace of the real mark. Everything else
// (orbit targets, clipping, chrome extrusion, halo, static fallback) is derived
// from this file.
//
// Authoring space: 0..100 box, y pointing DOWN (same as SVG).

export type Pt = [number, number];

/** Named vertices of the mark. The tip at the right is where the slim gaps meet. */
export const MARK_POINTS = {
  tip: [100, 38] as Pt, // right tip
  topLeft: [7, 0] as Pt,
  bottomLeft: [0, 100] as Pt,
  core: [36, 50] as Pt, // inner vertex where the three facets meet
};

const P = MARK_POINTS;
/** Facets in drawing order (top wing, lower body, left spine). */
export const MARK_FACETS_RAW: Pt[][] = [
  [P.topLeft, P.tip, P.core],
  [P.core, P.tip, P.bottomLeft],
  [P.topLeft, P.core, P.bottomLeft],
];

/** Width of the gap between facets, in authoring units. */
export const MARK_GAP = 2.4;

/** Slope (rise/run) of the lower edge; reused for the wordmark's y terminal. */
export const MARK_CUT_SLOPE = (P.bottomLeft[1] - P.tip[1]) / (P.tip[0] - P.bottomLeft[0]);

function signedArea(poly: Pt[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Shrink a convex polygon by `d` along every edge (offset lines, re-intersect).
 * Only edges shared with another facet are offset, so the outer silhouette
 * stays exact and gaps appear only between facets.
 */
function insetShared(poly: Pt[], d: number, isShared: (a: Pt, b: Pt) => boolean): Pt[] {
  const ccw = signedArea(poly) > 0 ? 1 : -1;
  const n = poly.length;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    // inward normal
    const nx = (-dy / len) * ccw;
    const ny = (dx / len) * ccw;
    const off = isShared(a, b) ? d : 0;
    return { p: [a[0] + nx * off, a[1] + ny * off] as Pt, v: [dx, dy] as Pt };
  });
  return poly.map((_, i) => {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const det = l1.v[0] * l2.v[1] - l1.v[1] * l2.v[0];
    const t = ((l2.p[0] - l1.p[0]) * l2.v[1] - (l2.p[1] - l1.p[1]) * l2.v[0]) / det;
    return [l1.p[0] + l1.v[0] * t, l1.p[1] + l1.v[1] * t] as Pt;
  });
}

const edgeKey = (a: Pt, b: Pt) => [a, b].map((p) => p.join(',')).sort().join('|');
const edgeCount = new Map<string, number>();
for (const f of MARK_FACETS_RAW)
  f.forEach((a, i) => {
    const k = edgeKey(a, f[(i + 1) % f.length]);
    edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
  });

/** Final facets with slim gaps, authoring space (y down). */
export const MARK_FACETS: Pt[][] = MARK_FACETS_RAW.map((f) =>
  insetShared(f, MARK_GAP / 2, (a, b) => (edgeCount.get(edgeKey(a, b)) ?? 0) > 1),
);

export const MARK_BOUNDS = (() => {
  const xs = MARK_FACETS.flat().map((p) => p[0]);
  const ys = MARK_FACETS.flat().map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
})();

/**
 * Facets in a normalised, centred, y-UP space where the mark's height is 1.
 * This is what the 3D scene uses.
 */
export const MARK_FACETS_UNIT: Pt[][] = MARK_FACETS.map((f) =>
  f.map(([x, y]) => [(x - MARK_BOUNDS.cx) / MARK_BOUNDS.h, -(y - MARK_BOUNDS.cy) / MARK_BOUNDS.h] as Pt),
);
export const MARK_ASPECT = MARK_BOUNDS.w / MARK_BOUNDS.h;

export const markPathD = (facet: Pt[]) => 'M' + facet.map((p) => p.map((v) => v.toFixed(3)).join(' ')).join('L') + 'Z';
