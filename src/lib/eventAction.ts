import type { Event } from '@/types';

/** Discovery only has a starting price, so free public admission is a proxy for RSVP. */
export function eventActionLabel(event?: Pick<Event, 'priceFromMinor' | 'ticketAvailability'>): string {
  return event?.priceFromMinor === 0 && event.ticketAvailability === 'available' ? 'RSVP' : 'Tickets';
}