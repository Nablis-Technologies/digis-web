import { describe, it, expect } from 'vitest';
import { resolveSeries, isSeries, toISODate, parseISODate } from './recurring';
import type { Event } from '@/types';

/** Local-time ISO (no trailing Z) so day keys don't shift with the test TZ. */
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T20:00:00`;

const weekly = (start: Date, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return d;
  });

type SeriesInput = Pick<Event, 'eventDates' | 'lineup' | 'recurrence' | 'isRecurring' | 'currency'>;

const base = (over: Partial<SeriesInput> = {}): SeriesInput => ({
  currency: 'ETB',
  recurrence: { ruleId: 'r1', rrule: 'FREQ=WEEKLY', active: true },
  eventDates: [{ id: 's1', startsAt: localIso(new Date(2099, 0, 5)) }],
  lineup: [],
  ...over,
});

describe('isSeries', () => {
  it('is false with no signal and true when either signal is present', () => {
    expect(isSeries({})).toBe(false);
    expect(isSeries({ isRecurring: true })).toBe(true);
    expect(isSeries({ recurrence: { ruleId: 'r1' } })).toBe(true);
  });

  it('treats an explicitly inactive rule as not a series', () => {
    expect(isSeries({ recurrence: { active: false } })).toBe(false);
  });
});

describe('resolveSeries', () => {
  it('returns null without a series signal (never invents a series)', () => {
    expect(resolveSeries(base({ recurrence: undefined }))).toBeNull();
  });

  it('returns null when the signal is present but no dates are served', () => {
    expect(resolveSeries(base({ eventDates: [] }))).toBeNull();
  });

  it('builds one rail day per date, sorted, with the first upcoming selected', () => {
    const dates = weekly(new Date(2099, 0, 5), 3);
    const view = resolveSeries(
      base({
        eventDates: dates.map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })),
      }),
    )!;

    expect(view.days).toHaveLength(3);
    expect(view.days.map((d) => d.primarySessionId)).toEqual(['s0', 's1', 's2']);
    expect(view.days.map((d) => d.date)).toEqual(dates.map(toISODate));
    expect(view.selected?.id).toBe('s0');
    // Sold-out is not derivable from the public payload yet (#68) — never invented.
    expect(view.days.every((d) => d.soldOut === false)).toBe(true);
    expect(view.days.every((d) => d.showtimes.length === 1)).toBe(true);
  });

  it('falls back to the last session when every date is in the past', () => {
    const view = resolveSeries(
      base({
        eventDates: [
          { id: 'old1', startsAt: '2000-01-05T20:00:00' },
          { id: 'old2', startsAt: '2000-01-12T20:00:00' },
        ],
      }),
    )!;
    expect(view.selected?.id).toBe('old2');
  });

  it('selects a picked session and exposes that session\'s guests', () => {
    const dates = weekly(new Date(2099, 0, 5), 2);
    const event = base({
      eventDates: dates.map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })),
      lineup: [{ name: 'Always Here' }, { name: 'Day Two Only', eventDateId: 's1' }],
    });

    const view = resolveSeries(event, undefined, 's1')!;
    expect(view.selected?.id).toBe('s1');
    expect(view.selected?.date).toBe(toISODate(dates[1]));
    expect(view.selectedGuests.map((g) => g.name)).toEqual(['Always Here', 'Day Two Only']);

    // An unknown id falls back to the first upcoming session.
    expect(resolveSeries(event, undefined, 'nope')!.selected?.id).toBe('s0');
    expect(resolveSeries(event, undefined, 's0')!.selectedGuests.map((g) => g.name)).toEqual(['Always Here']);
  });

  it('reads cadence from the dates: weekly → "every <weekday>", else "every session"', () => {
    const first = new Date(2099, 0, 5);
    const weeklyView = resolveSeries(
      base({ eventDates: weekly(first, 3).map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })) }),
    )!;
    const dow = first.toLocaleDateString('en-US', { weekday: 'long' });
    expect(weeklyView.reminderLabel).toBe(`every ${dow}`);
    expect(weeklyView.reminderLabel).toMatch(/^every (Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/);
    expect(weeklyView.calendar.summaryLabel).toBe(`Every ${dow}`);

    const backToBack = resolveSeries(
      base({
        eventDates: [
          { id: 'a', startsAt: '2099-01-05T20:00:00' },
          { id: 'b', startsAt: '2099-01-06T20:00:00' },
        ],
      }),
    )!;
    expect(backToBack.reminderLabel).toBe('every session');
    expect(backToBack.calendar.summaryLabel).toBe('Sessions');
  });

  it('scopes per-session guests by eventDateId, plus event-level guests', () => {
    const dates = weekly(new Date(2099, 0, 5), 2);
    const view = resolveSeries(
      base({
        eventDates: dates.map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })),
        lineup: [
          { name: 'Always Here' },
          { name: 'Day Two Only', eventDateId: 's1' },
        ],
      }),
    )!;

    const [first, second] = view.calendar.sessions;
    expect(first.detailLabel).toContain('Always Here');
    expect(first.detailLabel).not.toContain('Day Two Only');
    expect(second.detailLabel).toContain('Day Two Only');
    expect(second.detailLabel).toContain('Always Here');
  });

  it('derives the "from" price via Money (no raw cents)', () => {
    const view = resolveSeries(
      base({
        eventDates: weekly(new Date(2099, 0, 5), 2).map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })),
      }),
      [
        { name: 'GA', level: 'GA', priceMinor: 60000, available: 10, features: [] },
        { name: 'VIP', level: 'VIP', priceMinor: 150000, available: 10, features: [] },
      ],
    )!;
    expect(view.calendar.sessions[0].detailLabel).toContain('600');
    expect(view.calendar.sessions[0].detailLabel).not.toContain('60000');
  });
});

describe('resolveSeries — live backend series signal (#68 resolved 2026-10-16)', () => {
  it('lights up from the bare `isRecurring` flag when no recurrence object is served', () => {
    const view = resolveSeries(
      base({
        recurrence: undefined,
        isRecurring: true,
        eventDates: weekly(new Date(2099, 0, 5), 2).map((d, i) => ({ id: `s${i}`, startsAt: localIso(d) })),
      }),
    );
    expect(view).not.toBeNull();
    expect(view!.days).toHaveLength(2);
  });

  it('stays inert for a one-off event with no series signal', () => {
    const view = resolveSeries(
      base({
        recurrence: undefined,
        isRecurring: false,
        eventDates: [{ id: 's1', startsAt: localIso(new Date(2099, 0, 5)) }],
      }),
    );
    expect(view).toBeNull();
  });

  it('renders a doors label when a session carries a doorsAt time', () => {
    const view = resolveSeries(
      base({
        eventDates: [{ id: 's1', startsAt: '2099-01-05T20:00:00', doorsAt: '2099-01-05T19:00:00' }],
      }),
    )!;
    expect(view.selected?.doorsLabel).toMatch(/^Doors /);
  });
});

describe('local date helpers', () => {
  it('round-trips without the UTC midnight shift', () => {
    const d = parseISODate('2099-01-05');
    expect(d.getFullYear()).toBe(2099);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
    expect(toISODate(d)).toBe('2099-01-05');
  });
});
