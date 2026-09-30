import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { fetchEventProducts, type BackendProduct } from '@/lib/products';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

const now = new Date();
const activeFrom = new Date(now.getTime() - 60_000).toISOString();
const activeTo = new Date(now.getTime() + 60_000).toISOString();

function ticket(overrides: Partial<BackendProduct> & { id: string; priceMinor: number }): BackendProduct {
  const { priceMinor, ...rest } = overrides;
  return {
    event_id: 'evt-1',
    name: overrides.id,
    type: 'ticket',
    price_options: [{ currency: 'ETB', amount_minor: priceMinor, active_from: activeFrom, active_to: activeTo }],
    available: true,
    ...rest,
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('fetchEventProducts — offers', () => {
  it('keeps a free tier and maps admissions_per_unit (default 1)', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        ticket({ id: 'free', priceMinor: 0 }),
        ticket({ id: 'pair', priceMinor: 200000, ticket_type: { id: 'tt-2', admissions_per_unit: 2 } }),
      ],
    } as never);

    const { tiers } = await fetchEventProducts('on-on');

    expect(tiers.map((t) => t.id)).toEqual(['free', 'pair']);
    expect(tiers[0].priceMinor).toBe(0);
    expect(tiers[0].admissionsPerUnit).toBe(1);
    expect(tiers[1].admissionsPerUnit).toBe(2);
  });

  it('maps the ticket-type gate fields (audience, approval, date, waitlist)', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        ticket({
          id: 'gated',
          priceMinor: 50000,
          ticket_type: {
            id: 'tt-1',
            audience: 'access_code',
            approval_mode: 'manual',
            date_selection: 'choose_one',
            waitlist_enabled: true,
          },
        }),
      ],
    } as never);

    const { tiers } = await fetchEventProducts('on-on');

    expect(tiers[0]).toMatchObject({
      audience: 'access_code',
      approvalMode: 'manual',
      dateSelection: 'choose_one',
      waitlistEnabled: true,
      minPerOrder: 1,
    });
  });

  it('drops a ticket with no active price and ranks the rest cheapest→emerald / priciest→gold', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        ticket({ id: 'mid', priceMinor: 100000 }),
        ticket({ id: 'expensive', priceMinor: 300000 }),
        { ...ticket({ id: 'inactive', priceMinor: 200000 }), price_options: [] },
        ticket({ id: 'cheap', priceMinor: 50000 }),
      ],
    } as never);

    const { tiers } = await fetchEventProducts('on-on');

    expect(tiers.map((t) => t.id)).toEqual(['cheap', 'mid', 'expensive']);
    expect(tiers[0].accent).toBe('emerald');
    expect(tiers[tiers.length - 1].accent).toBe('gold');
  });
});

describe('fetchEventProducts — extras', () => {
  it('keeps priced non-ticket products and drops free ones', async () => {
    mockedApiFetch.mockResolvedValue({
      data: [
        { id: 'parking', event_id: 'evt-1', name: 'Parking', type: 'parking', available: true, requires_ticket: true, price_options: [{ currency: 'ETB', amount_minor: 25000, active_from: activeFrom, active_to: activeTo }] },
        { id: 'free-swag', event_id: 'evt-1', name: 'Free swag', type: 'merchandise', available: true, price_options: [{ currency: 'ETB', amount_minor: 0, active_from: activeFrom, active_to: activeTo }] },
        ticket({ id: 'tier', priceMinor: 60000 }),
      ],
    } as never);

    const { tiers, extras } = await fetchEventProducts('on-on');

    expect(tiers.map((t) => t.id)).toEqual(['tier']);
    expect(extras.map((e) => e.id)).toEqual(['parking']);
    expect(extras[0].requiresTicket).toBe(true);
  });
});
