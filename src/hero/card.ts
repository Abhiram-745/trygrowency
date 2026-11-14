// One campaign card: a plane with a shader that handles cover-fit, rounded
// corners, depth "clarity", clipping to its facet of the mark, and dissolving
// into chrome behind the reflection sweep.
import * as THREE from 'three';
import { MARK_FACETS_UNIT } from '../brand/mark';
import { MAX_POLY, NOISE, SD_POLY, SWEEP } from './glsl';
import type { Tile } from './tiles';

const GEO = new THREE.PlaneGeometry(1, 1);

const vertexShader = /* glsl */ `
uniform mat4 uLogoInv;
varying vec2 vUv;
varying vec2 vMark;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vMark = (uLogoInv * world).xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
${NOISE}
${SWEEP}
${SD_POLY}
uniform sampler2D map;
uniform float uHasMap, uTexAspect, uPlaneAspect, uRadius;
uniform float uFront, uClip, uSweep, uOpacity;
uniform vec3 uFallback;
varying vec2 vUv;
varying vec2 vMark;

void main() {
  // object-fit: cover
  vec2 uv = vUv - 0.5;
  float r = uPlaneAspect / uTexAspect;
  if (r > 1.0) uv.y /= r; else uv.x *= r;
  uv += 0.5;
  if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
  vec3 col = uHasMap > 0.5 ? texture2D(map, uv).rgb : uFallback;

  // rounded card corners (in units of card height)
  vec2 q = abs(vUv - 0.5) * vec2(uPlaneAspect, 1.0);
  vec2 hb = vec2(0.5 * uPlaneAspect, 0.5) - uRadius;
  float rd = length(max(q - hb, 0.0)) - uRadius;
  float raa = max(fwidth(rd), 1e-4);
  float cardMask = 1.0 - smoothstep(-raa, raa, rd);

  // clip to this card's facet of the mark
  float d = sdPoly(vMark);
  float aa = max(fwidth(d), 1e-4);
  float facetMask = 1.0 - smoothstep(-aa, aa, d);
  float a = mix(cardMask, facetMask, uClip);

  // depth clarity: back of the orbit fades toward the white page
  col = mix(vec3(1.0), col, mix(0.36, 1.0, uFront));

  // reflection sweep: footage dissolves into the chrome behind it
  float s = sweepCoord(vMark) + (vnoise(vMark * 38.0) - 0.5) * 0.05 + (vnoise(vMark * 9.0) - 0.5) * 0.04;
  float keep = smoothstep(uSweep - 0.012, uSweep + 0.012, s);
  float sheen = exp(-pow((s - uSweep - 0.02) / 0.035, 2.0));
  col = mix(col, vec3(0.94, 0.95, 0.965), clamp(sheen, 0.0, 1.0) * 0.85);

  a *= keep * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}`;

export class Card {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly u;

  constructor(
    readonly index: number,
    readonly tile: Tile,
    readonly hasVideo: boolean,
  ) {
    const poly = MARK_FACETS_UNIT[tile.facet].map(([x, y]) => new THREE.Vector2(x, y));
    while (poly.length < MAX_POLY) poly.push(new THREE.Vector2());
    this.u = {
      map: { value: null as THREE.Texture | null },
      uHasMap: { value: 0 },
      uTexAspect: { value: 0.8 },
      uPlaneAspect: { value: 0.8 },
      uRadius: { value: 0.045 },
      uFront: { value: 1 },
      uClip: { value: 0 },
      uSweep: { value: -1 },
      uOpacity: { value: 1 },
      uFallback: { value: new THREE.Vector3(0.93, 0.935, 0.945) },
      uLogoInv: { value: new THREE.Matrix4() },
      uAspect: { value: 1 },
      uPoly: { value: poly },
      uPolyN: { value: MARK_FACETS_UNIT[tile.facet].length },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    this.mesh = new THREE.Mesh(GEO, mat);
    this.mesh.matrixAutoUpdate = true;
  }

  setTexture(tex: THREE.Texture | null, aspect: number) {
    if (this.u.map.value === tex) return;
    this.u.map.value = tex;
    this.u.uHasMap.value = tex ? 1 : 0;
    this.u.uTexAspect.value = aspect;
  }
}
