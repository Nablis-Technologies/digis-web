import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { admissionModule } from '@/lib/admission';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  randomUuid: () => '00000000-0000-4000-8000-000000000000',
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('admissionModule.create (composable admission selection)', () => {
  it('POSTs the selection with the Idempotency-Key and maps the outcome', async () => {
    mockedApiFetch.mockResolvedValue({
      data: {
        order: { id: 'order-1', status: 'pending_payment', charge_currency: 'ETB', total_minor: 60000, expires_at: '2026-09-30T12:10:00Z' },
        registrations: [{ id: 'reg-1', status: 'pending_payment', next_action: 'requires_order' }],
        next_action: { type: 'checkout_required', order_id: 'order-1', amount_minor: 60000 },
        guest_order_token: 'got-1',
      },
    } as never);

    const result = await admissionModule.create(
      'on-on',
      { items: [{ eventProductId: 'prod-1', quantity: 1, answers: [], consents: [] }] },
      'checkout-key-1',
    );

    expect(mockedApiFetch).toHaveBeenCalledWith(
      'public/events/on-on/admission_selections',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Idempotency-Key': 'checkout-key-1' },
      }),
    );
    expect(result.order).toEqual({
      id: 'order-1',
      status: 'pending_payment',
      chargeCurrency: 'ETB',
      totalMinor: 60000,
      expiresAt: '2026-09-30T12:10:00Z',
    });
    expect(result.registrations).toEqual([
      { id: 'reg-1', status: 'pending_payment', nextAction: 'requires_order' },
    ]);
    expect(result.nextAction).toEqual({ type: 'checkout_required', orderId: 'order-1', amountMinor: 60000 });
    expect(result.guestOrderToken).toBe('got-1');
  });

  it('carries the guest phone proof and audience proof in the envelope', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { next_action: { type: 'confirmed' }, registrations: [] },
    } as never);

    await admissionModule.create('on-on', {
      chargeCurrency: 'ETB',
      phone: '+251900123456',
      phoneConfirmation: true,
      verificationToken: 'vt-1',
      items: [
        {
          eventProductId: 'prod-1',
          quantity: 1,
          accessCode: 'code-1',
          answers: [{ formVersionId: 'fver-1', questionKey: 'q1', value: 'A' }],
          consents: [],
        },
      ],
    });

    const call = mockedApiFetch.mock.calls.find(([path]) => path === 'public/events/on-on/admission_selections');
    const body = (call?.[1] as { body?: { admission_selection?: Record<string, unknown> } })?.body;
    const selection = body?.admission_selection;
    expect(selection).toMatchObject({
      charge_currency: 'ETB',
      phone: '+251900123456',
      phone_confirmation: true,
      verification_token: 'vt-1',
    });
    expect(selection?.items).toEqual([
      expect.objectContaining({
        event_product_id: 'prod-1',
        quantity: 1,
        audience_proof: { access_code: 'code-1' },
        answers: [{ form_version_id: 'fver-1', question_key: 'q1', value: 'A' }],
        consents: [],
      }),
    ]);
  });

  it('wires mixed ticket and add-on products with date-scoping and clean add-on payload', async () => {
    mockedApiFetch.mockResolvedValue({
      data: {
        order: { id: 'order-mixed', status: 'pending_payment', charge_currency: 'ETB', total_minor: 12500, expires_at: '2026-10-08T12:00:00Z' },
        registrations: [{ id: 'reg-tk-1', status: 'pending_payment', next_action: 'requires_order' }],
        next_action: { type: 'checkout_required', order_id: 'order-mixed', amount_minor: 12500 },
      },
    } as never);

    await admissionModule.create('on-on', {
      chargeCurrency: 'ETB',
      items: [
        {
          eventProductId: 'prod-ticket-1',
          quantity: 1,
          selectedEventDateId: 'ed-1',
          answers: [],
          consents: [],
        },
        {
          eventProductId: 'prod-merch-1',
          quantity: 2,
          eventDateIds: ['ed-1'],
        },
      ],
    });

    const call = mockedApiFetch.mock.calls.find(([path]) => path === 'public/events/on-on/admission_selections');
    const body = (call?.[1] as { body?: { admission_selection?: { items: Array<Record<string, unknown>> } } })?.body;
    const items = body?.admission_selection?.items;
    expect(items).toHaveLength(2);
    expect(items?.[0]).toEqual({
      event_product_id: 'prod-ticket-1',
      quantity: 1,
      selected_event_date_id: 'ed-1',
      answers: [],
      consents: [],
    });
    expect(items?.[1]).toEqual({
      event_product_id: 'prod-merch-1',
      quantity: 2,
      event_date_ids: ['ed-1'],
    });
  });
});

describe('admissionModule.requestOtp (guest $0 preflight)', () => {
  it('POSTs the envelope and returns the phone-verification challenge', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { challenge_id: 'ch-1', status: 'pending', expires_at: '2026-09-30T12:10:00Z' },
    } as never);

    const challenge = await admissionModule.requestOtp('on-on', {
      items: [{ eventProductId: 'prod-1', quantity: 1, answers: [], consents: [] }],
      phone: '+251900123456',
    });

    expect(mockedApiFetch).toHaveBeenCalledWith(
      'public/events/on-on/admission_selections/request_otp',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(challenge).toEqual({ challengeId: 'ch-1', status: 'pending', expiresAt: '2026-09-30T12:10:00Z' });
  });
});
