import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CAMPAIGNS } from './content/campaigns';
import { buildStaticMark, fillMarkIcon } from './hero/staticHero';
import { PIN_LENGTH_VH } from './hero/timeline';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

// Nav icon
fillMarkIcon($<SVGSVGElement>('[data-mark-icon]'));

// Work grid (same asset list as the hero)
const grid = $<HTMLUListElement>('[data-work-grid]');
grid.innerHTML = CAMPAIGNS.slice(0, 8)
  .map(
    (c) => `<li class="work__card">
      <div class="work__media">
        <img src="${c.poster}" alt="${c.alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async" width="800" height="1000" />
        ${c.placeholder ? '<span class="work__badge">Placeholder</span>' : ''}
      </div>
      <div class="work__meta"><span>${c.title}</span><span>${c.client}</span></div>
    </li>`,
  )
  .join('');

// Static mark is always built: it's the reduced-motion / no-WebGL layout.
buildStaticMark($<SVGSVGElement>('[data-static-mark]'), CAMPAIGNS);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const forceStatic = new URLSearchParams(location.search).has('static');

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

if (!reduceMotion && !forceStatic && webglAvailable()) {
  initMotion().catch((err) => {
    console.error('Hero animation failed, using static layout', err);
    $('[data-hero]').classList.remove('is-gl');
  });
}

async function initMotion() {
  // three.js and the scene code load only when motion is allowed.
  const { HeroScene } = await import('./hero/heroScene');
  await document.fonts?.ready;
  const hero = $<HTMLElement>('[data-hero]');
  const stage = $<HTMLElement>('[data-hero-stage]');
  const scene = new HeroScene(
    {
      hero,
      stage,
      canvas: $<HTMLCanvasElement>('[data-hero-canvas]'),
      wordmark: $<HTMLElement>('[data-wordmark]'),
      markHit: $<HTMLButtonElement>('[data-mark-hit]'),
      hint: document.querySelector<HTMLElement>('[data-hero-hint]'),
    },
    CAMPAIGNS,
  );

  ScrollTrigger.config({ ignoreMobileResize: true });
  const st = ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${Math.round(window.innerHeight * PIN_LENGTH_VH)}`,
    pin: stage,
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => scene.setProgress(self.progress),
  });
  scene.setProgress(st.progress);

  // Debug / review helper: ?p=0.7 jumps to a point in the sequence.
  const jump = new URLSearchParams(location.search).get('p');
  if (jump !== null) window.scrollTo(0, st.start + (st.end - st.start) * Number(jump));

  (window as unknown as { __hero: unknown }).__hero = { scene, st };
}
