/**
 * Resale module — mirrors digis_backend's marketplace flow.
 *
 * Backend endpoints (all mutating ones require Idempotency-Key):
 *   - POST   /tickets/:ticket_id/resale           → create listing (asking_amount_minor only)
 *   - GET    /resale_listings                     → browse active (buyer-visible fields only)
 *   - GET    /resale_listings/:id                 → detail (seller view for the seller, public otherwise)
 *   - POST   /resale_listings/:id/purchase        → returns Orders::OrderSerializer (pending_payment)
 *   - POST   /resale_listings/:id/cancel          → { reason: "seller_requested" }
 *
 * The listing lifecycle (create → browse → cancel) lives HERE. Purchase creates an
 * Order and delegates the payment step to the Order module (orderModule) — the
 * backend's purchase endpoint returns an Order, and the buyer pays via
 * POST /orders/:id/payment_attempts exactly like checkout.
 *
 * Reads and writes are LIVE. Display fields come from the backend's nested
 * serializer (event / product / ticket-type / event-dates + venue). Anything
 * the backend does not serve (seller identity, ratings, verified flags,
 * images) is absent, never fabricated. Images resolve through the events
 * module's backend cover with a local fallback.
 *
 * My-listings come from `GET /resale_listings/mine` (seller-scoped — the
 * backend answers ownership; no client-side id bookkeeping).
 */

import { apiFetch } from "@/lib/api";
import { eventsModule } from "@/lib/events";
import { isoToDisplayDate, isoToDisplayTime, formatRelativeTime } from "@/lib/mappers";
import type { CheckoutOrder } from "@/lib/order";
import type { ResaleListing, PublicResaleListingWire, SellerResaleListingWire } from "@/types/resale";
import type { UserTicket } from "@/types/ticket";
import { Money } from "@/lib/money";

/** Map the buyer-visible wire shape to display fields. No invention. */
export function mapPublicListing(wire: PublicResaleListingWire, image: string): ResaleListing {
  const firstDate = wire.event_dates?.[0];
  const venue = firstDate?.venue ?? null;
  const sellerExtras = wire as PublicResaleListingWire & { seller_acquisition_product_value_minor?: number };
  return {
    id: wire.id,
    status: wire.status,
    asking_amount_minor: wire.asking_amount_minor,
    currency: wire.currency,
    resale_cutoff_at: wire.resale_cutoff_at,
    fee_terms: wire.fee_terms,
    event_id: wire.event.id,
    ticket_type_id: wire.ticket_type?.id ?? wire.product.id,
    eventSlug: wire.event.slug,
    eventName: wire.event.title,
    eventDate: isoToDisplayDate(firstDate?.starts_at),
    eventTime: isoToDisplayTime(firstDate?.starts_at),
    venue: venue ? (venue.city ? `${venue.name}, ${venue.city}` : venue.name) : '',
    city: venue?.city ?? '',
    ticketType: wire.ticket_type?.name ?? wire.product.name,
    askingPriceMinor: wire.asking_amount_minor,
    ...(typeof sellerExtras.seller_acquisition_product_value_minor === 'number'
      ? { originalPriceMinor: sellerExtras.seller_acquisition_product_value_minor }
      : {}),
    image,
    listedAgo: formatRelativeTime(wire.created_at),
    created_at: wire.created_at,
    updated_at: wire.updated_at,
  };
}

/** Seller-scoped wire → economics + identity fields (create/cancel responses). */
function sellerWireToListing(wire: SellerResaleListingWire): ResaleListing {
  return {
    id: wire.id,
    status: wire.status,
    asking_amount_minor: wire.asking_amount_minor,
    currency: wire.currency,
    resale_cutoff_at: wire.resale_cutoff_at,
    fee_terms: wire.fee_terms,
    event_id: wire.event_id,
    ticket_type_id: wire.ticket_type_id,
    eventSlug: '',
    eventName: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    city: '',
    ticketType: '',
    askingPriceMinor: wire.asking_amount_minor,
    originalPriceMinor: wire.seller_acquisition_product_value_minor,
    image: '',
    listedAgo: '',
    created_at: wire.created_at,
    updated_at: wire.updated_at,
  };
}

/** Resolve a backend event cover per distinct slug; a failure renders absent. */
async function resolveImages(wires: PublicResaleListingWire[]): Promise<Map<string, string>> {
  const slugs = Array.from(new Set(wires.map((w) => w.event.slug).filter(Boolean)));
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const event = await eventsModule.fetchById(slug).catch(() => null);
      return [slug, event?.image ?? ""] as const;
    }),
  );
  return new Map(entries);
}

/**
 * The detail endpoint is shape-polymorphic: a NON-seller gets the nested public
 * wire (event/product/ticket_type/event_dates), while the SELLER gets the flat
 * seller wire (ids + economics, no nested context). Discriminate on the nested
 * `event` rather than assuming either.
 */
function isPublicListingWire(
  wire: PublicResaleListingWire | SellerResaleListingWire,
): wire is PublicResaleListingWire {
  return Boolean((wire as PublicResaleListingWire).event?.id);
}

/** Overlay flat seller economics with the display context from a browse row. */
function withDisplayContext(base: ResaleListing, row: ResaleListing | undefined): ResaleListing {
  if (!row) return base;
  return {
    ...base,
    eventSlug: row.eventSlug || base.eventSlug,
    eventName: row.eventName || base.eventName,
    eventDate: row.eventDate || base.eventDate,
    eventTime: row.eventTime || base.eventTime,
    venue: row.venue || base.venue,
    city: row.city || base.city,
    ticketType: row.ticketType || base.ticketType,
    image: row.image || base.image,
    listedAgo: row.listedAgo || base.listedAgo,
  };
}

export const resaleModule = {
  keys: {
    all: ['resale', 'listings'] as const,
    myListings: ['resale', 'listings', 'mine'] as const,
    detail: (id: string) => ['resale', 'listings', id] as const,
  },

  /**
   * Mirror GET /resale_listings (active, buyer-visible fields). The backend
   * scopes to active; no client-side status filtering.
   */
  async fetchListings(): Promise<ResaleListing[]> {
    const { data } = await apiFetch<PublicResaleListingWire[]>("resale_listings");
    const wires = Array.isArray(data) ? data : [];
    const images = await resolveImages(wires);
    return wires.map((w) => mapPublicListing(w, images.get(w.event.slug) || undefined));
  },

  /**
   * Own active listings via `GET /resale_listings/mine` (seller-scoped, the
   * authoritative source — BACKEND_GAPS #24 resolved). The seller wire is
   * flat (ids + economics, no display nesting), so display context comes from
   * the browse list keyed by id. Cross-session and after-storage-clear both
   * work — nothing depends on ids captured at creation time.
   */
  async fetchMyListings(): Promise<ResaleListing[]> {
    const { data } = await apiFetch<SellerResaleListingWire[]>("resale_listings/mine");
    const mineWires = Array.isArray(data) ? data : [];
    if (mineWires.length === 0) return [];
    const mineIds = new Set(mineWires.map((w) => w.id));
    const all = await resaleModule.fetchListings();
    return all.filter((l) => mineIds.has(l.id));
  },

  /**
   * Mirror GET /resale_listings/:id. Seller view carries the acquisition
   * value (mapped to originalPriceMinor); buyer view does not.
   */
  async fetchListingDetail(id: string): Promise<ResaleListing> {
    const { data } = await apiFetch<PublicResaleListingWire | SellerResaleListingWire>(`resale_listings/${id}`);
    if (isPublicListingWire(data)) {
      const image = (await resolveImages([data])).get(data.event.slug) || undefined;
      return mapPublicListing(data, image);
    }
    // Seller view is flat — enrich display from the browse row when the listing
    // is browsable. Missing context stays absent, never invented.
    const base = sellerWireToListing(data);
    const row = await resaleModule
      .fetchListings()
      .then((all) => all.find((l) => l.id === id))
      .catch(() => undefined);
    return withDisplayContext(base, row);
  },

  /**
   * Mirror POST /tickets/:ticket_id/resale. Takes the wallet ticket and the
   * asking price in CENTS (backend `asking_amount_minor`). The 201 seller
   * response is flat, so display is enriched from the detail endpoint
   * (spec decision 3) — never assumed from nested fields that aren't there.
   *
   * Client-side enforcement is limited to what the buyer can know: an active
   * ticket and a positive integer amount. Resale policy (enabled flag, cap,
   * cutoff) is not buyer-visible (BACKEND_GAPS #25), so violations surface as
   * typed backend errors, mapped to friendly copy.
   */
  async createListing(ticket: UserTicket, askingAmountMinor: number): Promise<ResaleListing> {
    if (ticket.status != null && ticket.status !== 'active') {
      throw new Error('Only active tickets can be listed for resale.');
    }
    if (!Number.isInteger(askingAmountMinor) || askingAmountMinor <= 0) {
      throw new Error('Asking price must be a positive amount.');
    }
    const { data } = await apiFetch<SellerResaleListingWire>(`tickets/${ticket.id}/resale`, {
      method: 'POST',
      body: { resale_listing: { asking_amount_minor: askingAmountMinor } },
    });
    // Enrichment is cosmetic — the listing exists either way. A failed detail
    // or browse read must NOT fail the create (the seller would be left on a
    // stuck sheet for a listing that was actually created).
    try {
      const listing = await resaleModule.fetchListingDetail(data.id);
      return { ...listing, ticket };
    } catch {
      return { ...sellerWireToListing(data), ticket };
    }
  },

  /**
   * Mirror POST /resale_listings/:id/cancel. Returns a narrow confirmation
   * (id + status + economics) — the seller wire is flat with no display
   * context, and callers re-read the lists, so the return is confirmation,
   * not render data.
   */
  async cancelListing(listingId: string, reason = 'seller_requested'): Promise<ResaleListing> {
    const { data } = await apiFetch<SellerResaleListingWire>(`resale_listings/${listingId}/cancel`, {
      method: 'POST',
      body: { resale_listing: { reason } },
    });
    return sellerWireToListing(data);
  },

  /**
   * Mirror POST /resale_listings/:id/purchase — returns the pending-payment
   * order. The buyer then pays via orderModule.startPayment, exactly like
   * checkout; answers/consents ride empty (optional) and registration
   * requirements surface as typed errors.
   */
  async purchaseListing(listingId: string): Promise<CheckoutOrder> {
    const { data } = await apiFetch<CheckoutOrder>(`resale_listings/${listingId}/purchase`, {
      method: 'POST',
      body: { purchase: {} },
    });
    return data;
  },

  /**
   * Convenience for id-only callers: resolve the wallet ticket first (the
   * wallet is live), then create. Converts major input to cents at the
   * boundary.
   */
  async createTicketListingReference(ticketId: UserTicket['id'], priceMajor: number): Promise<{ ok: true; listingId: string }> {
    // Dynamic import: tickets.ts imports this module at top level.
    const { ticketsService } = await import('@/lib/tickets');
    const wallet = await ticketsService.fetchUserTickets();
    const ticket = wallet.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found in your wallet.');
    const listing = await resaleModule.createListing(ticket, Money.fromMajor(priceMajor, 'ETB').amountMinor);
    return { ok: true, listingId: listing.id };
  },
};

export const resaleKeys = {
  all: ['resale', 'listings'] as const,
  detail: (id: string) => ['resale', 'listings', id] as const,
};
