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
  // Minimal fixture: the adapter always fills guestsByDay, so build the shape
  // by hand to pin the fallback rules precisely.
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

  it('falls back to everyone when the picked day has no guests', () => {
    expect(guestsForDay(schedule, 'd2')).toEqual(schedule.allGuests);
  });

  it('falls back to everyone for an unknown day id', () => {
    expect(guestsForDay(schedule, 'missing')).toEqual(schedule.allGuests);
  });
});
