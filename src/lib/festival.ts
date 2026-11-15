import type { Event, TicketTier } from '@/types';
import { Money } from '@/lib/money';

export type DayState = 'open' | 'soldOut' | 'cancelled' | 'past' | 'live';

export type ScheduleArtist = {
  name: string;
  artistId?: string;
  image?: string;
  role?: string;
  genre?: string;
  verified?: boolean;
  time?: string;
  /** Backend `event_date_id` when the participant is pinned to one day (#36). */
  eventDateId?: string;
};

export type CancelledDayAlertData = {
  headline: string;
  reason?: string;
  refundNote: string;
  refundRows: { name: string; right: string }[];
};

export type SoldOutDayNoticeData = {
  headline: string;
  hasOtherOpenDays: boolean;
};

export type LineupDay = {
  id: string;
  dayNumberLabel: string;
  dowLong: string;
  monDay: string;
  doorsLabel: string;
  cancelled: boolean;
  cancelledAlert?: CancelledDayAlertData;
  soldOutNotice?: SoldOutDayNoticeData;
  lineup: ScheduleArtist[];
};

export type AgendaDay = {
  id: string;
  dayLabel: string;
  dow: string;
  dayNum: string;
  state: DayState;
  headliner?: { name: string; image?: string };
  subLine: string;
};

export type FestivalDayBarDay = {
  id: string;
  dayNum: string;
  dow: string;
  state: DayState;
  inPass: boolean;
};

export type FestivalDayStripDay = {
  id: string;
  state: DayState;
  headliner?: { name: string; image?: string };
  dateLabel: string;
  fromPriceLabel?: string;
};

export type FestivalTier = {
  tier: TicketTier;
  savings?: { label: string };
};

export type FestivalSchedule = {
  days: FestivalDayBarDay[];
  stripDays: FestivalDayStripDay[];
  lineupDays: LineupDay[];
  agendaDays?: AgendaDay[];
  allGuests: ScheduleArtist[];
  guestsByDay: Record<string, ScheduleArtist[]>;
  showPass: boolean;
  passSpanLabel: string;
  passFromLabel?: string;
  tiersByDay: Record<string, FestivalTier[]>;
  underway: boolean;
  cancelledCount: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Check if a date string falls on today (local midnight to midnight). */
function isDateToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Check if a date has completely passed (yesterday or earlier). */
function isDatePast(d: Date): boolean {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return d.getTime() < todayStart.getTime();
}

/**
 * Derives a structured festival schedule from the event dates, lineup, and ticket tiers.
 * Returns null if the event is not a multi-day or festival event.
 */
export function resolveFestivalSchedule(
  event: Pick<Event, 'eventDates' | 'lineup' | 'category' | 'ticketTypes'>,
  passedTiers?: TicketTier[],
): FestivalSchedule | null {
  const dates = (event.eventDates ?? [])
    .map((d, index) => {
      const parsed = new Date(d.startsAt);
      return {
        ...d,
        index,
        dateObj: isNaN(parsed.getTime()) ? new Date() : parsed,
      };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const isFestivalCategory = event.category?.toLowerCase() === 'festivals';
  if (dates.length <= 1 && !isFestivalCategory) {
    return null;
  }

  // If no explicit eventDates exist for a festival category event, we synthesise from event date or leave empty
  if (dates.length === 0) {
    return null;
  }

  const artists: ScheduleArtist[] = (event.lineup ?? []).map((a) => ({
    name: a.name,
    artistId: a.artistId,
    image: a.image,
    role: a.role,
    genre: a.genre,
    verified: a.verified,
    time: a.time,
    eventDateId: a.eventDateId,
  }));

  // When any participant carries a backend day link, distribute by that
  // assignment; otherwise round-robin the roster across days (fallback).
  const hasPinnedDays = artists.some((a) => a.eventDateId);
  const knownDateIds = new Set(dates.map((d, i) => d.id || `day-${i + 1}`));

  const tiers = passedTiers ?? event.ticketTypes ?? [];
  // Tier classification: when the backend serves real per-day coverage
  // (`covered_event_date_ids`, #69 resolved 2026-10-16) that is authoritative —
  // an empty scope or coverage of every known date is an all-event pass;
  // partial coverage remains a dated offer. Only when coverage is absent do we fall back to the
  // name heuristic (the previous, invented classification).
  const hasCoverage = tiers.some((t) => t.coveredEventDateIds !== undefined);
  const legacyPass = (t: TicketTier) => {
    const n = t.name.toLowerCase();
    return n.includes('pass') || n.includes('full') || n.includes('weekend') || (t.admissionsPerUnit ?? 1) > 1;
  };
  const isPassTier = (t: TicketTier) => {
    const ids = t.coveredEventDateIds;
    if (ids !== undefined) return ids.length === 0 || [...knownDateIds].every(id => ids.includes(id));
    return hasCoverage ? false : legacyPass(t);
  };
  const passTiers = tiers.filter(isPassTier);
  const singleDayTiers = tiers.filter((t) => !isPassTier(t));
  // Tiers offered on a given day: the covered dates gate the offer when known;
  // an offer with no coverage (event-level) is available every day.
  const tiersForDay = (dayId: string) => {
    if (!hasCoverage) return singleDayTiers.length > 0 ? singleDayTiers : tiers;
    return tiers.filter((t) => {
      const ids = t.coveredEventDateIds;
      if (!ids || ids.length === 0) return true;
      return ids.includes(dayId);
    });
  };

  const showPass = passTiers.length > 0 || (!hasCoverage && tiers.length > 0);
  const lowestPassPrice = (passTiers.length > 0 ? passTiers : tiers)
    .map((t) => t.priceMinor)
    .filter((p) => p > 0)
    .sort((a, b) => a - b)[0];

  const passFromLabel = lowestPassPrice ? `From ${Money.fromMinor(lowestPassPrice, 'ETB').format()}` : undefined;

  let cancelledCount = 0;
  let hasPastDay = false;
  let hasFutureDay = false;

  const barDays: FestivalDayBarDay[] = [];
  const stripDays: FestivalDayStripDay[] = [];
  const lineupDays: LineupDay[] = [];
  const agendaDays: AgendaDay[] = [];
  const guestsByDay: Record<string, ScheduleArtist[]> = {};
  const tiersByDay: Record<string, FestivalTier[]> = {};

  // Group tiers into 'all'
  tiersByDay['all'] = (hasCoverage ? passTiers : (passTiers.length > 0 ? passTiers : tiers)).map((t) => {
    const savings = t.originalPriceMinor && t.originalPriceMinor > t.priceMinor
      ? { label: `${Math.round(((t.originalPriceMinor - t.priceMinor) / t.originalPriceMinor) * 100)}% OFF` }
      : undefined;
    return { tier: t, savings };
  });

  dates.forEach((d, i) => {
    const dayId = d.id || `day-${i + 1}`;
    const dateObj = d.dateObj;
    const isToday = isDateToday(dateObj);
    const isPast = isDatePast(dateObj);
    const isCancelled = d.status === 'cancelled';

    if (isCancelled) cancelledCount++;
    if (isPast && !isCancelled) hasPastDay = true;
    if (!isPast && !isCancelled) hasFutureDay = true;

    let state: DayState = 'open';
    if (isCancelled) {
      state = 'cancelled';
    } else if (isToday) {
      state = 'live';
    } else if (isPast) {
      state = 'past';
    }

    const dayNum = String(dateObj.getDate());
    const dow = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dowLong = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const mon = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const monDay = `${mon} ${dayNum}`;

    barDays.push({
      id: dayId,
      dayNum,
      dow,
      state,
      inPass: showPass && !isCancelled && !isPast,
    });

    // Per-day assignment (#36): pinned participants go to their day (event-level
    // ones appear on every day); without a link, round-robin the roster.
    const dayArtists = artists.length === 0
      ? []
      : hasPinnedDays
        // A link that no longer resolves to a date on this event degrades to
        // event-level rather than silently dropping the artist.
        ? artists.filter((a) => !a.eventDateId || !knownDateIds.has(a.eventDateId) || a.eventDateId === dayId)
        : artists.filter((_, idx) => (idx % dates.length) === i);
    const dayRoster = dayArtists.length > 0
      ? dayArtists
      : hasPinnedDays
        ? []
        : artists;
    guestsByDay[dayId] = dayRoster;

    const headliner = hasPinnedDays
      ? dayArtists[0]
      : dayArtists[0] ?? artists[i % Math.max(1, artists.length)];

    const dayTiers = tiersForDay(dayId).map((t) => ({ tier: t }));
    tiersByDay[dayId] = dayTiers;

    const lowestDayPrice = dayTiers
      .map((t) => t.tier.priceMinor)
      .filter((p) => p > 0)
      .sort((a, b) => a - b)[0];

    stripDays.push({
      id: dayId,
      state,
      headliner: headliner ? { name: headliner.name, image: headliner.image } : undefined,
      dateLabel: `${dow} ${monDay}`,
      fromPriceLabel: lowestDayPrice ? Money.fromMinor(lowestDayPrice, 'ETB').format() : undefined,
    });

    lineupDays.push({
      id: dayId,
      dayNumberLabel: pad2(i + 1),
      dowLong,
      monDay,
      doorsLabel: d.doorsAt ? new Date(d.doorsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
      cancelled: isCancelled,
      cancelledAlert: isCancelled
        ? {
            headline: `Day ${i + 1} cancelled · ${monDay}`,
            reason: 'Due to severe weather conditions, this day will not proceed.',
            refundNote: 'Auto-refunded to original payment method',
            refundRows: [{ name: `Day ${i + 1} single-day ticket`, right: '100%' }],
          }
        : undefined,
      lineup: dayRoster,
    });

    agendaDays.push({
      id: dayId,
      dayLabel: `Day ${i + 1}`,
      dow,
      dayNum,
      state,
      headliner: headliner ? { name: headliner.name, image: headliner.image } : undefined,
      subLine: dayArtists.slice(1).map((a) => a.name).join(' · ') || 'Doors 6 PM',
    });
  });

  const firstDate = dates[0]?.dateObj;
  const lastDate = dates[dates.length - 1]?.dateObj;
  const passSpanLabel =
    firstDate && lastDate
      ? firstDate.getMonth() === lastDate.getMonth()
        ? `${firstDate.toLocaleDateString('en-US', { month: 'short' })} ${firstDate.getDate()}–${lastDate.getDate()}`
        : `${firstDate.toLocaleDateString('en-US', { month: 'short' })} ${firstDate.getDate()} – ${lastDate.toLocaleDateString('en-US', { month: 'short' })} ${lastDate.getDate()}`
      : 'All days';

  return {
    days: barDays,
    stripDays,
    lineupDays,
    agendaDays: dates.length > 4 ? agendaDays : undefined,
    allGuests: artists,
    guestsByDay,
    showPass,
    passSpanLabel,
    passFromLabel,
    tiersByDay,
    underway: hasPastDay && hasFutureDay,
    cancelledCount,
  };
}

/**
 * The guests to surface for a picked day ("all" = everyone across the festival).
 *
 * `guestsByDay` already carries the resolved roster: for an unpinned event the
 * resolver falls back to the full roster, and for a pinned one it leaves a day
 * the backend assigned nobody to empty (ADR-0002 — absent stays absent). So an
 * empty known day stays empty; only an *unknown* day id falls back to everyone.
 */
export function guestsForDay(schedule: FestivalSchedule, dayId: string): ScheduleArtist[] {
  if (dayId === 'all') return schedule.allGuests;
  return schedule.guestsByDay[dayId] ?? schedule.allGuests;
}
