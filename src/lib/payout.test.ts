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
    type: 'mobile_money',
    provider: 'chapa',
    status: 'verified',
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
      data: [accountWire(), accountWire({ id: 'pa-2', type: 'bank', provider: 'chapa', status: 'pending_verification', verified_at: null })],
    } as never);
    const methods = await payoutService.fetchMethods();
    expect(mockedApiFetch).toHaveBeenCalledWith('marketplace/seller/payout_accounts');
    expect(methods).toHaveLength(2);
    expect(methods[0]).toMatchObject({ id: 'pa-1', displayName: 'Telebirr', status: 'verified' });
    expect(methods[1]).toMatchObject({ id: 'pa-2', displayName: 'Bank account', status: 'pending_verification' });
    // Identifiers are never serialized — nothing to leak into the rows.
    expect(methods[0]).not.toHaveProperty('accountNumber');
    expect(methods[0]).not.toHaveProperty('holderName');
  });

  it('mapPayoutAccount drops unknown statuses instead of inventing them', () => {
    const m = mapPayoutAccount(accountWire({ provider: 'mystery', type: 'weird', status: 'odd' }));
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
  it('posts telebirr on the mobile_money rail under the chapa provider', async () => {
    mockedApiFetch.mockResolvedValue({ data: accountWire() } as never);
    const method = await payoutService.addMethod({ kind: 'telebirr', holderName: 'Abebe M', accountNumber: '09 11 22 33 44' });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'marketplace/seller/payout_accounts',
      expect.objectContaining({
        method: 'POST',
        body: {
          payout_account: {
            type: 'mobile_money',
            provider: 'chapa',
            holder_name: 'Abebe M',
            account_details: { phone: '0911223344' },
          },
        },
      }),
    );
    expect(method.displayName).toBe('Telebirr');
  });

  it('posts banks on the bank rail under the chapa provider', async () => {
    mockedApiFetch.mockResolvedValue({ data: accountWire({ type: 'bank', provider: 'chapa' }) } as never);
    await payoutService.addMethod({ kind: 'cbe', holderName: 'Abebe M', accountNumber: '1000 0000' });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'marketplace/seller/payout_accounts',
      expect.objectContaining({
        body: {
          payout_account: expect.objectContaining({
            type: 'bank',
            provider: 'chapa',
            account_details: { account_number: '10000000', bank: 'cbe' },
          }),
        },
      }),
    );
  });

  it('rejects blank holder and short numbers without a request', async () => {
    await expect(payoutService.addMethod({ kind: 'telebirr', holderName: ' ', accountNumber: '0911223344' })).rejects.toThrow();
    await expect(payoutService.addMethod({ kind: 'telebirr', holderName: 'Abebe', accountNumber: '12' })).rejects.toThrow();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
