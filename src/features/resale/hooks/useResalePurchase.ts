/**
 * Resale purchase, shared by every surface that buys a listing (the resale
 * event detail page). Mirrors the checkout pipeline exactly:
 *   POST /resale_listings/:id/purchase → a pending-payment Order
 *   → startPayment (Chapa) → hosted checkout in a NEW tab
 *   → the app tab confirms from the webhook and closes the Chapa tab.
 *
 * Ownership is never claimed here — the wallet proves fulfillment.
 */
import { useState } from 'react';
import { resaleModule } from '@/lib/resale';
import { orderModule } from '@/lib/order';
import type { CheckoutOrder } from '@/lib/order';
import { mapApiError } from '@/lib/errors';
import { openHostedCheckout } from '@/lib/checkout-popup';
import type { ResaleListing } from '@/types';

export interface UseResalePurchase {
  /** True while ANY listing purchase is in flight (drives global guards). */
  purchasing: boolean;
  /** The id of the listing currently being purchased (per-row spinner/disable). */
  purchasingId: string | null;
  /** The id of the listing whose purchase failed (row-attached error). */
  errorId: string | null;
  /** Mapped, user-readable failure — render inline on the surface. */
  error: string | null;
  /** Set when the payment was accepted without a hosted redirect. */
  pendingOrder: CheckoutOrder | null;
  buy: (listing: ResaleListing) => Promise<void>;
  reset: () => void;
}

export function useResalePurchase(): UseResalePurchase {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<CheckoutOrder | null>(null);
  const purchasing = purchasingId !== null;

  const buy = async (listing: ResaleListing) => {
    setPurchasingId(listing.id);
    setErrorId(null);
    setError(null);
    setPendingOrder(null);
    try {
      const order = await resaleModule.purchaseListing(listing.id);
      const { payment } = await orderModule.startPayment({
        orderId: order.id,
        provider: 'chapa',
        paymentMethod: 'telebirr',
        eventId: order.event_id,
      });
      if (payment && payment.status === 'processing' && payment.checkout_url) {
        openHostedCheckout(order.id, payment.checkout_url);
        return;
      }
      // No hosted redirect: the payment was already accepted server-side.
      // Show a pending-confirmation state (never a premature "Purchased!")
      // until the wallet proves fulfillment.
      setPendingOrder(order);
    } catch (e) {
      setError(mapApiError(e, 'Purchase failed. Please try again.'));
      setErrorId(listing.id);
    } finally {
      setPurchasingId(null);
    }
  };

  return {
    purchasing,
    purchasingId,
    errorId,
    error,
    pendingOrder,
    buy,
    reset: () => { setError(null); setErrorId(null); setPendingOrder(null); },
  };
}
