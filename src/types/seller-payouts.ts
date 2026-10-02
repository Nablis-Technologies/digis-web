/**
 * Seller payouts — the withdrawal lifecycle, mirroring digis_backend's
 * `Marketplace::SellerPayoutSerializer` (GET/POST `/marketplace/seller/payouts`).
 *
 * Money is integer minor units (wire `*_minor`); convert only via `Money`.
 * Every field is served by the backend — nothing is derived or invented. The
 * `status` stays a plain string: unknown values render raw rather than being
 * coerced into a known one.
 */

export interface SellerPayout {
  id: string;
  sellerUserId: string;
  /** The verified destination the payout is sent to. */
  accountId: string;
  provider: string;
  amountMinor: number;
  currency: string;
  /** pending | processing | succeeded | failed | cancelled (server lifecycle). */
  status: string;
  requestedAt: string;
  /** Set only once the payout reaches a terminal status. */
  processedAt: string | null;
  createdAt: string;
}

export interface RequestPayoutInput {
  currency: string;
  /** Omit to withdraw the seller's full available balance for the currency. */
  amountMinor?: number;
  /** Omit to use the seller's default verified destination. */
  sellerPayoutAccountId?: string;
  /** Stable key for one user intent so a retry returns the same payout. */
  idempotencyKey?: string;
}
