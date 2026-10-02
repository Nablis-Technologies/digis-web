/**
 * Seller payout destinations — mirrors digis_backend's seller payout
 * accounts (all mutations require Idempotency-Key, auto-injected):
 *   - GET  /marketplace/seller/payout_accounts        → own registered accounts
 *   - GET  /marketplace/seller/payout_accounts/destinations → provider rails
 *   - POST /marketplace/seller/payout_accounts        → verify + register one
 *
 * Backend contract notes the UI must respect:
 * - Rails are DISCOVERED, never hardcoded. The provider (and its mode) decides
 *   which banks exist — e.g. Chapa test mode exposes only `link` — so the form
 *   renders `fetchBanks()` and sends back the chosen bank's own `type` +
 *   `bank_slug`. (Previously this module hardcoded telebirr/cbe/boa, all of
 *   which the backend rejects: `type`/`mobile_money` fails the rail allow-list
 *   and cbe/boa are absent from the provider list — BACKEND_GAPS #39.)
 * - The create contract is FLAT (no `account_details` envelope):
 *   `payout_account: { type, provider, bank_slug, account_number, holder_name }`;
 *   `provider` is ALWAYS "chapa" (the only registered adapter).
 * - Beneficiary values are tokenized server-side and never serialized back, so
 *   the list shows rail + verification status only. There is no default flag and
 *   no removal endpoint; both are omitted rather than faked.
 */

import { apiFetch } from '@/lib/api';
import type {
  AddPayoutMethodInput,
  PayoutBank,
  PayoutMethod,
  SellerPayoutAccountStatus,
  SellerPayoutAccountWire,
} from '@/types/payout';

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

/**
 * Rail type → user-facing label. The provider owns this vocabulary (`bank`,
 * `mobile_money`, `store_value`, …), so an unknown rail falls back to the
 * provider name rather than being mislabelled as a known one.
 */
const RAIL_LABELS: Record<string, string> = {
  bank: 'Bank account',
  mobile_money: 'Mobile money',
  store_value: 'Wallet',
};

function displayNameFor(provider: string, type: string): string {
  return RAIL_LABELS[type] ?? (provider || 'Payout method');
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
    type: wire.type,
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

  /**
   * GET /marketplace/seller/payout_accounts/destinations — the provider's
   * supported rails for this market. The add form renders exactly these;
   * nothing is hardcoded, so test vs live rails follow the provider.
   */
  async fetchBanks(): Promise<PayoutBank[]> {
    const { data } = await apiFetch<Array<{ bank_slug: string; bank_name: string; type: string; min_amount?: number; max_amount?: number }>>(
      'marketplace/seller/payout_accounts/destinations',
    );
    return (Array.isArray(data) ? data : []).map((bank) => ({
      bankSlug: bank.bank_slug,
      bankName: bank.bank_name,
      type: bank.type,
      ...(typeof bank.min_amount === 'number' ? { minAmount: bank.min_amount } : {}),
      ...(typeof bank.max_amount === 'number' ? { maxAmount: bank.max_amount } : {}),
    }));
  },

  async addMethod(input: AddPayoutMethodInput): Promise<PayoutMethod> {
    const holderName = input.holderName.trim();
    const accountNumber = input.accountNumber.replace(/\s+/g, '');
    if (!input.bankSlug) throw new Error('Choose a payout destination.');
    if (holderName.length <= 1) throw new Error('Enter the account holder name.');
    if (accountNumber.length < 4) throw new Error('Enter a valid account number.');
    const { data } = await apiFetch<SellerPayoutAccountWire>('marketplace/seller/payout_accounts', {
      method: 'POST',
      body: {
        payout_account: {
          type: input.type,
          provider: 'chapa',
          bank_slug: input.bankSlug,
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
  banks: ['payout', 'banks'] as const,
};
