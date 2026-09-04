/**
 * Resale module — mirrors digis_backend's marketplace flow.
 *
 * Backend endpoints (all mutating ones require Idempotency-Key):
 *   - POST   /tickets/:ticket_id/resale           → create listing (asking_amount_minor only)
 *   - GET    /resale_listings                     → browse (buyer-visible fields only)
 *   - POST   /resale_listings/:id/purchase        → returns Orders::OrderSerializer (pending_payment)
 *   - POST   /resale_listings/:id/cancel          → { reason: "seller_requested" }
 *
 * The listing lifecycle (create → browse → cancel) lives HERE. Purchase creates an
 * Order and delegates the payment step to the Order module (orderModule) — the
 * backend's purchase endpoint returns an Order, and the buyer pays via
 * POST /orders/:id/payment_attempts exactly like checkout.
 *
 * Current bodies are MOCK: they return backend-shaped data so the UI can be built
 * before wiring. Display fields (eventName/venue/...) are enriched from the mock
 * because the backend does not return them yet (BACKEND_GAPS.md #4).
 */

import { orderModule, type CheckoutOrder } from "@/lib/order";
import { RESALE_FEE_BPS, type ResaleListing, type ResaleListingWire } from "@/types/resale";
import type { UserTicket } from "@/types/ticket";
import { getEventImage } from "@/lib/utils/eventImages";

/* ─── Mock seed (display-enriched listings) ─── */
const seedListings: ResaleListing[] = [
  { id: 'r1', event_id: 'e1', ticket_type_id: 't1', status: 'active', asking_amount_minor: 420000, currency: 'ETB', resale_cutoff_at: null, fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sellerUserId: 'u-seller', 
    eventName: 'Addis Vibes Festival', eventDate: 'March 15, 2026', eventTime: '8:00 PM', venue: 'Millennium Hall, Addis Ababa', ticketType: 'VIP', originalPriceMinor: 350000, askingPriceMinor: 420000, sellerRating: 4.8, sellerName: 'Abebe M.', listedAgo: '2h ago', image: getEventImage('Addis Vibes Festival'), verified: true },
  { id: 'r2', event_id: 'e1', ticket_type_id: 't2', status: 'active', asking_amount_minor: 230000, currency: 'ETB', resale_cutoff_at: null, fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sellerUserId: 'u-seller', 
    eventName: 'Addis Vibes Festival', eventDate: 'March 15, 2026', eventTime: '8:00 PM', venue: 'Millennium Hall, Addis Ababa', ticketType: 'Regular', originalPriceMinor: 250000, askingPriceMinor: 230000, sellerRating: 4.6, sellerName: 'Hanna G.', listedAgo: '4h ago', image: getEventImage('Addis Vibes Festival'), verified: true },
  { id: 'r3', event_id: 'e2', ticket_type_id: 't3', status: 'active', asking_amount_minor: 95000, currency: 'ETB', resale_cutoff_at: null, fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sellerUserId: 'u-seller', 
    eventName: 'Ethiopian Coffee Culture Night', eventDate: 'March 20, 2026', eventTime: '6:00 PM', venue: 'Sheraton Addis', ticketType: 'Regular', originalPriceMinor: 120000, askingPriceMinor: 95000, sellerRating: 4.5, sellerName: 'Sara T.', listedAgo: '5h ago', image: getEventImage('Ethiopian Coffee Culture Night'), verified: true },
  { id: 'r4', event_id: 'e3', ticket_type_id: 't4', status: 'active', asking_amount_minor: 80000, currency: 'ETB', resale_cutoff_at: null, fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sellerUserId: 'u-seller', 
    eventName: 'Contemporary Art Exhibition', eventDate: 'March 28, 2026', eventTime: '5:00 PM', venue: 'Addis Fine Art Gallery', ticketType: 'VIP', originalPriceMinor: 80000, askingPriceMinor: 80000, sellerRating: 4.9, sellerName: 'Daniel K.', listedAgo: '1d ago', image: getEventImage('Contemporary Art Exhibition'), verified: false },
  { id: 'r5', event_id: 'e4', ticket_type_id: 't5', status: 'active', asking_amount_minor: 380000, currency: 'ETB', resale_cutoff_at: null, fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sellerUserId: 'u-seller', 
    eventName: 'Tech Summit Ethiopia 2026', eventDate: 'March 25, 2026', eventTime: '9:00 AM', venue: 'Hyatt Regency', ticketType: 'VIP', originalPriceMinor: 350000, askingPriceMinor: 380000, sellerRating: 4.7, sellerName: 'Mikael B.', listedAgo: '8h ago', image: getEventImage('Tech Summit Ethiopia 2026'), verified: true },
];

const resaleListings = new Map<string, ResaleListing>(seedListings.map((l) => [l.id, l]));
const genListingId = () => `my-${Date.now()}`;

/** Mirror POST /tickets/:ticket_id/resale — body { asking_amount_minor }. */
async function activateListing(ticket: UserTicket, askingAmountMinor: number): Promise<ResaleListing> {
  const listing: ResaleListing = {
    id: genListingId(),
    event_id: 'e-live',
    ticket_type_id: 't-live',
    status: 'active',
    asking_amount_minor: askingAmountMinor,
    currency: 'ETB',
    resale_cutoff_at: null,
    fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: RESALE_FEE_BPS, currency: 'ETB' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Display enrichment — replaced by FK joins when the backend nests these (GAPS #4)
    sellerUserId: 'u-current',
    eventName: ticket.eventName,
    eventDate: ticket.eventDate,
    eventTime: ticket.eventTime,
    venue: ticket.venue,
    ticketType: ticket.ticketType,
    originalPriceMinor: askingAmountMinor,
    askingPriceMinor: askingAmountMinor,
    sellerRating: 5,
    sellerName: 'You',
    listedAgo: 'just now',
    image: ticket.image || getEventImage(ticket.eventName),
    verified: true,
    ticket,
  };
  resaleListings.set(listing.id, listing);
  return listing;
}

export const resaleModule = {
  initialListings: seedListings,
  keys: {
    all: ['resale', 'listings'] as const,
    myListings: ['resale', 'listings', 'mine'] as const,
    detail: (id: string) => ['resale', 'listings', id] as const,
  },

  /**
   * Reset the store to its seed state — mirrors the backend's wipable,
   * re-seedable Postgres state (BACKEND_GAPS.md / dev workflow). Tests and
   * dev reloads call this to get a clean slate.
   */
  resetToSeed(): void {
    resaleListings.clear();
    for (const l of seedListings) resaleListings.set(l.id, { ...l });
  },

  /**
   * Mirror GET /resale_listings (active, buyer-visible fields).
   * Mirrors the backend's ResaleListingPolicy::Scope:
   *   scope.where(status: "active").or(scope.where(seller_user_id: user.id))
   * So buyers see active listings; a seller also sees their own.
   */
  async fetchListings(sellerUserId?: string): Promise<ResaleListing[]> {
    return Array.from(resaleListings.values()).filter(
      (l) => l.status === 'active' || (sellerUserId && l.sellerUserId === sellerUserId),
    );
  },

  /**
   * Mirror the ownership branch of the policy scope: listings where
   * seller_user_id == currentUser.id. Kills the page's second source of truth.
   */
  async fetchMyListings(sellerUserId: string): Promise<ResaleListing[]> {
    return Array.from(resaleListings.values()).filter(
      (l) => l.status !== 'sold' && l.sellerUserId === sellerUserId,
    );
  },

  /**
   * Mirror POST /tickets/:ticket_id/resale. Takes the asking price in CENTS
   * (backend `asking_amount_minor`). Returns the created listing.
   */
  async createListing(ticket: UserTicket, askingAmountMinor: number): Promise<ResaleListing> {
    return activateListing(ticket, askingAmountMinor);
  },

  /** Mirror POST /resale_listings/:id/cancel — body { reason }. */
  async cancelListing(listingId: string, reason = 'seller_requested'): Promise<ResaleListing> {
    const listing = resaleListings.get(listingId);
    if (listing) {
      resaleListings.set(listingId, { ...listing, status: 'cancelled' });
      return resaleListings.get(listingId)!;
    }
    throw new Error('Listing not found');
  },

  /**
   * Mirror POST /resale_listings/:id/purchase — returns an Orders::OrderSerializer
   * (pending_payment). The buyer then pays via orderModule.startPayment, exactly
   * like checkout. MOCK: returns a backend-shaped pending order.
   */
  async purchaseListing(listingId: string): Promise<CheckoutOrder> {
    const listing = resaleListings.get(listingId);
    if (!listing) throw new Error('Listing not found');
    return orderModule.createOrder({ eventId: listing.event_id, quoteToken: `mock_quote_${listingId}` });
  },

  /** Convenience for the UI — converts major input to cents at the boundary. */
  async createTicketListingReference(ticketId: UserTicket['id'], priceMajor: number): Promise<{ ok: true; listingId: string }> {
    const askingMinor = Math.round(priceMajor * 100);
    const listing = await activateListing(
      { id: ticketId } as UserTicket,
      askingMinor,
    );
    return { ok: true, listingId: listing.id };
  },
};

export const resaleKeys = {
  all: ['resale', 'listings'] as const,
  detail: (id: string) => ['resale', 'listings', id] as const,
};
