/**
 * Sold-out gating for discovery ordering (frontend mitigation).
 *
 * "Sold out" = the backend explicitly flags it (`event_setting.config.sold_out`)
 * OR reports zero tickets left. A MISSING count is not sold out — a backend
 * that has not projected a count must not be treated as full.
 */
import type { Event } from '@/types';

export function eventSoldOut(event: Pick<Event, 'soldOut' | 'ticketsLeft'>): boolean {
  return event.soldOut === true || (typeof event.ticketsLeft === 'number' && event.ticketsLeft === 0);
}