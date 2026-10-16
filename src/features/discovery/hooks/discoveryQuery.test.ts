import { describe, it, expect } from 'vitest';
import {
  discoveryServerQuery,
  DISCOVERY_CURRENCY,
  type DiscoveryFilterState,
} from '@/features/discovery/hooks/discoveryQuery';
import { filterAndSortEvents, PRICE_RANGE_WINDOWS } from '@/features/discovery/hooks/useEventFilter';
import type { Event } from '@/types';

const base: DiscoveryFilterState = {
  q: '',
  sortBy: 'soonest',
  eventTypes: [],
  priceRange: null,
};

function build(overrides: Partial<DiscoveryFilterState> = {}) {
  return discoveryServerQuery({ ...base, ...overrides });
}

describe('discoveryServerQuery — search + category', () => {
  it('omits the search below the backend minimum (2 chars)', () => {
    expect(build({ q: 'j' })).not.toHaveProperty('q');
    expect(build({ q: '  ' })).not.toHaveProperty('q');
  });

  it('sends the trimmed search at the threshold', () => {
    expect(build({ q: '  jazz ' })).toMatchObject({ q: 'jazz' });
  });

  it('sends the resolved backend category slug, and none for "All"', () => {
    expect(build({ categorySlug: 'music' })).toMatchObject({ category: 'music' });
    expect(build({ categorySlug: undefined })).not.toHaveProperty('category');
  });
});

describe('discoveryServerQuery — sort', () => {
  it('maps the client sorts onto the backend sort values', () => {
    expect(build({ sortBy: 'soonest' })).toMatchObject({ sort: 'soonest' });
    expect(build({ sortBy: 'price-low' })).toMatchObject({ sort: 'price_asc' });
    expect(build({ sortBy: 'price-high' })).toMatchObject({ sort: 'price_desc' });
  });

  it('does not claim a server sort for the client-only "available" order', () => {
    expect(build({ sortBy: 'available' })).not.toHaveProperty('sort');
  });

  it('attaches the required currency to a price sort', () => {
    expect(build({ sortBy: 'price-low' })).toMatchObject({ currency: DISCOVERY_CURRENCY });
    expect(build({ sortBy: 'price-high' })).toMatchObject({ currency: DISCOVERY_CURRENCY });
    expect(build({ sortBy: 'soonest' })).not.toHaveProperty('currency');
  });
});

describe('discoveryServerQuery — price window', () => {
  it('bounds free events to exactly zero', () => {
    expect(build({ eventTypes: ['free'] })).toMatchObject({
      minPriceMinor: 0,
      maxPriceMinor: 0,
      currency: DISCOVERY_CURRENCY,
    });
  });

  it('bounds ticketed events to at least one minor unit, unbounded above', () => {
    const built = build({ eventTypes: ['ticketed'] })!;
    expect(built).toMatchObject({ minPriceMinor: 1, currency: DISCOVERY_CURRENCY });
    expect(built).not.toHaveProperty('maxPriceMinor');
  });

  it('applies no price bound when both access chips are on (filters cancel)', () => {
    const built = build({ eventTypes: ['free', 'ticketed'] })!;
    expect(built).not.toHaveProperty('minPriceMinor');
    expect(built).not.toHaveProperty('maxPriceMinor');
    expect(built).not.toHaveProperty('currency');
  });

  it('maps each price-range chip onto a minor-unit window', () => {
    expect(build({ priceRange: 'free' })).toMatchObject({ minPriceMinor: 0, maxPriceMinor: 0 });
    expect(build({ priceRange: 'under-1000' })).toMatchObject({ minPriceMinor: 1, maxPriceMinor: 99_999 });
    expect(build({ priceRange: '1000-3000' })).toMatchObject({ minPriceMinor: 100_000, maxPriceMinor: 300_000 });
    const top = build({ priceRange: '3000-plus' })!;
    expect(top).toMatchObject({ minPriceMinor: 300_001 });
    expect(top).not.toHaveProperty('maxPriceMinor');
  });

  it('intersects the access and price-range windows', () => {
    expect(build({ eventTypes: ['ticketed'], priceRange: 'under-1000' })).toMatchObject({
      minPriceMinor: 1,
      maxPriceMinor: 99_999,
    });
    expect(build({ eventTypes: ['ticketed'], priceRange: '3000-plus' })).toMatchObject({
      minPriceMinor: 300_001,
    });
    expect(build({ eventTypes: ['free'], priceRange: 'free' })).toMatchObject({
      minPriceMinor: 0,
      maxPriceMinor: 0,
    });
  });

  it('returns null when the controls contradict — no server query can express it', () => {
    expect(build({ eventTypes: ['free'], priceRange: 'under-1000' })).toBeNull();
    expect(build({ eventTypes: ['free'], priceRange: '3000-plus' })).toBeNull();
    expect(build({ eventTypes: ['ticketed'], priceRange: 'free' })).toBeNull();
  });
});

/**
 * The chip windows are shared with the client filter, so this locks the meaning
 * of each chip against drift between the two.
 */
describe('PRICE_RANGE_WINDOWS — shared chip semantics', () => {
  function ev(priceFromMinor: number): Event {
    return {
      id: 'e',
      name: 'Event',
      date: '2026-10-01T18:00:00.000Z',
      time: '6:00 PM',
      venue: 'Venue',
      city: 'Addis',
      image: '',
      category: 'Music',
      priceFromMinor,
      currency: 'ETB',
    };
  }

  it('classifies an event into the window its chip advertises', () => {
    const cases: [number, keyof typeof PRICE_RANGE_WINDOWS][] = [
      [0, 'free'],
      [1, 'under-1000'],
      [99_999, 'under-1000'],
      [100_000, '1000-3000'],
      [300_000, '1000-3000'],
      [300_001, '3000-plus'],
    ];
    for (const [price, range] of cases) {
      const matched = filterAndSortEvents([ev(price)], {
        searchQuery: '',
        selectedCategory: 'All',
        sortBy: 'soonest',
        onlyAvailable: false,
        eventTypes: [],
        priceRange: range,
      });
      expect(matched, `${price} should fall in ${range}`).toHaveLength(1);
    }
  });
});

describe('discoveryServerQuery — composition', () => {
  it('merges search, category, price and sort into one query', () => {
    expect(
      build({
        q: 'jazz',
        categorySlug: 'music',
        sortBy: 'price-low',
        eventTypes: ['ticketed'],
        priceRange: 'under-1000',
      }),
    ).toEqual({
      q: 'jazz',
      category: 'music',
      sort: 'price_asc',
      currency: DISCOVERY_CURRENCY,
      minPriceMinor: 1,
      maxPriceMinor: 99_999,
    });
  });
});
