import { describe, it, expect } from 'vitest';
import { applyRankAccents, resolveTierAccent, TIER_ACCENTS } from '@/lib/tierAccents';
import type { TicketTier } from '@/types';

function tier(priceMinor: number, name = `t${priceMinor}`): TicketTier {
  return { name, level: 'GENERAL', priceMinor, available: 1, features: [] };
}

describe('applyRankAccents', () => {
  it('leaves a single tier unaccented (standard blue, no false deal)', () => {
    const tiers = [tier(1000)];
    applyRankAccents(tiers);
    expect(tiers[0].accent).toBeUndefined();
  });

  it('two tiers: cheapest emerald, priciest gold', () => {
    const tiers = [tier(1000), tier(3000)];
    applyRankAccents(tiers);
    expect(tiers.map((t) => t.accent)).toEqual(['emerald', 'gold']);
  });

  it('three tiers: emerald, blue, gold', () => {
    const tiers = [tier(1000), tier(2000), tier(3000)];
    applyRankAccents(tiers);
    expect(tiers.map((t) => t.accent)).toEqual(['emerald', 'blue', 'gold']);
  });

  it('four tiers: emerald, blue, violet, gold', () => {
    const tiers = [tier(1000), tier(2000), tier(3000), tier(4000)];
    applyRankAccents(tiers);
    expect(tiers.map((t) => t.accent)).toEqual(['emerald', 'blue', 'violet', 'gold']);
  });

  it('is idempotent across runs on the same sorted list', () => {
    const tiers = [tier(1000), tier(2000), tier(3000)];
    applyRankAccents(tiers);
    const first = tiers.map((t) => t.accent);
    applyRankAccents(tiers);
    expect(tiers.map((t) => t.accent)).toEqual(first);
  });
});

describe('resolveTierAccent', () => {
  it('prefers the explicit rank accent over semantic flags', () => {
    const t = { ...tier(1000), accent: 'gold', isEarlyBird: true } as TicketTier;
    expect(resolveTierAccent(t)).toBe(TIER_ACCENTS.gold);
  });

  it('falls back to semantic flags (mock tiers)', () => {
    expect(resolveTierAccent({ ...tier(1000), isEarlyBird: true } as TicketTier)).toBe(TIER_ACCENTS.emerald);
    expect(resolveTierAccent({ ...tier(1000), isElite: true } as TicketTier)).toBe(TIER_ACCENTS.violet);
    expect(resolveTierAccent({ ...tier(1000), isPremium: true } as TicketTier)).toBe(TIER_ACCENTS.gold);
    expect(resolveTierAccent(tier(1000))).toBe(TIER_ACCENTS.blue);
  });

  it('light-mode ink differs from the dark-mode bright for every accent', () => {
    for (const key of Object.keys(TIER_ACCENTS) as Array<keyof typeof TIER_ACCENTS>) {
      const a = TIER_ACCENTS[key];
      expect(a.ink).not.toBe(a.bright);
    }
  });
});