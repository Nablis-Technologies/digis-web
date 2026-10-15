import type { Event, TicketTier } from '@/types';
import { Money } from '@/lib/money';

export type DayState = 'open' | 'soldOut' | 'cancelled' | 'past' | 'live';

export type ScheduleArtist = {
  name: string;
  image?: string;
  role?: string;
  genre?: string;
  verified?: boolean;
  time?: string;
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
    image: a.image,
    role: a.role,
    genre: a.genre,
    verified: a.verified,
    time: a.time,
  }));

  const tiers = passedTiers ?? event.ticketTypes ?? [];
  const passTiers = tiers.filter((t) => {
    const n = t.name.toLowerCase();
    return n.includes('pass') || n.includes('full') || n.includes('weekend') || (t.admissionsPerUnit ?? 1) > 1;
  });
  const singleDayTiers = tiers.filter((t) => !passTiers.includes(t));

  const showPass = passTiers.length > 0 || tiers.length > 0;
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
  tiersByDay['all'] = (passTiers.length > 0 ? passTiers : tiers).map((t) => {
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
      inPass: !isCancelled && !isPast,
    });

    // Distribute artists to days if artists have time or assign headliners
    const dayArtists = artists.length > 0
      ? artists.filter((_, idx) => (idx % dates.length) === i)
      : [];
    guestsByDay[dayId] = dayArtists.length > 0 ? dayArtists : artists;

    const headliner = dayArtists[0] ?? artists[i % Math.max(1, artists.length)];

    const dayTiers = (singleDayTiers.length > 0 ? singleDayTiers : tiers).map((t) => ({ tier: t }));
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
      doorsLabel: '6 PM',
      cancelled: isCancelled,
      cancelledAlert: isCancelled
        ? {
            headline: `Day ${i + 1} cancelled · ${monDay}`,
            reason: 'Due to severe weather conditions, this day will not proceed.',
            refundNote: 'Auto-refunded to original payment method',
            refundRows: [{ name: `Day ${i + 1} single-day ticket`, right: '100%' }],
          }
        : undefined,
      lineup: dayArtists.length > 0 ? dayArtists : artists,
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
 * Falls back to the full roster when the day has no assigned guests, so the
 * strip never goes empty while the lineup still has people to show.
 */
export function guestsForDay(schedule: FestivalSchedule, dayId: string): ScheduleArtist[] {
  if (dayId === 'all') return schedule.allGuests;
  const day = schedule.guestsByDay[dayId];
  return day && day.length > 0 ? day : schedule.allGuests;
}
