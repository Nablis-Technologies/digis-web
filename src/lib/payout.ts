/**
 * Seller payout destinations — mirrors digis_backend's seller payout
 * accounts (all mutations require Idempotency-Key, auto-injected):
 *   - GET  /marketplace/seller/payout_accounts → own destinations
 *   - POST /marketplace/seller/payout_accounts → verify + register one
 *
 * Backend contract notes the UI must respect:
 * - Identifiers are tokenized server-side and never serialized back, so the
 *   list shows provider + type + verification status only.
 * - There is no default flag and no removal endpoint; both were cut from
 *   the UI rather than faked.
 * - UI kinds map to backend type/provider on submit: Telebirr rides the
 *   mobile-money/telebirr pair; CBE/BoA ride the bank rail (the bank itself
 *   travels inside the encrypted account details).
 * - Until the backend registers a marketplace provider adapter, create
 *   answers 422 `payout_account_provider_unavailable` — surfaced honestly
 *   (proceeds wait in the seller balance; listing still works).
 */

import { apiFetch } from '@/lib/api';
import type {
  AddPayoutMethodInput,
  PayoutMethod,
  PayoutMethodKind,
  SellerPayoutAccountStatus,
  SellerPayoutAccountWire,
} from '@/types/payout';

function kindToBackend(kind: PayoutMethodKind): { type: string; provider: string } {
  if (kind === 'telebirr') return { type: 'mobile_money', provider: 'telebirr' };
  return { type: 'bank', provider: 'bank' };
}

/** Known status → display label. Unknown statuses have no label (absent, not invented). */
export const STATUS_LABELS: Record<SellerPayoutAccountStatus, string> = {
  pending_verification: 'Verifying…',
  verified: 'Verified',
  suspended: 'Suspended',
  closed: 'Closed',
};

export function statusLabel(status: PayoutMethod['status']): string {
  return status ? (STATUS_LABELS[status] ?? '') : '';
}

const PROVIDER_LABELS: Record<string, string> = {
  telebirr: 'Telebirr',
  chapa: 'Chapa',
};

function displayNameFor(provider: string, type: string): string {
  return PROVIDER_LABELS[provider] ?? (type === 'bank' ? 'Bank account' : provider);
}

/** Map a backend status; unknown values are dropped, never defaulted. */
function toStatus(value: string | undefined): SellerPayoutAccountStatus | undefined {
  return value && (Object.keys(STATUS_LABELS) as SellerPayoutAccountStatus[]).includes(value as SellerPayoutAccountStatus)
    ? (value as SellerPayoutAccountStatus)
    : undefined;
}

export function mapPayoutAccount(wire: SellerPayoutAccountWire): PayoutMethod {
  return {
    id: wire.id,
    type: wire.type === 'bank' ? 'bank' : 'mobile_money',
    provider: wire.provider,
    status: toStatus(wire.status),
    verifiedAt: wire.verified_at,
    displayName: displayNameFor(wire.provider, wire.type),
    createdAt: wire.created_at,
  };
}

export const payoutService = {
  async fetchMethods(): Promise<PayoutMethod[]> {
    const { data } = await apiFetch<SellerPayoutAccountWire[]>('marketplace/seller/payout_accounts');
    return (Array.isArray(data) ? data : []).map(mapPayoutAccount);
  },

  async addMethod(input: AddPayoutMethodInput): Promise<PayoutMethod> {
    const holderName = input.holderName.trim();
    const accountNumber = input.accountNumber.replace(/\s+/g, '');
    if (holderName.length <= 1) throw new Error('Enter the account holder name.');
    if (accountNumber.length < 4) throw new Error('Enter a valid account number.');
    const { type, provider } = kindToBackend(input.kind);
    const { data } = await apiFetch<SellerPayoutAccountWire>('marketplace/seller/payout_accounts', {
      method: 'POST',
      body: {
        payout_account: {
          type,
          provider,
          holder_name: holderName,
          account_details:
            input.kind === 'telebirr'
              ? { phone: accountNumber }
              : { account_number: accountNumber, bank: input.kind },
        },
      },
    });
    return mapPayoutAccount(data);
  },
};

export const payoutKeys = {
  all: ['payout', 'methods'] as const,
};
