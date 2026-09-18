import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { payoutService, mapPayoutAccount, statusLabel } from '@/lib/payout';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function accountWire(overrides = {}) {
  return {
    id: 'pa-1',
    user_id: 'user-uuid',
    type: 'store_value',
    provider: 'chapa',
    bank_slug: 'link',
    account_label: null,
    status: 'verified',
    verification_source: 'provider',
    is_default: false,
    verified_at: '2026-09-06T10:00:00.000Z',
    last_used_at: null,
    created_at: '2026-09-06T09:00:00.000Z',
    updated_at: '2026-09-06T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('payoutService reads (live API, mocked HTTP)', () => {
  it('fetchMethods calls the seller endpoint and maps thin rows', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        accountWire(),
        accountWire({ id: 'pa-2', type: 'bank', bank_slug: 'cbe', status: 'pending_verification', verified_at: null }),
      ],
    } as never);
    const methods = await payoutService.fetchMethods();
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payout_accounts');
    expect(methods).toHaveLength(2);
    expect(methods[0]).toMatchObject({ id: 'pa-1', displayName: 'Wallet', type: 'store_value', status: 'verified', bankSlug: 'link', isDefault: false });
    expect(methods[1]).toMatchObject({ id: 'pa-2', displayName: 'Bank account', status: 'pending_verification' });
    // Identifiers are never serialized — nothing to leak into the rows.
    expect(methods[0]).not.toHaveProperty('accountNumber');
    expect(methods[0]).not.toHaveProperty('holderName');
  });

  it('fetchBanks maps the provider bank list (snake_case → camelCase)', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        { bank_slug: 'link', bank_name: 'Link', type: 'store_value', min_amount: 100, max_amount: 5000000, is_active: true },
        { bank_slug: 'cbe', bank_name: 'Commercial Bank of Ethiopia', type: 'bank' },
      ],
    } as never);
    const banks = await payoutService.fetchBanks();
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payout_accounts/banks');
    expect(banks[0]).toEqual({ bankSlug: 'link', bankName: 'Link', type: 'store_value', minAmount: 100, maxAmount: 5000000 });
    // Optional bounds are omitted, never defaulted.
    expect(banks[1]).toEqual({ bankSlug: 'cbe', bankName: 'Commercial Bank of Ethiopia', type: 'bank' });
  });

  it('mapPayoutAccount keeps the provider rail type and drops unknown statuses', () => {
    const m = mapPayoutAccount(accountWire({ provider: 'mystery', type: 'weird', status: 'odd' }));
    expect(m.type).toBe('weird');
    expect(m.displayName).toBe('mystery');
    expect(m.status).toBeUndefined();
  });

  it('statusLabel renders a label only for known statuses', () => {
    expect(statusLabel('verified')).toBe('Verified');
    expect(statusLabel('pending_verification')).toBe('Verifying…');
    expect(statusLabel(undefined)).toBe('');
    // @ts-expect-error — unknown string is not a valid domain status
    expect(statusLabel('odd')).toBe('');
  });
});

describe('payoutService.addMethod (live API, mocked HTTP)', () => {
  it('posts the discovered bank slug with its own rail type', async () => {
    mockedApiFetch.mockResolvedValue({ data: accountWire() } as never);
    const method = await payoutService.addMethod({
      bankSlug: 'link', type: 'store_value', holderName: 'Abebe M', accountNumber: '09 11 22 33 44',
    });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'marketplace/seller/payout_accounts',
      expect.objectContaining({
        method: 'POST',
        body: {
          payout_account: {
            type: 'store_value',
            provider: 'chapa',
            bank_slug: 'link',
            account_number: '0911223344',
            holder_name: 'Abebe M',
          },
        },
      }),
    );
    expect(method.displayName).toBe('Wallet');
  });

  it('posts a bank rail verbatim too', async () => {
    mockedApiFetch.mockResolvedValue({ data: accountWire({ type: 'bank', bank_slug: 'cbe' }) } as never);
    await payoutService.addMethod({ bankSlug: 'cbe', type: 'bank', holderName: 'Abebe M', accountNumber: '1000 0000' });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'marketplace/seller/payout_accounts',
      expect.objectContaining({
        body: {
          payout_account: expect.objectContaining({
            type: 'bank',
            provider: 'chapa',
            bank_slug: 'cbe',
            account_number: '10000000',
            holder_name: 'Abebe M',
          }),
        },
      }),
    );
  });

  it('rejects a missing destination, blank holder, or short number without a request', async () => {
    await expect(payoutService.addMethod({ bankSlug: '', type: 'bank', holderName: 'Abebe', accountNumber: '0911223344' })).rejects.toThrow();
    await expect(payoutService.addMethod({ bankSlug: 'link', type: 'store_value', holderName: ' ', accountNumber: '0911223344' })).rejects.toThrow();
    await expect(payoutService.addMethod({ bankSlug: 'link', type: 'store_value', holderName: 'Abebe', accountNumber: '12' })).rejects.toThrow();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
