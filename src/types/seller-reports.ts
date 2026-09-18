/**
 * Seller earnings — mirrors digis_backend's marketplace seller reports:
 *   - GET /marketplace/seller/balance → per-currency totals
 *   - GET /marketplace/seller/history → the seller ledger (resale proceeds …)
 *
 * Money is integer minor units (wire `*_minor`); convert only via `Money`.
 * Every field here is served by the backend — nothing is derived or invented.
 */

export interface SellerBalance {
  currency: string;
  /** Lifetime credited total for the currency. */
  ledgerTotalMinor: number;
  /** Credited but still held (e.g. inside a resale holding window). */
  reservedMinor: number;
  /** Spendable/payable now. */
  availableMinor: number;
}

export interface SellerLedgerEntry {
  id: string;
  /** Ledger entry type, e.g. 'resale_proceeds'. */
  type: string;
  amountMinor: number;
  currency: string;
  /** When the entry becomes available for payout. */
  availableAt: string;
  description: string;
  /** Event context when the entry carries one. */
  eventName: string;
  eventSlug: string;
  createdAt: string;
}
