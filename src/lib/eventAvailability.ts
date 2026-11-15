/**
 * Discovery availability state (G-44).
 *
 * The backend now evaluates lifecycle + sellability per event and serves them
 * on every list card (`event_lifecycle`, `ticket_availability`). This maps those
 * server states to a badge + CTA. When the backend omits them (older event, or
 * a field the server didn't project), we fall back to the local derivation:
 * `eventSoldOut` for sold-out and `eventEnded` for the ended gate.
 */
import type { Event } from '@/types';

export function eventSoldOut(event: Pick<Event, 'soldOut' | 'ticketsLeft' | 'ticketAvailability'>): boolean {
  if (event.ticketAvailability) return event.ticketAvailability === 'sold_out';
  return event.soldOut === true || (typeof event.ticketsLeft === 'number' && event.ticketsLeft === 0);
}

export interface AvailabilityMeta {
  /** Short badge text, or null when no badge should show. */
  badge: string | null;
  /** CTA label for the card. */
  cta: string;
  /** True when buying is not possible from the card. */
  buyBlocked: boolean;
}

/**
 * Resolve the badge/CTA from the server's `ticket_availability` (+ lifecycle),
 * falling back to the local ended/sold-out derivation when it is absent.
 */
export function availabilityMeta(
  event: Pick<Event, 'ticketAvailability' | 'eventLifecycle' | 'soldOut' | 'ticketsLeft'>,
): AvailabilityMeta {
  switch (event.ticketAvailability) {
    case 'available':
      return { badge: null, cta: 'Get Tickets', buyBlocked: false };
    case 'coming_soon':
      return { badge: 'On Sale Soon', cta: 'View', buyBlocked: true };
    case 'sold_out':
      return { badge: 'Sold Out', cta: 'Join Waitlist', buyBlocked: true };
    case 'sales_closed':
      return { badge: 'Sales Closed', cta: 'View Details', buyBlocked: true };
    case 'no_public_tickets':
      return { badge: 'Invite only', cta: 'View Access Options', buyBlocked: true };
    case 'no_eligible_dates':
      return { badge: 'No Tickets Right Now', cta: 'View', buyBlocked: true };
    case 'unavailable':
      return { badge: 'Unavailable', cta: 'View', buyBlocked: true };
    default:
      break;
  }
  // Fallback: no server availability — derive locally (legacy behaviour).
  if (eventSoldOut(event)) return { badge: 'Sold Out', cta: 'View Details', buyBlocked: true };
  return { badge: null, cta: 'Get Tickets', buyBlocked: false };
}
