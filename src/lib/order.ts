/**
 * Order intake module — mirrors digis_backend's order pipeline.
 *
 * The backend is the sole authority for ALL money math. It computes subtotal,
 * discount, buyer fee, and total server-side (BuildQuote), seals them into an
 * encrypted quote_token, and later re-verifies them at order creation
 * (reconcile_order!). The frontend never computes or sends an amount.
 *
 * Flow (mirrors the backend):
 *   1. quote()        → POST /events/:event_id/order_quotes  → quote_token + display totals
 *   2. createOrder()  → POST /events/:event_id/orders        → { order: { quote_token } } + Idempotency-Key
 *   3. startPayment() → POST /orders/:order_id/payment_attempts → payment (server-charges total_minor)
 *   4. tickets are issued server-side AFTER payment (orders.payment.fulfilled → Ticketing::Packages::Issue).
 *
 * Current bodies are MOCK — they return backend-shaped data so the UI can be
 * built and tested before the live endpoints are wired in Phase 3. Swap each
 * body for apiFetch when wiring.
 */

import { apiFetch } from "@/lib/api";
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
  items: { eventProductId: string; quantity: number; unitPriceMinor?: number }[];
  chargeCurrency: string;
  provider?: string;
  paymentMethod?: string;
  promotionCode?: string;
}

export interface CreateOrderInput {
  eventId?: string;
  quoteToken: string;
}

export interface StartPaymentInput {
  orderId: string;
  provider: string;
  paymentMethod: string;
}

/* ─── Mock helpers (deleted at Phase 3) ─── */

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

/* ─── The module ─── */

export const orderModule = {
  /**
   * Mirror POST /events/:event_id/order_quotes.
   * MOCK body: computes totals locally so the UI can render; Phase 3 replaces
   * with apiFetch and uses the server's buyer_fee_total/total_minor verbatim.
   */
  async quote(input: QuoteInput): Promise<OrderQuote> {
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
  },

  /**
   * Mirror POST /events/:event_id/orders (body { order: { quote_token } },
   * Idempotency-Key required).
   * MOCK body: Phase 3 sends only the token and maps the returned OrderSerializer.
   */
  async createOrder(input: CreateOrderInput): Promise<CheckoutOrder> {
    const quote = await this.quote({ eventId: input.eventId, items: [], chargeCurrency: "ETB" });
    const now = new Date().toISOString();
    return {
      id: `order_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
      event_id: input.eventId ?? "",
      status: "pending_payment",
      sales_channel: "online",
      charge_currency: "ETB",
      subtotal_minor: quote.subtotal_minor,
      discount_minor: quote.discount_minor,
      subsidy_minor: quote.subsidy_total,
      fee_minor: quote.buyer_fee_total,
      tax_minor: 0,
      adjustment_minor: 0,
      total_minor: quote.total_minor,
      expires_at: quote.expires_at,
      paid_at: null,
      created_at: now,
      updated_at: now,
      items: [],
      adjustments: [],
    };
  },

  /**
   * Mirror POST /orders/:order_id/payment_attempts (Idempotency-Key required).
   * The server charges the order's total_minor — the frontend never sends an amount.
   * MOCK body: Phase 3 maps PaymentSerializer and then polls order status.
   */
  async startPayment(input: StartPaymentInput): Promise<PaymentAttempt> {
    const now = new Date().toISOString();
    return {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
      order_id: input.orderId,
      attempt_number: 1,
      provider: input.provider,
      payment_method: input.paymentMethod,
      status: "succeeded",
      amount_minor: 0,
      currency: "ETB",
      provider_reference: null,
      settlement_grace_minutes: null,
      settlement_grace_expires_at: null,
      created_at: now,
      updated_at: now,
    };
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
