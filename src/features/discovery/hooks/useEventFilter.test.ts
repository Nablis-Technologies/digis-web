import { describe, it, expect } from 'vitest';
import { filterAndSortEvents, type EventFilterOptions } from '@/features/discovery/hooks/useEventFilter';
import { eventSoldOut } from '@/lib/eventAvailability';
import type { Event } from '@/types';

function ev(overrides: Partial<Event>): Event {
  return {
    id: 'e',
    name: 'Event',
    date: '2026-10-01T18:00:00.000Z',
    time: '6:00 PM',
    venue: 'Venue',
    city: 'Addis',
    image: '',
    category: 'All',
    priceFromMinor: 100000,
    currency: 'ETB',
    ...overrides,
  };
}

const baseOptions: EventFilterOptions = {
  searchQuery: '',
  selectedCategory: 'All',
  sortBy: 'soonest',
  onlyAvailable: false,
  eventTypes: [],
  priceRange: null,
};

function ended(overrides: Partial<Event> = {}): Event {
  return ev({
    ...overrides,
    eventDates: [{ id: 'd1', startsAt: '2020-01-01T18:00:00.000Z', endsAt: '2020-01-01T22:00:00.000Z', status: 'scheduled' }],
  });
}

describe('filterAndSortEvents — ordering tiers', () => {
  it('sorts a sold-out event after an available one, even when featured + sooner', () => {
    const soldOutFeatured = ev({
      id: 'sold',
      featured: true,
      soldOut: true,
      date: '2026-09-01T18:00:00.000Z',
    });
    const available = ev({ id: 'open', date: '2026-12-01T18:00:00.000Z' });

    const result = filterAndSortEvents([soldOutFeatured, available], baseOptions);
    expect(result.map((e) => e.id)).toEqual(['open', 'sold']);
  });

  it('treats ticketsLeft === 0 as sold out', () => {
    const zeroLeft = ev({ id: 'zero', ticketsLeft: 0, date: '2026-09-01T18:00:00.000Z' });
    const open = ev({ id: 'open', date: '2026-12-01T18:00:00.000Z' });

    const result = filterAndSortEvents([zeroLeft, open], baseOptions);
    expect(result.map((e) => e.id)).toEqual(['open', 'zero']);
  });

  it('keeps sold-out events before ended events', () => {
    const soldOut = ev({ id: 'sold', soldOut: true, date: '2026-09-01T18:00:00.000Z' });
    const pastEvent = ended({ id: 'ended', date: '2026-01-01T18:00:00.000Z' });

    const result = filterAndSortEvents([pastEvent, soldOut], baseOptions);
    expect(result.map((e) => e.id)).toEqual(['sold', 'ended']);
  });

  it('keeps available events first even when a sold-out event is featured', () => {
    const soldOutFeatured = ev({ id: 'sold', featured: true, soldOut: true });
    const openFeatured = ev({ id: 'open', featured: true });
    const openPlain = ev({ id: 'open2' });

    const result = filterAndSortEvents([soldOutFeatured, openPlain, openFeatured], baseOptions);
    expect(result.map((e) => e.id)).toEqual(['open', 'open2', 'sold']);
  });
});

describe('eventSoldOut', () => {
  it('treats missing ticketsLeft as not sold out', () => {
    expect(eventSoldOut(ev({}))).toBe(false);
  });

  it('honours the explicit soldOut flag and a zero count', () => {
    expect(eventSoldOut(ev({ soldOut: true }))).toBe(true);
    expect(eventSoldOut(ev({ ticketsLeft: 0 }))).toBe(true);
    expect(eventSoldOut(ev({ ticketsLeft: 5 }))).toBe(false);
    expect(eventSoldOut(ev({ ticketsLeft: 0, soldOut: false }))).toBe(true);
  });
});