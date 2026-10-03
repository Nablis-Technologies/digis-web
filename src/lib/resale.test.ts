import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { resaleModule, mapPublicListing } from '@/lib/resale';
import type { PublicResaleListingWire } from '@/types/resale';
import type { UserTicket } from '@/types/ticket';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

function browseWire(overrides: Partial<PublicResaleListingWire> = {}): PublicResaleListingWire {
  return {
    id: 'rl-1',
    status: 'active',
    asking_amount_minor: 420000,
    currency: 'ETB',
    resale_cutoff_at: null,
    fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: 800, currency: 'ETB' },
    event: { id: 'e-1', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
    product: { id: 'p-1', name: 'General Admission', type: 'ticket' },
    ticket_type: { id: 't-1', name: 'General Admission', admissions_per_unit: 1, entry_validation_mode: 'qr' },
    event_dates: [
      {
        id: 'ed-1',
        name: 'Main night',
        starts_at: '2026-09-20T18:00:00.000Z',
        ends_at: '2026-09-20T23:00:00.000Z',
        status: 'scheduled',
        venue: { id: 'v-1', name: 'Millennium Hall', city: 'Addis Ababa' },
      },
    ],
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function sellerWire(overrides = {}) {
  return {
    id: 'rl-new',
    event_id: 'e-1',
    ticket_type_id: 't-1',
    seller_user_id: 'seller-uuid',
    status: 'active',
    asking_amount_minor: 250000,
    currency: 'ETB',
    seller_acquisition_product_value_minor: 200000,
    resale_cutoff_at: null,
    fee_terms: { calculation_type: 'percentage', refund_policy: 'non_refundable', rate_bps: 800, currency: 'ETB' },
    created_at: '2026-09-06T10:00:00.000Z',
    updated_at: '2026-09-06T10:00:00.000Z',
    ...overrides,
  };
}

function walletWire() {
  return {
    id: 'tk-1',
    status: 'active',
    unit_number: 1,
    admissions_per_unit_snapshot: 1,
    credential_mode: 'group',
    event: { id: 'e-1', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
    product: { id: 'p-1', name: 'General Admission', type: 'ticket' },
    ticket_type: { id: 't-1', admissions_per_unit: 1, entry_validation_mode: 'qr' },
    event_dates: [],
    admission_slots: [],
    credentials: [],
  };
}

beforeEach(() => {
  // No usable localStorage under the node test env — the module falls back to
  // an in-memory store; prune([]) clears it between cases.
  resaleModule.pruneListingTickets([]);
  mockedApiFetch.mockReset();
  mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
    if (path === 'resale_listings') return { data: [browseWire(), browseWire({ id: 'rl-2', event: { id: 'e-9', slug: 'ghost-event', title: 'Ghost Event', timezone: 'Africa/Addis_Ababa', currency: 'ETB' } })] };
    if (path === 'resale_listings/rl-1') {
      return {
        data: {
          ...browseWire(),
          seller_user_id: 'seller-uuid',
          seller_acquisition_product_value_minor: 350000,
        },
      };
    }
    if (path === 'resale_listings/rl-new') {
      return {
        data: {
          ...browseWire({ id: 'rl-new' }),
          seller_user_id: 'seller-uuid',
          seller_acquisition_product_value_minor: 200000,
        },
      };
    }
    if (path === 'tickets/tk-1/resale' && opts?.method === 'POST') return { data: sellerWire() };
    if (path === 'tickets') return { data: [walletWire()] };
    // Backend event cover for the enrichment leg (sparse shape is enough —
    // the adapter is null-safe). Unknown slugs resolve to no cover.
    if (path === 'public/events/on-on') {
      return { data: { id: 'e-1', slug: 'on-on', event_media: [{ type: 'cover', file: { medium: 'https://cdn/on-on-cover.jpg' } }] } };
    }
    return { data: null };
  }) as typeof apiFetch);
});

describe('resaleModule reads (live API, mocked HTTP)', () => {
  it('fetchListings calls GET resale_listings and maps the nested wire', async () => {
    const listings = await resaleModule.fetchListings();
    expect(mockedApiFetch).toHaveBeenCalledWith('resale_listings');
    expect(listings).toHaveLength(2);
    const l = listings[0];
    expect(l.eventName).toBe('On & On');
    expect(l.eventDate).toBe('September 20, 2026');
    expect(l.venue).toBe('Millennium Hall, Addis Ababa');
    expect(l.city).toBe('Addis Ababa');
    expect(l.ticketType).toBe('General Admission');
    expect(l.askingPriceMinor).toBe(420000);
    expect(l.currency).toBe('ETB');
    expect(l.originalPriceMinor).toBeUndefined();
    expect(l.image).toBe('https://cdn/on-on-cover.jpg');
    expect(l.listedAgo).not.toBe('');
  });

  it('fetchListings leaves the image absent when no cover resolves', async () => {
    const listings = await resaleModule.fetchListings();
    expect(listings[1].image).toBeUndefined();
  });

  it('mapper tolerates missing event dates and venue', () => {
    const l = mapPublicListing(browseWire({ event_dates: [] }), 'img');
    expect(l.eventDate).toBe('');
    expect(l.eventTime).toBe('');
    expect(l.venue).toBe('');
    expect(l.image).toBe('img');
  });

  it('mapper falls back to the product name without a ticket type', () => {
    const l = mapPublicListing(browseWire({ ticket_type: null }), 'img');
    expect(l.ticketType).toBe('General Admission');
  });

  it('fetchMyListings returns the rows the mine endpoint reports as owned', async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/mine') return { data: [sellerWire({ id: 'rl-1' }), sellerWire({ id: 'rl-2' })] };
      if (path === 'resale_listings') return { data: [browseWire(), browseWire({ id: 'rl-2' })] };
      return { data: null };
    }) as typeof apiFetch);
    const mine = await resaleModule.fetchMyListings();
    expect(mockedApiFetch).toHaveBeenCalledWith('resale_listings/mine');
    expect(mine.map((l) => l.id).sort()).toEqual(['rl-1', 'rl-2']);
  });

  it('fetchMyListings is empty when mine reports no rows (no browse join)', async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/mine') return { data: [] };
      return { data: null };
    }) as typeof apiFetch);
    expect(await resaleModule.fetchMyListings()).toEqual([]);
    // No browse fetch when there's nothing owned.
    expect(mockedApiFetch).not.toHaveBeenCalledWith('resale_listings');
  });

  it('fetchMyListings matches owned ids against browse rows only', async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/mine') return { data: [sellerWire({ id: 'rl-owned' })] };
      if (path === 'resale_listings') return { data: [browseWire()] };
      return { data: null };
    }) as typeof apiFetch);
    const mine = await resaleModule.fetchMyListings();
    expect(mine).toEqual([]);
  });

  it('fetchListingDetail maps the seller acquisition value when present', async () => {
    const l = await resaleModule.fetchListingDetail('rl-1');
    expect(mockedApiFetch).toHaveBeenCalledWith('resale_listings/rl-1');
    expect(l.originalPriceMinor).toBe(350000);
  });

  it('fetchListingDetail handles the flat seller wire (own listing) without throwing', async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/rl-flat') return { data: sellerWire({ id: 'rl-flat' }) };
      if (path === 'resale_listings') return { data: [browseWire({ id: 'rl-flat' })] };
      if (path === 'public/events/on-on') return { data: { id: 'e-1', slug: 'on-on', event_media: [{ type: 'cover', file: { medium: 'https://cdn/on-on-cover.jpg' } }] } };
      return { data: null };
    }) as typeof apiFetch);
    const l = await resaleModule.fetchListingDetail('rl-flat');
    expect(l.id).toBe('rl-flat');
    // Seller economics come from the flat wire…
    expect(l.askingPriceMinor).toBe(250000);
    expect(l.originalPriceMinor).toBe(200000);
    // …display context is borrowed from the browse row.
    expect(l.eventName).toBe('On & On');
    expect(l.image).toBe('https://cdn/on-on-cover.jpg');
  });

  it('fetchListingDetail stays absent (no invention) when a flat listing is not browsable', async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/rl-flat') return { data: sellerWire({ id: 'rl-flat' }) };
      if (path === 'resale_listings') return { data: [] };
      return { data: null };
    }) as typeof apiFetch);
    const l = await resaleModule.fetchListingDetail('rl-flat');
    expect(l.id).toBe('rl-flat');
    expect(l.eventName).toBe('');
    expect(l.image).toBe('');
  });
});

describe('resaleModule.createListing (live API, mocked HTTP)', () => {
  const ticket = {
    id: 'tk-1', eventName: 'On & On', eventDate: 'September 20, 2026', eventTime: '9:00 PM',
    venue: 'Millennium Hall', ticketType: 'General Admission', qrCode: 'QR', purchased: 'now', status: 'active',
  } as unknown as UserTicket;

  it('posts the asking amount, then enriches display from the detail endpoint', async () => {
    const listing = await resaleModule.createListing(ticket, 250000);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'tickets/tk-1/resale',
      expect.objectContaining({ method: 'POST', body: { resale_listing: { asking_amount_minor: 250000 } } }),
    );
    // Enrichment leg: the create response is flat, so display comes from
    // GET resale_listings/:id (spec decision 3 — never assumed nested fields).
    expect(mockedApiFetch).toHaveBeenCalledWith('resale_listings/rl-new');
    expect(listing.id).toBe('rl-new');
    expect(listing.status).toBe('active');
    expect(listing.eventName).toBe('On & On');
    expect(listing.askingPriceMinor).toBe(420000);
    expect(listing.originalPriceMinor).toBe(200000);
    expect(listing.fee_terms.rate_bps).toBe(800);
  });

  it('createListing enriches via the detail endpoint and remembers the ticket pair', async () => {
    mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
      if (path === 'tickets/tk-1/resale' && opts?.method === 'POST') return { data: sellerWire({ id: 'rl-1' }) };
      if (path === 'resale_listings/rl-1') return { data: { ...browseWire({ id: 'rl-1' }), seller_acquisition_product_value_minor: 200000 } };
      return { data: null };
    }) as typeof apiFetch);
    const listing = await resaleModule.createListing(ticket, 250000);
    expect(listing.id).toBe('rl-1');
    // Ownership is the backend's answer (GET /mine); the create response is the
    // only place the listing→ticket link exists, so it's cached for the picker
    // (BACKEND_GAPS #66).
    expect(resaleModule.listedTicketIds(['rl-1']).has('tk-1')).toBe(true);
  });

  it('rejects inactive tickets without a request', async () => {
    await expect(resaleModule.createListing({ ...ticket, status: 'transferred' }, 250000)).rejects.toThrow();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('rejects non-positive amounts without a request', async () => {
    await expect(resaleModule.createListing(ticket, 0)).rejects.toThrow();
    await expect(resaleModule.createListing(ticket, 12.5)).rejects.toThrow();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('createTicketListingReference resolves the wallet ticket then creates', async () => {
    const ref = await resaleModule.createTicketListingReference('tk-1', 2500);
    expect(ref).toEqual({ ok: true, listingId: 'rl-new' });
  });

  it('createTicketListingReference throws for unknown wallet ids', async () => {
    await expect(resaleModule.createTicketListingReference('tk-nope', 2500)).rejects.toThrow('Ticket not found');
  });

  it('createListing still succeeds when the enrichment read fails (listing exists either way)', async () => {
    mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
      if (path === 'tickets/tk-1/resale' && opts?.method === 'POST') return { data: sellerWire({ id: 'rl-new' }) };
      if (path === 'resale_listings/rl-new') throw new Error('boom');
      if (path === 'resale_listings') throw new Error('boom');
      return { data: null };
    }) as typeof apiFetch);
    const listing = await resaleModule.createListing(ticket, 250000);
    expect(listing.id).toBe('rl-new');
    expect(listing.askingPriceMinor).toBe(250000);
    expect(listing.ticket).toBe(ticket);
  });
});

describe('resaleModule.cancelListing (live API, mocked HTTP)', () => {
  it('posts the reason and maps the cancelled seller record', async () => {
    mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
      if (path === 'resale_listings/rl-1/cancel' && opts?.method === 'POST') {
        return { data: sellerWire({ id: 'rl-1', status: 'cancelled' }) };
      }
      return { data: null };
    }) as typeof apiFetch);
    const cancelled = await resaleModule.cancelListing('rl-1');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'resale_listings/rl-1/cancel',
      expect.objectContaining({ method: 'POST', body: { resale_listing: { reason: 'seller_requested' } } }),
    );
    expect(cancelled.id).toBe('rl-1');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.originalPriceMinor).toBe(200000);
  });
});

describe('resaleModule.purchaseListing (live API, mocked HTTP)', () => {
  const pendingOrder = {
    id: 'order-1',
    event_id: 'e-1',
    status: 'pending_payment',
    sales_channel: 'resale',
    charge_currency: 'ETB',
    subtotal_minor: 420000,
    discount_minor: 0,
    subsidy_minor: 0,
    fee_minor: 0,
    tax_minor: 0,
    adjustment_minor: 0,
    total_minor: 420000,
    expires_at: '2026-09-06T10:10:00.000Z',
    paid_at: null,
    created_at: '2026-09-06T10:00:00.000Z',
    updated_at: '2026-09-06T10:00:00.000Z',
    items: [],
    adjustments: [],
  };

  it('posts an empty purchase body and returns the pending order passthrough', async () => {
    mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
      if (path === 'resale_listings/rl-1/purchase' && opts?.method === 'POST') return { data: pendingOrder };
      return { data: null };
    }) as typeof apiFetch);
    const order = await resaleModule.purchaseListing('rl-1');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'resale_listings/rl-1/purchase',
      expect.objectContaining({ method: 'POST', body: { purchase: {} } }),
    );
    expect(order.id).toBe('order-1');
    expect(order.status).toBe('pending_payment');
    expect(order.sales_channel).toBe('resale');
    expect(order.total_minor).toBe(420000);
  });
});

describe('resaleModule listing→ticket cache (BACKEND_GAPS #66)', () => {
  it('hides a ticket only while its listing is active', () => {
    resaleModule.rememberListingTicket('rl-1', 'tk-1');
    resaleModule.rememberListingTicket('rl-2', 'tk-2');
    expect(resaleModule.listedTicketIds(['rl-1', 'rl-2'])).toEqual(new Set(['tk-1', 'tk-2']));
    // A listing that is no longer active stops hiding its ticket.
    expect(resaleModule.listedTicketIds(['rl-1'])).toEqual(new Set(['tk-1']));
    expect(resaleModule.listedTicketIds([])).toEqual(new Set());
  });

  it('forgetListingTicket drops the pair on cancel', async () => {
    resaleModule.rememberListingTicket('rl-1', 'tk-1');
    mockedApiFetch.mockImplementation((async (path: string, opts?: { method?: string }) => {
      if (path === 'resale_listings/rl-1/cancel' && opts?.method === 'POST') {
        return { data: sellerWire({ id: 'rl-1', status: 'cancelled' }) };
      }
      return { data: null };
    }) as typeof apiFetch);
    await resaleModule.cancelListing('rl-1');
    expect(resaleModule.listedTicketIds(['rl-1'])).toEqual(new Set());
  });

  it('fetchMyListings prunes pairs whose listing is no longer active', async () => {
    resaleModule.rememberListingTicket('rl-1', 'tk-1');
    resaleModule.rememberListingTicket('rl-stale', 'tk-stale');
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === 'resale_listings/mine') return { data: [sellerWire({ id: 'rl-1' })] };
      if (path === 'resale_listings') return { data: [browseWire({ id: 'rl-1' })] };
      return { data: null };
    }) as typeof apiFetch);
    await resaleModule.fetchMyListings();
    // The stale pair is removed from storage, not just from this read.
    expect(resaleModule.listedTicketIds(['rl-stale'])).toEqual(new Set());
    expect(resaleModule.listedTicketIds(['rl-1'])).toEqual(new Set(['tk-1']));
  });
});

