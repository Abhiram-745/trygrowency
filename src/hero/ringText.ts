// Tagline that sits inside the orbit, like the planet in Saturn's rings.
//
// The text is rendered once into a signed-distance field, so its weight can be
// changed per pixel in the shader: letters swell bolder around the cursor (or
// finger) and relax when it leaves; with nobody interacting, a slow weight
// wave rolls through the line. It sits on a camera-facing plane at the ring
// centre, so back cards pass behind it and front cards in front. It wipes in
// as the carousel arrives and clears as soon as scrolling starts.
import * as THREE from 'three';

export const TAGLINE = ['The only growth agency', 'you’ll ever need.'];

const SS = 2; // supersample
const FONT_PX = 120;
const SPREAD = 18 * SS; // SDF range in texture px

const vertexShader = /* glsl */ `
uniform float uReveal;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.y -= (1.0 - uReveal) * 0.05;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform float uReveal, uOpacity, uTime, uAspect, uPtrStr, uThin, uBold;
uniform vec2 uPtr;
varying vec2 vUv;
void main() {
  float sd = (texture2D(map, vUv).r - 0.5) * 2.0; // -1..1 of SPREAD, + inside

  // weight field: swell around the pointer, idle wave when untouched
  vec2 d = (vUv - uPtr) * vec2(uAspect, 1.0);
  float near = exp(-dot(d, d) / 0.11) * uPtrStr;
  float wave = smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(vUv.x * 5.0 - vUv.y * 1.5 - uTime * 1.25)) * (1.0 - uPtrStr) * 0.55;
  float w = clamp(near + wave, 0.0, 1.0);
  float edge = sd + mix(uThin, uBold, w);
  float aa = max(fwidth(edge), 1e-4) * 0.75;
  float ink = smoothstep(-aa, aa, edge);

  // reveal: soft wipe, line by line
  float line = vUv.y > 0.5 ? 0.0 : 0.22;
  float r = uReveal * 1.3 - 0.2;
  float m = smoothstep(r, r - 0.16, vUv.x * 0.7 + line);

  float a = ink * m * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(0.067, 0.067, 0.078), a);
}`;

export class RingText {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private u = {
    map: { value: null as THREE.Texture | null },
    uReveal: { value: 0 },
    uOpacity: { value: 1 },
    uTime: { value: 0 },
    uAspect: { value: 3 },
    uPtr: { value: new THREE.Vector2(0.5, -1) },
    uPtrStr: { value: 0 },
    uThin: { value: 0 },
    uBold: { value: 0 },
  };
  private aspect = 3;
  private ptrStr = 0;

  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms: this.u, vertexShader, fragmentShader, transparent: true, depthWrite: false }),
    );
    this.draw();
  }

  /** Rasterise the tagline (weight 500) and convert it to a signed-distance field. */
  draw() {
    const pad = SPREAD + 8;
    const lineH = FONT_PX * 1.12 * SS;
    const probe = document.createElement('canvas').getContext('2d')!;
    const font = `500 ${FONT_PX * SS}px Geist, ui-sans-serif, system-ui, sans-serif`;
    probe.font = font;
    probe.letterSpacing = `${-0.03 * FONT_PX * SS}px`;
    const widths = TAGLINE.map((l) => probe.measureText(l).width);
    const W = Math.ceil(Math.max(...widths) + pad * 2);
    const H = Math.ceil(lineH * TAGLINE.length + pad * 2);

    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.font = font;
    ctx.letterSpacing = probe.letterSpacing;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000';
    TAGLINE.forEach((l, i) => ctx.fillText(l, (W - widths[i]) / 2, pad + lineH * i + FONT_PX * SS * 0.92));
    const src = ctx.getImageData(0, 0, W, H).data;

    // Two-pass chamfer distance, inside and outside, combined into a signed field.
    const N = W * H;
    const inside = new Uint8Array(N);
    for (let i = 0; i < N; i++) inside[i] = src[i * 4 + 3] > 127 ? 1 : 0;
    const dOut = chamfer(inside, W, H, 1); // distance to ink, for outside pixels
    const dIn = chamfer(inside, W, H, 0); // distance to background, for inside pixels
    const out = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const sd = inside[i] ? dIn[i] / 3 - 0.5 : -(dOut[i] / 3 - 0.5);
      out[i] = Math.max(0, Math.min(255, Math.round((sd / SPREAD) * 127.5 + 127.5)));
    }
    // Rows flipped so texture v=1 is the top of the text.
    const flipped = new Uint8Array(N);
    for (let y = 0; y < H; y++) flipped.set(out.subarray(y * W, y * W + W), (H - 1 - y) * W);
    const tex = new THREE.DataTexture(flipped, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    this.u.map.value?.dispose();
    this.u.map.value = tex;
    this.aspect = W / H;
    this.u.uAspect.value = this.aspect;
    // Weight range, in SDF units (fraction of SPREAD): thinner at rest, bold near the pointer.
    this.u.uThin.value = -(1.6 * SS) / SPREAD;
    this.u.uBold.value = (5.5 * SS) / SPREAD;
  }

  /** Place at the ring centre, `width` world units wide, facing the camera. */
  place(center: THREE.Vector3, width: number) {
    this.mesh.position.copy(center);
    this.mesh.scale.set(width, width / this.aspect, 1);
  }

  /** @param ptr pointer in the plane's uv space, or null when not over it */
  update(reveal: number, opacity: number, time: number, dt: number, ptr: THREE.Vector2 | null) {
    const u = this.u;
    u.uReveal.value = reveal;
    u.uOpacity.value = opacity;
    u.uTime.value = time;
    const target = ptr ? 1 : 0;
    this.ptrStr += (target - this.ptrStr) * (1 - Math.exp(-dt * (target ? 6 : 2.2)));
    u.uPtrStr.value = this.ptrStr;
    if (ptr) u.uPtr.value.lerp(ptr, 1 - Math.exp(-dt * 12));
    this.mesh.visible = opacity > 0.002 && reveal > 0.001;
  }
}

/**
 * Chamfer (3-4) distance transform. Returns, for every pixel whose mask value
 * differs from `target`, the distance (×3) to the nearest pixel equal to `target`.
 */
function chamfer(mask: Uint8Array, W: number, H: number, target: 0 | 1) {
  const BIG = 1e6;
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] === target ? 0 : BIG;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - W] + 3);
        if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
        if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
      }
      d[i] = v;
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < H - 1) {
        v = Math.min(v, d[i + W] + 3);
        if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
      }
      d[i] = v;
    }
  return d;
}
