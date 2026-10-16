/**
 * Buyer-safe recovery context for the checkout 409 (`active_checkout_exists` /
 * `idempotency_conflict`) — the backend's `meta.active_checkout` (#58, resolved
 * 2026-10-16).
 *
 * `Orders::ActiveCheckoutRecovery` projects the open order id, its expiry, and
 * (only when a payment attempt exists) the hosted `checkout_url` the buyer can
 * resume, plus a guest `order_access_token` when the request was OTP-verified.
 * The projection is authorized server-side; when it is absent the frontend must
 * degrade to the honest "View Tickets" action — never invent a resume.
 */
export interface ActiveCheckoutRecovery {
  orderId: string;
  expiresAt: string | null;
  payment?: { id: string; status: string; checkoutUrl: string | null };
}

/** Parse the 409's `meta.active_checkout`; null when absent or malformed. */
export function readActiveCheckout(meta?: Record<string, unknown>): ActiveCheckoutRecovery | null {
  const raw = meta?.active_checkout as Record<string, unknown> | undefined;
  if (!raw || typeof raw.order_id !== 'string') return null;
  const payment = raw.payment as Record<string, unknown> | undefined;
  return {
    orderId: raw.order_id,
    expiresAt: typeof raw.expires_at === 'string' ? raw.expires_at : null,
    ...(payment && typeof payment.id === 'string'
      ? {
          payment: {
            id: payment.id,
            status: String(payment.status ?? ''),
            checkoutUrl: typeof payment.checkout_url === 'string' ? payment.checkout_url : null,
          },
        }
      : {}),
  };
}
