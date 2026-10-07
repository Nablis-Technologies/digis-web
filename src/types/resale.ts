import type { UserTicket } from './ticket';

/**
 * Resale listing wires — mirror the backend's marketplace serializers.
 *
 * Browse (`GET /resale_listings`) always renders the buyer-visible shape
 * (Marketplace::Public::ResaleListingSerializer): nested event / product /
 * ticket-type / event-date context, but NO seller identity, NO acquisition
 * value, NO ratings, NO images. Detail (`GET /resale_listings/:id`) renders
 * the same shape for buyers and the full seller shape
 * (Marketplace::ResaleListingSerializer) for the seller or a platform admin.
 */

export interface ResaleListingFeeTerms {
  calculation_type: string;
  refund_policy: string;
  rate_bps: number;
  currency: string;
}

export interface PublicResaleVenue {
  id: string;
  name: string;
  city?: string | null;
}

export interface PublicResaleEventDate {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  venue?: PublicResaleVenue | null;
}

/** Buyer-visible wire shape for one listing. */
export interface PublicResaleListingWire {
  id: string;
  status: 'active' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'draft';
  asking_amount_minor: number;
  currency: string;
  resale_cutoff_at: string | null;
  fee_terms: ResaleListingFeeTerms;
  event: { id: string; slug: string; title: string; timezone: string; currency: string };
  product: { id: string; name: string; type: string };
  ticket_type: { id: string; name: string; admissions_per_unit: number; entry_validation_mode: string } | null;
  event_dates: PublicResaleEventDate[];
  created_at: string;
  updated_at: string;
}

/** Seller-scoped wire shape (create/cancel responses, own detail view). */
export interface SellerResaleListingWire {
  id: string;
  event_id: string;
  ticket_id?: string;
  ticket_type_id: string;
  seller_user_id: string;
  status: 'active' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'draft';
  asking_amount_minor: number;
  currency: string;
  seller_acquisition_product_value_minor: number;
  resale_cutoff_at: string | null;
  fee_terms: ResaleListingFeeTerms;
  created_at: string;
  updated_at: string;
}

/**
 * Frontend display shape. Display fields are mapped from the nested wire —
 * never invented. Fields the backend does not serve in the current view are
 * absent (not faked): buyer views have no acquisition value, no seller
 * identity, no ratings, no verified flag.
 */
export interface ResaleListing {
  id: string;
  ticket_id?: string;
  status: 'active' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'draft';
  asking_amount_minor: number;
  currency: string;
  resale_cutoff_at: string | null;
  fee_terms: ResaleListingFeeTerms;
  event_id: string;
  ticket_type_id: string;
  eventSlug: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  ticketType: string;
  /** Asking price, cents. */
  askingPriceMinor: number;
  /** Seller's face value (acquisition value), cents. Seller view only. */
  originalPriceMinor?: number;
  /**
   * Event cover when resolvable, else the local name-based fallback (which
   * may itself be empty for unknown events). Components must guard: an
   * empty image renders a placeholder, never a bare <img>.
   */
  image: string;
  listedAgo: string;
  /** The wallet ticket this listing was created from (create flow only). */
  ticket?: UserTicket;
  created_at: string;
  updated_at: string;
}
