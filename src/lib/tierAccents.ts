import type { TicketTier } from '@/types';

export type TierAccent = NonNullable<TicketTier['accent']>;

/**
 * Tier accent palettes. `rgb`/`inkRgb` are rgb-triplet strings for rgba()
 * usage; `bright`/`ink` are the hex fill colors for dark vs light mode.
 * Light mode uses the adjacent deeper "ink" shade instead of the same bright
 * color as dark mode.
 */
export const TIER_ACCENTS: Record<TierAccent, { rgb: string; bright: string; ink: string; inkRgb: string; bg: string }> = {
  emerald: { rgb: '52, 211, 153', bright: '#34d399', ink: '#047857', inkRgb: '4, 120, 87', bg: 'rgba(52,211,153,0.08)' },
  rose: { rgb: '251, 113, 133', bright: '#fb7185', ink: '#be123c', inkRgb: '190, 18, 60', bg: 'rgba(251,113,133,0.08)' },
  violet: { rgb: '196, 181, 253', bright: '#c4b5fd', ink: '#6d28d9', inkRgb: '109, 40, 217', bg: 'rgba(196,181,253,0.08)' },
  gold: { rgb: '250, 200, 60', bright: '#fac83c', ink: '#9a6a00', inkRgb: '154, 106, 0', bg: 'rgba(250,200,60,0.06)' },
  blue: { rgb: '96, 165, 250', bright: '#60a5fa', ink: '#1d4ed8', inkRgb: '29, 78, 216', bg: 'rgba(96,165,250,0.08)' },
};

/** Resolve a tier's palette. Prefers the explicit rank `accent` (set by the
 *  products adapter); falls back to the legacy semantic flags for mock tiers. */
export function resolveTierAccent(type: TicketTier) {
  if (type.accent) return TIER_ACCENTS[type.accent];
  if (type.isEarlyBird) return TIER_ACCENTS.emerald;
  if (type.isCouples) return TIER_ACCENTS.rose;
  if (type.isElite) return TIER_ACCENTS.violet;
  if (type.isPremium) return TIER_ACCENTS.gold;
  return TIER_ACCENTS.blue;
}

const MIDDLE_ACCENTS: TierAccent[] = ['blue', 'violet'];

/**
 * Assign price-rank accents to already-sorted tiers (ascending price):
 * cheapest → emerald (deal), priciest → gold (premium), middles alternate
 * blue/violet. Single-tier events stay unaccented (standard blue — no false
 * "deal"). Presentation-only; money/behaviour come from the backend.
 */
export function applyRankAccents(tiers: TicketTier[]): void {
  if (tiers.length <= 1) return;
  let middleIndex = 0;
  tiers.forEach((tier, i) => {
    if (i === 0) tier.accent = 'emerald';
    else if (i === tiers.length - 1) tier.accent = 'gold';
    else tier.accent = MIDDLE_ACCENTS[middleIndex++ % MIDDLE_ACCENTS.length];
  });
}