import { describe, it, expect } from 'vitest';
import { orderModule } from '@/lib/order';

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
