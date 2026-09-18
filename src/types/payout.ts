/**
 * Seller payout destinations — mirrors the backend's
 * Marketplace::SellerPayoutAccountSerializer (Chapa V2).
 *
 * The backend keeps beneficiary values server-side and never serializes them:
 * no account number or holder name comes back. The destination carries the
 * provider `bank_slug`, an optional label, a verification source, and an
 * `is_default` flag (set via POST …/payout_accounts/:id/set_default). There is
 * still no removal endpoint — a destination stands until suspended/closed.
 */

/** Payment-method logo selector (checkout rails — not seller payouts). */
export type PayoutMethodKind = 'telebirr' | 'cbe' | 'boa';

/**
 * One destination the provider actually supports, from the backend's bank list
 * (`GET /marketplace/seller/payout_accounts/banks`). `type` is the provider's
 * own rail type (`bank`, `mobile_money`, `store_value`, …) and is sent back
 * verbatim on create — the UI never invents slugs or rails.
 */
export interface PayoutBank {
  bankSlug: string;
  bankName: string;
  type: string;
  minAmount?: number;
  maxAmount?: number;
}

export type SellerPayoutAccountStatus = 'pending_verification' | 'verified' | 'suspended' | 'closed';

export interface PayoutMethod {
  id: string;
  /** Provider rail type, e.g. 'bank' | 'mobile_money' | 'store_value'. */
  type: string;
  provider: string;
  /** Provider bank/mobile-money slug the destination is registered against. */
  bankSlug: string;
  /** True for the seller's default destination (set server-side). */
  isDefault: boolean;
  /** Absent when the backend omits or sends an unknown status — never defaulted. */
  status?: SellerPayoutAccountStatus;
  verifiedAt: string | null;
  /** Provider display name ('Bank account' | 'Mobile money' | 'Wallet'). */
  displayName: string;
  createdAt: string;
}

export interface AddPayoutMethodInput {
  bankSlug: string;
  type: string;
  holderName: string;
  accountNumber: string;
}

/** Backend wire shape (Marketplace::SellerPayoutAccountSerializer, Chapa V2). */
export interface SellerPayoutAccountWire {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  bank_slug: string;
  account_label: string | null;
  status: string;
  verification_source: string | null;
  is_default: boolean;
  verified_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}
