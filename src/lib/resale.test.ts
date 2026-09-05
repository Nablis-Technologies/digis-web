import { describe, it, expect } from 'vitest';
import { resaleModule } from '@/lib/resale';

describe('resaleModule', () => {
  it('fetchListings returns only active listings', async () => {
    const listings = await resaleModule.fetchListings();
    expect(listings.length).toBeGreaterThan(0);
    expect(listings.every((l) => l.status === 'active')).toBe(true);
  });

  it('createListing stores cents and returns the created listing', async () => {
    const listing = await resaleModule.createListing(
      { id: 'tk-1', eventName: 'Test Event', eventDate: 'Mar 1', eventTime: '7 PM', venue: 'Venue', ticketType: 'VIP', qrCode: 'QR', purchased: 'now' } as any,
      250000,
    );
    expect(listing.asking_amount_minor).toBe(250000);
    expect(listing.status).toBe('active');
    expect(listing.fee_terms.rate_bps).toBeGreaterThan(0);
  });

  it('cancelListing flips status to cancelled', async () => {
    const listing = await resaleModule.createListing({ id: 'tk-2', eventName: 'E2', eventDate: 'Mar 2', eventTime: '8 PM', venue: 'V', ticketType: 'GA', qrCode: 'Q', purchased: 'now' } as any, 100000);
    const cancelled = await resaleModule.cancelListing(listing.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('purchaseListing returns a pending_payment resale order (mock store, no backend call)', async () => {
    const listing = await resaleModule.createListing({ id: 'tk-3', eventName: 'E3', eventDate: 'Mar 3', eventTime: '9 PM', venue: 'V', ticketType: 'GA', qrCode: 'Q', purchased: 'now' } as any, 150000);
    const order = await resaleModule.purchaseListing(listing.id);
    expect(order.status).toBe('pending_payment');
    expect(order.sales_channel).toBe('resale');
  });

  it('fetchMyListings is ownership-scoped (mirrors Pundit Scope)', async () => {
    resaleModule.resetToSeed();
    await resaleModule.createListing({ id: 'tk-4', eventName: 'Mine', eventDate: 'Mar 4', eventTime: '10 PM', venue: 'V', ticketType: 'GA', qrCode: 'Q', purchased: 'now' } as any, 100000);
    const mine = await resaleModule.fetchMyListings('u-current');
    expect(mine.length).toBe(1);
    expect(mine[0].eventName).toBe('Mine');
    // other sellers' listings are not mine
    const notMine = await resaleModule.fetchMyListings('u-other');
    expect(notMine.some((l) => l.eventName === 'Mine')).toBe(false);
  });

  it('resetToSeed wipes created listings (mirrors wipable DB)', async () => {
    resaleModule.resetToSeed();
    await resaleModule.createListing({ id: 'tk-5', eventName: 'Temp', eventDate: 'Mar 5', eventTime: '11 PM', venue: 'V', ticketType: 'GA', qrCode: 'Q', purchased: 'now' } as any, 200000);
    expect((await resaleModule.fetchMyListings('u-current')).length).toBe(1);
    resaleModule.resetToSeed();
    expect((await resaleModule.fetchMyListings('u-current')).length).toBe(0);
    expect((await resaleModule.fetchListings()).length).toBe(5);
  });
});
