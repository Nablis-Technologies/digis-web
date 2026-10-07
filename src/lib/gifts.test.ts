import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { giftService, type ResolvedGiftView, type GiftPurchaseStatus } from '@/lib/gifts';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

const sampleResolvedGift: ResolvedGiftView = {
  gift: {
    id: 'gift-101',
    status: 'ready',
    expires_at: '2026-12-31T23:59:59Z',
    note: 'Happy Birthday! Have fun tonight!',
  },
  event: {
    id: 'evt-1',
    slug: 'habesha-nights',
    title: 'Habesha Nights',
  },
  product: {
    id: 'prod-vip',
    name: 'VIP Experience',
    description: 'VIP front stage access',
    admissions_per_unit: 1,
  },
  forms: [],
  consents: [],
  ticket: null,
};

describe('giftService.resolveGift', () => {
  it('posts gift token and returns full resolved view', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: sampleResolvedGift } as any);

    const result = await giftService.resolveGift('gift-101', 'token-abc');

    expect(mockedApiFetch).toHaveBeenCalledWith('public/gift_purchases/gift-101/resolve', {
      method: 'POST',
      body: { gift: { token: 'token-abc' } },
    });
    expect(result.gift.id).toBe('gift-101');
    expect(result.gift.note).toBe('Happy Birthday! Have fun tonight!');
    expect(result.event.title).toBe('Habesha Nights');
  });
});

describe('giftService.claimGift', () => {
  it('posts claim payload with token, answers, and consents and returns claimed view with ticket', async () => {
    const claimedView: ResolvedGiftView = {
      ...sampleResolvedGift,
      gift: { ...sampleResolvedGift.gift, status: 'claimed' },
      ticket: {
        id: 'tk-claimed-1',
        status: 'active',
        event_id: 'evt-1',
        event_title: 'Habesha Nights',
        product_id: 'prod-vip',
        product_name: 'VIP Experience',
        credential_status: 'active',
        qr_token: 'qr-sample-token',
        lookup_code: 'HN-9988',
      },
    };

    mockedApiFetch.mockResolvedValueOnce({ data: claimedView } as any);

    const result = await giftService.claimGift('gift-101', {
      token: 'token-abc',
      answers: [{ question_key: 'tshirt_size', value: 'L' }],
      consents: [{ consent_document_version_id: 'cdv-1', content_sha256: 'sha-mock' }],
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('public/gift_purchases/gift-101/claim', {
      method: 'POST',
      body: {
        gift: {
          token: 'token-abc',
          answers: [{ question_key: 'tshirt_size', value: 'L' }],
          consents: [{ consent_document_version_id: 'cdv-1', content_sha256: 'sha-mock' }],
        },
      },
    });
    expect(result.gift.status).toBe('claimed');
    expect(result.ticket?.lookup_code).toBe('HN-9988');
  });
});

describe('giftService buyer endpoints', () => {
  it('fetchOrderGifts returns list of gifts for an order', async () => {
    const statuses: GiftPurchaseStatus[] = [
      {
        id: 'gift-101',
        status: 'ready',
        expires_at: '2026-12-31T23:59:59Z',
        delivery_status: 'sent',
        delivered_at: '2026-10-05T10:00:00Z',
        claimed_at: null,
      },
    ];

    mockedApiFetch.mockResolvedValueOnce({ data: statuses } as any);

    const res = await giftService.fetchOrderGifts('order-555');
    expect(mockedApiFetch).toHaveBeenCalledWith('orders/order-555/gift_purchases');
    expect(res).toEqual(statuses);
  });

  it('resendGift posts to resend endpoint', async () => {
    const updatedStatus: GiftPurchaseStatus = {
      id: 'gift-101',
      status: 'ready',
      expires_at: '2026-12-31T23:59:59Z',
      delivery_status: 'sent',
      delivered_at: '2026-10-07T12:00:00Z',
      claimed_at: null,
    };

    mockedApiFetch.mockResolvedValueOnce({ data: updatedStatus } as any);

    const res = await giftService.resendGift('order-555', 'gift-101');
    expect(mockedApiFetch).toHaveBeenCalledWith('orders/order-555/gift_purchases/gift-101/resend', {
      method: 'POST',
    });
    expect(res.delivered_at).toBe('2026-10-07T12:00:00Z');
  });
});
