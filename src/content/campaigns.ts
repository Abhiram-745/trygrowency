// ─────────────────────────────────────────────────────────────────────────────
// Media for the homepage hero ring and the media-filled mark.
// THIS IS THE ONE PLACE TO EDIT RING CARDS.
//
// The ring uses the real Growency spec ads (src/content/work.ts), alternating
// with Growency's studio photography so the mark's mosaic can breathe. Slots with
// `video` play a gentle motion loop of the ad (scripts/gen-ad-loops.py); only a
// few play at once and the rest show their still.
//
// Order matters: cards 1–6 fill the mark's top blade, 7–12 the middle, 13–18
// the lower blade. Earlier cards load first. Keep 18 entries (3 facets × 6).
// Every spec ad must keep its "Not commissioned by …" note (shown as `client`).
// ─────────────────────────────────────────────────────────────────────────────
import { SPEC_ADS } from './work';

export interface Campaign {
  id: string;
  title: string;
  /** Shown after the title, e.g. in the preview caption. For spec ads: the required disclaimer. */
  client: string;
  /** Still image, also used while video loads and for reduced motion. */
  poster: string;
  /** Optional muted loop. Leave undefined for a still-only card. */
  video?: string;
  /** Describe what the image shows, not just the campaign name. */
  alt: string;
  /** Link to a case study, if one exists. */
  href?: string;
  /** True for generated stand-ins. */
  placeholder: boolean;
}

const LOOPS = `${import.meta.env.BASE_URL}media/campaigns/`;
const EDITORIAL = `${import.meta.env.BASE_URL}media/editorial/`;

/** Growency's own studio photography (from trygrowency.com), used between ads. */
const STUDIO: Record<string, string> = {
  strategy: 'A team at their desks in front of a pinned-up planning wall, in a glass office washed in blue and violet light.',
  meeting: 'Overhead view of a small team meeting around a round table, seen through glass in blue and violet light.',
  call: 'A person on a headset call at a desk, looking out over a city skyline at dusk.',
  conversation: 'A wide curved atrium with people walking across it, blurred with motion.',
  outreach: 'People working on laptops in an open-plan office, softly blurred in blue light.',
  leads: 'A crowd crossing a large plaza, seen from above and blurred with motion.',
};

/**
 * Slot → content. Two ads, then a studio photo, around the ring, so the mark's
 * mosaic has breathing room. `*` = plays the ad's motion loop; `@` = studio photo.
 * The two repeated ads sit directly opposite each other on the ring.
 */
const RING = [
  'aside', 'wispr-flow*', '@strategy',
  'ikea', 'granola*', '@meeting',
  'moonshot-bring-flowers', 'sandwich*', '@call',
  'moonshot-for-everything', 'allbirds*', '@conversation',
  'instinct*', 'moonshot-good-memory*', '@outreach',
  'moonshot-bring-flowers', 'sandwich', '@leads',
];

export const CAMPAIGNS: Campaign[] = RING.map((slot, i) => {
  if (slot.startsWith('@')) {
    const name = slot.slice(1);
    return {
      id: `studio-${name}`,
      title: 'Inside Growency',
      client: 'Growency studio',
      poster: `${EDITORIAL}${name}.webp`,
      alt: STUDIO[name],
      placeholder: false,
    };
  }
  const video = slot.endsWith('*');
  const id = slot.replace('*', '');
  const ad = SPEC_ADS.find((a) => a.id === id);
  if (!ad) throw new Error(`Unknown spec ad "${id}" in RING`);
  return {
    id: `${id}-${i + 1}`,
    title: ad.title,
    client: ad.note,
    poster: ad.src,
    video: video ? `${LOOPS}${id}-loop.mp4` : undefined,
    alt: ad.alt,
    placeholder: false,
  };
});
