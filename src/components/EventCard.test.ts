import { describe, it, expect } from 'vitest';
import { cardFormat, cardFormatLabel } from './EventCard';
import type { Event } from '@/types';

type CardInput = Pick<Event, 'eventDates' | 'recurrence' | 'isRecurring'>;

const dates = (...days: string[]) => days.map((d, i) => ({ id: `d${i}`, startsAt: d }));

describe('cardFormat', () => {
  it('is single for a one-date event with no series signal', () => {
    expect(cardFormat({ eventDates: dates('2026-11-01T18:00:00Z') })).toBe('single');
    expect(cardFormat({})).toBe('single');
  });

  it('is multiDay whenever the event carries more than one date', () => {
    expect(
      cardFormat({ eventDates: dates('2026-11-01T18:00:00Z', '2026-11-02T18:00:00Z') }),
    ).toBe('multiDay');
  });

  it('is recurring only when the backend signals a series (never inferred)', () => {
    expect(cardFormat({ recurrence: { ruleId: 'r1', active: true } })).toBe('recurring');
    expect(cardFormat({ isRecurring: true })).toBe('recurring');
    // An explicitly inactive rule is not a series.
    expect(cardFormat({ recurrence: { ruleId: 'r1', active: false } })).toBe('single');
  });

  it('prefers recurring over multiDay when both are true', () => {
    expect(
      cardFormat({
        recurrence: { ruleId: 'r1', active: true },
        eventDates: dates('2026-11-01T18:00:00Z', '2026-11-08T18:00:00Z'),
      }),
    ).toBe('recurring');
  });
});

describe('cardFormatLabel', () => {
  it('labels each format, and leaves single blank', () => {
    expect(cardFormatLabel('single')).toBe('');
    expect(cardFormatLabel('multiDay')).toBe('MULTI-DAY');
    // The cadence word ("weekly") is not derivable from the public dates.
    expect(cardFormatLabel('recurring')).toBe('RECURRING');
  });
});
