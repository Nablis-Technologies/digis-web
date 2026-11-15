import { describe, it, expect } from 'vitest';
import { availabilityMeta, eventSoldOut } from '@/lib/eventAvailability';

describe('availabilityMeta (G-44 server states)', () => {
  it('maps each server sellability state to a badge + CTA', () => {
    expect(availabilityMeta({ ticketAvailability: 'available' })).toEqual({ badge: null, cta: 'Get Tickets', buyBlocked: false });
    expect(availabilityMeta({ ticketAvailability: 'coming_soon' })).toEqual({ badge: 'On Sale Soon', cta: 'View', buyBlocked: true });
    expect(availabilityMeta({ ticketAvailability: 'sold_out' })).toEqual({ badge: 'Sold Out', cta: 'Join Waitlist', buyBlocked: true });
    expect(availabilityMeta({ ticketAvailability: 'sales_closed' })).toEqual({ badge: 'Sales Closed', cta: 'View Details', buyBlocked: true });
    expect(availabilityMeta({ ticketAvailability: 'no_public_tickets' })).toEqual({ badge: 'Invite only', cta: 'View Access Options', buyBlocked: true });
    expect(availabilityMeta({ ticketAvailability: 'no_eligible_dates' })).toEqual({ badge: 'No Tickets Right Now', cta: 'View', buyBlocked: true });
    expect(availabilityMeta({ ticketAvailability: 'unavailable' })).toEqual({ badge: 'Unavailable', cta: 'View', buyBlocked: true });
  });

  it('falls back to the local sold-out derivation when the server omits availability', () => {
    expect(availabilityMeta({ soldOut: true })).toEqual({ badge: 'Sold Out', cta: 'View Details', buyBlocked: true });
    expect(availabilityMeta({ ticketsLeft: 0 })).toEqual({ badge: 'Sold Out', cta: 'View Details', buyBlocked: true });
    // A missing count is NOT sold out.
    expect(availabilityMeta({ ticketsLeft: 10 })).toEqual({ badge: null, cta: 'Get Tickets', buyBlocked: false });
    expect(availabilityMeta({})).toEqual({ badge: null, cta: 'Get Tickets', buyBlocked: false });
  });

  it('server availability wins over the local flags', () => {
    // Server says available even though a stale local flag says sold out.
    expect(availabilityMeta({ ticketAvailability: 'available', soldOut: true }).buyBlocked).toBe(false);
    // Server says coming_soon even with tickets_left > 0.
    expect(availabilityMeta({ ticketAvailability: 'coming_soon', ticketsLeft: 50 }).badge).toBe('On Sale Soon');
  });
});

describe('eventSoldOut (G-44)', () => {
  it('treats the server sold_out state as sold out', () => {
    expect(eventSoldOut({ ticketAvailability: 'sold_out' })).toBe(true);
  });
  it('does not treat other server states as sold out', () => {
    expect(eventSoldOut({ ticketAvailability: 'sales_closed' })).toBe(false);
    expect(eventSoldOut({ ticketAvailability: 'available' })).toBe(false);
  });
});
