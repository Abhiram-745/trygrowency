// Tagline that sits inside the orbit, like the planet in Saturn's rings.
// Rendered to a canvas texture on a camera-facing plane at the ring centre, so
// back cards pass behind it and front cards sweep in front. It wipes in as the
// carousel arrives and clears as soon as scrolling starts.
import * as THREE from 'three';

export const TAGLINE = {
  eyebrow: 'Strategy · Creative · Performance',
  before: 'The only ',
  accent: 'growth',
  after: ' agency',
  line2: 'you’ll ever need.',
};

const vertexShader = /* glsl */ `
uniform float uReveal;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.y -= (1.0 - uReveal) * 0.04; // slight rise as it reveals
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform float uReveal, uOpacity, uTime;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv);
  // reveal: soft wipe, top-left first, line by line
  float line = vUv.y > 0.62 ? 0.0 : (vUv.y > 0.3 ? 0.18 : 0.34);
  float coord = vUv.x * 0.62 + line;
  float r = uReveal * 1.35 - 0.2;
  float m = smoothstep(r, r - 0.18, coord);
  // a gentle gloss band glides across once revealed
  float band = exp(-pow((vUv.x - fract(uTime * 0.08) * 1.8 + 0.4) / 0.06, 2.0));
  vec3 col = t.rgb + band * 0.22 * t.a;
  float a = t.a * m * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}`;

export class RingText {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private u = {
    map: { value: null as THREE.Texture | null },
    uReveal: { value: 0 },
    uOpacity: { value: 1 },
    uTime: { value: 0 },
  };
  private aspect = 3;

  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms: this.u, vertexShader, fragmentShader, transparent: true, depthWrite: false }),
    );
    this.mesh.renderOrder = 0;
    this.draw();
  }

  /** Re-render the texture (fonts must be loaded). */
  draw() {
    const S = 2; // supersample
    const W = 1400 * S;
    const H = 460 * S;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const font = (weight: number, size: number, italic = false) =>
      `${italic ? 'italic ' : ''}${weight} ${size * S}px Geist, ui-sans-serif, system-ui, sans-serif`;

    // eyebrow
    ctx.font = font(500, 30);
    ctx.letterSpacing = `${0.18 * 30 * S}px`;
    ctx.fillStyle = '#7a7b82';
    const eb = TAGLINE.eyebrow.toUpperCase();
    ctx.fillText(eb, (W - ctx.measureText(eb).width) / 2, 70 * S);
    ctx.letterSpacing = `${-0.035 * 132 * S}px`;

    // line 1 with gradient accent
    const big = 132;
    const parts = [
      { t: TAGLINE.before, f: font(650, big) },
      { t: TAGLINE.accent, f: font(650, big, true), accent: true },
      { t: TAGLINE.after, f: font(650, big) },
    ];
    let total = 0;
    for (const p of parts) {
      ctx.font = p.f;
      total += ctx.measureText(p.t).width + (p.accent ? big * 0.06 * S : 0);
    }
    let x = (W - total) / 2;
    const y1 = 240 * S;
    for (const p of parts) {
      ctx.font = p.f;
      const w = ctx.measureText(p.t).width;
      if (p.accent) {
        const g = ctx.createLinearGradient(x, y1 - big * S, x + w, y1);
        g.addColorStop(0, '#ff6a2b');
        g.addColorStop(0.45, '#ff2e7e');
        g.addColorStop(1, '#7b5cff');
        ctx.fillStyle = g;
      } else ctx.fillStyle = '#111114';
      ctx.fillText(p.t, x, y1);
      x += w + (p.accent ? big * 0.06 * S : 0); // italic overhang needs a little air
    }

    // line 2
    ctx.font = font(650, big);
    ctx.fillStyle = '#111114';
    const l2 = TAGLINE.line2;
    ctx.fillText(l2, (W - ctx.measureText(l2).width) / 2, y1 + 150 * S);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.premultiplyAlpha = false;
    this.u.map.value?.dispose();
    this.u.map.value = tex;
    this.aspect = W / H;
  }

  /** Place at the ring centre, `width` world units wide, facing the camera. */
  place(center: THREE.Vector3, width: number) {
    this.mesh.position.copy(center);
    this.mesh.scale.set(width, width / this.aspect, 1);
  }

  update(reveal: number, opacity: number, time: number) {
    this.u.uReveal.value = reveal;
    this.u.uOpacity.value = opacity;
    this.u.uTime.value = time;
    this.mesh.visible = opacity > 0.002 && reveal > 0.001;
  }
}
