/**
 * Event-ended gating for the purchase UI (BACKEND_GAPS #34, frontend mitigation).
 *
 * The backend quote→order→payment path never checks the event date, so a past
 * published event's products stay "active" and remain purchasable end-to-end.
 * Until the backend enforces it, the frontend disables the buy entry for ended
 * events (ADR-0002 "disable") while keeping them visible on discovery.
 *
 * "Ended" = NO event date remains purchasable: every date is either in the past
 * (ends_at, falling back to starts_at) or has a terminal status (completed /
 * cancelled / postponed is treated as non-purchasable only if it has no future
 * window; a `postponed` date with a future window stays buyable).
 *
 * Events with NO eventDates (mock/legacy rows) are never treated as ended, so
 * only real backend events gate.
 */
import type { Event } from '@/types';

const BUYABLE_STATUSES = new Set(['scheduled', 'postponed']);

/** True when any event date is still purchasable (future + non-terminal). */
export function eventHasFutureDate(event: Pick<Event, 'eventDates'>): boolean {
  const now = Date.now();
  return (event.eventDates ?? []).some((d) => {
    if (d.status && !BUYABLE_STATUSES.has(d.status)) return false;
    const ts = d.endsAt ? Date.parse(d.endsAt) : Date.parse(d.startsAt);
    return !Number.isNaN(ts) && ts > now;
  });
}

/** True when the event has no purchasable date remaining. Events with no
 *  eventDates (mock/legacy rows) are NOT treated as ended. */
export function eventEnded(event: Pick<Event, 'eventDates' | 'eventLifecycle'>): boolean {
  // The list now carries the server-evaluated lifecycle — prefer it. The
  // date-based fallback still covers detail payloads / legacy rows.
  if (event.eventLifecycle === 'ended') return true;
  if (!event.eventDates || event.eventDates.length === 0) return false;
  return !eventHasFutureDate(event);
}

/**
 * A compact human label for the event's full date span, used on the ended
 * notice: "Aug 1, 2026", "Dec 10 – 12, 2026" or "Dec 30 – Jan 2, 2027".
 * Matches the export's contract: the span covers non-cancelled dates (falling
 * back to every date when all are cancelled). Returns '' when there are no
 * usable dates.
 */
export function eventDateSpanLabel(event: Pick<Event, 'eventDates'>): string {
  const all = event.eventDates ?? [];
  const live = all.filter((d) => d.status !== 'cancelled');
  const dates = (live.length > 0 ? live : all)
    .map((d) => new Date(d.startsAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return '';

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const first = dates[0];
  const last = dates[dates.length - 1];
  const year = last.getFullYear();

  if (first.getTime() === last.getTime()) return `${fmt(first)}, ${year}`;
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${fmt(first)} – ${last.getDate()}, ${year}`;
  }
  return `${fmt(first)} – ${fmt(last)}, ${year}`;
}