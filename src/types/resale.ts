import type { UserTicket } from './ticket';

/**
 * Resale listing — mirrors the backend's Marketplace::ResaleListingSerializer.
 *
 * The backend's buyer-visible fields are only FKs + economics:
 *   id, event_id, ticket_type_id, seller_user_id, status,
 *   asking_amount_minor, currency, resale_cutoff_at, fee_terms,
 *   created_at, updated_at.
 * It does NOT return display fields (event name/date/venue, ticket type name,
 * seller name). Those require separate FK joins — see docs/BACKEND_GAPS.md #4.
 */

export interface ResaleListingFeeTerms {
  calculation_type: string;
  refund_policy: string;
  rate_bps: number;
  currency: string;
}

/** Backend wire shape for a resale listing (buyer-visible fields). */
export interface ResaleListingWire {
  id: string;
  event_id: string;
  ticket_type_id: string;
  /** Returned to sellers; hidden from buyers. */
  seller_user_id?: string;
  status: 'active' | 'reserved' | 'sold' | 'cancelled' | 'expired' | 'draft';
  asking_amount_minor: number;
  currency: string;
  resale_cutoff_at: string | null;
  fee_terms: ResaleListingFeeTerms;
  created_at: string;
  updated_at: string;
}

/**
 * Frontend display shape. Extends the wire shape with the display fields the
 * backend does not yet return (BACKEND_GAPS.md #4). These come from FK joins
 * (event, ticket-type, seller) — mocked here until the backend nests them.
 */
export interface ResaleListing extends ResaleListingWire {
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  /** Seller's face value (acquisition value), cents. */
  originalPriceMinor: number;
  /** Asking price, cents. */
  askingPriceMinor: number;
  sellerRating: number;
  sellerName: string;
  listedAgo: string;
  image: string;
  verified: boolean;
  ticket?: UserTicket;
  /** Frontend helper mirroring seller_user_id for ownership scoping. */
  sellerUserId?: string;
}

export const RESALE_FEE_BPS = 800; // 8% seller platform fee — mock, replaced by fee_terms from backend
