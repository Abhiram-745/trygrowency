import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CAMPAIGNS } from './content/campaigns';
import { buildStaticMark, fillMarkIcon } from './hero/staticHero';
import { PIN_LENGTH_VH, T, seg } from './hero/timeline';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;

// Nav icon
fillMarkIcon($<SVGSVGElement>('[data-mark-icon]'));
fillMarkIcon($<SVGSVGElement>('[data-footer-mark]'));

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

  // Remove navigation from the immersive zoom and everything after it.
  // This trigger is independent of the scene RAF, so reversing from the
  // footer restores the navbar even when the hero is off screen.
  const nav = $<HTMLElement>('[data-nav]');
  const syncNav = () => {
    const progress = (window.scrollY - st.start) / Math.max(1, st.end - st.start);
    const fade = seg(progress, T.zoomStart - 0.025, T.zoomStart);
    nav.style.opacity = String(1 - fade);
    nav.inert = fade >= 0.99;
    nav.style.visibility = fade >= 0.99 ? 'hidden' : 'visible';
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: syncNav, onRefresh: syncNav });
  syncNav();

  // Debug / review helper: ?p=0.7 jumps to a point in the sequence.
  const jump = new URLSearchParams(location.search).get('p');
  if (jump !== null) window.scrollTo(0, st.start + (st.end - st.start) * Number(jump));

  (window as unknown as { __hero: unknown }).__hero = { scene, st };
}

// Load the decorative ASCII texture only as the landscape approaches.
const footer = document.querySelector<HTMLElement>('.landscape-footer');
if (footer) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    import('./footerTexture').then(({ initFooterTexture }) => initFooterTexture(footer)).catch(() => {
      // The landscape remains complete if canvas or image decoding is unavailable.
    });
  }, { rootMargin: '300px' });
  observer.observe(footer);
}
