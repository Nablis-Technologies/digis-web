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
export function eventEnded(event: Pick<Event, 'eventDates'>): boolean {
  if (!event.eventDates || event.eventDates.length === 0) return false;
  return !eventHasFutureDate(event);
}