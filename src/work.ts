// "The work": the full-bleed spec reel the hero zooms into, then a bento of
// Growency's services (strategy, creative, testing, budget, reporting),
// pricing, FAQ and clients. Copy comes from trygrowency.com.
import './work.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initWork(motion: boolean) {
  const work = document.querySelector<HTMLElement>('[data-work]');
  if (!work) return;
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

  // ── FAQ: one answer open at a time ──
  const faqs = [...work.querySelectorAll<HTMLDetailsElement>('.svc--faq details')];
  faqs.forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) faqs.forEach((o) => o !== d && (o.open = false));
    }),
  );

  // Scrolling carries the attached logo/review cards across the dark stage.
  const stories = work.querySelector<HTMLElement>('[data-client-stories]');
  const track = work.querySelector<HTMLElement>('[data-review-track]');
  if (!stories || !track) return;
  const viewport = track.parentElement!;
  if (!motion) {
    stories.classList.add('is-static');
    return;
  }
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: stories,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.55,
      invalidateOnRefresh: true,
      refreshPriority: -1,
    },
  });
  // Keyboard users can read the complete row using native horizontal scrolling.
  viewport.addEventListener('focus', () => {
    gsap.set(track, { clearProps: 'transform' });
    stories.classList.add('is-keyboard');
  });
  viewport.addEventListener('blur', () => {
    stories.classList.remove('is-keyboard');
    ScrollTrigger.refresh();
  });
  ScrollTrigger.refresh();
}
