import { describe, it, expect } from 'vitest';
import { eventHasFutureDate, eventEnded } from '@/lib/eventDates';

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86400000).toISOString();
const future = iso(10);
const past = iso(-10);

const ev = (dates: { startsAt: string; endsAt?: string; status?: string }[]) => ({
  eventDates: dates.map((d, i) => ({ id: `d${i}`, ...d })),
});

describe('eventHasFutureDate / eventEnded (purchase gate)', () => {
  it('a date in the future is still buyable', () => {
    expect(eventHasFutureDate(ev([{ startsAt: future }]))).toBe(true);
    expect(eventEnded(ev([{ startsAt: future }]))).toBe(false);
  });

  it('an event whose only date has passed is ended', () => {
    expect(eventHasFutureDate(ev([{ startsAt: past }]))).toBe(false);
    expect(eventEnded(ev([{ startsAt: past }]))).toBe(true);
  });

  it('multi-day event stays buyable while any day is upcoming', () => {
    expect(eventHasFutureDate(ev([{ startsAt: past }, { startsAt: future }]))).toBe(true);
  });

  it('a future startsAt with a past endsAt is ended (ends_at wins)', () => {
    expect(eventHasFutureDate(ev([{ startsAt: future, endsAt: past }]))).toBe(false);
  });

  it('completed/cancelled dates are not purchasable', () => {
    expect(eventHasFutureDate(ev([{ startsAt: future, status: 'completed' }]))).toBe(false);
    expect(eventHasFutureDate(ev([{ startsAt: future, status: 'cancelled' }]))).toBe(false);
    expect(eventEnded(ev([{ startsAt: future, status: 'completed' }]))).toBe(true);
  });

  it('postponed dates with a future window stay buyable', () => {
    expect(eventHasFutureDate(ev([{ startsAt: future, status: 'postponed' }]))).toBe(true);
  });

  it('events without eventDates are never treated as ended (mock/legacy)', () => {
    expect(eventHasFutureDate(ev([]))).toBe(false);
    expect(eventEnded(ev([]))).toBe(false);
    expect(eventEnded({})).toBe(false);
  });
});