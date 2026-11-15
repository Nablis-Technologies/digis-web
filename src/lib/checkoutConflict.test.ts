import { describe, it, expect } from 'vitest';
import { readActiveCheckout } from './checkoutConflict';

describe('readActiveCheckout (#58 resolved 2026-10-16)', () => {
  it('parses the backend meta.active_checkout recovery payload', () => {
    const recovery = readActiveCheckout({
      active_checkout: {
        order_id: 'ord-1',
        expires_at: '2026-10-16T12:00:00.000Z',
        payment: { id: 'pay-1', status: 'processing', checkout_url: 'https://checkout.chapa.co/x' },
        order_access_token: 'tok',
      },
    });
    expect(recovery).toEqual({
      orderId: 'ord-1',
      expiresAt: '2026-10-16T12:00:00.000Z',
      payment: { id: 'pay-1', status: 'processing', checkoutUrl: 'https://checkout.chapa.co/x' },
    });
  });

  it('returns null when the backend could not authorize a recovery', () => {
    expect(readActiveCheckout(undefined)).toBeNull();
    expect(readActiveCheckout({})).toBeNull();
    expect(readActiveCheckout({ active_checkout: {} })).toBeNull();
  });

  it('keeps a recovery without a payment attempt (no resume, honest degrade)', () => {
    const recovery = readActiveCheckout({ active_checkout: { order_id: 'ord-2', expires_at: null } });
    expect(recovery).toEqual({ orderId: 'ord-2', expiresAt: null });
    expect(recovery?.payment).toBeUndefined();
  });
});
