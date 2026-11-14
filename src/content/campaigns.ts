// ─────────────────────────────────────────────────────────────────────────────
// Campaign media for the homepage hero ring, logo fill and work grid.
// THIS IS THE ONE PLACE TO EDIT CARD MEDIA.
//
// To replace a placeholder:
//   1. Drop the files in  public/media/campaigns/  (or use a CDN URL).
//      Poster: JPG/WebP, portrait 4:5, ~800×1000, < 150 KB.
//      Video:  MP4 (H.264, muted, no audio track), 4:5, ≤ 720px wide, 4–8 s loop, < 1.5 MB.
//   2. Update that entry's poster / video / alt / title / client and set
//      placeholder: false.
//
// Order matters: cards 1–6 fill the mark's top facet, 7–12 the lower facet,
// 13–18 the left facet. The first entries load first, so put your strongest
// work at the start of each group. Keep 18 entries (3 facets × 6 tiles).
// Only a few cards with `video` play at once; the rest show their poster.
// ─────────────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  title: string;
  client: string;
  /** Poster image, also the still shown while video loads and for reduced motion. */
  poster: string;
  /** Optional muted loop. Leave undefined for a poster-only card. */
  video?: string;
  /** Describe what the image shows, not just the campaign name. */
  alt: string;
  /** Link to a case study, if one exists. */
  href?: string;
  /** True for generated stand-ins; flip to false when real media lands. */
  placeholder: boolean;
}

const BASE = `${import.meta.env.BASE_URL}media/campaigns/`;
const VIDEO_SLOTS = new Set([2, 5, 8, 11, 14, 17]);

export const CAMPAIGNS: Campaign[] = Array.from({ length: 18 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    id: `placeholder-${n}`,
    title: `Campaign ${n}`,
    client: 'Placeholder client',
    poster: `${BASE}placeholder-${n}.jpg`,
    video: VIDEO_SLOTS.has(i + 1) ? `${BASE}placeholder-${n}.mp4` : undefined,
    alt: `Placeholder artwork for campaign ${n}: abstract colour composition, to be replaced with real Growency work.`,
    placeholder: true,
  };
});
