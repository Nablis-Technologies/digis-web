import { describe, it, expect } from 'vitest';
import { resolveFestivalSchedule, guestsForDay } from './festival';
import type { Event, TicketTier } from '@/types';
import type { FestivalSchedule } from './festival';

describe('resolveFestivalSchedule', () => {
  it('returns null for single-day events without festival category', () => {
    const singleEvent: Pick<Event, 'eventDates' | 'lineup' | 'category' | 'ticketTypes'> = {
      category: 'Music',
      eventDates: [
        { id: 'd1', startsAt: '2026-11-01T18:00:00Z', endsAt: '2026-11-01T23:00:00Z' },
      ],
      lineup: [],
      ticketTypes: [],
    };
    expect(resolveFestivalSchedule(singleEvent)).toBeNull();
  });

  it('derives days and states correctly for multi-day events', () => {
    const multiEvent: Pick<Event, 'eventDates' | 'lineup' | 'category' | 'ticketTypes'> = {
      category: 'Festivals',
      eventDates: [
        { id: 'd1', startsAt: '2026-12-10T14:00:00Z' },
        { id: 'd2', startsAt: '2026-12-11T14:00:00Z' },
        { id: 'd3', startsAt: '2026-12-12T14:00:00Z', status: 'cancelled' },
      ],
      lineup: [
        { name: 'Artist One', role: 'Headliner', image: 'https://example.com/1.jpg' },
        { name: 'Artist Two', role: 'Support' },
      ],
      ticketTypes: [
        { name: 'Full Weekend Pass', level: 'VIP', priceMinor: 150000, available: 50, features: [] },
        { name: 'Day 1 Ticket', level: 'GA', priceMinor: 60000, available: 100, features: [] },
      ],
    };

    const schedule = resolveFestivalSchedule(multiEvent);
    expect(schedule).not.toBeNull();
    expect(schedule!.days).toHaveLength(3);
    expect(schedule!.days[0].id).toBe('d1');
    expect(schedule!.days[2].state).toBe('cancelled');
    expect(schedule!.cancelledCount).toBe(1);
    expect(schedule!.showPass).toBe(true);
    expect(schedule!.passFromLabel).toContain('1,500');
    expect(schedule!.allGuests).toHaveLength(2);
  });
});

describe('guestsForDay', () => {
  // Build the resolved shape by hand to pin the lookup rules precisely: `d2` is
  // empty because the resolver emits [] for a day the backend assigned nobody to.
  const schedule = {
    allGuests: [{ name: 'All One' }, { name: 'All Two' }],
    guestsByDay: {
      d1: [{ name: 'Day One' }],
      d2: [],
    },
  } as unknown as FestivalSchedule;

  it('returns everyone when "All days" is picked', () => {
    expect(guestsForDay(schedule, 'all')).toEqual(schedule.allGuests);
  });

  it("returns the picked day's guests", () => {
    expect(guestsForDay(schedule, 'd1')).toEqual([{ name: 'Day One' }]);
  });

  it('keeps a known-but-empty day empty (no invented roster)', () => {
    expect(guestsForDay(schedule, 'd2')).toEqual([]);
  });

  it('falls back to everyone for an unknown day id', () => {
    expect(guestsForDay(schedule, 'missing')).toEqual(schedule.allGuests);
  });
});

describe('resolveFestivalSchedule — per-day participants', () => {
  const base = {
    category: 'Festivals',
    eventDates: [
      { id: 'd1', startsAt: '2026-12-10T14:00:00Z' },
      { id: 'd2', startsAt: '2026-12-11T14:00:00Z' },
    ],
    ticketTypes: [],
  };

  it('round-robins the roster when participants carry no day link (fallback)', () => {
    const schedule = resolveFestivalSchedule({
      ...base,
      lineup: [{ name: 'A' }, { name: 'B' }],
    });
    expect(schedule!.guestsByDay['d1'].map((a) => a.name)).toEqual(['A']);
    expect(schedule!.guestsByDay['d2'].map((a) => a.name)).toEqual(['B']);
  });

  it('honours the backend day assignment when participants carry eventDateId', () => {
    const schedule = resolveFestivalSchedule({
      ...base,
      lineup: [
        { name: 'A', eventDateId: 'd1' },
        { name: 'B', eventDateId: 'd2' },
        { name: 'Host' }, // event-level → every day
      ],
    });
    expect(schedule!.guestsByDay['d1'].map((a) => a.name).sort()).toEqual(['A', 'Host']);
    expect(schedule!.guestsByDay['d2'].map((a) => a.name).sort()).toEqual(['B', 'Host']);
  });

  it('leaves a day empty when the backend assigns nobody to it', () => {
    const schedule = resolveFestivalSchedule({
      ...base,
      lineup: [{ name: 'A', eventDateId: 'd1' }],
    });
    expect(schedule!.guestsByDay['d1'].map((a) => a.name)).toEqual(['A']);
    expect(schedule!.guestsByDay['d2']).toEqual([]);
  });

  it('treats a link to a date the event no longer carries as event-level', () => {
    const schedule = resolveFestivalSchedule({
      ...base,
      lineup: [
        { name: 'A', eventDateId: 'gone' },
        { name: 'B', eventDateId: 'd2' },
      ],
    });
    expect(schedule!.guestsByDay['d1'].map((a) => a.name)).toEqual(['A']);
    expect(schedule!.guestsByDay['d2'].map((a) => a.name).sort()).toEqual(['A', 'B']);
  });
});
