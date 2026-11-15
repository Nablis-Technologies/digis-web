/**
 * Seller payouts — the withdrawal lifecycle (digis_backend
 * `Marketplace::SellerPayoutsController`):
 *   - GET  /marketplace/seller/payouts       → own payouts (paginated)
 *   - GET  /marketplace/seller/payouts/:id   → one own payout
 *   - POST /marketplace/seller/payouts       → request a withdrawal
 *
 * The POST reserves the seller's balance and dispatches asynchronously through
 * the outbox, so a fresh payout is `pending` — never "paid out". Omit
 * `amountMinor` to withdraw the full available balance; omit the account to use
 * the default verified destination. Mutations need `Idempotency-Key`
 * (auto-injected by `apiFetch` unless a stable key is passed).
 *
 * Money stays integer minor units; format with `Money`.
 */

import { apiFetch, type Pagination } from '@/lib/api';
import type { RequestPayoutInput, SellerPayout } from '@/types/seller-payouts';

/* ─── Backend wire shape (Marketplace::SellerPayoutSerializer) ─── */

interface SellerPayoutWire {
  id: string;
  seller_user_id: string;
  seller_payout_account_id: string;
  provider: string;
  amount_minor: number;
  currency: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  created_at: string;
}

/** Known status → display label. Unknown statuses render raw, never invented. */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  succeeded: 'Paid out',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function sellerPayoutStatusMeta(status: string): {
  label: string;
  terminal: boolean;
  failed: boolean;
} {
  const key = (status ?? '').toLowerCase();
  return {
    label: STATUS_LABELS[key] ?? status ?? '',
    terminal: key === 'succeeded' || key === 'failed' || key === 'cancelled',
    failed: key === 'failed',
  };
}

export function mapSellerPayout(wire: SellerPayoutWire): SellerPayout {
  return {
    id: wire.id,
    sellerUserId: wire.seller_user_id,
    accountId: wire.seller_payout_account_id,
    provider: wire.provider,
    amountMinor: wire.amount_minor,
    currency: wire.currency,
    status: wire.status,
    requestedAt: wire.requested_at,
    processedAt: wire.processed_at ?? null,
    createdAt: wire.created_at,
  };
}

export interface SellerPayoutPage {
  payouts: SellerPayout[];
  pagination?: Pagination;
}

export const sellerPayoutsService = {
  /** GET /marketplace/seller/payouts — the caller's own payouts (newest first). */
  async fetchPayouts(params: { page?: number; perPage?: number } = {}): Promise<SellerPayoutPage> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.perPage) qs.set('per_page', String(params.perPage));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const { data, pagination } = await apiFetch<SellerPayoutWire[]>(
      `marketplace/seller/payouts${suffix}`,
    );
    return {
      payouts: (Array.isArray(data) ? data : []).map(mapSellerPayout),
      ...(pagination ? { pagination } : {}),
    };
  },

  /** GET /marketplace/seller/payouts/:id — one payout, seller-scoped. */
  async fetchPayout(id: string): Promise<SellerPayout> {
    const { data } = await apiFetch<SellerPayoutWire>(
      `marketplace/seller/payouts/${encodeURIComponent(id)}`,
    );
    return mapSellerPayout(data);
  },

  /**
   * POST /marketplace/seller/payouts — request a withdrawal. The body carries
   * only what the user chose; omitted fields let the backend use the full
   * balance / default destination. A stable `idempotencyKey` makes a retry of
   * one intent return the same payout.
   */
  async requestPayout(input: RequestPayoutInput): Promise<SellerPayout> {
    const { data } = await apiFetch<SellerPayoutWire>('marketplace/seller/payouts', {
      method: 'POST',
      ...(input.idempotencyKey ? { headers: { 'Idempotency-Key': input.idempotencyKey } } : {}),
      body: {
        payout: {
          currency: input.currency,
          ...(typeof input.amountMinor === 'number' ? { amount_minor: input.amountMinor } : {}),
          ...(input.sellerPayoutAccountId
            ? { seller_payout_account_id: input.sellerPayoutAccountId }
            : {}),
        },
      },
    });
    return mapSellerPayout(data);
  },
};

export const sellerPayoutKeys = {
  all: ['seller', 'payouts'] as const,
  /** Base key for the paginated list (used by an infinite query). */
  list: () => ['seller', 'payouts', 'list'] as const,
  detail: (id: string) => ['seller', 'payouts', 'detail', id] as const,
};
