import { describe, it, expect } from 'vitest';
import { resolveFestivalSchedule } from './festival';
import type { Event, TicketTier } from '@/types';

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
