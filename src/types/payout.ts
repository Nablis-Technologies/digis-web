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

/** Input selector in the add form (UI kinds; mapped to backend type/provider on submit). */
export type PayoutMethodKind = 'telebirr' | 'cbe' | 'boa';

export type SellerPayoutAccountStatus = 'pending_verification' | 'verified' | 'suspended' | 'closed';

export interface PayoutMethod {
  id: string;
  type: 'mobile_money' | 'bank';
  provider: string;
  /** Provider bank/mobile-money slug the destination is registered against. */
  bankSlug: string;
  /** True for the seller's default destination (set server-side). */
  isDefault: boolean;
  /** Absent when the backend omits or sends an unknown status — never defaulted. */
  status?: SellerPayoutAccountStatus;
  verifiedAt: string | null;
  /** Provider display name ('Telebirr' | 'Bank account' | ...). */
  displayName: string;
  createdAt: string;
}

export interface AddPayoutMethodInput {
  kind: PayoutMethodKind;
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
