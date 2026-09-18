import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { sellerReportsService, mapSellerBalance, mapSellerLedgerEntry } from '@/lib/seller-reports';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('sellerReportsService (live API, mocked HTTP)', () => {
  it('fetchBalance calls the seller endpoint and maps snake_case money fields', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [{ currency: 'ETB', ledger_total_minor: 100000, reserved_minor: 5000, available_minor: 95000 }],
    } as never);
    const balances = await sellerReportsService.fetchBalance();
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/balance');
    expect(balances).toEqual([
      { currency: 'ETB', ledgerTotalMinor: 100000, reservedMinor: 5000, availableMinor: 95000 },
    ]);
  });

  it('fetchHistory maps entries and surfaces the event context', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        {
          id: 'le-1',
          type: 'resale_proceeds',
          amount_minor: 100000,
          currency: 'ETB',
          available_at: '2026-10-23T03:00:00.000Z',
          description: 'Resale seller gross proceeds',
          event: { id: 'e-1', slug: 'on-on', title: 'On & On' },
          created_at: '2026-09-18T13:38:04.000Z',
        },
      ],
    } as never);
    const entries = await sellerReportsService.fetchHistory();
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/history');
    expect(entries[0]).toMatchObject({
      id: 'le-1',
      type: 'resale_proceeds',
      amountMinor: 100000,
      currency: 'ETB',
      eventName: 'On & On',
      eventSlug: 'on-on',
    });
  });

  it('tolerates missing descriptions and event context without inventing them', async () => {
    const balance = mapSellerBalance({ currency: 'ETB', ledger_total_minor: 0, reserved_minor: 0, available_minor: 0 });
    expect(balance.availableMinor).toBe(0);

    const entry = mapSellerLedgerEntry({
      id: 'le-2', type: 'adjustment', amount_minor: 500, currency: 'ETB',
      available_at: '2026-09-18T00:00:00.000Z', created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(entry.description).toBe('');
    expect(entry.eventName).toBe('');
    expect(entry.eventSlug).toBe('');
  });

  it('returns [] when the backend sends no rows', async () => {
    mockedApiFetch.mockResolvedValue({ data: null } as never);
    expect(await sellerReportsService.fetchBalance()).toEqual([]);
    expect(await sellerReportsService.fetchHistory()).toEqual([]);
  });
});
