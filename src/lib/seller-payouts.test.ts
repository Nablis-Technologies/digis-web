import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import {
  mapSellerPayout,
  sellerPayoutStatusMeta,
  sellerPayoutsService,
} from '@/lib/seller-payouts';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function payoutWire(overrides = {}) {
  return {
    id: 'po-1',
    seller_user_id: 'user-uuid',
    seller_payout_account_id: 'pa-1',
    provider: 'chapa',
    amount_minor: 500000,
    currency: 'ETB',
    status: 'pending',
    requested_at: '2026-10-02T10:00:00.000Z',
    processed_at: null,
    created_at: '2026-10-02T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('mapSellerPayout', () => {
  it('maps the wire shape to the domain shape', () => {
    expect(mapSellerPayout(payoutWire())).toEqual({
      id: 'po-1',
      sellerUserId: 'user-uuid',
      accountId: 'pa-1',
      provider: 'chapa',
      amountMinor: 500000,
      currency: 'ETB',
      status: 'pending',
      requestedAt: '2026-10-02T10:00:00.000Z',
      processedAt: null,
      createdAt: '2026-10-02T10:00:00.000Z',
    });
  });

  it('keeps an unknown status raw (never coerces)', () => {
    expect(mapSellerPayout(payoutWire({ status: 'reversed' })).status).toBe('reversed');
  });
});

describe('sellerPayoutStatusMeta', () => {
  it('labels known statuses and flags terminal/failed', () => {
    expect(sellerPayoutStatusMeta('pending')).toMatchObject({ label: 'Pending', terminal: false, failed: false });
    expect(sellerPayoutStatusMeta('succeeded')).toMatchObject({ label: 'Paid out', terminal: true, failed: false });
    expect(sellerPayoutStatusMeta('failed')).toMatchObject({ label: 'Failed', terminal: true, failed: true });
  });

  it('renders an unknown status raw with no terminal flag', () => {
    expect(sellerPayoutStatusMeta('reversed')).toMatchObject({ label: 'reversed', terminal: false, failed: false });
  });
});

describe('sellerPayoutsService reads (live API, mocked HTTP)', () => {
  it('fetchPayouts hits the seller endpoint and maps rows + pagination', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [payoutWire(), payoutWire({ id: 'po-2', status: 'succeeded', processed_at: '2026-10-02T11:00:00.000Z' })],
      pagination: { current_page: 1, per_page: 20, total_count: 2, total_pages: 1 },
    } as never);

    const result = await sellerPayoutsService.fetchPayouts();

    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payouts');
    expect(result.payouts).toHaveLength(2);
    expect(result.payouts[0]).toMatchObject({ id: 'po-1', amountMinor: 500000, status: 'pending' });
    expect(result.payouts[1]).toMatchObject({ id: 'po-2', status: 'succeeded', processedAt: '2026-10-02T11:00:00.000Z' });
    expect(result.pagination?.total_count).toBe(2);
  });

  it('fetchPayouts passes page/per_page as a query string', async () => {
    mockedApiFetch.mockResolvedValue({ data: [] } as never);
    await sellerPayoutsService.fetchPayouts({ page: 2, perPage: 10 });
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payouts?page=2&per_page=10');
  });

  it('fetchPayout addresses one payout and encodes the id', async () => {
    mockedApiFetch.mockResolvedValue({ data: payoutWire() } as never);
    const payout = await sellerPayoutsService.fetchPayout('po/1');
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payouts/po%2F1');
    expect(payout.id).toBe('po-1');
  });
});

describe('sellerPayoutsService.requestPayout (live API, mocked HTTP)', () => {
  it('posts only the currency when amount + account are omitted', async () => {
    mockedApiFetch.mockResolvedValue({ data: payoutWire() } as never);
    await sellerPayoutsService.requestPayout({ currency: 'ETB' });
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payouts', {
      method: 'POST',
      body: { payout: { currency: 'ETB' } },
    });
  });

  it('sends amount_minor, the account, and a stable Idempotency-Key when given', async () => {
    mockedApiFetch.mockResolvedValue({ data: payoutWire() } as never);
    const payout = await sellerPayoutsService.requestPayout({
      currency: 'ETB',
      amountMinor: 100000,
      sellerPayoutAccountId: 'pa-9',
      idempotencyKey: 'withdraw-key-1',
    });
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payouts', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'withdraw-key-1' },
      body: { payout: { currency: 'ETB', amount_minor: 100000, seller_payout_account_id: 'pa-9' } },
    });
    expect(payout.id).toBe('po-1');
  });
});
