// "The work": the full-bleed spec reel the hero zooms into, then a bento of
// real Growency material (spec ads, workflow, illustrative test, clients,
// pricing, CTA). Copy and assets come from trygrowency.com.
import './work.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SPEC_ADS, type SpecAd } from './content/work';

const FEATURED = ['wispr-flow', 'granola', 'ikea', 'moonshot-good-memory'];
const FEATURE_MS = 4800;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function figure(ad: SpecAd, hidden = false) {
  return `<figure>
      <img src="${ad.src}" width="${ad.width}" height="${ad.height}" alt="${hidden ? '' : esc(ad.alt)}" loading="lazy" decoding="async" draggable="false" />
      <figcaption${hidden ? ' aria-hidden="true"' : ''}><strong>${esc(ad.title)}</strong><span>${esc(ad.note)}</span></figcaption>
    </figure>`;
}

export function initWork(motion: boolean) {
  const work = document.querySelector<HTMLElement>('[data-work]');
  if (!work) return;
  const visible = new WeakMap<Element, boolean>();
  const watch = (el: Element) =>
    new IntersectionObserver(([e]) => visible.set(el, e.isIntersecting), { rootMargin: '100px' }).observe(el);

  // ── Feature ad: a slow crossfading slideshow with progress dots ──
  const feature = work.querySelector<HTMLElement>('[data-feature-ad]');
  if (feature) {
    const ads = FEATURED.map((id) => SPEC_ADS.find((a) => a.id === id)!).filter(Boolean);
    feature.setAttribute('aria-label', 'Featured spec ads');
    feature.innerHTML =
      ads
        .map(
          (a, i) =>
            `<div class="feature__slide${i ? '' : ' is-on'}" ${i ? 'aria-hidden="true"' : ''}><img class="feature__blur" src="${a.src}" alt="" aria-hidden="true" loading="lazy" decoding="async" />${figure(a)}</div>`,
        )
        .join('') +
      `<div class="feature__dots">${ads.map((a, i) => `<button type="button" aria-label="Show ${esc(a.title)}"${i ? '' : ' class="is-on"'}></button>`).join('')}</div>`;
    const slides = [...feature.querySelectorAll<HTMLElement>('.feature__slide')];
    const dots = [...feature.querySelectorAll<HTMLButtonElement>('.feature__dots button')];
    let cur = 0;
    let t0 = performance.now();
    const show = (n: number) => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((s, i) => {
        s.classList.toggle('is-on', i === cur);
        s.toggleAttribute('aria-hidden', i !== cur);
      });
      dots.forEach((d, i) => d.classList.toggle('is-on', i === cur));
      t0 = performance.now();
    };
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    watch(feature);
    let paused = false;
    feature.addEventListener('pointerenter', () => (paused = true));
    feature.addEventListener('pointerleave', () => {
      paused = false;
      t0 = performance.now() - parseFloat(dots[cur].style.getPropertyValue('--fill') || '0') * FEATURE_MS / 100;
    });
    if (motion) {
      const tick = (now: number) => {
        requestAnimationFrame(tick);
        if (!visible.get(feature) || paused) {
          t0 += 16;
          return;
        }
        const f = Math.min(1, (now - t0) / FEATURE_MS);
        dots[cur].style.setProperty('--fill', `${f * 100}%`);
        if (f >= 1) {
          dots[cur].style.setProperty('--fill', '0%');
          show(cur + 1);
        }
      };
      requestAnimationFrame(tick);
    }
  }

  // ── Marquee of every spec ad (duplicated for a seamless loop) ──
  const marquee = work.querySelector<HTMLElement>('[data-ad-marquee]');
  if (marquee) {
    const set = (hidden: boolean) =>
      SPEC_ADS.map((a) => `<div class="ad"${hidden ? ' aria-hidden="true"' : ' tabindex="0"'}>${figure(a, hidden)}</div>`).join('');
    marquee.innerHTML = `<div class="marquee__track">${set(false)}${set(true)}</div>`;
    // 3D tilt toward the cursor
    marquee.addEventListener('pointermove', (e) => {
      const ad = (e.target as HTMLElement).closest<HTMLElement>('.ad');
      if (!ad) return;
      const r = ad.getBoundingClientRect();
      ad.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`);
      ad.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 14}deg`);
    });
    marquee.addEventListener('pointerout', (e) => {
      const ad = (e.target as HTMLElement).closest<HTMLElement>('.ad');
      if (ad && !ad.contains(e.relatedTarget as Node)) {
        ad.style.removeProperty('--rx');
        ad.style.removeProperty('--ry');
      }
    });
  }

  // ── Cursor spotlight on every tile ──
  const bento = work.querySelector<HTMLElement>('[data-bento]');
  bento?.addEventListener('pointermove', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
    tile.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  // ── Reveal + count-ups ──
  const countUp = (el: HTMLElement) => {
    const to = Number(el.dataset.count);
    const prefix = el.dataset.prefix ?? '';
    if (!motion) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration: 1.4,
      delay: 0.3,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = prefix + Math.round(obj.v).toLocaleString('en-GB')),
    });
  };
  const reveal = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        e.target.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
        reveal.unobserve(e.target);
      }),
    { threshold: 0.18 },
  );
  work.querySelectorAll('.tile').forEach((t) => (motion ? reveal.observe(t) : t.classList.add('is-in')));

  // ── Workflow stepper: advances on its own, follows hover/focus ──
  const flow = work.querySelector<HTMLElement>('[data-flow]');
  if (flow) {
    const steps = [...flow.querySelectorAll<HTMLElement>('.flow li')];
    let step = 0;
    let held = false;
    const set = (n: number) => {
      step = n % steps.length;
      steps.forEach((s, i) => s.classList.toggle('is-on', i === step));
    };
    steps.forEach((s, i) => {
      s.tabIndex = 0;
      s.addEventListener('pointerenter', () => ((held = true), set(i)));
      s.addEventListener('focus', () => ((held = true), set(i)));
    });
    flow.addEventListener('pointerleave', () => (held = false));
    watch(flow);
    if (motion) setInterval(() => !held && visible.get(flow) && set(step + 1), 2600);
  }

  // ── Reel: plays while on screen (or while the hero's window shows it) ──
  const reel = work.querySelector<HTMLElement>('[data-reel]');
  const video = work.querySelector<HTMLVideoElement>('[data-reel-video]');
  if (reel && video) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void video.play().catch(() => {});
      else if (video.dataset.portal !== 'open') video.pause();
    }).observe(reel);
  }

  if (!motion || !reel) return;
  const frame = reel.querySelector<HTMLElement>('[data-reel-frame]')!;
  const sticky = reel.querySelector<HTMLElement>('.reel__sticky')!;
  const page = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
  const shade = reel.querySelector<HTMLElement>('[data-reel-shade]')!;
  const copy = reel.querySelector<HTMLElement>('[data-reel-copy]')!;
  const lines = copy.querySelectorAll<HTMLElement>('.reel__line > span');
  const rest = copy.querySelectorAll<HTMLElement>('.eyebrow, .reel__lede, .reel__actions');
  gsap.set(lines, { yPercent: 110 });
  gsap.set(rest, { opacity: 0, y: 24 });
  gsap
    .timeline({
      scrollTrigger: {
        trigger: reel,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        refreshPriority: -1,
        onUpdate: (self) => reel.classList.toggle('is-framed', self.progress > 0.8),
      },
      defaults: { ease: 'none' },
    })
    // Breathe on the full-bleed reel for a beat, then darken and rise the headline.
    .to(video, { scale: 1.06, duration: 1 }, 0)
    .to(shade, { opacity: 1, duration: 0.3 }, 0.12)
    .to(copy, { opacity: 1, duration: 0.01 }, 0.12)
    .to(lines, { yPercent: 0, duration: 0.28, stagger: 0.06, ease: 'power3.out' }, 0.14)
    .to(rest, { opacity: 1, y: 0, duration: 0.22, stagger: 0.04, ease: 'power2.out' }, 0.3)
    // Then the reel draws in to a framed panel before the bento.
    .fromTo(
      frame,
      { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
      { clipPath: 'inset(7% 3.5% 7% 3.5% round 30px)', duration: 0.3, ease: 'power2.inOut' },
      0.68,
    )
    // …and the page around it brightens to match the rest of the landing.
    .to(sticky, { backgroundColor: page, duration: 0.3, ease: 'power2.inOut' }, 0.68);
  ScrollTrigger.refresh();
}
