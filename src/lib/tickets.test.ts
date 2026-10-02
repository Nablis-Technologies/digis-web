import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapWalletTicket, ticketsService, ticketStatusMeta, type TicketWalletWire } from '@/lib/tickets';
import { apiFetch } from '@/lib/api';
import { getEventImage } from '@/lib/utils/eventImages';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/utils/eventImages', () => ({ getEventImage: vi.fn(() => '') }));

const mockedApiFetch = vi.mocked(apiFetch);

function wire(tt: TicketWalletWire['ticket_type']): TicketWalletWire {
  return {
    id: 'tk-1',
    status: 'active',
    unit_number: 1,
    admissions_per_unit_snapshot: 1,
    credential_mode: 'group',
    event: { id: 'e-1', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
    product: { id: 'p-1', name: 'Early Bird', type: 'ticket' },
    ticket_type: tt,
    event_dates: [{ id: 'ed-1', name: null, starts_at: '2026-09-20T18:00:00.000Z', ends_at: null, status: 'scheduled', venue: null }],
    admission_slots: [],
    credentials: [{ id: 'c-1', admission_slot_id: null, entry_limit: null, status: 'issued', issued_at: '2026-09-08T10:00:00.000Z', lookup_code: null, qr_token: 'QR' }],
  };
}

describe('mapWalletTicket — guest payment-refresh projection (GuestPaymentTicketSerializer, merged 2026-09-10)', () => {
  it('maps registration_id + signed view link when present, omits them otherwise', () => {
    const guest = wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' });
    guest.registration_id = 'reg-9';
    guest.ticket_view_token = 'vt-9';
    guest.ticket_view_url = 'http://localhost:3000/t/abc';
    guest.short_url = 'https://dig.is/abc';
    const t = mapWalletTicket(guest);
    expect(t.registrationId).toBe('reg-9');
    expect(t.ticketViewToken).toBe('vt-9');
    expect(t.ticketViewUrl).toBe('http://localhost:3000/t/abc');
    expect(t.shortUrl).toBe('https://dig.is/abc');

    const plain = mapWalletTicket(wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' }));
    expect(plain.registrationId).toBeUndefined();
    expect(plain.ticketViewUrl).toBeUndefined();
  });
});

describe('mapWalletTicket — purchased extras projection (#29)', () => {
  it('maps add_ons onto the ticket as SelectedEventProduct[]', () => {
    const w = wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' });
    w.add_ons = [
      { id: 'oi-1', name: 'Event tee', type: 'merchandise', quantity: 2, unit_amount_minor: 80000 },
      { id: 'oi-2', name: 'Reserved parking', type: 'parking', quantity: 1, unit_amount_minor: 30000 },
    ];
    const t = mapWalletTicket(w);
    expect(t.addOns).toEqual([
      { productId: 'oi-1', type: 'merchandise', name: 'Event tee', unitPrice: 80000, quantity: 2 },
      { productId: 'oi-2', type: 'parking', name: 'Reserved parking', unitPrice: 30000, quantity: 1 },
    ]);
  });

  it('omits addOns when the wire has none', () => {
    const t = mapWalletTicket(wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' }));
    expect(t.addOns).toBeUndefined();
  });
});

describe('mapWalletTicket — event slug projection (extras lookup)', () => {
  it('maps the wire event slug onto the ticket so its extras can be fetched', () => {
    const t = mapWalletTicket(wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' }));
    expect(t.eventId).toBe('e-1');
    expect(t.eventSlug).toBe('on-on');
  });
});

describe('mapWalletTicket — resale policy projection (#25)', () => {
  it('maps the full resale-policy fields onto the ticket', () => {
    const t = mapWalletTicket(wire({
      id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr',
      resale_enabled: true,
      resale_price_cap_type: 'fixed',
      resale_fixed_cap_minor: 500000,
      resale_fixed_cap_currency: 'ETB',
      resale_percentage_cap_bps: null,
      resale_price_cap_minor: 500000,
      resale_cutoff_seconds_before_start: 7200,
      max_completed_resales: 1,
    }));
    expect(t.resalePolicy).toEqual({
      enabled: true,
      capType: 'fixed',
      priceCapMinor: 500000,
      fixedCapMinor: 500000,
      fixedCapCurrency: 'ETB',
      percentageCapBps: null,
      cutoffSecondsBeforeStart: 7200,
      maxCompletedResales: 1,
    });
    expect(t.eventStartsAt).toBe('2026-09-20T18:00:00.000Z');
  });

  it('maps the server-computed cap for a percentage policy (#42 resolved)', () => {
    const t = mapWalletTicket(wire({
      id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr',
      resale_enabled: true,
      resale_price_cap_type: 'percentage',
      resale_fixed_cap_minor: null,
      resale_fixed_cap_currency: null,
      resale_percentage_cap_bps: 10000,
      resale_price_cap_minor: 600000,
      resale_cutoff_seconds_before_start: 0,
      max_completed_resales: 1,
    }));
    expect(t.resalePolicy?.capType).toBe('percentage');
    expect(t.resalePolicy?.percentageCapBps).toBe(10000);
    expect(t.resalePolicy?.priceCapMinor).toBe(600000);
  });

  it('renders resalePolicy absent when the backend omits it (never assumed open)', () => {
    const t = mapWalletTicket(wire({ id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' }));
    expect(t.resalePolicy).toBeUndefined();
  });

  it('carries null cap fields as null, not fabricated zeros', () => {
    const t = mapWalletTicket(wire({
      id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr',
      resale_enabled: false,
      resale_price_cap_type: null,
      resale_fixed_cap_minor: null,
      resale_fixed_cap_currency: null,
      resale_percentage_cap_bps: null,
      resale_price_cap_minor: null,
    }));
    expect(t.resalePolicy?.enabled).toBe(false);
    expect(t.resalePolicy?.capType).toBeNull();
    expect(t.resalePolicy?.priceCapMinor).toBeNull();
    expect(t.resalePolicy?.fixedCapMinor).toBeNull();
    expect(t.resalePolicy?.percentageCapBps).toBeNull();
  });
});

describe('ticketStatusMeta — invalid tickets must not look valid', () => {
  it('flags non-active statuses with a badge label; active/absent stay normal', () => {
    expect(ticketStatusMeta('active')).toEqual({ inactive: false, label: null });
    expect(ticketStatusMeta(undefined)).toEqual({ inactive: false, label: null });
    expect(ticketStatusMeta('refunded')).toEqual({ inactive: true, label: 'Refunded' });
    expect(ticketStatusMeta('void')).toEqual({ inactive: true, label: 'Void' });
    expect(ticketStatusMeta('suspended')).toEqual({ inactive: true, label: 'Suspended' });
    expect(ticketStatusMeta('SUSPENDED')).toEqual({ inactive: true, label: 'Suspended' });
  });
});

describe('ticketsService.fetchUserTickets — wallet shows event tickets only', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('drops non-ticket product wires (parking passes) so they never render as a second card', async () => {
    const parkingWire: TicketWalletWire = {
      ...wire(null),
      id: 'tk-parking',
      product: { id: 'p-parking', name: 'Reserved parking', type: 'parking' },
      credentials: [{ id: 'c-p', admission_slot_id: null, entry_limit: null, status: 'active', issued_at: '2026-09-08T10:00:00.000Z', lookup_code: null, qr_token: 'PARK' }],
    };
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === 'tickets') return { data: [wire(null), parkingWire] };
      return { data: undefined };
    });

    const tickets = await ticketsService.fetchUserTickets();

    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe('tk-1');
    expect(tickets[0].ticketType).toBe('Early Bird');
    expect(mockedApiFetch).toHaveBeenCalledWith('tickets');
  });
});