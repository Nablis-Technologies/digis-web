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
}

export interface CreateOrderInput {
  eventId?: string;
  quoteToken: string;
}

export interface RestartOrderInput {
  /** The stuck/expired pending order to close and replace. */
  oldOrderId: string;
  quoteToken: string;
}

export interface StartPaymentInput {
  orderId: string;
  provider: string;
  paymentMethod: string;
  /** Backend event id — persisted so the post-Chapa return sheet can match the
   *  newly issued wallet ticket to THIS purchase instead of any fresh ticket. */
  eventId?: string;
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

    const { data } = await apiFetch<OrderQuote>(
      `events/${input.eventId}/order_quotes`,
      {
        method: "POST",
        body: {
          charge_currency: input.chargeCurrency,
          promotion_code: input.promotionCode,
          items: input.items.map((i) => ({
            event_product_id: i.eventProductId,
            quantity: i.quantity,
            ...(i.registrationId ? { registration_id: i.registrationId } : {}),
          })),
        },
      },
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
    const { data } = await apiFetch<CheckoutOrder>(
      `events/${input.eventId}/orders`,
      { method: "POST", body: { order: { quote_token: input.quoteToken } } },
    );
    return data;
  },

  /**
   * POST /orders/:order_id/restart (body { order: { quote_token } } +
   * Idempotency-Key). Closes a stuck/expired pending_payment checkout and
   * creates its replacement reusing the SAME registration — the recovery path
   * when order creation 409s with idempotency_conflict. That conflict happens
   * because the backend enforces one order item per registration, ever
   * (idx_one_order_item_per_registration), and nothing expires a registration
   * when its checkout dies. RestartCheckout closes the dead order and re-binds
   * the registration to a fresh one. Needs the OLD order id.
   */
  async restartOrder(input: RestartOrderInput): Promise<CheckoutOrder> {
    const { data } = await apiFetch<CheckoutOrder>(
      `orders/${input.oldOrderId}/restart`,
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
    // Explicit key (not the interceptor's auto one) so the tx_ref survives
    // the Chapa redirect: persisted per order, replayed to the callback
    // endpoint on return to kick server-side verification.
    const idempotencyKey = randomUuid();
    const { data } = await apiFetch<PaymentAttempt>(
      `orders/${input.orderId}/payment_attempts`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          payment_attempt: {
            provider: input.provider,
            payment_method: input.paymentMethod,
          },
        },
      },
    );
    try {
      sessionStorage.setItem(`digis:payment-key:${input.orderId}`, idempotencyKey);
      if (input.eventId) sessionStorage.setItem(`digis:payment-event:${input.orderId}`, input.eventId);
    } catch { /* storage unavailable — return-verify just won't fire */ }
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
