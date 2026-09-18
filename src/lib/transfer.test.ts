import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { transferService, buildClaimLink } from '@/lib/transfer';
import { getEventImage } from '@/lib/utils/eventImages';
import type { TicketWalletWire } from '@/lib/tickets';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/utils/eventImages', () => ({ getEventImage: vi.fn(() => 'local-cover') }));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedGetEventImage = vi.mocked(getEventImage);

const transferWire = {
  id: 'tr-1',
  status: 'pending',
  expires_at: '2026-09-20T12:00:00.000Z',
  event: { id: 'ev-1', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
  ticket: { id: 'tk-1', status: 'active', unit_number: 1, product: { id: 'p-1', name: 'Regular', type: 'ticket' } },
  recipient: { phone: '+2519*********88', email_present: false },
};

const walletWire: TicketWalletWire = {
  id: 'tk-1',
  status: 'active',
  unit_number: 1,
  admissions_per_unit_snapshot: 1,
  credential_mode: 'group',
  event: { id: 'ev-1', slug: 'on-on', title: 'On & On', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
  product: { id: 'p-1', name: 'Regular', type: 'ticket' },
  ticket_type: null,
  event_dates: [
    { id: 'd-1', name: null, starts_at: '2026-09-30T17:00:00.000Z', ends_at: '2026-10-01T03:00:00.000Z', status: 'scheduled', venue: { id: 'v-1', name: 'Venue', city: 'Addis' } },
  ],
  admission_slots: [],
  credentials: [{ id: 'c-1', admission_slot_id: null, entry_limit: null, status: 'active', issued_at: '2026-09-09T12:00:00.000Z', lookup_code: null, qr_token: 'QR-1' }],
};

describe('transferService', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedGetEventImage.mockReset();
  });

  it('builds a claim link with the transfer id + secret token', () => {
    expect(buildClaimLink('tr-1', 's3cr3t')).toBe('/claim/tr-1?token=s3cr3t');
  });

  it('initiate posts to /tickets/:id/transfers with the phone and reason', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { transfer: { id: 'tr-1' }, token: 's3cr3t' },
    });
    const result = await transferService.initiate({ ticketId: 'tk-1', phone: '+251911223344', note: 'enjoy!' });
    expect(mockedApiFetch).toHaveBeenCalledWith('tickets/tk-1/transfers', {
      method: 'POST',
      body: { phone: '+251911223344', reason: 'enjoy!' },
    });
    expect(result).toEqual({ transferId: 'tr-1', token: 's3cr3t' });
  });

  it('initiate omits the reason when not provided', async () => {
    mockedApiFetch.mockResolvedValue({ data: { transfer: { id: 'tr-1' }, token: 't' } });
    await transferService.initiate({ ticketId: 'tk-1', phone: '+251911223344' });
    expect(mockedApiFetch).toHaveBeenCalledWith('tickets/tk-1/transfers', {
      method: 'POST',
      body: { phone: '+251911223344' },
    });
  });

  it('fetchPublic maps the landing wire and enriches the cover from the event detail', async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('public/ticket_transfers/')) {
        return { data: transferWire };
      }
      if (path === 'public/events/on-on') {
        return { data: { event_media: [{ type: 'cover', file: { medium: 'https://cdn/cover.jpg' } }] } };
      }
      return { data: undefined };
    });
    const result = await transferService.fetchPublic('tr-1', 's3cr3t');
    expect(result).toMatchObject({
      id: 'tr-1',
      status: 'pending',
      event: { slug: 'on-on', title: 'On & On' },
      ticket: { id: 'tk-1', unitNumber: 1, product: { name: 'Regular' } },
      recipient: { phone: '+2519*********88', emailPresent: false },
      image: 'https://cdn/cover.jpg',
    });
  });

  it('fetchPublic falls back to the local cover when the detail fetch fails', async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('public/ticket_transfers/')) return { data: transferWire };
      throw new Error('boom');
    });
    const result = await transferService.fetchPublic('tr-1', 's3cr3t');
    expect(result.image).toBe('local-cover');
    expect(mockedGetEventImage).toHaveBeenCalledWith('On & On');
  });

  it('requestOtp posts the phone and secret token', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { challenge_id: 'ch-1', expires_at: '2026-09-09T12:10:00.000Z' },
    });
    const result = await transferService.requestOtp('tr-1', 's3cr3t', '+251911223344');
    expect(mockedApiFetch).toHaveBeenCalledWith('public/ticket_transfers/tr-1/request_otp', {
      method: 'POST',
      body: { phone: '+251911223344', token: 's3cr3t' },
    });
    expect(result).toEqual({ challengeId: 'ch-1', expiresAt: '2026-09-09T12:10:00.000Z' });
  });

  it('verifyOtp trades the code for a verification token', async () => {
    mockedApiFetch.mockResolvedValue({ data: { verification_token: 'proof-1' } });
    const result = await transferService.verifyOtp('ch-1', '123456');
    expect(mockedApiFetch).toHaveBeenCalledWith('phone_verifications/ch-1/verify', {
      method: 'POST',
      body: { code: '123456' },
    });
    expect(result).toEqual({ verificationToken: 'proof-1' });
  });

  it('accept posts verification and maps the returned ticket into the wallet shape', async () => {
    mockedApiFetch.mockResolvedValue({
      data: {
        ticket: walletWire,
        ticket_view_url: 'https://digis.app/public/tickets/tk-1?view_token=v',
        user: null,
      },
    });
    const result = await transferService.accept({
      id: 'tr-1',
      token: 's3cr3t',
      phone: '+251911223344',
      verificationToken: 'proof-1',
    });
    expect(mockedApiFetch).toHaveBeenCalledWith('public/ticket_transfers/tr-1/accept_guest', {
      method: 'POST',
      body: {
        token: 's3cr3t',
        phone: '+251911223344',
        verification_token: 'proof-1',
      },
    });
    expect(result.ticket.id).toBe('tk-1');
    expect(result.ticket.qrCode).toBe('QR-1');
    expect(result.ticketViewUrl).toBe('https://digis.app/public/tickets/tk-1?view_token=v');
  });

  it('accept posts an optional password + confirmation to create an account', async () => {
    mockedApiFetch.mockResolvedValue({
      data: {
        ticket: walletWire,
        ticket_view_url: 'https://digis.app/public/tickets/tk-1?view_token=v',
        user: { id: 'u-1' },
        access_token: 'at',
        refresh_token: 'rt',
      },
    });
    const result = await transferService.accept({
      id: 'tr-1',
      token: 's3cr3t',
      phone: '+251911223344',
      verificationToken: 'proof-1',
      password: 'hunter2hunter2',
      passwordConfirmation: 'hunter2hunter2',
    });
    expect(mockedApiFetch).toHaveBeenCalledWith('public/ticket_transfers/tr-1/accept_guest', {
      method: 'POST',
      body: {
        token: 's3cr3t',
        phone: '+251911223344',
        verification_token: 'proof-1',
        password: 'hunter2hunter2',
        password_confirmation: 'hunter2hunter2',
      },
    });
    expect(result.user).toEqual({ id: 'u-1' });
    expect(result.accessToken).toBe('at');
  });
});