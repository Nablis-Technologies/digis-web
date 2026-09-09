import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { orderModule, findGuestReturnCreds, guestReturnKey } from '@/lib/order';

class MemoryStorage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}

const session = new MemoryStorage();
const local = new MemoryStorage();

const writeCreds = (orderId: string, paymentId: string, eventId: string, phone: string) => {
  for (const store of [session, local]) {
    store.setItem(`digis:payment-id:${orderId}`, paymentId);
    store.setItem(`digis:payment-event:${orderId}`, eventId);
    store.setItem(`${guestReturnKey('quoteToken')}${orderId}`, `qt-${orderId}`);
    store.setItem(`${guestReturnKey('phone')}${orderId}`, phone);
  }
};

beforeEach(() => {
  session.clear();
  local.clear();
  Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: { localStorage: local }, configurable: true });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true });
  Object.defineProperty(globalThis, 'window', { configurable: true });
});

describe('findGuestReturnCreds correlation (BACKEND_GAPS #14 return flow)', () => {
  it('returns the creds for the payment being reconciled, not an arbitrary set', () => {
    writeCreds('order-a', 'pay-1', 'evt-1', '+251900000001');
    writeCreds('order-b', 'pay-2', 'evt-2', '+251900000002');
    // First key in storage is order-a, but the payment we reconcile is pay-2.
    const creds = findGuestReturnCreds('pay-2');
    expect(creds).toEqual({ quoteToken: 'qt-order-b', phone: '+251900000002', orderId: 'order-b' });
  });

  it('returns null when the payment id maps to no stored checkout', () => {
    writeCreds('order-a', 'pay-1', 'evt-1', '+251900000001');
    expect(findGuestReturnCreds('pay-unknown')).toBeNull();
  });

  it('prefers an event-correlated set when paymentId is unknown', () => {
    writeCreds('order-a', 'pay-1', 'evt-1', '+251900000001');
    writeCreds('order-b', 'pay-2', 'evt-2', '+251900000002');
    const creds = findGuestReturnCreds(undefined, 'evt-2');
    expect(creds).toEqual({ quoteToken: 'qt-order-b', phone: '+251900000002', orderId: 'order-b' });
  });

  it('falls back to the first set with no payment/event scope', () => {
    writeCreds('order-a', 'pay-1', 'evt-1', '+251900000001');
    writeCreds('order-b', 'pay-2', 'evt-2', '+251900000002');
    const creds = findGuestReturnCreds();
    expect(creds?.orderId).toBe('order-a');
  });

  it('reads creds persisted in localStorage when sessionStorage is empty', () => {
    writeCreds('order-a', 'pay-1', 'evt-1', '+251900000001');
    session.clear();
    const creds = findGuestReturnCreds('pay-1');
    expect(creds?.orderId).toBe('order-a');
  });
});

describe('orderModule.quote', () => {
  it('computes subtotal as unit cents × quantity', async () => {
    const q = await orderModule.quote({
      eventId: 'evt-1',
      items: [{ eventProductId: 'ticket:VIP', quantity: 2, unitPriceMinor: 150000 }],
      chargeCurrency: 'ETB',
    });
    expect(q.subtotal_minor).toBe(300000);
    expect(q.items[0].subtotal_minor).toBe(300000);
    expect(q.items[0].unit_amount_minor).toBe(150000);
  });

  it('adds the buyer fee on top (5% mock, integer cents)', async () => {
    const q = await orderModule.quote({
      eventId: 'evt-1',
      items: [{ eventProductId: 'ticket:VIP', quantity: 1, unitPriceMinor: 100000 }],
      chargeCurrency: 'ETB',
    });
    expect(q.buyer_fee_total).toBe(5000); // 5% of 100000
    expect(q.total_minor).toBe(105000);
  });

  it('totals multiple lines', async () => {
    const q = await orderModule.quote({
      eventId: 'evt-1',
      items: [
        { eventProductId: 'ticket:GA', quantity: 2, unitPriceMinor: 60000 },
        { eventProductId: 'av-parking', quantity: 1, unitPriceMinor: 25000 },
      ],
      chargeCurrency: 'ETB',
    });
    expect(q.subtotal_minor).toBe(145000); // 120000 + 25000
  });

  it('returns a quote_token and expiry', async () => {
    const q = await orderModule.quote({
      eventId: 'evt-1',
      items: [{ eventProductId: 'ticket:GA', quantity: 1, unitPriceMinor: 10000 }],
      chargeCurrency: 'ETB',
    });
    expect(q.quote_token).toMatch(/^mock_quote_/);
    expect(new Date(q.expires_at).getTime()).toBeGreaterThan(Date.now());
  });
});
