/**
 * Order intake module — mirrors digis_backend's order pipeline.
 *
 * The backend is the sole authority for ALL money math. It computes subtotal,
 * discount, buyer fee, and total server-side (BuildQuote), seals them into an
 * encrypted quote_token, and later re-verifies them at order creation
 * (reconcile_order!). The frontend never computes or sends an amount.
 *
 * Flow (mirrors the backend):
 *   0. register()     → POST /ticket_types/:tt/registrations (lib/registration.ts)
 *                       → registration_id (required for ticket lines in the quote)
 *   1. quote()        → POST /events/:event_id/order_quotes  → quote_token + display totals
 *   2. createOrder()  → POST /events/:event_id/orders        → { order: { quote_token } } + Idempotency-Key
 *   3. startPayment() → POST /orders/:order_id/payment_attempts → payment (server-charges total_minor)
 *   4. tickets are issued server-side AFTER payment (orders.payment.fulfilled → Ticketing::Packages::Issue).
 *
 * quote()/createOrder()/startPayment() are LIVE. A local mock calculator
 * covers ONLY pure-mock carts (no eventId, or synthetic `ticket:` tier ids
 * from legacy mock events) so the UI still renders an estimate there. For any
 * real backend event, every failure is surfaced — never silently re-priced
 * locally — and fabricated tokens are refused at createOrder.
 */

import { apiFetch, ApiError, randomUuid } from "@/lib/api";
import type { SelectedEventProduct, SelectedSeat } from "@/types/event";
import type { AppliedPromo } from "@/types/promo";

const SERVICE_FEE_BPS = 500; // MOCK-only 5% — the real fee comes from the backend's commercial schedule

/* ─── Wire types (mirror Orders::QuoteSerializer) ─── */

export interface OrderQuoteItem {
  product_id: string;
  name: string;
  type: string;
  quantity: number;
  unit_amount_minor: number;
  subtotal_minor: number;
  discount_minor: number;
  total_minor: number;
}

export interface OrderQuote {
  quote_token: string;
  charge_currency: string;
  sales_channel: string;
  quoted_at: string;
  expires_at: string;
  subtotal_minor: number;
  discount_minor: number;
  subsidy_total: number;
  buyer_fee_total: number;
  total_minor: number;
  items: OrderQuoteItem[];
}

/* ─── Wire types (mirror Orders::OrderSerializer) ─── */

export interface OrderItem {
  id: string;
  event_product_id: string;
  name_snapshot: string;
  type_snapshot: string;
  quantity: number;
  charge_currency: string;
  charge_unit_amount_minor: number;
  discount_minor: number;
  total_minor: number;
  fulfillment_status: string;
}

export interface OrderAdjustment {
  id: string;
  type: string;
  label: string;
  amount_minor: number;
  currency: string;
  refund_policy: string;
}

export interface CheckoutOrder {
  id: string;
  event_id: string;
  status: string;
  sales_channel: string;
  charge_currency: string;
  subtotal_minor: number;
  discount_minor: number;
  subsidy_minor: number;
  fee_minor: number;
  tax_minor: number;
  adjustment_minor: number;
  total_minor: number;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  adjustments: OrderAdjustment[];
}

/* ─── Wire types (mirror Orders::PaymentSerializer) ─── */

export interface PaymentAttempt {
  id: string;
  order_id: string;
  attempt_number: number;
  provider: string;
  payment_method: string;
  status: string;
  amount_minor: number;
  currency: string;
  provider_reference: string | null;
  /** Chapa hosted-checkout URL — present while status is "processing". The
   *  buyer completes payment there; the backend verifies the outcome. */
  checkout_url: string | null;
  settlement_grace_minutes: number | null;
  settlement_grace_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Frontend domain input ─── */

export interface QuoteInput {
  eventId?: string;
  /** Line items: event_product_id + quantity (+ registration_id when answering).
   *  The mock accepts an optional unitPriceMinor (caller-known price); the real
   *  backend derives unit prices server-side from event_product_id. */
  items: { eventProductId: string; quantity: number; unitPriceMinor?: number; registrationId?: string }[];
  chargeCurrency: string;
  provider?: string;
  paymentMethod?: string;
  promotionCode?: string;
  /** Guest phone (BACKEND_GAPS #14). When set, routes through the guest
   *  quote endpoint POST /guest/events/:id/order_quotes with
   *  phone_confirmation: true. */
  guestPhone?: string;
}

export interface CreateOrderInput {
  eventId?: string;
  quoteToken: string;
  /** Guest phone (BACKEND_GAPS #14). When set, routes through the guest
   *  create-order endpoint POST /guest/events/:id/orders with quote_token
   *  + phone in the body. */
  guestPhone?: string;
}

export interface StartPaymentInput {
  orderId: string;
  provider: string;
  paymentMethod: string;
  /** Backend event id — persisted so the post-Chapa return sheet can match the
   *  newly issued wallet ticket to THIS purchase instead of any fresh ticket. */
  eventId?: string;
  /** Guest credentials (BACKEND_GAPS #14). When set (unauthenticated buyer),
   *  the guest access material + phone are persisted beside the payment id so
   *  the guest return screen can reconcile via POST /guest/payments/:id/refresh.
   *  `orderAccessToken` is the `guest_order_token` from the admission selection
   *  (the current flow); `quoteToken` is the legacy quote's token. */
  guest?: GuestCreds;
}

/** Guest checkout access material. Exactly one of `orderAccessToken` (current
 *  admission-selection flow) or `quoteToken` (legacy) is present. */
export interface GuestCreds {
  phone: string;
  orderAccessToken?: string;
  quoteToken?: string;
}

/** Storage-key helpers (mirroring digis:payment-id:* / digis:payment-event:*). */
export const guestReturnKey = (suffix: 'quoteToken' | 'orderToken' | 'phone'): string =>
  `digis:guest:${suffix}:`;

const readStore = (key: string): string | null => {
  try { return sessionStorage.getItem(key) ?? window.localStorage.getItem(key); } catch { return null; }
};

/** Read the persisted guest credentials for a completed payment attempt. */
export function readGuestReturnCreds(orderId: string): GuestCreds | null {
  const ph = readStore(`${guestReturnKey('phone')}${orderId}`);
  const ot = readStore(`${guestReturnKey('orderToken')}${orderId}`);
  const qt = readStore(`${guestReturnKey('quoteToken')}${orderId}`);
  if (!ph || (!ot && !qt)) return null;
  return {
    phone: ph,
    ...(ot ? { orderAccessToken: ot } : {}),
    ...(!ot && qt ? { quoteToken: qt } : {}),
  };
}

/**
 * Find the guest credentials that belong to a specific checkout, so the return
 * screen never pairs a payment with a quote_token/phone from a DIFFERENT order.
 *
 * The `digis:guest:*` keys are written per ORDER and multiple guest checkouts
 * can accumulate in storage (abandoned sessions, multi-order purchases, stale
 * localStorage). Grabbing "the first set" feeds the wrong quote_token/phone to
 * the guest payment refresh, which the backend rejects with `invalid_guest_quote`
 * (the token binds event_id + a phone digest) — and each failed retry counts
 * against the 10/minute guest throttle, eventually 429 `rate_limited`.
 *
 * Resolution order:
 *  1. paymentId → the `digis:payment-id:<orderId>` key whose value matches
 *     (written at redirect time, mirrors the authenticated path).
 *  2. eventId (no paymentId) → prefer a set whose orderId's
 *     `digis:payment-event:<orderId>` matches the return event.
 *  3. fallback → first matching set (legacy, best-effort).
 */
export function findGuestReturnCreds(
  paymentId?: string,
  eventId?: string,
): (GuestCreds & { orderId: string }) | null {
  const orderIdFromKey = (k: string): string | null => {
    for (const prefix of [guestReturnKey('orderToken'), guestReturnKey('quoteToken')]) {
      if (k.startsWith(prefix)) return k.slice(prefix.length);
    }
    return null;
  };
  try {
    if (paymentId) {
      for (const store of [sessionStorage, window.localStorage]) {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k?.startsWith('digis:payment-id:') && store.getItem(k) === paymentId) {
            const orderId = k.slice('digis:payment-id:'.length);
            const creds = readGuestReturnCreds(orderId);
            if (creds) return { ...creds, orderId };
          }
        }
      }
      return null;
    }
    if (eventId) {
      const matches: Array<GuestCreds & { orderId: string }> = [];
      for (const store of [sessionStorage, window.localStorage]) {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          const orderId = k ? orderIdFromKey(k) : null;
          if (!orderId) continue;
          const creds = readGuestReturnCreds(orderId);
          if (!creds) continue;
          const mapped = { ...creds, orderId };
          if (readStore(`digis:payment-event:${orderId}`) === eventId) return mapped;
          matches.push(mapped);
        }
      }
      if (matches.length) return matches[0];
      return null;
    }
    for (const store of [sessionStorage, window.localStorage]) {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        const orderId = k ? orderIdFromKey(k) : null;
        if (!orderId) continue;
        const creds = readGuestReturnCreds(orderId);
        if (creds) return { ...creds, orderId };
      }
    }
  } catch { /* ignore */ }
  return null;
}

export interface StartedPayment {
  payment: PaymentAttempt;
  /**
   * The attempt's tx_ref (its Idempotency-Key). Chapa can't reach a dev
   * laptop, so no callback/webhook ever arrives — on return the frontend
   * hands this back to GET /payments/chapa/callback to trigger the
   * backend's verify-before-trust itself.
   */
  idempotencyKey: string;
}

/**
 * POST /payments/:payment_id/refresh projection
 * (Orders::PaymentRefresh → PaymentSerializer + OrderSerializer +
 * TicketWalletSerializer). `state` tells the return screen how to behave:
 *  - ready    → accepted AND ticket issued — confirm immediately.
 *  - pending  → still settling server-side — keep polling the wallet.
 *  - terminal → failed/cancelled/reversed — surface the failure, don't spin.
 */
export interface PaymentRefreshResult {
  state: 'ready' | 'pending' | 'terminal';
  payment: PaymentAttempt;
  order: CheckoutOrder;
  tickets: import('./tickets').TicketWalletWire[];
}

/* ─── Mock price lookup (mock tiers / draft events only) ─── */

const mockMinor = (birr: number) => Math.round(birr * 100);

/**
 * MOCK price lookup. Phase 3 replaces this with the event's products from
 * GET /public/events/:slug/products + product prices.
 */
function mockUnitPriceMinor(eventProductId: string): number {
  const byId: Record<string, number> = {
    "oo-gen": mockMinor(600),
    "oo-vip": mockMinor(1500),
    "av-parking": mockMinor(250),
    "av-tee": mockMinor(850),
    "av-bundle": mockMinor(620),
    "coffee-kit": mockMinor(480),
    "coffee-guide": mockMinor(75),
    "jna-gen": mockMinor(1299),
    "jna-vip": mockMinor(2500),
  };
  return byId[eventProductId] ?? mockMinor(1000);
}

/* ─── Mock local calculator (fallback only — live quote is the POST above) ─── */

async function mockQuote(input: QuoteInput): Promise<OrderQuote> {
  const currency = input.chargeCurrency;
  const items: OrderQuoteItem[] = input.items.map((line) => {
    const unit = line.unitPriceMinor ?? mockUnitPriceMinor(line.eventProductId);
    const subtotal = unit * line.quantity;
    return {
      product_id: line.eventProductId,
      name: "Event product",
      type: "ticket",
      quantity: line.quantity,
      unit_amount_minor: unit,
      subtotal_minor: subtotal,
      discount_minor: 0,
      total_minor: subtotal,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.subtotal_minor, 0);
  const discount = 0;
  const subsidy = 0;
  const buyerFee = Math.round((subtotal - discount) * SERVICE_FEE_BPS / 10000);
  const total = Math.max(0, subtotal - discount - subsidy + buyerFee);
  const now = new Date().toISOString();
  return {
    quote_token: `mock_quote_${Date.now()}`,
    charge_currency: currency,
    sales_channel: "online",
    quoted_at: now,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    subtotal_minor: subtotal,
    discount_minor: discount,
    subsidy_total: subsidy,
    buyer_fee_total: buyerFee,
    total_minor: total,
    items,
  };
}

/* ─── The module ─── */

export const orderModule = {
  /**
   * POST /events/:event_id/order_quotes (live).
   * The local mock calculator covers ONLY pure-mock carts — no backend eventId,
   * or synthetic tier ids (`ticket:<name>`) from legacy mock events. The moment
   * a real eventId exists the backend is the only pricing authority: a live
   * quote that fails (unknown product, expired window, ...) surfaces the error
   * — the frontend never invents money or posts fabricated quote tokens.
   */
  async quote(input: QuoteInput): Promise<OrderQuote> {
    const isMockCart =
      !input.eventId || input.items.some((i) => i.eventProductId.includes(":"));
    if (isMockCart) return mockQuote(input);

    const baseBody = {
      charge_currency: input.chargeCurrency,
      promotion_code: input.promotionCode,
      items: input.items.map((i) => ({
        event_product_id: i.eventProductId,
        quantity: i.quantity,
        ...(i.registrationId ? { registration_id: i.registrationId } : {}),
      })),
    };
    if (input.guestPhone) {
      const { data } = await apiFetch<OrderQuote>(
        `guest/events/${input.eventId}/order_quotes`,
        {
          method: "POST",
          body: {
            ...baseBody,
            phone: input.guestPhone,
            phone_confirmation: true,
          },
        },
      );
      return data;
    }
    const { data } = await apiFetch<OrderQuote>(
      `events/${input.eventId}/order_quotes`,
      { method: "POST", body: baseBody },
    );
    return data;
  },

  /**
   * POST /events/:event_id/orders (body { order: { quote_token } },
   * Idempotency-Key header injected by apiFetch).
   * Fabricated tokens ("mock_quote_*") are refused before they can reach the
   * backend — a real order can only come from a real backend quote.
   */
  async createOrder(input: CreateOrderInput): Promise<CheckoutOrder> {
    if (!input.eventId || input.quoteToken.startsWith("mock_quote_")) {
      throw new Error("orderModule.createOrder requires a live backend quote");
    }
    if (input.guestPhone) {
      const { data } = await apiFetch<CheckoutOrder>(
        `guest/events/${input.eventId}/orders`,
        {
          method: "POST",
          body: { order: { quote_token: input.quoteToken, phone: input.guestPhone } },
        },
      );
      return data;
    }
    const { data } = await apiFetch<CheckoutOrder>(
      `events/${input.eventId}/orders`,
      { method: "POST", body: { order: { quote_token: input.quoteToken } } },
    );
    return data;
  },

  /**
   * POST /orders/:order_id/payment_attempts (Idempotency-Key required).
   * The server charges the order's total_minor — the frontend never sends an amount.
   *
   * Live Chapa flow (when CHAPA_ENABLED=true on the backend):
   *   POST → 201 PaymentSerializer { status: "processing", checkout_url } —
   *   the buyer completes payment on Chapa's hosted page; the backend learns
   *   the outcome via webhook (`POST /payments/chapa/webhook`, HMAC-verified)
   *   and the browser redirect (`GET /payments/chapa/callback`, verify-before-
   *   trust). The frontend then redirects to checkout_url and polls the order.
   *
   * In dev (CHAPA_ENABLED unset) the provider registry is EMPTY → the backend
   * answers 503 `payment_provider_unavailable`. We surface that as a typed
   * error so the UI can explain "payments not configured" instead of hanging.
   */
  async startPayment(input: StartPaymentInput): Promise<StartedPayment> {
    const idempotencyKey = randomUuid();
    const path = input.guest
      ? `guest/orders/${input.orderId}/payment_attempts`
      : `orders/${input.orderId}/payment_attempts`;
    const bodyPayload: Record<string, unknown> = {
      payment_attempt: {
        provider: input.provider,
        payment_method: input.paymentMethod,
        ...(input.guest
          ? {
              phone: input.guest.phone,
              ...(input.guest.orderAccessToken
                ? { order_access_token: input.guest.orderAccessToken }
                : { quote_token: input.guest.quoteToken }),
            }
          : {}),
      },
    };
    const { data } = await apiFetch<PaymentAttempt>(
      path,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: bodyPayload,
      },
    );
    try {
      sessionStorage.setItem(`digis:payment-key:${input.orderId}`, idempotencyKey);
      sessionStorage.setItem(`digis:payment-id:${input.orderId}`, data.id);
      window.localStorage.setItem(`digis:payment-id:${input.orderId}`, data.id);
      if (input.eventId) sessionStorage.setItem(`digis:payment-event:${input.orderId}`, input.eventId);
      if (input.guest) {
        if (input.guest.quoteToken) {
          const k = `${guestReturnKey('quoteToken')}${input.orderId}`;
          sessionStorage.setItem(k, input.guest.quoteToken);
          window.localStorage.setItem(k, input.guest.quoteToken);
        }
        if (input.guest.orderAccessToken) {
          const k = `${guestReturnKey('orderToken')}${input.orderId}`;
          sessionStorage.setItem(k, input.guest.orderAccessToken);
          window.localStorage.setItem(k, input.guest.orderAccessToken);
        }
        const pk = `${guestReturnKey('phone')}${input.orderId}`;
        sessionStorage.setItem(pk, input.guest.phone);
        window.localStorage.setItem(pk, input.guest.phone);
      }
    } catch { /* storage unavailable */ }
    return { payment: data, idempotencyKey };
  },

  /**
   * Local-dev return-URL verify. Chapa can't reach localhost, so the hosted
   * return is the ONLY signal the backend gets: replay the attempt's tx_ref
   * to the unauthenticated callback endpoint, which verifies with Chapa
   * (verify-before-trust) and records the durable payment event. The wallet
   * poll then picks up the issued ticket. Production (public callback URL +
   * webhook) doesn't need this but it's a harmless idempotent replay there.
   */
  async kickReturnVerification(txRef: string): Promise<void> {
    await apiFetch(
      `payments/chapa/callback?provider=chapa&trx_ref=${encodeURIComponent(txRef)}&status=success`,
      { method: "GET" },
    );
  },

  /**
   * POST /payments/:payment_id/refresh (Idempotency-Key auto-injected).
   * Buyer-scoped reconciliation (payment_refresh#create): verifies a pending
   * attempt server-side and returns payment + order + wallet tickets + a
   * `state` attribute in one response. `ready` = accepted + ticket issued,
   * `pending` = still settling (keep polling the wallet), `terminal` =
   * failed/cancelled/reversed — the buyer is told instead of spinning.
   */
  async refreshPayment(paymentId: string): Promise<PaymentRefreshResult> {
    const { data } = await apiFetch<PaymentRefreshResult>(
      `payments/${paymentId}/refresh`,
      { method: "POST" },
    );
    return data;
  },

  /**
   * POST /guest/payments/:payment_id/refresh (BACKEND_GAPS #14 resolved
   * 2026-09-09). Guest-scoped reconciliation requiring the original
   * quote_token + phone to authenticate the request. Same response shape as
   * refreshPayment (payment + order + wallet tickets + state).
   */
  async guestRefreshPayment(paymentId: string, creds: GuestCreds): Promise<PaymentRefreshResult> {
    const { data } = await apiFetch<PaymentRefreshResult>(
      `guest/payments/${paymentId}/refresh`,
      {
        method: "POST",
        headers: { "Idempotency-Key": randomUuid() },
        body: {
          payment_refresh: {
            phone: creds.phone,
            ...(creds.orderAccessToken
              ? { order_access_token: creds.orderAccessToken }
              : { quote_token: creds.quoteToken }),
          },
        },
      },
    );
    return data;
  },
};

/* React Query keys */
export const orderKeys = {
  quote: ["order", "quote"] as const,
  detail: (id: string) => ["order", id] as const,
};

/* ─── Frontend-specific selections (NOT sent to the backend; UI-local) ─── */

export interface SelectedSeats {
  seats?: SelectedSeat[];
  addOns?: SelectedEventProduct[];
  promoApplied?: AppliedPromo | null;
}
