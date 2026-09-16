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
 * - Chapa V2 create contract is FLAT (no `account_details` envelope):
 *   `payout_account: { type, provider, bank_slug, account_number, holder_name }`.
 *   Telebirr rides the mobile_money rail, CBE/BoA ride the bank rail; the
 *   bank now travels as a top-level `bank_slug` (was nested `bank`). `provider`
 *   is ALWAYS "chapa" (the only registered adapter).
 * - `bank_slug` is validated server-side against the provider's ET bank list
 *   (`/v2/payouts/banks`). There is no public endpoint exposing that list, so
 *   the slugs below are the known provider values — see BACKEND_GAPS.md.
 * - Create now works end to end (Chapa V2 tokenization landed): a verified
 *   account returns verified; an unverifiable one returns pending_verification.
 */

import { apiFetch } from '@/lib/api';
import type {
  AddPayoutMethodInput,
  PayoutMethod,
  PayoutMethodKind,
  SellerPayoutAccountStatus,
  SellerPayoutAccountWire,
} from '@/types/payout';

/** UI kind → backend create fields (type/provider/bank_slug). */
const KIND_ACCOUNTS: Record<PayoutMethodKind, { type: string; provider: string; bank_slug: string }> = {
  // The registry (`PayoutProviders::Registry`) only ever registers "chapa".
  // Telebirr is the mobile_money rail (slug `telebirr`); CBE/BoA are bank rails.
  // `cbe` and `telebirr` are confirmed provider slugs; `boa` is the assumed
  // slug pending a public banks endpoint (see BACKEND_GAPS.md).
  telebirr: { type: 'mobile_money', provider: 'chapa', bank_slug: 'telebirr' },
  cbe: { type: 'bank', provider: 'chapa', bank_slug: 'cbe' },
  boa: { type: 'bank', provider: 'chapa', bank_slug: 'boa' },
};

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
  // Provider is the tokenizer adapter (always "chapa"); the rail is the
  // user-facing label. mobile_money = Telebirr in this market.
  if (type === 'mobile_money') return 'Telebirr';
  if (type === 'bank') return 'Bank account';
  return PROVIDER_LABELS[provider] ?? provider;
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
    bankSlug: wire.bank_slug,
    isDefault: wire.is_default === true,
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
    const { type, provider, bank_slug } = KIND_ACCOUNTS[input.kind];
    const { data } = await apiFetch<SellerPayoutAccountWire>('marketplace/seller/payout_accounts', {
      method: 'POST',
      body: {
        payout_account: {
          type,
          provider,
          bank_slug,
          account_number: accountNumber,
          holder_name: holderName,
        },
      },
    });
    return mapPayoutAccount(data);
  },
};

export const payoutKeys = {
  all: ['payout', 'methods'] as const,
};
