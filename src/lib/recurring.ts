import type { Event, EventArtist, TicketTier } from '@/types';
import { Money } from '@/lib/money';

/**
 * Recurring ("weekly series") view-model (#68).
 *
 * A recurring event is one event whose rule materialises many dated sessions. The
 * backend models and materialises these (`Events::RecurrenceRule` +
 * `MaterializeRecurrenceJob`), but the **public payload carries no series signal
 * yet** — so `resolveSeries` returns `null` until the backend exposes one
 * (`BACKEND_GAPS.md` #68). Nothing here invents a series: with no signal, the
 * detail page falls back to the multi-day / single rendering (ADR-0002).
 *
 * The whole surface is derived from data the payload already has (`eventDates`,
 * `lineup`); per-session sold-out / showtimes / stock are NOT derivable today, so
 * they stay `false` / single-showtime and light up when the backend serves them.
 */

export type SessionShowtime = {
  id: string;
  /** e.g. "7 PM". */
  timeLabel: string;
  /** Sold out → disabled, shows "Full". */
  full: boolean;
  /** Set only when stock is low, e.g. "4 left". */
  lowStockLabel?: string;
  /** e.g. "Matinee" or "Show 1". */
  showLabel: string;
};

/** One date on the session rail (sessions grouped by date). */
export type SessionRailDay = {
  /** ISO date (yyyy-mm-dd), used as key and for matching the selection. */
  date: string;
  /** e.g. "Aug". */
  monLabel: string;
  /** e.g. "28". */
  dayLabel: string;
  /** e.g. "Thu". */
  dowLabel: string;
  /** Every session on this date is sold out (unknown until the backend serves it). */
  soldOut: boolean;
  /** Session id to select when the date tile is tapped. */
  primarySessionId: string;
  /** All showtimes on this date (picker shows when > 1). */
  showtimes: SessionShowtime[];
};

/** Resolved selected session (parent falls back to the first upcoming one). */
export type SelectedSession = {
  id: string;
  /** ISO date of the session. */
  date: string;
  /** e.g. "Thu, Aug 28". */
  dateLabel: string;
  /** e.g. "9 PM" or "Time TBA". */
  timeLabel: string;
  /** e.g. "Doors 8 PM" or "". */
  doorsLabel: string;
};

/** Upcoming session as shown in the calendar sheet. */
export type CalendarSession = {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** The session that represents its date in the month grid (one per date). */
  primary: boolean;
  soldOut: boolean;
  /** e.g. "Thu, Aug 28, 2026". */
  dateLabel: string;
  /** e.g. "From 500 ETB · Guest A, Guest B" or "Sold out". */
  detailLabel: string;
  /** First guest avatars (up to 3 are shown). */
  avatars: { name: string; image?: string }[];
};

export type SessionCalendarData = {
  /** Eyebrow, e.g. "Every Thursday" (or "Sessions"). */
  summaryLabel: string;
  sessions: CalendarSession[];
};

export type SeriesView = {
  days: SessionRailDay[];
  selected: SelectedSession | null;
  /** Lineup for the selected session (event-level guests included). */
  selectedGuests: EventArtist[];
  /** True when every session on the selected date is sold out (waitlist path). */
  selectedSoldOut: boolean;
  calendar: SessionCalendarData;
  /** Reminder cadence, e.g. "every Thursday" (rendered "Reminding every Thursday"). */
  reminderLabel: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local ISO date (yyyy-mm-dd) — matches the rail's date keys. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Parse a yyyy-mm-dd string as a LOCAL date (avoids the UTC midnight shift). */
export const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** True when the payload carries a recurring-series signal (#68). */
export function isSeries(event: Pick<Event, 'recurrence' | 'isRecurring'>): boolean {
  return event.isRecurring === true || (!!event.recurrence && event.recurrence.active !== false);
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Time TBA';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Cadence copy from the dates themselves — "every Thursday" when they share a
 * weekday, else "every session". Deliberately not parsed from an RRULE (the
 * shape is the backend's call); this reads only what the payload shows.
 */
function reminderLabel(dates: Date[]): string {
  if (dates.length < 2) return 'every session';
  const dows = new Set(dates.map((d) => d.toLocaleDateString('en-US', { weekday: 'long' })));
  return dows.size === 1 ? `every ${[...dows][0]}` : 'every session';
}

/** Per-session guests: a participant pinned to this date, plus event-level ones. */
function guestsForSession(event: Pick<Event, 'lineup'>, sessionId: string) {
  const lineup = event.lineup ?? [];
  if (lineup.length === 0) return [];
  return lineup.filter((a) => !a.eventDateId || a.eventDateId === sessionId);
}

/**
 * Build the recurring session view-model, or `null` when the event is not a
 * series (no backend signal) — so the caller renders nothing and never invents.
 *
 * `pickedSessionId` is the caller's current selection; when omitted (or unknown)
 * the first upcoming session is selected.
 */
export function resolveSeries(
  event: Pick<Event, 'eventDates' | 'lineup' | 'recurrence' | 'isRecurring' | 'currency'>,
  passedTiers?: TicketTier[],
  pickedSessionId?: string,
): SeriesView | null {
  if (!isSeries(event)) return null;

  const dates = (event.eventDates ?? [])
    .map((d) => ({ ...d, dateObj: new Date(d.startsAt) }))
    .filter((d) => !isNaN(d.dateObj.getTime()))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  if (dates.length === 0) return null;

  const now = Date.now();
  const firstUpcoming = dates.find((d) => d.dateObj.getTime() >= now) ?? dates[dates.length - 1];
  const chosen = (pickedSessionId && dates.find((d) => d.id === pickedSessionId)) || firstUpcoming;

  const days: SessionRailDay[] = dates.map((d) => {
    const iso = toISODate(d.dateObj);
    return {
      date: iso,
      monLabel: d.dateObj.toLocaleDateString('en-US', { month: 'short' }),
      dayLabel: String(d.dateObj.getDate()),
      dowLabel: d.dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      // Not derivable from the public payload yet (#68) — never invented.
      soldOut: false,
      primarySessionId: d.id,
      showtimes: [
        { id: d.id, timeLabel: timeLabel(d.startsAt), full: false, showLabel: d.name ?? 'Session' },
      ],
    };
  });

  const selectedDate = days.find((day) => day.primarySessionId === chosen.id) ?? days[0];
  const selected: SelectedSession = {
    id: selectedDate.primarySessionId,
    date: selectedDate.date,
    dateLabel: dateLabel(chosen.startsAt),
    timeLabel: timeLabel(chosen.startsAt),
    doorsLabel: '',
  };

  const tiers = passedTiers ?? [];
  const lowestFrom = tiers
    .map((t) => t.priceMinor)
    .filter((p) => p > 0)
    .sort((a, b) => a - b)[0];
  const fromLabel =
    lowestFrom !== undefined ? `From ${Money.fromMinor(lowestFrom, event.currency).format()}` : undefined;

  const sessions: CalendarSession[] = days.map((day, i) => {
    const src = dates[i];
    const guests = guestsForSession(event, day.primarySessionId);
    const guestNames = guests.slice(0, 2).map((g) => g.name);
    const detailParts = [fromLabel, guestNames.length ? guestNames.join(', ') : undefined].filter(
      (p): p is string => Boolean(p),
    );
    return {
      id: day.primarySessionId,
      date: day.date,
      primary: true,
      soldOut: false,
      dateLabel: src.dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      detailLabel: detailParts.length ? detailParts.join(' · ') : 'Session',
      avatars: guests.slice(0, 3).map((g) => ({ name: g.name, image: g.image })),
    };
  });

  const cadence = reminderLabel(dates.map((d) => d.dateObj));
  const summaryLabel = cadence === 'every session' ? 'Sessions' : cadence.replace('every ', 'Every ');

  return {
    days,
    selected,
    selectedGuests: guestsForSession(event, chosen.id),
    selectedSoldOut: selectedDate.soldOut,
    calendar: { summaryLabel, sessions },
    reminderLabel: cadence,
  };
}
