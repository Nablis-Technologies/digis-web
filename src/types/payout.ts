/**
 * Seller payout destinations — mirrors the backend's
 * Marketplace::SellerPayoutAccountSerializer.
 *
 * The backend tokenizes identifiers server-side and never serializes them:
 * no account number, no holder name, no label comes back. There is no
 * default flag and no removal endpoint — a destination is added, verified
 * by the provider, and stands until suspended/closed server-side.
 */

/** Input selector in the add form (UI kinds; mapped to backend type/provider on submit). */
export type PayoutMethodKind = 'telebirr' | 'cbe' | 'boa';

export type SellerPayoutAccountStatus = 'pending_verification' | 'verified' | 'suspended' | 'closed';

export interface PayoutMethod {
  id: string;
  type: 'mobile_money' | 'bank';
  provider: string;
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

/** Backend wire shape (Marketplace::SellerPayoutAccountSerializer). */
export interface SellerPayoutAccountWire {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  status: string;
  verified_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}
