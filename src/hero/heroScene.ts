// Orchestrates the hero: ring of campaign cards, wordmark disintegration,
// assembly into the mark, chrome reveal and the white-on-white end state.
import * as THREE from 'three';
import gsap from 'gsap';
import { MARK_ASPECT, MARK_FACETS_UNIT } from '../brand/mark';
import type { Campaign } from '../content/campaigns';
import { Card } from './card';
import { ChromeMark } from './chromeMark';
import { PosterLoader, VideoPool } from './media';
import { assignTiles } from './tiles';
import { clamp01, easeInOut, easeOut, lerp, phases, seg, smooth, type Phases } from './timeline';
import { WordmarkFx } from './wordmarkFx';

const FOV = 30;
const CAM_Z = 20;
const BASE_DRIFT = 0.11; // rad/s at rest
const TAU = Math.PI * 2;

interface Els {
  hero: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  wordmark: HTMLElement;
  markHit: HTMLButtonElement;
  hint: HTMLElement | null;
}

interface Layout {
  w: number;
  h: number;
  small: boolean;
  visW: number;
  visH: number;
  ringCenter: THREE.Vector3;
  ringR: number;
  cardW: number;
  cardH: number;
  frontMin: number;
  frontMax: number;
  tilt0: number;
  logoCenter: THREE.Vector3;
  logoH: number;
}

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _s0 = new THREE.Vector3();
const _s1 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

export class HeroScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  private ui = new THREE.Scene();
  private uiCam = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  private logo = new THREE.Group();
  private cards: Card[];
  private chrome: ChromeMark;
  private word = new WordmarkFx();
  private posters: PosterLoader;
  private videos: VideoPool;
  private L!: Layout;

  private target = 0; // scroll progress from ScrollTrigger
  private p = 0; // smoothed progress actually rendered
  private spin = 0;
  private spinVel = 0;
  private dragging = false;
  private lastX = 0;
  private lastT = 0;
  private hover = { v: 0 };
  private hoverLocked = false;
  private visible = true;
  private raf = 0;
  private prevTime = 0;
  private videoTick = 0;

  constructor(
    private els: Els,
    campaigns: Campaign[],
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.autoClear = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera.position.set(0, 0, CAM_Z);

    const tiles = assignTiles(campaigns);
    this.cards = campaigns.map((c, i) => new Card(i, tiles[i], !!c.video));
    for (const c of this.cards) this.scene.add(c.mesh);

    this.chrome = new ChromeMark(this.renderer, this.scene);
    this.logo.add(this.chrome.root);
    this.scene.add(this.logo);
    this.ui.add(this.word.group);

    this.posters = new PosterLoader(campaigns, Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.videos = new VideoPool(campaigns, 3);

    this.resize();
    // Load the cards at the front of the ring first, then the rest.
    const order = this.cards
      .map((c) => ({ i: c.index, f: Math.cos(this.angleOf(c.index)) }))
      .sort((a, b) => b.f - a.f)
      .map((o) => o.i);
    this.posters.request(order);

    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(els.stage);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (!this.visible) this.videos.pauseAll();
    }).observe(els.hero);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.videos.pauseAll();
    });

    els.hero.classList.add('is-gl');
    this.prevTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  setProgress(p: number) {
    this.target = p;
  }

  /** Jump straight to the current scroll progress (used by review tooling). */
  snap() {
    this.p = this.target;
  }

  // ── Layout ─────────────────────────────────────────────
  private resize = () => {
    const { stage, wordmark } = this.els;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.uiCam.right = w;
    this.uiCam.bottom = -h;
    this.uiCam.updateProjectionMatrix();

    const visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const visW = visH * (w / h);
    const pxToW = visH / h;
    const small = w < 700;

    const sr = stage.getBoundingClientRect();
    const svg = wordmark.querySelector('svg')!;
    const wr = svg.getBoundingClientRect();
    const rect = { x: wr.left - sr.left, y: wr.top - sr.top, w: wr.width, h: wr.height };
    this.word.layout(rect, dpr, small);

    // Ring sits in the space under the wordmark.
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    const zoneTop = rect.y + rect.h + (small ? 12 : 8);
    const zoneBottom = h - (small ? 64 : 56);
    const zoneH = Math.max(120, zoneBottom - zoneTop);
    const cardRatio = small ? 0.33 : 0.31; // card width relative to radius
    const frontMax = small ? 1.12 : 1.2;
    const tilt0 = small ? 0.4 : 0.24; // phones: see more of the ring's face to use the height
    // Fit by width (ring diameter + a front card) and by height (tilted ellipse + card).
    const rByW = (visW * (small ? 1.12 : 0.88)) / (2 + cardRatio * 0.7); // phones: ring spills past the edges
    const rByH = (zoneH * pxToW) / (2 * Math.sin(tilt0) + cardRatio * 1.25 * frontMax + 0.28);
    const ringR = Math.min(rByW, rByH, 7.5);
    const cardW = ringR * cardRatio;
    const zoneMid = (zoneTop + zoneBottom) / 2;
    const ringCenter = new THREE.Vector3(0, (h / 2 - zoneMid) * pxToW + ringR * 0.05, 0);

    // The assembled mark: as large as the viewport allows under the nav.
    const logoH = Math.min(visH * (small ? 0.5 : 0.64), (visW * (small ? 0.84 : 0.72)) / MARK_ASPECT);
    const logoMidPx = (navH + h) / 2;
    const logoCenter = new THREE.Vector3(0, (h / 2 - logoMidPx) * pxToW, 0);

    this.L = { w, h, small, visW, visH, ringCenter, ringR, cardW, cardH: cardW * 1.25, frontMin: small ? 0.68 : 0.72, frontMax, tilt0, logoCenter, logoH };

    // Fragments drift toward the top of the orbit.
    const top = this.worldToPx(_v.set(ringCenter.x, ringCenter.y + ringR * Math.sin(tilt0), -ringR * Math.cos(tilt0)));
    this.word.setTarget(top.x, top.y);
  };

  private worldToPx(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.L.w, y: (-p.y * 0.5 + 0.5) * this.L.h };
  }

  // ── Input: drag the ring with inertia; hover/tap the final mark ──
  private bindInput() {
    const { stage, markHit, hero } = this.els;
    stage.addEventListener('pointerdown', (e) => {
      if (phases(this.p).fly > 0.02 || e.button > 0) return;
      if ((e.target as HTMLElement).closest('a,button')) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastT = performance.now();
      this.spinVel = 0;
      hero.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const now = performance.now();
      const dx = e.clientX - this.lastX;
      const dt = Math.max(1, now - this.lastT) / 1000;
      const k = (TAU / Math.max(600, this.L.w)) * 0.9;
      this.spin += dx * k;
      this.spinVel = lerp(this.spinVel, (dx * k) / dt, 0.4);
      this.lastX = e.clientX;
      this.lastT = now;
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      hero.classList.remove('is-dragging');
      if (performance.now() - this.lastT > 90) this.spinVel = 0; // released after holding still
      this.spinVel = THREE.MathUtils.clamp(this.spinVel, -6, 6);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    const to = (v: number) => gsap.to(this.hover, { v, duration: v ? 0.7 : 0.9, ease: v ? 'power2.out' : 'power2.inOut', overwrite: true });
    markHit.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && !this.hoverLocked && to(1));
    markHit.addEventListener('pointerleave', (e) => e.pointerType !== 'touch' && !this.hoverLocked && to(0));
    markHit.addEventListener('focus', () => to(1));
    markHit.addEventListener('blur', () => {
      this.hoverLocked = false;
      markHit.setAttribute('aria-pressed', 'false');
      to(0);
    });
    // Tap (touch) or click/Enter toggles and holds the highlight.
    markHit.addEventListener('click', () => {
      this.hoverLocked = !this.hoverLocked;
      markHit.setAttribute('aria-pressed', String(this.hoverLocked));
      to(this.hoverLocked ? 1 : 0);
    });
  }

  private angleOf(i: number) {
    return (i / this.cards.length) * TAU + this.spin;
  }

  // ── Frame ──────────────────────────────────────────────
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    if (!this.visible) return;

    // Ease rendered progress toward scroll progress (works in both directions).
    const k = 1 - Math.exp(-dt * 9);
    this.p += (this.target - this.p) * k;
    if (Math.abs(this.target - this.p) < 1e-4) this.p = this.target;
    const ph = phases(this.p);

    // Spin: slow drift + drag inertia, plus scroll-driven acceleration.
    if (!this.dragging) {
      this.spin += (BASE_DRIFT + this.spinVel) * dt;
      this.spinVel *= Math.exp(-dt * 2.2);
    }

    this.updateLogo(ph);
    this.updateCards(ph);
    this.word.update(ph.type);
    this.updateUi(ph);

    if (now - this.videoTick > 250) {
      this.videoTick = now;
      this.updateVideos(ph);
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.render(this.ui, this.uiCam);
  };

  private updateLogo(ph: Phases) {
    const { logoCenter, logoH } = this.L;
    const c = ph.chrome;
    const wht = smooth(ph.white);
    // Tilt in to show the bevelled edges during the chrome reveal, then settle flat.
    const tiltIn = Math.sin(Math.PI * Math.min(1, c * 1.15)) * (1 - wht);
    const rest = 1 - wht;
    this.logo.position.copy(logoCenter);
    this.logo.rotation.set(0.06 * tiltIn + 0.03 * smooth(c) * rest, -0.36 * tiltIn - 0.07 * smooth(c) * rest, 0);
    this.logo.scale.setScalar(logoH);
    this.logo.updateMatrixWorld(true);

    const sweep = lerp(-0.2, 1.2, easeInOut(seg(c, 0.0, 0.62)));
    const glint = lerp(-0.4, 1.5, seg(c, 0.55, 1));
    const depth = easeOut(seg(c, 0.12, 0.7));
    this.chrome.update(sweep, glint, depth, wht, this.hover.v);
  }

  private updateCards(ph: Phases) {
    const L = this.L;
    const N = this.cards.length;
    const o = easeInOut(ph.orbit);
    const tilt = lerp(L.tilt0, Math.max(0.62, L.tilt0 + 0.2), o);
    const radius = L.ringR * lerp(1, 1.1, o);
    const boost = Math.pow(ph.orbit, 2) * 2.4 + ph.fly * 1.2; // accelerate (reversible: driven by scroll)
    const center = _v.copy(L.ringCenter).lerp(L.logoCenter, o * 0.85);
    const ringM = _m.compose(center, _q0.setFromEuler(_e.set(tilt, 0, -0.07 * (1 - o))), ONE);
    const logoM = this.logo.matrixWorld;
    const logoInv = _m2.copy(logoM).invert();
    const sweep = this.chrome.u.uSweep.value;

    for (const card of this.cards) {
      const i = card.index;
      const a = (i / N) * TAU + this.spin + boost;
      const front = (Math.cos(a) + 1) / 2;
      const fs = lerp(L.frontMin, lerp(L.frontMax, 1, o), smooth(front));

      // Orbit pose
      _p0.set(Math.sin(a) * radius, 0, Math.cos(a) * radius).applyMatrix4(ringM);
      _q0.setFromEuler(_e.set(tilt, 0, -0.07 * (1 - o))).multiply(_q1.setFromEuler(_e.set(-tilt * 0.55, a, 0)));
      _s0.set(L.cardW * fs, L.cardH * fs, 1);

      // Stagger: facets fill together, cards within a facet in sequence.
      const rank = (i % 6) * 3 + card.tile.facet;
      const delay = (rank / (N - 1)) * 0.32;
      const m = easeInOut(clamp01((ph.fly - delay) / 0.68));

      let front2 = front;
      if (m > 0) {
        const t = card.tile;
        const z = 0.004 + (i % 6) * 0.0012;
        _p1.set(t.cx, t.cy, z).applyMatrix4(logoM);
        _q1.setFromRotationMatrix(logoM);
        _s1.set(t.w * L.logoH * 1.015, t.h * L.logoH * 1.015, 1);
        _p0.lerp(_p1, m);
        _p0.z += Math.sin(Math.PI * m) * L.ringR * 0.35; // arc toward the viewer
        _q0.slerp(_q1, m);
        _s0.lerp(_s1, m);
        front2 = lerp(front, 1, Math.min(1, m * 1.6));
      }
      card.mesh.position.copy(_p0);
      card.mesh.quaternion.copy(_q0);
      card.mesh.scale.copy(_s0);

      const u = card.u;
      u.uFront.value = front2;
      u.uPlaneAspect.value = _s0.x / _s0.y;
      u.uClip.value = smooth(seg(m, 0.72, 1));
      u.uRadius.value = 0.045 * (1 - smooth(seg(m, 0.5, 1)));
      u.uLogoInv.value.copy(logoInv);
      u.uSweep.value = sweep;
      u.uAspect.value = MARK_ASPECT;
      card.mesh.visible = sweep < 1.19;

      const tex = this.videos.textureFor(i) ?? this.posters.textures.get(i);
      if (tex) card.setTexture(tex.tex, tex.aspect);
    }
  }

  private updateVideos(ph: Phases) {
    if (!this.visible || document.hidden) return this.videos.pauseAll();
    if (ph.chrome > 0.45) return this.videos.pauseAll();
    if (ph.fly < 0.5) {
      // In orbit: the clips nearest the front.
      const ids = this.cards
        .filter((c) => c.hasVideo)
        .map((c) => ({ i: c.index, f: Math.cos(this.angleOf(c.index) + Math.pow(ph.orbit, 2) * 2.4 + ph.fly * 1.2) }))
        .filter((o) => o.f > 0.35)
        .sort((a, b) => b.f - a.f)
        .map((o) => o.i);
      this.videos.setWanted(ids);
    } else {
      // In the mark: the best-placed clip in each facet.
      const ids: number[] = [];
      for (let f = 0; f < MARK_FACETS_UNIT.length; f++) {
        const best = this.cards.filter((c) => c.hasVideo && c.tile.facet === f).sort((a, b) => b.tile.coverage - a.tile.coverage)[0];
        if (best) ids.push(best.index);
      }
      this.videos.setWanted(ids);
    }
    // Start fetching any posters not yet requested (offscreen ones last).
    this.posters.request(this.cards.map((c) => c.index));
  }

  private updateUi(ph: Phases) {
    const { hint, markHit } = this.els;
    if (hint) hint.style.opacity = String(1 - seg(this.p, 0.005, 0.05));
    const active = ph.white > 0.6;
    if (active !== markHit.classList.contains('is-active')) {
      markHit.classList.toggle('is-active', active);
      markHit.tabIndex = active ? 0 : -1;
      if (!active && this.hover.v > 0) {
        this.hoverLocked = false;
        gsap.to(this.hover, { v: 0, duration: 0.4, overwrite: true });
      }
    }
    if (active) {
      // Keep the hit target over the mark's on-screen bounds.
      const hw = MARK_ASPECT / 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of [[-hw, -0.5], [hw, -0.5], [-hw, 0.5], [hw, 0.5]]) {
        const s = this.worldToPx(_v.set(x, y, 0).applyMatrix4(this.logo.matrixWorld));
        x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
      }
      Object.assign(markHit.style, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.videos.pauseAll();
    this.word.dispose();
    this.chrome.dispose();
    this.renderer.dispose();
  }
}
